"use client";

import { useEffect, useState } from "react";
import { coinERC20Contract } from "@/utils/contracts";

export default function ClaimButton({ account }: { account: string }) {
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<boolean | null>(null);

  // Load claim status when account changes
  useEffect(() => {
    if (!account) return;

    let mounted = true;
    const loadClaimStatus = async () => {
      try {
        const result = await coinERC20Contract.methods
          .hasClaimed(account)
          .call();
        if (mounted) setClaimed(!!result);
        const owner = await coinERC20Contract.methods.owner().call();
        console.log("Owner:", owner);
      } catch (err) {
        console.error("Error checking claim status:", err);
      }
    };

    loadClaimStatus();
    return () => {
      mounted = false;
    };
  }, [account]);

  const onClaim = async () => {
    setLoading(true);
    setTxHash(null);
    try {
      const receipt = await coinERC20Contract.methods
        .claim()
        .send({ from: account });
      setTxHash(receipt?.transactionHash ?? null);
      setClaimed(true); // disable after successful claim
    } catch (err: any) {
      alert(err?.message ?? "Claim failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onClaim}
        disabled={loading || claimed === true}
        className="rounded-xl border px-3 py-1 text-sm"
        title="Claim your one-time 1000 EZT airdrop"
      >
        {claimed ? "Already Claimed" : loading ? "Claiming..." : "Claim EZT"}
      </button>
    </div>
  );
}
