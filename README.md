# Stienhardt — Diamond Inventory Management Software

A full-stack web application to manage diamond inventory, customers, memos, and invoices —
decoupled backend + frontend, secured with JWT auth and role-based access, built for the
Stienhardt & Stones technical task (ref **SH/TECH/TASK/2026-016**).

> **`PROJECT_PLAN.md`** in this folder is the A→Z build plan with a tick-box checklist.

## Architecture
```
React + Vite (Vercel)  ──REST/JWT──>  Node + Express (Render)  ──>  MongoDB + Cloudinary
```
- **`backend/`** — Express REST API, MongoDB models, status engine, auth/RBAC, Excel, Cloudinary
- **`frontend/`** — React + Vite SPA, talks only to the backend API

Each folder is an independent project with its own README, `.env`, and `package.json`,
and can be pushed as its own GitHub repo.

## Run locally (quick start)

You need **Node 18+** and a **MongoDB** (Atlas free tier or local).

**1. Backend**
```bash
cd backend
npm install
copy .env.example .env      # fill in MONGO_URI, JWT_SECRET, (optional) Cloudinary
npm run seed                # creates admin@stienhardt.com / Admin@12345 (from .env)
npm run dev                 # http://localhost:5000
```

**2. Frontend** (new terminal)
```bash
cd frontend
npm install
copy .env.example .env      # VITE_API_URL=http://localhost:5000/api
npm run dev                 # http://localhost:5173
```

**3. Log in** at http://localhost:5173 with the seeded admin, then:
add a customer → add/bulk-upload diamonds → create a memo → convert to invoice → finalize (Sold).

> No MongoDB handy? Run `cd backend && npm test` — it boots an in-memory MongoDB and verifies
> the entire backend lifecycle (auth, RBAC, CRUD, status workflow, integrity guards) in seconds.

## Default admin
| | |
|---|---|
| Email | `admin@stienhardt.com` |
| Password | `Admin@12345` |

(Configurable via `ADMIN_*` in `backend/.env`. Change it for production.)

## Core features
- **Auth & security** — JWT login, bcrypt-hashed passwords, protected routes (401/403)
- **Roles** — Admin (full + manages Staff & permissions) and Staff (per-module permissions), enforced backend **and** frontend
- **Diamonds** — single add (with image/certificate via Cloudinary), Excel bulk import, full CRUD, On Hold
- **Customers** — full CRUD, selectable in memos/invoices
- **Memos** — create from available diamonds, order summary, print, convert → invoice
- **Invoices** — create or from memo, finalize → Sold, order summary, print
- **Status workflow** — `Added → Available → On Memo → On Invoice → Sold` (+ `On Hold`), updated automatically; diamonds already `On Invoice`/`Sold` are blocked from new memos/invoices

## Deployment
- **Backend → Render** — see `backend/README.md`
- **Frontend → Vercel** — see `frontend/README.md`
- Set the backend `CLIENT_URL` to the Vercel URL, and the frontend `VITE_API_URL` to the Render URL + `/api`.
- All secrets live in env vars on Render/Vercel — never committed.

## Tech stack
React, Vite, Tailwind, React Router, Axios · Node, Express, Mongoose · MongoDB · JWT, bcrypt · Multer, Cloudinary · SheetJS (xlsx)
