# 🐛 Troubleshooting Guide

## Common Issues & Solutions

### 1. MetaMask "Internal JSON-RPC error" ✅ FIXED

**Error**: `Internal JSON-RPC error` when trying to mint or send transactions

**Cause**: MetaMask doesn't recognize Somnia Testnet (chain ID 50312)

**Solution**: 
1. Refresh the frontend page
2. Connect wallet
3. Click **"Add Network to MetaMask"** button
4. Approve the network addition in MetaMask popup
5. MetaMask will auto-switch to Somnia Testnet
6. Try minting again!

**Manual Setup** (if button doesn't work):
```
Network Name: Somnia Testnet
RPC URL: https://dream-rpc.somnia.network
Chain ID: 50312
Currency Symbol: STT
Block Explorer: https://shannon-explorer.somnia.network
```

---

### 2. "Wrong Network" Warning

**Issue**: See warning about being on wrong chain

**Solution**:
- Click **"Switch to Somnia Testnet"** button
- OR click **"Add Network to MetaMask"** if network doesn't exist
- App will detect correct network automatically

---

### 3. Insufficient Funds / No STT

**Error**: Transaction fails with "insufficient funds"

**Solution**:
1. Get STT from faucet (if available)
2. OR import your funded wallet to MetaMask:
   - Settings → Import Account
   - Paste private key from `.env` file (PRIVATE_KEY)
   - **⚠️ ONLY FOR TESTING! Never share real private keys!**

**Deployer Wallet** (already funded with ~4 STT):
```
Address: 0xD2aA21AF4faa840Dea890DB2C6649AACF2C80Ff3
Private Key: See .env file
```

---

### 4. API Not Responding

**Error**: DNA generation fails, "Failed to fetch" error

**Solution**:
```bash
# Check if API is running
curl http://localhost:3001/api/health

# If not running, start it:
cd api
npm run dev
```

**Expected Output**: `{"status":"ok","timestamp":...}`

---

### 5. Frontend Won't Load

**Error**: Blank page or compilation errors

**Solution**:
```bash
# Reinstall dependencies
cd frontend
rm -rf node_modules package-lock.json
npm install

# Restart dev server
npm run dev
```

---

### 6. Transaction Takes Too Long

**Issue**: Minting/starting round hangs forever

**Possible Causes**:
1. **Somnia RPC slow** → Wait 30-60 seconds, it might just be slow
2. **Nonce issues** → Reset MetaMask account:
   - Settings → Advanced → Clear activity tab data
3. **Contract error** → Check browser console for specific error

---

### 7. Events Not Updating

**Issue**: Agents don't appear after minting, rounds don't show disasters

**Possible Causes**:
1. **Event listener delay** → Refresh page after transaction confirms
2. **Wrong swarm ID** → Check `deployed-addresses.json` for correct addresses
3. **Browser tab inactive** → Make sure tab is active (some browsers pause inactive tabs)

**Debug**:
```javascript
// Open browser console and check:
console.log('Chain ID:', window.ethereum.chainId) // Should be 0xc478 (50312)
console.log('Contract addresses:', CONTRACTS)
```

---

### 8. Contract Function Reverts

**Error**: "execution reverted" or specific revert message

**Common Reverts**:

| Error | Cause | Solution |
|-------|-------|----------|
| `Not authorized` | Calling Arena functions from wrong wallet | Use deployer wallet (0xD2aA...) |
| `Invalid signature` | ECDSA signature mismatch | Check engine signer address matches |
| `Round already resolved` | Trying to resolve same round twice | Start a new round |
| `Not enough survivors` | < 2 agents alive | Game is over, mint new swarm |

---

### 9. Gemini API Errors

**Error**: DNA generation returns error from API

**Possible Causes**:
1. **Invalid API key** → Check `.env` has correct `GEMINI_API_KEY`
2. **Rate limit** → Wait 60 seconds and try again
3. **Model unavailable** → Check Gemini API status

**Test API Key**:
```bash
cd engine
node index.js test-gemini
```

---

### 10. Build/Compilation Errors

**Error**: Import errors, module not found, etc.

**Solution**:
```bash
# Clean install everything
rm -rf node_modules package-lock.json
cd contracts && rm -rf node_modules package-lock.json
cd ../engine && rm -rf node_modules package-lock.json
cd ../api && rm -rf node_modules package-lock.json
cd ../frontend && rm -rf node_modules package-lock.json

# Reinstall from root
cd ..
npm install
cd frontend && npm install
cd ../api && npm install
```

---

## Debug Checklist

Before asking for help, check:

- [ ] API server is running (`curl http://localhost:3001/api/health`)
- [ ] Frontend dev server is running (`http://localhost:5173`)
- [ ] MetaMask is connected to Somnia Testnet (chainId 50312)
- [ ] Wallet has STT balance
- [ ] Browser console shows no errors (F12 → Console)
- [ ] Correct contract addresses in `frontend/src/config/wagmi.js`
- [ ] `.env` file exists with all keys

---

## Still Stuck?

1. **Check browser console** (F12 → Console tab)
2. **Check API logs** (terminal running `npm run dev` in `/api`)
3. **Check network tab** (F12 → Network tab) for failed requests
4. **Verify contract on explorer**: https://shannon-explorer.somnia.network
5. **Check transaction hash** on explorer if tx was submitted

---

## Quick Recovery

If everything is broken:

```bash
# 1. Kill all processes
pkill -f "node"

# 2. Clean everything
cd "/Users/shreyas/Desktop/AgentForge Arena"
rm -rf node_modules */node_modules

# 3. Reinstall
npm install
cd frontend && npm install
cd ../api && npm install

# 4. Restart
./dev.sh
```

Then refresh browser (Cmd+R), reconnect wallet, add network!

---

**Last Updated**: November 3, 2025  
**Status**: Network error fixed! Main blocker resolved ✅
