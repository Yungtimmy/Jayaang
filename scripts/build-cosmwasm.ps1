$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$contractDir = Join-Path $root "cosmwasm\inj-merkle-airdrop"
$artifactsDir = Join-Path $root "cosmwasm\artifacts"

if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
  throw "Rust/cargo not found. Install from https://rustup.rs and rerun npm run build:cosmwasm"
}

rustup target add wasm32-unknown-unknown | Out-Null

Push-Location $contractDir
try {
  cargo build --release --target wasm32-unknown-unknown
} finally {
  Pop-Location
}

$wasmSource = Join-Path $contractDir "target\wasm32-unknown-unknown\release\inj_merkle_airdrop.wasm"
if (-not (Test-Path $wasmSource)) {
  throw "Build failed: $wasmSource not found"
}

New-Item -ItemType Directory -Force -Path $artifactsDir | Out-Null
$wasmDest = Join-Path $artifactsDir "inj_merkle_airdrop.wasm"
Copy-Item $wasmSource $wasmDest -Force
Write-Host "Built:" $wasmDest