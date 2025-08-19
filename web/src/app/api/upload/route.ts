import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { ok: false, error: "Expected multipart/form-data" },
        { status: 415 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      name: file.name,
      type: file.type,
      size: file.size,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
