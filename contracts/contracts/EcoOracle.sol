// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EcoOracle
 * @notice Mock oracle for disaster generation (TODO: Chainlink VRF)
 */
contract EcoOracle {
    enum Disaster { FIRE, DROUGHT, POLLUTION, FLOOD, STORM }

    /**
     * @notice Get pseudo-random disaster
     * @param seed Randomness seed (block hash, timestamp, etc.)
     */
    function getDisaster(uint256 seed) external pure returns (Disaster) {
        uint256 randomValue = uint256(keccak256(abi.encodePacked(seed))) % 5;
        return Disaster(randomValue);
    }

    /**
     * @notice Get disaster name for display
     */
    function getDisasterName(Disaster disaster) external pure returns (string memory) {
        if (disaster == Disaster.FIRE) return "FIRE";
        if (disaster == Disaster.DROUGHT) return "DROUGHT";
        if (disaster == Disaster.POLLUTION) return "POLLUTION";
        if (disaster == Disaster.FLOOD) return "FLOOD";
        return "STORM";
    }
}
