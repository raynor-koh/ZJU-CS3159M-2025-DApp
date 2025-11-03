"use client";

import { useState, useEffect } from "react";
import {
  getOrderBook,
  buyAtBestPrice,
  type OrderBookData,
  type MarketView,
} from "@/lib/chain";

type Props = {
  market: MarketView;
  userAddress?: string;
};

export default function OrderBookView({ market, userAddress }: Props) {
  const [orderBooks, setOrderBooks] = useState<Map<number, OrderBookData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState<{ marketId: number; optionId: number } | null>(null);

  const loadOrderBooks = async () => {
    setLoading(true);
    try {
      const newOrderBooks = new Map<number, OrderBookData>();

      // Load order book for each option
      for (const option of market.options) {
        const orderBook = await getOrderBook(market.id, option.id);
        newOrderBooks.set(option.id, orderBook);
      }

      setOrderBooks(newOrderBooks);
    } catch (error) {
      console.error("Failed to load order books:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (market.status === "open") {
      loadOrderBooks();
    }
  }, [market.id, market.status]);

  const handleBuyAtBestPrice = async (optionId: number) => {
    if (!userAddress) {
      alert("Please connect your wallet");
      return;
    }

    setBuying({ marketId: market.id, optionId });
    try {
      await buyAtBestPrice(market.id, optionId);
      alert("Successfully purchased ticket at best price!");
      await loadOrderBooks(); // Reload to reflect changes
    } catch (error: any) {
      console.error("Buy failed:", error);
      alert(`Failed to buy: ${error.message}`);
    } finally {
      setBuying(null);
    }
  };

  if (market.status !== "open") {
    return (
      <div className="text-gray-500">
        Order book is only available for open markets
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-4">Loading order books...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Order Book</h3>
        <p className="text-sm text-gray-600">
          View available tickets at different price levels. Buy at the best price with one click.
        </p>
      </div>

      {market.options.map((option) => {
        const orderBook = orderBooks.get(option.id);
        const hasListings = orderBook && orderBook.levels.length > 0;
        const bestPrice = hasListings ? orderBook.levels[0].price : null;
        const totalQuantity = hasListings
          ? orderBook.levels.reduce((sum, level) => sum + level.quantity, 0)
          : 0;

        return (
          <div key={option.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-medium text-lg">{option.label}</h4>
                <p className="text-sm text-gray-600">
                  Primary market price: {option.priceTokens} EZT
                </p>
              </div>
              {hasListings && (
                <div className="text-right">
                  <div className="text-sm text-gray-600">Best Price</div>
                  <div className="text-lg font-bold text-green-600">
                    {bestPrice} EZT
                  </div>
                  <button
                    onClick={() => handleBuyAtBestPrice(option.id)}
                    disabled={buying?.optionId === option.id}
                    className="mt-2 px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-sm"
                  >
                    {buying?.optionId === option.id ? "Buying..." : "Buy at Best Price"}
                  </button>
                </div>
              )}
            </div>

            {!hasListings ? (
              <div className="text-gray-500 text-sm text-center py-4 bg-gray-50 rounded">
                No listings available for this option
              </div>
            ) : (
              <div>
                <div className="mb-2 text-sm text-gray-600">
                  Total available: {totalQuantity} ticket{totalQuantity !== 1 ? "s" : ""}
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Price (EZT)
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Quantity
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Total (EZT)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orderBook.levels.map((level, idx) => {
                        const total = (parseFloat(level.price) * level.quantity).toFixed(2);
                        return (
                          <tr key={idx} className={idx === 0 ? "bg-green-50" : ""}>
                            <td className="px-4 py-2 text-sm font-medium">
                              {parseFloat(level.price).toFixed(2)}
                              {idx === 0 && (
                                <span className="ml-2 text-xs text-green-600 font-bold">
                                  BEST
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm">{level.quantity}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
