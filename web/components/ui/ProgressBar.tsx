"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type ProgressBarProps = {
  value: number;
  className?: string;
  showLabel?: boolean;
  color?: "primary" | "success" | "accent";
};

const colors = {
  primary: "from-primary to-primary/60",
  success: "from-success to-success/60",
  accent: "from-accent to-accent/60",
};

export function ProgressBar({ value, className, showLabel, color = "primary" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="mb-2 flex justify-between text-xs text-muted">
          <span>Progress</span>
          <span>{clamped.toFixed(1)}%</span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className={cn("h-full rounded-full bg-gradient-to-r", colors[color])}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}