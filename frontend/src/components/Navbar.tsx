"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useMarketStore } from "@/lib/marketStore";
import { useWallet } from "@/lib/useWallet";
import { useTokenBalance } from "@/lib/useTokenBalance";
import { useAdmin } from "@/lib/useAdmin";
import ClaimButton from "@/components/ClaimButton";

export default function Navbar() {
  const seed = useMarketStore((s) => s.seed);
  const { account, connect, connecting } = useWallet();
  const balance = useTokenBalance(account);
  const isAdmin = useAdmin(account);

  useEffect(() => seed(), [seed]);

  const short = (addr?: string | null) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";

  return (
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold">
          ZJU-PolyMarket
        </Link>

        <nav className="flex items-center gap-3">
          {isAdmin && ( // <-- show only when admin
            <Link href="/admin" className="text-sm hover:underline">
              Verifier Admin
            </Link>
          )}

          {!account ? (
            <button
              className="rounded-xl border px-3 py-1 text-sm"
              onClick={connect}
              disabled={connecting}
            >
              {connecting ? "Connecting…" : "Connect Wallet"}
            </button>
          ) : (
            <>
              <span className="text-sm font-medium">{account}</span>
              <span className="text-sm">EZT: {parseFloat(balance).toFixed(2)}</span>
              <ClaimButton account={account} />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
