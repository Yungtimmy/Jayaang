"use client";

import { motion } from "framer-motion";
import { Code2, Globe, Shield, Zap } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

const features = [
  {
    icon: Zap,
    title: "Gas Efficient",
    description: "Merkle proofs let recipients claim individually — no per-wallet transfers from the creator.",
  },
  {
    icon: Shield,
    title: "Secure",
    description: "Cryptographic verification ensures only eligible addresses can claim their allocation.",
  },
  {
    icon: Globe,
    title: "Permissionless",
    description: "Anyone can create campaigns and claim tokens. No gatekeepers, no centralized lists.",
  },
  {
    icon: Code2,
    title: "Developer Friendly",
    description: "CosmWasm contract with open-source tooling. CSV in, merkle.json out, done.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold sm:text-4xl">Why Jayaang?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted">
            Everything you need to run professional token airdrops on Injective testnet.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
              <GlassCard hover className="group h-full">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">{feature.description}</p>
              </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}