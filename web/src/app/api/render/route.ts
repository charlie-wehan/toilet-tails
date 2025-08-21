import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * POST /api/render
 * Body: { uploadId: string }
 *
 * Dev stub:
 * - Creates a RenderJob row with status 'queued'
 * - Immediately marks it 'complete' with a placeholder resultUrl
 * Later we'll move the "processing" to a background worker.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as { uploadId?: string } | null;
    const uploadId = body?.uploadId;

    if (!uploadId) {
      return NextResponse.json({ ok: false, error: "Missing uploadId" }, { status: 400 });
    }

    // Ensure upload exists
    const upload = await prisma.upload.findUnique({ where: { id: uploadId } });
    if (!upload) {
      return NextResponse.json({ ok: false, error: "Upload not found" }, { status: 404 });
    }

    // 1) Create queued job
    const job = await prisma.renderJob.create({
      data: {
        uploadId,
        status: "queued",
      },
    });

    // 2) Dev stub: pretend we processed it and produced a result
    // For now, just echo the pet image URL as the "result"
    const resultUrl = upload.url;

    const done = await prisma.renderJob.update({
      where: { id: job.id },
      data: {
        status: "complete",
        resultUrl,
      },
    });

    return NextResponse.json({ ok: true, job: done });
  } catch (err) {
    console.error("Render stub error:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
