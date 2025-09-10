import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/db";
import { runAIPipeline } from "@/lib/functions/aiPipeline";
import { signStorageKey } from "@/lib/storageSign";

export const renderJob = inngest.createFunction(
  { id: "render-toilet-tail", name: "Render Toilet Tail" },
  { event: "render/start" },
  async ({ event, step }) => {
    const { uploadId, scene, petKey, bgKey, options } = event.data as any;

    // Step 1: Update job status to processing
    await step.run("update-status-processing", async () => {
      await prisma.renderJob.updateMany({
        where: { uploadId },
        data: { status: "processing" }
      });
    });

    // Step 2: Get upload data
    const upload = await step.run("get-upload-data", async () => {
      const upload = await prisma.upload.findUnique({
        where: { id: uploadId }
      });
      if (!upload) throw new Error("Upload not found");
      return upload;
    });

    // Step 3: Run AI Pipeline
    const aiResult = await step.run("ai-pipeline", async () => {
      try {
        // Re-sign pet and background keys if we have them in DB
        const petUrl = upload.url || (upload.key ? await signStorageKey(upload.key, 60 * 60) : "");
        const bgUrl = upload.bgUrl || (upload.bgKey ? await signStorageKey(upload.bgKey, 60 * 60) : undefined);

        const result = await runAIPipeline(uploadId, petUrl, scene as any, bgUrl, options || {});
        return result;
      } catch (error) {
        console.error("AI pipeline failed:", error);
        // Mark job as failed
        await prisma.renderJob.updateMany({
          where: { uploadId },
          data: { 
            status: "failed",
            error: error instanceof Error ? error.message : "AI pipeline failed"
          }
        });
        throw error;
      }
    });

    // Step 4: Update job as complete with AI result
    await step.run("mark-complete", async () => {
      await prisma.renderJob.updateMany({
        where: { uploadId },
        data: { 
          status: "complete",
          resultUrl: aiResult.finalResult || null,
          // store steps if your Prisma client allows; fallback skip if not
          // @ts-ignore
          aiSteps: aiResult.steps,
          finalKey: aiResult.finalResult ? `ai-results/${uploadId}/final-${Date.now()}.png` : null
        }
      });
    });

    return { uploadId, resultUrl: aiResult.finalResult };
  }
);
