"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Market, Ticket } from "@/types/market";
import { nanoid } from "nanoid";

type State = {
  markets: Market[];
  tickets: Ticket[];
};

type Actions = {
  seed: () => void;
  createMarket: (m: Omit<Market, "id" | "status" | "createdAt">) => string;
  buyTicket: (marketId: string, optionId: string, buyer: string) => void;
  resolveMarket: (marketId: string, optionId: string) => void;
};

const sample: Market = {
  id: "mkt-1",
  title: "NBA Season MVP",
  description: "Who will win MVP this season?",
  oracle: "Verifier: Alice",
  prizePool: 1000,
  options: [
    { id: "opt-a", label: "Player A", price: 5, tickets: 12, volume: 60 },
    { id: "opt-b", label: "Player B", price: 5, tickets: 8, volume: 40 },
    { id: "opt-c", label: "Player C", price: 5, tickets: 15, volume: 75 },
  ],
  status: "open",
  createdAt: Date.now(),
};

export const useMarketStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      markets: [],
      tickets: [],
      seed: () => {
        if (get().markets.length === 0) set({ markets: [sample] });
      },
      createMarket: (m) => {
        const id = nanoid();
        const market: Market = {
          ...m,
          id,
          status: "open",
          createdAt: Date.now(),
          options: m.options.map((o) => ({ ...o, tickets: 0, volume: 0 })),
        };
        set({ markets: [market, ...get().markets] });
        return id;
      },
      buyTicket: (marketId, optionId, buyer) => {
        const t: Ticket = {
          id: nanoid(),
          marketId,
          optionId,
          buyer,
          createdAt: Date.now(),
        };
        const markets = get().markets.map((m) => {
          if (m.id !== marketId) return m;
          const options = m.options.map((o) =>
            o.id === optionId
              ? { ...o, tickets: o.tickets + 1, volume: o.volume + o.price }
              : o
          );
          return { ...m, options };
        });
        set({ tickets: [t, ...get().tickets], markets });
      },
      resolveMarket: (marketId, optionId) => {
        const markets: Market[] = get().markets.map((m) =>
          m.id === marketId
            ? { ...m, status: "resolved", resolvedOptionId: optionId }
            : m
        );
        set({ markets });
      },
    }),
    { name: "dlotto-store" }
  )
);
