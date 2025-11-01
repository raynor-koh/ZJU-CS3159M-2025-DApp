"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMarketStore } from "@/lib/marketStore";
import { Market } from "@/types/market";
import { nanoid } from "nanoid";

export default function CreateMarketForm() {
  const router = useRouter();
  const createMarket = useMarketStore((s) => s.createMarket);

  const [title, setTitle] = useState("");
  const [oracle, setOracle] = useState("");
  const [prizePool, setPrizePool] = useState<number>(1000);
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState([{ id: nanoid(), label: "", price: 5 }]);

  const addOption = () => setOptions([...options, { id: nanoid(), label: "", price: 5 }]);
  const removeOption = (id: string) => setOptions(options.filter(o => o.id !== id));

  const submit = () => {
    if (!title || options.length < 2) return alert("Title and 2+ options required.");
    const market: Omit<Market, "id" | "status" | "createdAt"> = {
      title,
      description,
      oracle,
      prizePool: Number(prizePool),
      options: options.map(o => ({ ...o, tickets: 0, volume: 0 })),
    };
    const id = createMarket(market);
    router.push(`/market/${id}`);
  };

  return (
    <div className="rounded-2xl border p-4">
      <div className="mb-3">
        <label className="block text-sm font-medium">Title</label>
        <input value={title} onChange={(e)=>setTitle(e.target.value)}
          className="mt-1 w-full rounded-xl border px-3 py-2" />
      </div>

      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Oracle</label>
          <input value={oracle} onChange={(e)=>setOracle(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Prize Pool</label>
          <input type="number" value={prizePool}
            onChange={(e)=>setPrizePool(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border px-3 py-2" />
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-medium">Description</label>
        <textarea value={description} onChange={(e)=>setDescription(e.target.value)}
          className="mt-1 w-full rounded-xl border px-3 py-2" rows={3}/>
      </div>

      <div className="mb-3">
        <div className="mb-1 text-sm font-medium">Options</div>
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={o.id} className="grid grid-cols-12 items-center gap-2">
              <input
                placeholder={`Option ${i+1} label`}
                value={o.label}
                onChange={(e)=>setOptions(options.map(x=>x.id===o.id?{...x,label:e.target.value}:x))}
                className="col-span-8 rounded-xl border px-3 py-2"
              />
              <input
                type="number"
                placeholder="Price"
                value={o.price}
                onChange={(e)=>setOptions(options.map(x=>x.id===o.id?{...x,price:Number(e.target.value)}:x))}
                className="col-span-3 rounded-xl border px-3 py-2"
              />
              <button onClick={()=>removeOption(o.id)} className="col-span-1 rounded-xl border px-3 py-2">
                ✕
              </button>
            </div>
          ))}
        </div>
        <button onClick={addOption} className="mt-2 rounded-xl border px-3 py-2 text-sm">
          + Add option
        </button>
      </div>

      <button onClick={submit} className="w-full rounded-2xl bg-black px-4 py-2 text-white">
        Create Market
      </button>
    </div>
  );
}
