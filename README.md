# CCTV / IoT Fleet Management SaaS

A multi-tenant SaaS platform for MSPs and IT technicians to monitor CCTV and IoT device fleets across multiple client sites — device health, storage capacity, uptime, and automated alerting.

**Live app:** https://cctv-fleet-saas.vercel.app
**Live API:** https://cctv-fleet-backend.onrender.com/health

> Note: the backend is hosted on Render's free tier, which spins down after periods of inactivity. The first request after idle time may take 30–60 seconds to wake it back up.

## Features

- **Multi-tenant architecture** — organizations, sites, and devices are fully isolated at the query level; no org can access another's data, even by guessing IDs
- **JWT authentication** — signup/login with bcrypt password hashing
- **Site & device management** — full CRUD for sites and devices, scoped to the logged-in user's organization
- **Background health monitoring** — a BullMQ job queue (backed by Redis) runs recurring simulated health checks every 30 seconds, tracking device status, storage usage, and latency over time
- **Automated alerting** — devices going offline or exceeding storage thresholds automatically raise alerts, viewable and resolvable per device
- **Live dashboard** — real-time status badges, a Recharts-powered health history chart per device, and an alerts feed

## Tech stack

**Backend:** Node.js, Express, PostgreSQL, Redis, BullMQ, JWT, bcrypt
**Frontend:** React (Vite), React Router, Axios, Recharts
**Infrastructure:** Docker Compose (local dev), Render (backend + Postgres + Redis), Vercel (frontend)

## Architecture
Every device belongs to a site, every site belongs to an organization, and every query that touches sites, devices, health logs, or alerts is scoped through that chain — so tenant isolation is enforced at the database query level, not just in the UI.

## Running locally

**Prerequisites:** Docker Desktop, Node.js

1. Start Postgres + Redis:
```bash
   docker compose up -d
```

2. Load the schema:
```bash
   docker exec -i cctv_fleet_db psql -U postgres -d cctv_fleet < schema.sql
```

3. Set up and run the backend:
```bash
   cd backend
   npm install
   cp .env.example .env
   npm run dev
```
   Confirm it's working: `http://localhost:4000/health/db` should list all 6 tables.

4. Set up and run the frontend:
```bash
   cd frontend
   npm install
   npm run dev
```
   Visit `http://localhost:5173`.

## Roadmap

- [x] Multi-tenant backend with JWT auth
- [x] Sites & devices CRUD with tenant scoping
- [x] Background job queue with simulated health checks
- [x] Automated alerting
- [x] React dashboard with live charts
- [x] Deployed to production (Render + Vercel)
- [ ] Real ONVIF device polling (replacing simulated health checks)
- [ ] Stripe billing (free / paid tiers)
- [ ] Alerts page across all sites, with resolve action in the UI