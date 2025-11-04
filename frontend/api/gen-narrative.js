/**
 * Vercel Serverless Function: Generate Narrative
 * Endpoint: /api/gen-narrative
 */

import { generateNarrative } from '../../engine/gemini-engine.js'

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const startTime = Date.now()
  const debug = process.env.DEBUG === 'true' || process.env.VITE_DEBUG === 'true'

  try {
    const { disaster, action, agentNames, survivors, deaths, newChild } = req.body

    if (debug) {
      console.log('[DEBUG] gen-narrative called:', {
        disaster,
        action,
        survivorCount: survivors?.length,
        deathCount: deaths?.length,
        hasNewChild: !!newChild,
        timestamp: new Date().toISOString()
      })
    }

    if (!disaster || !action) {
      return res.status(400).json({ error: 'Missing disaster or action' })
    }

    const result = await generateNarrative(disaster, action, agentNames, survivors, deaths, newChild)
    
    if (debug) {
      console.log('[DEBUG] gen-narrative success:', {
        duration: `${Date.now() - startTime}ms`,
        narrativeLength: result?.narrative?.length
      })
    }

    res.status(200).json(result)
  } catch (error) {
    console.error('[ERROR] gen-narrative failed:', {
      message: error.message,
      stack: debug ? error.stack : undefined,
      duration: `${Date.now() - startTime}ms`
    })
    
    // Fallback narrative
    const fallback = `The ${req.body.disaster} struck hard. The AI chose to ${req.body.action}. ${req.body.survivors?.length || 0} agents survived.`
    
    res.status(200).json({ 
      narrative: fallback,
      ...(debug && { error: error.message, fallback: true })
    })
  }
}
