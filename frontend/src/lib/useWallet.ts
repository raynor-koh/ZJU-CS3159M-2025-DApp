"use client"

import { useEffect, useState } from "react"

export function useWallet() {
  const [account, setAccount] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  const connect = async () => {
    setConnecting(true)
    try {
      const ethereum = (window as any).ethereum
      if (!ethereum) throw new Error("MetaMask not found")
      const [addr] = await ethereum.request({ method: "eth_requestAccounts" })
      setAccount(addr ?? null)
      return addr
    } finally {
      setConnecting(false)
    }
  }

  // keep account in sync if user switches inside MetaMask
  useEffect(() => {
    const ethereum = (window as any).ethereum
    if (!ethereum) return
    const handler = (accs: string[]) => setAccount(accs[0] ?? null)
    ethereum.on("accountsChanged", handler)
    return () => ethereum.removeListener("accountsChanged", handler)
  }, [])

  return { account, connect, connecting }
}
