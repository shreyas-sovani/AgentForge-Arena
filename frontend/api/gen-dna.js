/**
 * Vercel Serverless Function: Generate DNA
 * Endpoint: /api/gen-dna
 */

import { generateDNA } from '../engine/gemini-engine.js'

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
    const { prompt } = req.body

    if (debug) {
      console.log('[DEBUG] gen-dna called:', { 
        prompt, 
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        hasGeminiKey: !!process.env.GEMINI_API_KEY
      })
    }

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Invalid prompt. Expected a non-empty string.' })
    }

    const result = await generateDNA(prompt)
    
    // Convert hex DNA to array format expected by frontend
    // gemini-engine returns: { dna: "0x64326432...", traits: {...} }
    // frontend expects: { dna: [100, 50, 100, ...], traits: {...} }
    
    const dnaHex = result.dna.slice(2) // Remove 0x prefix
    const dnaArray = []
    
    // Convert each byte (2 hex chars) to a number
    // We need 12 values: 4 traits (2 bytes each) + 4 variation bytes
    for (let i = 0; i < 24; i += 2) {
      dnaArray.push(parseInt(dnaHex.slice(i, i + 2), 16) || 0)
    }
    
    const response = {
      dna: dnaArray,
      traits: result.traits
    }

    if (debug) {
      console.log('[DEBUG] gen-dna success:', { 
        duration: `${Date.now() - startTime}ms`,
        dnaLength: response.dna.length,
        traits: result.traits
      })
    }

    res.status(200).json(response)
  } catch (error) {
    console.error('[ERROR] gen-dna failed:', {
      message: error.message,
      stack: debug ? error.stack : undefined,
      duration: `${Date.now() - startTime}ms`
    })
    
    res.status(500).json({ 
      error: 'Failed to generate DNA',
      ...(debug && { details: error.message })
    })
  }
}
