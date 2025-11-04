require("dotenv").config({ path: "../.env.local" });
const { ethers } = require("ethers");

async function main() {
  if (!process.env.PRIVATE_KEY && !process.env.ENGINE_PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY or ENGINE_PRIVATE_KEY not found in .env.local");
  }
  
  const provider = new ethers.providers.JsonRpcProvider("https://dream-rpc.somnia.network");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || process.env.ENGINE_PRIVATE_KEY, provider);
  console.log("Approving Arena with account:", wallet.address);

  const factoryAddress = "0xB973F366ce7e5bEed8AB275c30d30cE568F31792";
  const arenaAddress = "0x5C5e24ed6a89Aa6c5e86e5B47564dbc61E3B85d9";

  const FactoryABI = require("../artifacts/contracts/AgentFactory.sol/AgentFactory.json").abi;
  const factory = new ethers.Contract(factoryAddress, FactoryABI, wallet);

  // Check current approval status
  const isApproved = await factory.isApprovedForAll(wallet.address, arenaAddress);
  console.log("Currently approved:", isApproved);

  if (!isApproved) {
    console.log("Approving Arena to manage all NFTs...");
    const tx = await factory.setApprovalForAll(arenaAddress, true);
    console.log("Transaction sent:", tx.hash);
    await tx.wait();
    console.log("✅ Arena approved!");
  } else {
    console.log("✅ Already approved!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
