"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import type { OfflineSigner } from "@cosmjs/proto-signing";
import { GasPrice } from "@cosmjs/stargate";
import { KEPLR_CHAIN_INFO, INJECTIVE_TESTNET } from "./cosmos";
import { InjectiveSigningCosmWasmClient } from "./injective-account";

type KeplrWindow = Window & {
  keplr?: {
    experimentalSuggestChain: (chainInfo: typeof KEPLR_CHAIN_INFO) => Promise<void>;
    enable: (chainId: string) => Promise<void>;
    getOfflineSigner: (chainId: string) => OfflineSigner;
    getOfflineSignerAuto?: (chainId: string) => OfflineSigner | Promise<OfflineSigner>;
  };
};

async function getKeplrOfflineSigner(keplr: NonNullable<KeplrWindow["keplr"]>): Promise<OfflineSigner> {
  // Injective + CosmWasm: amino signer is the most reliable path with our signing patch.
  return keplr.getOfflineSigner(INJECTIVE_TESTNET.chainId);
}

type WalletContextValue = {
  address?: string;
  chainId?: string;
  isConnected: boolean;
  isConnecting: boolean;
  queryClient?: CosmWasmClient;
  signingClient?: InjectiveSigningCosmWasmClient;
  connect: () => Promise<void>;
  refresh: () => Promise<InjectiveSigningCosmWasmClient>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

const gasPrice = GasPrice.fromString(INJECTIVE_TESTNET.gasPrice);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | undefined>();
  const [signingClient, setSigningClient] = useState<InjectiveSigningCosmWasmClient | undefined>();
  const [queryClient, setQueryClient] = useState<CosmWasmClient | undefined>();
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    CosmWasmClient.connect(INJECTIVE_TESTNET.rpc)
      .then(setQueryClient)
      .catch(() => undefined);
  }, []);

  const connectWithSigner = useCallback(async (offlineSigner: OfflineSigner) => {
    const accounts = await offlineSigner.getAccounts();
    if (!accounts[0]) throw new Error("No Keplr account available");

    const client = await InjectiveSigningCosmWasmClient.connectWithSigner(
      INJECTIVE_TESTNET.rpc,
      offlineSigner,
      { gasPrice },
    );

    setAddress(accounts[0].address);
    setSigningClient(client);
    setQueryClient(client);
  }, []);

  const restoreSession = useCallback(async () => {
    const keplr = (window as KeplrWindow).keplr;
    if (!keplr) return;

    try {
      await keplr.enable(INJECTIVE_TESTNET.chainId);
      await connectWithSigner(await getKeplrOfflineSigner(keplr));
    } catch {
      // Not authorized yet
    }
  }, [connectWithSigner]);

  useEffect(() => {
    restoreSession().catch(() => undefined);
  }, [restoreSession]);

  const connect = useCallback(async () => {
    const keplr = (window as KeplrWindow).keplr;
    if (!keplr) {
      throw new Error("Keplr not found. Install Keplr and refresh.");
    }

    setIsConnecting(true);
    try {
      await keplr.experimentalSuggestChain(KEPLR_CHAIN_INFO);
      await keplr.enable(INJECTIVE_TESTNET.chainId);
      await connectWithSigner(await getKeplrOfflineSigner(keplr));
    } finally {
      setIsConnecting(false);
    }
  }, [connectWithSigner]);

  const refresh = useCallback(async () => {
    const keplr = (window as KeplrWindow).keplr;
    if (!keplr) throw new Error("Keplr not found. Connect your wallet first.");
    await keplr.enable(INJECTIVE_TESTNET.chainId);
    const offlineSigner = await getKeplrOfflineSigner(keplr);
    const accounts = await offlineSigner.getAccounts();
    if (!accounts[0]) throw new Error("No Keplr account available");

    const client = await InjectiveSigningCosmWasmClient.connectWithSigner(
      INJECTIVE_TESTNET.rpc,
      offlineSigner,
      { gasPrice },
    );

    setAddress(accounts[0].address);
    setSigningClient(client);
    setQueryClient(client);
    return client;
  }, []);

  const disconnect = useCallback(() => {
    setAddress(undefined);
    setSigningClient(undefined);
    CosmWasmClient.connect(INJECTIVE_TESTNET.rpc)
      .then(setQueryClient)
      .catch(() => setQueryClient(undefined));
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      chainId: address ? INJECTIVE_TESTNET.chainId : undefined,
      isConnected: !!address,
      isConnecting,
      queryClient,
      signingClient,
      connect,
      refresh,
      disconnect,
    }),
    [address, isConnecting, queryClient, signingClient, connect, refresh, disconnect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}