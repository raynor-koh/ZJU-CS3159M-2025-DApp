// src/utils/contracts.ts
"use client";

import { BrowserProvider, JsonRpcProvider, Contract } from "ethers";
import EasyBet from "@/utils/abis/EasyBet.json";
import EasyToken from "@/utils/abis/EasyToken.json";
import TicketNFT from "@/utils/abis/TicketNFT.json";
import addrs from "@/utils/contract-addresses.json";

export const ADDRESSES = {
  easyBet: addrs.easyBet,
  easyToken: addrs.easyToken,
  ticketNFT: addrs.ticketNFT,
} as const;

const RPC_FALLBACK = "http://127.0.0.1:8545";

declare global {
  interface Window { ethereum?: any }
}

export async function getProvider() {
  if (typeof window !== "undefined" && window.ethereum) {
    const p = new BrowserProvider(window.ethereum);
    // ensure connection (prompts if needed)
    await p.send("eth_requestAccounts", []);
    return p;
  }
  return new JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL ?? RPC_FALLBACK);
}

export function getReadContracts(provider: any) {
  return {
    bet: new Contract(ADDRESSES.easyBet, EasyBet.abi, provider),
    token: new Contract(ADDRESSES.easyToken, EasyToken.abi, provider),
    ticket: new Contract(ADDRESSES.ticketNFT, TicketNFT.abi, provider),
  };
}

/** Write set: returns signer + contracts bound to that signer */
export async function getWriteContracts() {
  const provider = await getProvider();                  // BrowserProvider
  // typed as any to keep TS happy across different provider types
  const signer = await (provider as any).getSigner();    // MetaMask active account

  return {
    signer,                                              // <-- include signer
    bet: new Contract(ADDRESSES.easyBet, EasyBet.abi, signer),
    token: new Contract(ADDRESSES.easyToken, EasyToken.abi, signer),
    ticket: new Contract(ADDRESSES.ticketNFT, TicketNFT.abi, signer),
  };
}
