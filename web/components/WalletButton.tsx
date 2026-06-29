"use client";

import { motion } from "framer-motion";
import { Wallet } from "lucide-react";
import { useState } from "react";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { CopyButton } from "@/components/ui/CopyButton";
import { INJECTIVE_TESTNET } from "@/lib/cosmos";
import { truncateAddress } from "@/lib/utils";
import { useWallet } from "@/lib/wallet";

type WalletButtonProps = {
  compact?: boolean;
};

export function WalletButton({ compact }: WalletButtonProps) {
  const { address, isConnected, isConnecting, chainId, connect, disconnect } = useWallet();
  const [error, setError] = useState<string | null>(null);

  if (isConnected && address) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2"
      >
        {!compact && (
          <span className="hidden rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary sm:inline">
            {chainId === INJECTIVE_TESTNET.chainId ? "Testnet" : chainId}
          </span>
        )}
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-surface px-3 py-1.5">
          <Wallet className="h-3.5 w-3.5 text-primary" />
          <code className="text-xs font-mono">{truncateAddress(address, 8, 4)}</code>
          <CopyButton value={address} />
        </div>
        <AnimatedButton variant="ghost" size="sm" onClick={() => disconnect()}>
          Disconnect
        </AnimatedButton>
      </motion.div>
    );
  }

  return (
    <div>
      <AnimatedButton
        size={compact ? "sm" : "md"}
        loading={isConnecting}
        icon={<Wallet className="h-4 w-4" />}
        onClick={async () => {
          setError(null);
          try {
            await connect();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to connect wallet");
          }
        }}
      >
        Connect Keplr
      </AnimatedButton>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}