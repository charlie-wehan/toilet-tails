"use client";

import { useState, useRef } from "react";
import UploadBox from "@/components/UploadBox";
import ScenePicker, { SCENES, SceneId } from "@/components/ScenePicker";
import { supabaseClient } from "@/lib/supabaseClient";

type State = "idle" | "uploading" | "done" | "error";

export default function HomeClient() {
  const [status, setStatus] = useState<State>("idle");
  const [message, setMessage] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string | null>(null); // pet (signed preview)
  const [bgUrl, setBgUrl] = useState<string | null>(null);        // background (signed preview)

  const [uploadId, setUploadId] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderMsg, setRenderMsg] = useState<string>("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const [scene, setScene] = useState<SceneId | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);

  // Generation controls
  const [identityStrength, setIdentityStrength] = useState<number>(0.35); // 0.25–0.6
  const [aspectRatio, setAspectRatio] = useState<string>("square"); // square | landscape_4_3 | portrait_4_3
  const [upscale, setUpscale] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  async function signForUpload(name: string, type: string) {
    const res = await fetch("/api/storage/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok) throw new Error(data?.error || "Sign failed");
    return data as { bucket: string; key: string; token: string };
  }

  async function directUpload(bucket: string, key: string, token: string, file: File) {
    const up = await supabaseClient.storage.from(bucket).uploadToSignedUrl(key, token, file);
    if (up.error) throw new Error(up.error.message);
    return { bucket, key };
  }

  async function handleSelect(file: File) {
    if (!scene) {
      setStatus("error");
      setMessage("Please choose a scene above first.");
      return;
    }

    setStatus("uploading");
    setMessage("Uploading directly to storage…");
    setImageUrl(null);
    setBgUrl(null);
    setResultUrl(null);
    setRenderMsg("");

    try {
      // 1) If background provided, upload it first
      let bgMeta: { key: string; name: string; type: string; size: number } | null = null;
      if (bgFile) {
        const signedBg = await signForUpload(bgFile.name, bgFile.type);
        await directUpload(signedBg.bucket, signedBg.key, signedBg.token, bgFile);
        bgMeta = { key: signedBg.key, name: bgFile.name, type: bgFile.type, size: bgFile.size };
      }

      // 2) Upload pet image
      const signedPet = await signForUpload(file.name, file.type);
      await directUpload(signedPet.bucket, signedPet.key, signedPet.token, file);

      // 3) Commit metadata on server (creates DB row + returns signed preview URLs)
      const commitRes = await fetch("/api/upload/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pet: { key: signedPet.key, name: file.name, type: file.type, size: file.size },
          bg: bgMeta ?? undefined,
          scene,
        }),
      });
      const committed = await commitRes.json();
      if (!commitRes.ok || !committed?.ok) {
        throw new Error(committed?.error || "Commit failed");
      }

      const sceneLabel = SCENES.find((s) => s.id === scene)?.label ?? String(scene);

      setStatus("done");
      setMessage(
        `Saved ${file.name} (${Math.round(Number(file.size) / 1024)} KB) — Scene: ${sceneLabel}${
          committed.bgUrl ? " + Background" : ""
        }`
      );
      setImageUrl(committed.url || null);
      setBgUrl(committed.bgUrl || null);
      setUploadId(committed.uploadId || null);

      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err?.message || "Upload failed");
    }
  }

  // Polling + render button (unchanged)
  async function pollRenderStatus(id: string, maxMs = 300_000, intervalMs = 2000) {
    const start = Date.now();
    let attempts = 0;
    
    while (Date.now() - start < maxMs) {
      attempts++;
      try {
        const r = await fetch(`/api/render/${id}`);
        const j = await r.json();
        
        if (r.ok && j?.ok) {
          const job = j.job;
          
          // Update status message based on job status
          if (job.status === "queued") {
            setRenderMsg(`Queued... (attempt ${attempts})`);
          } else if (job.status === "processing") {
            setRenderMsg(`Processing... (attempt ${attempts})`);
          } else if (job.status === "complete") {
            return { status: "complete", url: job.resultUrl as string | null };
          } else if (job.status === "failed") {
            return { status: "failed", error: job.error || "Render failed" };
          }
        } else {
          console.error("Poll response error:", j);
        }
      } catch (error) {
        console.error("Poll request failed:", error);
      }
      
      await new Promise((res) => setTimeout(res, intervalMs));
    }
    
    return { status: "timeout", error: "Render timed out after 5 minutes" };
  }

  async function generate() {
    if (!uploadId) return;
    setRendering(true);
    setRenderMsg("Generating…");
    setResultUrl(null);

    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId,
          options: {
            identityStrength,
            aspectRatio,
            upscale,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Render failed to start");
      }

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

      {/* Controls */}
      <div className="mb-6 grid md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Identity strength</label>
          <input
            type="range"
            min={0.25}
            max={0.6}
            step={0.05}
            value={identityStrength}
            onChange={(e) => setIdentityStrength(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-500 mt-1">{identityStrength.toFixed(2)}</div>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Aspect ratio</label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="square">Square (1:1)</option>
            <option value="landscape_4_3">Landscape 4:3</option>
            <option value="portrait_4_3">Portrait 4:3</option>
          </select>
        </div>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={upscale}
            onChange={(e) => setUpscale(e.target.checked)}
          />
          <span className="text-sm text-gray-700">Upscale</span>
        </label>
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
              <div className="text-sm text-gray-500 mb-2">Background (signed)</div>
              <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bgUrl} alt="Saved background" className="h-full w-full object-cover" />
              </div>
            </div>
          )}
          {imageUrl && (
            <div>
              <div className="text-sm text-gray-500 mb-2">Pet (signed)</div>
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
