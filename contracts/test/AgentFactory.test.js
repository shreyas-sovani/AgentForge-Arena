const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentFactory", function () {
  let factory;
  let owner, user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    
    const AgentFactory = await ethers.getContractFactory("AgentFactory");
    factory = await AgentFactory.deploy();
    await factory.deployed();
  });

  describe("Swarm Minting", function () {
    it("Should mint 5 agents with mutated DNA", async function () {
      const baseDNA = "0x6464646464000000000000000000000000000000000000000000000000000000"; // [100,100,100,100,...]
      
      const tx = await factory.mintSwarm(user.address, baseDNA);
      const receipt = await tx.wait();

      // Check 5 AgentBorn events
      const events = receipt.events.filter(e => e.event === "AgentBorn");
      expect(events.length).to.equal(5);

      // Verify owner
      const balance = await factory.balanceOf(user.address);
      expect(balance).to.equal(5);

      // Check DNA storage
      const tokenId = 1;
      const dna = await factory.agentDNA(tokenId);
      expect(dna).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
    });

    it("Should track swarms correctly", async function () {
      const baseDNA = "0x5050505050000000000000000000000000000000000000000000000000000000";
      await factory.mintSwarm(user.address, baseDNA);

      const swarmAgents = await factory.getSwarmAgents(1);
      expect(swarmAgents.length).to.equal(5);
      expect(swarmAgents[0]).to.equal(1);
      expect(swarmAgents[4]).to.equal(5);
    });
  });

  describe("Breeding", function () {
    beforeEach(async function () {
      const baseDNA = "0x6464646464000000000000000000000000000000000000000000000000000000";
      await factory.mintSwarm(user.address, baseDNA);
    });

    it("Should breed child from two parents", async function () {
      const tx = await factory.breedAgent(user.address, 1, 1, 2);
      const receipt = await tx.wait();

      const event = receipt.events.find(e => e.event === "AgentBorn");
      expect(event.args.tokenId).to.equal(6); // 5 initial + 1 child

      const childDNA = await factory.agentDNA(6);
      expect(childDNA).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
    });

    it("Should add child to swarm", async function () {
      await factory.breedAgent(user.address, 1, 1, 2);
      
      const swarmAgents = await factory.getSwarmAgents(1);
      expect(swarmAgents.length).to.equal(6);
      expect(swarmAgents[5]).to.equal(6);
    });
  });

  describe("DNA Evolution", function () {
    it("Should update agent DNA", async function () {
      const baseDNA = "0x6464646464000000000000000000000000000000000000000000000000000000";
      await factory.mintSwarm(user.address, baseDNA);

      const oldDNA = await factory.agentDNA(1);
      const newDNA = "0x5050505050000000000000000000000000000000000000000000000000000000";

      const tx = await factory.evolveDNA(1, newDNA);
      await expect(tx).to.emit(factory, "AgentEvolved").withArgs(1, oldDNA, newDNA);

      const updatedDNA = await factory.agentDNA(1);
      expect(updatedDNA).to.equal(newDNA);
    });
  });

  describe("Agent Death", function () {
    it("Should burn agent and delete DNA", async function () {
      const baseDNA = "0x6464646464000000000000000000000000000000000000000000000000000000";
      await factory.mintSwarm(user.address, baseDNA);

      await factory.burnAgent(1);

      await expect(factory.ownerOf(1)).to.be.reverted; // Changed from specific message
      
      const dna = await factory.agentDNA(1);
      expect(dna).to.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
    });
  });

  describe("Genetics Library", function () {
    it("Should unpack DNA traits correctly", async function () {
      const baseDNA = "0x6432140A00000000000000000000000000000000000000000000000000000000";
      await factory.mintSwarm(user.address, baseDNA);

      const traits = await factory.getAgentTraits(1);
      
      // Traits should be mutated from base but within range
      expect(traits[0]).to.be.lte(100);
      expect(traits[1]).to.be.lte(100);
      expect(traits[2]).to.be.lte(100);
      expect(traits[3]).to.be.lte(100);
    });
  });

  describe("Access Control", function () {
    it("Should only allow owner to mint", async function () {
      const baseDNA = "0x6464646464000000000000000000000000000000000000000000000000000000";
      
      await expect(
        factory.connect(user).mintSwarm(user.address, baseDNA)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
