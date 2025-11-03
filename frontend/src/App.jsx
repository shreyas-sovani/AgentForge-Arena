import { useState } from 'react'
import { WagmiProvider, useAccount, useConnect, useDisconnect } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './config/wagmi'
import PromptInput from './components/PromptInput'
import ArenaView from './components/ArenaView'
import './App.css'

const queryClient = new QueryClient()

function ConnectButton() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected) {
    return (
      <div className="wallet-info">
        <span className="address">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
        <button onClick={() => disconnect()} className="btn-secondary">
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="connect-wallet">
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => connect({ connector })}
          className="btn-primary"
        >
          Connect Wallet
        </button>
      ))}
    </div>
  )
}

function AppContent() {
  const { isConnected } = useAccount()
  const [baseDNA, setBaseDNA] = useState(null)
  const [swarmId, setSwarmId] = useState(null)

  return (
    <div className="app">
      <header className="header">
        <h1>🧬 AgentForge Arena</h1>
        <p className="subtitle">Evolutionary AI Agent Battle Royale on Somnia</p>
        <ConnectButton />
      </header>

      <main className="main">
        {!isConnected ? (
          <div className="welcome">
            <h2>Connect your wallet to begin</h2>
            <p>Mint AI agents, watch them evolve, and compete for survival</p>
          </div>
        ) : (
          <>
            {!baseDNA ? (
              <PromptInput onDNAGenerated={setBaseDNA} />
            ) : (
              <ArenaView 
                baseDNA={baseDNA} 
                swarmId={swarmId}
                onSwarmCreated={setSwarmId}
                onReset={() => { setBaseDNA(null); setSwarmId(null); }}
              />
            )}
          </>
        )}
      </main>

      <footer className="footer">
        <p>Built for Somnia AI Hackathon 2025 • Gaming Agents Track</p>
      </footer>
    </div>
  )
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
