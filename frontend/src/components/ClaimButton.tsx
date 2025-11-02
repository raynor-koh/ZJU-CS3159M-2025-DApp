// src/components/ClaimButton.tsx
"use client";

import { useState, useEffect } from "react";
import { getWriteContracts } from "@/utils/contracts";

type Props = {
  onClaimed?: () => void;
  className?: string;
};

export default function ClaimButton({ onClaimed, className }: Props) {
  const [busy, setBusy] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkClaimStatus();
  }, []);

  const checkClaimStatus = async () => {
    try {
      const { token, signer } = await getWriteContracts();
      const address = await signer.getAddress();
      const claimed = await token.hasClaimed(address);
      setHasClaimed(claimed);
    } catch (e: any) {
      console.error("Failed to check claim status:", e?.message ?? e);
    } finally {
      setLoading(false);
    }
  };

  const claim = async () => {
    try {
      setBusy(true);
      const { token } = await getWriteContracts();
      // EasyToken.claim() — mints/airdrops test tokens for the caller
      const tx = await token.claim();
      await tx.wait();
      setHasClaimed(true);
      onClaimed?.();
    } catch (e: any) {
      console.error("Claim failed:", e?.message ?? e);
      alert(e?.message ?? "Claim failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <button
        disabled
        className={className ?? "rounded-xl border px-3 py-1 text-sm disabled:opacity-50"}
      >
        Loading...
      </button>
    );
  }

  return (
    <button
      onClick={claim}
      disabled={busy || hasClaimed}
      className={className ?? "rounded-xl border px-3 py-1 text-sm disabled:opacity-50"}
      title={hasClaimed ? "Already claimed" : "Claim demo EZT to participate"}
    >
      {busy ? "Claiming…" : hasClaimed ? "Claimed" : "Claim EZT"}
    </button>
  );
}
