// src/lib/chain.ts
"use client";

import {
  BrowserProvider,
  JsonRpcProvider,
  Contract,
  formatUnits,
  parseUnits,
  id as keccak256,
  AbiCoder,
} from "ethers";

import EasyBet from "@/utils/abis/EasyBet.json";
import EasyToken from "@/utils/abis/EasyToken.json";
import TicketNFT from "@/utils/abis/TicketNFT.json";
import addrs from "@/utils/contract-addresses.json";

declare global {
  interface Window { ethereum?: any }
}

/** Addresses written by your deploy script */
const ADDR = {
  bet: addrs.easyBet as `0x${string}`,
  token: addrs.easyToken as `0x${string}`,
  ticket: addrs.ticketNFT as `0x${string}`,
};

const RPC_FALLBACK = "http://127.0.0.1:8545";

/* ----------------------------- provider helpers ---------------------------- */

export async function getProvider() {
  if (typeof window !== "undefined" && window.ethereum) {
    // Use injected provider for both reads & writes; no prompt here
    return new BrowserProvider(window.ethereum);
  }
  return new JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL ?? RPC_FALLBACK);
}

async function getSignerAndContracts() {
  const provider = await getProvider();
  // Prompt for accounts when we need to write
  await (provider as any).send?.("eth_requestAccounts", []);
  const signer = await (provider as any).getSigner();

  const bet = new Contract(ADDR.bet, EasyBet.abi, signer);
  const token = new Contract(ADDR.token, EasyToken.abi, signer);
  const ticket = new Contract(ADDR.ticket, TicketNFT.abi, signer);
  return { signer, bet, token, ticket };
}

function getReadContracts(provider: any) {
  const bet = new Contract(ADDR.bet, EasyBet.abi, provider);
  const token = new Contract(ADDR.token, EasyToken.abi, provider);
  const ticket = new Contract(ADDR.ticket, TicketNFT.abi, provider);
  return { bet, token, ticket };
}

/* --------------------------------- typing --------------------------------- */

export type MarketOptionView = {
  id: number;
  label: string;
  priceTokens: number;
  tickets: number;
  volumeTokens: number;
};

export type MarketView = {
  id: number;
  title: string;
  description: string;
  oracle: string;
  prizePoolTokens: number;
  resolveAt: number;
  status: "open" | "resolved";
  winningOption: number;
  totalTickets: number;
  winners: number;
  payoutPerTicketTokens: number;
  options: MarketOptionView[];
};

/* ------------------------------ util helpers ------------------------------ */

function toHuman(dec: number, v: bigint) {
  return Number(formatUnits(v, dec));
}

function decodeRevert(e: any): string {
  const data: string | undefined =
    e?.data?.originalError?.data ?? e?.data ?? e?.error?.data ?? e?.receipt?.revertReason;
  if (!data || typeof data !== "string") return e?.reason ?? e?.message ?? "Reverted";
  // 0x08c379a0 = Error(string)
  if (data.startsWith("0x08c379a0")) {
    try {
      const coder = new AbiCoder();
      const [reason] = coder.decode(["string"], "0x" + data.slice(10));
      return String(reason);
    } catch {}
  }
  return e?.reason ?? e?.message ?? "Reverted";
}

async function tokenDecimals() {
  const provider = await getProvider();
  const { token } = getReadContracts(provider);
  return Number(await token.decimals().catch(() => 18));
}

async function ensureAllowance(needTokensHuman: string) {
  const { signer, token, bet } = await getSignerAndContracts();
  const owner = await signer.getAddress();
  const dec = await tokenDecimals();

  const current = await token.allowance(owner, bet.target);
  const currentHuman = Number(formatUnits(current, dec));
  if (currentHuman >= Number(needTokensHuman)) return;

  const amount = parseUnits(needTokensHuman, dec);
  const tx = await token.approve(bet.target, amount);
  await tx.wait();
}

/* --------------------------------- reads ---------------------------------- */

