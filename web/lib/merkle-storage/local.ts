import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { MerkleArtifact } from "../merkle";
import { MERKLE_INDEX_KEY, merkleObjectKey } from "./config";
import type { MerkleIndex } from "./types";

const PUBLIC_DIR = path.join(process.cwd(), "public");

function indexPath(): string {
  return path.join(PUBLIC_DIR, MERKLE_INDEX_KEY);
}

function artifactPath(campaignId: number): string {
  return path.join(PUBLIC_DIR, merkleObjectKey(campaignId));
}

export async function readLocalIndex(): Promise<MerkleIndex> {
  try {
    const raw = await readFile(indexPath(), "utf8");
    return JSON.parse(raw) as MerkleIndex;
  } catch {
    return {};
  }
}

export async function writeLocalIndex(index: MerkleIndex): Promise<void> {
  await mkdir(PUBLIC_DIR, { recursive: true });
  await writeFile(indexPath(), JSON.stringify(index, null, 2), "utf8");
}

export async function publishLocal(
  campaignId: number,
  artifact: MerkleArtifact,
  localUrl: string,
): Promise<string> {
  await mkdir(PUBLIC_DIR, { recursive: true });
  await writeFile(artifactPath(campaignId), JSON.stringify(artifact, null, 2), "utf8");

  const index = await readLocalIndex();
  index[String(campaignId)] = {
    ...index[String(campaignId)],
    local: localUrl,
    updatedAt: new Date().toISOString(),
  };
  await writeLocalIndex(index);

  return localUrl;
}

export async function getLocal(campaignId: number): Promise<MerkleArtifact | null> {
  try {
    const raw = await readFile(artifactPath(campaignId), "utf8");
    return JSON.parse(raw) as MerkleArtifact;
  } catch {
    return null;
  }
}