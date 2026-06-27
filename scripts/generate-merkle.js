const fs = require("fs");
const path = require("path");
const { keccak256, concat, pad, toBytes, toHex } = require("viem");
const { normalizeRecipientAddress } = require("./address");

const INJ_DECIMALS = 18;

function parseInjAmount(amount) {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Use human-readable INJ amounts like 0.1 or 2 — got: ${amount}`);
  }
  const [whole, fraction = ""] = trimmed.split(".");
  const fractionPadded = `${fraction}${"0".repeat(INJ_DECIMALS)}`.slice(0, INJ_DECIMALS);
  return BigInt(`${whole}${fractionPadded}`);
}

function formatInjAmount(amount) {
  const base = 10n ** BigInt(INJ_DECIMALS);
  const whole = amount / base;
  const fraction = amount % base;
  if (fraction === 0n) return whole.toString();
  const fractionText = fraction.toString().padStart(INJ_DECIMALS, "0").replace(/0+$/, "");
  return `${whole}.${fractionText}`;
}

function amountToBytes32(amount) {
  return pad(toHex(amount), { size: 32 });
}

function leafHash(address, amount) {
  const preimage = concat([toBytes(address), amountToBytes32(amount)]);
  return keccak256(keccak256(preimage));
}

function hashPair(left, right) {
  const [a, b] = left.toLowerCase() <= right.toLowerCase() ? [left, right] : [right, left];
  return keccak256(concat([a, b]));
}

function buildMerkleTree(leaves) {
  const layers = [leaves];
  while (layers[layers.length - 1].length > 1) {
    const prev = layers[layers.length - 1];
    const next = [];
    for (let i = 0; i < prev.length; i += 2) {
      if (i + 1 < prev.length) next.push(hashPair(prev[i], prev[i + 1]));
      else next.push(prev[i]);
    }
    layers.push(next);
  }
  return { root: layers[layers.length - 1][0], layers };
}

function getProof(layers, leafIndex) {
  const proof = [];
  let index = leafIndex;
  for (let layer = 0; layer < layers.length - 1; layer += 1) {
    const layerNodes = layers[layer];
    const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
    if (siblingIndex < layerNodes.length) proof.push(layerNodes[siblingIndex]);
    index = Math.floor(index / 2);
  }
  return proof;
}

function parseCsv(content) {
  const lines = content
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows = [];
  for (const line of lines) {
    if (/^address/i.test(line)) continue;
    const [address, amountInj] = line.split(",").map((v) => v.trim());
    if (!address || !amountInj) throw new Error(`Invalid row: ${line}`);
    const { injAddress } = normalizeRecipientAddress(address);
    rows.push({ injAddress, amountInj, amount: parseInjAmount(amountInj) });
  }
  return rows;
}

function main() {
  const input = process.argv[2];
  const outDir = process.argv[3] ?? "./merkle-output";

  if (!input) {
    console.error("Usage: node scripts/generate-merkle.js <recipients.csv> [output-dir]");
    process.exit(1);
  }

  const csv = fs.readFileSync(path.resolve(input), "utf8");
  const rows = parseCsv(csv);
  const leaves = rows.map((row) => leafHash(row.injAddress, row.amount));
  const { root, layers } = buildMerkleTree(leaves);

  fs.mkdirSync(outDir, { recursive: true });

  const proofs = {};
  rows.forEach((row, index) => {
    const entry = {
      address: row.injAddress,
      injAddress: row.injAddress,
      amount: row.amount.toString(),
      amountInj: row.amountInj,
      proof: getProof(layers, index),
    };
    proofs[row.injAddress.toLowerCase()] = entry;
  });

  const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0n);
  const artifact = {
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

  fs.writeFileSync(path.join(outDir, "merkle.json"), JSON.stringify(artifact, null, 2));
  console.log("Merkle root:", root);
  console.log("Recipients:", rows.length);
  console.log("Total INJ:", artifact.totalAmountInj);
  console.log("Saved:", path.join(outDir, "merkle.json"));
}

main();