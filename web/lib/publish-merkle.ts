import type { MerkleArtifact } from "./merkle";

export async function publishMerkleArtifact(
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
    throw new Error(text || "Failed to publish merkle proofs");
  }

  return response.json() as Promise<{ url: string }>;
}