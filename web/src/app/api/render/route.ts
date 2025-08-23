import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { inngest } from "@/lib/inngest";

export const runtime = "nodejs";

/**
 * POST /api/render
 * Body: { uploadId: string }
 *
 * Now enqueues jobs for async processing via Inngest
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as { uploadId?: string, options?: any } | null;
    const uploadId = body?.uploadId;
    
    if (!uploadId) {
      return NextResponse.json({ ok: false, error: "Missing uploadId" }, { status: 400 });
    }

    // Ensure upload exists
    const upload = await prisma.upload.findUnique({ where: { id: uploadId } });
    if (!upload) {
      return NextResponse.json({ ok: false, error: "Upload not found" }, { status: 404 });
    }

    // Create queued job
    const job = await prisma.renderJob.create({
      data: { uploadId, status: "queued" },
    });

    // Enqueue the render job (async)
    await inngest.send({
      name: "render/start",
      data: {
        uploadId,
        scene: upload.scene || "unknown",
        petKey: upload.key,
        bgKey: upload.bgKey || undefined,
        options: body?.options || {},
      },
    });

    return NextResponse.json({ 
      ok: true, 
      job: { ...job, status: "queued" },
      message: "Render job queued successfully"
    });
  } catch (err) {
    console.error("Render enqueue error:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
