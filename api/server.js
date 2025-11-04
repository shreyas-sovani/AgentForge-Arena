import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFile } from 'fs/promises'
import { generateDNA } from '../engine/gemini-engine.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from root .env
dotenv.config({ path: join(__dirname, '..', '.env') })

const app = express()
const PORT = process.env.API_PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// Generate DNA endpoint
app.post('/api/gen-dna', async (req, res) => {
  try {
    const { prompt } = req.body

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid prompt. Expected a non-empty string.' 
      })
    }

    console.log(`[API] Generating DNA for prompt: "${prompt}"`)
    
    const result = await generateDNA(prompt)
    
    console.log('[API] DNA generated:', result)
    
    res.json(result)
  } catch (error) {
    console.error('[API] Error generating DNA:', error)
    res.status(500).json({ 
      error: 'Failed to generate DNA', 
      message: error.message 
    })
  }
})

// Get latest AI decision (for narrative display)
app.get('/api/latest-decision', async (req, res) => {
  try {
    const decisionPath = join(__dirname, 'latest-decision.json')
    const data = await readFile(decisionPath, 'utf-8')
    res.json(JSON.parse(data))
  } catch (error) {
    console.error('[API] Error reading decision:', error)
    res.json({ roundId: null, action: null, reasoning: null, disaster: null })
  }
})

// Generate enhanced narrative with agent names
app.post('/api/gen-narrative', async (req, res) => {
  try {
    const { disaster, action, agentNames, survivors, deaths, newChild } = req.body
    
    console.log(`[API] Generating narrative for ${disaster} -> ${action}`)
    
    // Import Gemini and narrative generator
    const { generateNarrative } = await import('../engine/gemini-engine.js')
    
    const result = await generateNarrative(disaster, action, agentNames, survivors, deaths, newChild)
    
    console.log('[API] Narrative generated successfully')
    res.json(result)
    
  } catch (error) {
    console.error('[API] Error generating narrative:', error)
    // Fallback narrative
    const fallback = `The ${req.body.disaster} struck hard. The AI chose to ${req.body.action}. ${req.body.survivors.length} agents survived.`
    res.json({ narrative: fallback, error: error.message })
  }
})

// Generate agent names endpoint
app.post('/api/gen-names', async (req, res) => {
  try {
    const { count, theme } = req.body
    
    if (!count || count < 1 || count > 20) {
      return res.status(400).json({ error: 'Count must be between 1 and 20' })
    }

    console.log(`[API] Generating ${count} agent names with theme: "${theme || 'default'}"`)
    
    // Import Gemini
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
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

    console.log('[API] Generated names:', names)
    res.json({ names })
    
  } catch (error) {
    console.error('[API] Error generating names:', error)
    // Fallback names
    const fallback = Array.from({ length: req.body.count }, (_, i) => `Agent-${i + 1}`)
    res.json({ names: fallback })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/api/health`)
  console.log(`   Gen DNA: POST http://localhost:${PORT}/api/gen-dna`)
})
