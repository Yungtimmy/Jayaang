export const INJECTIVE_TESTNET = {
  chainId: "injective-888",
  chainName: "Injective Testnet",
  rpc: process.env.NEXT_PUBLIC_INJECTIVE_TM_RPC ?? "https://testnet.sentry.tm.injective.network:443",
  rest: process.env.NEXT_PUBLIC_INJECTIVE_LCD ?? "https://testnet.sentry.lcd.injective.network",
  bech32Prefix: "inj",
  coinDenom: "INJ",
  coinMinimalDenom: "inj",
  coinDecimals: 18,
  gasPrice: "500000000inj",
} as const;

export const KEPLR_CHAIN_INFO = {
  chainId: INJECTIVE_TESTNET.chainId,
  chainName: INJECTIVE_TESTNET.chainName,
  rpc: INJECTIVE_TESTNET.rpc,
  rest: INJECTIVE_TESTNET.rest,
  bip44: { coinType: 60 },
  bech32Config: {
    bech32PrefixAccAddr: INJECTIVE_TESTNET.bech32Prefix,
    bech32PrefixAccPub: `${INJECTIVE_TESTNET.bech32Prefix}pub`,
    bech32PrefixValAddr: `${INJECTIVE_TESTNET.bech32Prefix}valoper`,
    bech32PrefixValPub: `${INJECTIVE_TESTNET.bech32Prefix}valoperpub`,
    bech32PrefixConsAddr: `${INJECTIVE_TESTNET.bech32Prefix}valcons`,
    bech32PrefixConsPub: `${INJECTIVE_TESTNET.bech32Prefix}valconspub`,
  },
  currencies: [
    {
      coinDenom: INJECTIVE_TESTNET.coinDenom,
      coinMinimalDenom: INJECTIVE_TESTNET.coinMinimalDenom,
      coinDecimals: INJECTIVE_TESTNET.coinDecimals,
    },
  ],
  feeCurrencies: [
    {
      coinDenom: INJECTIVE_TESTNET.coinDenom,
      coinMinimalDenom: INJECTIVE_TESTNET.coinMinimalDenom,
      coinDecimals: INJECTIVE_TESTNET.coinDecimals,
      gasPriceStep: { low: 500_000_000, average: 500_000_000, high: 625_000_000 },
    },
  ],
  stakeCurrency: {
    coinDenom: INJECTIVE_TESTNET.coinDenom,
    coinMinimalDenom: INJECTIVE_TESTNET.coinMinimalDenom,
    coinDecimals: INJECTIVE_TESTNET.coinDecimals,
  },
  features: ["ibc-transfer", "cosmwasm"],
};

export function getContractAddress(): string | undefined {
  const value = process.env.NEXT_PUBLIC_AIRDROP_CONTRACT?.trim();
  if (!value || !/^inj1[a-z0-9]{20,}$/.test(value)) return undefined;
  return value;
}

export type CampaignView = {
  id: number;
  merkleRoot: string;
  deposited: string;
  claimed: string;
  expiresAt: number;
  name: string;
  paused: boolean;
};

export type CosmWasmClientLike = {
  queryContractSmart: (contractAddress: string, query: unknown) => Promise<unknown>;
  execute: (
    sender: string,
    contractAddress: string,
    msg: unknown,
    fee: "auto" | { amount: { denom: string; amount: string }[]; gas: string },
    memo?: string,
    funds?: { denom: string; amount: string }[],
  ) => Promise<{ transactionHash: string }>;
};