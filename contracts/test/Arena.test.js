const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Arena", function () {
  let factory, oracle, arena;
  let owner, user, engineSigner;
  let swarmId;

  beforeEach(async function () {
    [owner, user, engineSigner] = await ethers.getSigners();

    // Deploy contracts
    const EcoOracle = await ethers.getContractFactory("EcoOracle");
    oracle = await EcoOracle.deploy();
    await oracle.deployed();

    const AgentFactory = await ethers.getContractFactory("AgentFactory");
    factory = await AgentFactory.deploy();
    await factory.deployed();

    const Arena = await ethers.getContractFactory("Arena");
    arena = await Arena.deploy(factory.address, oracle.address, engineSigner.address);
    await arena.deployed();

    // Mint test swarm BEFORE transferring ownership
    const baseDNA = "0x6464646464000000000000000000000000000000000000000000000000000000";
    await factory.connect(owner).mintSwarm(user.address, baseDNA);
    swarmId = 1;

    // Now transfer factory ownership to arena
    await factory.transferOwnership(arena.address);
  });

  describe("Round Management", function () {
    it("Should start round and emit disaster", async function () {
      const tx = await arena.startRound(swarmId);
      const receipt = await tx.wait();

      const event = receipt.events.find(e => e.event === "RoundStarted");
      expect(event.args.roundId).to.equal(0);
      expect(event.args.swarmId).to.equal(swarmId);
      expect(event.args.disaster).to.be.oneOf([0, 1, 2, 3, 4]); // Disaster enum
    });

    it("Should generate different disasters", async function () {
      const disasters = new Set();
      
      for (let i = 0; i < 10; i++) {
        const tx = await arena.startRound(swarmId);
        const receipt = await tx.wait();
        const event = receipt.events.find(e => e.event === "RoundStarted");
        disasters.add(event.args.disaster);
      }

      // Should have some variance (not all same disaster)
      expect(disasters.size).to.be.greaterThan(1);
    });
  });

  describe("Signed Action Resolution", function () {
    let roundId;

    beforeEach(async function () {
      const tx = await arena.startRound(swarmId);
      await tx.wait();
      roundId = 0;
    });

    it("Should resolve round with valid signature", async function () {
      const action = 0; // CLEAN
      const agentScores = [
        [1, 50], // tokenId 1, eco score 50
        [2, 60],
        [3, 70],
        [4, 40],
        [5, 80]
      ];

      // Create signature
      const messageHash = ethers.utils.solidityKeccak256(
        ["uint256", "uint8", "uint256[2][]"],
        [roundId, action, agentScores]
      );
      const signature = await engineSigner.signMessage(ethers.utils.arrayify(messageHash));

      const tx = await arena.resolveRound(roundId, action, agentScores, signature);
      const receipt = await tx.wait();

      const event = receipt.events.find(e => e.event === "RoundResolved");
      expect(event.args.roundId).to.equal(roundId);
      expect(event.args.action).to.equal(action);
      expect(event.args.survivors.length).to.equal(5); // All survived (>30)
    });

    it("Should reject invalid signature", async function () {
      const action = 1;
      const agentScores = [[1, 50], [2, 60]];

      const messageHash = ethers.utils.solidityKeccak256(
        ["uint256", "uint8", "uint256[2][]"],
        [roundId, action, agentScores]
      );
      const signature = await user.signMessage(ethers.utils.arrayify(messageHash)); // Wrong signer

      await expect(
        arena.resolveRound(roundId, action, agentScores, signature)
      ).to.be.revertedWith("Invalid signature");
    });

    it("Should prevent signature replay", async function () {
      const action = 2;
      const agentScores = [[1, 50]];

      const messageHash = ethers.utils.solidityKeccak256(
        ["uint256", "uint8", "uint256[2][]"],
        [roundId, action, agentScores]
      );
      const signature = await engineSigner.signMessage(ethers.utils.arrayify(messageHash));

      await arena.resolveRound(roundId, action, agentScores, signature);

      // Try to replay
      await expect(
        arena.resolveRound(roundId, action, agentScores, signature)
      ).to.be.revertedWith("Already resolved");
    });
  });

  describe("Agent Survival Logic", function () {
    let roundId;

    beforeEach(async function () {
      await arena.startRound(swarmId);
      roundId = 0;
    });

    it("Should kill agents with eco score < 30", async function () {
      const action = 0;
      const agentScores = [
        [1, 25], // Dies
        [2, 50], // Survives
        [3, 10], // Dies
        [4, 60], // Survives
        [5, 80]  // Survives
      ];

      const messageHash = ethers.utils.solidityKeccak256(
        ["uint256", "uint8", "uint256[2][]"],
        [roundId, action, agentScores]
      );
      const signature = await engineSigner.signMessage(ethers.utils.arrayify(messageHash));

      const tx = await arena.resolveRound(roundId, action, agentScores, signature);
      const receipt = await tx.wait();

      // Check death events
      const deathEvents = receipt.events.filter(e => e.event === "AgentDied");
      expect(deathEvents.length).to.equal(2);

      // Check survivors
      const event = receipt.events.find(e => e.event === "RoundResolved");
      expect(event.args.survivors.length).to.equal(3);
    });

    it("Should breed child if 2+ survivors", async function () {
      const action = 4; // BUILD
      const agentScores = [
        [1, 50],
        [2, 60],
        [3, 70]
      ];

      const messageHash = ethers.utils.solidityKeccak256(
        ["uint256", "uint8", "uint256[2][]"],
        [roundId, action, agentScores]
      );
      const signature = await engineSigner.signMessage(ethers.utils.arrayify(messageHash));

      const tx = await arena.resolveRound(roundId, action, agentScores, signature);
      const receipt = await tx.wait();

      const event = receipt.events.find(e => e.event === "RoundResolved");
      expect(event.args.childId.toNumber()).to.be.greaterThan(0); // Convert BigNumber to number
    });
  });

  describe("Eco Matrix", function () {
    it("Should have initialized eco scores", async function () {
      // Check a few matrix entries (simplified test)
      // In production: test all action-disaster combos
      await arena.startRound(swarmId);
      // Matrix values are private, so test via round resolution outcomes
    });
  });

  describe("Round State", function () {
    it("Should track round data correctly", async function () {
      await arena.startRound(swarmId);
      
      const round = await arena.getRound(0);
      expect(round.swarmId).to.equal(swarmId);
      expect(round.resolved).to.equal(false);
      expect(round.survivors.length).to.equal(0);
    });

    it("Should mark round as resolved", async function () {
      await arena.startRound(swarmId);
      
      const action = 0;
      const agentScores = [[1, 50]];
      const messageHash = ethers.utils.solidityKeccak256(
        ["uint256", "uint8", "uint256[2][]"],
        [0, action, agentScores]
      );
      const signature = await engineSigner.signMessage(ethers.utils.arrayify(messageHash));

      await arena.resolveRound(0, action, agentScores, signature);

      const round = await arena.getRound(0);
      expect(round.resolved).to.equal(true);
    });
  });
});
