"use client";

import { Menu } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { WalletButton } from "@/components/WalletButton";
import { INJECTIVE_TESTNET } from "@/lib/cosmos";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
};

export function AppHeader({ title, subtitle, onMenuClick }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-background/70 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-lg p-2 text-muted lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">{title}</h1>
            {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="primary">{INJECTIVE_TESTNET.chainName}</Badge>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}