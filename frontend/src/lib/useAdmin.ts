"use client";
import { useEffect, useState } from "react";
import { getProvider, getContracts } from "@/lib/chain";
import { id as keccak256 } from "ethers";

export function useAdmin(account?: string | null) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!account) { setIsAdmin(false); return; }
      const provider = await getProvider();
      const { bet } = getContracts(provider);
      try {
        const ADMIN_ROLE = keccak256("ADMIN_ROLE");
        const ok = await bet.hasRole(ADMIN_ROLE, account);
        if (!cancelled) setIsAdmin(Boolean(ok));
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    })();
    return () => { cancelled = true; };
  }, [account]);

  return isAdmin;
}
