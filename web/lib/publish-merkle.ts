import type { MerkleArtifact } from "./merkle";

function parseApiError(text: string): string {
  try {
    const json = JSON.parse(text) as { error?: string };
    if (json.error) return json.error;
  } catch {
    // not JSON
  }
  return text || "Failed to publish merkle proofs";
}

async function publishViaPresignedUpload(
  campaignId: number,
  artifact: MerkleArtifact,
): Promise<{ url: string }> {
  const presignRes = await fetch("/api/merkle/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campaignId }),
  });

  if (!presignRes.ok) {
    const text = await presignRes.text();
    throw new Error(parseApiError(text));
  }

  const { uploadUrl, publicUrl } = (await presignRes.json()) as {
    uploadUrl: string;
    publicUrl: string;
  };

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
      `${message}. If this is a CORS error, add PUT to your R2 bucket CORS policy for your Vercel domain.`,
    );
  }

  if (!putRes.ok) {
    const text = await putRes.text();
    throw new Error(
      `R2 browser upload failed (${putRes.status}): ${text || putRes.statusText}. ` +
        "Ensure R2 CORS allows PUT from your Vercel URL.",
    );
  }

  return { url: publicUrl };
}

async function publishViaServer(
  campaignId: number,
  artifact: MerkleArtifact,
): Promise<{ url: string }> {
  const response = await fetch("/api/merkle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campaignId, artifact }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(parseApiError(text));
  }

  return response.json() as Promise<{ url: string }>;
}

export async function publishMerkleArtifact(
  campaignId: number,
  artifact: MerkleArtifact,
): Promise<{ url: string }> {
  // R2 on Vercel: server-side fetch to *.cloudflarestorage.com often fails (TLS/network).
  // Presign locally on the server, upload from the browser directly to R2.
  try {
    return await publishViaPresignedUpload(campaignId, artifact);
  } catch (presignError) {
    const message =
      presignError instanceof Error ? presignError.message : "Presigned upload unavailable";

    if (!message.includes("only available for Cloudflare R2")) {
      throw presignError;
    }
  }

  return publishViaServer(campaignId, artifact);
}