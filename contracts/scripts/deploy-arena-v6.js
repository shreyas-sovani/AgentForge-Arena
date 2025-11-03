const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("\n🎯 FULL v6 DEPLOYMENT - New Factory + Arena (resolveRound accessible)");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.utils.formatEther(await deployer.getBalance()), "STT\n");

  const ORACLE = "0xD46C9A11D7331CCf4858272df6744bA6585B9230";
  const ENGINE_SIGNER = "0xD2aA21AF4faa840Dea890DB2C6649AACF2C80Ff3";

  // Step 1: Deploy new Factory v6
  console.log("Step 1: Deploying Factory v6...");
  const AgentFactory = await hre.ethers.getContractFactory("AgentFactory");
  const factory = await AgentFactory.deploy();
  await factory.deployed();
  console.log("✅ Factory v6:", factory.address);

  // Step 2: Deploy Arena v6 pointing to Factory v6
  console.log("\nStep 2: Deploying Arena v6...");
  const Arena = await hre.ethers.getContractFactory("Arena");
  const arena = await Arena.deploy(factory.address, ORACLE, ENGINE_SIGNER);
  await arena.deployed();
  console.log("✅ Arena v6:", arena.address);

  // Step 3: Transfer Factory ownership to Arena
  console.log("\nStep 3: Transferring Factory ownership to Arena...");
  const tx = await factory.transferOwnership(arena.address);
  await tx.wait();
  console.log("✅ Ownership transferred");

  // Step 4: Verify everything
  console.log("\n🔍 VERIFICATION:");
  const factoryOwner = await factory.owner();
  const arenaOwner = await arena.owner();
  const arenaFactoryAddr = await arena.factory();

  console.log("Factory owner:           ", factoryOwner);
  console.log("Arena address:           ", arena.address);
  console.log("Arena owner:             ", arenaOwner);
  console.log("Arena.factory points to: ", arenaFactoryAddr);
  console.log();

  const ownershipCorrect = factoryOwner.toLowerCase() === arena.address.toLowerCase();
  const pointerCorrect = arenaFactoryAddr.toLowerCase() === factory.address.toLowerCase();

  console.log("✅ Factory owned by Arena?      ", ownershipCorrect ? "YES ✅" : "NO ❌");
  console.log("✅ Arena points to v6 Factory?  ", pointerCorrect ? "YES ✅" : "NO ❌");

  if (ownershipCorrect && pointerCorrect) {
    console.log("\n🎉 SUCCESS! All checks passed!");
  } else {
    console.log("\n❌ VERIFICATION FAILED!");
    process.exit(1);
  }

  console.log("\n" + "=".repeat(70));
  console.log("📋 FINAL CONTRACT ADDRESSES (v6):");
  console.log("=".repeat(70));
  console.log("AgentFactory:      " + factory.address);
  console.log("Arena:             " + arena.address);
  console.log("EcoOracle:         " + ORACLE);
  console.log("RewardDistributor: 0xBC18017eC5632BbBD47d420D6e16d3686186Bd50");
  console.log("=".repeat(70));

  console.log("\n⚠️  UPDATE FRONTEND /frontend/src/config/wagmi.js:");
  console.log(`AgentFactory: '${factory.address}',`);
  console.log(`Arena: '${arena.address}',  // v6 - resolveRound accessible to engine`);
  
  console.log("\n⚠️  UPDATE AUTO-RESOLVER /engine/auto-resolver.js:");
  console.log(`const ARENA_ADDRESS = '${arena.address}'`);
  console.log(`const FACTORY_ADDRESS = '${factory.address}'`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
