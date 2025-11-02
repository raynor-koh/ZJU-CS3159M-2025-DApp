// src/lib/useTokenBalance.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "ethers";
import { getProvider, getReadContracts } from "@/utils/contracts";

export function useTokenBalance(account?: string | null) {
  const [balance, setBalance] = useState("0.00");
  const [decimals, setDecimals] = useState(18);
  const [nonce, setNonce] = useState(0); // call reload() to bump

  const reload = () => setNonce((n) => n + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!account) { setBalance("0.00"); return; }
      const provider = await getProvider();
      const { token } = getReadContracts(provider);
      const [dec, bal] = await Promise.all([
        token.decimals().catch(() => 18),
        token.balanceOf(account),
      ]);
      if (!cancelled) {
        setDecimals(Number(dec));
        setBalance(Number(formatUnits(bal, Number(dec))).toFixed(2));
      }
    })();
    return () => { cancelled = true; };
  }, [account, nonce]);

  return useMemo(() => ({ balance, decimals, reload }), [balance, decimals]);
}
