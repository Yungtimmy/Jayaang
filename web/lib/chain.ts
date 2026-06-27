import { defineChain } from "viem";

export const injectiveEvmTestnet = defineChain({
  id: 1439,
  name: "Injective EVM Testnet",
  nativeCurrency: { name: "INJ", symbol: "INJ", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_INJECTIVE_RPC ?? "https://k8s.testnet.json-rpc.injective.network/"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://testnet.blockscout.injective.network",
    },
  },
});

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
] as const;

export const AIRDROP_ABI = [
  {
    type: "function",
    name: "nextCampaignId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "getCampaign",
    stateMutability: "view",
    inputs: [{ name: "campaignId", type: "uint256" }],
    outputs: [
      { name: "token", type: "address" },
      { name: "isNative", type: "bool" },
      { name: "merkleRoot", type: "bytes32" },
      { name: "deposited", type: "uint256" },
      { name: "claimed", type: "uint256" },
      { name: "expiresAt", type: "uint256" },
      { name: "name", type: "string" },
      { name: "paused", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "hasClaimed",
    stateMutability: "view",
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "account", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "createCampaign",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "merkleRoot", type: "bytes32" },
      { name: "depositAmount", type: "uint256" },
      { name: "expiresAt", type: "uint256" },
      { name: "name", type: "string" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "proof", type: "bytes32[]" },
    ],
    outputs: [],
  },
] as const;