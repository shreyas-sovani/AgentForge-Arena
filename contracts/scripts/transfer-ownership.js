const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("\n🔄 Transferring Factory ownership...");

  const OLD_ARENA = "0xC98Ea0972774F69c7b6E543a6D7005103D4bF91D";
  const NEW_ARENA = "0x3929D75e53C2Cd25A59489e20e7692783b236E33";
  const FACTORY = "0x8083ee36D34A4079087a1fC02c2F7f790838180e";

  // Get old Arena contract
  const oldArena = await hre.ethers.getContractAt("Arena", OLD_ARENA);
  
  // Check if deployer is owner of old Arena
  const oldArenaOwner = await oldArena.owner();
  console.log("Old Arena owner:", oldArenaOwner);
  console.log("Deployer:", deployer.address);
  
  if (oldArenaOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log("❌ Deployer is not owner of old Arena. Cannot transfer.");
    return;
  }

  // Get Factory
  const factory = await hre.ethers.getContractAt("AgentFactory", FACTORY);
  const factoryOwner = await factory.owner();
  console.log("Current Factory owner:", factoryOwner);

  if (factoryOwner.toLowerCase() === NEW_ARENA.toLowerCase()) {
    console.log("✅ Factory already owned by new Arena!");
    return;
  }

  // Old Arena needs to transfer Factory ownership
  // But we can't call factory.transferOwnership from old Arena unless
  // old Arena has a function to do it. Let's check:
  
  console.log("\n⚠️  Problem: Factory is owned by old Arena contract.");
  console.log("   Old Arena doesn't have a function to transfer Factory ownership.");
  console.log("\n💡 Solution: Deploy completely new Factory instead!");
  
  // Deploy new Factory
  console.log("\nDeploying new AgentFactory...");
  const AgentFactory = await hre.ethers.getContractFactory("AgentFactory");
  const newFactory = await AgentFactory.deploy();
  await newFactory.deployed();
  console.log("✅ New AgentFactory deployed to:", newFactory.address);

  // Transfer new Factory to new Arena
  console.log("\nTransferring new Factory to new Arena...");
  await newFactory.transferOwnership(NEW_ARENA);
  console.log("✅ Ownership transferred");

  console.log("\n📋 FINAL Contract Addresses:");
  console.log("AgentFactory:", newFactory.address, "(NEW!)");
  console.log("Arena:", NEW_ARENA);
  console.log("EcoOracle:", "0xD46C9A11D7331CCf4858272df6744bA6585B9230");
  console.log("RewardDistributor:", "0xBC18017eC5632BbBD47d420D6e16d3686186Bd50");

  console.log("\n⚠️  UPDATE FRONTEND:");
  console.log(`AgentFactory: '${newFactory.address}',`);
  console.log(`Arena: '${NEW_ARENA}',`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
