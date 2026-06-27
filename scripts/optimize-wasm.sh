#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IN="${IN:-$HOME/inj-merkle-build/target/wasm32-unknown-unknown/release/inj_merkle_airdrop.wasm}"
OUT="$ROOT/cosmwasm/artifacts/inj_merkle_airdrop.wasm"
OPT_DIR="/tmp/binaryen-version_117"

if [[ ! -x "$OPT_DIR/bin/wasm-opt" ]]; then
  curl -fsSL -o /tmp/binaryen.tar.gz \
    https://github.com/WebAssembly/binaryen/releases/download/version_117/binaryen-version_117-x86_64-linux.tar.gz
  tar -xzf /tmp/binaryen.tar.gz -C /tmp
fi

if "$OPT_DIR/bin/wasm-opt" -Oz --signext-lowering "$IN" -o /tmp/inj_mvp.wasm 2>/tmp/wasm-opt.err; then
  :
elif "$OPT_DIR/bin/wasm-opt" \
  --enable-bulk-memory \
  --enable-reference-types \
  -Oz \
  --signext-lowering \
  "$IN" \
  -o /tmp/inj_mvp.wasm; then
  :
else
  cat /tmp/wasm-opt.err >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT")"
cp /tmp/inj_mvp.wasm "$OUT"
wc -c "$OUT"