/** Fetch a single market by ID */
export async function readMarket(marketId: number): Promise<MarketView> {
  const provider = await getProvider();
  const { bet } = getReadContracts(provider);
  const dec = await tokenDecimals();

  const [m, opts] = await Promise.all([bet.getMarket(marketId), bet.getOptions(marketId)]);
  const [title, description, oracle, prizePoolTokens, resolveAt, status, winning, totalTickets] = m;

  const options: MarketOptionView[] = opts.map((o: any, idx: number) => ({
    id: idx,
    label: o.label,
    priceTokens: toHuman(dec, o.priceTokens),
    tickets: Number(o.tickets),
    volumeTokens: toHuman(dec, o.volumeTokens),
  }));

  const prizePool = toHuman(dec, prizePoolTokens);
  const isResolved = Number(status) === 1;
  const winningIdx = Number(winning);

  // Calculate winners and payout (only meaningful when resolved)
  const winners = isResolved && winningIdx < options.length ? options[winningIdx].tickets : 0;
  const payoutPerTicketTokens = winners > 0 ? prizePool / winners : 0;

  return {
    id: marketId,
    title,
    description,
    oracle,
    prizePoolTokens: prizePool,
    resolveAt: Number(resolveAt),
    status: isResolved ? "resolved" : "open",
    winningOption: winningIdx,
    totalTickets: Number(totalTickets),
    winners,
    payoutPerTicketTokens,
    options,
  };
}

/** Defensive market reader that works with 0- or 1-based IDs and skips gaps. */
export async function fetchMarkets(): Promise<MarketView[]> {
  const provider = await getProvider();
  const { bet, token } = getReadContracts(provider);
  const dec = await tokenDecimals();

  const totalCreated: number = Number(await bet.marketCount()); // how many created ever
  if (totalCreated === 0) return [];

  // Probe whether id = 0 exists
  let startId = 0;
  try {
    await bet.getMarket(0);
    startId = 0;
  } catch {
    startId = 1;
  }

  const endId = startId === 0 ? totalCreated - 1 : totalCreated;
  const results: MarketView[] = [];

  for (let id = startId; id <= endId; id++) {
    try {
      const [m, opts] = await Promise.all([bet.getMarket(id), bet.getOptions(id)]);
      const [title, description, oracle, prizePoolTokens, resolveAt, status, winning, totalTickets] = m;

      const options: MarketOptionView[] = opts.map((o: any, idx: number) => ({
        id: idx,
        label: o.label,
        priceTokens: toHuman(dec, o.priceTokens),
        tickets: Number(o.tickets),
        volumeTokens: toHuman(dec, o.volumeTokens),
      }));

      const prizePool = toHuman(dec, prizePoolTokens);
      const isResolved = Number(status) === 1;
      const winningIdx = Number(winning);

      // Calculate winners and payout (only meaningful when resolved)
      const winners = isResolved && winningIdx < options.length ? options[winningIdx].tickets : 0;
      const payoutPerTicketTokens = winners > 0 ? prizePool / winners : 0;

      results.push({
        id,
        title,
        description,
        oracle,
        prizePoolTokens: prizePool,
        resolveAt: Number(resolveAt),
        status: isResolved ? "resolved" : "open",
        winningOption: winningIdx,
        totalTickets: Number(totalTickets),
        winners,
        payoutPerTicketTokens,
        options,
      });
    } catch {
      // gap or invalid id → skip
      continue;
    }
  }

  return results;
}

/* --------------------------------- writes --------------------------------- */

