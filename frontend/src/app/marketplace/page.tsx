"use client";
import { useEffect, useState } from "react";
import { getProvider, fetchMarkets, type MarketView } from "@/lib/chain";
import MyTickets from "@/components/MyTickets";
import Marketplace from "@/components/Marketplace";
import OrderBookView from "@/components/OrderBookView";

export default function MarketplacePage() {
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"marketplace" | "myTickets" | "orderBook">("marketplace");
  const [refreshKey, setRefreshKey] = useState(0);
  const [markets, setMarkets] = useState<MarketView[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<MarketView | null>(null);

  useEffect(() => {
    loadUserAddress();
    loadMarkets();
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

  const loadMarkets = async () => {
    try {
      const allMarkets = await fetchMarkets();
      const openMarkets = allMarkets.filter((m) => m.status === "open");
      setMarkets(openMarkets);
      if (openMarkets.length > 0) {
        setSelectedMarket(openMarkets[0]);
      }
    } catch (e) {
      console.error("Failed to load markets:", e);
    }
  };

  const handleUpdate = () => {
    setRefreshKey((k) => k + 1);
    loadMarkets(); // Reload markets when updates happen
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ticket Marketplace</h1>
        <p className="mt-2 text-gray-600">
          Buy and sell tickets from other participants before markets are resolved
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("marketplace")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "marketplace"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Marketplace
        </button>
        <button
          onClick={() => setActiveTab("orderBook")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "orderBook"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Order Book
        </button>
        <button
          onClick={() => setActiveTab("myTickets")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "myTickets"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          My Tickets
        </button>
      </div>

      {/* Content */}
      <div>
        {activeTab === "marketplace" ? (
          <Marketplace key={`marketplace-${refreshKey}`} userAddress={userAddress} onUpdate={handleUpdate} />
        ) : activeTab === "orderBook" ? (
          <div className="space-y-4">
            {markets.length === 0 ? (
              <div className="rounded-2xl border p-6 text-center text-gray-500">
                No open markets available
              </div>
            ) : (
              <>
                {/* Market selector */}
                <div className="flex items-center gap-4">
                  <label className="font-medium">Select Market:</label>
                  <select
                    value={selectedMarket?.id ?? ""}
                    onChange={(e) => {
                      const market = markets.find((m) => m.id === Number(e.target.value));
                      setSelectedMarket(market ?? null);
                    }}
                    className="border rounded px-3 py-2 flex-1"
                  >
                    {markets.map((market) => (
                      <option key={market.id} value={market.id}>
                        {market.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Order Book Display */}
                {selectedMarket ? (
                  <OrderBookView
                    key={`orderbook-${selectedMarket.id}-${refreshKey}`}
                    market={selectedMarket}
                    userAddress={userAddress ?? undefined}
                  />
                ) : (
                  <div className="rounded-2xl border p-6 text-center text-gray-500">
                    Select a market to view its order book
                  </div>
                )}
              </>
            )}
          </div>
        ) : userAddress ? (
          <MyTickets key={`mytickets-${refreshKey}`} userAddress={userAddress} onUpdate={handleUpdate} />
        ) : (
          <div className="rounded-2xl border p-6 text-center text-gray-500">
            Please connect your wallet to view your tickets
          </div>
        )}
      </div>
    </div>
  );
}
