"use client";
import { useState } from "react";
import { getUserTickets, listTicketForSale, cancelTicketListing, type TicketWithDetails } from "@/lib/chain";
import Badge from "./ui/Badge";

type MyTicketsProps = {
  userAddress: string;
  onUpdate?: () => void;
};

export default function MyTickets({ userAddress, onUpdate }: MyTicketsProps) {
  const [tickets, setTickets] = useState<TicketWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [listingTokenId, setListingTokenId] = useState<number | null>(null);
  const [listPrice, setListPrice] = useState("");

  const loadTickets = async () => {
    setLoading(true);
    try {
      const userTickets = await getUserTickets(userAddress);
      // Filter out tickets from resolved markets
      const openMarketTickets = userTickets.filter(t => t.marketStatus === "open");
      setTickets(openMarketTickets);
    } catch (e) {
      console.error("Failed to load tickets:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleList = async (tokenId: number) => {
    if (!listPrice || Number(listPrice) <= 0) {
      alert("Please enter a valid price");
      return;
    }

    try {
      await listTicketForSale(tokenId, listPrice);
      alert("Ticket listed successfully!");
      setListingTokenId(null);
      setListPrice("");
      await loadTickets();
      onUpdate?.();
    } catch (e: any) {
      alert(e?.message ?? "Failed to list ticket");
    }
  };

  const handleCancel = async (tokenId: number) => {
    try {
      await cancelTicketListing(tokenId);
      alert("Listing cancelled!");
      await loadTickets();
      onUpdate?.();
    } catch (e: any) {
      alert(e?.message ?? "Failed to cancel listing");
    }
  };

  if (loading) return <div>Loading your tickets...</div>;
  if (!tickets.length) {
    return (
      <div className="rounded-2xl border p-6 text-center text-gray-500">
        You don't own any tickets yet. Buy some tickets from the markets!
        <button
          onClick={loadTickets}
          className="ml-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">My Tickets ({tickets.length})</h2>
        <button
          onClick={loadTickets}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {tickets.map((ticket) => (
          <div key={ticket.tokenId} className="rounded-2xl border p-4">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <div className="font-medium">Ticket #{ticket.tokenId}</div>
                <div className="text-sm text-gray-600">{ticket.marketTitle}</div>
                <div className="text-sm text-gray-500">Choice: {ticket.optionLabel}</div>
              </div>
              {ticket.isListed && <Badge>Listed</Badge>}
            </div>

            {ticket.isListed ? (
              <div className="flex items-center justify-between border-t pt-3">
                <div className="text-sm">
                  Listed for: <span className="font-medium">{ticket.listingPrice} EZT</span>
                </div>
                <button
                  onClick={() => handleCancel(ticket.tokenId)}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  Cancel Listing
                </button>
              </div>
            ) : (
              <div className="border-t pt-3">
                {listingTokenId === ticket.tokenId ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="Price in EZT"
                      value={listPrice}
                      onChange={(e) => setListPrice(e.target.value)}
                      className="flex-1 rounded-lg border px-3 py-1.5 text-sm"
                    />
                    <button
                      onClick={() => handleList(ticket.tokenId)}
                      className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => {
                        setListingTokenId(null);
                        setListPrice("");
                      }}
                      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setListingTokenId(ticket.tokenId)}
                    className="w-full rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    List for Sale
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