export async function createMarket(input: {
  title: string;
  description: string;
  oracle: `0x${string}`;
  resolveAt: number;               // unix seconds > now
  optionLabels: string[];
  optionPricesTokens: string[];    // human strings
  prizePoolTokens: string;         // human string
}) {
  const { bet, token, ticket } = await getSignerAndContracts();
  const dec = await tokenDecimals();

  // Role check: EasyBet must be MINTER on TicketNFT
  const MINTER_ROLE = keccak256("MINTER_ROLE");
  const hasMinter = await ticket.hasRole(MINTER_ROLE, bet.target);
  if (!hasMinter) throw new Error("TicketNFT: EasyBet is missing MINTER_ROLE.");

  // Parse & validate args
  const prize = parseUnits(input.prizePoolTokens, dec);
  const prices = input.optionPricesTokens.map((p) => parseUnits(p, dec));

  const now = Math.floor(Date.now() / 1000);
  if (input.resolveAt <= now) throw new Error("resolveAt must be in the future");
  if (!/^0x[0-9a-fA-F]{40}$/.test(input.oracle)) throw new Error("invalid oracle address");
  if (!input.title.trim() || !input.description.trim()) throw new Error("title/description required");
  if (input.optionLabels.length === 0) throw new Error("need at least one option");
  if (input.optionLabels.length !== prices.length) throw new Error("labels/prices length mismatch");
  if (prices.some((p) => p === BigInt(0))) throw new Error("option price cannot be zero");

  // Ensure allowance for prize pool (only if non-zero)
  if (prize > BigInt(0)) {
    await ensureAllowance(input.prizePoolTokens);
  }

  // Preflight (surface revert reason before sending)
  try {
    await bet.createMarket.staticCall(
      input.title,
      input.description,
      input.oracle,
      BigInt(input.resolveAt),
      input.optionLabels,
      prices,
      prize
    );
  } catch (e: any) {
    throw new Error(`createMarket would revert: ${decodeRevert(e)}`);
  }

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
  return rc;
}

export async function buyTicket(marketId: number, optionId: number) {
  const { bet, token } = await getSignerAndContracts();
  const dec = await tokenDecimals();

  // read option price
  const opts = await bet.getOptions(marketId);
  const priceWei: bigint = opts[optionId].priceTokens;
  const priceHumanStr = Number(formatUnits(priceWei, dec)).toString();

  await ensureAllowance(priceHumanStr);

  // preflight
  try {
    await bet.buy.staticCall(marketId, optionId);
  } catch (e: any) {
    throw new Error(`buy would revert: ${decodeRevert(e)}`);
  }

  const tx = await bet.buy(marketId, optionId);
  return await tx.wait();
}

export async function resolveMarket(marketId: number, winningOption: number) {
  const { bet } = await getSignerAndContracts();

  try {
    await bet.resolve.staticCall(marketId, winningOption);
  } catch (e: any) {
    throw new Error(`resolve would revert: ${decodeRevert(e)}`);
  }

  const tx = await bet.resolve(marketId, winningOption);
  return await tx.wait();
}

/* --------------------------------- misc ----------------------------------- */

export async function getTokenBalance(address: string) {
  const provider = await getProvider();
  const { token } = getReadContracts(provider);
  const dec = await tokenDecimals();
  const bal = await token.balanceOf(address);
  return Number(formatUnits(bal, dec));
}

export function getContracts(provider: any) {
  return getReadContracts(provider);
}

/* --------------------------------- claim ---------------------------------- */

export async function claimPayout(tokenId: number) {
  const { bet } = await getSignerAndContracts();

  // preflight
  try {
    await bet.claimPayout.staticCall(tokenId);
  } catch (e: any) {
    throw new Error(`claimPayout would revert: ${decodeRevert(e)}`);
  }

  const tx = await bet.claimPayout(tokenId);
  return await tx.wait();
}

export async function getUserWinningTickets(marketId: number, userAddress: string) {
  const provider = await getProvider();
  const { bet, ticket } = getReadContracts(provider);

  // Get market to find winning option
  const m = await bet.getMarket(marketId);
  const [, , , , , status, winningOption] = m;

  console.log('Market status:', Number(status), 'Winning option:', Number(winningOption));

  if (Number(status) !== 1) {
    console.log('Market not resolved');
    return []; // Market not resolved
  }

  // Get all user's tickets
  const userTokenIds = await ticket.tokensOfOwner(userAddress);
  console.log('User has tickets:', userTokenIds.map((id: any) => Number(id)));

  // Filter for winning tickets in this market
  const winningTickets = [];
  for (const tokenId of userTokenIds) {
    const info = await ticket.getTicketInfo(tokenId);

    if (Number(info.marketId) === marketId && Number(info.optionId) === Number(winningOption)) {
      const hasClaimed = await bet.claimed(tokenId);
      winningTickets.push({
        tokenId: Number(tokenId),
        claimed: hasClaimed,
      });
    }
  }

  console.log('Winning tickets found:', winningTickets);
  return winningTickets;
}

