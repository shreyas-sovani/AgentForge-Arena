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

// Deployed contract addresses (v3 - UPDATED Nov 3, 2025)
export const CONTRACTS = {
  AgentFactory: '0x53503F191630c13A383038e430458C0Cb166C0fC',
  Arena: '0xb252402f0FEB98ca998d6dcE354DF7f22e809ed3',
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
