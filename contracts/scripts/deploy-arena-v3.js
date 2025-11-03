const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("\n🚀 Deploying Arena v3 with CORRECT Factory");
  console.log("Deployer:", deployer.address);

  // Use the NEW Factory that was deployed in transfer-ownership.js
  const NEW_FACTORY = "0x06AFec66C33Bd135770c0857C77b24B9B6a4a0d8";
  const ORACLE = "0xD46C9A11D7331CCf4858272df6744bA6585B9230";
  const ENGINE_SIGNER = "0xD2aA21AF4faa840Dea890DB2C6649AACF2C80Ff3";

  // Deploy Arena v3
  console.log("\nDeploying Arena v3...");
  const Arena = await hre.ethers.getContractFactory("Arena");
  const arena = await Arena.deploy(NEW_FACTORY, ORACLE, ENGINE_SIGNER);
  await arena.deployed();
  console.log("✅ Arena v3 deployed to:", arena.address);

  // Transfer Factory ownership from deployer to new Arena
  console.log("\nTransferring Factory ownership to Arena v3...");
  const factory = await hre.ethers.getContractAt("AgentFactory", NEW_FACTORY);
  const currentOwner = await factory.owner();
  console.log("Current Factory owner:", currentOwner);

  if (currentOwner.toLowerCase() === deployer.address.toLowerCase()) {
    const tx = await factory.transferOwnership(arena.address);
    await tx.wait();
    console.log("✅ Factory ownership transferred to Arena v3");
  } else if (currentOwner.toLowerCase() === arena.address.toLowerCase()) {
    console.log("✅ Factory already owned by Arena v3");
  } else {
    // Factory is owned by old Arena - we need to take it back first
    console.log("⚠️  Factory owned by:", currentOwner);
    console.log("   Attempting to reclaim ownership...");
    
    const oldArena = await hre.ethers.getContractAt("Arena", currentOwner);
    try {
      // Try to transfer from old Arena (won't work without a function)
      console.log("❌ Cannot transfer from old Arena - no setFactory function");
      console.log("\n💡 Solution: Deploy ANOTHER new Factory!");
      
      const AgentFactory = await hre.ethers.getContractFactory("AgentFactory");
      const newFactory = await AgentFactory.deploy();
      await newFactory.deployed();
      console.log("✅ Fresh AgentFactory deployed to:", newFactory.address);
      
      // Transfer new factory to Arena v3
      await newFactory.transferOwnership(arena.address);
      console.log("✅ Fresh Factory ownership transferred to Arena v3");
      
      console.log("\n📋 FINAL DEPLOYMENT (v3):");
      console.log("AgentFactory:", newFactory.address, "<-- USE THIS ONE!");
      console.log("Arena:", arena.address);
      console.log("EcoOracle:", ORACLE);
      console.log("RewardDistributor: 0xBC18017eC5632BbBD47d420D6e16d3686186Bd50");
      
      console.log("\n⚠️  UPDATE FRONTEND wagmi.js:");
      console.log(`AgentFactory: '${newFactory.address}',`);
      console.log(`Arena: '${arena.address}',`);
      
      return;
    } catch (e) {
      console.error("Error:", e.message);
    }
  }

  // Verify ownership
  const finalOwner = await factory.owner();
  console.log("\n✅ Final Factory owner:", finalOwner);
  console.log("✅ Arena address:", arena.address);
  console.log("✅ Match?", finalOwner.toLowerCase() === arena.address.toLowerCase());

  console.log("\n📋 FINAL DEPLOYMENT (v3):");
  console.log("AgentFactory:", NEW_FACTORY);
  console.log("Arena:", arena.address);
  console.log("EcoOracle:", ORACLE);
  console.log("RewardDistributor: 0xBC18017eC5632BbBD47d420D6e16d3686186Bd50");

  console.log("\n⚠️  UPDATE FRONTEND wagmi.js:");
  console.log(`Arena: '${arena.address}',`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
