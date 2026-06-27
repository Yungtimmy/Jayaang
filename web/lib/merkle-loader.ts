import { fromBase64, toHex } from "@cosmjs/encoding";
import type { MerkleArtifact } from "./merkle";

/** Public URL where claim proofs are hosted (no upload needed for recipients). */
export function getMerkleUrl(campaignId: number): string {
  const explicit = process.env.NEXT_PUBLIC_MERKLE_URL?.trim();
  if (explicit) return explicit;

  const base = process.env.NEXT_PUBLIC_MERKLE_BASE_URL?.trim().replace(/\/$/, "");
  if (base) return `${base}/merkle-${campaignId}.json`;

  return campaignId === 0 ? "/merkle-test.json" : `/merkle-${campaignId}.json`;
}

export async function fetchMerkleArtifact(campaignId: number): Promise<MerkleArtifact> {
  const url = getMerkleUrl(campaignId);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load merkle proofs from ${url}`);
  }

  const parsed = (await response.json()) as MerkleArtifact;
  if (!parsed.root || !parsed.proofs) {
    throw new Error(`Invalid merkle data at ${url}`);
  }

  return parsed;
}

export function normalizeMerkleRoot(root: string): string {
  const trimmed = root.trim();
  if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) {
    return `0x${trimmed.slice(2).toLowerCase()}`;
  }

  try {
    return `0x${toHex(fromBase64(trimmed))}`;
  } catch {
    return `0x${trimmed.toLowerCase()}`;
  }
}