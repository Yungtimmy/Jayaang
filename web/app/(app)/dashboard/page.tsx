"use client";

import { motion } from "framer-motion";
import { Coins, Gift, Layers, Percent } from "lucide-react";
import Link from "next/link";
import { CampaignTable } from "@/components/dashboard/CampaignTable";
import { AppShell } from "@/components/layout/AppShell";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { MetricCard } from "@/components/ui/MetricCard";
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
            <p className="text-sm text-muted">Monitor campaigns and claim from the table below.</p>
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

        <CampaignTable campaigns={campaigns} loading={loading} />
      </div>
    </AppShell>
  );
}