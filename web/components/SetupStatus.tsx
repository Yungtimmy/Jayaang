"use client";

import { useEffect, useMemo, useState } from "react";
import { getContractAddress } from "@/lib/config";
import { fetchMerkleArtifact, getMerkleUrl, normalizeMerkleRoot } from "@/lib/merkle-loader";
import { useWallet } from "@/lib/wallet";

const TARGET_CAMPAIGN_ID = 3;

type BadgeStatus = "ready" | "pending" | "blocked" | "action";

type SetupItem = {
  id: string;
  label: string;
  status: BadgeStatus;
  detail: string;
};

function StatusBadge({ status, children }: { status: BadgeStatus; children: React.ReactNode }) {
  return <span className={`badge badge-${status}`}>{children}</span>;
}

export function SetupStatus() {
  const contract = getContractAddress();
  const { isConnected, queryClient } = useWallet();

  const [campaignCount, setCampaignCount] = useState<number | null>(null);
  const [campaignRoot, setCampaignRoot] = useState<string | null>(null);
  const [merkleReachable, setMerkleReachable] = useState<boolean | null>(null);
  const [merkleRoot, setMerkleRoot] = useState<string | null>(null);

  useEffect(() => {
    if (!contract || !queryClient) return;
    queryClient
      .queryContractSmart(contract, { next_campaign_id: {} })
      .then((value) => {
        const next = (value as { next_campaign_id: number }).next_campaign_id;
        setCampaignCount(next);
      })
      .catch(() => setCampaignCount(null));
  }, [contract, queryClient]);

  useEffect(() => {
    if (!contract || !queryClient || campaignCount === null || campaignCount <= TARGET_CAMPAIGN_ID) {
      setCampaignRoot(null);
      return;
    }
    queryClient
      .queryContractSmart(contract, { get_campaign: { campaign_id: TARGET_CAMPAIGN_ID } })
      .then((data) => {
        const response = data as { merkle_root: string; deposited: string };
        if (!response.deposited || response.deposited === "0") {
          setCampaignRoot(null);
          return;
        }
        setCampaignRoot(response.merkle_root);
      })
      .catch(() => setCampaignRoot(null));
  }, [contract, campaignCount, queryClient]);

  useEffect(() => {
    fetchMerkleArtifact(TARGET_CAMPAIGN_ID)
      .then((artifact) => {
        setMerkleReachable(true);
        setMerkleRoot(artifact.root);
      })
      .catch(() => {
        setMerkleReachable(false);
        setMerkleRoot(null);
      });
  }, []);

  const rootMatches = useMemo(() => {
    if (!campaignRoot || !merkleRoot) return null;
    return normalizeMerkleRoot(campaignRoot) === normalizeMerkleRoot(merkleRoot);
  }, [campaignRoot, merkleRoot]);

  const items: SetupItem[] = useMemo(() => {
    const campaignReady = campaignCount !== null && campaignCount > TARGET_CAMPAIGN_ID;

    return [
      {
        id: "merkle-fix",
        label: "Merkle leaf encoding",
        status: "ready",
        detail: "JS generator now matches the CosmWasm contract (32-byte amounts).",
      },
      {
        id: "contract",
        label: "Contract configured",
        status: contract ? "ready" : "blocked",
        detail: contract
          ? `${contract.slice(0, 12)}…${contract.slice(-6)}`
          : "Set NEXT_PUBLIC_AIRDROP_CONTRACT in web/.env.local",
      },
      {
        id: "merkle-file",
        label: "Merkle proofs hosted",
        status: merkleReachable ? "ready" : merkleReachable === false ? "blocked" : "pending",
        detail: merkleReachable
          ? getMerkleUrl(TARGET_CAMPAIGN_ID)
          : `Missing web/public/merkle-${TARGET_CAMPAIGN_ID}.json`,
      },
      {
        id: "campaign",
        label: `Campaign #${TARGET_CAMPAIGN_ID} on-chain`,
        status: campaignReady ? "ready" : campaignCount === null ? "pending" : "action",
        detail: campaignReady
          ? "Funded and ready for claims."
          : `Create a new campaign (IDs 0–2 use the old broken roots). Next ID: ${campaignCount ?? "…"}`,
      },
      {
        id: "root-match",
        label: "On-chain root ↔ proofs",
        status:
          rootMatches === true ? "ready" : rootMatches === false ? "blocked" : campaignReady ? "pending" : "pending",
        detail:
          rootMatches === true
            ? "Merkle file matches campaign root — claims will verify."
            : rootMatches === false
              ? "Merkle file does not match this campaign. Recreate or republish."
              : "Available after campaign #3 is created with the fixed merkle tree.",
      },
      {
        id: "wallet",
        label: "Keplr connected",
        status: isConnected ? "ready" : "action",
        detail: isConnected
          ? "Wallet connected on injective-888."
          : "Connect Keplr to create or claim.",
      },
    ];
  }, [contract, merkleReachable, campaignCount, rootMatches, isConnected]);

  const readyCount = items.filter((item) => item.status === "ready").length;
  const blockedCount = items.filter((item) => item.status === "blocked").length;

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: "0 0 6px" }}>Setup status</h3>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            {readyCount}/{items.length} ready
            {blockedCount > 0 ? ` · ${blockedCount} blocked` : ""}
          </p>
        </div>
        <StatusBadge status={readyCount === items.length ? "ready" : blockedCount > 0 ? "blocked" : "action"}>
          {readyCount === items.length ? "All set" : blockedCount > 0 ? "Fix blockers" : "Action needed"}
        </StatusBadge>
      </div>

      <div className="setup-grid" style={{ marginTop: 16 }}>
        {items.map((item) => (
          <div key={item.id} className="setup-row">
            <StatusBadge status={item.status}>
              {item.status === "ready" ? "✓" : item.status === "blocked" ? "✕" : item.status === "action" ? "!" : "…"}
            </StatusBadge>
            <div style={{ minWidth: 0 }}>
              <strong style={{ fontSize: 14 }}>{item.label}</strong>
              <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                {item.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}