/* ----------------------------- Marketplace (Trading) ----------------------------- */

export type TicketWithDetails = {
  tokenId: number;
  marketId: number;
  optionId: number;
  marketTitle: string;
  optionLabel: string;
  owner: string;
  isListed: boolean;
  listingPrice?: string; // in ERC20 tokens
  marketStatus: "open" | "resolved";
};

/** Get all tickets owned by a user with full details */
export async function getUserTickets(userAddress: string): Promise<TicketWithDetails[]> {
  const provider = await getProvider();
  const { bet, ticket } = getReadContracts(provider);

  const tokenIds = await ticket.tokensOfOwner(userAddress);
  const tickets: TicketWithDetails[] = [];

  for (const tokenId of tokenIds) {
    const info = await ticket.getTicketInfo(tokenId);
    const marketId = Number(info.marketId);
    const optionId = Number(info.optionId);

    // Get market and option details
    const [m, opts] = await Promise.all([bet.getMarket(marketId), bet.getOptions(marketId)]);
    const [title, , , , , status] = m;
    const option = opts[optionId];

    // Check if listed
    const listing = await bet.listings(tokenId);
    const isListed = listing.seller !== "0x0000000000000000000000000000000000000000";
    const dec = await tokenDecimals();

    tickets.push({
      tokenId: Number(tokenId),
      marketId,
      optionId,
      marketTitle: title,
      optionLabel: option.label,
      owner: userAddress,
      isListed,
      listingPrice: isListed ? formatUnits(listing.priceTokens, dec) : undefined,
      marketStatus: Number(status) === 0 ? "open" : "resolved",
    });
  }

  return tickets;
}

/** Get all listed tickets across all markets */
export async function getAllListedTickets(): Promise<TicketWithDetails[]> {
  const provider = await getProvider();
  const { bet, ticket } = getReadContracts(provider);

  // Get total supply of tickets
  const totalSupply = await ticket.totalSupply();
  const listedTickets: TicketWithDetails[] = [];

  // Check each ticket if it's listed
  for (let i = 0; i < Number(totalSupply); i++) {
    const tokenId = await ticket.tokenByIndex(i);
    const listing = await bet.listings(tokenId);

    if (listing.seller !== "0x0000000000000000000000000000000000000000") {
      const info = await ticket.getTicketInfo(tokenId);
      const marketId = Number(info.marketId);
      const optionId = Number(info.optionId);

      // Get market and option details
      const [m, opts] = await Promise.all([bet.getMarket(marketId), bet.getOptions(marketId)]);
      const [title, , , , , status] = m;
      const option = opts[optionId];
      const dec = await tokenDecimals();

      listedTickets.push({
        tokenId: Number(tokenId),
        marketId,
        optionId,
        marketTitle: title,
        optionLabel: option.label,
        owner: listing.seller,
        isListed: true,
        listingPrice: formatUnits(listing.priceTokens, dec),
        marketStatus: Number(status) === 0 ? "open" : "resolved",
      });
    }
  }

  return listedTickets;
}

/** List a ticket for sale */
export async function listTicketForSale(tokenId: number, priceTokens: string) {
  const { bet, ticket, signer } = await getSignerAndContracts();
  const dec = await tokenDecimals();

  const priceTokensWei = parseUnits(priceTokens, dec);

  // Step 1: Check if EasyBet is approved for all NFTs, if not, approve it
  const userAddress = await signer.getAddress();
  const isApproved = await ticket.isApprovedForAll(userAddress, bet.target);

  if (!isApproved) {
    // Give EasyBet permission to transfer any of user's tickets
    const approveTx = await ticket.setApprovalForAll(bet.target, true);
    await approveTx.wait();
  }

  // Step 2: List the ticket for sale
  try {
    await bet.listForSale.staticCall(tokenId, priceTokensWei);
  } catch (e: any) {
    throw new Error(`listForSale would revert: ${decodeRevert(e)}`);
  }

  const tx = await bet.listForSale(tokenId, priceTokensWei);
  return await tx.wait();
}

