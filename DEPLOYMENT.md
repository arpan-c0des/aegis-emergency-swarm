# 🌐 AEGIS Live Deployment Guide

This guide explains how to deploy **AEGIS (Autonomous Emergency Governance & Intelligence System)** live online with full WebSockets, real-time 3D city perspective, Gemini multi-agent deliberation, and ElevenLabs voice dispatch.

---

## 🚀 Architecture Summary

| Component | Technology | Recommended Host | Ports / Protocol |
| :--- | :--- | :--- | :--- |
| **Backend** | FastAPI, WebSockets, Python 3.11, Uvicorn | [Render.com](https://render.com) or [Railway.app](https://railway.app) | `8000` (`https://` + `wss://`) |
| **Frontend** | Next.js 14, React 18, Three.js 3D City | [Vercel](https://vercel.com) or [Render.com](https://render.com) | `3000` (`https://`) |

---

## 🌟 Method 1: Render.com 1-Click Blueprint (Recommended)

The repository includes a pre-configured [`render.yaml`](./render.yaml) Blueprint that provisions both the **FastAPI Swarm Backend** and the **Next.js 3D City Dashboard** together automatically.

### Steps:
1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Configure live cloud deployment"
   git push origin main
   ```
2. Go to **[Render.com Dashboard](https://dashboard.render.com)** -> Click **Blueprints** -> **New Blueprint Instance**.
3. Select your repository: `arpan-c0des/aegis-emergency-swarm`.
4. Render will parse `render.yaml` and prompt you for your environment variables:
   - `GEMINI_API_KEY`: Your Google AI Studio API key.
   - `ELEVENLABS_API_KEY`: Your ElevenLabs API key.
5. Click **Apply**. Render will:
   - Build and launch the Python backend (`aegis-backend`) with live WebSockets.
   - Build and deploy the Next.js frontend (`aegis-frontend`), automatically wiring the backend URL to the frontend!

---

## ⚡ Method 2: Vercel (Frontend) + Render / Railway (Backend)

For optimal CDN performance with Next.js, host the frontend on Vercel and the backend on Render/Railway.

### Step 2.1: Deploy Backend to Render or Railway
1. **Create Web Service on Render**:
   - Environment: `Python`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
2. **Add Environment Variables**:
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL=gemini-flash-latest`
   - `ELEVENLABS_API_KEY`
   - `ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB`
   - `SOLANA_RPC_URL=https://api.devnet.solana.com`
3. Note your live backend URL (e.g., `https://aegis-backend.onrender.com`).

### Step 2.2: Deploy Frontend to Vercel
1. Go to **[Vercel Dashboard](https://vercel.com/new)**.
2. Import `arpan-c0des/aegis-emergency-swarm`.
3. Set **Root Directory** to `ui`.
4. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL`: `https://aegis-backend.onrender.com`
   - `NEXT_PUBLIC_WS_URL`: `wss://aegis-backend.onrender.com/ws`
5. Click **Deploy**. Your site will be live at `https://aegis-emergency-swarm.vercel.app`!

---

## 🐳 Method 3: Docker / Self-Hosted VPS

Run the entire stack on any cloud VPS (Ubuntu, Debian, AWS EC2, DigitalOcean, Hetzner):

```bash
# Clone the repository
git clone https://github.com/arpan-c0des/aegis-emergency-swarm.git
cd aegis-emergency-swarm

# Configure environment variables
cp .env.example .env

# Build and start all services
docker-compose up -d --build
```
Access the dashboard at `http://<your-server-ip>:3000` with the backend at `http://<your-server-ip>:8000`.

---

## 🔗 Method 4: Instant Public Tunnel (Test Live Immediately)

To test on your mobile device or share a public URL immediately without cloud hosting:

1. **Start Backend**:
   ```bash
   venv\Scripts\python.exe -m uvicorn api.main:app --port 8000
   ```
2. **In a second terminal, expose the backend**:
   ```bash
   npx localtunnel --port 8000
   # Example output: https://calm-badger-22.loca.lt
   ```
3. **In a third terminal, expose the frontend**:
   ```bash
   npx localtunnel --port 3000
   ```
