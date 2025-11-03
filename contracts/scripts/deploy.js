const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying AgentForge Arena to Somnia Testnet...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString(), "\n");

  // Deploy EcoOracle
  console.log("Deploying EcoOracle...");
  const EcoOracle = await hre.ethers.getContractFactory("EcoOracle");
  const oracle = await EcoOracle.deploy();
  await oracle.deployed();
  console.log("✅ EcoOracle deployed to:", oracle.address);

  // Deploy AgentFactory
  console.log("\nDeploying AgentFactory...");
  const AgentFactory = await hre.ethers.getContractFactory("AgentFactory");
  const factory = await AgentFactory.deploy();
  await factory.deployed();
  console.log("✅ AgentFactory deployed to:", factory.address);

  // Get engine signer address (from env or use deployer)
  const engineSigner = process.env.ENGINE_SIGNER_ADDRESS || deployer.address;
  console.log("\nUsing engine signer:", engineSigner);
  console.log("  (Note: Engine wallet is same as deployer for demo)");

  // Deploy Arena
  console.log("\nDeploying Arena...");
  const Arena = await hre.ethers.getContractFactory("Arena");
  const arena = await Arena.deploy(
    factory.address,
    oracle.address,
    engineSigner
  );
  await arena.deployed();
  console.log("✅ Arena deployed to:", arena.address);

  // Deploy RewardDistributor
  console.log("\nDeploying RewardDistributor...");
  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewards = await RewardDistributor.deploy();
  await rewards.deployed();
  console.log("✅ RewardDistributor deployed to:", rewards.address);

  // Grant Arena ownership of Factory
  console.log("\nTransferring AgentFactory ownership to Arena...");
  await factory.transferOwnership(arena.address);
  console.log("✅ Ownership transferred");

  // Fund RewardDistributor with 5 STT (for 10 claims at 0.5 STT each)
  console.log("\nFunding RewardDistributor with test STT...");
  const fundTx = await deployer.sendTransaction({
    to: rewards.address,
    value: hre.ethers.utils.parseEther("5")
  });
  await fundTx.wait();
  console.log("✅ Funded with 5 STT (supports 10 reward claims)");

  // Save deployed addresses
  const addresses = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    engineSigner: engineSigner,
    contracts: {
      EcoOracle: oracle.address,
      AgentFactory: factory.address,
      Arena: arena.address,
      RewardDistributor: rewards.address
    },
    timestamp: new Date().toISOString()
  };

  const outputPath = path.join(__dirname, "../deployed-addresses.json");
  fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
  console.log("\n📝 Deployed addresses saved to:", outputPath);

  console.log("\n🎉 DEPLOYMENT COMPLETE!\n");
  console.log("Next steps:");
  console.log("1. Add ENGINE_SIGNER_ADDRESS to .env if you haven't");
  console.log("2. Update frontend config with contract addresses");
  console.log("3. Verify contracts on explorer (optional)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
