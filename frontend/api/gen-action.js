/**
 * Vercel Serverless Function: Generate Action Decision
 * Endpoint: /api/gen-action
 * 
 * This endpoint generates an AI action decision for a round but does NOT sign it
 * (signing requires ethers which we removed from frontend dependencies)
 */

import { generateAction } from '../engine/gemini-engine.js'

export const config = {
  runtime: 'nodejs',
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const startTime = Date.now()
  const debug = process.env.DEBUG === 'true' || process.env.VITE_DEBUG === 'true'

  try {
    const { disaster, traits, currentEcoScore } = req.body

    if (debug) {
      console.log('[DEBUG] gen-action called:', { 
        disaster, 
        traits,
        currentEcoScore,
        timestamp: new Date().toISOString()
      })
    }

    if (!disaster || !traits) {
      return res.status(400).json({ error: 'Missing required fields: disaster, traits' })
    }

    const result = await generateAction(disaster, traits, currentEcoScore || 50)
    
    if (debug) {
      console.log('[DEBUG] gen-action success:', { 
        duration: `${Date.now() - startTime}ms`,
        action: result.action,
        reasoning: result.reasoning
      })
    }

    res.status(200).json({
      action: result.action,
      reasoning: result.reasoning
    })
  } catch (error) {
    console.error('[ERROR] gen-action failed:', {
      message: error.message,
      stack: debug ? error.stack : undefined,
      duration: `${Date.now() - startTime}ms`
    })
    
    res.status(500).json({ 
      error: 'Failed to generate action',
      ...(debug && { details: error.message })
    })
  }
}
