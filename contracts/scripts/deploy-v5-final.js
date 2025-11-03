const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("\n🎯 FINAL DEPLOYMENT - Arena v5 + Factory v5");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.utils.formatEther(await deployer.getBalance()), "STT\n");

  const ORACLE = "0xD46C9A11D7331CCf4858272df6744bA6585B9230";
  const ENGINE_SIGNER = "0xD2aA21AF4faa840Dea890DB2C6649AACF2C80Ff3";

  // Step 1: Deploy Factory v5 FIRST
  console.log("Step 1: Deploying Factory v5...");
  const AgentFactory = await hre.ethers.getContractFactory("AgentFactory");
  const factory = await AgentFactory.deploy();
  await factory.deployed();
  console.log("✅ Factory v5:", factory.address);

  // Step 2: Deploy Arena v5 pointing to Factory v5
  console.log("\nStep 2: Deploying Arena v5...");
  const Arena = await hre.ethers.getContractFactory("Arena");
  const arena = await Arena.deploy(factory.address, ORACLE, ENGINE_SIGNER);
  await arena.deployed();
  console.log("✅ Arena v5:", arena.address);

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
  console.log("✅ Arena points to v5 Factory?  ", pointerCorrect ? "YES ✅" : "NO ❌");

  if (ownershipCorrect && pointerCorrect) {
    console.log("\n🎉 SUCCESS! All checks passed!");
  } else {
    console.log("\n❌ VERIFICATION FAILED!");
    process.exit(1);
  }

  console.log("\n" + "=".repeat(70));
  console.log("📋 FINAL CONTRACT ADDRESSES (v5):");
  console.log("=".repeat(70));
  console.log("AgentFactory:      " + factory.address);
  console.log("Arena:             " + arena.address);
  console.log("EcoOracle:         " + ORACLE);
  console.log("RewardDistributor: 0xBC18017eC5632BbBD47d420D6e16d3686186Bd50");
  console.log("=".repeat(70));

  console.log("\n⚠️  UPDATE FRONTEND /frontend/src/config/wagmi.js:");
  console.log(`AgentFactory: '${factory.address}',`);
  console.log(`Arena: '${arena.address}',`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
