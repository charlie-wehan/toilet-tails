"use client";

import { useState } from "react";
import UploadBox from "@/components/UploadBox";

export default function HomeClient() {
  const [file, setFile] = useState<File | null>(null);

  function handleSelect(f: File) {
    setFile(f);
    console.log("Selected file:", f.name, f.type, f.size);
  }

  return (
    <div className="mt-12">
      <UploadBox onValidSelect={handleSelect} />
      {file && (
        <p className="mt-2 text-sm text-gray-500">
          Selected: {file.name}
        </p>
      )}
    </div>
  );
}

