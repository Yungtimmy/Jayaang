"use client";

import { type ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { patchCosmjsEncoding } from "@/lib/bytes";
import { WalletProvider } from "@/lib/wallet";

patchCosmjsEncoding();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <ToastProvider>{children}</ToastProvider>
    </WalletProvider>
  );
}