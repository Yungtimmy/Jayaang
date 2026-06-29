"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type AnimatedButtonProps = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-background font-semibold btn-glow hover:bg-primary/90 hover:shadow-glow",
  secondary:
    "bg-surface border border-white/10 text-white hover:border-primary/30 hover:bg-white/[0.04]",
  ghost: "bg-transparent text-muted hover:text-white hover:bg-white/[0.04]",
  danger: "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-5 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
};

export function AnimatedButton({
  className,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  icon,
  children,
  type = "button",
  onClick,
}: AnimatedButtonProps) {
  return (
    <motion.div whileHover={{ scale: disabled || loading ? 1 : 1.02 }} whileTap={{ scale: disabled || loading ? 1 : 0.98 }}>
      <button
        type={type}
        onClick={onClick}
        className={cn(
          "inline-flex items-center justify-center gap-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className,
        )}
        disabled={disabled || loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        {children}
      </button>
    </motion.div>
  );
}