"use client";

import { motion } from "framer-motion";
import { Check, ChevronRight, FileUp, Sparkles } from "lucide-react";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { Modal } from "@/components/ui/Modal";
import { useCreateCampaign } from "@/hooks/useCreateCampaign";
import { cn } from "@/lib/utils";
import { CampaignPreview } from "./CampaignPreview";

const steps = [
  { num: 1, label: "Details" },
  { num: 2, label: "Upload CSV" },
  { num: 3, label: "Review" },
  { num: 4, label: "Confirm" },
];

export function CreateForm() {
  const {
    contract,
    isConnected,
    csv,
    setCsv,
    campaignName,
    setCampaignName,
    expiryDays,
    setExpiryDays,
    artifact,
    localError,
    status,
    txHash,
    busy,
    step,
    setStep,
    totalDisplay,
    recipientCount,
    handleGenerate,
    handleCreateCampaign,
    reset,
  } = useCreateCampaign();

  if (!contract) {
    return (
      <GlassCard>
        <h2 className="text-xl font-semibold">Deploy contract first</h2>
        <p className="mt-2 text-sm text-muted">
          Run <code className="text-primary">npm run deploy:cosmwasm</code>, then set{" "}
          <code className="text-primary">NEXT_PUBLIC_AIRDROP_CONTRACT</code> in{" "}
          <code className="text-primary">web/.env.local</code>.
        </p>
      </GlassCard>
    );
  }

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s.num} className="flex flex-1 items-center">
              <button
                type="button"
                onClick={() => setStep(s.num as 1 | 2 | 3 | 4)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                  step === s.num
                    ? "bg-primary/10 text-primary"
                    : step > s.num
                      ? "text-success"
                      : "text-muted",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold",
                    step === s.num
                      ? "bg-primary text-background"
                      : step > s.num
                        ? "bg-success/20 text-success"
                        : "bg-white/5",
                  )}
                >
                  {step > s.num ? <Check className="h-3.5 w-3.5" /> : s.num}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < steps.length - 1 && (
                <ChevronRight className="mx-1 h-4 w-4 shrink-0 text-muted/40" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <GlassCard>
          <h2 className="text-xl font-semibold">Create Campaign</h2>
          <p className="mt-1 text-sm text-muted">
            Upload recipients, generate Merkle proofs, and fund with native INJ.
          </p>

          <div className="mt-6 space-y-5">
            {(step === 1 || step === 2) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm text-muted">Campaign Name</label>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm outline-none transition-colors focus:border-primary/50"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Injective Community Airdrop"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-muted">Token</label>
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-surface px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      INJ
                    </div>
                    <span className="text-sm">Native INJ (injective-888)</span>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-muted">Expiry (days)</label>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm outline-none focus:border-primary/50"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(Number(e.target.value))}
                  />
                </div>
              </motion.div>
            )}

            {(step === 2 || step === 3) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <label className="mb-2 block text-sm text-muted">Recipients CSV</label>
                <textarea
                  className="w-full min-h-[160px] rounded-xl border border-white/10 bg-surface px-4 py-3 font-mono text-xs outline-none focus:border-primary/50 resize-y"
                  value={csv}
                  onChange={(e) => setCsv(e.target.value)}
                />
                <p className="mt-2 text-xs text-muted">
                  Format: <code>address,amount</code> — use <strong>inj1...</strong> addresses and plain INJ amounts.
                </p>

                <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 transition-colors hover:border-primary/30">
                  <FileUp className="h-5 w-5 text-muted" />
                  <span className="text-sm text-muted">Or upload a .csv file</span>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setCsv(String(reader.result));
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </motion.div>
            )}

            {step === 3 && artifact && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-success/30 bg-success/5 p-4"
              >
                <p className="text-sm font-medium text-success">Merkle tree ready</p>
                <p className="mt-1 text-xs text-muted">
                  {artifact.recipientCount} recipients · {totalDisplay} total deposit
                </p>
              </motion.div>
            )}

            {step === 4 && status && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-success/30 bg-success/5 p-6 text-center"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/20">
                  <Check className="h-7 w-7 text-success" />
                </div>
                <h3 className="mt-4 font-semibold text-success">Campaign Created!</h3>
                <p className="mt-2 text-sm text-muted">{status}</p>
                {txHash && (
                  <a
                    href={`https://testnet.mintscan.io/injective/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-sm text-primary hover:underline"
                  >
                    View on Explorer →
                  </a>
                )}
                <AnimatedButton className="mt-4" variant="secondary" onClick={reset}>
                  Create Another
                </AnimatedButton>
              </motion.div>
            )}

            {localError && <p className="text-sm text-danger">{localError}</p>}
            {status && step < 4 && <p className="text-sm text-success">{status}</p>}

            {step < 4 && (
              <div className="flex flex-wrap gap-3 pt-2">
                {step <= 2 && (
                  <AnimatedButton
                    variant="secondary"
                    icon={<Sparkles className="h-4 w-4" />}
                    onClick={() => {
                      handleGenerate();
                      if (step < 2) setStep(2);
                    }}
                  >
                    Generate Merkle Tree
                  </AnimatedButton>
                )}
                {artifact && step >= 3 && (
                  <AnimatedButton
                    loading={busy}
                    disabled={!isConnected}
                    onClick={handleCreateCampaign}
                  >
                    {busy ? "Creating..." : "Create Campaign"}
                  </AnimatedButton>
                )}
                {!isConnected && (
                  <p className="w-full text-xs text-muted">Connect Keplr to create a campaign.</p>
                )}
              </div>
            )}
          </div>
        </GlassCard>

        <CampaignPreview
          campaignName={campaignName}
          expiryDays={expiryDays}
          recipientCount={recipientCount}
          totalDisplay={totalDisplay}
          artifact={artifact}
          step={step}
          onNextStep={() => setStep(Math.min(4, step + 1) as 1 | 2 | 3 | 4)}
        />
      </div>

      <Modal open={busy} onClose={() => undefined} title="Creating Campaign">
        <div className="flex flex-col items-center py-6">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted">Confirm the transaction in Keplr...</p>
        </div>
      </Modal>
    </>
  );
}