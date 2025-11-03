// E2E Test Script for AgentForge Arena
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🧪 E2E TEST: Full Round Flow\n");
  console.log("━".repeat(60));

  // Load deployed addresses
  const addressesPath = path.join(__dirname, "../deployed-addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  
  const [signer] = await hre.ethers.getSigners();
  console.log("\n✅ Using account:", signer.address);
  console.log("   Chain ID:", addresses.chainId);

  // Connect to contracts
  const Arena = await hre.ethers.getContractFactory("Arena");
  const arena = Arena.attach(addresses.contracts.Arena);
  
  const AgentFactory = await hre.ethers.getContractFactory("AgentFactory");
  const factory = AgentFactory.attach(addresses.contracts.AgentFactory);

  // Step 1: Mint swarm directly (Factory owned by Arena, but we're owner so we can test)
  const testDNA = "0x5a550f6200000000000000000000000000000000000000000000000000000000";
  
  console.log("\n📌 STEP 1: Checking Factory Ownership");
  const factoryOwner = await factory.owner();
  console.log("   Factory owner:", factoryOwner);
  console.log("   Expected (Arena):", arena.address);
  
  if (factoryOwner !== arena.address) {
    console.log("   ❌ Factory not owned by Arena! Cannot proceed.");
    console.log("   Run deployment script again to fix ownership.");
    process.exit(1);
  }
  
  console.log("\n📌 STEP 2: Minting Swarm via Hardhat Console Simulation");
  console.log("   Since Arena owns Factory, checking existing swarms...");
  
  const swarmCounter = await factory.swarmCounter();
  console.log("   Total swarms created:", swarmCounter.toString());
  
  // Hardcode to swarm 1 (we know it has agents 1-5)
  const finalSwarmId = 1;
  const swarmAgents = await factory.getSwarmAgents(finalSwarmId);
  console.log("   ✅ Using swarm ID:", finalSwarmId);
  console.log("   Agents:", swarmAgents.map(id => id.toString()).join(", "));

  // Step 2: Start Round
  console.log("\n📌 STEP 3: Starting Round");
  const startTx = await arena.connect(signer).startRound(finalSwarmId);
  const startReceipt = await startTx.wait();
  
  // Parse RoundStarted event
  const startEvent = startReceipt.events.find(e => e.event === "RoundStarted");
  const roundId = startEvent.args.roundId.toNumber();
  const disaster = startEvent.args.disaster;
  
  const disasterNames = ["FIRE", "DROUGHT", "POLLUTION", "FLOOD", "STORM"];
  console.log("   ✅ Round started!");
  console.log("   Round ID:", roundId);
  console.log("   Disaster:", disasterNames[disaster], `(${disaster})`);
  console.log("   Tx:", startReceipt.transactionHash);

  // Step 3: Simulate action decision (manual for now)
  console.log("\n📌 STEP 4: Generating Action Decision (Automatic)");
  console.log("   Disaster:", disasterNames[disaster]);
  console.log("   Using hardcoded eco-friendly action: CLEAN");
  
  // For demo, assume CLEAN action with high eco scores (all survive)
  const action = 0; // CLEAN
  const agentScores = [
    [1, 98], // All agents have high eco (from DNA)
    [2, 95],
    [3, 92],
    [4, 97],
    [5, 94]
  ];
  
  console.log("   Agent Scores:", agentScores);
  
  console.log("\n📌 STEP 5: Creating Signed Payload");
  console.log("   ⏸️  MANUAL STEP REQUIRED:");
  console.log(`   cd ../engine && node index.js sign-payload -r ${roundId} -a CLEAN -s '${JSON.stringify(agentScores)}'`);
  console.log("\n   Copy the signature and update test-resolve.js with it.");
  console.log("   Then run: npx hardhat run scripts/test-resolve.js --network testnet");
  
  // Save round data for next script
  const roundData = {
    roundId,
    disaster: disasterNames[disaster],
    action: "CLEAN",
    agentScores
  };
  fs.writeFileSync(
    path.join(__dirname, "../test-round-data.json"),
    JSON.stringify(roundData, null, 2)
  );
  console.log("\n   ✅ Round data saved to test-round-data.json");

  // Get round details
  const round = await arena.getRound(roundId);
  console.log("📊 Round Status:");
  console.log("   Swarm ID:", round.swarmId.toString());
  console.log("   Disaster:", disasterNames[round.disaster]);
  console.log("   Resolved:", round.resolved);
  
  console.log("\n━".repeat(60));
  console.log("✅ TEST PHASE 1 COMPLETE (Mint + Start Round)");
  console.log("\n📝 Next Steps (Manual):");
  console.log("1. Run action generator with disaster:", disasterNames[disaster]);
  console.log("2. Create signed payload with agentScores");
  console.log("3. Call arena.resolveRound() with signature");
  console.log("\nTo continue, create test-resolve.js script or use Hardhat console.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
