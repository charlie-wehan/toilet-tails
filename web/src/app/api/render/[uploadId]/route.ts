import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/render/:uploadId
 * Returns the latest RenderJob for a given upload.
 */
export async function GET(
  _req: Request,
  { params }: { params: { uploadId: string } }
) {
  try {
    const { uploadId } = params;

    // make sure the upload exists (optional but nice)
    const upload = await prisma.upload.findUnique({ where: { id: uploadId } });
    if (!upload) {
      return NextResponse.json({ ok: false, error: "Upload not found" }, { status: 404 });
    }

    // latest job for this upload
    const job = await prisma.renderJob.findFirst({
      where: { uploadId },
      orderBy: { createdAt: "desc" },
    });

    if (!job) {
      return NextResponse.json({ ok: false, error: "No job yet" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, job });
  } catch (err) {
    console.error("Render status error:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
