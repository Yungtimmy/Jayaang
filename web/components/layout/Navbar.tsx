"use client";

import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { WalletButton } from "@/components/WalletButton";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 z-40 w-full border-b border-white/[0.06] bg-background/70 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
            <span className="text-sm font-bold text-background">J</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">Jayaang</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="https://github.com/Yungtimmy/Jayaang" target="_blank" rel="noreferrer">
            <AnimatedButton variant="ghost" size="sm">
              GitHub
            </AnimatedButton>
          </Link>
          <Link href="/dashboard">
            <AnimatedButton size="sm">Launch App</AnimatedButton>
          </Link>
          <WalletButton compact />
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-muted md:hidden"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          "border-t border-white/[0.06] bg-background/95 md:hidden",
          open ? "block" : "hidden",
        )}
      >
        <div className="flex flex-col gap-1 p-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-white/5 hover:text-white"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <Link href="/dashboard" className="mt-2">
            <AnimatedButton className="w-full">Launch App</AnimatedButton>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}