"use client";

import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { getContractAddress } from "@/lib/config";
import type { CampaignView } from "@/lib/cosmos";
import { useWallet } from "@/lib/wallet";

export type DashboardCampaign = CampaignView & {
  claimRate: number;
};

export function useDashboardStats() {
  const contract = getContractAddress();
  const { queryClient } = useWallet();
  const [campaignCount, setCampaignCount] = useState(0);
  const [campaigns, setCampaigns] = useState<DashboardCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDeposited, setTotalDeposited] = useState("0");
  const [totalClaimed, setTotalClaimed] = useState("0");

  useEffect(() => {
    if (!contract || !queryClient) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const countRes = await queryClient!.queryContractSmart(contract!, { next_campaign_id: {} });
        const count = (countRes as { next_campaign_id: number }).next_campaign_id;
        if (cancelled) return;
        setCampaignCount(count);

        const loaded: DashboardCampaign[] = [];
        let depositedSum = BigInt(0);
        let claimedSum = BigInt(0);

        for (let id = 0; id < count; id += 1) {
          try {
            const data = await queryClient!.queryContractSmart(contract!, {
              get_campaign: { campaign_id: id },
            });
            const response = data as {
              merkle_root: string;
              deposited: string;
              claimed: string;
              expires_at: number;
              name: string;
              paused: boolean;
            };
            if (!response.deposited || response.deposited === "0") continue;

            const deposited = BigInt(response.deposited);
            const claimed = BigInt(response.claimed);
            depositedSum += deposited;
            claimedSum += claimed;

            const claimRate =
              deposited > BigInt(0) ? Number((claimed * BigInt(10000)) / deposited) / 100 : 0;

            loaded.push({
              id,
              merkleRoot: response.merkle_root,
              deposited: response.deposited,
              claimed: response.claimed,
              expiresAt: response.expires_at,
              name: response.name,
              paused: response.paused,
              claimRate,
            });
          } catch {
            // Skip invalid campaigns
          }
        }

        if (!cancelled) {
          setCampaigns(loaded.reverse());
          setTotalDeposited(formatUnits(depositedSum, 18));
          setTotalClaimed(formatUnits(claimedSum, 18));
        }
      } catch {
        if (!cancelled) {
          setCampaignCount(0);
          setCampaigns([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [contract, queryClient]);

  const claimRate =
    Number(totalDeposited) > 0
      ? (Number(totalClaimed) / Number(totalDeposited)) * 100
      : 0;

  return {
    contract,
    campaignCount,
    campaigns,
    loading,
    totalDeposited,
    totalClaimed,
    claimRate,
  };
}