const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const addresses = JSON.parse(fs.readFileSync("./deployed-addresses.json", "utf8"));
  const Factory = await hre.ethers.getContractFactory("AgentFactory");
  const factory = Factory.attach(addresses.contracts.AgentFactory);
  
  console.log("Checking token ownership...\n");
  
  for (let tokenId = 1; tokenId <= 10; tokenId++) {
    try {
      const owner = await factory.ownerOf(tokenId);
      const dna = await factory.agentDNA(tokenId);
      console.log(`Token ${tokenId}: Owner=${owner.slice(0,10)}... DNA=${dna.slice(0,20)}...`);
    } catch (e) {
      console.log(`Token ${tokenId}: DOES NOT EXIST`);
    }
  }
}

main().catch(console.error);
