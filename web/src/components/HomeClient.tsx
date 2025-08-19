"use client";

import { useState, useRef } from "react";
import UploadBox from "@/components/UploadBox";
import ScenePicker, { SCENES, SceneId } from "@/components/ScenePicker";

type State = "idle" | "uploading" | "done" | "error";

export default function HomeClient() {
  const [status, setStatus] = useState<State>("idle");
  const [message, setMessage] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [scene, setScene] = useState<SceneId | null>(null); // ← no default
  const containerRef = useRef<HTMLDivElement | null>(null);

  async function handleSelect(file: File) {
    // Guard: require a scene first (UploadBox is also disabled until then)
    if (!scene) {
      setStatus("error");
      setMessage("Please choose a scene above first.");
      return;
    }

    setStatus("uploading");
    setMessage("Uploading...");
    setImageUrl(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("scene", scene); // safe: scene is not null here

      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Upload failed");
      }

      const sceneLabel = SCENES.find((s) => s.id === scene)?.label ?? String(scene);

      setStatus("done");
      setMessage(
        `Saved ${data.name} (${Math.round(Number(data.size) / 1024)} KB) — Scene: ${sceneLabel}`
      );
      setImageUrl(data.url);

      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err?.message || "Upload failed");
    }
  }

  function reset() {
    setStatus("idle");
    setMessage("");
    setImageUrl(null);
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div id="upload" ref={containerRef} className="mt-12">
      <div className="mb-6">
        <ScenePicker value={scene} onChange={setScene as (s: SceneId) => void} />
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

      {imageUrl && (
        <div className="mt-4">
          <div className="text-sm text-gray-500 mb-2">Server file URL:</div>
          <a href={imageUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline">
            {imageUrl}
          </a>
          <div className="mt-3 aspect-[4/3] w-full overflow-hidden rounded-2xl border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Saved upload" className="h-full w-full object-cover" />
          </div>
        </div>
      )}
    </div>
  );
}
