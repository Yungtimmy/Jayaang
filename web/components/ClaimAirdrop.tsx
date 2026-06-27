"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { hexToBase64 } from "@/lib/bytes";
import { getContractAddress } from "@/lib/config";
import type { CampaignView } from "@/lib/cosmos";
import type { MerkleArtifact } from "@/lib/merkle";
import { useWallet } from "@/lib/wallet";

export function ClaimAirdrop() {
  const contract = getContractAddress();
  const { address, isConnected, queryClient, signingClient } = useWallet();

  const [campaignId, setCampaignId] = useState("0");
  const [merkleFile, setMerkleFile] = useState<MerkleArtifact | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [campaignCount, setCampaignCount] = useState(0);
  const [campaign, setCampaign] = useState<CampaignView | null>(null);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);

  useEffect(() => {
    if (!contract || !queryClient) return;
    queryClient
      .queryContractSmart(contract, { next_campaign_id: {} })
      .then((value) => {
        const next = (value as { next_campaign_id: number }).next_campaign_id;
        setCampaignCount(next);
      })
      .catch(() => undefined);
  }, [contract, queryClient]);

  useEffect(() => {
    if (!contract || !queryClient) return;
    queryClient
      .queryContractSmart(contract, { get_campaign: { campaign_id: Number(campaignId || "0") } })
      .then((data) => {
        const response = data as {
          merkle_root: string;
          deposited: string;
          claimed: string;
          expires_at: number;
          name: string;
          paused: boolean;
        };
        if (!response.deposited || response.deposited === "0") {
          setCampaign(null);
          return;
        }
        setCampaign({
          id: Number(campaignId),
          merkleRoot: response.merkle_root,
          deposited: response.deposited,
          claimed: response.claimed,
          expiresAt: response.expires_at,
          name: response.name,
          paused: response.paused,
        });
      })
      .catch(() => setCampaign(null));
  }, [contract, campaignId, queryClient]);

  useEffect(() => {
    if (!contract || !address || !queryClient) {
      setAlreadyClaimed(false);
      return;
    }
    queryClient
      .queryContractSmart(contract, {
        has_claimed: { campaign_id: Number(campaignId || "0"), address },
      })
      .then((value) => {
        const claimed = (value as { claimed: boolean }).claimed;
        setAlreadyClaimed(Boolean(claimed));
      })
      .catch(() => setAlreadyClaimed(false));
  }, [contract, campaignId, address, queryClient]);

  const eligibility = useMemo(() => {
    if (!address || !merkleFile) return null;
    return merkleFile.proofs[address.toLowerCase()] ?? null;
  }, [address, merkleFile]);

  const amountDisplay = useMemo(() => {
    if (!eligibility) return null;
    if (eligibility.amountInj) return `${eligibility.amountInj} INJ`;
    return `${formatUnits(BigInt(eligibility.amount), 18)} INJ`;
  }, [eligibility]);

  async function handleFileChange(file: File | undefined) {
    setLocalError(null);
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as MerkleArtifact;
      if (!parsed.root || !parsed.proofs) throw new Error("Invalid merkle.json");
      setMerkleFile(parsed);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not read merkle file");
    }
  }

  async function handleClaim() {
    if (!contract || !eligibility || !signingClient || !address) return;
    setBusy(true);
    setLocalError(null);
    setStatus(null);
    try {
      const result = await signingClient.execute(
        address,
        contract,
        {
          claim: {
            campaign_id: Number(campaignId),
            amount: eligibility.amount,
            proof: eligibility.proof.map((step) => hexToBase64(step)),
          },
        },
        "auto",
      );
      setAlreadyClaimed(true);
      setStatus(`Claim successful. Native INJ sent to ${address} (${result.transactionHash}).`);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setBusy(false);
    }
  }

  if (!contract) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Claim unavailable</h2>
        <p className="muted">
          Set <code>NEXT_PUBLIC_AIRDROP_CONTRACT</code> to an <code>inj1...</code> CosmWasm address in{" "}
          <code>web/.env.local</code> and restart the dev server.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>Claim INJ Airdrop</h2>
      <p className="muted">
        Upload <code>merkle.json</code>, enter the campaign ID, and claim native INJ to your Keplr wallet.
      </p>

      <div style={{ display: "grid", gap: 16, marginTop: 20 }}>
        <div className="grid-2">
          <div>
            <label className="label">Campaign ID</label>
            <input className="input" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} />
            <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
              {campaignCount} campaign(s) created so far.
            </p>
          </div>
          <div>
            <label className="label">Merkle file</label>
            <input
              className="input"
              type="file"
              accept="application/json"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />
          </div>
        </div>

        {campaign && (
          <div className="card" style={{ padding: 16, background: "var(--panel-2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <strong>{campaign.name}</strong>
              <span className="pill">Native INJ · Campaign #{campaign.id}</span>
            </div>
            <div className="grid-2" style={{ marginTop: 12 }}>
              <div>
                <div className="muted">Deposited</div>
                <strong>{formatUnits(BigInt(campaign.deposited), 18)} INJ</strong>
              </div>
              <div>
                <div className="muted">Claimed</div>
                <strong>{formatUnits(BigInt(campaign.claimed), 18)} INJ</strong>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="muted">Expires</div>
              <strong>{new Date(campaign.expiresAt * 1000).toLocaleString()}</strong>
            </div>
          </div>
        )}

        {eligibility ? (
          <div
            className="card"
            style={{ padding: 16, background: "rgba(61, 214, 140, 0.08)", borderColor: "rgba(61, 214, 140, 0.35)" }}
          >
            <strong style={{ color: "var(--success)" }}>Eligible</strong>
            <p style={{ margin: "8px 0 0" }}>
              Your allocation: <strong>{amountDisplay}</strong>
            </p>
            <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>
              Recipient: <code>{eligibility.injAddress}</code>
            </p>
            <button
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              disabled={!isConnected || busy || alreadyClaimed}
              onClick={handleClaim}
            >
              {alreadyClaimed ? "Already claimed" : busy ? "Claiming..." : "Claim native INJ"}
            </button>
          </div>
        ) : (
          <p className="muted">
            {merkleFile && isConnected
              ? "Your Keplr address is not in this Merkle file."
              : "Connect Keplr and upload merkle.json to check eligibility."}
          </p>
        )}

        {status && <p style={{ color: "var(--success)", margin: 0 }}>{status}</p>}
        {localError && <p style={{ color: "var(--danger)", margin: 0 }}>{localError}</p>}
      </div>
    </div>
  );
}