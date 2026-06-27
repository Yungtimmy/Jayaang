import { concat, keccak256, pad, toBytes, toHex, type Hex } from "viem";

function amountToBytes32(amount: bigint): Hex {
  return pad(toHex(amount), { size: 32 });
}

export function leafHash(address: string, amount: bigint): Hex {
  const preimage = concat([toBytes(address), amountToBytes32(amount)]);
  return keccak256(keccak256(preimage));
}

function compareHexBytes(left: Hex, right: Hex): number {
  const a = toBytes(left);
  const b = toBytes(right);
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function hashPair(left: Hex, right: Hex): Hex {
  const [a, b] = compareHexBytes(left, right) <= 0 ? [left, right] : [right, left];
  return keccak256(concat([a, b]));
}

export function buildMerkleTree(leaves: Hex[]): { root: Hex; layers: Hex[][] } {
  if (leaves.length === 0) throw new Error("Merkle tree requires at least one leaf");

  const layers: Hex[][] = [leaves];
  while (layers[layers.length - 1].length > 1) {
    const prev = layers[layers.length - 1];
    const next: Hex[] = [];
    for (let i = 0; i < prev.length; i += 2) {
      if (i + 1 < prev.length) {
        next.push(hashPair(prev[i], prev[i + 1]));
      } else {
        next.push(prev[i]);
      }
    }
    layers.push(next);
  }

  return { root: layers[layers.length - 1][0], layers };
}

export function getProof(layers: Hex[][], leafIndex: number): Hex[] {
  const proof: Hex[] = [];
  let index = leafIndex;

  for (let layer = 0; layer < layers.length - 1; layer += 1) {
    const layerNodes = layers[layer];
    const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
    if (siblingIndex < layerNodes.length) {
      proof.push(layerNodes[siblingIndex]);
    }
    index = Math.floor(index / 2);
  }

  return proof;
}