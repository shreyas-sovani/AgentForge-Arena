/**
 * Vercel Serverless Function: Get Latest Decision
 * Endpoint: /api/latest-decision
 */

import { getLatestDecision } from '../../engine/decision-store.js'

export const config = {
  runtime: 'nodejs18',
}

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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const debug = process.env.DEBUG === 'true' || process.env.VITE_DEBUG === 'true'

  try {
    const decision = await getLatestDecision()
    
    if (debug) {
      console.log('[DEBUG] latest-decision retrieved:', {
        hasDecision: !!decision,
        roundId: decision?.roundId,
        disaster: decision?.disaster,
        timestamp: new Date().toISOString()
      })
    }

    if (!decision) {
      return res.status(404).json({ 
        error: 'No decision found',
        roundId: null,
        action: null,
        reasoning: null,
        disaster: null
      })
    }

    res.status(200).json(decision)
  } catch (error) {
    console.error('[ERROR] latest-decision failed:', {
      message: error.message,
      stack: debug ? error.stack : undefined
    })
    
    res.status(500).json({ 
      error: 'Failed to get latest decision',
      roundId: null,
      action: null,
      reasoning: null,
      disaster: null,
      ...(debug && { details: error.message })
    })
  }
}
