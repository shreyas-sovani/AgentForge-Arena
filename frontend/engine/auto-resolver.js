#!/usr/bin/env node

/**
 * AgentForge Arena Auto-Resolver
 * 
 * Watches for RoundStarted events and automatically:
 * 1. Fetches agent data from contract
 * 2. Generates AI action via Gemini
 * 3. Calculates new eco scores
 * 4. Signs payload with engine private key
 * 5. Submits resolveRound transaction
 * 
 * Follows Somnia WebSocket best practices from:
 * https://docs.somnia.network/developer/building-dapps/data-indexing-and-querying/listening-to-blockchain-events-websocket
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { generateAction, signPayload, unpackDNA, DISASTERS, ACTIONS } from './gemini-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

// Configuration
const WS_URL = 'wss://dream-rpc.somnia.network/ws';
const ARENA_ADDRESS = '0x5C5e24ed6a89Aa6c5e86e5B47564dbc61E3B85d9';  // v7 - with rewards
const FACTORY_ADDRESS = '0xB973F366ce7e5bEed8AB275c30d30cE568F31792'; // v7

// Contract ABIs (minimal, only what we need)
const ARENA_ABI = [
  'event RoundStarted(uint256 indexed roundId, uint256 indexed swarmId, uint8 disaster, bytes32 disasterHash)',
  'event RoundResolved(uint256 indexed roundId, uint256[] survivors, uint256 childId)',
  'function resolveRound(uint256 roundId, uint8 action, uint256[2][] calldata agentScores, bytes calldata signature) external',
  'function rounds(uint256) view returns (uint256 swarmId, uint8 disaster, uint256 startTime, bool resolved, uint256[] survivors, uint256 childId)'
];

const FACTORY_ABI = [
  'function agentDNA(uint256 tokenId) view returns (bytes32)',
  'function getSwarmAgents(uint256 swarmId) view returns (uint256[] memory)',
  'function ownerOf(uint256 tokenId) view returns (address)'
];

// Eco score matrix (matches Arena.sol)
const ECO_MATRIX = {
  CLEAN: {
    POLLUTION: 30,
    FIRE: 10,
    FLOOD: -10,
    DROUGHT: 0,
    STORM: 0
  },
  SHARE: {
    DROUGHT: 25,
    STORM: 15,
    POLLUTION: 0,
    FIRE: 0,
    FLOOD: 0
  },
  HIDE: {
    FIRE: 20,
    STORM: 20,
    FLOOD: -20,
    POLLUTION: 0,
    DROUGHT: 0
  },
  HOARD: {
    DROUGHT: -15,
    POLLUTION: -10,
    FIRE: 0,
    FLOOD: 0,
    STORM: 0
  },
  BUILD: {
    FLOOD: 25,
    FIRE: 20,
    STORM: 15,
    POLLUTION: 0,
    DROUGHT: 0
  }
};

class AutoResolver {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.arenaContract = null;
    this.factoryContract = null;
    this.processing = new Set(); // Track rounds being processed
  }

  async init() {
    console.log('\n🤖 AgentForge Auto-Resolver Starting...');
    console.log('━'.repeat(70));

    // Validate environment
    if (!process.env.ENGINE_PRIVATE_KEY) {
      throw new Error('ENGINE_PRIVATE_KEY not found in .env');
    }
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not found in .env');
    }

    // Create WebSocket provider (Ethers v5 syntax)
    console.log('📡 Connecting to Somnia WebSocket...');
    this.provider = new ethers.providers.WebSocketProvider(WS_URL);
    
    // Wait for connection
    await new Promise((resolve) => {
      this.provider.once('network', () => {
        resolve();
      });
    });
    
    console.log('✅ Connected to', WS_URL);

    // Create wallet
    this.wallet = new ethers.Wallet(process.env.ENGINE_PRIVATE_KEY, this.provider);
    console.log('🔑 Engine wallet:', this.wallet.address);

    // Check balance
    const balance = await this.provider.getBalance(this.wallet.address);
    console.log('💰 Balance:', ethers.utils.formatEther(balance), 'STT');
    
    if (balance.isZero()) {
      console.log('⚠️  WARNING: Engine wallet has 0 STT! Send some to resolve rounds.');
    }

    // Create contract instances
    this.arenaContract = new ethers.Contract(ARENA_ADDRESS, ARENA_ABI, this.wallet);
    this.factoryContract = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, this.provider);

    console.log('📋 Watching contracts:');
    console.log('   Arena:  ', ARENA_ADDRESS);
    console.log('   Factory:', FACTORY_ADDRESS);
    console.log('━'.repeat(70));
    console.log('✅ Auto-Resolver Ready! Listening for RoundStarted events...\n');
  }

  async handleRoundStarted(roundId, swarmId, disaster, disasterHash, event) {
    const roundKey = `${roundId}`;
    
    // Prevent duplicate processing
    if (this.processing.has(roundKey)) {
      console.log(`⏭️  Round ${roundId} already being processed, skipping...`);
      return;
    }

    // Check if round is already resolved on-chain
    try {
      const round = await this.arenaContract.rounds(roundId);
      if (round.resolved) {
        console.log(`⏭️  Round ${roundId} already resolved on-chain, skipping...`);
        return;
      }
    } catch (error) {
      console.log(`⚠️  Could not check round ${roundId} status:`, error.message);
    }

    this.processing.add(roundKey);

    try {
      console.log('\n🎲 RoundStarted Event Detected!');
      console.log('━'.repeat(70));
      console.log('Round ID:', roundId.toString());
      console.log('Swarm ID:', swarmId.toString());
      console.log('Disaster:', DISASTERS[disaster], `(${disaster})`);
      if (event && event.log) {
        console.log('Tx Hash: ', event.log.transactionHash);
        console.log('Block:   ', event.log.blockNumber);
      }

      // Step 1: Get swarm agents
      console.log('\n1️⃣  Fetching swarm agents...');
      const agentIds = await this.factoryContract.getSwarmAgents(swarmId);
      console.log(`   Found ${agentIds.length} agents:`, agentIds.map(id => id.toString()).join(', '));

      // Step 2: Get agent DNA and traits
      console.log('\n2️⃣  Reading agent DNA from chain...');
      const agents = [];
      for (const agentId of agentIds) {
        try {
          const owner = await this.factoryContract.ownerOf(agentId);
          const dnaBytes = await this.factoryContract.agentDNA(agentId);
          const traits = unpackDNA(dnaBytes);
          
          agents.push({
            tokenId: agentId,
            dna: dnaBytes,
            traits,
            alive: true // Assume alive (will check if owned)
          });
          
          console.log(`   Agent #${agentId}: eco=${traits.ecoScore}, eff=${traits.efficiency}, coop=${traits.cooperation}, agg=${traits.aggression}`);
        } catch (error) {
          // Agent might be dead (burned)
          console.log(`   Agent #${agentId}: 💀 DEAD (not owned)`);
          agents.push({
            tokenId: agentId,
            alive: false
          });
        }
      }

      const aliveAgents = agents.filter(a => a.alive);
      console.log(`   ${aliveAgents.length} alive agents`);

      if (aliveAgents.length === 0) {
        console.log('⚠️  No alive agents, skipping resolution');
        this.processing.delete(roundKey);
        return;
      }

      // Step 3: Generate AI action (use first alive agent's traits)
      console.log('\n3️⃣  Generating AI action decision...');
      const leadAgent = aliveAgents[0];
      const disasterName = DISASTERS[disaster];
      
      const decision = await generateAction(
        disasterName,
        leadAgent.traits,
        leadAgent.traits.ecoScore
      );

      console.log(`   Action: ${decision.action}`);
      console.log(`   Reasoning: ${decision.reasoning}`);

      // Save decision for frontend narrative
      const fs = await import('fs/promises');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      
      const decisionData = {
        roundId: Number(roundId),
        action: decision.action,
        reasoning: decision.reasoning,
        disaster: disasterName
      };
      
      try {
        await fs.writeFile(
          path.join(__dirname, '..', 'api', 'latest-decision.json'),
          JSON.stringify(decisionData, null, 2)
        );
      } catch (err) {
        console.log('⚠️  Could not save decision for narrative:', err.message);
      }

      // Step 4: Calculate new eco scores
      console.log('\n4️⃣  Calculating eco score changes...');
      const actionIndex = ACTIONS.indexOf(decision.action);
      const ecoModifier = ECO_MATRIX[decision.action]?.[disasterName] || 0;
      
      console.log(`   Base modifier for ${decision.action} vs ${disasterName}: ${ecoModifier > 0 ? '+' : ''}${ecoModifier}`);

      const agentScores = [];
      for (const agent of aliveAgents) {
        // Add some randomness based on traits
        const traitBonus = (agent.traits.efficiency + agent.traits.cooperation - agent.traits.aggression) / 10;
        const randomFactor = Math.random() * 10 - 5; // -5 to +5
        const totalChange = ecoModifier + traitBonus + randomFactor;
        
        const oldScore = agent.traits.ecoScore;
        const newScore = Math.max(0, Math.min(100, oldScore + totalChange));
        
        agentScores.push([Number(agent.tokenId), Math.round(newScore)]);
        
        const status = newScore >= 30 ? '✅' : '💀';
        console.log(`   Agent #${agent.tokenId}: ${oldScore} → ${Math.round(newScore)} ${status}`);
      }

      // Step 5: Sign payload
      console.log('\n5️⃣  Signing payload...');
      const signature = await signPayload(Number(roundId), decision.action, agentScores);
      console.log(`   Signature: ${signature.slice(0, 20)}...${signature.slice(-20)}`);

      // Step 6: Submit transaction
      console.log('\n6️⃣  Submitting resolveRound transaction...');
      console.log(`   Round: ${roundId}`);
      console.log(`   Action: ${decision.action} (${actionIndex})`);
      console.log(`   Scores: ${agentScores.length} agents`);

      // Test with callStatic first to get exact error
      try {
        await this.arenaContract.callStatic.resolveRound(
          roundId,
          actionIndex,
          agentScores,
          signature
        );
        console.log('   ✅ callStatic passed - transaction should succeed');
      } catch (staticError) {
        console.log('   ❌ callStatic FAILED - transaction will revert!');
        console.log('   Error:', staticError.message);
        if (staticError.reason) {
          console.log('   Reason:', staticError.reason);
        }
        if (staticError.error && staticError.error.message) {
          console.log('   Error message:', staticError.error.message);
        }
        throw new Error(`Transaction will fail: ${staticError.reason || staticError.message}`);
      }

      const tx = await this.arenaContract.resolveRound(
        roundId,
        actionIndex,
        agentScores,
        signature,
        {
          gasLimit: 5000000 // 5M gas for resolution
        }
      );

      console.log(`   ✅ Transaction sent: ${tx.hash}`);
      console.log(`   ⏳ Waiting for confirmation...`);

      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        console.log(`   ❌ Transaction REVERTED!`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
        console.log(`   Block: ${receipt.blockNumber}`);
        
        // Check if round was already resolved
        const roundAfter = await this.arenaContract.rounds(roundId);
        console.log(`   Round resolved status AFTER tx: ${roundAfter.resolved}`);
        
        throw new Error('Transaction reverted - check logs above');
      }
      
      console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
      console.log(`   ⛽ Gas used: ${receipt.gasUsed.toString()}`);

      // Parse RoundResolved event
      const resolvedEvent = receipt.logs
        .map(log => {
          try {
            return this.arenaContract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e && e.name === 'RoundResolved');

      if (resolvedEvent) {
        const survivors = resolvedEvent.args.survivors;
        const childId = resolvedEvent.args.childId;
        
        console.log('\n🎉 Round Resolved!');
        console.log(`   Survivors: ${survivors.length} agents`);
        if (childId > 0) {
          console.log(`   🍼 Child born: Agent #${childId}`);
        }
        console.log(`   Deaths: ${aliveAgents.length - survivors.length} agents`);
      }

      console.log('\n━'.repeat(70));
      console.log('✅ Round resolved successfully!\n');

    } catch (error) {
      console.error('\n❌ Error resolving round:', error);
      console.error('   Message:', error.message);
      if (error.data) {
        console.error('   Data:', error.data);
      }
    } finally {
      this.processing.delete(roundKey);
    }
  }

  async start() {
    await this.init();

    // Event filter for RoundStarted (Ethers v5)
    const filter = this.arenaContract.filters.RoundStarted();

    // Listen for events
    this.arenaContract.on(filter, async (roundId, swarmId, disaster, disasterHash, event) => {
      try {
        await this.handleRoundStarted(
          roundId,
          swarmId,
          disaster,
          disasterHash,
          { log: event }
        );
      } catch (error) {
        console.error('Error handling event:', error.message);
      }
    });

    // Keep connection alive (ping every 30s)
    setInterval(async () => {
      try {
        await this.provider.getBlockNumber();
      } catch (error) {
        console.error('Connection error:', error.message);
        // Reconnection logic would go here
      }
    }, 30000);

    // Handle shutdown gracefully
    process.on('SIGINT', () => {
      console.log('\n\n👋 Shutting down auto-resolver...');
      this.provider.removeAllListeners();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.provider.removeAllListeners();
      process.exit(0);
    });
  }
}

// Start the auto-resolver
const resolver = new AutoResolver();
resolver.start().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
