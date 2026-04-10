# Distributed Rate Limiter

A production-grade rate limiting system with **3 algorithms**, a real-time monitoring dashboard, and full cloud deployment.

**[🔗 Live Demo](https://rate-limiter-dashboardd.vercel.app)** — See it in action.

---

## ✨ Features

- **3 Rate Limiting Algorithms**
  - Fixed Window Counter
  - Sliding Window Log  
  - Token Bucket

- **Real-Time Dashboard**
  - Live request tracking
  - Interactive charts
  - Algorithm metrics

- **Production Ready**
  - Deployed on Render (backend) + Vercel (frontend)
  - Upstash Redis for distributed caching
  - Auto-scaling, zero downtime

---

## 🚀 Quick Start



### Local Development

```bash
# Clone
git clone https://github.com/Aditya-tec/distributed-rate-limiter
cd distributed-rate-limiter

# Install dependencies
npm install

# Backend (.env)
PORT=5000
REDIS_URL=redis://localhost:6379
NODE_ENV=development

# Run backend
node src/server.js

# Run dashboard (separate terminal)
cd dashboard
npm run dev
```

Visit `http://localhost:3000` for the dashboard.

---

## 📊 Algorithms Explained

| Algorithm | Accuracy | Use Case |
|-----------|----------|----------|
| **Fixed Window** | ⚠️ Edge case spikes | Simple static limits |
| **Sliding Window** | ✅ Perfect accuracy | Strict enforcement |
| **Token Bucket** | ✅ Accurate + burst | API rate limiting |

---

## 🏗️ Architecture

```
Dashboard (Vercel)
    ↓ REST API
Backend (Render)
    ↓ Cache
Redis (Upstash)
```

---

## 📚 API Endpoints

```bash
# Fixed window (5 req/30s per IP)
GET /demo/public

# Sliding window (5 req/30s per API key)
GET /demo/authenticated

# Token bucket (burst capable)
POST /demo/expensive

# Metrics & live feed
GET /admin/metrics
GET /admin/stream (SSE)
```

---

## 🛠️ Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Next.js + React + Recharts
- **Cache**: Upstash Redis
- **Services**: Render, Vercel, GitHub Actions

---
