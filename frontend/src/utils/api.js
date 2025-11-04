/**
 * API Client - Centralized API calls with debug logging
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || ''
const DEBUG = import.meta.env.VITE_DEBUG === 'true' || import.meta.env.DEV

function logDebug(endpoint, data) {
  if (DEBUG) {
    console.log(`[API Debug] ${endpoint}:`, {
      timestamp: new Date().toISOString(),
      ...data
    })
  }
}

async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  const startTime = Date.now()
  
  logDebug(endpoint, { 
    url, 
    method: options.method || 'GET',
    hasBody: !!options.body 
  })

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const duration = Date.now() - startTime

    if (!response.ok) {
      // Clone the response so we can read it multiple times if needed
      const responseClone = response.clone()
      let error
      
      try {
        error = await response.json()
      } catch (e) {
        // If JSON parsing fails, try to get text
        try {
          const text = await responseClone.text()
          error = { error: text || 'Unknown error', status: response.status }
        } catch (e2) {
          error = { error: 'Unknown error', status: response.status }
        }
      }
      
      logDebug(endpoint, { 
        status: response.status, 
        error: error.error || error, 
        details: error.details,
        duration: `${duration}ms`,
        success: false
      })
      
      console.error('[API Error Details]:', {
        endpoint,
        status: response.status,
        error: error.error || error.message || 'Unknown error',
        details: error.details,
        fullError: error
      })
      
      throw new Error(error.error || error.message || `API call failed: ${response.status}`)
    }

    const data = await response.json()
    logDebug(endpoint, { 
      status: response.status, 
      duration: `${duration}ms`, 
      success: true,
      dataKeys: Object.keys(data)
    })
    
    return data
  } catch (error) {
    const duration = Date.now() - startTime
    logDebug(endpoint, { 
      error: error.message, 
      duration: `${duration}ms`, 
      success: false 
    })
    throw error
  }
}

/**
 * API Methods
 */
export const api = {
  /**
   * Generate DNA from prompt
   * @param {string} prompt - User's agent creation prompt
   * @returns {Promise<{dna: number[], names: string[]}>}
   */
  generateDNA: (prompt) =>
    apiCall('/api/gen-dna', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),

  /**
   * Generate narrative for round results
   * @param {string} disaster - The disaster that occurred
   * @param {string} action - The action taken by AI
   * @param {Object} agentNames - Map of agent IDs to names
   * @param {string[]} survivors - Array of survivor names
   * @param {string[]} deaths - Array of death names
   * @param {string} newChild - Name of new child (if any)
   * @returns {Promise<{narrative: string}>}
   */
  generateNarrative: (disaster, action, agentNames, survivors, deaths, newChild) =>
    apiCall('/api/gen-narrative', {
      method: 'POST',
      body: JSON.stringify({ disaster, action, agentNames, survivors, deaths, newChild }),
    }),

  /**
   * Generate agent names
   * @param {number} count - Number of names to generate
   * @param {string} theme - Theme for name generation
   * @returns {Promise<{names: string[]}>}
   */
  generateNames: (count, theme) =>
    apiCall('/api/gen-names', {
      method: 'POST',
      body: JSON.stringify({ count, theme }),
    }),

  /**
   * Generate action decision
   * @param {string} disaster - Current disaster (FIRE, FLOOD, etc.)
   * @param {Object} traits - Agent traits {efficiency, cooperation, aggression, ecoScore}
   * @param {number} currentEcoScore - Current eco score
   * @returns {Promise<{action: string, reasoning: string}>}
   */
  generateAction: (disaster, traits, currentEcoScore) =>
    apiCall('/api/gen-action', {
      method: 'POST',
      body: JSON.stringify({ disaster, traits, currentEcoScore }),
    }),

  /**
   * Resolve round (get AI decision + signature)
   * @param {number} roundId - Round ID
   * @param {number[]} agentIds - Array of agent token IDs
   * @param {string} arenaAddress - Arena contract address
   * @param {string} factoryAddress - Factory contract address
   * @returns {Promise<{action: string, actionIndex: number, reasoning: string, agentScores: number[][], signature: string, disaster: string, effect: number}>}
   */
  resolveRound: (roundId, agentIds, arenaAddress, factoryAddress) =>
    apiCall('/api/resolve-round', {
      method: 'POST',
      body: JSON.stringify({ roundId, agentIds, arenaAddress, factoryAddress }),
    }),

  /**
   * Get latest AI decision
   * @returns {Promise<{roundId: number, disaster: string, action: string, reasoning: string}>}
   */
  getLatestDecision: () =>
    apiCall('/api/latest-decision'),
}
