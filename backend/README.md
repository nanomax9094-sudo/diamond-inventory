# Diamond Inventory — Backend API

Node.js + Express + MongoDB REST API for the Stienhardt Diamond Inventory Management Software.
Handles authentication (JWT), role-based access (Admin/Staff), the four core modules
(Diamonds, Customers, Memos, Invoices), the automatic diamond **status workflow**, Excel
bulk import (SheetJS), and image/certificate uploads (Cloudinary).

## Tech
Express · Mongoose (MongoDB) · JWT · bcryptjs · Multer · Cloudinary · xlsx

## Setup

```bash
cd backend
npm install
cp .env.example .env      # then fill in the values (Windows: copy .env.example .env)
npm run seed              # creates the first admin from ADMIN_* env vars
npm run dev               # starts on http://localhost:5000 (nodemon)
# or: npm start
```

### Requires a MongoDB
Use **MongoDB Atlas** (free) or a local install, and set `MONGO_URI`.
- Atlas: create a free cluster → Database Access (user) → Network Access (allow your IP or 0.0.0.0/0) → copy the connection string.

## Environment variables

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 5000) |
| `CLIENT_URL` | Allowed frontend origin(s) for CORS, comma-separated |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign JWTs |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `7d`) |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | First admin, created by `npm run seed` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Image/cert uploads (optional — app runs without) |

> Secrets live only in `.env` (gitignored) and in the Render dashboard. Never commit them.

## Scripts
| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon |
| `npm start` | Start (production) |
| `npm run seed` | Create/ensure the admin account |
| `npm test` | End-to-end smoke test on an in-memory MongoDB (no setup needed) |
| `npm run sample-excel` | Generate `sample-diamonds.xlsx` for bulk-upload testing |

## API overview

Auth: `POST /api/auth/login`, `GET /api/auth/me`
Users (admin): `GET/POST /api/users`, `GET/PATCH/DELETE /api/users/:id`
Diamonds: `GET/POST /api/diamonds`, `GET/PATCH/DELETE /api/diamonds/:id`, `POST /api/diamonds/bulk-upload`, `PATCH /api/diamonds/:id/hold`
Customers: `GET/POST /api/customers`, `GET/PATCH/DELETE /api/customers/:id`
Memos: `GET/POST /api/memos`, `GET/PATCH/DELETE /api/memos/:id`, `POST /api/memos/:id/convert`
Invoices: `GET/POST /api/invoices`, `GET/PATCH/DELETE /api/invoices/:id`, `PATCH /api/invoices/:id/finalize`

Every route (except login + health) requires a `Bearer` token. Staff are additionally gated
by per-module permissions; admins bypass all checks.

## Diamond status workflow
`Added → Available → On Memo → On Invoice → Sold`, plus manual `On Hold`.
All transitions go through `src/services/statusEngine.js`. A diamond that is
`On Invoice` or `Sold` is rejected (409) from any new memo or invoice.

## Bulk Excel format
Header row (case-insensitive). Only **SKU** is required:
`SKU, Certificate Type, Certificate Number, Shape, Carat, Color, Clarity, Cut, Polish, Symmetry, Measurements, Origin, Price, Cost`

## Deploy to Render
1. Push this folder to its own GitHub repo.
2. Render → **New Web Service** → connect the repo.
3. Build command: `npm install` · Start command: `npm start`.
4. Add all env vars from the table above (set `CLIENT_URL` to your Vercel URL).
5. After first deploy, run the seed once (Render Shell: `npm run seed`) to create the admin.
6. Health check: `GET https://<service>.onrender.com/api/health`.
