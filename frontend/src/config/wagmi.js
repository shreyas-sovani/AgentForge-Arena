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

// Deployed contract addresses (v6 - Nov 3, 2025 - resolveRound accessible to engine)
export const CONTRACTS = {
  AgentFactory: '0xB973F366ce7e5bEed8AB275c30d30cE568F31792',
  Arena: '0x5C5e24ed6a89Aa6c5e86e5B47564dbc61E3B85d9',
  EcoOracle: '0xdf833a6F4D2211d4a2Fa305411096B5DDb56ea3D',
  RewardDistributor: '0xb08efB81517be0f9e3A83F50321dDB8d43304998',
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
