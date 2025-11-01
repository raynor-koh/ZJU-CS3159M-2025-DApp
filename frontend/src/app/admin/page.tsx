"use client";

import CreateMarketForm from "@/components/CreateMarketForm";
import { useMarketStore } from "@/lib/marketStore";

export default function AdminPage() {
  const { markets, resolveMarket } = useMarketStore();

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <h1 className="mb-3 text-xl font-semibold">Create Market</h1>
        <CreateMarketForm />
      </div>

      <div>
        <h2 className="mb-3 text-xl font-semibold">Resolve Market</h2>
        <div className="space-y-3">
          {markets.map((m) => (
            <div key={m.id} className="rounded-2xl border p-3">
              <div className="mb-2 font-medium">{m.title}</div>
              <div className="grid gap-2">
                {m.options.map((o) => (
                  <button
                    key={o.id}
                    disabled={m.status === "resolved"}
                    onClick={() => resolveMarket(m.id, o.id)}
                    className="w-full rounded-xl border px-3 py-2 text-left disabled:opacity-50"
                  >
                    Set result → {o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
