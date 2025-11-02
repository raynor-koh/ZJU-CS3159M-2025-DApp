"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useBlockchain } from "@/lib/useBlockchain";
import { nanoid } from "nanoid";
import { useAdmin } from "@/lib/useAdmin";

export default function CreateMarketForm() {
  const router = useRouter();
  const { createMarket, busy, account } = useBlockchain(); // was loading → busy
  const isAdmin = useAdmin(account);

  const [title, setTitle] = useState("");
  const [oracle, setOracle] = useState("");
  const [prizePool, setPrizePool] = useState<number>(1000);
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState([
    { id: nanoid(), label: "", price: 5 },
    { id: nanoid(), label: "", price: 5 },
  ]);
  const [resolveAtLocal, setResolveAtLocal] = useState<string>("");
  const [error, setError] = useState("");

  const addOption = () =>
    setOptions([...options, { id: nanoid(), label: "", price: 5 }]);

  const removeOption = (id: string) => {
    if (options.length > 2) {
      setOptions(options.filter((o) => o.id !== id));
    } else {
      setError("Need at least 2 options");
    }
  };

  const submit = async () => {
    setError("");

    if (!account) {
      setError("Please connect your wallet first");
      return;
    }

    if (!title || options.length < 2) {
      setError("Title and 2+ options required");
      return;
    }

    if (options.some((o) => !o.label.trim())) {
      setError("All option labels must be filled");
      return;
    }

    // Resolve time: if left empty, default to +7 days (contract often requires future timestamp)
    let resolveAtTimestamp = 0;
    if (resolveAtLocal) {
      const dt = new Date(resolveAtLocal);
      if (Number.isNaN(dt.getTime())) {
        setError("Resolve date is invalid");
        return;
      }
      resolveAtTimestamp = Math.floor(dt.getTime() / 1000);
    } else {
      resolveAtTimestamp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    }

    try {
      const optionLabels = options.map((o) => o.label);
      // Pass human strings; hook will parseUnits with token decimals
      const optionPricesTokens = options.map((o) => o.price.toString());

      const oracleAddress = oracle || account;

      await createMarket({
        title,
        description,
        oracle: oracleAddress as `0x${string}`,
        resolveAt: resolveAtTimestamp,
        optionLabels,
        optionPricesTokens,          // human strings (e.g. "5")
        prizePoolTokens: prizePool.toString(), // human string (e.g. "1000")
      });

      // After success, go back to home (or /admin if you prefer)
      router.push("/");
    } catch (err: any) {
      console.error("Create market error:", err);
      setError(err?.message || "Failed to create market");
    }
  };

  return (
    <div className="rounded-2xl border p-4">
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="mb-3">
        <label className="block text-sm font-medium">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-xl border px-3 py-2"
          placeholder="e.g., NBA Season MVP"
        />
      </div>

      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">
            Oracle Address (optional)
          </label>
          <input
            value={oracle}
            onChange={(e) => setOracle(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder={account ? account.slice(0, 10) + "..." : "Your address"}
          />
          <p className="mt-1 text-xs text-gray-500">Defaults to your address</p>
        </div>
        <div>
          <label className="block text-sm font-medium">
            Prize Pool (EasyTokens)
          </label>
          <input
            type="number"
            value={prizePool}
            onChange={(e) => setPrizePool(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            min="1"
          />
          <p className="mt-1 text-xs text-gray-500">
            Tokens you contribute to prize pool
          </p>
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded-xl border px-3 py-2"
          rows={3}
          placeholder="Describe the market and winning conditions"
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-medium">Resolve Date (optional)</label>
        <input
          type="datetime-local"
          value={resolveAtLocal}
          onChange={(e) => setResolveAtLocal(e.target.value)}
          className="mt-1 w-full rounded-xl border px-3 py-2"
        />
        <p className="mt-1 text-xs text-gray-500">
          If left empty, we’ll default to 7 days from now.
        </p>
      </div>

      <div className="mb-3">
        <div className="mb-1 text-sm font-medium">Options</div>
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={o.id} className="grid grid-cols-12 items-center gap-2">
              <input
                placeholder={`Option ${i + 1} label`}
                value={o.label}
                onChange={(e) =>
                  setOptions(options.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)))
                }
                className="col-span-8 rounded-xl border px-3 py-2"
              />
              <input
                type="number"
                placeholder="Price"
                value={o.price}
                onChange={(e) =>
                  setOptions(options.map((x) => (x.id === o.id ? { ...x, price: Number(e.target.value) } : x)))
                }
                className="col-span-3 rounded-xl border px-3 py-2"
                min="0.1"
                step="0.1"
              />
              <button
                onClick={() => removeOption(o.id)}
                className="col-span-1 rounded-xl border px-3 py-2 hover:bg-red-50"
                disabled={options.length <= 2}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addOption}
          className="mt-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
        >
          + Add option
        </button>
      </div>

      <button
        onClick={submit}
        disabled={busy || !account || !isAdmin}
        className="w-full rounded-2xl bg-black px-4 py-2 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {busy ? "Creating..." : "Create Market"}
      </button>

      {!account && (
        <p className="mt-2 text-sm text-red-600 text-center">
          Please connect your wallet to create a market
        </p>
      )}
    </div>
  );
}
