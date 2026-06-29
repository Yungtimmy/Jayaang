import type { MerkleArtifact } from "../merkle";
import { merkleObjectKey, type MerkleStorageConfig } from "./config";

type PinataPinResponse = {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
};

type PinataPinListResponse = {
  rows: Array<{
    ipfs_pin_hash: string;
    metadata?: {
      name?: string;
      keyvalues?: Record<string, string>;
    };
  }>;
};

export function pinataGatewayUrl(
  pinata: NonNullable<MerkleStorageConfig["pinata"]>,
  cid: string,
): string {
  return `${pinata.gateway}/${cid}`;
}

export async function publishPinata(
  pinata: NonNullable<MerkleStorageConfig["pinata"]>,
  campaignId: number,
  artifact: MerkleArtifact,
): Promise<string> {
  const filename = merkleObjectKey(campaignId);
  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pinata.jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataContent: artifact,
      pinataMetadata: {
        name: filename,
        keyvalues: {
          campaignId: String(campaignId),
          type: "merkle",
        },
      },
      pinataOptions: { cidVersion: 1 },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Pinata pin failed");
  }

  const data = (await response.json()) as PinataPinResponse;
  return pinataGatewayUrl(pinata, data.IpfsHash);
}

export async function findPinataByCampaignId(
  pinata: NonNullable<MerkleStorageConfig["pinata"]>,
  campaignId: number,
): Promise<string | null> {
  const params = new URLSearchParams({
    status: "pinned",
    pageLimit: "1",
    metadata: JSON.stringify({
      keyvalues: {
        campaignId: { value: String(campaignId), op: "eq" },
        type: { value: "merkle", op: "eq" },
      },
    }),
  });

  const response = await fetch(`https://api.pinata.cloud/data/pinList?${params}`, {
    headers: { Authorization: `Bearer ${pinata.jwt}` },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as PinataPinListResponse;
  const cid = data.rows[0]?.ipfs_pin_hash;
  return cid ? pinataGatewayUrl(pinata, cid) : null;
}

export async function getPinata(
  pinata: NonNullable<MerkleStorageConfig["pinata"]>,
  campaignId: number,
  ipfsUrl?: string,
): Promise<MerkleArtifact | null> {
  const url = ipfsUrl ?? (await findPinataByCampaignId(pinata, campaignId));
  if (!url) return null;

  const response = await fetch(url, { next: { revalidate: 60 } });
  if (!response.ok) return null;

  return (await response.json()) as MerkleArtifact;
}