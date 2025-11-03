const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("\n🔄 Upgrading Arena with deployer:", deployer.address);

  // Get existing contract addresses
  const FACTORY_ADDRESS = "0x8083ee36D34A4079087a1fC02c2F7f790838180e";
  const ORACLE_ADDRESS = "0xD46C9A11D7331CCf4858272df6744bA6585B9230";
  const ENGINE_SIGNER = "0xD2aA21AF4faa840Dea890DB2C6649AACF2C80Ff3";

  // Deploy new Arena
  console.log("\nDeploying new Arena...");
  const Arena = await hre.ethers.getContractFactory("Arena");
  const arena = await Arena.deploy(FACTORY_ADDRESS, ORACLE_ADDRESS, ENGINE_SIGNER);
  await arena.deployed();
  console.log("✅ New Arena deployed to:", arena.address);

  // Transfer Factory ownership to new Arena
  console.log("\nTransferring Factory ownership to new Arena...");
  const factory = await hre.ethers.getContractAt("AgentFactory", FACTORY_ADDRESS);
  const currentOwner = await factory.owner();
  console.log("Current Factory owner:", currentOwner);
  
  if (currentOwner.toLowerCase() === deployer.address.toLowerCase()) {
    await factory.transferOwnership(arena.address);
    console.log("✅ Ownership transferred to new Arena");
  } else {
    console.log("⚠️  Factory owned by old Arena. Need to transfer from old contract first.");
    console.log("   Old Arena:", currentOwner);
  }

  console.log("\n📋 Updated Contract Addresses:");
  console.log("AgentFactory:", FACTORY_ADDRESS, "(unchanged)");
  console.log("Arena:", arena.address, "(NEW - update frontend!)");
  console.log("EcoOracle:", ORACLE_ADDRESS, "(unchanged)");
  console.log("RewardDistributor: 0xBC18017eC5632BbBD47d420D6e16d3686186Bd50 (unchanged)");

  console.log("\n⚠️  ACTION REQUIRED:");
  console.log("Update frontend/src/config/wagmi.js:");
  console.log(`Arena: '${arena.address}',`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
