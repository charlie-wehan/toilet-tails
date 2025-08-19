import { NextResponse } from "next/server";
import { saveFileToStorage } from "@/lib/storage";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ ok: false, error: "Expected multipart/form-data" }, { status: 415 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const scene = form.get("scene");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ ok: false, error: "Unsupported type" }, { status: 415 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "File too large" }, { status: 415 });
    }

    const { url, key } = await saveFileToStorage(file);

    const uploadRow = await prisma.upload.create({
      data: {
        key,
        url,
        name: file.name,
        type: file.type,
        size: Number(file.size),
        scene: typeof scene === "string" ? scene : null,
      },
    });

    return NextResponse.json({
      ok: true,
      name: file.name,
      type: file.type,
      size: file.size,
      url,
      key,
      scene,
      uploadId: uploadRow.id,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
