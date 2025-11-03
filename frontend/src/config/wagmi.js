import { http, createConfig } from 'wagmi'
import { defineChain } from 'viem'
import { injected } from 'wagmi/connectors'

// Define custom Somnia Testnet chain
export const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'STT',
    symbol: 'STT',
  },
  rpcUrls: {
    default: {
      http: ['https://dream-rpc.somnia.network'],
    },
    public: {
      http: ['https://dream-rpc.somnia.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Somnia Explorer',
      url: 'https://explorer-devnet.somnia.network',
    },
  },
  testnet: true,
})

// Deployed contract addresses
export const CONTRACTS = {
  AgentFactory: '0x8083ee36D34A4079087a1fC02c2F7f790838180e',
  Arena: '0xC98Ea0972774F69c7b6E543a6D7005103D4bF91D',
  EcoOracle: '0xD46C9A11D7331CCf4858272df6744bA6585B9230',
  RewardDistributor: '0xBC18017eC5632BbBD47d420D6e16d3686186Bd50',
}

// Engine signer address (for display/verification)
export const ENGINE_SIGNER = '0xD2aA21AF4faa840Dea890DB2C6649AACF2C80Ff3'

export const config = createConfig({
  chains: [somniaTestnet],
  connectors: [
    injected(),
  ],
  transports: {
    [somniaTestnet.id]: http(),
  },
})
