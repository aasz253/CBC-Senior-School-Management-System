# Deployment Guide

## Backend on Render

1. Go to https://render.com and sign up
2. Click **New +** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `cbc-school-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install --production`
   - **Start Command**: `node server.js`
   - **Plan**: Free
   - **Region**: Oregon (or closest to you)
5. Add these **Environment Variables**:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Your MongoDB connection string |
| `JWT_SECRET` | A long random string (e.g., `openssl rand -hex 64`) |
| `JWT_EXPIRE` | `7d` |
| `PORT` | `10000` |
| `FRONTEND_URL` | `https://your-app.vercel.app` (update after Vercel deploy) |

6. Click **Create Web Service**
7. Wait for deployment, then copy your backend URL (e.g., `https://cbc-school-backend.onrender.com`)

## Frontend on Vercel

1. Go to https://vercel.com and sign up
2. Click **New Project** → Import your GitHub repo
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Add this **Environment Variable**:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://cbc-school-backend.onrender.com/api` |

5. Click **Deploy**
6. Copy your Vercel URL

## Update Backend CORS

After Vercel deploys, go back to Render and update `FRONTEND_URL` to your Vercel URL. Render will auto-redeploy.

## Local Development

```bash
# Backend
cd backend
cp .env.example .env  # Edit with your values
npm start

# Frontend
cd frontend
npm run dev
```
