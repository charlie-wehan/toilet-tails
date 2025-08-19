"use client";

import { useRef, useState } from "react";

type Props = {
  onValidSelect?: (file: File) => void;
};

export default function UploadBox({ onValidSelect }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openPicker() {
    inputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation: type + size (10MB limit)
    const isImage = /^image\/(png|jpe?g|webp)$/i.test(file.type);
    if (!isImage) {
      setError("Please choose a PNG, JPG, or WEBP image.");
      e.target.value = "";
      return;
    }
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError("File too large. Max size is 10MB.");
      e.target.value = "";
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onValidSelect?.(file);
  }

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Upload your pet photo</h3>
            <p className="text-sm text-gray-500">
              PNG, JPG, or WEBP up to 10MB.
            </p>
          </div>
          <button
            onClick={openPicker}
            className="rounded-2xl px-4 py-2 bg-indigo-600 text-white font-medium hover:opacity-90"
          >
            Choose file
          </button>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {previewUrl ? (
          <div className="mt-6">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Selected pet preview"
                className="h-full w-full object-cover"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Nice! We’ll send this to the AI next.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid place-items-center rounded-2xl border border-dashed p-10 text-center text-gray-500">
            <div>No file selected — click “Choose file” above.</div>
          </div>
        )}
      </div>
    </div>
  );
}
