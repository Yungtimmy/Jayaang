"use client";

import { useMemo, useState } from "react";
import { getContractAddress } from "@/lib/config";
import { INJECTIVE_TESTNET } from "@/lib/cosmos";
import { hexToBase64 } from "@/lib/bytes";
import { buildMerkleArtifact, downloadJson, parseCsv, type MerkleArtifact } from "@/lib/merkle";
import { useWallet } from "@/lib/wallet";

const EXAMPLE_CSV = `address,amount
inj14rvcf3g0j8vfylws83wgnwzd2nnr4qd7nj04nt,0.004`;

export function useCreateCampaign() {
  const contract = getContractAddress();
  const { isConnected, address, refresh } = useWallet();

  const [csv, setCsv] = useState(EXAMPLE_CSV);
  const [campaignName, setCampaignName] = useState("INJ Testnet Drop");
  const [expiryDays, setExpiryDays] = useState(30);
  const [artifact, setArtifact] = useState<MerkleArtifact | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
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

  async function handleCreateCampaign() {
    if (!contract || !artifact || !address) return;
    setBusy(true);
    setLocalError(null);
    setStatus(null);
    setTxHash(null);
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
      setTxHash(result.transactionHash);
      setStatus(
        `Campaign created successfully. Save your merkle file as web/public/merkle-<id>.json and restart dev if needed.`,
      );
      setStep(4);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Create campaign failed");
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