/** Cancel a listing */
export async function cancelTicketListing(tokenId: number) {
  const { bet } = await getSignerAndContracts();

  try {
    await bet.cancelListing.staticCall(tokenId);
  } catch (e: any) {
    throw new Error(`cancelListing would revert: ${decodeRevert(e)}`);
  }

  const tx = await bet.cancelListing(tokenId);
  return await tx.wait();
}

/** Buy a listed ticket */
export async function buyListedTicket(tokenId: number, priceTokens: string) {
  const { bet, token } = await getSignerAndContracts();
  const dec = await tokenDecimals();

  const priceTokensWei = parseUnits(priceTokens, dec);

  // Step 1: Approve EasyBet to spend buyer's tokens (similar to buying from primary market)
  await ensureAllowance(priceTokens);

  // Step 2: Buy the listed ticket
  try {
    await bet.buyListed.staticCall(tokenId);
  } catch (e: any) {
    throw new Error(`buyListed would revert: ${decodeRevert(e)}`);
  }

  const tx = await bet.buyListed(tokenId);
  return await tx.wait();
}

/** Check if user has approved the marketplace to transfer their tickets */
export async function isMarketplaceApproved(userAddress: string): Promise<boolean> {
  const provider = await getProvider();
  const { bet, ticket } = getReadContracts(provider);
  return await ticket.isApprovedForAll(userAddress, bet.target);
}

/** Approve the marketplace to transfer user's tickets */
export async function approveMarketplace() {
  const { bet, ticket } = await getSignerAndContracts();
  const tx = await ticket.setApprovalForAll(bet.target, true);
  return await tx.wait();
}

/* ----------------------------- Order Book ----------------------------- */

export type OrderBookLevel = {
  price: string; // human-readable price in tokens
  quantity: number; // number of tickets at this price
  tokenIds: number[]; // actual token IDs at this price
};

export type OrderBookData = {
  marketId: number;
  optionId: number;
  levels: OrderBookLevel[]; // sorted by price ascending
};

/** Get the full order book for a specific market option */
export async function getOrderBook(marketId: number, optionId: number): Promise<OrderBookData> {
  const provider = await getProvider();
  const { bet } = getReadContracts(provider);
  const dec = await tokenDecimals();

  // Get all price levels (already sorted ascending in contract)
  const priceLevels = await bet.getOrderBookPriceLevels(marketId, optionId);

  const levels: OrderBookLevel[] = [];

  for (const priceWei of priceLevels) {
    const quantity = await bet.getOrderBookQuantityAtPrice(marketId, optionId, priceWei);
    const tokenIds = await bet.getOrderBookTokensAtPrice(marketId, optionId, priceWei);

    levels.push({
      price: formatUnits(priceWei, dec),
      quantity: Number(quantity),
      tokenIds: tokenIds.map((id: any) => Number(id)),
    });
  }

  return {
    marketId,
    optionId,
    levels,
  };
}

/** Buy a ticket at the best (lowest) price for a given market option */
export async function buyAtBestPrice(marketId: number, optionId: number) {
  const { bet } = await getSignerAndContracts();
  const dec = await tokenDecimals();

  // Get order book to find the best price for allowance
  const orderBook = await getOrderBook(marketId, optionId);
  if (orderBook.levels.length === 0) {
    throw new Error("No listings available for this option");
  }

  const bestPrice = orderBook.levels[0].price; // Already sorted ascending

  // Approve tokens for the best price
  await ensureAllowance(bestPrice);

  // Preflight
  try {
    await bet.buyAtBestPrice.staticCall(marketId, optionId);
  } catch (e: any) {
    throw new Error(`buyAtBestPrice would revert: ${decodeRevert(e)}`);
  }

  const tx = await bet.buyAtBestPrice(marketId, optionId);
  return await tx.wait();
}
