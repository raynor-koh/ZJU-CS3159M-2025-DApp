// src/lib/useWallet.ts
"use client";

import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window { ethereum?: any }
}

export function useWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(async () => {
    if (!window.ethereum) return alert("MetaMask not found.");
    setConnecting(true);
    try {
      const accs: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accs?.[0] ?? null);
    } finally {
      setConnecting(false);
    }
  }, []);

  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) return;
    eth.request({ method: "eth_accounts" }).then((accs: string[]) => {
      if (accs?.length) setAccount(accs[0]);
    });
    const onAccounts = (accs: string[]) => setAccount(accs?.[0] ?? null);
    eth.on?.("accountsChanged", onAccounts);
    return () => eth.removeListener?.("accountsChanged", onAccounts);
  }, []);

  return { account, connect, connecting };
}
