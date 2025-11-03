// Mint swarm via Arena
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const addresses = JSON.parse(fs.readFileSync(path.join(__dirname, "../deployed-addresses.json"), "utf8"));
  const [signer] = await hre.ethers.getSigners();
  
  const Arena = await hre.ethers.getContractFactory("Arena");
  const arena = Arena.attach(addresses.contracts.Arena);
  
  const testDNA = "0x5a550f6200000000000000000000000000000000000000000000000000000000";
  
  console.log("\n🧬 Minting swarm via Arena...");
  console.log("   DNA:", testDNA);
  console.log("   To:", signer.address);
  
  const tx = await arena.mintSwarm(signer.address, testDNA);
  console.log("   ⏳ Waiting for confirmation...");
  const receipt = await tx.wait();
  
  console.log("   ✅ Swarm minted!");
  console.log("   Tx:", receipt.transactionHash);
  console.log("   Gas used:", receipt.gasUsed.toString());
  
  // Get swarm ID
  const Factory = await hre.ethers.getContractFactory("AgentFactory");
  const factory = Factory.attach(addresses.contracts.AgentFactory);
  
  const swarmId = (await factory.swarmCounter()).toNumber();
  const agents = await factory.getSwarmAgents(swarmId);
  
  console.log("\n📊 Swarm Details:");
  console.log("   Swarm ID:", swarmId);
  console.log("   Agents:", agents.map(id => id.toString()).join(", "));
  console.log("   Total:", agents.length);
}

main().catch(console.error);
