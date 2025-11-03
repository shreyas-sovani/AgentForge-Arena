const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const addresses = JSON.parse(fs.readFileSync("./deployed-addresses.json", "utf8"));
  const Factory = await hre.ethers.getContractFactory("AgentFactory");
  const factory = Factory.attach(addresses.contracts.AgentFactory);
  
  for (let i = 1; i <= 3; i++) {
    try {
      const agents = await factory.getSwarmAgents(i);
      console.log(`Swarm ${i}:`, agents.map(id => id.toString()).join(", ") || "(empty)");
    } catch (e) {
      console.log(`Swarm ${i}: ERROR -`, e.message);
    }
  }
  
  const counter = await factory.swarmCounter();
  console.log("\nSwarm Counter:", counter.toString());
}

main().catch(console.error);
