"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

const faqs = [
  {
    q: "What is a Merkle airdrop?",
    a: "A Merkle airdrop uses a cryptographic tree to prove eligibility without storing every recipient on-chain. Only the root hash is stored, making it gas-efficient at scale.",
  },
  {
    q: "Which wallet do I need?",
    a: "Jayaang uses Keplr with Injective testnet (injective-888). Connect Keplr and ensure you have testnet INJ for gas fees.",
  },
  {
    q: "What token does Jayaang support?",
    a: "The current MVP distributes native INJ on Injective testnet. ERC-20 support via the EVM contract exists in the repo but is not wired to the UI yet.",
  },
  {
    q: "How do recipients claim?",
    a: "Recipients connect Keplr and enter the campaign ID. The app checks eligibility automatically — no files to upload. If eligible, one click claims their allocation.",
  },
  {
    q: "Where do I get testnet INJ?",
    a: "Use the official Injective testnet faucet at testnet.faucet.injective.network to fund your wallet for creating campaigns and paying gas.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold sm:text-4xl">FAQ</h2>
          <p className="mt-4 text-muted">Common questions about Jayaang.</p>
        </motion.div>

        <div className="mt-10 space-y-3">
          {faqs.map((faq, i) => (
            <GlassCard key={faq.q} padding="none" className="overflow-hidden">
              <button
                type="button"
                className="flex w-full items-center justify-between px-5 py-4 text-left"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-medium">{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted transition-transform ${open === i ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="border-t border-white/[0.06] px-5 py-4 text-sm text-muted leading-relaxed">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}