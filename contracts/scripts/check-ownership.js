const hre = require("hardhat");

async function main() {
  const FACTORY = "0xF258a2360333C65512aCB944C88f7831a8d5841e";
  const ARENA = "0x6a9DdcCc0Ea361d7F0d236a78Bc6992C0C629B38";

  const factory = await hre.ethers.getContractAt("AgentFactory", FACTORY);
  const arena = await hre.ethers.getContractAt("Arena", ARENA);

  console.log("\n🔍 CHECKING OWNERSHIP:");
  console.log("Factory address:", FACTORY);
  console.log("Arena address:  ", ARENA);
  console.log();

  const factoryOwner = await factory.owner();
  const arenaOwner = await arena.owner();
  const engineSigner = await arena.engineSigner();

  console.log("Factory owner:    ", factoryOwner);
  console.log("Arena owner:      ", arenaOwner);
  console.log("Engine signer:    ", engineSigner);
  console.log();

  console.log("Factory owned by Arena?", factoryOwner.toLowerCase() === ARENA.toLowerCase() ? "YES ✅" : "NO ❌");
  console.log("Expected engine signer:", "0xD2aA21AF4faa840Dea890DB2C6649AACF2C80Ff3");
  console.log("Engine signer correct?", engineSigner.toLowerCase() === "0xD2aA21AF4faa840Dea890DB2C6649AACF2C80Ff3".toLowerCase() ? "YES ✅" : "NO ❌");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
