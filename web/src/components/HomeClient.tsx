"use client";

import { useState, useRef } from "react";
import UploadBox from "@/components/UploadBox";
import ScenePicker, { SCENES, SceneId } from "@/components/ScenePicker";

type State = "idle" | "uploading" | "done" | "error";

export default function HomeClient() {
  const [status, setStatus] = useState<State>("idle");
  const [message, setMessage] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string | null>(null); // pet (saved)
  const [bgUrl, setBgUrl] = useState<string | null>(null);        // background (saved)

  const [uploadId, setUploadId] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderMsg, setRenderMsg] = useState<string>("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const [scene, setScene] = useState<SceneId | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  async function handleSelect(file: File) {
    if (!scene) {
      setStatus("error");
      setMessage("Please choose a scene above first.");
      return;
    }

    setStatus("uploading");
    setMessage("Uploading...");
    setImageUrl(null);
    setBgUrl(null);
    setResultUrl(null);
    setRenderMsg("");

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("scene", scene);
      if (bgFile) form.append("bg", bgFile);

      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Upload failed");
      }

      const sceneLabel = SCENES.find((s) => s.id === scene)?.label ?? String(scene);

      setStatus("done");
      setMessage(
        `Saved ${data.name} (${Math.round(Number(data.size) / 1024)} KB) — Scene: ${sceneLabel}${
          data.bgUrl ? " + Background" : ""
        }`
      );
      setImageUrl(data.url || null);
      setBgUrl(data.bgUrl || null);
      setUploadId(data.uploadId || null);

      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err?.message || "Upload failed");
    }
  }

  // Poll the render status until complete/failed or timeout
  async function pollRenderStatus(id: string, maxMs = 60_000, intervalMs = 1500) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      const r = await fetch(`/api/render/${id}`);
      const j = await r.json();
      if (r.ok && j?.ok) {
        const job = j.job;
        if (job.status === "complete") return { status: "complete", url: job.resultUrl as string | null };
        if (job.status === "failed") return { status: "failed", error: job.error || "Render failed" };
      }
      await new Promise((res) => setTimeout(res, intervalMs));
    }
    return { status: "timeout", error: "Render timed out" };
  }

  async function generate() {
    if (!uploadId) return;
    setRendering(true);
    setRenderMsg("Generating…");
    setResultUrl(null);

    try {
      // Kick off render job
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Render failed to start");
      }

      // Poll for status (works for both instant + long jobs)
      const out = await pollRenderStatus(uploadId);
      if (out.status === "complete") {
        setResultUrl(out.url || null);
        setRenderMsg("Done!");
      } else {
        setRenderMsg((out as any).error || "Render failed");
      }
    } catch (err: any) {
      console.error(err);
      setRenderMsg(err?.message || "Render failed");
    } finally {
      setRendering(false);
    }
  }

  function reset() {
    setStatus("idle");
    setMessage("");
    setImageUrl(null);
    setBgUrl(null);
    setUploadId(null);
    setResultUrl(null);
    setRenderMsg("");
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div id="upload" ref={containerRef} className="mt-12">
      <div className="mb-6">
        <ScenePicker value={scene} onChange={setScene as (s: SceneId) => void} />
      </div>

      <div className="mb-6">
        <UploadBox
          title="Upload your bathroom photo (optional)"
          hint="Tip: straight-on, well-lit, no people. PNG/JPG/WEBP up to 10MB."
          onValidSelect={setBgFile}
          disabled={false}
        />
        {bgFile && (
          <p className="mt-2 text-sm text-gray-500">
            Bathroom photo selected: {bgFile.name}
          </p>
        )}
      </div>

      <UploadBox onValidSelect={handleSelect} disabled={!scene} />

      {status !== "idle" && (
        <div className="mt-2 flex items-center gap-3 text-sm text-gray-600">
          <span>{status === "uploading" ? "Uploading..." : message}</span>
          {status !== "uploading" && (
            <button
              onClick={reset}
              className="rounded-xl border px-3 py-1 hover:bg-gray-50"
            >
              Upload another
            </button>
          )}
        </div>
      )}

      {(bgUrl || imageUrl) && (
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          {bgUrl && (
            <div>
              <div className="text-sm text-gray-500 mb-2">Background (saved)</div>
              <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bgUrl} alt="Saved background" className="h-full w-full object-cover" />
              </div>
            </div>
          )}
          {imageUrl && (
            <div>
              <div className="text-sm text-gray-500 mb-2">Pet (saved)</div>
              <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Saved pet" className="h-full w-full object-cover" />
              </div>
            </div>
          )}
        </div>
      )}

      {uploadId && (
        <div className="mt-6">
          <button
            onClick={generate}
            disabled={rendering}
            className="rounded-2xl px-5 py-3 bg-indigo-600 text-white font-medium hover:opacity-90 disabled:opacity-60"
          >
            {rendering ? "Generating…" : "Generate Toilet Tail"}
          </button>
          {renderMsg && (
            <p className="mt-2 text-sm text-gray-600">{renderMsg}</p>
          )}
        </div>
      )}

      {resultUrl && (
        <div className="mt-4">
          <div className="text-sm text-gray-500 mb-2">Result</div>
          <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resultUrl} alt="Generated result" className="h-full w-full object-cover" />
          </div>
        </div>
      )}
    </div>
  );
}
