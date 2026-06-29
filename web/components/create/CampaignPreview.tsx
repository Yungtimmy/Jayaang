"use client";

import { motion } from "framer-motion";
import { Calendar, Coins, Users } from "lucide-react";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { GlassCard } from "@/components/ui/GlassCard";
import type { MerkleArtifact } from "@/lib/merkle";

type CampaignPreviewProps = {
  campaignName: string;
  expiryDays: number;
  recipientCount: number;
  totalDisplay: string;
  artifact: MerkleArtifact | null;
  step: number;
  onNextStep: () => void;
};

export function CampaignPreview({
  campaignName,
  expiryDays,
  recipientCount,
  totalDisplay,
  artifact,
  step,
  onNextStep,
}: CampaignPreviewProps) {
  const expiryDate = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  return (
    <GlassCard className="relative overflow-hidden">
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
      <p className="text-xs font-medium uppercase tracking-wider text-muted">Live Preview</p>

      <motion.div
        key={campaignName + recipientCount}
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 1 }}
        className="mt-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-lg font-bold text-background">
            J
          </div>
          <div>
            <h3 className="font-semibold">{campaignName || "Untitled Campaign"}</h3>
            <p className="text-xs text-muted">Native INJ · Injective Testnet</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <Coins className="h-4 w-4 text-primary" />
            <p className="mt-2 text-xs text-muted">Total Amount</p>
            <p className="font-semibold">{artifact ? totalDisplay : "—"}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <Users className="h-4 w-4 text-primary" />
            <p className="mt-2 text-xs text-muted">Recipients</p>
            <p className="font-semibold">{recipientCount || "—"}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-muted">
          <Calendar className="h-4 w-4" />
          Expires {expiryDate.toLocaleDateString()}
        </div>

        {artifact && (
          <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-xs text-muted">Merkle Root</p>
            <code className="mt-1 block break-all text-[10px] text-primary/80">{artifact.root}</code>
          </div>
        )}

        {step < 3 && recipientCount > 0 && (
          <AnimatedButton className="mt-6 w-full" variant="secondary" onClick={onNextStep}>
            Next: Upload CSV →
          </AnimatedButton>
        )}
      </motion.div>
    </GlassCard>
  );
}