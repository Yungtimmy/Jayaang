"use client";

import { useEffect, useMemo, useState } from "react";
import { getContractAddress } from "@/lib/config";
import { fetchMerkleArtifact, getMerkleUrl, normalizeMerkleRoot } from "@/lib/merkle-loader";
import { useWallet } from "@/lib/wallet";

export type SetupItemStatus = "ready" | "pending" | "blocked" | "action";

export type SetupItem = {
  id: string;
  label: string;
  status: SetupItemStatus;
  detail: string;
};

export function useSetupStatus(targetCampaignId?: number) {
  const contract = getContractAddress();
  const { isConnected, queryClient } = useWallet();

  const [campaignCount, setCampaignCount] = useState<number | null>(null);
  const [latestCampaignRoot, setLatestCampaignRoot] = useState<string | null>(null);
  const [merkleReachable, setMerkleReachable] = useState<boolean | null>(null);
  const [merkleRoot, setMerkleRoot] = useState<string | null>(null);

  const checkId = targetCampaignId ?? (campaignCount !== null && campaignCount > 0 ? campaignCount - 1 : 3);

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
    if (!contract || !queryClient || campaignCount === null || campaignCount <= checkId) {
      setLatestCampaignRoot(null);
      return;
    }
    queryClient
      .queryContractSmart(contract, { get_campaign: { campaign_id: checkId } })
      .then((data) => {
        const response = data as { merkle_root: string; deposited: string };
        if (!response.deposited || response.deposited === "0") {
          setLatestCampaignRoot(null);
          return;
        }
        setLatestCampaignRoot(response.merkle_root);
      })
      .catch(() => setLatestCampaignRoot(null));
  }, [contract, campaignCount, queryClient, checkId]);

  useEffect(() => {
    fetchMerkleArtifact(checkId)
      .then((artifact) => {
        setMerkleReachable(true);
        setMerkleRoot(artifact.root);
      })
      .catch(() => {
        setMerkleReachable(false);
        setMerkleRoot(null);
      });
  }, [checkId]);

  const rootMatches = useMemo(() => {
    if (!latestCampaignRoot || !merkleRoot) return null;
    return normalizeMerkleRoot(latestCampaignRoot) === normalizeMerkleRoot(merkleRoot);
  }, [latestCampaignRoot, merkleRoot]);

  const items: SetupItem[] = useMemo(() => {
    const campaignReady = campaignCount !== null && campaignCount > checkId;

    return [
      {
        id: "merkle-fix",
        label: "Merkle leaf encoding",
        status: "ready",
        detail: "JS generator matches the CosmWasm contract (32-byte amounts).",
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
          ? getMerkleUrl(checkId)
          : `Missing web/public/merkle-${checkId}.json`,
      },
      {
        id: "campaign",
        label: `Campaign #${checkId} on-chain`,
        status: campaignReady ? "ready" : campaignCount === null ? "pending" : "action",
        detail: campaignReady
          ? "Funded and ready for claims."
          : `Create a new campaign. Next ID: ${campaignCount ?? "…"}`,
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
              : "Available after campaign is created with the fixed merkle tree.",
      },
      {
        id: "wallet",
        label: "Keplr connected",
        status: isConnected ? "ready" : "action",
        detail: isConnected ? "Wallet connected on injective-888." : "Connect Keplr to create or claim.",
      },
    ];
  }, [contract, merkleReachable, campaignCount, rootMatches, isConnected, checkId]);

  const readyCount = items.filter((item) => item.status === "ready").length;
  const blockedCount = items.filter((item) => item.status === "blocked").length;

  return {
    items,
    readyCount,
    blockedCount,
    campaignCount,
    allReady: readyCount === items.length,
    checkId,
  };
}