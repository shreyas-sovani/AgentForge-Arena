// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Genetics
 * @notice Library for genetic operations on packed DNA (bytes32)
 * @dev DNA encoding: 4 uint8 traits (Efficiency, Cooperation, Aggression, EcoScore)
 *      bytes32: [0-3: eff, 4-7: coop, 8-11: agg, 12-15: eco, rest: reserved]
 */
library Genetics {
    // Extract traits from packed DNA
    function unpack(bytes32 dna) internal pure returns (uint8[4] memory traits) {
        traits[0] = uint8(uint256(dna) >> 248); // Efficiency
        traits[1] = uint8(uint256(dna) >> 240); // Cooperation
        traits[2] = uint8(uint256(dna) >> 232); // Aggression
        traits[3] = uint8(uint256(dna) >> 224); // EcoScore
    }

    // Pack traits into bytes32 DNA
    function pack(uint8[4] memory traits) internal pure returns (bytes32) {
        return bytes32(
            (uint256(traits[0]) << 248) |
            (uint256(traits[1]) << 240) |
            (uint256(traits[2]) << 232) |
            (uint256(traits[3]) << 224)
        );
    }

    /**
     * @notice Crossover: Average parent traits with bit mixing
     * @param dnaA Parent A DNA
     * @param dnaB Parent B DNA
     * @param randomness Source of randomness (blockhash/VRF)
     */
    function crossover(bytes32 dnaA, bytes32 dnaB, uint256 randomness) 
        internal 
        pure 
        returns (bytes32) 
    {
        uint8[4] memory traitsA = unpack(dnaA);
        uint8[4] memory traitsB = unpack(dnaB);
        uint8[4] memory childTraits;

        for (uint8 i = 0; i < 4; i++) {
            // Randomly pick from parent A or B based on randomness bit
            if ((randomness >> i) & 1 == 1) {
                childTraits[i] = traitsA[i];
            } else {
                childTraits[i] = traitsB[i];
            }
        }

        return pack(childTraits);
    }

    /**
     * @notice Mutate: XOR low bits with random value (±10% variance)
     * @param dna Original DNA
     * @param randomness Mutation seed
     */
    function mutate(bytes32 dna, uint256 randomness) internal pure returns (bytes32) {
        uint8[4] memory traits = unpack(dna);

        for (uint8 i = 0; i < 4; i++) {
            uint8 mutation = uint8((randomness >> (i * 8)) % 20); // 0-19
            int16 delta = int16(int8(mutation)) - 10; // -10 to +9
            
            int16 newValue = int16(int8(traits[i])) + delta;
            if (newValue < 0) newValue = 0;
            if (newValue > 100) newValue = 100;
            
            traits[i] = uint8(uint16(newValue));
        }

        return pack(traits);
    }

    /**
     * @notice Calculate fitness score for selection
     * @param dna Agent DNA
     * @return Fitness value (weighted sum of traits)
     */
    function fitness(bytes32 dna) internal pure returns (uint16) {
        uint8[4] memory traits = unpack(dna);
        // Weight eco score higher (2x), rest equal
        return uint16(traits[0]) + uint16(traits[1]) + uint16(traits[2]) + (uint16(traits[3]) * 2);
    }
}
