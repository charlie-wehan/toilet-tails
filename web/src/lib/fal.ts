import { fal } from "@fal-ai/client";

const FAL_KEY = process.env.FAL_KEY;

if (FAL_KEY) {
  fal.config({ credentials: FAL_KEY });
  console.log("FAL configured: true");
} else {
  console.log("FAL configured: false (missing FAL_KEY)");
}

export { fal };
