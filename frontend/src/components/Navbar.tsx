// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import { useWallet } from "@/lib/useWallet";
import { useTokenBalance } from "@/lib/useTokenBalance";
import ClaimButton from "@/components/ClaimButton";

declare global {
  interface Window { ethereum?: any }
}

export default function Navbar() {
  const { account, connect, connecting } = useWallet();
  const { balance, reload } = useTokenBalance(account ?? undefined);

  const short = (addr?: string | null) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";

  return (
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold">ZJU-PolyMarket</Link>

        <nav className="flex items-center gap-4">
          <Link href="/" className="text-sm hover:underline">Home</Link>
          <Link href="/admin" className="text-sm hover:underline">Admin</Link>

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
              {/* Token balance */}
              <span className="text-sm" title="Your EZT balance">
                EZT: <span className="font-medium">{balance}</span>
              </span>

              {/* Claim button (calls EasyToken.claim) */}
              <ClaimButton onClaimed={reload} />

              {/* Address */}
              <span className="text-sm font-medium" title={account}>
                {short(account)}
              </span>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
