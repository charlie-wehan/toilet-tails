/**
 * Utility to check Supabase bucket configuration
 */

import { supabaseServer } from "@/lib/supabaseServer";

export async function checkBucketAccess() {
  try {
    const BUCKET = process.env.SUPABASE_BUCKET!;
    if (!BUCKET) {
      throw new Error("SUPABASE_BUCKET environment variable not found");
    }

    console.log("Checking Supabase bucket access...");
    console.log("Bucket name:", BUCKET);

    const sb = supabaseServer();

    // Try to list files in the bucket to test access
    const { data: files, error } = await sb.storage.from(BUCKET).list('', {
      limit: 1,
    });

    if (error) {
      console.error("Bucket access error:", error);
      throw new Error(`Cannot access bucket: ${error.message}`);
    }

    console.log("Bucket access successful");
    console.log("Files in bucket:", files?.length || 0);

    return true;
  } catch (error) {
    console.error("Bucket check failed:", error);
    throw error;
  }
}
