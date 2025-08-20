import { NextResponse } from "next/server";
import { saveFileToStorage } from "@/lib/storage";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { ok: false, error: "Expected multipart/form-data" },
        { status: 415 }
      );
    }

    const form = await req.formData();

    // Required: pet image
    const file = form.get("file");
    // Optional: bathroom background
    const bg = form.get("bg");
    // Scene string (optional; we treat it as metadata)
    const scene = form.get("scene");

    // ---- Validate pet image ----
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ ok: false, error: "Unsupported type" }, { status: 415 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "File too large" }, { status: 413 });
    }

    // ---- Validate background (if provided) ----
    let bgFile: File | null = null;
    if (bg instanceof File && bg.size > 0) {
      if (!ALLOWED_TYPES.has(bg.type)) {
        return NextResponse.json({ ok: false, error: "Background type unsupported" }, { status: 415 });
      }
      if (bg.size > MAX_BYTES) {
        return NextResponse.json({ ok: false, error: "Background file too large" }, { status: 413 });
      }
      bgFile = bg;
    }

    // ---- Save pet image ----
    const { url, key } = await saveFileToStorage(file);

    // ---- Save background image (optional) ----
    let bgUrl: string | null = null;
    let bgKey: string | null = null;
    if (bgFile) {
      const saved = await saveFileToStorage(bgFile);
      bgUrl = saved.url;
      bgKey = saved.key;
    }

    // ---- Persist upload record (pet image + scene) ----
    const uploadRow = await prisma.upload.create({
      data: {
        key,
        url,
        name: file.name,
        type: file.type,
        size: Number(file.size),
        scene: typeof scene === "string" ? scene : null,
        bgKey: bgKey,      // ← add
        bgUrl: bgUrl,      // ← add
      },
    });

    return NextResponse.json({
      ok: true,
      // pet
      name: file.name,
      type: file.type,
      size: file.size,
      url,
      key,
      // bg (optional)
      bgUrl,
      bgKey,
      // meta
      scene,
      uploadId: uploadRow.id,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
