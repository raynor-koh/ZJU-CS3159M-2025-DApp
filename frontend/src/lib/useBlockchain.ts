// src/lib/useBlockchain.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits, id as keccak256 } from "ethers";
import {
  getProvider,
  getReadContracts,
  getWriteContracts,
  ADDRESSES,
} from "@/utils/contracts";

declare global {
  interface Window { ethereum?: any }
}

type CreateMarketInput = {
  title: string;
  description: string;
  oracle: `0x${string}`;
  resolveAt: number;            // unix seconds
  optionLabels: string[];
  optionPricesTokens: string[]; // human strings, e.g. ["5","5"]
  prizePoolTokens: string;      // human, e.g. "1000"
};

export function useBlockchain() {
  const [account, setAccount] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [busy, setBusy] = useState(false);

  const [decimals, setDecimals] = useState(18);
  const [balance, setBalance] = useState("0.00");
  const [allowance, setAllowance] = useState("0.00");
  const [nonce, setNonce] = useState(0);

  const reload = () => setNonce((n) => n + 1);

  // --- wallet connect & account tracking ---
  const connect = useCallback(async () => {
    if (!window.ethereum) { alert("MetaMask not found."); return; }
    setConnecting(true);
    try {
      const accs: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accs?.[0] ?? null);
    } finally {
      setConnecting(false);
    }
  }, []);

  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) return;
    eth.request({ method: "eth_accounts" }).then((accs: string[]) => {
      if (accs?.length) setAccount(accs[0]);
    });
    const onAccounts = (accs: string[]) => setAccount(accs?.[0] ?? null);
    eth.on?.("accountsChanged", onAccounts);
    return () => eth.removeListener?.("accountsChanged", onAccounts);
  }, []);

  // --- balances & allowance ---
  const updateBalances = useCallback(async () => {
    if (!account) { setBalance("0.00"); setAllowance("0.00"); return; }
    const provider = await getProvider();
    const { token } = getReadContracts(provider);
    const [dec, bal, allw] = await Promise.all([
      token.decimals().catch(() => 18),
      token.balanceOf(account),
      token.allowance(account, ADDRESSES.easyBet),
    ]);
    setDecimals(Number(dec));
    setBalance(Number(formatUnits(bal, Number(dec))).toFixed(2));
    setAllowance(Number(formatUnits(allw, Number(dec))).toFixed(2));
  }, [account]);

  useEffect(() => { updateBalances().catch(console.error); }, [updateBalances, nonce]);

  // --- approval helper (tokens in *human* units) ---
  const ensureAllowance = useCallback(async (needTokensHuman: string) => {
    const { signer, token, bet } = await getWriteContracts(); // NOTE: get signer here
    const owner = await signer.getAddress();
    const dec = Number(await token.decimals().catch(() => 18));
    const current = await token.allowance(owner, bet.target);
    const currentHuman = Number(formatUnits(current, dec));
    if (currentHuman >= Number(needTokensHuman)) return;

    console.log("Approving token spending…");
    const amount = parseUnits(needTokensHuman, dec);
    const tx = await token.approve(bet.target, amount);
    await tx.wait();
    reload();
  }, []);

  // --- claim faucet tokens (EasyToken.claim) ---
  const claim = useCallback(async () => {
    setBusy(true);
    try {
      const { token } = await getWriteContracts();
      const tx = await token.claim(); // adjust if your token uses a different method
      await tx.wait();
      reload();
    } finally {
      setBusy(false);
    }
  }, []);

  // --- create market ---
  const createMarket = useCallback(async (input: CreateMarketInput) => {
    setBusy(true);
    try {
      const { signer, bet, token, ticket } = await getWriteContracts();
      const who = await signer.getAddress();
      const dec = Number(await token.decimals().catch(() => 18));

      // role check: EasyBet must be minter on TicketNFT
      const MINTER_ROLE = keccak256("MINTER_ROLE");
      const hasMinter = await ticket.hasRole(MINTER_ROLE, bet.target);
      if (!hasMinter) throw new Error("TicketNFT: EasyBet is missing MINTER_ROLE.");

      // parse units
      const prize = parseUnits(input.prizePoolTokens, dec);
      const prices = input.optionPricesTokens.map((p) => parseUnits(p, dec));

      // basic sanity
      const now = Math.floor(Date.now() / 1000);
      if (input.resolveAt <= now) throw new Error("resolveAt must be in the future");
      if (!/^0x[0-9a-fA-F]{40}$/.test(input.oracle)) throw new Error("Oracle address invalid");
      if (!input.title.trim() || !input.description.trim()) throw new Error("Title/description required");
      if (input.optionLabels.length === 0) throw new Error("At least 1 option required");
      if (input.optionLabels.length !== prices.length) throw new Error("Option labels & prices length mismatch");
      if (prices.some((p) => p === BigInt(0))) throw new Error("Option price cannot be zero"); // <-- no 0n literal

      // allowance for prize pool (only if non-zero)
      if (prize > BigInt(0)) {
        await ensureAllowance(input.prizePoolTokens);
      }

      // static call to reveal revert reason early
      await bet.createMarket.staticCall(
        input.title,
        input.description,
        input.oracle,
        BigInt(input.resolveAt),
        input.optionLabels,
        prices,
        prize
      );

      console.log("Sending createMarket…");
      const tx = await bet.createMarket(
        input.title,
        input.description,
        input.oracle,
        BigInt(input.resolveAt),
        input.optionLabels,
        prices,
        prize
      );
      const rc = await tx.wait();
      reload();
      return rc;
    } finally {
      setBusy(false);
    }
  }, [ensureAllowance]);

  // --- buy ticket (approves per-option price, then buys) ---
  const buyTicket = useCallback(async (marketId: number, optionId: number) => {
    setBusy(true);
    try {
      const { bet, token } = await getWriteContracts();
      const dec = Number(await token.decimals().catch(() => 18));

      const opts = await bet.getOptions(marketId);
      const priceWei: bigint = opts[optionId].priceTokens;
      const priceHuman = Number(formatUnits(priceWei, dec)).toString();

      await ensureAllowance(priceHuman);

      const tx = await bet.buy(marketId, optionId);
      const rc = await tx.wait();
      reload();
      return rc;
    } finally {
      setBusy(false);
    }
  }, [ensureAllowance]);

  // --- resolve market ---
  const resolveMarket = useCallback(async (marketId: number, winningOption: number) => {
    setBusy(true);
    try {
      const { bet } = await getWriteContracts();
      const tx = await bet.resolve(marketId, winningOption);
      const rc = await tx.wait();
      reload();
      return rc;
    } finally {
      setBusy(false);
    }
  }, []);

  // --- read all markets (optional helper) ---
  const getMarkets = useCallback(async () => {
    const provider = await getProvider();
    const { bet, token } = getReadContracts(provider);
    const dec = Number(await token.decimals().catch(() => 18));
    const count = Number(await bet.marketCount());
    const toHuman = (v: bigint) => Number(formatUnits(v, dec));

    const reads = Array.from({ length: count }, (_, i) => i).map(async (i) => {
      const [m, opts] = await Promise.all([bet.getMarket(i), bet.getOptions(i)]);
      const [title, description, oracle, prizePoolTokens, resolveAt, status, winning, totalTickets] = m;
      return {
        id: i,
        title,
        description,
        oracle,
        prizePoolTokens: toHuman(prizePoolTokens),
        resolveAt: Number(resolveAt),
        status: Number(status) === 0 ? "open" : "resolved",
        winningOption: Number(winning),
        totalTickets: Number(totalTickets),
        options: opts.map((o: any, idx: number) => ({
          id: idx,
          label: o.label,
          priceTokens: toHuman(o.priceTokens),
          tickets: Number(o.tickets),
          volumeTokens: toHuman(o.volumeTokens),
        })),
      };
    });

    return Promise.all(reads);
  }, []);

  return useMemo(() => ({
    // wallet
    account, connecting, connect,

    // balances
    decimals, balance, allowance, reloadBalance: reload,

    // state
    busy,

    // actions
    claim,
    createMarket,
    buyTicket,
    resolveMarket,

    // reads
    getMarkets,
  }), [
    account, connecting, decimals, balance, allowance, busy,
    connect, claim, createMarket, buyTicket, resolveMarket, getMarkets,
  ]);
}
