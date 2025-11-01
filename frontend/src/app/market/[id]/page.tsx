"use client";

import { useParams } from "next/navigation";
import { useMarketStore } from "@/lib/marketStore";
import Badge from "@/components/ui/Badge";
import { useState } from "react";

export default function MarketDetail() {
  const { id } = useParams<{ id: string }>();
  const { markets, buyTicket } = useMarketStore();
  const m = markets.find((x) => x.id === id);

  const [buyer, setBuyer] = useState("0xDEMO");

  if (!m) return <div>Market not found.</div>;
  const totalWinners = m.resolvedOptionId
    ? m.options.find((o) => o.id === m.resolvedOptionId)?.tickets ?? 0
    : 0;
  const payout = m.resolvedOptionId && totalWinners > 0 ? (m.prizePool / totalWinners).toFixed(2) : "-";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{m.title}</h1>
        <Badge>{m.status === "open" ? "Open" : "Resolved"}</Badge>
      </div>
      <p className="text-gray-700">{m.description}</p>
      <div className="text-sm text-gray-600">Oracle: <span className="font-medium">{m.oracle}</span></div>
      <div className="text-sm text-gray-600">Prize Pool: <span className="font-medium">{m.prizePool}</span></div>

      <div className="rounded-2xl border">
        {m.options.map((o) => (
          <div key={o.id} className="grid grid-cols-12 items-center gap-2 border-b p-3 last:border-none">
            <div className="col-span-5">
              <div className="font-medium">{o.label}</div>
              <div className="text-xs text-gray-500">Tickets: {o.tickets} • Volume: {o.volume}</div>
            </div>
            <div className="col-span-3 text-sm">Ticket Price: <span className="font-medium">{o.price}</span></div>
            <div className="col-span-4 flex items-center justify-end gap-2">
              <input
                className="w-40 rounded-xl border px-3 py-1.5 text-sm"
                value={buyer} onChange={(e)=>setBuyer(e.target.value)}
              />
              <button
                disabled={m.status !== "open"}
                onClick={() => buyTicket(m.id, o.id, buyer)}
                className="rounded-xl border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Buy Ticket
              </button>
            </div>
          </div>
        ))}
      </div>

      {m.status === "resolved" && (
        <div className="rounded-2xl border p-4">
          <div className="font-medium">Result: {
            m.options.find(o=>o.id===m.resolvedOptionId)?.label
          }</div>
          <div className="text-sm text-gray-600">Per-winner Payout (simulated): {payout}</div>
          <p className="mt-2 text-sm text-gray-500">
            In the real Dapp, winners would redeem via a contract call that burns the NFT ticket and transfers their share.
          </p>
        </div>
      )}
    </div>
  );
}
