/**
 * Vercel Serverless Function: Resolve Round
 * Endpoint: /api/resolve-round
 * 
 * This generates the complete signed payload for resolving a round:
 * 1. Fetches agent DNA from blockchain
 * 2. Generates AI action decision
 * 3. Calculates agent eco scores
 * 4. Signs the payload with engine private key
 * 5. Returns action, agentScores, and signature for frontend to submit
 */

import { ethers } from 'ethers'
import { generateAction } from '../engine/gemini-engine.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30, // Allow up to 30 seconds for AI + blockchain calls
}

// Action enum (matches Solidity)
const ACTIONS = ['CLEAN', 'SHARE', 'HIDE', 'HOARD', 'BUILD']
const DISASTERS = ['FIRE', 'DROUGHT', 'POLLUTION', 'FLOOD', 'STORM']

// Arena ABI (minimal - just what we need)
const ARENA_ABI = [
  'function getRound(uint256 roundId) external view returns (uint256 swarmId, uint8 disaster, bool resolved, uint256[] memory survivors, uint256 childId)',
  'function swarms(uint256 swarmId, uint256 index) external view returns (uint256)',
]

// Factory ABI (minimal)
const FACTORY_ABI = [
  'function agentDNA(uint256 tokenId) external view returns (bytes32)',
]

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const startTime = Date.now()
  const debug = process.env.DEBUG === 'true' || process.env.VITE_DEBUG === 'true'

  try {
    const { roundId, agentIds, arenaAddress, factoryAddress } = req.body

    if (!roundId || !agentIds || !Array.isArray(agentIds) || !arenaAddress || !factoryAddress) {
      return res.status(400).json({ 
        error: 'Missing required fields: roundId, agentIds (array), arenaAddress, factoryAddress' 
      })
    }

    if (debug) {
      console.log('[DEBUG] resolve-round called:', { 
        roundId,
        agentCount: agentIds.length,
        arenaAddress,
        factoryAddress,
        timestamp: new Date().toISOString()
      })
    }

    // Connect to Somnia RPC
    const provider = new ethers.providers.JsonRpcProvider(process.env.SOMNIA_RPC_URL)
    const arenaContract = new ethers.Contract(arenaAddress, ARENA_ABI, provider)
    const factoryContract = new ethers.Contract(factoryAddress, FACTORY_ABI, provider)

    // Fetch round data
    const roundData = await arenaContract.getRound(roundId)
    const disaster = DISASTERS[roundData.disaster] || 'UNKNOWN'

    if (debug) {
      console.log('[DEBUG] Round data:', { disaster, resolved: roundData.resolved })
    }

    if (roundData.resolved) {
      return res.status(400).json({ error: 'Round already resolved' })
    }

    // Fetch all agent DNA
    const agentDNAs = await Promise.all(
      agentIds.map(id => factoryContract.agentDNA(id))
    )

    // Unpack DNA to get traits (bytes layout: [0-3: eff, 4-7: coop, 8-11: agg, 12-15: eco])
    const agentTraits = agentDNAs.map(dna => {
      const hex = dna.slice(2) // Remove 0x
      return {
        efficiency: parseInt(hex.slice(0, 2), 16),
        cooperation: parseInt(hex.slice(2, 4), 16),
        aggression: parseInt(hex.slice(4, 6), 16),
        ecoScore: parseInt(hex.slice(6, 8), 16),
      }
    })

    // Calculate average traits for AI decision
    const avgTraits = {
      efficiency: Math.round(agentTraits.reduce((sum, t) => sum + t.efficiency, 0) / agentTraits.length),
      cooperation: Math.round(agentTraits.reduce((sum, t) => sum + t.cooperation, 0) / agentTraits.length),
      aggression: Math.round(agentTraits.reduce((sum, t) => sum + t.aggression, 0) / agentTraits.length),
      ecoScore: Math.round(agentTraits.reduce((sum, t) => sum + t.ecoScore, 0) / agentTraits.length),
    }

    if (debug) {
      console.log('[DEBUG] Average traits:', avgTraits)
    }

    // Generate AI action decision
    const aiDecision = await generateAction(disaster, avgTraits, avgTraits.ecoScore)
    const action = aiDecision.action
    const actionIndex = ACTIONS.indexOf(action)

    if (actionIndex === -1) {
      throw new Error(`Invalid action from AI: ${action}`)
    }

    if (debug) {
      console.log('[DEBUG] AI decision:', { action, reasoning: aiDecision.reasoning })
    }

    // Calculate action effects (simplified from EcoOracle logic)
    const actionEffects = {
      FIRE: { CLEAN: -10, SHARE: -5, HIDE: 20, HOARD: 10, BUILD: 25 },
      DROUGHT: { CLEAN: 0, SHARE: 25, HIDE: 10, HOARD: -15, BUILD: 15 },
      POLLUTION: { CLEAN: 30, SHARE: 5, HIDE: -5, HOARD: -10, BUILD: 20 },
      FLOOD: { CLEAN: 10, SHARE: 15, HIDE: -20, HOARD: 5, BUILD: 25 },
      STORM: { CLEAN: 5, SHARE: 10, HIDE: 20, HOARD: 0, BUILD: -10 },
    }

    const effect = (actionEffects[disaster] && actionEffects[disaster][action]) || 0

    // Calculate new eco scores for each agent
    const agentScores = agentIds.map((id, index) => {
      const currentEco = agentTraits[index].ecoScore
      let newEco = currentEco + effect
      
      // Apply some randomness (+/- 5)
      newEco += Math.floor(Math.random() * 11) - 5
      
      // Clamp to 0-100
      newEco = Math.max(0, Math.min(100, newEco))
      
      return [id, newEco]
    })

    if (debug) {
      console.log('[DEBUG] Agent scores:', agentScores)
    }

    // Sign the payload
    // NOTE: Contract uses .toEthSignedMessageHash() which adds the prefix,
    // so we need to sign the RAW hash, not use signMessage() which would double-prefix
    const wallet = new ethers.Wallet(process.env.ENGINE_PRIVATE_KEY)
    const messageHash = ethers.utils.solidityKeccak256(
      ['uint256', 'uint8', 'uint256[2][]'],
      [roundId, actionIndex, agentScores]
    )
    
    // Sign the raw hash (contract will add prefix)
    const signingKey = new ethers.utils.SigningKey(process.env.ENGINE_PRIVATE_KEY)
    const signature = signingKey.signDigest(messageHash)
    const signatureString = ethers.utils.joinSignature(signature)

    if (debug) {
      console.log('[DEBUG] resolve-round success:', { 
        duration: `${Date.now() - startTime}ms`,
        action,
        survivorCount: agentScores.filter(([_, score]) => score >= 30).length
      })
    }

    res.status(200).json({
      action,
      actionIndex,
      reasoning: aiDecision.reasoning,
      agentScores,
      signature: signatureString,
      disaster,
      effect,
    })
  } catch (error) {
    console.error('[ERROR] resolve-round failed:', {
      message: error.message,
      stack: debug ? error.stack : undefined,
      duration: `${Date.now() - startTime}ms`
    })
    
    res.status(500).json({ 
      error: 'Failed to resolve round',
      ...(debug && { details: error.message })
    })
  }
}
