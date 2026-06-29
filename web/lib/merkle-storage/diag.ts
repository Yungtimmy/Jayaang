import { AwsClient } from "aws4fetch";
import { getActiveStorageDrivers } from "./index";
import { getMerkleStorageConfig } from "./config";
import { formatStorageError } from "./errors";
import { isR2Endpoint } from "./r2-fetch";

function safeHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export async function getMerkleStorageDiag() {
  const config = getMerkleStorageConfig();
  const s3 = config.s3;

  const info = {
    drivers: getActiveStorageDrivers(),
    isVercel: process.env.VERCEL === "1",
    uploadStrategy: s3?.endpoint && isR2Endpoint(s3.endpoint) ? "client-presigned" : "server-direct",
    bucket: s3?.bucket ?? null,
    endpointHost: s3?.endpoint ? safeHost(s3.endpoint) : null,
    publicBaseHost: s3?.publicBaseUrl ? safeHost(s3.publicBaseUrl) : null,
    hasAccessKey: Boolean(s3?.accessKeyId),
    hasSecretKey: Boolean(s3?.secretAccessKey),
    region: s3?.region ?? null,
    commit: "f09bda6-presign",
  };

  let serverToR2: { ok: boolean; status?: number; error?: string } | null = null;

  if (s3?.endpoint && isR2Endpoint(s3.endpoint)) {
    try {
      const client = new AwsClient({
        accessKeyId: s3.accessKeyId,
        secretAccessKey: s3.secretAccessKey,
        service: "s3",
        region: "auto",
      });
      const probeUrl = `${s3.endpoint.replace(/\/$/, "")}/${s3.bucket}?max-keys=1`;
      const response = await client.fetch(probeUrl, { method: "GET" });
      serverToR2 = { ok: response.ok, status: response.status };
    } catch (error) {
      serverToR2 = { ok: false, error: formatStorageError(error) };
    }
  }

  return {
    ...info,
    serverToR2,
    note:
      serverToR2?.ok === false
        ? "Vercel cannot reach R2 directly — uploads use browser presigned PUT instead."
        : "Server can reach R2.",
  };
}