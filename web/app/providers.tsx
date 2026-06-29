"use client";

import { type ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { WalletProvider } from "@/lib/wallet";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <ToastProvider>{children}</ToastProvider>
    </WalletProvider>
  );
}