#!/usr/bin/env node

import { Command } from 'commander';
import { 
  generateDNA, 
  generateAction, 
  signPayload, 
  getSignerAddress,
  unpackDNA,
  ACTIONS,
  DISASTERS 
} from './gemini-engine.js';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const program = new Command();

program
  .name('agentforge-engine')
  .description('AgentForge Arena off-chain AI engine')
  .version('1.0.0');

// Command: Generate DNA
program
  .command('gen-dna')
  .description('Generate agent DNA from prompt')
  .argument('<prompt>', 'Creative prompt for agent swarm')
  .action(async (prompt) => {
    console.log('\n🧬 Generating DNA from prompt:', prompt);
    console.log('━'.repeat(60));
    
    const result = await generateDNA(prompt);
    
    console.log('\n✅ DNA Generated:');
    console.log('  DNA (bytes32):', result.dna);
    console.log('  Traits:', result.traits);
    if (result.error) {
      console.log('  ⚠️  Warning: Fallback used due to:', result.error);
    }
    
    // Verify unpacking
    const unpacked = unpackDNA(result.dna);
    console.log('\n🔍 Verification (unpacked):', unpacked);
    
    console.log('\n📋 Copy this DNA for contract call:');
    console.log(`  "${result.dna}"`);
  });

// Command: Generate Action
program
  .command('gen-action')
  .description('Generate action decision for round')
  .requiredOption('-d, --disaster <disaster>', 'Current disaster (FIRE, DROUGHT, etc.)')
  .option('-e, --efficiency <n>', 'Efficiency trait (0-100)', '50')
  .option('-c, --cooperation <n>', 'Cooperation trait (0-100)', '50')
  .option('-a, --aggression <n>', 'Aggression trait (0-100)', '50')
  .option('-s, --eco-score <n>', 'Current eco score (0-100)', '50')
  .action(async (options) => {
    const disaster = options.disaster.toUpperCase();
    
    if (!DISASTERS.includes(disaster)) {
      console.error('❌ Invalid disaster. Must be:', DISASTERS.join(', '));
      process.exit(1);
    }
    
    const traits = {
      efficiency: parseInt(options.efficiency),
      cooperation: parseInt(options.cooperation),
      aggression: parseInt(options.aggression),
      ecoScore: parseInt(options.ecoScore)
    };
    
    console.log('\n⚔️  Generating action decision...');
    console.log('  Disaster:', disaster);
    console.log('  Traits:', traits);
    console.log('━'.repeat(60));
    
    const decision = await generateAction(disaster, traits, traits.ecoScore);
    
    console.log('\n✅ Action Decision:');
    console.log('  Action:', decision.action);
    console.log('  Reasoning:', decision.reasoning);
    
    if (decision.error) {
      console.log('  ⚠️  Warning: Fallback used due to:', decision.error);
    }
  });

// Command: Sign Payload
program
  .command('sign-payload')
  .description('Sign round resolution payload for Arena')
  .requiredOption('-r, --round <n>', 'Round ID', parseInt)
  .requiredOption('-a, --action <action>', 'Action (CLEAN, SHARE, etc.)')
  .requiredOption('-s, --scores <json>', 'Agent scores as JSON array [[tokenId, ecoScore], ...]')
  .action(async (options) => {
    const action = options.action.toUpperCase();
    
    if (!ACTIONS.includes(action)) {
      console.error('❌ Invalid action. Must be:', ACTIONS.join(', '));
      process.exit(1);
    }
    
    let agentScores;
    try {
      agentScores = JSON.parse(options.scores);
    } catch (error) {
      console.error('❌ Invalid JSON for scores. Example: [[1,50],[2,60]]');
      process.exit(1);
    }
    
    console.log('\n✍️  Signing payload...');
    console.log('  Round:', options.round);
    console.log('  Action:', action);
    console.log('  Agent Scores:', agentScores);
    console.log('━'.repeat(60));
    
    const signature = await signPayload(options.round, action, agentScores);
    
    console.log('\n✅ Signature Generated:');
    console.log('  Signature:', signature);
    console.log('  Signer Address:', getSignerAddress());
    
    console.log('\n📋 Use this signature in resolveRound():');
    console.log(`  "${signature}"`);
  });

// Command: Get Signer Address
program
  .command('signer')
  .description('Get engine signer address')
  .action(() => {
    console.log('\n🔑 Engine Signer Address:');
    console.log('  ', getSignerAddress());
    console.log('\nℹ️  Register this address in Arena.setEngineSigner()');
  });

// Command: Test Gemini Connection
program
  .command('test-gemini')
  .description('Test Gemini API connection')
  .action(async () => {
    console.log('\n🧪 Testing Gemini API...');
    console.log('━'.repeat(60));
    
    try {
      const result = await generateDNA("test robots");
      
      if (result.error) {
        console.log('⚠️  API responded but with fallback:', result.error);
      } else {
        console.log('✅ Gemini API is working!');
        console.log('  Sample DNA:', result.dna);
        console.log('  Sample Traits:', result.traits);
      }
    } catch (error) {
      console.log('❌ Gemini API test failed:', error.message);
      console.log('\nTroubleshooting:');
      console.log('  1. Check GEMINI_API_KEY in .env');
      console.log('  2. Verify key at https://aistudio.google.com/app/apikey');
      console.log('  3. Ensure internet connection');
    }
  });

// Command: Full Round Simulation
program
  .command('simulate-round')
  .description('Simulate a full round (DNA gen → Action gen → Sign)')
  .argument('<prompt>', 'Agent prompt')
  .option('-d, --disaster <disaster>', 'Disaster (random if not set)')
  .action(async (prompt, options) => {
    console.log('\n🎮 Simulating Full Round');
    console.log('━'.repeat(60));
    
    // Step 1: Generate DNA
    console.log('\n1️⃣  Generating DNA...');
    const dnaResult = await generateDNA(prompt);
    console.log('   Traits:', dnaResult.traits);
    
    // Step 2: Random disaster if not set
    const disaster = options.disaster 
      ? options.disaster.toUpperCase()
      : DISASTERS[Math.floor(Math.random() * DISASTERS.length)];
    
    console.log('\n2️⃣  Disaster occurs:', disaster);
    
    // Step 3: Generate action
    console.log('\n3️⃣  Generating action decision...');
    const actionResult = await generateAction(disaster, dnaResult.traits, dnaResult.traits.ecoScore);
    console.log('   Action:', actionResult.action);
    console.log('   Reasoning:', actionResult.reasoning);
    
    // Step 4: Simulate eco scoring (mock)
    const actionIndex = ACTIONS.indexOf(actionResult.action);
    const ecoModifier = (Math.random() * 40 - 10); // -10 to +30
    const newEcoScore = Math.max(0, Math.min(100, dnaResult.traits.ecoScore + ecoModifier));
    
    console.log('\n4️⃣  Eco Score Update:');
    console.log('   Before:', dnaResult.traits.ecoScore);
    console.log('   After:', Math.round(newEcoScore));
    console.log('   Status:', newEcoScore >= 30 ? '✅ SURVIVES' : '💀 DIES');
    
    // Step 5: Sign payload
    const mockAgentScores = [[1, Math.round(newEcoScore)]];
    const signature = await signPayload(0, actionResult.action, mockAgentScores);
    
    console.log('\n5️⃣  Payload signed:');
    console.log('   Signature:', signature.slice(0, 20) + '...');
    
    console.log('\n🏁 Simulation Complete!\n');
  });

program.parse();
