"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useMarketStore } from "@/lib/marketStore";

export default function Navbar() {
  const seed = useMarketStore((s) => s.seed);

  useEffect(() => seed(), [seed]); // load sample

  return (
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold">
          ZJU-PolyMarket
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/admin" className="text-sm hover:underline">
            Verifier Admin
          </Link>
          <button
            className="rounded-xl border px-3 py-1 text-sm"
            onClick={() => alert("Connect Wallet – placeholder")}
          >
            Connect Wallet
          </button>
        </nav>
      </div>
    </header>
  );
}
