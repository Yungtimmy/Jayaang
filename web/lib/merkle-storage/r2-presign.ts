import { AwsClient } from "aws4fetch";
import { merkleObjectKey, type MerkleStorageConfig } from "./config";

type S3Config = NonNullable<MerkleStorageConfig["s3"]>;

export async function createR2PresignedPutUrl(
  s3: S3Config,
  campaignId: number,
  expiresInSeconds = 3600,
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const key = merkleObjectKey(campaignId);
  const base = s3.endpoint!.replace(/\/$/, "");
  const objectUrl = `${base}/${s3.bucket}/${key}`;

  const client = new AwsClient({
    accessKeyId: s3.accessKeyId,
    secretAccessKey: s3.secretAccessKey,
    service: "s3",
    region: "auto",
  });

  const signed = await client.sign(
    new Request(`${objectUrl}?X-Amz-Expires=${expiresInSeconds}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    }),
    { aws: { signQuery: true } },
  );

  return {
    uploadUrl: signed.url.toString(),
    publicUrl: `${s3.publicBaseUrl}/${key}`,
    key,
  };
}