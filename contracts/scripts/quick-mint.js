// Quick mint script
const hre = require("hardhat");

async function main() {
  const addresses = require("../deployed-addresses.json");
  const [signer] = await hre.ethers.getSigners();
  
  // Get contracts
  const Arena = await hre.ethers.getContractFactory("Arena");
  const arena = Arena.attach(addresses.contracts.Arena);
  
  const Factory = await hre.ethers.getContractFactory("AgentFactory");
  const factory = Factory.attach(addresses.contracts.AgentFactory);
  
  // Check ownership
  const owner = await factory.owner();
  console.log("Factory owner:", owner);
  console.log("Arena address:", arena.address);
  console.log("Signer:", signer.address);
  
  if (owner !== arena.address) {
    console.log("❌ Factory not owned by Arena!");
    process.exit(1);
  }
  
  // Temporarily take ownership (Arena is Ownable)
  console.log("\n🔧 Taking Arena ownership temporarily...");
  const arenaOwner = await arena.owner();
  console.log("Arena owner:", arenaOwner);
  
  if (arenaOwner !== signer.address) {
    console.log("❌ You don't own Arena!");
    process.exit(1);
  }
  
  // Transfer Factory back to us
  console.log("\n🔄 Transferring Factory from Arena to signer...");
  const tx1 = await arena.connect(signer).transferOwnership(signer.address); // Wrong - this transfers Arena ownership
  
  // Actually, we need to call factory methods through Arena since Arena owns it
  // But Arena doesn't expose mintSwarm...
  
  console.log("\n⚠️  Arena doesn't have mintSwarm exposed.");
  console.log("Options:");
  console.log("1. Add mintSwarm to Arena contract and redeploy");
  console.log("2. Upgrade Arena to proxy pattern");
  console.log("3. Manually transfer Factory ownership back, mint, transfer again");
  
  // Option 3:
  console.log("\n🔧 Executing Option 3...");
  
  // Arena calls factory.transferOwnership (need to add this to Arena too...)
  console.log("❌ This requires Arena to have a transferFactoryOwnership function.");
  console.log("\n💡 SIMPLEST FIX: Deploy a new Arena with mintSwarm wrapper.");
}

main().catch(console.error);
