/**
 * Minimal Replicate HTTP client using Predictions API (non-streaming)
 */

export interface ReplicatePredictionInput {
  version: string; // model version hash
  input: Record<string, unknown>;
}

export async function runReplicatePrediction({ version, input }: ReplicatePredictionInput): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error("Missing REPLICATE_API_TOKEN");
  }

  const base = "https://api.replicate.com/v1";

  const createRes = await fetch(`${base}/predictions`, {
    method: "POST",
    headers: {
      "Authorization": `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ version, input, stream: false }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Replicate create failed: ${createRes.status} ${err}`);
  }

  const created = await createRes.json();
  const id: string = created?.id;
  if (!id) throw new Error("Replicate did not return prediction id");

  // Poll until completed
  const startedAt = Date.now();
  const maxMs = 180_000; // 3 minutes
  while (true) {
    const getRes = await fetch(`${base}/predictions/${id}`, {
      headers: { "Authorization": `Token ${token}` },
    });
    if (!getRes.ok) {
      const err = await getRes.text();
      throw new Error(`Replicate get failed: ${getRes.status} ${err}`);
    }
    const pred = await getRes.json();
    const status: string = pred?.status;
    if (status === "succeeded") {
      const out = pred?.output as unknown;
      if (Array.isArray(out) && out.length > 0 && typeof out[0] === "string") return out[0] as string;
      if (typeof out === "string") return out as string;
      // Some models return objects with url fields
      if (Array.isArray(out) && out.length > 0 && out[0] && typeof out[0] === "object" && (out[0] as any).url) {
        return (out[0] as any).url as string;
      }
      throw new Error("Replicate succeeded but output format unknown");
    }
    if (status === "failed" || status === "canceled") {
      const err = pred?.error || JSON.stringify(pred);
      throw new Error(`Replicate prediction ${status}: ${err}`);
    }
    if (Date.now() - startedAt > maxMs) {
      throw new Error("Replicate prediction timed out");
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}
