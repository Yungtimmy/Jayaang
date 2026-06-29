import { NextResponse } from "next/server";
import type { MerkleArtifact } from "@/lib/merkle";
import { getMerkleFormatIssue, getMerkleUrl } from "@/lib/merkle-loader";
import {
  getActiveStorageDrivers,
  getMerkleProofs,
  publishMerkleProofs,
} from "@/lib/merkle-storage";
import { getMerkleStorageConfig } from "@/lib/merkle-storage/config";
import { getMerkleStorageDiag } from "@/lib/merkle-storage/diag";
import { formatStorageError } from "@/lib/merkle-storage/errors";
import { isR2Endpoint } from "@/lib/merkle-storage/r2-fetch";
import { createR2PresignedPutUrl } from "@/lib/merkle-storage/r2-presign";

type PublishBody = {
  campaignId?: number;
  artifact?: MerkleArtifact;
};

function isValidArtifact(value: unknown): value is MerkleArtifact {
  if (!value || typeof value !== "object") return false;
  const artifact = value as MerkleArtifact;
  return (
    typeof artifact.root === "string" &&
    artifact.root.length > 0 &&
    typeof artifact.proofs === "object" &&
    artifact.proofs !== null &&
    Object.keys(artifact.proofs).length > 0
  );
}

function parseCampaignId(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const diag = searchParams.get("diag");
    if (diag === "1" || diag === "true") {
      return NextResponse.json(await getMerkleStorageDiag());
    }

    const campaignId = parseCampaignId(searchParams.get("campaignId"));

    if (campaignId === null) {
      return NextResponse.json(
        {
          error: "Missing query param",
          usage: {
            diagnostics: "/api/merkle?diag=1",
            fetchProofs: "/api/merkle?campaignId=3",
          },
          hint: "If ?diag=1 still shows this message, redeploy Vercel — latest code is not live yet.",
        },
        { status: 400 },
      );
    }

    const artifact = await getMerkleProofs(campaignId);
    if (!artifact) {
      return NextResponse.json({ error: `Merkle proofs not found for campaign ${campaignId}` }, { status: 404 });
    }

    return NextResponse.json(artifact, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load merkle file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PublishBody;
    const campaignId = body.campaignId;

    if (campaignId === undefined || !Number.isInteger(campaignId) || campaignId < 0) {
      return NextResponse.json({ error: "campaignId must be a non-negative integer" }, { status: 400 });
    }

    if (!isValidArtifact(body.artifact)) {
      return NextResponse.json({ error: "Invalid merkle artifact" }, { status: 400 });
    }

    const formatIssue = getMerkleFormatIssue(body.artifact);
    if (formatIssue) {
      return NextResponse.json({ error: formatIssue }, { status: 400 });
    }

    const storageConfig = getMerkleStorageConfig();
    const useClientUpload =
      process.env.VERCEL === "1" &&
      storageConfig.s3?.endpoint &&
      isR2Endpoint(storageConfig.s3.endpoint);

    if (useClientUpload) {
      const presigned = await createR2PresignedPutUrl(storageConfig.s3!, campaignId);
      return NextResponse.json({
        ok: true,
        requiresClientUpload: true,
        campaignId,
        uploadUrl: presigned.uploadUrl,
        publicUrl: presigned.publicUrl,
        strategy: "client-presigned",
      });
    }

    const result = await publishMerkleProofs(campaignId, body.artifact);

    return NextResponse.json({
      ok: true,
      campaignId: result.campaignId,
      filename: result.filename,
      url: result.url || getMerkleUrl(campaignId),
      locations: result.locations,
      drivers: getActiveStorageDrivers(),
    });
  } catch (error) {
    return NextResponse.json({ error: formatStorageError(error) }, { status: 500 });
  }
}