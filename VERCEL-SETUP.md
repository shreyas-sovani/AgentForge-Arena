# Vercel Deployment Configuration

This project is deployed on Vercel with the following setup:

**Root Directory:** `frontend`

## Manual Setup Required

When deploying to Vercel, set the **Root Directory** to `frontend` in your project settings:

1. Go to Vercel Dashboard → Your Project → Settings
2. Navigate to **Build & Development Settings**
3. Under **Root Directory**, enter: `frontend`
4. Click **Save**

This tells Vercel to build from the `frontend` directory instead of the repository root.

## Environment Variables

Add these to your Vercel project:

```
GEMINI_API_KEY=<your-gemini-key>
PRIVATE_KEY=<your-wallet-private-key>
ENGINE_PRIVATE_KEY=<your-engine-private-key>
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
DEBUG=false (Production), true (Preview/Development)
VITE_DEBUG=false (Production), true (Preview/Development)
```

## Deployment

Once configured, Vercel will automatically:
- Detect Vite framework
- Run `npm install` in the `frontend` directory
- Run `npm run build`
- Deploy the `dist` folder
- Make `/api/*` serverless functions available

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).
