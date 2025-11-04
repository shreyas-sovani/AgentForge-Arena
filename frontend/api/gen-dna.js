/**
 * Vercel Serverless Function: Generate DNA
 * Endpoint: /api/gen-dna
 */

import { generateDNA } from '../../engine/gemini-engine.js'

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
        env: process.env.NODE_ENV 
      })
    }

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Invalid prompt. Expected a non-empty string.' })
    }

    const result = await generateDNA(prompt)
    
    if (!result.dna || !Array.isArray(result.dna) || result.dna.length !== 12) {
      throw new Error('Invalid DNA generated')
    }

    if (debug) {
      console.log('[DEBUG] gen-dna success:', { 
        duration: `${Date.now() - startTime}ms`,
        dnaLength: result.dna.length,
        namesCount: result.names?.length
      })
    }

    res.status(200).json(result)
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
