import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

type FileMeta = {
  key: string;
  name: string;
  type: string;
  size: number;
};

export async function POST(req: Request) {
  try {
    const BUCKET = process.env.SUPABASE_BUCKET!;
    if (!BUCKET) {
      return NextResponse.json({ ok: false, error: "Missing SUPABASE_BUCKET" }, { status: 500 });
    }

    const body = (await req.json().catch(() => null)) as
      | { pet?: FileMeta; bg?: FileMeta; scene?: string }
      | null;

    const pet = body?.pet;
    const bg = body?.bg;
    const scene = body?.scene ?? null;

    if (!pet) {
      return NextResponse.json({ ok: false, error: "Missing pet meta" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(pet.type) || pet.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "Invalid pet meta" }, { status: 400 });
    }
    if (bg && (!ALLOWED_TYPES.has(bg.type) || bg.size > MAX_BYTES)) {
      return NextResponse.json({ ok: false, error: "Invalid bg meta" }, { status: 400 });
    }

    const sb = supabaseServer();

    // Create signed URLs (for preview). These expire; we store keys permanently.
    const { data: petSigned, error: petSignErr } = await sb
      .storage
      .from(BUCKET)
      .createSignedUrl(pet.key, 60 * 60);
    if (petSignErr || !petSigned?.signedUrl) {
      return NextResponse.json({ ok: false, error: "Could not sign pet url" }, { status: 500 });
    }

    let bgSignedUrl: string | null = null;
    if (bg?.key) {
      const { data: bgSigned, error: bgSignErr } = await sb
        .storage
        .from(BUCKET)
        .createSignedUrl(bg.key, 60 * 60);
      if (bgSignErr) {
        return NextResponse.json({ ok: false, error: "Could not sign bg url" }, { status: 500 });
      }
      bgSignedUrl = bgSigned?.signedUrl ?? null;
    }

    // Persist upload row
    const uploadRow = await prisma.upload.create({
      data: {
        key: pet.key,
        url: petSigned.signedUrl,
        name: pet.name,
        type: pet.type,
        size: Math.round(pet.size),
        scene,
        bgKey: bg?.key ?? null,
        bgUrl: bgSignedUrl,
      },
    });

    return NextResponse.json({
      ok: true,
      uploadId: uploadRow.id,
      // pet
      key: pet.key,
      url: petSigned.signedUrl,
      name: pet.name,
      type: pet.type,
      size: pet.size,
      // bg
      bgKey: bg?.key ?? null,
      bgUrl: bgSignedUrl,
      scene,
    });
  } catch (err) {
    console.error("Commit error:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
