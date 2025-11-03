// Deploy only updated Arena
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🔄 Redeploying Arena with mintSwarm wrapper...\n");

  const addresses = JSON.parse(fs.readFileSync(path.join(__dirname, "../deployed-addresses.json"), "utf8"));
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deployer:", deployer.address);
  console.log("Existing Factory:", addresses.contracts.AgentFactory);
  console.log("Existing Oracle:", addresses.contracts.EcoOracle);

  // Deploy new Arena
  const Arena = await hre.ethers.getContractFactory("Arena");
  const arena = await Arena.deploy(
    addresses.contracts.AgentFactory,
    addresses.contracts.EcoOracle,
    addresses.engineSigner
  );
  await arena.deployed();
  console.log("✅ New Arena deployed to:", arena.address);

  // Transfer Factory ownership to new Arena
  const Factory = await hre.ethers.getContractFactory("AgentFactory");
  const factory = Factory.attach(addresses.contracts.AgentFactory);
  
  const currentOwner = await factory.owner();
  console.log("\nFactory current owner:", currentOwner);
  
  if (currentOwner === addresses.contracts.Arena) {
    console.log("⚠️  Factory owned by old Arena. Need to recover ownership first.");
    console.log("This requires old Arena to have transferOwnership exposed...");
    console.log("\n❌ CANNOT PROCEED without manual intervention.");
    console.log("\n💡 Alternative: Deploy entirely new contracts (costs ~2 STT).");
  } else {
    console.log("\n✅ Transferring Factory to new Arena...");
    await factory.transferOwnership(arena.address);
    console.log("✅ Done!");
    
    // Update addresses file
    addresses.contracts.Arena = arena.address;
    addresses.timestamp = new Date().toISOString();
    fs.writeFileSync(
      path.join(__dirname, "../deployed-addresses.json"),
      JSON.stringify(addresses, null, 2)
    );
    console.log("\n📝 Updated deployed-addresses.json");
  }
}

main().catch(console.error);
