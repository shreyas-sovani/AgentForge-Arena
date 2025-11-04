const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n🚀 Deploying Arena v7 with Rewards System...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying from:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.utils.formatEther(balance), "STT\n");

  // Deploy EcoOracle
  console.log("1️⃣  Deploying EcoOracle...");
  const EcoOracle = await ethers.getContractFactory("EcoOracle");
  const oracle = await EcoOracle.deploy();
  await oracle.deployed();
  const oracleAddress = oracle.address;
  console.log("✅ EcoOracle:", oracleAddress);

  // Deploy AgentFactory
  console.log("\n2️⃣  Deploying AgentFactory...");
  const AgentFactory = await ethers.getContractFactory("AgentFactory");
  const factory = await AgentFactory.deploy();
  await factory.deployed();
  const factoryAddress = factory.address;
  console.log("✅ AgentFactory:", factoryAddress);

  // Deploy RewardDistributor
  console.log("\n3️⃣  Deploying RewardDistributor...");
  const RewardDistributor = await ethers.getContractFactory("RewardDistributor");
  const rewards = await RewardDistributor.deploy();
  await rewards.deployed();
  const rewardsAddress = rewards.address;
  console.log("✅ RewardDistributor:", rewardsAddress);

  // Get engine signer address from .env
  const enginePrivateKey = process.env.ENGINE_PRIVATE_KEY;
  const engineWallet = new ethers.Wallet(enginePrivateKey);
  const engineSigner = engineWallet.address;
  console.log("\n🔑 Engine Signer:", engineSigner);

  // Deploy Arena with all dependencies
  console.log("\n4️⃣  Deploying Arena v7...");
  const Arena = await ethers.getContractFactory("Arena");
  const arena = await Arena.deploy(
    factoryAddress,
    oracleAddress,
    engineSigner,
    rewardsAddress
  );
  await arena.deployed();
  const arenaAddress = arena.address;
  console.log("✅ Arena v7:", arenaAddress);

  // Transfer Factory ownership to Arena
  console.log("\n5️⃣  Transferring Factory ownership...");
  const tx1 = await factory.transferOwnership(arenaAddress);
  await tx1.wait();
  console.log("✅ Factory now owned by Arena");

  // Transfer RewardDistributor ownership to Arena
  console.log("\n6️⃣  Transferring RewardDistributor ownership...");
  const tx2 = await rewards.transferOwnership(arenaAddress);
  await tx2.wait();
  console.log("✅ RewardDistributor now owned by Arena");

  // Fund RewardDistributor with 5 STT (enough for 10 winners)
  console.log("\n7️⃣  Funding RewardDistributor...");
  const fundAmount = ethers.utils.parseEther("5.0"); // 5 STT
  const tx3 = await deployer.sendTransaction({
    to: rewardsAddress,
    value: fundAmount
  });
  await tx3.wait();
  console.log("✅ Funded with 5 STT (10 rewards of 0.5 STT each)");

  // Verify ownership
  console.log("\n8️⃣  Verifying ownership...");
  const factoryOwner = await factory.owner();
  const rewardsOwner = await rewards.owner();
  console.log("Factory owner:", factoryOwner);
  console.log("Rewards owner:", rewardsOwner);
  console.log("Arena address:", arenaAddress);
  
  if (factoryOwner === arenaAddress && rewardsOwner === arenaAddress) {
    console.log("✅ Ownership verified!");
  } else {
    console.log("❌ Ownership mismatch!");
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("📋 DEPLOYMENT SUMMARY (v7 - Rewards System)");
  console.log("=".repeat(80));
  console.log("AgentFactory:      ", factoryAddress);
  console.log("Arena v7:          ", arenaAddress);
  console.log("EcoOracle:         ", oracleAddress);
  console.log("RewardDistributor: ", rewardsAddress);
  console.log("Engine Signer:     ", engineSigner);
  console.log("=".repeat(80));
  console.log("\n💰 Rewards Pool: 5 STT (10 winners @ 0.5 STT + NFT each)");
  console.log("\n🎯 Update frontend config with these addresses!");
  console.log("\n✅ Deployment complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
