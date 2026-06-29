import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import type { MerkleArtifact } from "@/lib/merkle";
import { getMerkleFormatIssue, getMerkleUrl } from "@/lib/merkle-loader";

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

    const publicDir = path.join(process.cwd(), "public");
    await mkdir(publicDir, { recursive: true });

    const filename = `merkle-${campaignId}.json`;
    const filePath = path.join(publicDir, filename);

    await writeFile(filePath, JSON.stringify(body.artifact, null, 2), "utf8");

    return NextResponse.json({
      ok: true,
      campaignId,
      filename,
      url: getMerkleUrl(campaignId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save merkle file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}