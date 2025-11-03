# 🎮 AgentForge Arena

**Autonomous On-Chain Evolutionary AI Agent Battle Royale**  
*Somnia AI Hackathon 2025 - Gaming Agents Track*

---

## 🌟 Concept

Create AI agent swarms with a single prompt. Watch them battle disasters, evolve through genetic algorithms, and compete for survival—all verified on-chain.

- **User Input**: "Create pizza chefs that share dough"
- **LLM Output**: Generates DNA traits (efficiency, cooperation, aggression, ecoScore) + action biases
- **Mint**: 5 ERC-721 NFT agents with packed bytes32 DNA
- **Battle**: 5 auto-rounds vs. random disasters (FIRE, DROUGHT, POLLUTION, FLOOD, STORM)
- **Evolve**: Survivors breed children via genetic crossover/mutation
- **Win**: Survive all rounds → claim 100 SOMI + "Green Champion" NFT

---

## 🏗️ Tech Stack

- **Blockchain**: Somnia Testnet (chainId: 1312)
- **Smart Contracts**: Solidity 0.8.20 + OpenZeppelin (ERC721, ECDSA, ReentrancyGuard)
- **Off-Chain Engine**: Node.js + Ethers.js v5 + Google Gemini API (gemini-1.5-flash-exp)
- **Frontend**: React + Vite + Tailwind CSS + Wagmi + Viem
- **Automation**: Gelato (optional) / Manual triggers

---

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- MetaMask or compatible wallet
- Test SOMI (Somnia faucet: [Telegram @SomniaDevs](https://t.me/SomniaDevs))
- Gemini API key ([Get free tier](https://ai.google.dev/aistudio))

### Setup

1. **Clone & Install**
   ```bash
   git clone <repo-url>
   cd agentforge-arena
   npm install
   cd contracts && npm install
   cd ../engine && npm install
   cd ../frontend && npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your keys:
   # - PRIVATE_KEY: Your deployer wallet (fund via faucet)
   # - GEMINI_API_KEY: From ai.google.dev
   # - ENGINE_PRIVATE_KEY: Signing wallet for LLM outputs
   ```

3. **Deploy Contracts**
   ```bash
   npm run deploy
   # Save deployed addresses to contracts/deployed-addresses.json
   ```

4. **Run Demo**
   ```bash
   # Terminal 1: Start frontend
   npm run dev:frontend

   # Terminal 2: Run engine (manual mode)
   npm run dev:engine
   ```

5. **Connect Wallet**
   - Add Somnia Testnet to MetaMask:
     - Network Name: Somnia Testnet
     - RPC URL: https://testnet-rpc.somnia.network
     - Chain ID: 1312
     - Currency: SOMI

---

## 📋 Project Structure

```
agentforge-arena/
├── contracts/           # Hardhat project
│   ├── contracts/       # Solidity smart contracts
│   ├── scripts/         # Deployment scripts
│   ├── test/            # Contract tests
│   └── hardhat.config.js
├── engine/              # Off-chain AI engine
│   ├── index.js         # Gemini integration + signing
│   └── package.json
├── frontend/            # React + Vite UI
│   ├── src/
│   │   ├── components/  # PromptInput, SVGArena, etc.
│   │   └── App.tsx
│   └── package.json
└── package.json         # Root workspace config
```

---

## 🎯 Core Contracts

| Contract | Purpose |
|----------|---------|
| **AgentFactory** | Mint ERC-721 agents with packed DNA |
| **Arena** | Manage rounds, verify signed actions, apply eco scores |
| **Genetics** | Library for crossover/mutation logic |
| **EcoOracle** | Mock disaster generation (TODO: Chainlink VRF) |
| **RewardDistributor** | Claim SOMI rewards + badge NFTs |

---

## 🧬 DNA Encoding

Packed as `bytes32`:
- Bytes 0-3: Efficiency (0-100)
- Bytes 4-7: Cooperation (0-100)
- Bytes 8-11: Aggression (0-100)
- Bytes 12-15: EcoScore (0-100)

---

## 🔐 Security Features

- **Audit Trail**: Every LLM decision → keccak256 hash + ECDSA signature → on-chain verification
- **Reentrancy Protection**: `nonReentrant` on claim/mint functions
- **Replay Protection**: Round-based nonce system
- **Known Risks** (documented):
  - Blockhash manipulability (TODO: Chainlink VRF)
  - Off-chain trust (Gemini API uptime)

---

## 📊 Deployed Addresses

*TODO: Fill after deployment*

| Contract | Address | Explorer |
|----------|---------|----------|
| AgentFactory | `0x...` | [View](https://somnia-testnet-explorer.com/address/0x...) |
| Arena | `0x...` | [View](https://somnia-testnet-explorer.com/address/0x...) |
| Genetics | `0x...` | [View](https://somnia-testnet-explorer.com/address/0x...) |
| EcoOracle | `0x...` | [View](https://somnia-testnet-explorer.com/address/0x...) |
| RewardDistributor | `0x...` | [View](https://somnia-testnet-explorer.com/address/0x...) |

---

## 🎬 Demo

**Video**: [Watch Demo](link-to-loom-video)  
**Slides**: [View Deck](link-to-deck-pdf)

---

## 🏆 Competitive Edge

1. **Multi-Agent Evolution**: Only entry with genetic crossover/mutation verified on-chain
2. **Audit Trail**: LLM decisions signed + hashed for verifiable AI
3. **Cross-dApp DNA**: Export agent genetics as JSON for reuse in other games

---

## 🛠️ Development

```bash
# Run tests
npm test

# Deploy to testnet
npm run deploy

# Run engine CLI
cd engine
node index.js mint --prompt="your prompt here"
node index.js resolve --round=1 --disaster=FIRE
```

---

## 📜 License

MIT License - See [LICENSE](LICENSE)

---

## 🙏 Acknowledgments

- Somnia Team for MCP + testnet support
- OpenZeppelin for battle-tested contracts
- Google Gemini for AI magic

---

**Built with ❤️ for Somnia AI Hackathon 2025**
