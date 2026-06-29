"use client";

import { motion } from "framer-motion";
import { ArrowRight, Code2 } from "lucide-react";
import Link from "next/link";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { MerkleVisualization } from "./MerkleVisualization";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
      <div className="absolute inset-0 bg-hero-glow" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Injective Testnet · Native INJ
            </div>

            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Build Secure{" "}
              <span className="text-gradient">Merkle Airdrops</span> on Injective
            </h1>

            <p className="mt-6 max-w-lg text-lg text-muted leading-relaxed">
              Create token distribution campaigns, generate cryptographic proofs, and let eligible
              wallets claim native INJ — gas-efficient, permissionless, and verifiable.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard">
                <AnimatedButton size="lg" icon={<ArrowRight className="h-4 w-4" />}>
                  Launch App
                </AnimatedButton>
              </Link>
              <a href="https://github.com/Yungtimmy/Jayaang" target="_blank" rel="noreferrer">
                <AnimatedButton variant="secondary" size="lg" icon={<Code2 className="h-4 w-4" />}>
                  View GitHub
                </AnimatedButton>
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <MerkleVisualization />
          </motion.div>
        </div>
      </div>
    </section>
  );
}