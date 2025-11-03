// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title RewardDistributor
 * @notice Distribute SOMI rewards + "Green Champion" badge NFTs
 */
contract RewardDistributor is ERC721, Ownable, ReentrancyGuard {
    uint256 public constant REWARD_AMOUNT = 100 ether; // 100 SOMI (mock)
    uint256 private _badgeIdCounter;

    mapping(uint256 => bool) public rewardsClaimed; // swarmId -> claimed
    mapping(address => uint256[]) public userBadges; // user -> badge token IDs

    event RewardClaimed(
        address indexed user,
        uint256 indexed swarmId,
        uint256 somiAmount,
        uint256 badgeId
    );

    constructor() ERC721("Green Champion Badge", "GCB") {
        _badgeIdCounter = 1;
    }

    /**
     * @notice Claim rewards for surviving swarm
     * @param swarmId Swarm that completed 5 rounds
     * @param user Reward recipient
     */
    function claimReward(uint256 swarmId, address user) 
        external 
        onlyOwner 
        nonReentrant 
        returns (uint256 badgeId) 
    {
        require(!rewardsClaimed[swarmId], "Already claimed");
        rewardsClaimed[swarmId] = true;

        // Mint badge NFT
        badgeId = _badgeIdCounter++;
        _safeMint(user, badgeId);
        userBadges[user].push(badgeId);

        // Transfer SOMI (mock: contract must hold balance)
        // In production: Use actual SOMI token or native transfer
        (bool success, ) = payable(user).call{value: REWARD_AMOUNT}("");
        require(success, "SOMI transfer failed");

        emit RewardClaimed(user, swarmId, REWARD_AMOUNT, badgeId);
    }

    /**
     * @notice Fund contract with SOMI (owner deposits)
     */
    receive() external payable {}

    /**
     * @notice Withdraw excess funds
     */
    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }

    /**
     * @notice Get user's badge collection
     */
    function getUserBadges(address user) external view returns (uint256[] memory) {
        return userBadges[user];
    }
}
