import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import type { MerkleArtifact } from "../merkle";
import { MERKLE_INDEX_KEY, merkleObjectKey, type MerkleStorageConfig } from "./config";
import type { MerkleIndex } from "./types";

function createClient(s3: NonNullable<MerkleStorageConfig["s3"]>): S3Client {
  const isR2 = s3.endpoint?.includes("r2.cloudflarestorage.com") ?? false;

  const config: S3ClientConfig = {
    region: s3.region,
    credentials: {
      accessKeyId: s3.accessKeyId,
      secretAccessKey: s3.secretAccessKey,
    },
    // R2 rejects AWS SDK default flexible checksums on some runtimes (Vercel/Node).
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  };

  if (s3.endpoint) {
    config.endpoint = s3.endpoint;
    // Cloudflare R2 docs use virtual-hosted style; path-style is for MinIO/other S3.
    if (!isR2) {
      config.forcePathStyle = true;
    }
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

export function s3PublicUrl(s3: NonNullable<MerkleStorageConfig["s3"]>, key: string): string {
  return `${s3.publicBaseUrl}/${key}`;
}

export async function readS3Index(s3: NonNullable<MerkleStorageConfig["s3"]>): Promise<MerkleIndex> {
  const client = createClient(s3);
  try {
    const response = await client.send(
      new GetObjectCommand({ Bucket: s3.bucket, Key: MERKLE_INDEX_KEY }),
    );
    const raw = await readBody(response.Body);
    return JSON.parse(raw) as MerkleIndex;
  } catch {
    return {};
  }
}

export async function writeS3Index(
  s3: NonNullable<MerkleStorageConfig["s3"]>,
  index: MerkleIndex,
): Promise<void> {
  const client = createClient(s3);
  const body = JSON.stringify(index, null, 2);
  await client.send(
    new PutObjectCommand({
      Bucket: s3.bucket,
      Key: MERKLE_INDEX_KEY,
      Body: body,
      ContentType: "application/json",
      CacheControl: "no-cache",
    }),
  );
}

export async function publishS3(
  s3: NonNullable<MerkleStorageConfig["s3"]>,
  campaignId: number,
  artifact: MerkleArtifact,
): Promise<string> {
  const client = createClient(s3);
  const key = merkleObjectKey(campaignId);
  const body = JSON.stringify(artifact, null, 2);

  await client.send(
    new PutObjectCommand({
      Bucket: s3.bucket,
      Key: key,
      Body: body,
      ContentType: "application/json",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  const url = s3PublicUrl(s3, key);
  const index = await readS3Index(s3);
  index[String(campaignId)] = {
    ...index[String(campaignId)],
    s3: url,
    updatedAt: new Date().toISOString(),
  };
  await writeS3Index(s3, index);

  return url;
}

export async function getS3(
  s3: NonNullable<MerkleStorageConfig["s3"]>,
  campaignId: number,
): Promise<MerkleArtifact | null> {
  const client = createClient(s3);
  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: s3.bucket,
        Key: merkleObjectKey(campaignId),
      }),
    );
    const raw = await readBody(response.Body);
    return JSON.parse(raw) as MerkleArtifact;
  } catch {
    return null;
  }
}