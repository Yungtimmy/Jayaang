"use client";

import { useState } from "react";
import { ClaimAirdrop } from "@/components/ClaimAirdrop";
import { CreateAirdrop } from "@/components/CreateAirdrop";
import { SetupStatus } from "@/components/SetupStatus";
import { WalletButton } from "@/components/WalletButton";

type Tab = "create" | "claim";

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("create");

  return (
    <main>
      <header style={{ borderBottom: "1px solid var(--border)", background: "rgba(7, 11, 18, 0.8)", backdropFilter: "blur(10px)" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="pill">Injective Testnet · Native INJ</div>
            <h1 style={{ margin: "10px 0 6px", fontSize: 28 }}>Inj Airdrops</h1>
            <p className="muted" style={{ margin: 0 }}>Merkle airdrops on Injective — claim native INJ to your inj1 address via Keplr.</p>
          </div>
          <WalletButton />
        </div>
      </header>

      <section className="container" style={{ padding: "28px 0 48px" }}>
        <SetupStatus />

        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <button
            className={`btn ${tab === "create" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab("create")}
          >
            Create Airdrop
          </button>
          <button
            className={`btn ${tab === "claim" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab("claim")}
          >
            Claim Airdrop
          </button>
        </div>

        {tab === "create" ? <CreateAirdrop /> : <ClaimAirdrop />}

        <div className="card" style={{ padding: 20, marginTop: 20 }}>
          <h3 style={{ marginTop: 0 }}>4-day testnet workflow</h3>
          <ol className="muted" style={{ lineHeight: 1.8, paddingLeft: 18 }}>
            <li>Get testnet INJ from the <a href="https://testnet.faucet.injective.network/" target="_blank" rel="noreferrer">faucet</a> (native Cosmos INJ).</li>
            <li>Deploy CosmWasm contract: <code>npm run deploy:cosmwasm</code>.</li>
            <li>Create a campaign with Keplr (sends native INJ), download <code>merkle.json</code>, share with recipients.</li>
            <li>Publish <code>merkle.json</code> as <code>web/public/merkle-&lt;id&gt;.json</code> (e.g. <code>merkle-3.json</code>).</li>
            <li>Recipients connect Keplr on <code>injective-888</code>, use the matching campaign ID, and claim.</li>
            <li>Old campaigns #0–#2 cannot be claimed — they used a broken Merkle root. Create a new one.</li>
          </ol>
        </div>
      </section>
    </main>
  );
}