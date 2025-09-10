import { replicate, AI_MODELS, SCENE_TEMPLATES, AIStep, AIPipelineResult } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { supabaseServer } from "@/lib/supabaseServer";
import { removeBackground } from "@/lib/rembg";
import { checkBucketAccess } from "@/lib/checkBucket";
import { runReplicatePrediction } from "@/lib/replicateHttp";
import { fal } from "@/lib/fal";
import { createCenteredMaskPng } from "@/lib/mask";
import sharp from "sharp";

/**
 * Step 1: Pet Masking - Extract pet from background using REMBG
 */
export async function maskPet(imageUrl: string): Promise<string> {
  // Disable REMBG for now due to DNS/availability issues
  console.log("Skipping background removal (REMBG disabled)");
  return imageUrl;
}

/**
 * Step 2: Scene Composition - Blend pet into bathroom scene
 */
type GenerateOptions = {
  identityStrength?: number; // 0.25 - 0.6 (mapped loosely)
  aspectRatio?: "square" | "landscape_4_3" | "portrait_4_3" | string;
  upscale?: boolean;
};

export async function composeScene(
  uploadId: string,
  petImageUrl: string, 
  sceneType: keyof typeof SCENE_TEMPLATES,
  bgImageUrl?: string,
  options: GenerateOptions = {}
): Promise<string> {
  try {
    console.log("Starting scene composition...");
    console.log("Pet image URL:", petImageUrl);
    console.log("Scene type:", sceneType);
    
    const scenePrompt = SCENE_TEMPLATES[sceneType];
    console.log("Scene prompt:", scenePrompt);
    
    console.log("Attempting scene generation with options:", options);
    
    try {
      // If a background is provided, prefer inpaint fill model first
      if (bgImageUrl) {
        try {
          console.log("Background provided: using FAL flux-pro/v1/fill inpaint mode");
          // Download background to get exact dimensions
          const bgResp = await fetch(bgImageUrl);
          if (!bgResp.ok) throw new Error(`Failed to download background image: ${bgResp.status}`);
          const bgBuffer = Buffer.from(await bgResp.arrayBuffer());
          const meta = await sharp(bgBuffer).metadata();
          const canvasW = meta.width || 1024;
          const canvasH = meta.height || 1024;
          // Define mask region as a lower-middle rectangle proportional to background size
          const region = {
            width: Math.max(1, Math.floor(canvasW * 0.47)),
            height: Math.max(1, Math.floor(canvasH * 0.53)),
          } as any;
          region.left = Math.max(0, Math.floor((canvasW - region.width) / 2));
          region.top = Math.max(0, Math.min(canvasH - region.height, Math.floor(canvasH * 0.37)));
          console.log("Inpaint mask region:", { ...region, canvasW, canvasH });
          // Build mask with the SAME size as background (required by model)
          const blackCanvas = await sharp({
            create: {
              width: canvasW,
              height: canvasH,
              channels: 4,
              background: { r: 0, g: 0, b: 0, alpha: 1 },
            },
          })
            .png()
            .toBuffer();
          const whiteRect = await sharp({
            create: {
              width: region.width,
              height: region.height,
              channels: 4,
              background: { r: 255, g: 255, b: 255, alpha: 1 },
            },
          })
            .png()
            .toBuffer();
          const maskBuf = await sharp(blackCanvas)
            .composite([
              { input: whiteRect, left: region.left, top: region.top, blend: "over" },
            ])
            .png()
            .toBuffer();
          const maskDataUrl = `data:image/png;base64,${maskBuf.toString("base64")}`;
          // Save mask PNG to Supabase and use a signed URL (some endpoints reject data URLs)
          try {
            const sb = supabaseServer();
            const BUCKET = process.env.SUPABASE_BUCKET!;
            const maskKey = `ai-results/${uploadId}/inpaint-mask-${Date.now()}.png`;
            const { error: upErr } = await sb.storage.from(BUCKET).upload(maskKey, Buffer.from(maskBuf), {
              contentType: "image/png",
              upsert: false,
            });
            if (upErr) {
              console.warn("Mask upload failed; will fall back to data URL:", upErr.message);
            } else {
              const { data: signedMask, error: signErr } = await sb.storage.from(BUCKET).createSignedUrl(maskKey, 60 * 60);
              if (!signErr && signedMask?.signedUrl) {
                console.log("Using signed mask URL for inpaint");
                // Replace with URL for model input
                // Note: keep data URL as fallback in case URL fails
                (global as any).__mask_url__ = signedMask.signedUrl;
              }
            }
          } catch (e) {
            console.warn("Mask save/sign failed; proceeding with data URL", e);
          }

          const maskUrlForModel = (global as any).__mask_url__ || maskDataUrl;
          const result: any = await fal.subscribe("fal-ai/flux-pro/v1/fill", {
            input: {
              image_url: bgImageUrl, // background canvas (URL)
              mask_url: maskUrlForModel, // mask URL
              prompt: `${scenePrompt}. Insert the uploaded dog sitting on the toilet. Preserve the dog's identity (face, fur colors). Match lighting and perspective. Photorealistic, seamless blend.`,
              num_inference_steps: 28,
              guidance_scale: 5,
              sync_mode: true,
            } as any,
            logs: true,
          });
          const out = result as any;
          console.log("Inpaint raw keys:", Object.keys(out || {}));
          const firstUrl: string | undefined =
            (Array.isArray(out?.data?.images) && out.data.images[0]?.url) ||
            (Array.isArray(out?.images) && out.images[0]?.url) ||
            out?.data?.image?.url ||
            out?.image?.url ||
            (Array.isArray(out?.output) && (out.output[0]?.url || out.output[0]?.image?.url)) ||
            (typeof out === 'string' && (out.startsWith('http') || out.startsWith('data:')) ? out : undefined);
          if (firstUrl) {
            console.log("Inpaint output type:", firstUrl.startsWith('data:') ? 'data-url' : 'url');
            return firstUrl;
          }
          console.warn("Inpaint output missing URL; not falling back to Kontext.");
          throw new Error("Inpaint did not return an image URL");
        } catch (e: any) {
          try {
            console.error("Inpaint call failed:", e?.body ? JSON.stringify(e.body) : e);
          } catch {
            console.error("Inpaint call failed (no body)", e);
          }
          // Do not silently fall back when user provided a background; surface the issue
          throw e;
        }
      }

      // No background provided: route through FAL Kontext img2img
      {
        console.log("Using FAL flux-pro/kontext (image-to-image)...");
        const result: any = await fal.subscribe("fal-ai/flux-pro/kontext", {
          input: {
            prompt: `${scenePrompt}, photorealistic, professional lighting, bathroom setting, keep subject identity`,
            image_url: petImageUrl,
            // Kontext doesn't support background blending; ignore bg here
            num_inference_steps: 30,
            guidance_scale: Math.max(2.5, Math.min(8, (options.identityStrength ? 6 + (options.identityStrength - 0.35) * 10 : 6))),
            image_size: (options.aspectRatio || "square") as any,
            sync_mode: true,
          } as any,
          logs: true,
          onQueueUpdate: (u: any) => {
            const last = u?.logs?.at?.(-1);
            if (last) console.log(last);
          },
        });
        const urlArr = Array.isArray(result?.data?.images)
          ? result.data.images
          : (Array.isArray(result?.images) ? result.images : []);
        const urlFromArr: any = Array.isArray(urlArr) && urlArr.length > 0 ? (urlArr[0]?.url || urlArr[0]) : undefined;
        const urlDirect: any = result?.data?.image?.url || result?.image?.url;
        const urlCandidate: any = urlFromArr || urlDirect;
        if (typeof urlCandidate === 'string') {
          console.log("FAL returned URL:", urlCandidate);
          return urlCandidate;
        }
        console.warn("FAL output missing URL, falling back to Replicate");
      }

      console.log("Starting Replicate Predictions (non-streaming, img2img)...");
      // Stable Diffusion img2img version (uses `image` + `strength`)
      const version = "30c1d0b916a6f8efce20493f5d61ee27491ab2a60437c13c588468b9810ec23f";
      const imageUrl = petImageUrl; // use masked pet (signed URL)
      const url = await runReplicatePrediction({
        version,
        input: {
          image: imageUrl,
          prompt: `A photorealistic ${scenePrompt}, high quality, detailed, professional photography, the pet is clearly integrated in the bathroom`,
          num_inference_steps: 30,
          guidance_scale: 10,
          strength: options.identityStrength ?? 0.45,
          seed: 789,
        },
      });
      console.log("Replicate prediction completed with URL:", url);
      return url;
    } catch (err) {
      console.error("composeScene failed:", err);
      throw err;
    }
    
  } catch (error) {
    console.error("Scene composition failed:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to compose scene: ${errorMessage}`);
  }
}

/**
 * Step 3: Image Upscaling - Enhance quality for print
 * Note: This is a placeholder since we don't have upscaling access
 */
export async function upscaleImage(imageUrl: string): Promise<string> {
  // For now, just return the original image since we don't have upscaling access
  console.log("Skipping upscaling - using original image");
  return imageUrl;
}

/**
 * Save AI result to Supabase Storage
 */
export async function saveAIResult(
  imageUrl: string, 
  uploadId: string, 
  step: string
): Promise<string> {
  try {
    console.log(`[${uploadId}] Saving AI result for step: ${step}`);
    
    // Validate input
    if (!imageUrl || typeof imageUrl !== 'string') {
      console.error(`[${uploadId}] Invalid imageUrl for step ${step}:`, imageUrl);
      throw new Error(`Invalid imageUrl for step ${step}: expected string, got ${typeof imageUrl}`);
    }
    
    console.log(`[${uploadId}] Input image URL type:`, imageUrl.startsWith('data:') ? 'data URL' : 'regular URL');
    
    const BUCKET = process.env.SUPABASE_BUCKET!;
    if (!BUCKET) {
      throw new Error("SUPABASE_BUCKET environment variable not found");
    }
    
    const sb = supabaseServer();
    
    let buffer: Buffer;
    
    // Handle data URLs (from REMBG) vs regular URLs
    if (imageUrl.startsWith('data:')) {
      console.log(`[${uploadId}] Processing data URL...`);
      // Extract base64 data from data URL
      const base64Data = imageUrl.split(',')[1];
      if (!base64Data) {
        throw new Error("Invalid data URL format");
      }
      buffer = Buffer.from(base64Data, 'base64');
      console.log(`[${uploadId}] Data URL buffer size:`, buffer.length, "bytes");
    } else {
      console.log(`[${uploadId}] Downloading image from URL...`);
      // Download the image from the URL
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
      }
      buffer = Buffer.from(await response.arrayBuffer());
      console.log(`[${uploadId}] Downloaded buffer size:`, buffer.length, "bytes");
    }
    
    if (buffer.length === 0) {
      throw new Error("Empty image buffer");
    }
    
    // Generate unique key for this result
    const key = `ai-results/${uploadId}/${step}-${Date.now()}.png`;
    console.log(`[${uploadId}] Uploading to Supabase with key:`, key);
    
    // Upload to Supabase
    const { error: uploadError } = await sb.storage.from(BUCKET).upload(key, buffer, {
      contentType: "image/png",
      upsert: false,
    });
    
    if (uploadError) {
      console.error(`[${uploadId}] Supabase upload error:`, uploadError);
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }
    
    console.log(`[${uploadId}] Successfully uploaded to Supabase`);
    
    // Generate signed URL for access
    const { data: signed, error: signedError } = await sb.storage.from(BUCKET).createSignedUrl(key, 60 * 60 * 24); // 24 hours
    
    if (signedError) {
      console.error(`[${uploadId}] Signed URL generation error:`, signedError);
      throw new Error(`Failed to generate signed URL: ${signedError.message}`);
    }
    
    if (!signed?.signedUrl) {
      throw new Error("No signed URL returned from Supabase");
    }
    
    console.log(`[${uploadId}] Successfully generated signed URL for step: ${step}`);
    return signed.signedUrl;
    
  } catch (error) {
    console.error(`[${uploadId}] Failed to save AI result for step ${step}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to save AI result for step ${step}: ${errorMessage}`);
  }
}

