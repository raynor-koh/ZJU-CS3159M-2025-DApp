"use client";
import { useEffect, useState } from "react";
import { fetchMarkets, type MarketView } from "@/lib/chain";
import MarketCard from "@/components/MarketCard";
import { Market } from "@/types/market";

export default function HomePage() {
  const [markets, setMarkets] = useState<MarketView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarkets().then(setMarkets).finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading markets…</div>;
  if (!markets.length) return <div>No markets yet.</div>;

  // Convert MarketView to Market type for MarketCard component
  const formattedMarkets: Market[] = markets.map(m => ({
    id: String(m.id),
    title: m.title,
    description: m.description,
    oracle: m.oracle,
    prizePool: m.prizePoolTokens,
    options: m.options.map(opt => ({
      id: String(opt.id),
      label: opt.label,
      price: opt.priceTokens,
      volume: opt.volumeTokens,
      tickets: opt.tickets,
    })),
    status: m.status,
    resolvedOptionId: m.status === "resolved" ? String(m.winningOption) : undefined,
    createdAt: new Date().toISOString(), // Not available from blockchain, using placeholder
    resolveAt: m.resolveAt ? new Date(m.resolveAt * 1000).toISOString() : undefined,
  }));

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {formattedMarkets.map(m => (
        <MarketCard key={m.id} m={m} />
      ))}
    </div>
  );
}
