import type { MerkleArtifact } from "./merkle";

type PublishResponse = {
  ok?: boolean;
  url?: string;
  requiresClientUpload?: boolean;
  uploadUrl?: string;
  publicUrl?: string;
  error?: string;
};

function parseApiError(text: string): string {
  try {
    const json = JSON.parse(text) as { error?: string };
    if (json.error) return json.error;
  } catch {
    // not JSON
  }
  return text || "Failed to publish merkle proofs";
}

async function uploadToPresignedUrl(uploadUrl: string, artifact: MerkleArtifact): Promise<void> {
  const body = JSON.stringify(artifact, null, 2);

  let putRes: Response;
  try {
    putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload failed";
    throw new Error(
      `[browser→R2] ${message}. Add OPTIONS + PUT to R2 CORS for your exact Vercel URL.`,
    );
  }

  if (!putRes.ok) {
    const text = await putRes.text();
    throw new Error(
      `[browser→R2] upload failed (${putRes.status}): ${text || putRes.statusText}`,
    );
  }
}

export async function publishMerkleArtifact(
  campaignId: number,
  artifact: MerkleArtifact,
): Promise<{ url: string }> {
  const response = await fetch("/api/merkle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campaignId, artifact }),
  });

  const text = await response.text();
  let data: PublishResponse;
  try {
    data = JSON.parse(text) as PublishResponse;
  } catch {
    throw new Error(parseApiError(text));
  }

  if (data.requiresClientUpload && data.uploadUrl && data.publicUrl) {
    await uploadToPresignedUrl(data.uploadUrl, artifact);
    return { url: data.publicUrl };
  }

  if (!response.ok) {
    throw new Error(data.error || parseApiError(text));
  }

  if (!data.url) {
    throw new Error("Publish succeeded but no URL was returned");
  }

  return { url: data.url };
}