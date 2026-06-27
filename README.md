# Inj Airdrops — Injective Testnet (4-day MVP)

Merkle airdrop smart contract + single-page app for **Injective EVM testnet** (chain ID `1439`).

Scope is intentionally narrow: **airdrops only** — create a campaign, fund it, recipients claim with a Merkle proof.

## What's included

| Piece | Tech |
|-------|------|
| Smart contract | Solidity `InjectiveMerkleAirdrop.sol` (Hardhat) |
| Merkle tooling | `@openzeppelin/merkle-tree` |
| Frontend | Next.js + wagmi + viem |
| Network | Injective EVM testnet |

## 4-day sprint plan

### Day 1 — Setup + deploy
- [ ] Install deps: `npm run install:all`
- [ ] Add MetaMask network (chain `1439`, RPC below)
- [ ] Fund wallet: [INJ faucet](https://testnet.faucet.injective.network/) + [USDC faucet](https://faucet.circle.com/)
- [ ] Copy `.env.example` → `.env`, add `PRIVATE_KEY`
- [ ] Deploy: `npm run compile && npm run deploy:testnet`
- [ ] Copy contract address to `web/.env.local`

### Day 2 — Create flow
- [ ] Build recipient CSV (`address,amount` in smallest units)
- [ ] Test merkle CLI: `npm run merkle recipients.example.csv`
- [ ] Run app: `npm run dev` → http://localhost:3000
- [ ] Create tab: generate tree → approve USDC → create campaign
- [ ] Save downloaded `merkle.json`

### Day 3 — Claim flow
- [ ] Second wallet on testnet
- [ ] Claim tab: upload `merkle.json`, enter campaign ID `0`
- [ ] Verify claim tx on [Blockscout](https://testnet.blockscout.injective.network/)

### Day 4 — Polish + demo
- [ ] Real recipient list (team/community wallets)
- [ ] Deploy frontend (Vercel / Firebase)
- [ ] Record demo: CSV → create → claim
- [ ] Optional: publish `merkle.json` to IPFS and link in campaign metadata

## Quick start

```bash
cd inj-airdrops
npm run install:all

cp .env.example .env
cp web/.env.example web/.env.local
# Fill PRIVATE_KEY and NEXT_PUBLIC_AIRDROP_CONTRACT after deploy

npm run compile
npm run deploy:testnet
npm run dev
```

## MetaMask — Injective EVM testnet

| Field | Value |
|-------|-------|
| Network name | Injective EVM Testnet |
| RPC URL | `https://k8s.testnet.json-rpc.injective.network/` |
| Chain ID | `1439` |
| Currency | INJ |

## Airdrop workflow

```
Creator                          Contract                    Recipient
   |                                |                            |
   | 1. CSV → Merkle root           |                            |
   | 2. Approve token               |                            |
   | 3. createCampaign(root, amt) ->| locks tokens               |
   | 4. Share merkle.json           |                            |
   |                                |  5. claim(id, amt, proof) <-|
   |                                |  6. transfer tokens -------> wallet
```

## CSV format

```csv
address,amount
0xYourAddress...,1000000
0xRecipient2...,2500000
```

Amounts are in the token's smallest unit. Testnet USDC uses **6 decimals** (`1 USDC = 1000000`).

## Scripts

```bash
npm run compile          # Build contract
npm run deploy:testnet   # Deploy to Injective testnet
npm run merkle -- recipients.csv ./output
npm run dev              # Start web app
```

## Contract API

- `createCampaign(token, merkleRoot, depositAmount, expiresAt, name)` — fund + launch
- `claim(campaignId, amount, proof)` — recipient claims
- `getCampaign(id)` — read campaign state
- `hasClaimed(id, address)` — check if already claimed

## Testnet token

Default USDC (MTS): `0xaDC7bcB5d8fe053Ef19b4E0C861c262Af6e0db60`

## Notes

- Uses **Injective EVM** (Solidity) for fastest 4-day delivery on Windows without Rust/Docker.
- `merkle.json` is shared offchain with recipients (no indexer needed for MVP).
- For production: add indexer, IPFS hosting, audits, and CosmWasm path if you need native Cosmos wallets (Keplr).