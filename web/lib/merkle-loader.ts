import { toHex } from "@cosmjs/encoding";
import { injToEvm, isEvmAddress, isInjAddress } from "./address";
import { fromBase64Padded } from "./bytes";
import type { MerkleArtifact } from "./merkle";

export type MerkleProofEntry = MerkleArtifact["proofs"][string];

export function usesEvmProofKeys(artifact: MerkleArtifact): boolean {
  const keys = Object.keys(artifact.proofs);
  if (keys.length === 0) return false;
  return keys.every((key) => isEvmAddress(key));
}

export function findProofEntry(
  artifact: MerkleArtifact,
  walletAddress: string,
): MerkleProofEntry | null {
  const normalized = walletAddress.trim();
  const direct =
    artifact.proofs[normalized] ??
    artifact.proofs[normalized.toLowerCase()] ??
    artifact.proofs[normalized.toUpperCase()];
  if (direct) return direct;

  try {
    if (isInjAddress(normalized)) {
      const evm = injToEvm(normalized).toLowerCase();
      const viaEvm = artifact.proofs[evm];
      if (viaEvm) return viaEvm;
    }
    if (isEvmAddress(normalized)) {
      const evm = normalized.toLowerCase();
      return artifact.proofs[evm] ?? null;
    }
  } catch {
    return null;
  }

  return null;
}

export function getMerkleFormatIssue(artifact: MerkleArtifact): string | null {
  if (usesEvmProofKeys(artifact)) {
    return "This merkle file uses 0x addresses. Regenerate with inj1 addresses — the contract hashes your Keplr inj1 address, not 0x.";
  }
  const sample = Object.keys(artifact.proofs)[0];
  if (sample && !isInjAddress(sample)) {
    return "Merkle proof keys must be inj1 addresses matching the connected Keplr wallet.";
  }
  return null;
}

function usesMerkleApiProxy(): boolean {
  return process.env.NEXT_PUBLIC_MERKLE_USE_API?.trim().toLowerCase() === "true";
}

/** Public URL where claim proofs are hosted (no upload needed for recipients). */
export function getMerkleUrl(campaignId: number): string {
  if (usesMerkleApiProxy()) {
    return `/api/merkle?campaignId=${campaignId}`;
  }

  const explicit = process.env.NEXT_PUBLIC_MERKLE_URL?.trim();
  if (explicit) return explicit;

  const base = process.env.NEXT_PUBLIC_MERKLE_BASE_URL?.trim().replace(/\/$/, "");
  if (base) return `${base}/merkle-${campaignId}.json`;

  return `/merkle-${campaignId}.json`;
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

export function normalizeMerkleRoot(root: string | Uint8Array): string {
  if (root instanceof Uint8Array) {
    return `0x${toHex(root)}`;
  }

  const trimmed = root.trim();
  if (!trimmed) return "0x";

  if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) {
    return `0x${trimmed.slice(2).toLowerCase()}`;
  }

  try {
    return `0x${toHex(fromBase64Padded(trimmed))}`;
  } catch {
    return `0x${trimmed.toLowerCase()}`;
  }
}