/**
 * Vercel Serverless Function: Generate Agent Names
 * Endpoint: /api/gen-names
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

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
    const { count, theme } = req.body

    if (debug) {
      console.log('[DEBUG] gen-names called:', {
        count,
        theme,
        timestamp: new Date().toISOString()
      })
    }

    if (!count || count < 1 || count > 20) {
      return res.status(400).json({ error: 'Count must be between 1 and 20' })
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const prompt = `Generate ${count} unique, memorable names for AI agents in a survival battle royale game.

Theme: ${theme || 'futuristic sci-fi warriors'}

Requirements:
- Each name should be 1-2 words maximum
- Names should sound strong, memorable, and evoke personality
- Mix of different styles: heroic, mysterious, tech-inspired, nature-inspired
- Make them diverse and interesting
- Perfect for a character the user will care about

Return ONLY a JSON array of strings, nothing else. Example format:
["Storm", "Echo-7", "Willow", "Titan", "Cipher"]

Generate ${count} names now:`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    
    // Parse JSON from response (handle markdown code blocks)
    let names
    if (text.startsWith('```')) {
      const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/)
      names = JSON.parse(jsonMatch[1])
    } else {
      names = JSON.parse(text)
    }

    if (debug) {
      console.log('[DEBUG] gen-names success:', {
        duration: `${Date.now() - startTime}ms`,
        namesGenerated: names.length,
        names
      })
    }

    res.status(200).json({ names })
  } catch (error) {
    console.error('[ERROR] gen-names failed:', {
      message: error.message,
      stack: debug ? error.stack : undefined,
      duration: `${Date.now() - startTime}ms`
    })
    
    // Fallback names
    const fallback = Array.from({ length: req.body.count || 1 }, (_, i) => `Agent-${i + 1}`)
    
    res.status(200).json({ 
      names: fallback,
      ...(debug && { error: error.message, fallback: true })
    })
  }
}
