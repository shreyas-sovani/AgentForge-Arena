import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
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
      {/* Video Background */}
      <video className="video-background" autoPlay loop muted playsInline>
        <source src="/media/bg vid.mp4" type="video/mp4" />
      </video>

      <header className="header">
        <div className="header-logo">
          <img src="/media/logo.png" alt="AgentForge Arena" className="logo-image" />
          <div>
            <h1>AgentForge Arena</h1>
            <p className="subtitle">AI Evolution Battle Royale</p>
          </div>
        </div>
        <ConnectButton />
      </header>

      <main className="main">
        {!isConnected ? (
          <div className="welcome">
            <motion.div 
              className="hero-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2>🧬 Forge Your Legacy</h2>
              <p className="tagline">Where AI intelligence meets evolutionary survival</p>
              
              <div className="game-story">
                <motion.div 
                  className="story-card"
                  whileHover={{ scale: 1.05, y: -10 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="story-icon">🎨</div>
                  <h3>Design Your Agents</h3>
                  <p>Create unique AI personalities with custom DNA traits. Every agent has distinct survival abilities shaped by your imagination.</p>
                </motion.div>
                
                <motion.div 
                  className="story-card"
                  whileHover={{ scale: 1.05, y: -10 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="story-icon">⚔️</div>
                  <h3>Battle & Evolve</h3>
                  <p>Watch AI make life-or-death decisions as your agents face disasters. Survivors breed stronger offspring through genetic evolution.</p>
                </motion.div>
                
                <motion.div 
                  className="story-card"
                  whileHover={{ scale: 1.05, y: -10 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="story-icon">🏆</div>
                  <h3>Claim Victory</h3>
                  <p>Keep 7+ agents alive through 3 rounds of chaos. Win rewards and prove your bloodline's dominance!</p>
                </motion.div>
              </div>

              <div className="mission-brief">
                <h4>🎯 Your Mission</h4>
                <ul>
                  <li>✨ <strong>3 Rounds</strong> of intense survival challenges</li>
                  <li>🔥 <strong>AI-Powered</strong> autonomous decision making</li>
                  <li>🧬 <strong>Genetic Evolution</strong> through breeding & mutation</li>
                  <li>🎁 <strong>Victory Rewards</strong> for keeping 7+ agents alive</li>
                </ul>
              </div>

              {/* Stats Section */}
              <div className="stats-section">
                <h3>🌍 Arena Statistics</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-icon">🤖</div>
                    <div className="stat-value">1,234</div>
                    <div className="stat-label">Total Agents</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon">👥</div>
                    <div className="stat-value">456</div>
                    <div className="stat-label">Players</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon">⚔️</div>
                    <div className="stat-value">789</div>
                    <div className="stat-label">Battles</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon">🏆</div>
                    <div className="stat-value">123</div>
                    <div className="stat-label">Champions</div>
                  </div>
                </div>
              </div>
            </motion.div>
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
        <p>⚔️ Built for Somnia AI Hackathon 2025 • Gaming Agents Track • Powered by AI & Blockchain</p>
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
