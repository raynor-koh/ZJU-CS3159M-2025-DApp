"use client";

import { useEffect, useState } from "react";
import { coinERC20Contract } from "@/utils/contracts";

export function useAdmin(account?: string | null) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        // Guard: only run in browser and when we have an account + contract
        if (typeof window === "undefined" || !account || !coinERC20Contract) {
          if (mounted) setIsAdmin(false);
          return;
        }

        // Some builds load contracts late; bail if methods not ready
        const hasOwner = !!(coinERC20Contract as any)?.methods?.owner;
        if (!hasOwner) {
          if (mounted) setIsAdmin(false);
          return;
        }

        const owner: string = await (coinERC20Contract as any).methods.owner().call();
        if (mounted) {
          setIsAdmin(owner?.toLowerCase?.() === account.toLowerCase());
        }
      } catch (e) {
        console.warn("useAdmin: failed to read owner()", e);
        if (mounted) setIsAdmin(false);
      }
    }

    check();

    // Re-check when MetaMask events fire
    const eth = (typeof window !== "undefined" && (window as any).ethereum) || null;
    const onAccountsChanged = () => check();
    const onChainChanged = () => check();
    eth?.on?.("accountsChanged", onAccountsChanged);
    eth?.on?.("chainChanged", onChainChanged);

    return () => {
      mounted = false;
      eth?.removeListener?.("accountsChanged", onAccountsChanged);
      eth?.removeListener?.("chainChanged", onChainChanged);
    };
  }, [account]);

  return isAdmin;
}
