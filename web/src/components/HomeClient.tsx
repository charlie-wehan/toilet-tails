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

  // Scene must be chosen first
  const [scene, setScene] = useState<SceneId | null>(null);

  // Optional bathroom background file (client-side only; server returns bgUrl)
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

    try {
      const form = new FormData();
      form.append("file", file);          // pet image
      form.append("scene", scene);        // selected scene
      if (bgFile) form.append("bg", bgFile); // optional bathroom background

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
    setBgUrl(null);
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
    </div>
  );
}
