import { useState, useEffect } from 'react'
import { WagmiProvider, useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config, somniaTestnet } from './config/wagmi'
import { addSomniaNetwork } from './utils/network'
import PromptInput from './components/PromptInput'
import ArenaView from './components/ArenaView'
import './App.css'

const queryClient = new QueryClient()

function ConnectButton() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [networkError, setNetworkError] = useState(null)

  const isCorrectNetwork = chainId === somniaTestnet.id

  useEffect(() => {
    if (isConnected && !isCorrectNetwork) {
      setNetworkError(`Wrong network! Please switch to Somnia Testnet (Chain ID: ${somniaTestnet.id})`)
    } else {
      setNetworkError(null)
    }
  }, [isConnected, isCorrectNetwork])

  const handleAddNetwork = async () => {
    try {
      await addSomniaNetwork()
      setNetworkError(null)
    } catch (error) {
      setNetworkError(error.message)
    }
  }

  const handleSwitchNetwork = async () => {
    try {
      await switchChain({ chainId: somniaTestnet.id })
      setNetworkError(null)
    } catch (error) {
      // If chain doesn't exist, prompt to add it
      if (error.message?.includes('Unrecognized chain') || error.code === 4902) {
        await handleAddNetwork()
      } else {
        setNetworkError(error.message)
      }
    }
  }

  if (isConnected) {
    return (
      <div className="wallet-section">
        <div className="wallet-info">
          <span className="address">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
          <button onClick={() => disconnect()} className="btn-secondary">
            Disconnect
          </button>
        </div>
        
        {!isCorrectNetwork && (
          <div className="network-warning">
            <p>⚠️ {networkError}</p>
            <button onClick={handleSwitchNetwork} className="btn-primary">
              Switch to Somnia Testnet
            </button>
            <button onClick={handleAddNetwork} className="btn-secondary">
              Add Network to MetaMask
            </button>
          </div>
        )}
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
  const chainId = useChainId()
  const [baseDNA, setBaseDNA] = useState(null)
  const [swarmId, setSwarmId] = useState(null)

  const isCorrectNetwork = chainId === somniaTestnet.id

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
        ) : !isCorrectNetwork ? (
          <div className="welcome">
            <h2>⚠️ Wrong Network</h2>
            <p>Please switch to Somnia Testnet to continue</p>
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
