import { parseUnits, formatUnits } from "viem";
import { normalizeRecipientAddress } from "./address";
import { buildMerkleTree, getProof, leafHash } from "./merkle-tree";

export const INJ_DECIMALS = 18;

export type RecipientRow = {
  injAddress: string;
  amount: bigint;
  amountInj: string;
};

export type MerkleArtifact = {
  root: string;
  recipientCount: number;
  totalAmount: string;
  totalAmountInj: string;
  recipients: {
    address: string;
    injAddress: string;
    amount: string;
    amountInj: string;
  }[];
  proofs: Record<
    string,
    {
      address: string;
      injAddress: string;
      amount: string;
      amountInj: string;
      proof: string[];
    }
  >;
};

export function parseInjAmount(amount: string): bigint {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Use human-readable INJ amounts like 0.1 or 2 — got: ${amount}`);
  }
  return parseUnits(trimmed, INJ_DECIMALS);
}

export function formatInjAmount(amount: bigint): string {
  const text = formatUnits(amount, INJ_DECIMALS);
  return text.replace(/\.?0+$/, "");
}

export function parseCsv(content: string): RecipientRow[] {
  const lines = content
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows: RecipientRow[] = [];
  for (const line of lines) {
    if (/^address/i.test(line)) continue;
    const [address, amountInj] = line.split(",").map((v) => v.trim());
    if (!address || !amountInj) throw new Error(`Invalid CSV row: ${line}`);

    const { injAddress } = normalizeRecipientAddress(address);
    const amount = parseInjAmount(amountInj);
    rows.push({ injAddress, amount, amountInj });
  }

  if (rows.length === 0) throw new Error("CSV has no recipients");
  return rows;
}

export function buildMerkleArtifact(rows: RecipientRow[]): MerkleArtifact {
  const leaves = rows.map((row) => leafHash(row.injAddress, row.amount));
  const { root, layers } = buildMerkleTree(leaves);

  const proofs: MerkleArtifact["proofs"] = {};
  rows.forEach((row, index) => {
    proofs[row.injAddress.toLowerCase()] = {
      address: row.injAddress,
      injAddress: row.injAddress,
      amount: row.amount.toString(),
      amountInj: row.amountInj,
      proof: getProof(layers, index),
    };
  });

  const totalAmount = rows.reduce((sum, row) => sum + row.amount, BigInt(0));

  return {
    root,
    recipientCount: rows.length,
    totalAmount: totalAmount.toString(),
    totalAmountInj: formatInjAmount(totalAmount),
    recipients: rows.map((row) => ({
      address: row.injAddress,
      injAddress: row.injAddress,
      amount: row.amount.toString(),
      amountInj: row.amountInj,
    })),
    proofs,
  };
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}