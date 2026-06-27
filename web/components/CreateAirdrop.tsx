"use client";

import { useMemo, useState } from "react";
import { getContractAddress } from "@/lib/config";
import { INJECTIVE_TESTNET } from "@/lib/cosmos";
import { hexToBase64 } from "@/lib/bytes";
import { buildMerkleArtifact, downloadJson, parseCsv, type MerkleArtifact } from "@/lib/merkle";
import { useWallet } from "@/lib/wallet";

const EXAMPLE_CSV = `address,amount
inj12ms4zs769a6dynlhewfquesrzdnsmmjs6yuy2l,0.2
inj1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqz20kcxg,0.15`;

export function CreateAirdrop() {
  const contract = getContractAddress();
  const { isConnected, address, signingClient } = useWallet();

  const [csv, setCsv] = useState(EXAMPLE_CSV);
  const [campaignName, setCampaignName] = useState("INJ Testnet Drop");
  const [expiryDays, setExpiryDays] = useState(30);
  const [artifact, setArtifact] = useState<MerkleArtifact | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const totalDisplay = useMemo(() => {
    if (!artifact) return "0 INJ";
    return `${artifact.totalAmountInj} INJ`;
  }, [artifact]);

  function handleGenerate() {
    setLocalError(null);
    setStatus(null);
    try {
      const rows = parseCsv(csv);
      const next = buildMerkleArtifact(rows);
      setArtifact(next);
      downloadJson(`merkle-${Date.now()}.json`, next);
      setStatus("Merkle tree generated and downloaded.");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to build Merkle tree");
    }
  }

  async function handleCreateCampaign() {
    if (!contract || !artifact || !signingClient || !address) return;
    setBusy(true);
    setLocalError(null);
    setStatus(null);
    try {
      const expiresAt = Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60;
      const result = await signingClient.execute(
        address,
        contract,
        {
          create_campaign: {
            merkle_root: hexToBase64(artifact.root),
            expires_at: expiresAt,
            name: campaignName,
          },
        },
        "auto",
        undefined,
        [{ denom: INJECTIVE_TESTNET.coinMinimalDenom, amount: artifact.totalAmount }],
      );
      setStatus(`Campaign created (${result.transactionHash}). Share merkle.json with recipients.`);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Create campaign failed");
    } finally {
      setBusy(false);
    }
  }

  if (!contract) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Deploy contract first</h2>
        <p className="muted">
          Run <code>npm run deploy:cosmwasm</code>, then set <code>NEXT_PUBLIC_AIRDROP_CONTRACT</code> to the{" "}
          <code>inj1...</code> address in <code>web/.env.local</code> and restart <code>npm run dev</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>Create INJ Airdrop</h2>
      <p className="muted">
        Upload a CSV with <strong>inj1</strong> addresses, generate a Merkle root, then create the campaign with native
        INJ from your Keplr wallet.
      </p>

      <div style={{ display: "grid", gap: 16, marginTop: 20 }}>
        <div>
          <label className="label">Campaign name</label>
          <input className="input" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
        </div>

        <div>
          <label className="label">Expiry (days)</label>
          <input
            className="input"
            type="number"
            min={1}
            value={expiryDays}
            onChange={(e) => setExpiryDays(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="label">Recipients CSV</label>
          <textarea className="textarea" value={csv} onChange={(e) => setCsv(e.target.value)} />
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            Format: <code>address,amount</code>. Use <strong>inj1...</strong> addresses and plain INJ amounts — e.g.{" "}
            <code>0.1</code> = 0.1 INJ.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn btn-secondary" onClick={handleGenerate}>
            1. Generate Merkle Tree
          </button>
          <button
            className="btn btn-primary"
            disabled={!artifact || !isConnected || busy}
            onClick={handleCreateCampaign}
          >
            2. Create Campaign (sends native INJ)
          </button>
        </div>

        {artifact && (
          <div className="card" style={{ padding: 16, background: "var(--panel-2)" }}>
            <div className="grid-2">
              <div>
                <div className="muted">Recipients</div>
                <strong>{artifact.recipientCount}</strong>
              </div>
              <div>
                <div className="muted">Total deposit</div>
                <strong>{totalDisplay}</strong>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="muted">Merkle root</div>
              <code style={{ fontSize: 12, wordBreak: "break-all" }}>{artifact.root}</code>
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="muted">Recipients</div>
              {artifact.recipients.map((recipient) => (
                <div key={recipient.injAddress} style={{ fontSize: 13, marginTop: 6 }}>
                  <code>{recipient.injAddress}</code> → {recipient.amountInj} INJ
                </div>
              ))}
            </div>
          </div>
        )}

        {status && <p style={{ color: "var(--success)", margin: 0 }}>{status}</p>}
        {localError && <p style={{ color: "var(--danger)", margin: 0 }}>{localError}</p>}
      </div>
    </div>
  );
}