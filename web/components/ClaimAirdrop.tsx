"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { hexToBase64 } from "@/lib/bytes";
import { getContractAddress } from "@/lib/config";
import type { CampaignView } from "@/lib/cosmos";
import type { MerkleArtifact } from "@/lib/merkle";
import { fetchMerkleArtifact, getMerkleUrl, normalizeMerkleRoot } from "@/lib/merkle-loader";
import { useWallet } from "@/lib/wallet";

export function ClaimAirdrop() {
  const contract = getContractAddress();
  const { address, isConnected, queryClient, signingClient, refresh } = useWallet();

  const [campaignId, setCampaignId] = useState("4");
  const [merkleArtifact, setMerkleArtifact] = useState<MerkleArtifact | null>(null);
  const [merkleLoading, setMerkleLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [campaignCount, setCampaignCount] = useState(0);
  const [campaign, setCampaign] = useState<CampaignView | null>(null);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);

  const merkleUrl = useMemo(() => getMerkleUrl(Number(campaignId || "0")), [campaignId]);

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
    let cancelled = false;
    setMerkleArtifact(null);
    setMerkleLoading(true);
    setLocalError(null);

    fetchMerkleArtifact(Number(campaignId || "0"))
      .then((artifact) => {
        if (!cancelled) setMerkleArtifact(artifact);
      })
      .catch((err) => {
        if (!cancelled) {
          setLocalError(err instanceof Error ? err.message : "Could not load merkle proofs");
        }
      })
      .finally(() => {
        if (!cancelled) setMerkleLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

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

  const merkleRootMismatch = useMemo(() => {
    if (!campaign || !merkleArtifact) return false;
    return normalizeMerkleRoot(campaign.merkleRoot) !== normalizeMerkleRoot(merkleArtifact.root);
  }, [campaign, merkleArtifact]);

  const eligibility = useMemo(() => {
    if (!address || !merkleArtifact || merkleRootMismatch) return null;
    return merkleArtifact.proofs[address.toLowerCase()] ?? null;
  }, [address, merkleArtifact, merkleRootMismatch]);

  const amountDisplay = useMemo(() => {
    if (!eligibility) return null;
    if (eligibility.amountInj) return `${eligibility.amountInj} INJ`;
    return `${formatUnits(BigInt(eligibility.amount), 18)} INJ`;
  }, [eligibility]);

  async function syncClaimStatus(): Promise<boolean> {
    if (!contract || !address || !queryClient) return false;
    const value = await queryClient.queryContractSmart(contract, {
      has_claimed: { campaign_id: Number(campaignId || "0"), address },
    });
    const claimed = (value as { claimed: boolean }).claimed;
    setAlreadyClaimed(Boolean(claimed));
    return Boolean(claimed);
  }

  async function handleClaim() {
    if (!contract || !eligibility || !address) return;
    if (alreadyClaimed) {
      setStatus("You already claimed this campaign. Native INJ was sent to your wallet.");
      return;
    }
    setBusy(true);
    setLocalError(null);
    setStatus(null);
    try {
      const client = await refresh();
      const result = await client.execute(
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
      const message = err instanceof Error ? err.message : String(err);

      if (/already claimed/i.test(message)) {
        setAlreadyClaimed(true);
        setLocalError(null);
        setStatus("You already claimed this campaign. Native INJ was sent to your wallet.");
        return;
      }

      // Tx may have succeeded even if CosmJS failed parsing the broadcast response.
      try {
        if (await syncClaimStatus()) {
          setStatus("Claim successful. Native INJ was sent to your wallet.");
          return;
        }
      } catch {
        // Fall through to the original error.
      }

      setLocalError(message);
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
        Connect Keplr on <code>injective-888</code>, pick the campaign, and claim native INJ. Proofs load
        automatically from the hosted merkle file.
      </p>

      <div style={{ display: "grid", gap: 16, marginTop: 20 }}>
        <div>
          <label className="label">Campaign ID</label>
          <input className="input" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} />
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            {campaignCount} campaign(s) created so far. Proofs: <code>{merkleUrl}</code>
          </p>
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

        {merkleLoading && <p className="muted">Loading eligibility for this campaign...</p>}

        {merkleRootMismatch && (
          <p style={{ color: "var(--danger)", margin: 0 }}>
            Hosted merkle file does not match this campaign&apos;s on-chain root. Ask the organizer to publish the
            correct file.
          </p>
        )}

        {alreadyClaimed && eligibility && (
          <div
            className="card"
            style={{ padding: 16, background: "rgba(61, 214, 140, 0.08)", borderColor: "rgba(61, 214, 140, 0.35)" }}
          >
            <strong style={{ color: "var(--success)" }}>Already claimed</strong>
            <p style={{ margin: "8px 0 0" }}>
              You received <strong>{amountDisplay}</strong> from campaign #{campaignId}. Try another campaign ID (e.g.{" "}
              4, 5, or 6) to claim again.
            </p>
          </div>
        )}

        {eligibility && !alreadyClaimed ? (
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
              disabled={!isConnected || busy}
              onClick={handleClaim}
            >
              {busy ? "Claiming..." : "Claim native INJ"}
            </button>
          </div>
        ) : (
          !merkleLoading &&
          !merkleRootMismatch && (
            <p className="muted">
              {!isConnected
                ? "Connect Keplr to check if your address is eligible."
                : merkleArtifact
                  ? "Your connected address is not eligible for this campaign."
                  : "Eligibility data is not available yet for this campaign."}
            </p>
          )
        )}

        {status && <p style={{ color: "var(--success)", margin: 0 }}>{status}</p>}
        {localError && <p style={{ color: "var(--danger)", margin: 0 }}>{localError}</p>}
      </div>
    </div>
  );
}