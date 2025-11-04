/**
 * Decision Store - Manages AI decision persistence
 * Works in both serverless (Vercel) and traditional server environments
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// In serverless, we use /tmp for temporary storage
const STORAGE_DIR = process.env.VERCEL ? '/tmp' : join(__dirname, '..', 'api')
const DECISION_FILE = join(STORAGE_DIR, 'latest-decision.json')

/**
 * Save decision to persistent storage
 */
export async function saveDecision(decision) {
  try {
    // Ensure directory exists
    if (!existsSync(STORAGE_DIR)) {
      await mkdir(STORAGE_DIR, { recursive: true })
    }

    const data = {
      ...decision,
      timestamp: Date.now(),
      savedAt: new Date().toISOString()
    }

    await writeFile(DECISION_FILE, JSON.stringify(data, null, 2), 'utf-8')
    
    if (process.env.DEBUG === 'true') {
      console.log('[DecisionStore] Saved decision:', {
        roundId: decision.roundId,
        disaster: decision.disaster,
        action: decision.action,
        file: DECISION_FILE
      })
    }

    return data
  } catch (error) {
    console.error('[DecisionStore] Error saving decision:', error)
    throw error
  }
}

/**
 * Get latest decision from storage
 */
export async function getLatestDecision() {
  try {
    if (!existsSync(DECISION_FILE)) {
      if (process.env.DEBUG === 'true') {
        console.log('[DecisionStore] No decision file found')
      }
      return null
    }

    const data = await readFile(DECISION_FILE, 'utf-8')
    const decision = JSON.parse(data)

    if (process.env.DEBUG === 'true') {
      console.log('[DecisionStore] Retrieved decision:', {
        roundId: decision.roundId,
        age: Date.now() - decision.timestamp,
        file: DECISION_FILE
      })
    }

    return decision
  } catch (error) {
    console.error('[DecisionStore] Error reading decision:', error)
    return null
  }
}

/**
 * Clear stored decision
 */
export async function clearDecision() {
  try {
    if (existsSync(DECISION_FILE)) {
      await writeFile(DECISION_FILE, JSON.stringify({ cleared: true }), 'utf-8')
      console.log('[DecisionStore] Cleared decision')
    }
  } catch (error) {
    console.error('[DecisionStore] Error clearing decision:', error)
  }
}
