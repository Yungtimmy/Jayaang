import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import type { MerkleArtifact } from "../merkle";
import { MERKLE_INDEX_KEY, merkleObjectKey, type MerkleStorageConfig } from "./config";
import { isR2Endpoint, r2GetObject, r2PutObject } from "./r2-fetch";
import type { MerkleIndex } from "./types";

function createAwsSdkClient(s3: NonNullable<MerkleStorageConfig["s3"]>): S3Client {
  const config: S3ClientConfig = {
    region: s3.region,
    credentials: {
      accessKeyId: s3.accessKeyId,
      secretAccessKey: s3.secretAccessKey,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  };

  if (s3.endpoint) {
    config.endpoint = s3.endpoint;
    config.forcePathStyle = true;
  }

  return new S3Client(config);
}

async function readBody(stream: unknown): Promise<string> {
  if (!stream) return "";
  if (typeof stream === "string") return stream;
  if (stream instanceof Uint8Array) return new TextDecoder().decode(stream);

  const body = stream as { transformToString?: () => Promise<string> };
  if (typeof body.transformToString === "function") {
    return body.transformToString();
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  const merged = new Uint8Array(chunks.reduce((sum, c) => sum + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(merged);
}

function useR2Fetch(s3: NonNullable<MerkleStorageConfig["s3"]>): boolean {
  return isR2Endpoint(s3.endpoint);
}

async function putObject(
  s3: NonNullable<MerkleStorageConfig["s3"]>,
  key: string,
  body: string,
  contentType: string,
  cacheControl?: string,
): Promise<void> {
  if (useR2Fetch(s3)) {
    await r2PutObject(s3, key, body, contentType);
    return;
  }

  const client = createAwsSdkClient(s3);
  await client.send(
    new PutObjectCommand({
      Bucket: s3.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ...(cacheControl ? { CacheControl: cacheControl } : {}),
    }),
  );
}

async function getObject(
  s3: NonNullable<MerkleStorageConfig["s3"]>,
  key: string,
): Promise<string | null> {
  if (useR2Fetch(s3)) {
    return r2GetObject(s3, key);
  }

  const client = createAwsSdkClient(s3);
  try {
    const response = await client.send(
      new GetObjectCommand({ Bucket: s3.bucket, Key: key }),
    );
    return readBody(response.Body);
  } catch {
    return null;
  }
}

export function s3PublicUrl(s3: NonNullable<MerkleStorageConfig["s3"]>, key: string): string {
  return `${s3.publicBaseUrl}/${key}`;
}

export async function readS3Index(s3: NonNullable<MerkleStorageConfig["s3"]>): Promise<MerkleIndex> {
  try {
    const raw = await getObject(s3, MERKLE_INDEX_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as MerkleIndex;
  } catch {
    return {};
  }
}

export async function writeS3Index(
  s3: NonNullable<MerkleStorageConfig["s3"]>,
  index: MerkleIndex,
): Promise<void> {
  const body = JSON.stringify(index, null, 2);
  await putObject(s3, MERKLE_INDEX_KEY, body, "application/json", "no-cache");
}

export async function publishS3(
  s3: NonNullable<MerkleStorageConfig["s3"]>,
  campaignId: number,
  artifact: MerkleArtifact,
): Promise<string> {
  const key = merkleObjectKey(campaignId);
  const body = JSON.stringify(artifact, null, 2);

  await putObject(
    s3,
    key,
    body,
    "application/json",
    "public, max-age=31536000, immutable",
  );

  const url = s3PublicUrl(s3, key);

  try {
    const index = await readS3Index(s3);
    index[String(campaignId)] = {
      ...index[String(campaignId)],
      s3: url,
      updatedAt: new Date().toISOString(),
    };
    await writeS3Index(s3, index);
  } catch {
    // Merkle file uploaded; index is optional metadata.
  }

  return url;
}

export async function getS3(
  s3: NonNullable<MerkleStorageConfig["s3"]>,
  campaignId: number,
): Promise<MerkleArtifact | null> {
  try {
    const raw = await getObject(s3, merkleObjectKey(campaignId));
    if (!raw) return null;
    return JSON.parse(raw) as MerkleArtifact;
  } catch {
    return null;
  }
}