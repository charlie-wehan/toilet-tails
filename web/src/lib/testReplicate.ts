/**
 * Test function to check if Replicate is working
 */

import { replicate } from "@/lib/ai";

export async function testReplicate() {
  try {
    console.log("Testing Replicate API...");
    
    // Try a very simple model
    const output = await replicate.run(
      "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
      {
        input: {
          prompt: "a simple red circle",
          width: 256,
          height: 256,
          num_inference_steps: 10,
        }
      }
    );

    console.log("Replicate test successful!");
    console.log("Output type:", typeof output);
    console.log("Output:", output);
    
    return output;
  } catch (error) {
    console.error("Replicate test failed:", error);
    throw error;
  }
}
