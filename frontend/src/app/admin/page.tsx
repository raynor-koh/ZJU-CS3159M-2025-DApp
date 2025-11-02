"use client";

import { useEffect, useState } from "react";
import CreateMarketForm from "@/components/CreateMarketForm";
import { fetchMarkets, resolveMarket, getProvider, type MarketView } from "@/lib/chain";
import { useAdmin } from "@/lib/useAdmin";

export default function AdminPage() {
  const [markets, setMarkets] = useState<MarketView[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const isAdmin = useAdmin(userAddress);

  useEffect(() => {
    fetchMarkets().then(setMarkets);
    loadUserAddress();
  }, []);

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

  async function onResolve(marketId: number, optionId: number) {
    try {
      setBusy(`${marketId}-${optionId}`);
      await resolveMarket(marketId, optionId);
      setMarkets(await fetchMarkets());
    } catch (e: any) {
      alert(e?.message ?? "Failed to resolve market");
    } finally {
      setBusy(null);
    }
  }

  function canResolve(market: MarketView): { canResolve: boolean; reason?: string; info?: string } {
    if (market.status === "resolved") {
      return { canResolve: false, reason: "Already resolved" };
    }

    if (market.totalTickets === 0) {
      return { canResolve: false, reason: "No tickets sold" };
    }

    // Admins can resolve anytime, but show info if resolving early
    const now = Math.floor(Date.now() / 1000);
    if (market.resolveAt > 0 && now < market.resolveAt) {
      const timeLeft = market.resolveAt - now;
      const minutes = Math.floor(timeLeft / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      let timeStr = "";
      if (days > 0) timeStr = `${days} day${days > 1 ? "s" : ""}`;
      else if (hours > 0) timeStr = `${hours} hour${hours > 1 ? "s" : ""}`;
      else if (minutes > 0) timeStr = `${minutes} minute${minutes > 1 ? "s" : ""}`;
      else timeStr = `${timeLeft} second${timeLeft > 1 ? "s" : ""}`;

      return {
        canResolve: true,
        info: `Scheduled to resolve in ${timeStr} (admin override enabled)`
      };
    }

    return { canResolve: true };
  }

  if (!userAddress) {
    return (
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6">
        <h1 className="mb-2 text-lg font-semibold text-yellow-900">Connect Wallet</h1>
        <p className="text-sm text-yellow-700">
          Please connect your wallet to access the admin panel.
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h1 className="mb-2 text-lg font-semibold text-red-900">Access Denied</h1>
        <p className="text-sm text-red-700">
          You need admin privileges to access this page.
        </p>
        <p className="mt-2 text-xs text-red-600">Connected: {userAddress}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
        <div className="text-sm font-semibold text-green-900">Admin Access Granted</div>
        <div className="text-xs text-green-700">{userAddress}</div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h1 className="mb-3 text-xl font-semibold">Create Market</h1>
          <CreateMarketForm />
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold">Resolve Market</h2>
          <div className="space-y-3">
            {markets.map((m) => {
              const resolveStatus = canResolve(m);
              return (
                <div key={m.id} className="rounded-2xl border p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="font-medium">{m.title}</div>
                    {m.status === "resolved" ? (
                      <span className="rounded-lg bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                        Resolved
                      </span>
                    ) : resolveStatus.canResolve ? (
                      <span className="rounded-lg bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Ready
                      </span>
                    ) : (
                      <span className="rounded-lg bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                        Locked
                      </span>
                    )}
                  </div>

                  {!resolveStatus.canResolve && resolveStatus.reason && (
                    <div className="mb-2 text-xs text-red-600">{resolveStatus.reason}</div>
                  )}

                  {resolveStatus.canResolve && resolveStatus.info && (
                    <div className="mb-2 text-xs text-blue-600">{resolveStatus.info}</div>
                  )}

                  {m.status === "resolved" && (
                    <div className="mb-2 text-xs text-gray-600">
                      Winner: {m.options[m.winningOption]?.label}
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mb-2">
                    Total tickets: {m.totalTickets} • Prize: {m.prizePoolTokens.toFixed(2)} EZT
                  </div>

                  <div className="grid gap-2">
                    {m.options.map((o) => (
                      <button
                        key={o.id}
                        disabled={!resolveStatus.canResolve || busy !== null}
                        onClick={() => onResolve(m.id, o.id)}
                        className="w-full rounded-xl border px-3 py-2 text-left text-sm disabled:opacity-50 hover:bg-gray-50"
                        title={!resolveStatus.canResolve ? resolveStatus.reason : undefined}
                      >
                        {busy === `${m.id}-${o.id}` ? (
                          "Resolving…"
                        ) : (
                          <div className="flex justify-between">
                            <span>Set result → {o.label}</span>
                            <span className="text-gray-500">
                              {o.tickets} ticket{o.tickets !== 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {!markets.length && <div>No markets yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
