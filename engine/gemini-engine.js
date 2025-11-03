import { GoogleGenerativeAI } from '@google/generative-ai';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from root
dotenv.config({ path: resolve(__dirname, '../.env') });

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash-preview-05-20", // Latest available flash model
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
  }
});

// Action enum (matches Solidity)
const ACTIONS = ['CLEAN', 'SHARE', 'HIDE', 'HOARD', 'BUILD'];
const DISASTERS = ['FIRE', 'DROUGHT', 'POLLUTION', 'FLOOD', 'STORM'];

/**
 * Generate agent DNA from user prompt
 * @param {string} prompt - User's creative prompt (e.g., "pizza chefs that share dough")
 * @returns {Object} { dna: bytes32, traits: {eff, coop, agg, eco}, description }
 */
export async function generateDNA(prompt) {
  const systemPrompt = `You are an AI agent geneticist. Given a user prompt describing agent behavior, generate DNA traits.

Output ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "efficiency": <0-100 number>,
  "cooperation": <0-100 number>,
  "aggression": <0-100 number>,
  "ecoScore": <0-100 number>,
  "description": "<1-sentence agent personality>"
}

Trait guidelines:
- efficiency: Resource optimization, speed
- cooperation: Teamwork, sharing behavior
- aggression: Competitiveness, dominance
- ecoScore: Environmental consciousness (higher = greener)

Bias traits to match the prompt theme. For "pizza chefs that share", cooperation should be high.`;

  try {
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `User prompt: "${prompt}"` }
    ]);
    
    const response = result.response.text();
    
    // Strip markdown code blocks if present
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || 
                      response.match(/```\n?([\s\S]*?)\n?```/) ||
                      [null, response];
    
    const traits = JSON.parse(jsonMatch[1] || response);
    
    // Validate and clamp traits
    const validated = {
      efficiency: Math.max(0, Math.min(100, parseInt(traits.efficiency) || 50)),
      cooperation: Math.max(0, Math.min(100, parseInt(traits.cooperation) || 50)),
      aggression: Math.max(0, Math.min(100, parseInt(traits.aggression) || 50)),
      ecoScore: Math.max(0, Math.min(100, parseInt(traits.ecoScore) || 50)),
      description: traits.description || "An AI agent"
    };

    // Pack into bytes32 (Solidity format)
    const dna = packDNA(validated);

    return {
      dna,
      traits: validated,
      rawResponse: response
    };
  } catch (error) {
    console.error('❌ Gemini DNA generation failed:', error.message);
    console.error('Raw response:', error);
    
    // Fallback to balanced traits
    const fallback = { efficiency: 50, cooperation: 50, aggression: 50, ecoScore: 50 };
    return {
      dna: packDNA(fallback),
      traits: { ...fallback, description: "Fallback agent (Gemini error)" },
      error: error.message
    };
  }
}

/**
 * Generate action decision for a round
 * @param {string} disaster - Current disaster (FIRE, DROUGHT, etc.)
 * @param {Object} traits - Agent base traits
 * @param {number} currentEcoScore - Current eco score
 * @returns {Object} { action: string, reasoning: string }
 */
