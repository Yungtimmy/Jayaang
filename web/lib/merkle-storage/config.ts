export type MerkleStorageConfig = {
  enableLocal: boolean;
  enableS3: boolean;
  enablePinata: boolean;
  s3: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
    publicBaseUrl: string;
  } | null;
  pinata: {
    jwt: string;
    gateway: string;
  } | null;
};

function trim(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next || undefined;
}

/** S3 API endpoint only — not the public r2.dev URL. */
export function normalizeS3Endpoint(endpoint: string | undefined): string | undefined {
  if (!endpoint) return undefined;

  const trimmed = endpoint.trim().replace(/\/+$/, "");

  if (/\.r2\.dev/i.test(trimmed)) {
    throw new Error(
      "AWS_S3_ENDPOINT must be the S3 API URL (https://<ACCOUNT_ID>.r2.cloudflarestorage.com), " +
        "not the public r2.dev URL. Use AWS_S3_PUBLIC_URL for the pub-*.r2.dev address.",
    );
  }

  const r2Match = trimmed.match(/^(https:\/\/[a-f0-9]+\.r2\.cloudflarestorage\.com)/i);
  if (r2Match) return r2Match[1];

  return trimmed;
}

export function resolveS3Region(endpoint: string | undefined, region: string): string {
  if (endpoint?.includes("r2.cloudflarestorage.com")) return "auto";
  return region || "us-east-1";
}

export function getMerkleStorageConfig(): MerkleStorageConfig {
  const bucket = trim(process.env.AWS_S3_BUCKET);
  const region = trim(process.env.AWS_REGION) ?? "us-east-1";
  const accessKeyId = trim(process.env.AWS_ACCESS_KEY_ID);
  const secretAccessKey = trim(process.env.AWS_SECRET_ACCESS_KEY);
  const endpoint = normalizeS3Endpoint(trim(process.env.AWS_S3_ENDPOINT));
  const publicBaseUrl = trim(process.env.AWS_S3_PUBLIC_URL);

  const pinataJwt = trim(process.env.PINATA_JWT);
  const pinataGateway = trim(process.env.PINATA_GATEWAY_URL) ?? "https://gateway.pinata.cloud/ipfs";

  const s3Ready = Boolean(bucket && accessKeyId && secretAccessKey);
  const pinataReady = Boolean(pinataJwt);

  const driver = trim(process.env.MERKLE_STORAGE_DRIVER)?.toLowerCase();
  const forceLocal = driver === "local";
  const isVercel = trim(process.env.VERCEL) === "1";

  const enableLocal =
    forceLocal || (!isVercel && !s3Ready && !pinataReady) || trim(process.env.MERKLE_STORAGE_LOCAL) === "true";

  return {
    enableLocal,
    enableS3: s3Ready && driver !== "local" && driver !== "pinata",
    enablePinata: pinataReady && driver !== "local" && driver !== "s3",
    s3: s3Ready
      ? {
          bucket: bucket!,
          region: resolveS3Region(endpoint, region),
          accessKeyId: accessKeyId!,
          secretAccessKey: secretAccessKey!,
          endpoint,
          publicBaseUrl:
            publicBaseUrl?.replace(/\/$/, "") ??
            (endpoint
              ? `${endpoint.replace(/\/$/, "")}/${bucket}`
              : `https://${bucket}.s3.${region}.amazonaws.com`),
        }
      : null,
    pinata: pinataReady
      ? {
          jwt: pinataJwt!,
          gateway: pinataGateway.replace(/\/$/, ""),
        }
      : null,
  };
}

export function merkleObjectKey(campaignId: number): string {
  return `merkle-${campaignId}.json`;
}

export const MERKLE_INDEX_KEY = "merkle-index.json";