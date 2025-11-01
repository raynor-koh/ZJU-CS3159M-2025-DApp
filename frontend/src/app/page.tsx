"use client";

import { useMarketStore } from "@/lib/marketStore";
import MarketCard from "@/components/MarketCard";
import Link from "next/link";

export default function HomePage() {
  const markets = useMarketStore((s) => s.markets);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Markets</h1>
        <Link href="/admin" className="rounded-xl border px-3 py-1.5 text-sm">
          + Create Market
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {markets.map((m) => <MarketCard key={m.id} m={m} />)}
      </div>
    </div>
  );
}
