import sharp from "sharp";

// Create a simple rounded-rect white mask on black background as PNG
export async function createCenteredMaskPng(
  width = 1024,
  height = 1024,
  rectWidth = 512,
  rectHeight = 360,
  radius = 40,
  yOffset = 560
): Promise<string> {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>
  <rect x='0' y='0' width='${width}' height='${height}' fill='black'/>
  <rect x='${(width - rectWidth) / 2}' y='${yOffset}' width='${rectWidth}' height='${rectHeight}' rx='${radius}' fill='white'/>
</svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const b64 = png.toString("base64");
  return `data:image/png;base64,${b64}`;
}


