import { prisma } from "@/lib/db";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // always fetch fresh

export default async function UploadsPage() {
  const uploads = await prisma.upload.findMany({
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Recent Uploads</h1>
        <p className="text-sm text-gray-500">
          Latest 25 uploads from the database (pet + optional background).
        </p>
      </div>

      {uploads.length === 0 ? (
        <p className="text-gray-600">No uploads yet.</p>
      ) : (
        <ul className="space-y-4">
          {uploads.map((u) => (
            <li key={u.id} className="rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-gray-500">
                    {u.type} • {(u.size / 1024).toFixed(0)} KB •{" "}
                    {new Date(u.createdAt).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    Scene: {u.scene ?? "—"}
                  </div>
                  {u.bgUrl && (
                    <div className="text-xs text-gray-500">
                      Background: available
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {u.url && (
                    <a
                      href={u.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 underline text-sm"
                    >
                      View pet
                    </a>
                  )}
                  {u.bgUrl && (
                    <a
                      href={u.bgUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 underline text-sm"
                    >
                      View background
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <Link href="/" className="text-indigo-600 underline">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
