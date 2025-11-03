"use client";
import { useState } from "react";
import Link from "next/link";
import { getAllListedTickets, buyListedTicket, type TicketWithDetails } from "@/lib/chain";

type MarketplaceProps = {
  userAddress?: string | null;
  onUpdate?: () => void;
};

export default function Marketplace({ userAddress, onUpdate }: MarketplaceProps) {
  const [listings, setListings] = useState<TicketWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState<number | null>(null);

  const loadListings = async () => {
    setLoading(true);
    try {
      const allListings = await getAllListedTickets();
      // Filter out tickets from resolved markets
      const openMarketListings = allListings.filter(t => t.marketStatus === "open");
      setListings(openMarketListings);
    } catch (e) {
      console.error("Failed to load listings:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (tokenId: number, priceEth: string) => {
    if (!userAddress) {
      alert("Please connect your wallet first");
      return;
    }

    setBuying(tokenId);
    try {
      await buyListedTicket(tokenId, priceEth);
      alert("Ticket purchased successfully!");
      await loadListings();
      onUpdate?.();
    } catch (e: any) {
      console.log(e.message)
      alert(e?.message ?? "Failed to buy ticket");
    } finally {
      setBuying(null);
    }
  };

  if (loading) return <div>Loading marketplace...</div>;

  if (!listings.length) {
    return (
      <div className="rounded-2xl border p-6 text-center">
        <p className="mb-4 text-gray-500">No tickets listed for sale yet.</p>
        <button
          onClick={loadListings}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Refresh Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Marketplace ({listings.length} tickets for sale)</h2>
        <button
          onClick={loadListings}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((ticket) => {
          const isOwnTicket = userAddress?.toLowerCase() === ticket.owner.toLowerCase();

          return (
            <div key={ticket.tokenId} className="rounded-2xl border p-4 transition hover:shadow-md">
              <div className="mb-3">
                <div className="mb-1 text-sm font-semibold">Ticket #{ticket.tokenId}</div>
                <Link
                  href={`/market/${ticket.marketId}`}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  {ticket.marketTitle}
                </Link>
                <div className="mt-1 text-sm text-gray-600">Choice: {ticket.optionLabel}</div>
              </div>

              <div className="mb-3 border-t pt-3">
                <div className="text-sm text-gray-500">Seller</div>
                <div className="truncate text-xs font-mono text-gray-700">
                  {isOwnTicket ? "You" : ticket.owner}
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <div>
                  <div className="text-xs text-gray-500">Price</div>
                  <div className="text-lg font-semibold">{ticket.listingPrice} EZT</div>
                </div>
                <button
                  onClick={() => handleBuy(ticket.tokenId, ticket.listingPrice!)}
                  disabled={isOwnTicket || buying === ticket.tokenId}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {buying === ticket.tokenId ? "Buying..." : isOwnTicket ? "Your ticket" : "Buy"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
