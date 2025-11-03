const hre = require("hardhat");

async function main() {
  console.log("\n🔍 Verifying v3 Contract Ownership\n");

  const FACTORY = "0x53503F191630c13A383038e430458C0Cb166C0fC";
  const ARENA = "0xb252402f0FEB98ca998d6dcE354DF7f22e809ed3";

  const factory = await hre.ethers.getContractAt("AgentFactory", FACTORY);
  const arena = await hre.ethers.getContractAt("Arena", ARENA);

  const factoryOwner = await factory.owner();
  const arenaOwner = await arena.owner();
  const arenaFactoryAddress = await arena.factory();

  console.log("📋 Configuration:");
  console.log("Factory address:", FACTORY);
  console.log("Arena address:  ", ARENA);
  console.log();

  console.log("👥 Ownership:");
  console.log("Factory owner:        ", factoryOwner);
  console.log("Arena owner:          ", arenaOwner);
  console.log();

  console.log("🔗 Arena Config:");
  console.log("Arena.factory points to:", arenaFactoryAddress);
  console.log();

  console.log("✅ Verification:");
  console.log("Factory owned by Arena?      ", factoryOwner.toLowerCase() === ARENA.toLowerCase() ? "YES ✅" : "NO ❌");
  console.log("Arena points to v3 Factory?  ", arenaFactoryAddress.toLowerCase() === FACTORY.toLowerCase() ? "YES ✅" : "NO ❌");
  console.log();

  if (factoryOwner.toLowerCase() !== ARENA.toLowerCase()) {
    console.log("❌ PROBLEM: Factory is NOT owned by Arena!");
    console.log("   Factory owner:", factoryOwner);
    console.log("   Expected:     ", ARENA);
  } else if (arenaFactoryAddress.toLowerCase() !== FACTORY.toLowerCase()) {
    console.log("❌ PROBLEM: Arena points to wrong Factory!");
    console.log("   Arena.factory:", arenaFactoryAddress);
    console.log("   Expected:     ", FACTORY);
  } else {
    console.log("🎉 ALL CHECKS PASSED! Configuration is correct!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
