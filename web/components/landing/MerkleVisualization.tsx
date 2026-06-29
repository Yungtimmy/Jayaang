"use client";

import { motion } from "framer-motion";
import { FileSpreadsheet, GitBranch, Shield, Wallet } from "lucide-react";

const nodes = [
  { id: "csv", label: "CSV Upload", icon: FileSpreadsheet, x: 15, y: 70 },
  { id: "tree", label: "Merkle Tree", icon: GitBranch, x: 50, y: 35 },
  { id: "contract", label: "Smart Contract", icon: Shield, x: 85, y: 70 },
  { id: "wallet", label: "Wallet Claim", icon: Wallet, x: 50, y: 85 },
];

const edges = [
  ["csv", "tree"],
  ["tree", "contract"],
  ["contract", "wallet"],
  ["tree", "wallet"],
];

export function MerkleVisualization() {
  return (
    <div className="relative h-[320px] w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-surface/50">
      <div className="absolute inset-0 grid-bg opacity-50" />

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {edges.map(([from, to]) => {
          const a = nodes.find((n) => n.id === from)!;
          const b = nodes.find((n) => n.id === to)!;
          return (
            <motion.line
              key={`${from}-${to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="rgba(0, 209, 255, 0.3)"
              strokeWidth="0.3"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.3 }}
            />
          );
        })}
      </svg>

      {nodes.map((node, i) => {
        const Icon = node.icon;
        return (
          <motion.div
            key={node.id}
            className="absolute flex flex-col items-center gap-1.5"
            style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.15, type: "spring", stiffness: 200 }}
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary shadow-glow-sm"
            >
              <Icon className="h-5 w-5" />
            </motion.div>
            <span className="text-xs font-medium text-muted">{node.label}</span>
          </motion.div>
        );
      })}

      <motion.div
        className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
    </div>
  );
}