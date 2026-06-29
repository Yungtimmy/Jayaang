"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { hexToBase64 } from "@/lib/bytes";
import { getContractAddress } from "@/lib/config";
import type { CampaignView } from "@/lib/cosmos";
import type { MerkleArtifact } from "@/lib/merkle";
import { fetchMerkleArtifact, normalizeMerkleRoot } from "@/lib/merkle-loader";
import { useWallet } from "@/lib/wallet";

export function useClaimCampaign(initialCampaignId = "4") {
  const contract = getContractAddress();
  const { address, isConnected, queryClient, refresh } = useWallet();

  const [campaignId, setCampaignId] = useState(initialCampaignId);
  const [merkleArtifact, setMerkleArtifact] = useState<MerkleArtifact | null>(null);
  const [merkleLoading, setMerkleLoading] = useState(false);
  const [merkleLoadError, setMerkleLoadError] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
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
    let cancelled = false;
    setMerkleArtifact(null);
    setMerkleLoading(true);
    setMerkleLoadError(null);

    fetchMerkleArtifact(Number(campaignId || "0"))
      .then((artifact) => {
        if (!cancelled) setMerkleArtifact(artifact);
      })
      .catch((err) => {
        if (!cancelled) {
          setMerkleLoadError(
            err instanceof Error ? err.message : "Eligibility data unavailable for this campaign",
          );
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

  const isCheckingEligibility = isConnected && (merkleLoading || (!merkleArtifact && !merkleLoadError));

  const amountDisplay = useMemo(() => {
    if (!eligibility) return null;
    if (eligibility.amountInj) return `${eligibility.amountInj} INJ`;
    return `${formatUnits(BigInt(eligibility.amount), 18)} INJ`;
  }, [eligibility]);

  const claimProgress = useMemo(() => {
    if (!campaign) return 0;
    const deposited = BigInt(campaign.deposited);
    if (deposited === BigInt(0)) return 0;
    return Number((BigInt(campaign.claimed) * BigInt(100)) / deposited);
  }, [campaign]);

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
    setClaimError(null);
    setStatus(null);
    setTxHash(null);
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
      setTxHash(result.transactionHash);
      setStatus(`Claim successful. Native INJ sent to ${address}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (/already claimed/i.test(message)) {
        setAlreadyClaimed(true);
        setClaimError(null);
        setStatus("You already claimed this campaign. Native INJ was sent to your wallet.");
        return;
      }

      try {
        if (await syncClaimStatus()) {
          setStatus("Claim successful. Native INJ was sent to your wallet.");
          return;
        }
      } catch {
        // Fall through
      }

      setClaimError(message);
    } finally {
      setBusy(false);
    }
  }

  return {
    contract,
    address,
    isConnected,
    campaignId,
    setCampaignId,
    campaignCount,
    campaign,
    merkleLoading,
    merkleLoadError,
    claimError,
    status,
    txHash,
    busy,
    alreadyClaimed,
    merkleRootMismatch,
    eligibility,
    amountDisplay,
    claimProgress,
    isCheckingEligibility,
    handleClaim,
  };
}