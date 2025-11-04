/**
 * Fund the RewardDistributor contract with STT for rewards
 */
require("dotenv").config({ path: "../.env.local" });
const { ethers } = require("ethers");

async function main() {
  if (!process.env.PRIVATE_KEY && !process.env.ENGINE_PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY or ENGINE_PRIVATE_KEY not found in .env.local");
  }

  const REWARD_DISTRIBUTOR = "0xb08efB81517be0f9e3A83F50321dDB8d43304998";
  const FUNDING_AMOUNT = ethers.utils.parseEther("5.0"); // 5 STT = 10 rewards

  const provider = new ethers.providers.JsonRpcProvider("https://dream-rpc.somnia.network");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || process.env.ENGINE_PRIVATE_KEY, provider);
  
  console.log("\n💰 Funding RewardDistributor Contract");
  console.log("=====================================");
  console.log("Contract:", REWARD_DISTRIBUTOR);
  console.log("Amount:", ethers.utils.formatEther(FUNDING_AMOUNT), "STT");
  console.log("\nFunding from:", wallet.address);
  
  const balance = await wallet.getBalance();
  console.log("Wallet balance:", ethers.utils.formatEther(balance), "STT");

  // Check current RewardDistributor balance
  const currentBalance = await provider.getBalance(REWARD_DISTRIBUTOR);
  console.log("Current contract balance:", ethers.utils.formatEther(currentBalance), "STT");

  // Send STT to RewardDistributor
  console.log("\n📤 Sending transaction...");
  const tx = await wallet.sendTransaction({
    to: REWARD_DISTRIBUTOR,
    value: FUNDING_AMOUNT,
  });

  console.log("TX hash:", tx.hash);
  console.log("⏳ Waiting for confirmation...");
  
  await tx.wait();
  console.log("✅ Transaction confirmed!");

  // Check new balance
  const newBalance = await provider.getBalance(REWARD_DISTRIBUTOR);
  console.log("\n💎 New RewardDistributor balance:", ethers.utils.formatEther(newBalance), "STT");
  console.log("🎁 Can fund", newBalance.div(ethers.utils.parseEther("0.5")).toNumber(), "reward claims");

  console.log("\n✅ Done!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
