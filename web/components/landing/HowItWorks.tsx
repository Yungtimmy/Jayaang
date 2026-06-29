"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const steps = [
  { num: 1, title: "Upload CSV", desc: "Add recipient inj1 addresses and INJ amounts." },
  { num: 2, title: "Generate Merkle Root", desc: "Client-side tree generation with cryptographic proofs." },
  { num: 3, title: "Deploy Campaign", desc: "Fund the contract with native INJ via Keplr." },
  { num: 4, title: "Share Claim Link", desc: "Recipients connect Keplr — eligibility is checked automatically." },
  { num: 5, title: "Users Claim", desc: "Eligible wallets submit proofs and receive INJ instantly." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-white/[0.06] bg-surface/30 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold sm:text-4xl">How It Works</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted">
            From CSV to claim in five simple steps.
          </p>
        </motion.div>

        <div className="relative mt-16">
          <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent lg:block" />

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative text-center"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-xl font-bold text-primary shadow-glow-sm">
                  {step.num}
                </div>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted">{step.desc}</p>
                {i < steps.length - 1 && (
                  <CheckCircle2 className="mx-auto mt-4 h-4 w-4 text-primary/40 lg:hidden" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}