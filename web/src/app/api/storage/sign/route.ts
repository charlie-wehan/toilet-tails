import { NextResponse } from "next/server";
import crypto from "crypto";
import path from "path";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(req: Request) {
  try {
    const BUCKET = process.env.SUPABASE_BUCKET!;
    if (!BUCKET) {
      return NextResponse.json({ ok: false, error: "Missing SUPABASE_BUCKET" }, { status: 500 });
    }

    const body = await req.json().catch(() => null) as { name?: string; type?: string } | null;
    const name = body?.name || "";
    const type = body?.type || "";

    if (!name || !type) {
      return NextResponse.json({ ok: false, error: "Missing name/type" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ ok: false, error: "Unsupported type" }, { status: 415 });
    }

    // Choose a safe extension
    const fromName = path.extname(name).toLowerCase();
    const ext =
      [".png", ".jpg", ".jpeg", ".webp"].includes(fromName)
        ? fromName
        : type === "image/png"
        ? ".png"
        : type === "image/webp"
        ? ".webp"
        : ".jpg";

    // Generate a unique object key (path inside the bucket)
    const key = `${Date.now()}-${crypto.randomUUID()}${ext}`;

    const sb = supabaseServer();

    // Create a one-time signed upload URL/token for this key
    const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(key);
    if (error || !data) {
      return NextResponse.json({ ok: false, error: error?.message || "Sign failed" }, { status: 500 });
    }

    // Return the key (path in bucket) and the token needed to upload directly
    // Client will use supabaseClient.storage.from(BUCKET).uploadToSignedUrl(key, data.token, file)
    return NextResponse.json({
      ok: true,
      bucket: BUCKET,
      key,
      token: (data as any).token,        // supabase-js v2 returns { signedUrl, token }
      signedUrl: (data as any).signedUrl // not required for upload, but handy for debugging
    });
  } catch (err: any) {
    console.error("Sign error:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