export async function generateAction(disaster, traits, currentEcoScore = 50) {
  const systemPrompt = `You are an AI agent in a survival game. Based on the current disaster and your traits, choose ONE action.

Available actions: ${ACTIONS.join(', ')}

Action effects (examples):
- CLEAN: Good vs POLLUTION (+30), bad vs FLOOD (-10)
- SHARE: Good vs DROUGHT (+25), helps team
- HIDE: Safe vs FIRE/STORM (+20), bad vs FLOOD (-20)
- HOARD: Selfish, bad vs DROUGHT (-15)
- BUILD: Infrastructure, good vs FLOOD/FIRE (+25)

Output ONLY valid JSON:
{
  "action": "<one of: ${ACTIONS.join(', ')}>",
  "reasoning": "<1-sentence why>"
}`;

  const contextPrompt = `Current disaster: ${disaster}
Your traits:
- Efficiency: ${traits.efficiency}/100
- Cooperation: ${traits.cooperation}/100
- Aggression: ${traits.aggression}/100
- Eco Score: ${currentEcoScore}/100

Choose the action most likely to SURVIVE (eco score > 30). Consider your personality.`;

  try {
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: contextPrompt }
    ]);
    
    const response = result.response.text();
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || 
                      response.match(/```\n?([\s\S]*?)\n?```/) ||
                      [null, response];
    
    const decision = JSON.parse(jsonMatch[1] || response);
    
    // Validate action
    const action = ACTIONS.includes(decision.action?.toUpperCase()) 
      ? decision.action.toUpperCase()
      : ACTIONS[Math.floor(Math.random() * ACTIONS.length)]; // Fallback random

    return {
      action,
      reasoning: decision.reasoning || "Survival instinct",
      rawResponse: response
    };
  } catch (error) {
    console.error('❌ Gemini action generation failed:', error.message);
    
    // Fallback: bias to cooperation or eco-friendly based on traits
    const fallbackAction = traits.cooperation > 60 ? 'SHARE' : 
                          traits.ecoScore > 60 ? 'CLEAN' : 'HIDE';
    
    return {
      action: fallbackAction,
      reasoning: "Fallback decision (Gemini error)",
      error: error.message
    };
  }
}

/**
 * Pack traits into bytes32 DNA (Solidity format)
 * Bytes layout: [0-3: eff, 4-7: coop, 8-11: agg, 12-15: eco, rest: 0]
 */
function packDNA(traits) {
  const { efficiency, cooperation, aggression, ecoScore } = traits;
  
  // Convert to hex bytes (pad to 2 chars each)
  const hexEff = efficiency.toString(16).padStart(2, '0');
  const hexCoop = cooperation.toString(16).padStart(2, '0');
  const hexAgg = aggression.toString(16).padStart(2, '0');
  const hexEco = ecoScore.toString(16).padStart(2, '0');
  
  // Pack into bytes32 (64 hex chars = 32 bytes)
  const dna = '0x' + 
              hexEff + hexCoop + hexAgg + hexEco + 
              '0'.repeat(56); // Pad remaining 28 bytes
  
  return dna;
}

/**
 * Unpack bytes32 DNA to traits
 */
export function unpackDNA(dna) {
  const hex = dna.slice(2); // Remove 0x
  
  return {
    efficiency: parseInt(hex.slice(0, 2), 16),
    cooperation: parseInt(hex.slice(2, 4), 16),
    aggression: parseInt(hex.slice(4, 6), 16),
    ecoScore: parseInt(hex.slice(6, 8), 16)
  };
}

/**
 * Sign payload for on-chain verification
 * @param {Object} payload - Data to sign (roundId, action, agentScores)
 * @returns {string} ECDSA signature
 */
export async function signPayload(roundId, action, agentScores) {
  const wallet = new ethers.Wallet(process.env.ENGINE_PRIVATE_KEY);
  
  // Match Solidity encoding: keccak256(abi.encodePacked(roundId, action, agentScores))
  const actionIndex = ACTIONS.indexOf(action);
  
  // Encode as Solidity does: uint256, uint8, uint256[2][]
  const types = ['uint256', 'uint8', 'uint256[2][]'];
  const values = [roundId, actionIndex, agentScores];
  
  const messageHash = ethers.utils.solidityKeccak256(types, values);
  const signature = await wallet.signMessage(ethers.utils.arrayify(messageHash));
  
  return signature;
}

/**
 * Get engine signer address (for Arena registration)
 */
export function getSignerAddress() {
  const wallet = new ethers.Wallet(process.env.ENGINE_PRIVATE_KEY);
  return wallet.address;
}

// Export for testing
export { ACTIONS, DISASTERS, packDNA };
