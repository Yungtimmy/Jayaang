import { NextResponse } from "next/server";
import { getMerkleStorageConfig } from "@/lib/merkle-storage/config";
import { createR2PresignedPutUrl } from "@/lib/merkle-storage/r2-presign";
import { isR2Endpoint } from "@/lib/merkle-storage/r2-fetch";

type PresignBody = {
  campaignId?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PresignBody;
    const campaignId = body.campaignId;

    if (campaignId === undefined || !Number.isInteger(campaignId) || campaignId < 0) {
      return NextResponse.json({ error: "campaignId must be a non-negative integer" }, { status: 400 });
    }

    const config = getMerkleStorageConfig();
    if (!config.s3?.endpoint || !isR2Endpoint(config.s3.endpoint)) {
      return NextResponse.json({ error: "Presigned upload is only available for Cloudflare R2" }, { status: 400 });
    }

    const result = await createR2PresignedPutUrl(config.s3, campaignId);

    return NextResponse.json({
      ok: true,
      campaignId,
      uploadUrl: result.uploadUrl,
      publicUrl: result.publicUrl,
      key: result.key,
      strategy: "client-presigned",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create presigned upload URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}