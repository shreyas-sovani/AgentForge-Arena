import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent } from 'wagmi'
import { CONTRACTS } from '../config/wagmi'
import AgentFactoryABI from '../abis/AgentFactory.json'
import ArenaABI from '../abis/Arena.json'
import './ArenaView.css'

const DISASTER_NAMES = ['DROUGHT', 'FLOOD', 'WILDFIRE', 'POLLUTION', 'OVERPOPULATION']
const ACTION_NAMES = ['CLEAN', 'BUILD', 'MIGRATE', 'STOCKPILE']

export default function ArenaView({ baseDNA, swarmId, onSwarmCreated, onReset }) {
  const { address } = useAccount()
  const [agents, setAgents] = useState([])
  const [currentRound, setCurrentRound] = useState(null)
  const [roundHistory, setRoundHistory] = useState([])
  const [phase, setPhase] = useState('mint') // mint, ready, running, complete

  // Mint swarm contract interaction
  const { data: mintHash, writeContract: mintSwarm } = useWriteContract()
  const { isSuccess: mintSuccess } = useWaitForTransactionReceipt({ hash: mintHash })

  // Start round contract interaction
  const { data: startHash, writeContract: startRound } = useWriteContract()
  const { isSuccess: startSuccess } = useWaitForTransactionReceipt({ hash: startHash })

  // Listen for SwarmCreated event
  useWatchContractEvent({
    address: CONTRACTS.AgentFactory,
    abi: AgentFactoryABI,
    eventName: 'SwarmCreated',
    onLogs(logs) {
      const log = logs[0]
      if (log.args.owner?.toLowerCase() === address?.toLowerCase()) {
        const agentIds = log.args.agentIds.map(id => Number(id))
        setAgents(agentIds.map(id => ({ id, alive: true })))
        onSwarmCreated(Number(log.args.swarmId))
        setPhase('ready')
      }
    },
  })

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

  const handleMintSwarm = () => {
    mintSwarm({
      address: CONTRACTS.AgentFactory,
      abi: AgentFactoryABI,
      functionName: 'mintSwarm',
      args: [address, baseDNA],
    })
  }

  const handleStartRound = () => {
    if (!swarmId) return
    startRound({
      address: CONTRACTS.Arena,
      abi: ArenaABI,
      functionName: 'startRound',
      args: [swarmId],
    })
  }

  useEffect(() => {
    if (mintSuccess) {
      console.log('✅ Swarm minted successfully!')
    }
  }, [mintSuccess])

  useEffect(() => {
    if (startSuccess) {
      console.log('✅ Round started!')
    }
  }, [startSuccess])

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
