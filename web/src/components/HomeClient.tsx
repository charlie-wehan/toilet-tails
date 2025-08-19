"use client";

import { useState } from "react";
import UploadBox from "@/components/UploadBox";

export default function HomeClient() {
  const [status, setStatus] =
    useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  async function handleSelect(file: File) {
    setStatus("uploading");
    setMessage("Uploading...");

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Upload failed");
      }

      setStatus("done");
      setMessage(
        `Received ${data.name} (${Math.round(Number(data.size) / 1024)} KB)`
      );
      console.log("Server response:", data);
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err?.message || "Upload failed");
    }
  }

  return (
    <div className="mt-12">
      <UploadBox onValidSelect={handleSelect} />
      {status !== "idle" && (
        <p className="mt-2 text-sm text-gray-600">
          {status === "uploading" ? "Uploading..." : message}
        </p>
      )}
    </div>
  );
}
