// app/market/[id]/page.tsx
"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { readMarket, buyTicket, getProvider } from "@/lib/chain";
import WinningTicketsClaim from "@/components/WinningTicketsClaim";

export default function MarketDetail() {
  const { id } = useParams<{ id: string }>();
  const marketId = Number(id);
  const [m, setM] = useState<Awaited<ReturnType<typeof readMarket>>>();
  const [userAddress, setUserAddress] = useState<string | null>(null);

  useEffect(() => {
    readMarket(marketId).then(setM);
    loadUserAddress();
  }, [marketId]);

  const loadUserAddress = async () => {
    try {
      const provider = await getProvider();
      if ((provider as any).getSigner) {
        const signer = await (provider as any).getSigner();
        const address = await signer.getAddress();
        setUserAddress(address);
      }
    } catch (e) {
      console.log("No wallet connected");
    }
  };

  const handlePurchase = async (optionId: number) => {
    try {
      await buyTicket(marketId, optionId);
      // Reload market data after purchase
      const updated = await readMarket(marketId);
      setM(updated);
    } catch (e: any) {
      alert(e?.message ?? "Purchase failed");
    }
  };

  const handleClaimed = async () => {
    // Reload market data after claim
    const updated = await readMarket(marketId);
    setM(updated);
  };

  if (!m) return <div>Loading…</div>;

  const winningOption = m.status === "resolved" ? m.options[m.winningOption] : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{m.title}</h1>
      <p className="text-gray-700">{m.description}</p>
      <div className="text-sm text-gray-600">Prize Pool: {m.prizePoolTokens} EZT</div>

      <div className="rounded-2xl border">
        {m.options.map((o) => (
          <div key={o.id} className="grid grid-cols-12 gap-2 p-3 border-b last:border-none">
            <div className="col-span-6">
              <div className="font-medium">
                {o.label}
                {m.status === "resolved" && m.winningOption === o.id && (
                  <span className="ml-2 rounded-lg bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                    Winner
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                Tickets: {o.tickets} • Volume: {o.volumeTokens}
              </div>
            </div>
            <div className="col-span-3 self-center text-sm">
              Price: <span className="font-medium">{o.priceTokens} EZT</span>
            </div>
            <div className="col-span-3 flex items-center justify-end">
              <button
                disabled={m.status !== "open"}
                onClick={() => handlePurchase(o.id)}
                className="rounded-xl border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Buy
              </button>
            </div>
          </div>
        ))}
      </div>

      {m.status === "resolved" && (
        <>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="mb-1 text-sm font-semibold text-blue-900">Market Resolved</div>
            <div className="text-sm text-blue-700">
              Winning option: <span className="font-medium">{winningOption?.label}</span>
            </div>
            <div className="text-sm text-blue-700">
              Total winning tickets: <span className="font-medium">{m.winners}</span>
            </div>
            <div className="text-sm text-blue-700">
              Payout per ticket: <span className="font-medium">{m.payoutPerTicketTokens.toFixed(2)} EZT</span>
            </div>
          </div>

          <WinningTicketsClaim
            marketId={marketId}
            userAddress={userAddress}
            payoutPerTicket={m.payoutPerTicketTokens}
            onClaimed={handleClaimed}
          />
        </>
      )}
    </div>
  );
}
