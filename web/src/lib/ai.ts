import Replicate from "replicate";

// Initialize Replicate client
export const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

// AI Model configurations
export const AI_MODELS = {
  // Image-to-image generation for scene composition - using a reliable model that returns URLs
  SD_IMG2IMG: "stability-ai/stable-diffusion-img2img:30c1d0b916a6f8efce20493f5d61ee27491ab2a60437c13c588468b9810ec23f",
} as const;

// Scene templates for different bathroom themes
export const SCENE_TEMPLATES = {
  // Tuned prompts for stronger styling while keeping identity
  "royal-throne": "opulent palace bathroom, ornate golden toilet throne, marble walls and floor, chandelier, cinematic warm lighting, centered composition, eye‑level 50mm, pet seated proudly on the toilet like royalty",
  "bubble-bath": "bright spa bathroom, white clawfoot tub overflowing with bubbles and soft steam, towel rack and candles, soft rim light, centered composition, the pet relaxing in the bubble bath with face clearly visible",
  "mirror-selfie": "modern minimal bathroom, frameless vanity mirror with soft top light, clean chrome fixtures, reflection shows the same pet looking at the mirror, front camera look, centered portrait composition, natural soft light",
  "newspaper": "cozy home bathroom, warm ambient light, beige walls, small window light, pet seated on the toilet reading a newspaper, paws visible, gentle vignette, balanced 4:3 framing",
  "spa-day": "zen spa bathroom, natural stone, green plants, rolled towels, candles, warm diffused lighting, the pet wrapped in a towel enjoying a spa moment, soft depth of field",
  "tp-tornado": "playful chaotic bathroom, toilet paper strewn everywhere, rolls unraveling across the floor and around the pet, bright cheerful lighting, dynamic composition, the pet playfully tangled in toilet paper",
} as const;

// AI Pipeline types
export type AIStep = "masking" | "identity" | "pose" | "composition" | "upscaling";

export interface AIPipelineResult {
  uploadId: string;
  steps: {
    [key in AIStep]: {
      status: "success" | "failed";
      output?: string;
      error?: string;
    };
  };
  finalResult?: string;
}
