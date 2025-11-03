import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent, usePublicClient } from 'wagmi'
import { CONTRACTS } from '../config/wagmi'
import AgentFactoryJSON from '../abis/AgentFactory.json'
import ArenaJSON from '../abis/Arena.json'
import './ArenaView.css'

// Extract ABI arrays from contract artifacts
const AgentFactoryABI = AgentFactoryJSON.abi
const ArenaABI = ArenaJSON.abi

const DISASTER_NAMES = ['DROUGHT', 'FLOOD', 'WILDFIRE', 'POLLUTION', 'OVERPOPULATION']
const ACTION_NAMES = ['CLEAN', 'BUILD', 'MIGRATE', 'STOCKPILE']

export default function ArenaView({ baseDNA, swarmId, onSwarmCreated, onReset }) {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const [agents, setAgents] = useState([])
  const [currentRound, setCurrentRound] = useState(null)
  const [roundHistory, setRoundHistory] = useState([])
  const [phase, setPhase] = useState('mint') // mint, ready, running, complete
  const [estimatedGas, setEstimatedGas] = useState(null)

  // Mint swarm contract interaction
  const { data: mintHash, writeContract: mintSwarm } = useWriteContract()
  const { isSuccess: mintSuccess } = useWaitForTransactionReceipt({ hash: mintHash })

  // Start round contract interaction
  const { data: startHash, writeContract: startRound } = useWriteContract()
  const { isSuccess: startSuccess } = useWaitForTransactionReceipt({ hash: startHash })

  // Listen for RoundStarted event
  useWatchContractEvent({
    address: CONTRACTS.Arena,
    abi: ArenaABI,
    eventName: 'RoundStarted',
    onLogs(logs) {
      const log = logs[0]
      if (swarmId && Number(log.args.swarmId) === swarmId) {
        setCurrentRound({
          id: Number(log.args.roundId),
          disaster: Number(log.args.disaster),
          resolved: false,
        })
        setPhase('running')
      }
    },
  })

  // Listen for RoundResolved event
  useWatchContractEvent({
    address: CONTRACTS.Arena,
    abi: ArenaABI,
    eventName: 'RoundResolved',
    onLogs(logs) {
      const log = logs[0]
      const roundId = Number(log.args.roundId)
      const survivors = log.args.survivors.map(id => Number(id))
      const childId = log.args.childId ? Number(log.args.childId) : null

      // Update agent alive status
      setAgents(prev => {
        const updated = prev.map(agent => ({
          ...agent,
          alive: survivors.includes(agent.id),
        }))
        if (childId && !updated.find(a => a.id === childId)) {
          updated.push({ id: childId, alive: true, isChild: true })
        }
        return updated
      })

      // Add to history
      setRoundHistory(prev => [...prev, {
        id: roundId,
        disaster: currentRound?.disaster,
        survivors,
        childId,
      }])

      setCurrentRound(null)
      
      // Check if game over (< 2 survivors)
      if (survivors.length < 2) {
        setPhase('complete')
      } else {
        setPhase('ready')
      }
    },
  })

  // Listen for AgentDied event
  useWatchContractEvent({
    address: CONTRACTS.Arena,
    abi: ArenaABI,
    eventName: 'AgentDied',
    onLogs(logs) {
      logs.forEach(log => {
        const agentId = Number(log.args.agentId)
        setAgents(prev => prev.map(agent => 
          agent.id === agentId ? { ...agent, alive: false } : agent
        ))
      })
    },
  })

  const handleMintSwarm = async () => {
    try {
      console.log('🎯 Minting swarm...')
      console.log('Address:', address)
      console.log('BaseDNA:', baseDNA)
      console.log('Contract:', CONTRACTS.Arena)
      
      // Try to estimate gas first
      try {
        const gas = await publicClient.estimateContractGas({
          address: CONTRACTS.Arena,
          abi: ArenaABI,
          functionName: 'mintSwarm',
          args: [address, baseDNA],
          account: address,
        })
        const gasWithBuffer = (gas * 120n) / 100n // Add 20% buffer
        console.log('Estimated gas:', gas.toString())
        console.log('Gas with buffer:', gasWithBuffer.toString())
        setEstimatedGas(gasWithBuffer)
        
        // Use the estimated gas
        mintSwarm({
          address: CONTRACTS.Arena,
          abi: ArenaABI,
          functionName: 'mintSwarm',
          args: [address, baseDNA],
          gas: gasWithBuffer,
        })
      } catch (estimateError) {
        console.error('Gas estimation failed:', estimateError)
        // Fallback to manual gas limit
        console.log('Using fallback gas limit: 2000000')
        mintSwarm({
          address: CONTRACTS.Arena,
          abi: ArenaABI,
          functionName: 'mintSwarm',
          args: [address, baseDNA],
          gas: 2000000n,
        })
      }
    } catch (error) {
      console.error('❌ Mint failed:', error)
      alert('Transaction failed: ' + (error.shortMessage || error.message || 'Unknown error'))
    }
  }

  const handleStartRound = async () => {
    if (!swarmId) return
    try {
      console.log('🎲 Starting round for swarm:', swarmId)
      
      // Estimate gas
      try {
        const gas = await publicClient.estimateContractGas({
          address: CONTRACTS.Arena,
          abi: ArenaABI,
          functionName: 'startRound',
          args: [swarmId],
          account: address,
        })
        const gasWithBuffer = (gas * 120n) / 100n
        console.log('Estimated gas:', gas.toString())
        
        startRound({
          address: CONTRACTS.Arena,
          abi: ArenaABI,
          functionName: 'startRound',
          args: [swarmId],
          gas: gasWithBuffer,
        })
      } catch (estimateError) {
        console.error('Gas estimation failed:', estimateError)
        startRound({
          address: CONTRACTS.Arena,
          abi: ArenaABI,
          functionName: 'startRound',
          args: [swarmId],
          gas: 500000n,
        })
      }
    } catch (error) {
      console.error('❌ Start round failed:', error)
      alert('Transaction failed: ' + (error.shortMessage || error.message || 'Unknown error'))
    }
  }

  useEffect(() => {
    if (mintSuccess && mintHash) {
      console.log('✅ Swarm minted successfully! Hash:', mintHash)
      // Wait a bit for the transaction to be indexed, then fetch swarm data
      setTimeout(fetchLatestSwarm, 2000) // 2 second delay
    }
  }, [mintSuccess, mintHash])

  const fetchLatestSwarm = async () => {
    try {
      console.log('📡 Fetching latest swarm from contract...')
      
      // Read current swarmCounter from Factory
      const currentCounter = await publicClient.readContract({
        address: CONTRACTS.AgentFactory,
        abi: AgentFactoryABI,
        functionName: 'swarmCounter',
        args: [],
      })
      
      // Latest minted swarm is (counter - 1) since counter increments AFTER minting
      const latestSwarmId = Number(currentCounter) - 1
      console.log('📊 Current swarm counter:', currentCounter.toString())
      console.log('🎯 Latest swarm ID:', latestSwarmId)
      
      if (latestSwarmId < 1) {
        console.error('❌ No swarms found yet')
        alert('No swarms found. Please try minting again.')
        return
      }
      
      // Fetch agent IDs for this swarm using getSwarmAgents
      const agentIds = await publicClient.readContract({
        address: CONTRACTS.AgentFactory,
        abi: AgentFactoryABI,
        functionName: 'getSwarmAgents',
        args: [BigInt(latestSwarmId)],
      })
      
      console.log('🤖 Agent IDs:', agentIds.map(id => Number(id)))
      
      if (agentIds.length === 0) {
        console.error('❌ No agents found in swarm')
        alert('No agents found. Please try again.')
        return
      }
      
      // Update state with agents and swarm ID
      setAgents(agentIds.map(id => ({ id: Number(id), alive: true })))
      onSwarmCreated(latestSwarmId)
      setPhase('ready')
      
      console.log('✅ Swarm loaded successfully!')
    } catch (error) {
      console.error('❌ Error fetching swarm:', error)
      alert('Could not load swarm data: ' + (error.shortMessage || error.message))
    }
  }

  useEffect(() => {
    if (startSuccess) {
      console.log('✅ Round started! Hash:', startHash)
    }
  }, [startSuccess, startHash])

  const aliveCount = agents.filter(a => a.alive).length

  return (
    <div className="arena-view">
      <div className="arena-header">
        <h2>🎮 Arena</h2>
        <button onClick={onReset} className="btn-secondary">
          🔄 New Game
        </button>
      </div>

      {/* Phase: Minting */}
      {phase === 'mint' && (
        <div className="phase-section">
          <h3>Ready to mint your swarm?</h3>
          <p>This will create 5 AI agents with variations of your DNA on Somnia Testnet.</p>
          <button onClick={handleMintSwarm} className="btn-primary btn-large">
            🪙 Mint Swarm (Free!)
          </button>
          {mintHash && <p className="tx-hash">TX: {mintHash}</p>}
        </div>
      )}

      {/* Phase: Ready/Running/Complete */}
      {phase !== 'mint' && (
        <>
          <div className="agents-display">
            <h3>
              Your Agents ({aliveCount} alive)
              {swarmId && <span className="swarm-id">Swarm #{swarmId}</span>}
            </h3>
            <div className="agents-grid">
              {agents.map(agent => (
                <div 
                  key={agent.id} 
                  className={`agent-card ${agent.alive ? 'alive' : 'dead'} ${agent.isChild ? 'child' : ''}`}
                >
                  <div className="agent-icon">
                    {agent.alive ? '🤖' : '💀'}
                  </div>
                  <div className="agent-id">#{agent.id}</div>
                  {agent.isChild && <div className="child-badge">👶 Child</div>}
                </div>
              ))}
            </div>
          </div>

          {currentRound && (
            <div className="current-round">
              <h3>⚡ Round {currentRound.id} in Progress</h3>
              <div className="disaster-display">
                <span className="disaster-icon">🌪️</span>
                <span className="disaster-name">
                  {DISASTER_NAMES[currentRound.disaster] || 'Unknown'}
                </span>
              </div>
              <p className="waiting-message">
                Waiting for engine to resolve round...
              </p>
            </div>
          )}

          {phase === 'ready' && (
            <div className="action-section">
              <button 
                onClick={handleStartRound} 
                className="btn-primary btn-large"
                disabled={aliveCount < 2}
              >
                🎲 Start Round
              </button>
              {aliveCount < 2 && (
                <p className="warning">Need at least 2 agents to continue</p>
              )}
              {startHash && <p className="tx-hash">TX: {startHash}</p>}
            </div>
          )}

          {phase === 'complete' && (
            <div className="game-over">
              <h2>🏁 Game Over!</h2>
              <p>Less than 2 agents survived. The evolution ends here.</p>
              <button onClick={onReset} className="btn-primary">
                🔄 Start New Game
              </button>
            </div>
          )}

          {roundHistory.length > 0 && (
            <div className="round-history">
              <h3>📜 Round History</h3>
              <div className="history-list">
                {roundHistory.map(round => (
                  <div key={round.id} className="history-item">
                    <div className="history-header">
                      <span className="round-number">Round {round.id}</span>
                      <span className="disaster-badge">
                        {DISASTER_NAMES[round.disaster]}
                      </span>
                    </div>
                    <div className="history-body">
                      <p>Survivors: {round.survivors.join(', ')}</p>
                      {round.childId && <p>🎉 Child Born: #{round.childId}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
