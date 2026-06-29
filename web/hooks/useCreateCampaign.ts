"use client";

import { useMemo, useState } from "react";
import { getContractAddress } from "@/lib/config";
import { INJECTIVE_TESTNET } from "@/lib/cosmos";
import { hexToBase64 } from "@/lib/bytes";
import { buildMerkleArtifact, downloadJson, parseCsv, type MerkleArtifact } from "@/lib/merkle";
import { normalizeMerkleRoot } from "@/lib/merkle-loader";
import { publishMerkleArtifact } from "@/lib/publish-merkle";
import { useWallet } from "@/lib/wallet";

const EXAMPLE_CSV = `address,amount
inj14rvcf3g0j8vfylws83wgnwzd2nnr4qd7nj04nt,0.004`;

function isCosmjsResponseParseError(message: string): boolean {
  return /multiple of 4|invalid string/i.test(message);
}

export function useCreateCampaign() {
  const contract = getContractAddress();
  const { isConnected, address, refresh, queryClient } = useWallet();

  const [csv, setCsv] = useState(EXAMPLE_CSV);
  const [campaignName, setCampaignName] = useState("INJ Testnet Drop");
  const [expiryDays, setExpiryDays] = useState(30);
  const [artifact, setArtifact] = useState<MerkleArtifact | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [createdCampaignId, setCreatedCampaignId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const totalDisplay = useMemo(() => {
    if (!artifact) return "0 INJ";
    return `${artifact.totalAmountInj} INJ`;
  }, [artifact]);

  const recipientCount = useMemo(() => {
    try {
      return parseCsv(csv).length;
    } catch {
      return 0;
    }
  }, [csv]);

  function handleGenerate() {
    setLocalError(null);
    setStatus(null);
    try {
      const rows = parseCsv(csv);
      const next = buildMerkleArtifact(rows);
      setArtifact(next);
      downloadJson(`merkle-${Date.now()}.json`, next);
      setStatus("Merkle tree generated and downloaded.");
      setStep(3);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to build Merkle tree");
    }
  }

  async function resolveCampaignId(expectedId: number | null): Promise<number | null> {
    if (!contract || !queryClient) return null;

    const countRes = await queryClient.queryContractSmart(contract, { next_campaign_id: {} });
    const nextId = (countRes as { next_campaign_id: number }).next_campaign_id;
    if (nextId === 0) return null;

    const campaignId = nextId - 1;
    if (expectedId !== null && campaignId < expectedId) return null;

    const campaignRes = await queryClient.queryContractSmart(contract, {
      get_campaign: { campaign_id: campaignId },
    });
    const response = campaignRes as { merkle_root: string; deposited: string; name: string };
    if (!response.deposited || response.deposited === "0") return null;

    if (artifact) {
      const rootMatches =
        normalizeMerkleRoot(response.merkle_root) === normalizeMerkleRoot(artifact.root);
      if (!rootMatches) return null;
    }

    return campaignId;
  }

  async function verifyCampaignCreated(
    expectedId: number,
  ): Promise<{ created: boolean; campaignId?: number }> {
    if (!contract || !queryClient || !artifact) return { created: false };

    const campaignId = await resolveCampaignId(expectedId);
    if (campaignId === null || campaignId < expectedId) return { created: false };

    const campaignRes = await queryClient.queryContractSmart(contract, {
      get_campaign: { campaign_id: campaignId },
    });
    const response = campaignRes as { name: string };
    const nameMatches = response.name === campaignName;

    return nameMatches ? { created: true, campaignId } : { created: false };
  }

  async function completeCampaignCreate(campaignId: number, hash?: string) {
    setCreatedCampaignId(campaignId);
    if (hash) setTxHash(hash);
    setLocalError(null);

    if (artifact) {
      try {
        await publishMerkleArtifact(campaignId, artifact);
        setStatus("Campaign created successfully.");
      } catch (err) {
        setStatus("Campaign created successfully.");
        setLocalError(
          err instanceof Error
            ? `Proofs could not be auto-hosted: ${err.message}`
            : "Proofs could not be auto-hosted.",
        );
      }
    } else {
      setStatus("Campaign created successfully.");
    }

    setStep(4);
  }

  async function handleCreateCampaign() {
    if (!contract || !artifact || !address) return;
    setBusy(true);
    setLocalError(null);
    setStatus(null);
    setTxHash(null);
    setCreatedCampaignId(null);

    let expectedCampaignId: number | null = null;
    try {
      if (queryClient) {
        const countRes = await queryClient.queryContractSmart(contract, { next_campaign_id: {} });
        expectedCampaignId = (countRes as { next_campaign_id: number }).next_campaign_id;
      }
    } catch {
      expectedCampaignId = null;
    }

    try {
      const client = await refresh();
      const expiresAt = Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60;
      const result = await client.execute(
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

      const campaignId = await resolveCampaignId(expectedCampaignId);
      if (campaignId === null) {
        setStatus("Campaign created successfully.");
        setStep(4);
        if (result.transactionHash) setTxHash(result.transactionHash);
        return;
      }

      await completeCampaignCreate(campaignId, result.transactionHash);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (isCosmjsResponseParseError(message) && expectedCampaignId !== null) {
        try {
          const verified = await verifyCampaignCreated(expectedCampaignId);
          if (verified.created && verified.campaignId !== undefined) {
            await completeCampaignCreate(verified.campaignId);
            return;
          }
        } catch {
          // Fall through to original error.
        }
      }

      setLocalError(message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setCsv(EXAMPLE_CSV);
    setCampaignName("INJ Testnet Drop");
    setExpiryDays(30);
    setArtifact(null);
    setLocalError(null);
    setStatus(null);
    setTxHash(null);
    setCreatedCampaignId(null);
    setBusy(false);
    setStep(1);
  }

  return {
    contract,
    isConnected,
    address,
    csv,
    setCsv,
    campaignName,
    setCampaignName,
    expiryDays,
    setExpiryDays,
    artifact,
    localError,
    status,
    txHash,
    createdCampaignId,
    busy,
    step,
    setStep,
    totalDisplay,
    recipientCount,
    handleGenerate,
    handleCreateCampaign,
    reset,
  };
}