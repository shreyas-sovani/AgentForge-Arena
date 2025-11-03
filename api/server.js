import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
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

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/api/health`)
  console.log(`   Gen DNA: POST http://localhost:${PORT}/api/gen-dna`)
})
