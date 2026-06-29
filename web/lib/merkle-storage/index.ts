import type { MerkleArtifact } from "../merkle";
import { getMerkleStorageConfig, merkleObjectKey } from "./config";
import { getLocal, publishLocal, readLocalIndex, writeLocalIndex } from "./local";
import { findPinataByCampaignId, getPinata, publishPinata } from "./pinata";
import { getS3, publishS3, readS3Index, writeS3Index } from "./s3";
import type { MerkleIndex, PublishMerkleResult } from "./types";

function localPublicUrl(campaignId: number): string {
  return `/${merkleObjectKey(campaignId)}`;
}

async function readMergedIndex(): Promise<MerkleIndex> {
  const config = getMerkleStorageConfig();
  let index: MerkleIndex = {};

  if (config.enableLocal) {
    index = { ...index, ...(await readLocalIndex()) };
  }
  if (config.enableS3 && config.s3) {
    const s3Index = await readS3Index(config.s3);
    for (const [key, entry] of Object.entries(s3Index)) {
      index[key] = { ...index[key], ...entry };
    }
  }

  return index;
}

async function persistIndexEntry(campaignId: number, patch: Partial<MerkleIndex[string]>): Promise<void> {
  const config = getMerkleStorageConfig();
  const key = String(campaignId);
  const updatedAt = new Date().toISOString();

  if (config.enableLocal) {
    const index = await readLocalIndex();
    index[key] = { ...index[key], ...patch, updatedAt };
    await writeLocalIndex(index);
  }

  if (config.enableS3 && config.s3) {
    const index = await readS3Index(config.s3);
    index[key] = { ...index[key], ...patch, updatedAt };
    await writeS3Index(config.s3, index);
  }
}

function pickPrimaryUrl(locations: PublishMerkleResult["locations"]): string {
  if (locations.s3) return locations.s3;
  if (locations.ipfs) return locations.ipfs;
  if (locations.local) return locations.local;
  return "";
}

export async function publishMerkleProofs(
  campaignId: number,
  artifact: MerkleArtifact,
): Promise<PublishMerkleResult> {
  const config = getMerkleStorageConfig();
  const filename = merkleObjectKey(campaignId);
  const locations: PublishMerkleResult["locations"] = {};
  const errors: string[] = [];

  if (config.enableLocal) {
    try {
      const localUrl = localPublicUrl(campaignId);
      locations.local = await publishLocal(campaignId, artifact, localUrl);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Local publish failed");
    }
  }

  if (config.enableS3 && config.s3) {
    try {
      locations.s3 = await publishS3(config.s3, campaignId, artifact);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "S3 publish failed");
    }
  }

  if (config.enablePinata && config.pinata) {
    try {
      locations.ipfs = await publishPinata(config.pinata, campaignId, artifact);
      await persistIndexEntry(campaignId, { ipfs: locations.ipfs });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Pinata publish failed");
    }
  }

  const url = pickPrimaryUrl(locations);
  if (!url) {
    throw new Error(errors.join("; ") || "No merkle storage backend is configured");
  }

  return { campaignId, filename, url, locations };
}

export async function getMerkleProofs(campaignId: number): Promise<MerkleArtifact | null> {
  const config = getMerkleStorageConfig();
  const index = await readMergedIndex();
  const entry = index[String(campaignId)];

  if (config.enableLocal) {
    const local = await getLocal(campaignId);
    if (local) return local;
  }

  if (config.enableS3 && config.s3) {
    const fromS3 = await getS3(config.s3, campaignId);
    if (fromS3) return fromS3;
  }

  if (config.enablePinata && config.pinata) {
    const ipfsUrl = entry?.ipfs ?? (await findPinataByCampaignId(config.pinata, campaignId));
    const fromIpfs = await getPinata(config.pinata, campaignId, ipfsUrl ?? undefined);
    if (fromIpfs) return fromIpfs;
  }

  return null;
}

export function getActiveStorageDrivers(): string[] {
  const config = getMerkleStorageConfig();
  const drivers: string[] = [];
  if (config.enableLocal) drivers.push("local");
  if (config.enableS3) drivers.push("s3");
  if (config.enablePinata) drivers.push("pinata");
  return drivers;
}