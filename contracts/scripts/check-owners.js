const hre = require("hardhat");

async function main() {
  const addresses = {
    AgentFactory: "0x06AFec66C33Bd135770c0857C77b24B9B6a4a0d8",
    Arena: "0x3929D75e53C2Cd25A59489e20e7692783b236E33"
  };

  const AgentFactory = await hre.ethers.getContractAt("AgentFactory", addresses.AgentFactory);
  const Arena = await hre.ethers.getContractAt("Arena", addresses.Arena);

  console.log("\n🔍 Ownership Check:");
  console.log("=".repeat(60));
  
  const factoryOwner = await AgentFactory.owner();
  const arenaOwner = await Arena.owner();
  
  console.log("AgentFactory owner:", factoryOwner);
  console.log("Arena owner:       ", arenaOwner);
  console.log("Arena address:     ", addresses.Arena);
  console.log("\n✅ AgentFactory owned by Arena?", factoryOwner === addresses.Arena);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
