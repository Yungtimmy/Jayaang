"use client";

import { useState } from "react";
import { INJECTIVE_TESTNET } from "@/lib/cosmos";
import { useWallet } from "@/lib/wallet";

export function WalletButton() {
  const { address, isConnected, isConnecting, chainId, connect, disconnect } = useWallet();
  const [error, setError] = useState<string | null>(null);

  if (isConnected && address) {
    return (
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span className="pill">
          {chainId === INJECTIVE_TESTNET.chainId ? "Injective Testnet" : chainId ?? "Connected"}
        </span>
        <code style={{ fontSize: 12 }}>{address}</code>
        <button className="btn btn-secondary" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        className="btn btn-primary"
        disabled={isConnecting}
        onClick={async () => {
          setError(null);
          try {
            await connect();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to connect wallet");
          }
        }}
      >
        {isConnecting ? "Connecting..." : "Connect Keplr"}
      </button>
      {error && <p style={{ color: "var(--danger)", fontSize: 13, marginTop: 8 }}>{error}</p>}
    </div>
  );
}