/**
 * Complete AI Pipeline - Orchestrates all steps
 */
export async function runAIPipeline(
  uploadId: string,
  petImageUrl: string,
  sceneType: keyof typeof SCENE_TEMPLATES,
  bgImageUrl?: string,
  options: GenerateOptions = {}
): Promise<AIPipelineResult> {
  const result: AIPipelineResult = {
    uploadId,
    steps: {
      masking: { status: "failed" },
      identity: { status: "failed" },
      pose: { status: "failed" },
      composition: { status: "failed" },
      upscaling: { status: "failed" },
    },
  };

  try {
    // Check bucket access first
    console.log(`[${uploadId}] Checking bucket access...`);
    await checkBucketAccess();
    console.log(`[${uploadId}] Bucket access confirmed`);

    // Step 1: Remove background from pet image using REMBG
    console.log(`[${uploadId}] Starting background removal...`);
    const maskedPetUrl = await maskPet(petImageUrl);
    const savedMaskUrl = await saveAIResult(maskedPetUrl, uploadId, "masked-pet");
    result.steps.masking = { status: "success", output: savedMaskUrl };

    // Step 2: Generate scene with masked pet
    console.log(`[${uploadId}] Starting scene generation...`);
    const sceneUrl = await composeScene(uploadId, savedMaskUrl, sceneType, bgImageUrl, options);
    const savedSceneUrl = await saveAIResult(sceneUrl, uploadId, "scene");
    result.steps.composition = { status: "success", output: savedSceneUrl };

    // Set final result
    result.finalResult = savedSceneUrl;

    console.log(`[${uploadId}] AI pipeline completed successfully`);
    return result;

  } catch (error) {
    console.error(`[${uploadId}] AI pipeline failed:`, error);
    throw error;
  }
}
