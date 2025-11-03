// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Genetics.sol";

/**
 * @title AgentFactory
 * @notice Mint AI agents as ERC721 NFTs with genetic DNA
 */
contract AgentFactory is ERC721, Ownable {
    using Genetics for bytes32;

    uint256 private _tokenIdCounter;
    
    // TokenId -> DNA mapping
    mapping(uint256 => bytes32) public agentDNA;
    
    // Swarm ID -> Token IDs (track swarms)
    mapping(uint256 => uint256[]) public swarms;
    uint256 public swarmCounter;

    event AgentBorn(
        uint256 indexed tokenId, 
        uint256 indexed swarmId, 
        bytes32 dna, 
        address owner
    );

    event AgentEvolved(
        uint256 indexed tokenId,
        bytes32 oldDNA,
        bytes32 newDNA
    );

    constructor() ERC721("AgentForge Agent", "AGENT") {
        _tokenIdCounter = 1;
        swarmCounter = 1;
    }

    /**
     * @notice Mint a swarm of 5 agents with base DNA
     * @param to Owner address
     * @param baseDNA Initial DNA template (will be mutated per agent)
     * @return swarmId The ID of the created swarm
     */
    function mintSwarm(address to, bytes32 baseDNA) 
        external 
        onlyOwner 
        returns (uint256 swarmId) 
    {
        swarmId = swarmCounter++;
        uint256[] storage swarmTokens = swarms[swarmId];

        for (uint8 i = 0; i < 5; i++) {
            uint256 tokenId = _tokenIdCounter++;
            
            // Mutate base DNA with token-specific randomness
            bytes32 agentDNA_ = baseDNA.mutate(
                uint256(keccak256(abi.encodePacked(block.timestamp, tokenId, i)))
            );

            _safeMint(to, tokenId);
            agentDNA[tokenId] = agentDNA_;
            swarmTokens.push(tokenId);

            emit AgentBorn(tokenId, swarmId, agentDNA_, to);
        }
    }

    /**
     * @notice Mint child agent from two parents (crossover + mutation)
     * @param to Owner address
     * @param swarmId Swarm to add child to
     * @param parentA Token ID of parent A
     * @param parentB Token ID of parent B
     * @return childId New agent token ID
     */
    function breedAgent(
        address to,
        uint256 swarmId,
        uint256 parentA,
        uint256 parentB
    ) external onlyOwner returns (uint256 childId) {
        require(_ownerOf(parentA) != address(0), "Parent A does not exist");
        require(_ownerOf(parentB) != address(0), "Parent B does not exist");

        childId = _tokenIdCounter++;
        
        // Crossover parent DNA
        uint256 randomness = uint256(keccak256(abi.encodePacked(
            block.timestamp, 
            block.prevrandao, 
            childId
        )));
        
        bytes32 childDNA = agentDNA[parentA].crossover(
            agentDNA[parentB], 
            randomness
        );
        
        // Mutate child
        childDNA = childDNA.mutate(randomness >> 128);

        _safeMint(to, childId);
        agentDNA[childId] = childDNA;
        swarms[swarmId].push(childId);

        emit AgentBorn(childId, swarmId, childDNA, to);
    }

    /**
     * @notice Update agent DNA (evolution via Arena)
     * @param tokenId Agent to evolve
     * @param newDNA Updated DNA
     */
    function evolveDNA(uint256 tokenId, bytes32 newDNA) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Agent does not exist");
        
        bytes32 oldDNA = agentDNA[tokenId];
        agentDNA[tokenId] = newDNA;
        
        emit AgentEvolved(tokenId, oldDNA, newDNA);
    }

    /**
     * @notice Burn dead agents
     */
    function burnAgent(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Agent does not exist");
        _burn(tokenId);
        delete agentDNA[tokenId];
    }

    /**
     * @notice Get all agents in a swarm
     */
    function getSwarmAgents(uint256 swarmId) external view returns (uint256[] memory) {
        return swarms[swarmId];
    }

    /**
     * @notice Get agent traits
     */
    function getAgentTraits(uint256 tokenId) external view returns (uint8[4] memory) {
        return agentDNA[tokenId].unpack();
    }
}
