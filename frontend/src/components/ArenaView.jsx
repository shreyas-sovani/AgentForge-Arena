import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent, usePublicClient } from 'wagmi'
import { CONTRACTS } from '../config/wagmi'
import { api } from '../utils/api'
import AgentFactoryJSON from '../abis/AgentFactory.json'
import ArenaJSON from '../abis/Arena.json'
import LoadingOverlay from './LoadingOverlay'
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
  const [phase, setPhase] = useState('mint') // mint, minting, ready, running, complete
  const [estimatedGas, setEstimatedGas] = useState(null)
  const [currentNarrative, setCurrentNarrative] = useState(null) // AI narrative
  const [currentDisaster, setCurrentDisaster] = useState(null) // Current disaster
  const [agentNames, setAgentNames] = useState({}) // Map of agentId -> name
  const [isMinting, setIsMinting] = useState(false) // Loading state for minting
  const [isResolving, setIsResolving] = useState(false) // Loading state for AI resolution
  const [rewardClaimed, setRewardClaimed] = useState(false) // Track if reward has been claimed
  const MAX_ROUNDS = 3 // Game lasts 3 rounds
  const WIN_THRESHOLD = 7 // Need 7+ agents alive to win

  // Mint swarm contract interaction
  const { data: mintHash, writeContract: mintSwarm } = useWriteContract()
  const { isSuccess: mintSuccess } = useWaitForTransactionReceipt({ hash: mintHash })

  // Start round contract interaction
  const { data: startHash, writeContract: startRound, isPending: isStartPending } = useWriteContract()
  const { isSuccess: startSuccess } = useWaitForTransactionReceipt({ hash: startHash })

  // Resolve round contract interaction
  const { data: resolveHash, writeContract: resolveRound, isPending: isResolvePending, error: resolveError } = useWriteContract()
  const { isSuccess: resolveSuccess } = useWaitForTransactionReceipt({ hash: resolveHash })

  // Claim reward contract interaction
  const { data: claimHash, writeContract: claimReward, isPending: isClaimPending, error: claimError } = useWriteContract()
  const { isSuccess: claimSuccess } = useWaitForTransactionReceipt({ hash: claimHash })

  // Log claim errors
  useEffect(() => {
    if (claimError) {
      console.error('❌ Claim reward error:', claimError)
      setCurrentNarrative(`❌ Failed to claim reward: ${claimError.message || 'Unknown error'}`)
    }
  }, [claimError])

  // Log resolve errors
  useEffect(() => {
    if (resolveError) {
      console.error('❌ Resolve round error:', resolveError)
      setCurrentNarrative(`❌ Failed to resolve round: ${resolveError.message || resolveError.shortMessage || 'Unknown error'}`)
      setIsResolving(false)
      setPhase('ready')
    }
  }, [resolveError])

  // Handle successful round resolution
  useEffect(() => {
    if (resolveSuccess && resolveHash) {
      console.log('✅ Round resolved successfully! Hash:', resolveHash)
      setCurrentNarrative('⏳ Waiting for results from blockchain...')
      
      // Fetch decision and update state after a delay (in case event doesn't fire)
      setTimeout(async () => {
        try {
          const decision = await api.getLatestDecision()
          console.log('📊 Latest decision:', decision)
          
          setCurrentNarrative(
            `🤖 The AI chose: ${decision.action}\n\n` +
            `💭 "${decision.reasoning}"\n\n` +
            `Round resolved! Check the transaction for details.`
          )
          setIsResolving(false)
          setPhase('ready')
        } catch (err) {
          console.error('Error fetching decision:', err)
          setCurrentNarrative('✅ Round resolved! Transaction confirmed.')
          setIsResolving(false)
          setPhase('ready')
        }
      }, 3000) // Wait 3 seconds for event to potentially fire first
    }
  }, [resolveSuccess, resolveHash])

  // Watch for RoundStarted event - set phase to 'running'
  useWatchContractEvent({
    address: CONTRACTS.Arena,
    abi: ArenaABI,
    eventName: 'RoundStarted',
    pollingInterval: 1_000, // Poll every 1 second
    onLogs(logs) {
      logs.forEach(log => {
        console.log('🎲 Round started:', log.args)
        const roundId = Number(log.args.roundId)
        const disaster = ['FIRE', 'DROUGHT', 'POLLUTION', 'FLOOD', 'STORM'][log.args.disaster]
        
        // Store current round info
        setCurrentRound({ id: roundId, disaster: log.args.disaster })
        setPhase('running')
        setCurrentDisaster(disaster)
        setCurrentNarrative(`⚠️ A ${disaster} disaster has struck! The AI is analyzing agent DNA to make a survival decision...`)
        console.log(`💨 Current Disaster: ${disaster}`)
      })
    }
  })

  // Listen for RoundResolved event
  useWatchContractEvent({
    address: CONTRACTS.Arena,
    abi: ArenaABI,
    eventName: 'RoundResolved',
    pollingInterval: 1_000, // Poll every 1 second
    async onLogs(logs) {
      console.log('🎯 RoundResolved event detected!', logs)
      setIsResolving(false) // Reset loading state
      setPhase('ready') // Allow starting next round
      
      const log = logs[0]
      const roundId = Number(log.args.roundId)
      const survivors = log.args.survivors.map(id => Number(id))
      const childId = log.args.childId ? Number(log.args.childId) : null
      console.log(`📊 Round ${roundId}: ${survivors.length} survivors, child: ${childId}`)

      // Fetch AI decision narrative
      try {
        const decision = await api.getLatestDecision()
        
        if (decision.roundId === roundId) {
          const childName = childId ? agentNames[childId] || 'Unknown' : null
          setCurrentNarrative(
            `🤖 The AI chose: ${decision.action}\n\n` +
            `💭 "${decision.reasoning}"\n\n` +
            `Result: ${survivors.length} agents survived!` +
            (childId && childName ? ` A new agent named ${childName} was born! 🎂` : '')
          )
        }
      } catch (err) {
        console.log('Could not fetch AI decision:', err)
      }

      // If a child was born, generate a name for them
      if (childId && !agentNames[childId]) {
        try {
          const { names } = await api.generateNames(1, 'newborn warrior')
          setAgentNames(prev => ({ ...prev, [childId]: names[0] }))
          console.log(`👶 New agent #${childId} named: ${names[0]}`)
        } catch (err) {
          console.log('Could not generate name for child:', err)
          setAgentNames(prev => ({ ...prev, [childId]: `Agent ${childId}` }))
        }
      }

      // Update agent alive status and collect names for narrative
      const deadAgentIds = []
      let updatedAgents
      
      setAgents(prev => {
        updatedAgents = prev.map(agent => {
          const nowAlive = survivors.includes(agent.id)
          if (agent.alive && !nowAlive) {
            deadAgentIds.push(agent.id)
          }
          return {
            ...agent,
            alive: nowAlive,
          }
        })
        if (childId && !updatedAgents.find(a => a.id === childId)) {
          updatedAgents.push({ id: childId, alive: true, isChild: true })
        }
        return updatedAgents
      })

      // Generate enhanced narrative with agent names
      try {
        const allAgentNames = Object.keys(agentNames).map(id => agentNames[id])
        const survivorNames = survivors.map(id => agentNames[id] || `Agent ${id}`)
        const deathNames = deadAgentIds.map(id => agentNames[id] || `Agent ${id}`)
        const childName = childId ? (agentNames[childId] || 'Unnamed') : null

        const decision = await api.getLatestDecision()

        if (decision.roundId === roundId) {
          const narrativeData = await api.generateNarrative(
            decision.disaster,
            decision.action,
            allAgentNames,
            survivorNames,
            deathNames,
            childName
          )
          
          setCurrentNarrative(narrativeData.narrative)
          console.log('📖 Narrative generated:', narrativeData.narrative.substring(0, 100) + '...')
        }
      } catch (err) {
        console.log('Could not generate narrative:', err)
        // Fallback to basic narrative
        try {
          const decision = await api.getLatestDecision()
          if (decision.roundId === roundId) {
            const childName = childId ? agentNames[childId] || 'Unknown' : null
            setCurrentNarrative(
              `🤖 The AI chose: ${decision.action}\n\n` +
              `💭 "${decision.reasoning}"\n\n` +
              `Result: ${survivors.length} agents survived!` +
              (childId && childName ? ` A new agent named ${childName} was born! 🎂` : '')
            )
          }
        } catch (fallbackErr) {
          console.error('Could not fetch fallback decision:', fallbackErr)
        }
      }

      // Add to history
      const newHistory = [...roundHistory, {
        id: roundId,
        disaster: currentRound?.disaster,
        survivors,
        childId,
      }]
      setRoundHistory(newHistory)

      setCurrentRound(null)
      
      // Check game end conditions
      // NOTE: Use newHistory.length (player's round count), NOT roundId (blockchain's global round counter)
      const playerRoundCount = newHistory.length
      console.log(`🎮 Game state check: Round ${playerRoundCount}/${MAX_ROUNDS}, Survivors: ${survivors.length}/${WIN_THRESHOLD}`)
      
      if (playerRoundCount >= MAX_ROUNDS) {
        // End of round 3 - check win/lose
        if (survivors.length >= WIN_THRESHOLD) {
          console.log('🏆 VICTORY! Setting phase to won')
          setPhase('won') // Player WON!
        } else {
          console.log('💔 DEFEAT! Not enough agents. Setting phase to lost')
          setPhase('lost') // Player LOST - didn't reach 7+ agents
        }
      } else if (survivors.length < 2) {
        // Can't continue breeding - early game over
        console.log('💀 GAME OVER! Less than 2 agents. Setting phase to lost')
        setPhase('lost')
      } else {
        // Continue to next round
        console.log('✅ Round complete! Setting phase to ready')
        setPhase('ready')
      }
    },
  })

  // Listen for AgentDied event
  useWatchContractEvent({
    address: CONTRACTS.Arena,
    abi: ArenaABI,
    eventName: 'AgentDied',
    pollingInterval: 1_000, // Poll every 1 second
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
      
      setIsMinting(true) // Start loading
      setPhase('minting')
      
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

  const handleResolveRound = async () => {
    if (!currentRound || isResolving) {
      console.error('❌ No active round to resolve or already resolving')
      return
    }

    try {
      setIsResolving(true) // Prevent double clicks
      console.log('🤖 Resolving round with AI...')
      setCurrentNarrative('🤖 AI is making a strategic decision...')
      
      const roundId = currentRound.id
      const aliveAgentIds = agents.filter(a => a.alive).map(a => a.id)
      
      if (aliveAgentIds.length === 0) {
        throw new Error('No alive agents to resolve')
      }

      console.log('Round ID:', roundId)
      console.log('Alive agents:', aliveAgentIds)
      
      // Call API to get AI decision + signature
      const resolution = await api.resolveRound(
        roundId,
        aliveAgentIds,
        CONTRACTS.Arena,
        CONTRACTS.AgentFactory
      )
      
      console.log('✅ AI decision received:', resolution.action)
      console.log('💭 Reasoning:', resolution.reasoning)
      console.log('📊 Resolution data:', {
        roundId,
        actionIndex: resolution.actionIndex,
        agentScoresCount: resolution.agentScores.length,
        signatureLength: resolution.signature.length,
      })
      
      // Submit resolveRound transaction
      console.log('📝 Submitting resolution to blockchain...')
      setCurrentNarrative(`🤖 The AI decided: ${resolution.action}\n💭 "${resolution.reasoning}"\n\n� Please approve the transaction in your wallet...`)
      
      resolveRound({
        address: CONTRACTS.Arena,
        abi: ArenaABI,
        functionName: 'resolveRound',
        args: [roundId, resolution.actionIndex, resolution.agentScores, resolution.signature],
        gas: 6000000n, // Increased to 6M (estimation showed ~4.3M needed)
      })
    } catch (error) {
      console.error('❌ Resolve round failed:', error)
      setCurrentNarrative(`❌ Failed to resolve round: ${error.message || 'Unknown error'}`)
      setIsResolving(false)
      setPhase('ready') // Go back to ready so user can try again
    }
  }

  useEffect(() => {
    if (mintSuccess && mintHash) {
      console.log('✅ Swarm minted successfully! Hash:', mintHash)
      // Wait a bit for the transaction to be indexed, then fetch swarm data
      setTimeout(fetchLatestSwarm, 2000) // 2 second delay
    }
  }, [mintSuccess, mintHash])

  // Handle successful round start
  useEffect(() => {
    if (startSuccess && startHash) {
      console.log('✅ Round started! Hash:', startHash)
      // Wait for event to be processed, then check phase
      setTimeout(() => {
        if (currentDisaster) {
          console.log('✅ Disaster detected, setting phase to running')
          setPhase('running')
        }
      }, 1000)
    }
  }, [startSuccess, startHash, currentDisaster])

  // Handle successful reward claim
  useEffect(() => {
    if (claimSuccess && claimHash) {
      console.log('🎁 Reward claimed successfully! Hash:', claimHash)
      setRewardClaimed(true)
      setCurrentNarrative(`🎉 Congratulations! You've received 0.5 STT and a Green Champion Badge NFT! Transaction: ${claimHash}`)
    }
  }, [claimSuccess, claimHash])

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

      // Generate AI names for agents
      console.log('🎨 Generating AI names for agents...')
      try {
        const { names } = await api.generateNames(agentIds.length, 'sci-fi warriors')
        
        // Create name mapping
        const nameMap = {}
        agentIds.forEach((id, index) => {
          nameMap[Number(id)] = names[index] || `Agent-${index + 1}`
        })
        setAgentNames(nameMap)
        console.log('✅ Agent names generated:', nameMap)
      } catch (error) {
        console.error('⚠️  Could not generate names, using defaults:', error)
      }
      
      // Update state with agents and swarm ID
      setAgents(agentIds.map(id => ({ id: Number(id), alive: true })))
      onSwarmCreated(latestSwarmId)
      setPhase('ready')
      setIsMinting(false) // End loading
      setRoundHistory([]) // Reset round history for new game
      
      console.log('✅ Swarm loaded successfully!')
    } catch (error) {
      console.error('❌ Error fetching swarm:', error)
      setIsMinting(false) // End loading on error
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

      {/* Phase: Minting (Loading) */}
      {phase === 'minting' && isMinting && (
        <LoadingOverlay 
          message="Forging your AI agents..."
          subtitle="Generating unique DNA variations and minting to blockchain"
        />
      )}

      {/* Phase: Ready/Running/Complete */}
      {phase !== 'mint' && phase !== 'minting' && (
        <>
          {/* Game Stats Banner */}
          <div className="game-stats">
            <div className="stat">
              <span className="label">🎯 Mission:</span>
              <span className="value">Survive 3 Rounds with 7+ Agents!</span>
            </div>
            <div className="stat">
              <span className="label">📊 Current Round:</span>
              <span className="value">{roundHistory.length}/{MAX_ROUNDS}</span>
            </div>
            <div className="stat">
              <span className="label">🏆 Win Condition:</span>
              <span className="value">{aliveCount >= WIN_THRESHOLD ? `✅ ${aliveCount}/${WIN_THRESHOLD} agents` : `⚠️ ${aliveCount}/${WIN_THRESHOLD} agents`}</span>
            </div>
            <div className="stat">
              <span className="label">💀 Status:</span>
              <span className="value">{aliveCount < 2 ? '❌ GAME OVER' : aliveCount >= WIN_THRESHOLD ? '🎉 WINNING!' : `${aliveCount} alive`}</span>
            </div>
          </div>

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
                  <div className="agent-name">
                    {agentNames[agent.id] || `Agent ${agent.id}`}
                  </div>
                  <div className="agent-id-small">#{agent.id}</div>
                  {agent.isChild && <div className="child-badge">👶 New</div>}
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

          {/* AI Narrative Display - Shows after round is resolved */}
          {currentNarrative && phase === 'ready' && roundHistory.length > 0 && (
            <div className="narrative-box">
              <h3>📖 Last Round Story</h3>
              <p className="narrative-text">{currentNarrative}</p>
            </div>
          )}

          {phase === 'ready' && (
            <div className="action-section">
              <button 
                onClick={handleStartRound} 
                className="btn-primary btn-large"
                disabled={aliveCount < 2 || isStartPending || phase === 'running' || roundHistory.length >= MAX_ROUNDS}
              >
                {isStartPending ? '⏳ Starting...' : roundHistory.length >= MAX_ROUNDS ? '� Game Complete!' : `�🎲 Start Round ${roundHistory.length + 1}/${MAX_ROUNDS}`}
              </button>
              {aliveCount < 2 && (
                <p className="warning">Need at least 2 agents to continue</p>
              )}
              {roundHistory.length >= MAX_ROUNDS && (
                <p className="info">All 3 rounds completed! Check results below.</p>
              )}
              {startHash && <p className="tx-hash">TX: {startHash}</p>}
            </div>
          )}

          {/* Full-Screen Loading Overlay - replaced with Resolve Button */}
          {phase === 'running' && (
            <div className="phase-section">
              <div className="disaster-alert">
                <h3>⚠️ {currentDisaster} DISASTER!</h3>
                <p>{currentNarrative || 'Your agents are in danger...'}</p>
              </div>
              <button 
                onClick={handleResolveRound}
                disabled={isResolving || isResolvePending}
                className="btn-primary btn-large"
              >
                {isResolving ? '🤖 AI Thinking...' : isResolvePending ? '⏳ Submitting...' : '🤖 Let AI Resolve'}
              </button>
              {resolveHash && <p className="tx-hash">TX: {resolveHash}</p>}
            </div>
          )}

          {phase === 'won' && (
            <div className="game-victory">
              <h2>🎉 VICTORY!</h2>
              <h3>Your swarm survived 3 rounds with {aliveCount} agents!</h3>
              <p className="victory-message">
                Through strategic evolution and AI-driven decisions, your agents proved 
                they have what it takes to survive in the harshest conditions. You achieved 
                the goal of maintaining {WIN_THRESHOLD}+ agents through all 3 rounds!
              </p>
              <div className="victory-stats">
                <div className="stat-item">
                  <span className="stat-label">Rounds Completed:</span>
                  <span className="stat-value">{MAX_ROUNDS}/{MAX_ROUNDS} ✅</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Final Agent Count:</span>
                  <span className="stat-value">{aliveCount}/{agents.length} 🎯</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Success Rate:</span>
                  <span className="stat-value">{Math.round((aliveCount/agents.length)*100)}% 🏆</span>
                </div>
              </div>

              {/* Claim Reward Button */}
              {!rewardClaimed ? (
                <div className="reward-section">
                  <p className="reward-info">🎁 <strong>Congratulations!</strong> You've earned:</p>
                  <ul className="reward-list">
                    <li>💰 <strong>0.5 STT</strong> tokens</li>
                    <li>🏅 <strong>Green Champion Badge</strong> NFT</li>
                  </ul>
                  <button 
                    onClick={() => {
                      console.log('🎁 Claiming reward for swarm:', swarmId)
                      console.log('Arena address:', CONTRACTS.Arena)
                      console.log('User address:', address)
                      claimReward({
                        address: CONTRACTS.Arena,
                        abi: ArenaABI,
                        functionName: 'claimReward',
                        args: [swarmId]
                      })
                    }}
                    disabled={isClaimPending}
                    className="btn-primary btn-large reward-button"
                  >
                    {isClaimPending ? '⏳ Claiming...' : '🎁 Claim Your Reward!'}
                  </button>
                </div>
              ) : (
                <div className="reward-claimed">
                  <p>✅ <strong>Reward Claimed!</strong></p>
                  <p className="reward-claimed-details">
                    You've received 0.5 STT and your Green Champion Badge NFT!
                  </p>
                </div>
              )}

              <button onClick={onReset} className="btn-primary btn-large">
                🔄 Play Again
              </button>
            </div>
          )}

          {phase === 'lost' && (
            <div className="game-defeat">
              <h2>💔 Mission Failed</h2>
              <h3>Your swarm couldn't survive...</h3>
              <p className="defeat-message">
                {aliveCount < 2 
                  ? `With less than 2 agents remaining, breeding became impossible. The swarm died out after ${roundHistory.length} round(s).`
                  : `You reached the end of round 3, but only ${aliveCount} agents survived. You needed ${WIN_THRESHOLD}+ agents to win.`
                }
              </p>
              <div className="defeat-stats">
                <div className="stat-item">
                  <span className="stat-label">Rounds Survived:</span>
                  <span className="stat-value">{roundHistory.length}/{MAX_ROUNDS}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Final Agent Count:</span>
                  <span className="stat-value">{aliveCount} (needed {WIN_THRESHOLD}+)</span>
                </div>
              </div>
              <p className="retry-message">💡 Try again with different agent DNA!</p>
              <button onClick={onReset} className="btn-primary btn-large">
                🔄 Try Again
              </button>
            </div>
          )}

          {phase === 'complete' && (
            <div className="game-over">
              <h2>🏁 Game Over!</h2>
              <p>Less than 2 agents survived. The evolution ends here.</p>
              <p className="win-condition">🎯 Goal: Survive as many rounds as possible through natural selection!</p>
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
