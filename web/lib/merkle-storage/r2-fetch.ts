import { AwsClient } from "aws4fetch";
import type { MerkleStorageConfig } from "./config";

type S3Config = NonNullable<MerkleStorageConfig["s3"]>;

function createR2Client(s3: S3Config): AwsClient {
  return new AwsClient({
    accessKeyId: s3.accessKeyId,
    secretAccessKey: s3.secretAccessKey,
    service: "s3",
    region: "auto",
  });
}

function objectUrl(s3: S3Config, key: string): string {
  const base = s3.endpoint!.replace(/\/$/, "");
  return `${base}/${s3.bucket}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
}

export function isR2Endpoint(endpoint: string | undefined): boolean {
  return endpoint?.includes("r2.cloudflarestorage.com") ?? false;
}

export async function r2PutObject(
  s3: S3Config,
  key: string,
  body: string,
  contentType: string,
): Promise<void> {
  const client = createR2Client(s3);
  const url = objectUrl(s3, key);
  const bytes = Buffer.byteLength(body, "utf8");

  const response = await client.fetch(url, {
    method: "PUT",
    body,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(bytes),
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `R2 upload failed (${response.status}) to ${url}: ${detail || response.statusText}`,
    );
  }
}

export async function r2GetObject(s3: S3Config, key: string): Promise<string | null> {
  const client = createR2Client(s3);
  const url = objectUrl(s3, key);

  const response = await client.fetch(url, { method: "GET" });
  if (response.status === 404) return null;

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `R2 read failed (${response.status}) from ${url}: ${detail || response.statusText}`,
    );
  }

  return response.text();
}