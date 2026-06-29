"use client";

import { motion } from "framer-motion";
import { Coins, Gift, Layers, Percent } from "lucide-react";
import Link from "next/link";
import { CampaignTable } from "@/components/dashboard/CampaignTable";
import { SetupPanel } from "@/components/dashboard/SetupPanel";
import { AppShell } from "@/components/layout/AppShell";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { MetricCard } from "@/components/ui/MetricCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { formatPercent } from "@/lib/utils";

export default function DashboardPage() {
  const { campaignCount, campaigns, loading, totalDeposited, totalClaimed, claimRate } =
    useDashboardStats();

  return (
    <AppShell title="Dashboard" subtitle="Overview of your airdrop campaigns">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-4"
        >
          <div>
            <h2 className="text-2xl font-bold">Welcome back</h2>
            <p className="text-sm text-muted">Monitor campaigns and track distribution metrics.</p>
          </div>
          <Link href="/create">
            <AnimatedButton>Create Campaign</AnimatedButton>
          </Link>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total Campaigns"
            value={campaignCount}
            icon={Layers}
            loading={loading}
            animateValue
          />
          <MetricCard
            label="Tokens Distributed"
            value={totalDeposited}
            suffix="INJ"
            icon={Coins}
            loading={loading}
          />
          <MetricCard
            label="Total Claimed"
            value={totalClaimed}
            suffix="INJ"
            icon={Gift}
            loading={loading}
          />
          <MetricCard
            label="Claim Rate"
            value={formatPercent(claimRate)}
            icon={Percent}
            loading={loading}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <CampaignTable campaigns={campaigns} loading={loading} />

            <GlassCard id="analytics">
              <h3 className="font-semibold">Distribution Overview</h3>
              <p className="mt-1 text-sm text-muted">Aggregate claim progress across all campaigns</p>
              <div className="mt-6 space-y-4">
                <ProgressBar value={claimRate} showLabel color="success" />
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted">Deposited</p>
                    <p className="mt-1 font-mono text-sm font-semibold">{totalDeposited} INJ</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Claimed</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-success">{totalClaimed} INJ</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Remaining</p>
                    <p className="mt-1 font-mono text-sm font-semibold">
                      {(Number(totalDeposited) - Number(totalClaimed)).toFixed(4)} INJ
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          <SetupPanel />
        </div>
      </div>
    </AppShell>
  );
}