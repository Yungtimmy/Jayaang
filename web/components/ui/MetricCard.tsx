"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { TrendingUp } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";
import { GlassCard } from "./GlassCard";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string | number;
  suffix?: string;
  change?: string;
  icon?: LucideIcon;
  loading?: boolean;
  className?: string;
  animateValue?: boolean;
};

export function MetricCard({
  label,
  value,
  suffix,
  change,
  icon: Icon,
  loading,
  className,
  animateValue = false,
}: MetricCardProps) {
  return (
    <GlassCard hover className={cn("relative overflow-hidden", className)}>
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-muted">{label}</p>
          {Icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        {loading ? (
          <div className="mt-3 h-8 w-24 animate-pulse rounded-lg bg-white/5" />
        ) : (
          <motion.div
            className="mt-2 text-2xl font-bold tracking-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {animateValue && typeof value === "number" ? (
              <AnimatedCounter value={value} suffix={suffix} />
            ) : (
              <>
                {value}
                {suffix && <span className="ml-1 text-lg text-muted">{suffix}</span>}
              </>
            )}
          </motion.div>
        )}
        {change && (
          <div className="mt-2 flex items-center gap-1 text-xs text-success">
            <TrendingUp className="h-3 w-3" />
            {change}
          </div>
        )}
      </div>
    </GlassCard>
  );
}