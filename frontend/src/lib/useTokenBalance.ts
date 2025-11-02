"use client";

import { useEffect, useState } from "react";
import { coinERC20Contract, web3 } from "@/utils/contracts";

export function useTokenBalance(account?: string | null) {
  const [balance, setBalance] = useState<string>("0");

  useEffect(() => {
    if (!account) {
      setBalance("0");
      return;
    }

    let mounted = true;

    const load = async () => {
      try {
        const balAny = await coinERC20Contract.methods
          .balanceOf(account)
          .call();
        const formatted = web3.utils.fromWei(
          balAny?.toString?.() ?? "0",
          "ether"
        );

        if (mounted) setBalance(formatted);
      } catch (err) {
        console.error("Error loading balance:", err);
      }
    };

    load();
    // Reload when account changes
    return () => {
      mounted = false;
    };
  }, [account]);

  return balance;
}
