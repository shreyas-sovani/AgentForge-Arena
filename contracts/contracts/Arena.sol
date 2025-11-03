// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./AgentFactory.sol";
import "./EcoOracle.sol";

/**
 * @title Arena
 * @notice Manage battle rounds with signed LLM decisions
 */
contract Arena is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    enum Action { CLEAN, SHARE, HIDE, HOARD, BUILD }

    AgentFactory public factory;
    EcoOracle public oracle;
    
    // Engine signer address (verifies LLM outputs)
    address public engineSigner;

    // Round tracking
    struct Round {
        uint256 swarmId;
        EcoOracle.Disaster disaster;
        uint256 startTime;
        bool resolved;
        uint256[] survivors;
        uint256 childId; // Bred agent
    }

    mapping(uint256 => Round) public rounds;
    uint256 public roundCounter;

    // Eco score matrix: [Action][Disaster] -> score modifier
    mapping(Action => mapping(EcoOracle.Disaster => int8)) public ecoMatrix;

    // Prevent replay attacks
    mapping(bytes32 => bool) public usedSignatures;

    event RoundStarted(
        uint256 indexed roundId,
        uint256 indexed swarmId,
        EcoOracle.Disaster disaster,
        bytes32 disasterHash
    );

    event RoundResolved(
        uint256 indexed roundId,
        Action action,
        uint256[] survivors,
        uint256 childId
    );

    event AgentDied(uint256 indexed tokenId, uint256 indexed roundId, uint8 finalEcoScore);

    constructor(
        address _factory,
        address _oracle,
        address _engineSigner
    ) {
        factory = AgentFactory(_factory);
        oracle = EcoOracle(_oracle);
        engineSigner = _engineSigner;

        // Initialize eco matrix (hardcoded for demo)
        _initEcoMatrix();
    }

    function _initEcoMatrix() private {
        // CLEAN
        ecoMatrix[Action.CLEAN][EcoOracle.Disaster.POLLUTION] = 30;
        ecoMatrix[Action.CLEAN][EcoOracle.Disaster.FIRE] = 10;
        ecoMatrix[Action.CLEAN][EcoOracle.Disaster.FLOOD] = -10;
        
        // SHARE
        ecoMatrix[Action.SHARE][EcoOracle.Disaster.DROUGHT] = 25;
        ecoMatrix[Action.SHARE][EcoOracle.Disaster.STORM] = 15;
        
        // HIDE
        ecoMatrix[Action.HIDE][EcoOracle.Disaster.FIRE] = 20;
        ecoMatrix[Action.HIDE][EcoOracle.Disaster.STORM] = 20;
        ecoMatrix[Action.HIDE][EcoOracle.Disaster.FLOOD] = -20;
        
        // HOARD
        ecoMatrix[Action.HOARD][EcoOracle.Disaster.DROUGHT] = -15;
        ecoMatrix[Action.HOARD][EcoOracle.Disaster.POLLUTION] = -10;
        
        // BUILD
        ecoMatrix[Action.BUILD][EcoOracle.Disaster.FLOOD] = 25;
        ecoMatrix[Action.BUILD][EcoOracle.Disaster.FIRE] = 20;
        ecoMatrix[Action.BUILD][EcoOracle.Disaster.STORM] = 15;
    }

    /**
     * @notice Start new round (manual or Gelato)
     * @param swarmId Swarm to battle
     * @dev Removed onlyOwner for demo - anyone can start rounds
     */
    function startRound(uint256 swarmId) external returns (uint256 roundId) {
        roundId = roundCounter++;

        // Generate disaster
        uint256 seed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            roundId
        )));
        EcoOracle.Disaster disaster = oracle.getDisaster(seed);

        rounds[roundId] = Round({
            swarmId: swarmId,
            disaster: disaster,
            startTime: block.timestamp,
            resolved: false,
            survivors: new uint256[](0),
            childId: 0
        });

        // Emit disaster hash for commit-reveal lite audit
        bytes32 disasterHash = keccak256(abi.encodePacked(disaster, roundId, block.timestamp));
        emit RoundStarted(roundId, swarmId, disaster, disasterHash);
    }

    /**
     * @notice Resolve round with signed LLM action
     * @param roundId Round to resolve
     * @param action LLM-chosen action
     * @param agentScores Array of [tokenId, newEcoScore] pairs
     * @param signature ECDSA sig from engine (keccak256(roundId, action, agentScores))
     */
    function resolveRound(
        uint256 roundId,
        Action action,
        uint256[2][] calldata agentScores, // [[tokenId, ecoScore], ...]
        bytes calldata signature
    ) external nonReentrant {
        Round storage round = rounds[roundId];
        require(!round.resolved, "Already resolved");

        // Verify signature
        bytes32 messageHash = keccak256(abi.encodePacked(roundId, uint8(action), agentScores));
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedHash.recover(signature);
        require(signer == engineSigner, "Invalid signature");
        require(!usedSignatures[ethSignedHash], "Signature replay");
        usedSignatures[ethSignedHash] = true;

        // Apply eco scores, kill weak agents
        uint256[] memory survivors = new uint256[](agentScores.length);
        uint256 survivorCount = 0;

        for (uint256 i = 0; i < agentScores.length; i++) {
            uint256 tokenId = agentScores[i][0];
            uint8 newEcoScore = uint8(agentScores[i][1]);

            if (newEcoScore < 30) {
                // Agent dies
                factory.burnAgent(tokenId);
                emit AgentDied(tokenId, roundId, newEcoScore);
            } else {
                // Update DNA eco score (simplify: just track survival)
                survivors[survivorCount++] = tokenId;
            }
        }

        // Trim survivors array
        assembly {
            mstore(survivors, survivorCount)
        }
        round.survivors = survivors;

        // Breed one child if 2+ survivors
        if (survivorCount >= 2) {
            uint256 parentA = survivors[0];
            uint256 parentB = survivors[1];
            round.childId = factory.breedAgent(
                factory.ownerOf(parentA),
                round.swarmId,
                parentA,
                parentB
            );
        }

        round.resolved = true;
        emit RoundResolved(roundId, action, survivors, round.childId);
    }

    /**
     * @notice Update engine signer
     */
    function setEngineSigner(address _signer) external onlyOwner {
        engineSigner = _signer;
    }

    /**
     * @notice Mint swarm (wrapper for testing)
     * @dev Removed onlyOwner for demo - anyone can mint swarms
     */
    function mintSwarm(address to, bytes32 baseDNA) external returns (uint256 swarmId) {
        return factory.mintSwarm(to, baseDNA);
    }

    /**
     * @notice Get round details
     */
    function getRound(uint256 roundId) external view returns (
        uint256 swarmId,
        EcoOracle.Disaster disaster,
        bool resolved,
        uint256[] memory survivors,
        uint256 childId
    ) {
        Round storage round = rounds[roundId];
        return (
            round.swarmId,
            round.disaster,
            round.resolved,
            round.survivors,
            round.childId
        );
    }
}
