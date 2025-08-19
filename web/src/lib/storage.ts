import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * Storage adapter interface. Today: local disk.
 * Later: swap to S3, Vercel Blob, R2, etc. w/ same signature.
 */
export async function saveFileToStorage(
  file: File
): Promise<{ url: string; key: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const extFromName = path.extname(file.name).toLowerCase();
  const ext =
    [".png", ".jpg", ".jpeg", ".webp"].includes(extFromName)
      ? extFromName
      : file.type === "image/png"
      ? ".png"
      : file.type === "image/webp"
      ? ".webp"
      : ".jpg";

  const key = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  const filepath = path.join(uploadDir, key);
  await writeFile(filepath, buffer);

  // In prod this would be a CDN URL; locally Next serves /public as /
  return { url: `/uploads/${key}`, key };
}
