"use client";

import { CreateForm } from "@/components/create/CreateForm";
import { AppShell } from "@/components/layout/AppShell";

export default function CreatePage() {
  return (
    <AppShell title="Create Campaign" subtitle="Launch a new Merkle airdrop">
      <div className="mx-auto max-w-6xl">
        <CreateForm />
      </div>
    </AppShell>
  );
}