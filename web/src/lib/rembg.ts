/**
 * REMBG API integration for background removal
 */

export async function removeBackground(imageUrl: string): Promise<string> {
  try {
    console.log("Starting REMBG background removal...");
    console.log("Input image URL:", imageUrl);
    
    const REMBG_API_KEY = process.env.REMBG_API_KEY;
    if (!REMBG_API_KEY) {
      throw new Error("REMBG_API_KEY not found in environment variables");
    }

    console.log("Downloading image from URL...");
    
    // Download the image from the URL with better error handling
    let imageResponse;
    try {
      imageResponse = await fetch(imageUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ToiletTails/1.0)',
        },
      });
    } catch (fetchError) {
      console.error("Fetch error details:", fetchError);
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      throw new Error(`Failed to fetch image: ${errorMessage}`);
    }
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    
    console.log("Converting image to buffer...");
    const imageBuffer = await imageResponse.arrayBuffer();
    console.log("Image buffer size:", imageBuffer.byteLength, "bytes");

    console.log("Calling REMBG API...");
    
    // Call REMBG API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    try {
      const rembgResponse = await fetch("https://api.rembg.io/v1.0/remove", {
        method: "POST",
        headers: {
          "X-Api-Key": REMBG_API_KEY,
          "Content-Type": "application/octet-stream",
        },
        body: imageBuffer,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!rembgResponse.ok) {
        const errorText = await rembgResponse.text();
        throw new Error(`REMBG API error: ${rembgResponse.status} - ${errorText}`);
      }

      console.log("Processing REMBG response...");
      
      // Get the processed image
      const processedImageBuffer = await rembgResponse.arrayBuffer();
      console.log("Processed image buffer size:", processedImageBuffer.byteLength, "bytes");
      
      // Convert to base64 for temporary storage
      const base64 = Buffer.from(processedImageBuffer).toString('base64');
      const dataUrl = `data:image/png;base64,${base64}`;
      
      console.log("REMBG background removal completed successfully");
      return dataUrl;
      
    } catch (rembgError) {
      clearTimeout(timeoutId);
      if (rembgError instanceof Error && rembgError.name === 'AbortError') {
        throw new Error("REMBG API request timed out after 60 seconds");
      }
      throw rembgError;
    }
    
  } catch (error) {
    console.error("REMBG background removal failed:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to remove background: ${errorMessage}`);
  }
}
