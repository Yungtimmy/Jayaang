"use client";

import { Suspense } from "react";
import { ClaimFlow } from "@/components/claim/ClaimFlow";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";

function ClaimContent() {
  return <ClaimFlow />;
}

export default function ClaimPage() {
  return (
    <AppShell title="Claim Tokens" subtitle="Connect Keplr — eligibility is checked automatically">
      <div className="mx-auto max-w-5xl">
        <Suspense
          fallback={
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          }
        >
          <ClaimContent />
        </Suspense>
      </div>
    </AppShell>
  );
}