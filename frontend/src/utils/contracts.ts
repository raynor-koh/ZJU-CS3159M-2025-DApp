import Addresses from './contract-addresses.json'
import Market from './abis/EasyBet.json'
import CoinERC20 from './abis/EasyToken.json'
import Web3 from 'web3'

declare global {
  interface Window {
    ethereum?: any
  }
}

if (typeof window !== "undefined"  && !window?.ethereum) {
  throw new Error('MetaMask not found. Please install MetaMask and refresh.')
}

export const web3 = new Web3(window.ethereum)

// If you want to proactively request accounts elsewhere, export a helper:
export const requestAccounts = () =>
  window.ethereum.request({ method: 'eth_requestAccounts' })

const marketAddress = Addresses.market
const coinERC20Address = Addresses.coinERC20
const marketABI = Market.abi
const coinERC20ABI = CoinERC20.abi

export const marketContract = new web3.eth.Contract(marketABI as any, marketAddress)
export const coinERC20Contract = new web3.eth.Contract(coinERC20ABI as any, coinERC20Address)
