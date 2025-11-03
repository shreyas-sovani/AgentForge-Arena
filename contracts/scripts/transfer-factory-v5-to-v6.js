const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("\n🔄 Transferring Factory ownership: v5 Arena → v6 Arena");
  console.log("Signer:", signer.address);

  const FACTORY_V5 = "0xae44851D45781617138a56F450E39ae601f3f30B";
  const ARENA_V5 = "0xD74466064Ff07f59FdDFFaF40fDe240B8774209D";
  const ARENA_V6 = "0xc9e9158020344c8027b443446cA8c4F98D097D95";

  // Attach to Arena v5 (which currently owns the Factory)
  const ArenaV5 = await hre.ethers.getContractFactory("Arena");
  const arenaV5 = ArenaV5.attach(ARENA_V5);

  // Check current Arena v5 owner
  const v5Owner = await arenaV5.owner();
  console.log("Arena v5 owner:", v5Owner);
  console.log("Current signer:", signer.address);

  if (v5Owner.toLowerCase() !== signer.address.toLowerCase()) {
    console.log("\n❌ ERROR: You are not the owner of Arena v5!");
    console.log("Arena v5 owner:", v5Owner);
    console.log("Your address:",  signer.address);
    console.log("\nCannot transfer Factory ownership.");
    process.exit(1);
  }

  // Attach to Factory
  const AgentFactory = await hre.ethers.getContractFactory("AgentFactory");
  const factory = AgentFactory.attach(FACTORY_V5);

  console.log("\n📋 Current state:");
  console.log("Factory owner:", await factory.owner());
  console.log("Target: Arena v6:", ARENA_V6);

  // Arena v5 owns Factory, so we need Arena v5 to call factory.transferOwnership
  // But Arena doesn't have a transferFactoryOwnership function!
  // This means we need to add a function to Arena or deploy differently

  console.log("\n❌ Problem: Arena v5 owns Factory, but Arena contract doesn't have");
  console.log("   a function to transfer Factory ownership to another address!");
  console.log("\nSolution: Need to redeploy Factory + Arena together as v6.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
