import crypto from "crypto";
import path from "path";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Uploads a file to Supabase Storage (private bucket) and returns a 1-hour
 * signed URL for preview plus the permanent object key.
 */
export async function saveFileToStorage(
  file: File
): Promise<{ url: string; key: string }> {
  const BUCKET = process.env.SUPABASE_BUCKET!;
  if (!BUCKET) throw new Error("Missing SUPABASE_BUCKET env var");

  // Pick a safe extension based on name/type
  const fromName = path.extname(file.name).toLowerCase();
  const ext =
    [".png", ".jpg", ".jpeg", ".webp"].includes(fromName)
      ? fromName
      : file.type === "image/png"
      ? ".png"
      : file.type === "image/webp"
      ? ".webp"
      : ".jpg";

  const key = `${Date.now()}-${crypto.randomUUID()}${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const sb = supabaseServer();

  // Upload to private bucket
  const { error: upErr } = await sb.storage.from(BUCKET).upload(key, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) {
    throw new Error(`Supabase upload failed: ${upErr.message}`);
  }

  // Create a signed URL (1 hour) so we can preview in the UI
  const { data: signed, error: signErr } = await sb
    .storage
    .from(BUCKET)
    .createSignedUrl(key, 60 * 60); // seconds
  if (signErr || !signed?.signedUrl) {
    throw new Error("Could not create signed URL");
  }

  return { url: signed.signedUrl, key };
}
