import type { MerkleArtifact } from "../merkle";

export type MerkleStorageLocations = {
  local?: string;
  s3?: string;
  ipfs?: string;
};

export type PublishMerkleResult = {
  campaignId: number;
  filename: string;
  url: string;
  locations: MerkleStorageLocations;
};

export type MerkleIndexEntry = {
  local?: string;
  s3?: string;
  ipfs?: string;
  updatedAt: string;
};

export type MerkleIndex = Record<string, MerkleIndexEntry>;