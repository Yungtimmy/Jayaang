#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTRACT_DIR="$ROOT/cosmwasm/inj-merkle-airdrop"
OUT_DIR="$ROOT/cosmwasm/artifacts"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. In Codespace, use: npm run download:wasm"
  exit 1
fi

mkdir -p "$OUT_DIR"

docker run --rm \
  -v "$CONTRACT_DIR:/code" \
  --mount type=volume,source=inj_merkle_airdrop_cache,target=/target \
  --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
  cosmwasm/optimizer:0.17.0

cp "$CONTRACT_DIR/artifacts/inj_merkle_airdrop.wasm" "$OUT_DIR/inj_merkle_airdrop.wasm"
echo "Built: $OUT_DIR/inj_merkle_airdrop.wasm"