# Distributed Rate Limiter

A production-grade rate limiting system with **3 algorithms**, a real-time monitoring dashboard, and full cloud deployment.

**[🔗 Live Demo](https://rate-limiter-dashboardd.vercel.app)** — See it in action

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

### Live Demo
```bash
# Visit the dashboard
https://rate-limiter-dashboardd.vercel.app

# Test Fixed Window (5 req/30s per IP)
for ($i = 1; $i -le 10; $i++) {
  Invoke-WebRequest https://distributed-rate-limiter-z2sa.onrender.com/demo/public -UseBasicParsing | Out-Null
}

# Test Sliding Window (5 req/30s per API key)
for ($i = 1; $i -le 10; $i++) {
  Invoke-WebRequest https://distributed-rate-limiter-z2sa.onrender.com/demo/authenticated -UseBasicParsing | Out-Null
}

# Test Token Bucket (burst capable)
for ($i = 1; $i -le 10; $i++) {
  Invoke-WebRequest -Method POST https://distributed-rate-limiter-z2sa.onrender.com/demo/expensive -UseBasicParsing | Out-Null
}

# Watch the dashboard update in real-time! 
```

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
