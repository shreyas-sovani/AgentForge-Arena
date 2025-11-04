# 🚀 Vercel Deployment Guide

## ✅ Pre-Deployment Checklist

Your project is now ready for Vercel deployment! All code has been updated to use serverless functions.

### What We've Done:

1. ✅ Created `.env.example` (safe to commit)
2. ✅ Moved `.env` to `.env.local` (gitignored)
3. ✅ Created serverless API functions in `frontend/api/`
4. ✅ Updated components to use centralized API client
5. ✅ Created `vercel.json` configuration
6. ✅ Tested local build successfully

---

## 📋 Deployment Steps

### Step 1: Install Vercel CLI (if needed)

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Deploy to Vercel

From the project root:

```bash
vercel
```

Follow the prompts:
- **Set up and deploy?** → Yes
- **Which scope?** → Your account
- **Link to existing project?** → No
- **Project name?** → `agentforge-arena` (or your choice)
- **Directory?** → `./` (project root)
- **Override settings?** → No

### Step 4: Add Environment Variables

Go to your Vercel dashboard: https://vercel.com/dashboard

1. Select your project (`agentforge-arena`)
2. Go to **Settings** → **Environment Variables**
3. Add the following variables:

| Variable Name | Value | Environments |
|---------------|-------|--------------|
| `GEMINI_API_KEY` | `AIzaSyC8agaxdbxQtUmzRMS3_kJQbc_8cADoDks` | Production, Preview, Development |
| `PRIVATE_KEY` | `0xe98a14e5c1dd7c78bc16c2be88d7d7734fe03ed5197827d34a640adb25ac2e53` | Production, Preview, Development |
| `ENGINE_PRIVATE_KEY` | `0xe98a14e5c1dd7c78bc16c2be88d7d7734fe03ed5197827d34a640adb25ac2e53` | Production, Preview, Development |
| `SOMNIA_RPC_URL` | `https://dream-rpc.somnia.network` | Production, Preview, Development |
| `DEBUG` | `false` | Production |
| `DEBUG` | `true` | Preview, Development |
| `VITE_DEBUG` | `false` | Production |
| `VITE_DEBUG` | `true` | Preview, Development |
| `NODE_ENV` | `production` | Production |

**Important:** Check "All" or select all three environments (Production, Preview, Development) for each variable.

### Step 5: Redeploy with Environment Variables

After adding environment variables:

```bash
vercel --prod
```

This deploys to production with all your secrets.

---

## 🔍 Testing Your Deployment

### 1. Check Deployment URL

Vercel will give you a URL like:
```
https://agentforge-arena.vercel.app
```

### 2. Test API Endpoints

Open browser console and test:

```javascript
// Test DNA generation
fetch('https://your-app.vercel.app/api/gen-dna', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'test warriors' })
})
.then(r => r.json())
.then(console.log)
```

### 3. View Logs

```bash
# Real-time logs
vercel logs --prod --follow

# Filter by function
vercel logs --prod --follow | grep "gen-dna"
```

---

## 🐛 Debug Mode

### Enable Debug Logging (Temporarily)

1. Go to Vercel Dashboard → Environment Variables
2. Change `DEBUG` to `true` for Production
3. Redeploy: `vercel --prod`
4. Check logs: `vercel logs --prod --follow`
5. **Remember to set `DEBUG` back to `false` when done!**

### Check for Errors

Browser Console:
- Open DevTools → Console
- Look for `[API Debug]` messages
- Check Network tab for failed requests

Vercel Logs:
```bash
vercel logs --prod | grep ERROR
```

---

## 🔄 Continuous Deployment (Optional)

### Connect GitHub to Vercel

1. Go to Vercel Dashboard
2. **Import Git Repository**
3. Select `shreyas-sovani/AgentForge-Arena`
4. Import and deploy

**Benefits:**
- Every push to `main` → Auto-deploy to production
- Pull requests → Automatic preview deployments
- No need to run `vercel` command manually

---

## 📊 What Happens in Production

### API Routes:
- `https://your-app.vercel.app/api/gen-dna` → DNA generation
- `https://your-app.vercel.app/api/gen-narrative` → Story generation
- `https://your-app.vercel.app/api/gen-names` → Name generation
- `https://your-app.vercel.app/api/latest-decision` → Decision fetching

### Frontend:
- Uses relative paths (`/api/*`)
- No localhost dependencies
- Works seamlessly with serverless functions

---

## 🚨 Common Issues & Solutions

### Issue: "Module not found: @google/generative-ai"

**Solution:** The API functions need the dependency. Vercel auto-installs from package.json, but if it fails:

```bash
cd frontend
npm install @google/generative-ai
cd ..
git add frontend/package.json frontend/package-lock.json
git commit -m "Add Gemini dependency"
vercel --prod
```

### Issue: "Function timeout"

**Solution:** Already configured in `vercel.json` (30s timeout). If still timing out:
- Check Gemini API quota
- Enable debug mode to see where it's stuck

### Issue: API returns 404

**Solution:** Check `vercel.json` exists in root and redeploy:
```bash
vercel --prod
```

### Issue: CORS errors

**Solution:** Already handled in API functions. If still occurring:
- Check browser console for exact error
- Verify API functions have CORS headers

---

## 📈 Monitor & Optimize

### View Analytics

Vercel Dashboard → Your Project → Analytics
- Page views
- Function invocations
- Error rates
- Performance metrics

### Cost Monitoring

Vercel Dashboard → Your Project → Usage
- Function execution time
- Bandwidth
- Build minutes

**Free tier limits:**
- 100GB bandwidth/month
- 100 hours serverless function execution/month
- Should be plenty for development and testing!

---

## ✅ Success Checklist

Before sharing your app:

- [ ] Deployed to Vercel
- [ ] Environment variables added
- [ ] Tested all features (DNA generation, arena battles, narratives)
- [ ] Checked browser console (no errors)
- [ ] Verified API calls work (Network tab)
- [ ] Disabled debug mode in production
- [ ] Tested with wallet connection (MetaMask)
- [ ] Verified Somnia blockchain integration works

---

## 🎉 Next Steps

1. **Share your app:** Send the Vercel URL to friends/testers
2. **Monitor logs:** Keep an eye on `vercel logs --prod --follow`
3. **Iterate:** Make changes locally, test, then `vercel --prod`
4. **Go live:** Once tested, connect GitHub for auto-deployments

---

## 🆘 Need Help?

**Check logs first:**
```bash
vercel logs --prod --follow
```

**Common debug commands:**
```bash
# Check deployment status
vercel inspect <deployment-url>

# List all deployments
vercel list

# Remove old deployments
vercel rm <deployment-name>
```

**Vercel Support:**
- Docs: https://vercel.com/docs
- Community: https://github.com/vercel/vercel/discussions

---

**You're all set! 🚀**
