# AgentForge Arena - Quick Start Guide

## 🚀 Run the Full Stack

1. **Start development servers**:
   ```bash
   ./dev.sh
   ```
   This starts both:
   - API server on `http://localhost:3001`
   - Frontend on `http://localhost:5173`

2. **Add Somnia Testnet to MetaMask**:
   - Network Name: `Somnia Testnet`
   - RPC URL: `https://dream-rpc.somnia.network`
   - Chain ID: `50312`
   - Currency Symbol: `STT`
   - Block Explorer: `https://shannon-explorer.somnia.network`

3. **Get STT tokens** (if needed):
   - Use faucet or contact team

4. **Open app**:
   - Go to http://localhost:5173
   - Connect wallet
   - Enter prompt: `"solar punk farmers with high eco scores"`
   - Click Generate DNA
   - Confirm & Mint Swarm
   - Start rounds and watch evolution!

## 📍 Deployed Contracts

Already deployed on Somnia Testnet:

```
AgentFactory:      0x8083ee36D34A4079087a1fC02c2F7f790838180e
Arena:             0xC98Ea0972774F69c7b6E543a6D7005103D4bF91D
EcoOracle:         0xD46C9A11D7331CCf4858272df6744bA6585B9230
RewardDistributor: 0xBC18017eC5632BbBD47d420D6e16d3686186Bd50
```

## 🧪 Test Individual Components

### Test Engine CLI
```bash
cd engine
node index.js gen-dna "cyberpunk hackers"
node index.js test-gemini
```

### Test API
```bash
# Terminal 1: Start API
cd api && npm run dev

# Terminal 2: Test endpoint
curl -X POST http://localhost:3001/api/gen-dna \
  -H "Content-Type: application/json" \
  -d '{"prompt":"eco warriors"}'
```

### Test Smart Contracts
```bash
cd contracts
npx hardhat test
npx hardhat run scripts/test-e2e.js --network testnet
```

## 🔧 Troubleshooting

### API won't start
- Check `.env` file exists with `GEMINI_API_KEY`
- Run `cd api && npm install`

### Frontend build errors
- Run `cd frontend && npm install`
- Check Node version (need 18+)

### Wallet won't connect
- Make sure Somnia chain is added to MetaMask
- Check chain ID is `50312` (not 1312)

### Transactions failing
- Check wallet has STT balance
- Verify contract addresses in `frontend/src/config/wagmi.js`

## 📚 More Info

- Full docs: See `README.md`
- Development notes: See `DEVELOPMENT.md`
- Contract tests: `contracts/test/`
- Deployed addresses: `contracts/deployed-addresses.json`

---

**Happy Forging! 🔨🤖**
