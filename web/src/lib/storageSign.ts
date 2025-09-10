import { supabaseServer } from "@/lib/supabaseServer";

const BUCKET = process.env.SUPABASE_BUCKET!;

export async function signStorageKey(key: string, expiresSeconds = 60 * 60): Promise<string> {
  const sb = supabaseServer();
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(key, expiresSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(`Failed to sign key ${key}: ${error?.message || "unknown"}`);
  }
  return data.signedUrl;
}


