"use client";

import { Check, AlertTriangle, X } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { useSetupStatus } from "@/hooks/useSetupStatus";
import type { SetupItemStatus } from "@/hooks/useSetupStatus";

const statusIcons: Record<SetupItemStatus, React.ReactNode> = {
  ready: <Check className="h-3.5 w-3.5" />,
  blocked: <X className="h-3.5 w-3.5" />,
  action: <AlertTriangle className="h-3.5 w-3.5" />,
  pending: <span className="h-1.5 w-1.5 rounded-full bg-muted animate-pulse" />,
};

const statusVariants: Record<SetupItemStatus, "success" | "danger" | "warning" | "default"> = {
  ready: "success",
  blocked: "danger",
  action: "warning",
  pending: "default",
};

export function SetupPanel() {
  const { items, readyCount, blockedCount, allReady } = useSetupStatus();

  return (
    <GlassCard>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold">System Status</h3>
          <p className="mt-1 text-sm text-muted">
            {readyCount}/{items.length} checks passed
            {blockedCount > 0 && ` · ${blockedCount} blocked`}
          </p>
        </div>
        <Badge variant={allReady ? "success" : blockedCount > 0 ? "danger" : "warning"}>
          {allReady ? "All set" : blockedCount > 0 ? "Fix blockers" : "Action needed"}
        </Badge>
      </div>

      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
          >
            <Badge variant={statusVariants[item.status]} className="mt-0.5 shrink-0">
              {statusIcons[item.status]}
            </Badge>
            <div className="min-w-0">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="mt-0.5 text-xs text-muted break-all">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}