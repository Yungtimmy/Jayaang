import { NextResponse } from "next/server";
import { getMerkleStorageDiag } from "@/lib/merkle-storage/diag";

export async function GET() {
  const diag = await getMerkleStorageDiag();
  return NextResponse.json(diag);
}