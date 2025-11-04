# 🎯 Quick Start - Deploy to Vercel

## ✅ Everything is Ready!

All code changes have been committed and pushed to GitHub. Your project is production-ready!

---

## 🚀 Deploy Now (3 Steps)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login & Deploy

```bash
vercel login
vercel
```

Follow the prompts:
- Project name: `agentforge-arena`
- Directory: `./` (just press Enter)
- Override settings: No

### Step 3: Add Environment Variables

1. Go to https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Add these (select "All" environments for each):

```
GEMINI_API_KEY=AIzaSyC8agaxdbxQtUmzRMS3_kJQbc_8cADoDks
PRIVATE_KEY=0xe98a14e5c1dd7c78bc16c2be88d7d7734fe03ed5197827d34a640adb25ac2e53
ENGINE_PRIVATE_KEY=0xe98a14e5c1dd7c78bc16c2be88d7d7734fe03ed5197827d34a640adb25ac2e53
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
DEBUG=false (for Production only)
DEBUG=true (for Preview and Development)
VITE_DEBUG=false (for Production only)
VITE_DEBUG=true (for Preview and Development)
NODE_ENV=production (for Production only)
```

Then run:
```bash
vercel --prod
```

---

## 🎉 Done!

Your app will be live at: `https://agentforge-arena.vercel.app` (or similar)

---

## 📖 Need More Details?

See **DEPLOYMENT.md** for:
- Complete step-by-step guide
- Debugging tips
- Troubleshooting
- Continuous deployment setup
- Monitoring & optimization

---

## 🐛 Quick Debug

If something goes wrong:

```bash
# View real-time logs
vercel logs --prod --follow

# Check specific function
vercel logs --prod | grep "gen-dna"
```

---

**Questions?** Check browser console and Vercel logs first!
