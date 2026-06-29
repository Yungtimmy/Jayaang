"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ExternalLink, Gift, Loader2, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatUnits } from "viem";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Badge } from "@/components/ui/Badge";
import { Confetti } from "@/components/ui/Confetti";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useClaimCampaign } from "@/hooks/useClaimCampaign";
import { explorerTxUrl, truncateAddress } from "@/lib/utils";

export function ClaimFlow() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("campaign") ?? "4";
  const claim = useClaimCampaign(initialId);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (claim.txHash || (claim.alreadyClaimed && claim.status)) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(t);
    }
  }, [claim.txHash, claim.alreadyClaimed, claim.status]);

  if (!claim.contract) {
    return (
      <EmptyState
        icon={Gift}
        title="Claim unavailable"
        description="Set NEXT_PUBLIC_AIRDROP_CONTRACT in web/.env.local to an inj1... CosmWasm address."
      />
    );
  }

  return (
    <>
      <Confetti active={showConfetti} />

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <GlassCard>
            <h2 className="text-xl font-semibold">Claim INJ Airdrop</h2>
            <p className="mt-1 text-sm text-muted">
              Connect your Keplr wallet and select a campaign. Eligibility is checked automatically —
              no files to upload.
            </p>

            <div className="mt-6">
              <label className="mb-2 block text-sm text-muted">Campaign ID</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm outline-none focus:border-primary/50"
                value={claim.campaignId}
                onChange={(e) => claim.setCampaignId(e.target.value)}
              />
              <p className="mt-2 text-xs text-muted">
                {claim.campaignCount} campaign(s) on-chain
              </p>
            </div>
          </GlassCard>

          {!claim.isConnected && (
            <EmptyState
              icon={Wallet}
              title="Connect your wallet"
              description="Connect Keplr to automatically check if your address is eligible for this campaign."
            />
          )}

          {claim.isConnected && claim.isCheckingEligibility && (
            <GlassCard className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium">Checking eligibility…</p>
                <p className="text-xs text-muted">
                  Verifying <code>{truncateAddress(claim.address!, 10, 6)}</code> against campaign #
                  {claim.campaignId}
                </p>
              </div>
            </GlassCard>
          )}

          {claim.merkleLoadError && claim.isConnected && !claim.merkleLoading && (
            <GlassCard className="border-danger/30">
              <p className="text-sm text-danger">
                Eligibility data is not available for campaign #{claim.campaignId}. The organizer may
                still be setting up this campaign.
              </p>
            </GlassCard>
          )}

          {claim.merkleRootMismatch && (
            <GlassCard className="border-danger/30">
              <p className="text-sm text-danger">
                The hosted merkle root does not match campaign #{claim.campaignId} on-chain. Publish
                the correct merkle file or recreate the campaign.
              </p>
            </GlassCard>
          )}

          {claim.merkleFormatIssue && (
            <GlassCard className="border-danger/30">
              <p className="text-sm text-danger">{claim.merkleFormatIssue}</p>
            </GlassCard>
          )}

          {claim.alreadyClaimed && claim.eligibility && (
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <GlassCard className="border-success/30 bg-success/5 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
                <h3 className="mt-4 text-lg font-semibold text-success">Already Claimed</h3>
                <p className="mt-2 text-sm text-muted">
                  You received <strong className="text-white">{claim.amountDisplay}</strong> from
                  campaign #{claim.campaignId}.
                </p>
              </GlassCard>
            </motion.div>
          )}

          {claim.eligibility && !claim.alreadyClaimed && (
            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <GlassCard className="border-success/30">
                <Badge variant="success">Eligible</Badge>
                <p className="mt-4 text-3xl font-bold">{claim.amountDisplay}</p>
                <p className="mt-1 text-sm text-muted">
                  Your wallet <code>{truncateAddress(claim.eligibility.injAddress, 10, 6)}</code> is
                  eligible for this campaign.
                </p>
                <AnimatedButton
                  className="mt-6 w-full"
                  size="lg"
                  loading={claim.busy}
                  icon={<Gift className="h-4 w-4" />}
                  onClick={claim.handleClaim}
                >
                  Claim Native INJ
                </AnimatedButton>
              </GlassCard>
            </motion.div>
          )}

          {claim.isConnected &&
            !claim.isCheckingEligibility &&
            !claim.merkleRootMismatch &&
            !claim.merkleLoadError &&
            !claim.eligibility &&
            !claim.alreadyClaimed && (
              <EmptyState
                icon={Gift}
                title="Not eligible"
                description="Your connected wallet is not in this campaign's recipient list. Try a different campaign ID."
              />
            )}

          {claim.status && <p className="text-sm text-success">{claim.status}</p>}
          {claim.claimError && <p className="text-sm text-danger">{claim.claimError}</p>}
          {claim.txHash && (
            <a
              href={explorerTxUrl(claim.txHash)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View on Explorer <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        <div className="lg:col-span-2">
          {claim.campaign ? (
            <GlassCard>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{claim.campaign.name}</h3>
                  <p className="text-xs text-muted">Campaign #{claim.campaign.id}</p>
                </div>
                <Badge variant="primary">INJ</Badge>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-muted">
                    <span>Claimed</span>
                    <span>
                      {formatUnits(BigInt(claim.campaign.claimed), 18)} /{" "}
                      {formatUnits(BigInt(claim.campaign.deposited), 18)} INJ
                    </span>
                  </div>
                  <ProgressBar value={claim.claimProgress} className="mt-2" color="success" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/[0.02] p-3">
                    <p className="text-xs text-muted">Deposited</p>
                    <p className="mt-1 font-mono text-sm font-semibold">
                      {formatUnits(BigInt(claim.campaign.deposited), 18)} INJ
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/[0.02] p-3">
                    <p className="text-xs text-muted">Expires</p>
                    <p className="mt-1 text-sm font-semibold">
                      {new Date(claim.campaign.expiresAt * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {claim.campaign.paused && <Badge variant="warning">Campaign paused</Badge>}
              </div>
            </GlassCard>
          ) : (
            <GlassCard>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="mt-4 h-24 w-full" />
            </GlassCard>
          )}
        </div>
      </div>
    </>
  );
}