"use client";

import { useEffect, useState } from "react";
import { getUserWinningTickets, claimPayout } from "@/lib/chain";

type WinningTicket = {
  tokenId: number;
  claimed: boolean;
};

type Props = {
  marketId: number;
  userAddress: string | null;
  payoutPerTicket: number;
  onClaimed?: () => void;
};

export default function WinningTicketsClaim({
  marketId,
  userAddress,
  payoutPerTicket,
  onClaimed,
}: Props) {
  const [tickets, setTickets] = useState<WinningTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);

  useEffect(() => {
    if (userAddress) {
      loadTickets();
    } else {
      setLoading(false);
    }
  }, [userAddress, marketId]);

  const loadTickets = async () => {
    if (!userAddress) return;

    try {
      const winningTickets = await getUserWinningTickets(marketId, userAddress);
      setTickets(winningTickets);
    } catch (e: any) {
      console.error("Failed to load winning tickets:", e?.message ?? e);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (tokenId: number) => {
    try {
      setClaiming(tokenId);
      await claimPayout(tokenId);

      // Update the ticket's claimed status
      setTickets((prev) =>
        prev.map((t) => (t.tokenId === tokenId ? { ...t, claimed: true } : t))
      );

      onClaimed?.();
    } catch (e: any) {
      console.error("Claim failed:", e?.message ?? e);
      alert(e?.message ?? "Failed to claim payout");
    } finally {
      setClaiming(null);
    }
  };

  if (!userAddress) {
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-700">
          Connect your wallet to check if you have winning tickets to claim.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border p-4">
        <p className="text-sm text-gray-500">Loading your tickets...</p>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="rounded-2xl border p-4">
        <p className="text-sm text-gray-500">
          You don't have any winning tickets for this market.
        </p>
      </div>
    );
  }

  const unclaimedTickets = tickets.filter((t) => !t.claimed);
  const claimedTickets = tickets.filter((t) => t.claimed);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
        <h3 className="mb-2 font-semibold text-green-900">
          You have {tickets.length} winning ticket{tickets.length > 1 ? "s" : ""}!
        </h3>
        <p className="text-sm text-green-700">
          Payout per ticket: <span className="font-medium">{payoutPerTicket} EZT</span>
        </p>
      </div>

      {unclaimedTickets.length > 0 && (
        <div className="rounded-2xl border p-4">
          <h4 className="mb-3 font-medium">Unclaimed Tickets ({unclaimedTickets.length})</h4>
          <div className="space-y-2">
            {unclaimedTickets.map((ticket) => (
              <div
                key={ticket.tokenId}
                className="flex items-center justify-between rounded-xl border p-3"
              >
                <div>
                  <div className="font-medium">Ticket #{ticket.tokenId}</div>
                  <div className="text-sm text-gray-500">
                    Claimable: {payoutPerTicket} EZT
                  </div>
                </div>
                <button
                  onClick={() => handleClaim(ticket.tokenId)}
                  disabled={claiming !== null}
                  className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {claiming === ticket.tokenId ? "Claiming..." : "Claim"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {claimedTickets.length > 0 && (
        <div className="rounded-2xl border p-4">
          <h4 className="mb-3 font-medium text-gray-600">
            Claimed Tickets ({claimedTickets.length})
          </h4>
          <div className="space-y-2">
            {claimedTickets.map((ticket) => (
              <div
                key={ticket.tokenId}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3"
              >
                <div>
                  <div className="font-medium text-gray-600">Ticket #{ticket.tokenId}</div>
                  <div className="text-sm text-gray-500">
                    Claimed: {payoutPerTicket} EZT
                  </div>
                </div>
                <div className="rounded-lg bg-gray-200 px-3 py-1 text-sm font-medium text-gray-600">
                  Claimed
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
