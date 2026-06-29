"use client";

import { formatUnits } from "viem";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GlassCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import type { DashboardCampaign } from "@/hooks/useDashboardStats";
import { formatPercent } from "@/lib/utils";

type CampaignTableProps = {
  campaigns: DashboardCampaign[];
  loading?: boolean;
};

export function CampaignTable({ campaigns, loading }: CampaignTableProps) {
  if (loading) {
    return (
      <GlassCard>
        <Skeleton className="mb-4 h-6 w-40" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </GlassCard>
    );
  }

  if (campaigns.length === 0) {
    return (
      <GlassCard>
        <h3 className="font-semibold">Campaigns</h3>
        <p className="mt-2 text-sm text-muted">No campaigns yet. Create your first airdrop.</p>
        <Link href="/create" className="mt-4 inline-block text-sm text-primary hover:underline">
          Create Campaign →
        </Link>
      </GlassCard>
    );
  }

  return (
    <GlassCard padding="none" className="overflow-hidden">
      <div className="border-b border-white/[0.06] px-6 py-4">
        <h3 className="font-semibold">Campaigns</h3>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-left text-xs text-muted">
              <th className="px-6 py-3 font-medium">Campaign</th>
              <th className="px-6 py-3 font-medium">Token</th>
              <th className="px-6 py-3 font-medium">Claimed</th>
              <th className="px-6 py-3 font-medium">Total</th>
              <th className="px-6 py-3 font-medium">Rate</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => {
              const isExpired = c.expiresAt * 1000 < Date.now();
              return (
                <tr
                  key={c.id}
                  className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted">#{c.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="primary">INJ</Badge>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">
                    {formatUnits(BigInt(c.claimed), 18)}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">
                    {formatUnits(BigInt(c.deposited), 18)}
                  </td>
                  <td className="px-6 py-4 min-w-[120px]">
                    <ProgressBar value={c.claimRate} color="primary" />
                    <span className="mt-1 block text-xs text-muted">{formatPercent(c.claimRate)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={c.paused ? "warning" : isExpired ? "danger" : "success"}>
                      {c.paused ? "Paused" : isExpired ? "Expired" : "Active"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/claim?campaign=${c.id}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Claim <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}