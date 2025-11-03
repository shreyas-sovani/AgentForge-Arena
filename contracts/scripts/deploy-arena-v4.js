const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("\n🚀 Deploying Arena v4 - FINAL FIX");
  console.log("Deployer:", deployer.address);

  // Use the CORRECT Factory v3 that we deployed
  const FACTORY_V3 = "0x53503F191630c13A383038e430458C0Cb166C0fC";
  const ORACLE = "0xD46C9A11D7331CCf4858272df6744bA6585B9230";
  const ENGINE_SIGNER = "0xD2aA21AF4faa840Dea890DB2C6649AACF2C80Ff3";

  console.log("\n📋 Using contracts:");
  console.log("Factory:", FACTORY_V3);
  console.log("Oracle: ", ORACLE);
  console.log("Signer: ", ENGINE_SIGNER);

  // Deploy Arena v4 with CORRECT Factory address
  console.log("\nDeploying Arena v4...");
  const Arena = await hre.ethers.getContractFactory("Arena");
  const arena = await Arena.deploy(FACTORY_V3, ORACLE, ENGINE_SIGNER);
  await arena.deployed();
  console.log("✅ Arena v4 deployed to:", arena.address);

  // Transfer Factory ownership to Arena v4
  console.log("\nTransferring Factory ownership...");
  const factory = await hre.ethers.getContractAt("AgentFactory", FACTORY_V3);
  const currentOwner = await factory.owner();
  console.log("Current Factory owner:", currentOwner);

  if (currentOwner.toLowerCase() === deployer.address.toLowerCase()) {
    const tx = await factory.transferOwnership(arena.address);
    await tx.wait();
    console.log("✅ Ownership transferred from deployer to Arena v4");
  } else {
    // Factory is owned by old Arena v3, we can't transfer
    // We're stuck again... need to get ownership back first
    console.log("⚠️  Factory owned by old Arena v3");
    console.log("   Cannot transfer without calling from Arena v3");
    console.log();
    console.log("🔧 Let's check if we can renounce from v3...");
    
    const arenaV3 = await hre.ethers.getContractAt("Arena", currentOwner);
    const v3Owner = await arenaV3.owner();
    console.log("Arena v3 owner:", v3Owner);
    
    if (v3Owner.toLowerCase() === deployer.address.toLowerCase()) {
      console.log("✅ We own Arena v3! But Arena has no transferFactory function...");
      console.log();
      console.log("💡 SOLUTION: Arena.sol needs a setFactory() function!");
      console.log("   OR: We accept that v3 Factory is locked and deploy a NEW one");
      
      console.log("\n🆕 Deploying BRAND NEW Factory v4...");
      const AgentFactory = await hre.ethers.getContractFactory("AgentFactory");
      const newFactory = await AgentFactory.deploy();
      await newFactory.deployed();
      console.log("✅ Factory v4 deployed to:", newFactory.address);
      
      await newFactory.transferOwnership(arena.address);
      console.log("✅ Factory v4 ownership transferred to Arena v4");
      
      const verifyOwner = await newFactory.owner();
      const verifyFactoryInArena = await arena.factory();
      
      console.log("\n🔍 Final Verification:");
      console.log("Factory v4 owner:        ", verifyOwner);
      console.log("Arena v4 address:        ", arena.address);
      console.log("Arena v4.factory points to:", verifyFactoryInArena);
      console.log();
      console.log("Match?", verifyOwner.toLowerCase() === arena.address.toLowerCase() && 
                           verifyFactoryInArena.toLowerCase() === newFactory.address.toLowerCase() ? "YES ✅" : "NO ❌");
      
      console.log("\n📋 FINAL DEPLOYMENT (v4):");
      console.log("AgentFactory: " + newFactory.address);
      console.log("Arena:        " + arena.address);
      console.log("EcoOracle:    " + ORACLE);
      console.log("RewardDistributor: 0xBC18017eC5632BbBD47d420D6e16d3686186Bd50");
      
      console.log("\n⚠️  UPDATE FRONTEND wagmi.js:");
      console.log(`AgentFactory: '${newFactory.address}',`);
      console.log(`Arena: '${arena.address}',`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
