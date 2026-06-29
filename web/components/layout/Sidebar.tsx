"use client";

import { motion } from "framer-motion";
import { LayoutDashboard, PlusCircle, Settings, BookOpen, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/create", label: "Create Campaign", icon: PlusCircle },
];

type SidebarProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const content = (
    <>
      <div className="flex h-16 items-center gap-2.5 border-b border-white/[0.06] px-5">
        <Link href="/" className="flex items-center gap-2.5" onClick={onMobileClose}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <span className="text-xs font-bold text-background">J</span>
          </div>
          <span className="font-semibold">Jayaang</span>
        </Link>
        {onMobileClose && (
          <button type="button" className="ml-auto rounded-lg p-1.5 text-muted lg:hidden" onClick={onMobileClose}>
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {links.map((link) => {
          const active = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} onClick={onMobileClose}>
              <motion.div
                whileHover={{ x: 2 }}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-white/[0.04] hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] p-3 space-y-1">
        <a
          href="https://github.com/Yungtimmy/Jayaang"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-white/[0.04] hover:text-white"
        >
          <BookOpen className="h-4 w-4" />
          Docs
        </a>
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted">
          <Settings className="h-4 w-4" />
          Settings
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.06] bg-surface/50 lg:flex">
        {content}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onMobileClose} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-surface">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}