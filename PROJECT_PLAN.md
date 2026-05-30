# Diamond Inventory Management Software — Full Build Plan (A → Z)

> **Goal:** A deployed, secure, full-stack diamond inventory app with 4 CRUD modules,
> Excel bulk import, image uploads, an automatic diamond status workflow, role-based
> access (Admin/Staff), and printable memos & invoices.
>
> **Stack:** React + Vite (Vercel) · Node + Express (Render) · MongoDB · Cloudinary · JWT auth
>
> **Reference:** SH/TECH/TASK/2026-016 · Contact: jay@stienhardt.com

---

## ✅ BUILD STATUS (updated)

**The full app is built, optimized, validated, and running against MongoDB Atlas.** What's done vs. what's left for you:

| Area | Status |
|---|---|
| Backend API (Express) — auth, RBAC, all 4 modules, status engine, Excel, Cloudinary | ✅ Built |
| Frontend (React + Vite + Tailwind) — login, dashboard, all 4 modules, print, staff mgmt | ✅ Built |
| Diamond status workflow + integrity guards | ✅ Built & tested |
| **Performance**: DB indexes, pagination, lean projections, gzip, stats aggregation | ✅ Built |
| **Concurrency-safe atomic status engine** (no double-claims) | ✅ Built & tested |
| **Security**: helmet, rate limiting, JWT, bcrypt | ✅ Built |
| **Form validation** (Zod, backend + frontend, inline errors) | ✅ Built & tested |
| **Frontend UX**: React Query caching, live search, sortable/paginated tables, optimistic UI, code splitting, skeletons, password eye | ✅ Built |
| End-to-end smoke test (`cd backend && npm test`) | ✅ 29/29 passing |
| **MongoDB Atlas** — cluster connected, `stienhardt_inventory` DB, admin seeded | ✅ Done |
| **Demo data** (`npm run seed:demo`) — 24 diamonds, 6 customers, memos, invoices, staff | ✅ Done |
| Runs locally now against Atlas (`npm run dev` + `npm run dev` in frontend) | ✅ Working |
| **Cloudinary account + keys** | ⬜ Optional — only for image/cert uploads |
| **GitHub repos (push both folders)** | ⬜ You do (I'll help) |
| **Deploy backend → Render** | ⬜ You do (steps in backend/README.md) |
| **Deploy frontend → Vercel** | ⬜ You do (steps in frontend/README.md) |
| **Set strong production admin password before seeding live** | ⬜ You do |

**Run it now:** backend `cd backend && npm run dev`, frontend `cd frontend && npm run dev`,
open http://localhost:5173, log in as `admin@stienhardt.com` / `Admin@12345`
(staff demo: `staff@stienhardt.com` / `Staff@12345`).

---

## 0. How to use this document
- Every `- [ ]` is a task. Change it to `- [x]` when done.
- Build **top to bottom**. The order is chosen so each step unlocks the next.
- If you run out of time, the **Priority order (Section 11)** tells you what to cut.

---

## 1. Architecture Overview

```
┌─────────────────────┐      REST API (JWT)      ┌──────────────────────┐
│  React + Vite        │  ───────────────────────>│  Node + Express       │
│  (Vercel)            │  <───────────────────────│  (Render)             │
│  - UI, forms, tables │      JSON over HTTPS      │  - Auth, RBAC         │
│  - Auth token store  │                           │  - Business logic     │
└─────────────────────┘                           │  - Status engine      │
                                                    └──────┬───────┬───────┘
                                                           │       │
                                                  ┌────────▼─┐  ┌──▼────────┐
                                                  │ MongoDB   │  │ Cloudinary │
                                                  │ (Atlas)   │  │ (images)   │
                                                  └───────────┘  └───────────┘
```

**Hard rules from the brief:**
- [x] Frontend and backend are **two separate projects** (decoupled)
- [x] Frontend talks to backend **only via REST APIs** (no direct DB access from client)
- [x] **All secrets in environment variables** — never committed to GitHub
- [ ] Clean Git commits + a clear README per repo *(READMEs ✅ written; git push pending)*

---

## 2. Repository & Folder Structure

**Decision:** Two separate repos (cleanest for the "decoupled" requirement). Mono-repo is allowed too.

### Backend repo — `diamond-inventory-api`
```
diamond-inventory-api/
├── src/
│   ├── config/
│   │   ├── db.js                 # Mongo connection
│   │   └── cloudinary.js         # Cloudinary config
│   ├── models/
│   │   ├── User.js               # Admin/Staff + permissions
│   │   ├── Diamond.js
│   │   ├── Customer.js
│   │   ├── Memo.js
│   │   └── Invoice.js
│   ├── middleware/
│   │   ├── auth.js               # verify JWT
│   │   ├── rbac.js               # role + permission checks
│   │   ├── upload.js             # multer (memory) for Cloudinary/Excel
│   │   └── errorHandler.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── user.controller.js    # admin manages staff
│   │   ├── diamond.controller.js
│   │   ├── customer.controller.js
│   │   ├── memo.controller.js
│   │   └── invoice.controller.js
│   ├── services/
│   │   ├── statusEngine.js       # ⭐ diamond status transitions (single source of truth)
│   │   └── excelParser.js        # SheetJS parse + validate
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── diamond.routes.js
│   │   ├── customer.routes.js
│   │   ├── memo.routes.js
│   │   └── invoice.routes.js
│   ├── utils/
│   │   └── validators.js
│   └── app.js                    # express app (routes + middleware)
├── server.js                     # entry point
├── .env.example                  # documented, no real secrets
├── .gitignore                    # node_modules, .env
├── package.json
└── README.md
```

### Frontend repo — `diamond-inventory-web`
```
diamond-inventory-web/
├── src/
│   ├── api/
│   │   └── client.js             # axios instance + token interceptor
│   ├── auth/
│   │   ├── AuthContext.jsx       # current user, token, login/logout
│   │   └── ProtectedRoute.jsx    # route guard + permission gate
│   ├── components/
│   │   ├── layout/               # Sidebar, Topbar, Layout
│   │   ├── ui/                   # Button, Modal, Table, Input, Badge
│   │   └── PrintDocument.jsx     # shared printable layout
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── diamonds/             # List, Form, BulkUpload
│   │   ├── customers/            # List, Form
│   │   ├── memos/                # List, Form, View/Print
│   │   ├── invoices/             # List, Form, View/Print
│   │   └── staff/                # Admin-only: manage staff + permissions
│   ├── hooks/
│   ├── lib/                      # helpers, status colors, formatting
│   ├── App.jsx                   # router
│   └── main.jsx
├── .env.example                  # VITE_API_URL
├── .gitignore
├── package.json
├── vite.config.js
└── README.md
```

**Checklist:**
- [ ] Backend repo created + pushed to GitHub
- [ ] Frontend repo created + pushed to GitHub
- [x] `.gitignore` includes `node_modules` and `.env` in both
- [x] `.env.example` written in both (documents every variable)

---

## 3. Data Models (MongoDB / Mongoose)

### 3.1 User
- [x] `name` (String)
- [x] `email` (String, unique, required)
- [x] `passwordHash` (String) — bcrypt
- [x] `role` (enum: `admin` | `staff`)
- [x] `permissions` (object/array) — e.g. `{ diamonds: {read,create,update,delete}, customers:{...}, memos:{...}, invoices:{...} }`
- [x] `isActive` (Boolean, default true)
- [x] timestamps
- **Note:** Admin has all permissions implicitly. Staff permissions are set by Admin.

### 3.2 Diamond
- [x] `sku` (String, unique, required)
- [x] `certificateType` (enum: IGI, GIA, OTHER)
- [x] `certificateNumber` (String)
- [x] `shape` (String — Round, Oval, Princess, …)
- [x] `carat` (Number)
- [x] `color` (String)
- [x] `clarity` (String)
- [x] `cut` (String)
- [x] `polish` (String)
- [x] `symmetry` (String)
- [x] `measurements` (String)
- [x] `origin` (enum: `lab-grown` | `natural`)
- [x] `price` (Number) and/or `cost` (Number)
- [x] `imageUrl` (String — Cloudinary)
- [x] `certificateUrl` (String — Cloudinary)
- [x] `status` (enum: `Added`|`Available`|`On Memo`|`On Invoice`|`Sold`|`On Hold`)
- [x] `currentMemo` (ref Memo, nullable)
- [x] `currentInvoice` (ref Invoice, nullable)
- [x] timestamps
- [x] *(added)* DB indexes (status+createdAt, text search) + `toJSON` strips internal fields

### 3.3 Customer
- [x] `name` (required)
- [x] `company`
- [x] `phone`
- [x] `email`
- [x] `address`
- [x] `notes` / business details
- [x] timestamps

### 3.4 Memo
- [x] `memoNumber` (auto-generated, unique — e.g. `MEMO-0001`)
- [x] `customer` (ref Customer, required)
- [x] `items` (array of `{ diamond: ref, price: Number }`)
- [x] `totalAmount` (Number)
- [x] `status` (enum: `active` | `converted` | `cancelled`)
- [x] `convertedInvoice` (ref Invoice, nullable)
- [x] `createdBy` (ref User)
- [x] timestamps

### 3.5 Invoice
- [x] `invoiceNumber` (auto-generated, unique — e.g. `INV-0001`)
- [x] `customer` (ref Customer, required)
- [x] `items` (array of `{ diamond: ref, price: Number }`)
- [x] `totalAmount` (Number)
- [x] `status` (enum: `open` | `finalized` | `cancelled`)
- [x] `sourceMemo` (ref Memo, nullable — if converted)
- [x] `createdBy` (ref User)
- [x] timestamps

**Checklist:**
- [x] All 5 models written and connected to Mongo (+ Counter model for memo/invoice numbers)

---

## 4. ⭐ Diamond Status Engine (most-tested logic)

Status flow:
```
Added → Available → On Memo → On Invoice → Sold
                 ↕
              On Hold   (manual reserve, applied/removed outside normal flow)
```

**Rules to implement in `statusEngine.js` (one place, reused everywhere):**
- [x] New diamond starts as `Added` (or auto-promote to `Available`)
- [x] Adding to a memo → diamond becomes `On Memo`
- [x] Converting memo → invoice → diamond becomes `On Invoice`
- [x] Finalizing invoice → diamond becomes `Sold`
- [x] `On Hold` can be set/cleared manually (returns to `Available`)
- [x] **GUARD:** a diamond that is `On Invoice` or `Sold` **cannot** be added to a new memo or invoice → return `409 Conflict`
- [x] **GUARD:** a diamond `On Hold` cannot be added to memo/invoice until released
- [x] Removing a diamond from a memo/deleting a memo → status reverts to `Available`
- [x] Deleting an invoice → revert diamond status appropriately

**Checklist:**
- [x] Status engine written as a single reusable module
- [x] All memo/invoice operations route status changes through it
- [x] Edge cases above tested (automated smoke test, incl. concurrency)
- [x] *(added)* Atomic, concurrency-safe claims — two simultaneous requests can't double-claim a diamond

---

## 5. Authentication & Security

- [x] Passwords hashed with **bcrypt** (never stored plain)
- [x] Login issues a **JWT** (signed with `JWT_SECRET`)
- [x] `auth` middleware verifies token on every protected route
- [x] Unauthenticated request → **401**
- [x] Authenticated but lacks permission → **403**
- [x] JWT secret + DB URI + Cloudinary keys all in env vars
- [x] CORS configured to allow the Vercel frontend origin
- [x] (Optional) seed script to create the first Admin
- [x] *(added)* helmet security headers + rate limiting (global + strict on `/auth`)
- [x] *(added)* Zod validation on every write route (400 + field errors)

---

## 6. Roles & Permissions (RBAC)

- [x] **Admin:** full access to all modules
- [x] **Admin** can create / edit / deactivate **Staff** accounts
- [x] **Admin** sets each Staff member's permissions per module (read/create/update/delete)
- [x] `rbac` middleware enforces permissions on **backend** routes
- [x] Frontend **hides/disables** UI the user can't access (visibility only — backend is the real gate)
- [x] Staff cannot access the Staff-management page

---

## 7. Backend REST API (routes)

### Auth
- [x] `POST /api/auth/login`
- [x] `GET  /api/auth/me`
- [x] seed script creates the first Admin (`npm run seed`)

### Users (Admin only)
- [x] `GET    /api/users`
- [x] `POST   /api/users`            (create staff)
- [x] `PATCH  /api/users/:id`        (update info/permissions)
- [x] `DELETE /api/users/:id`        (or deactivate)

### Diamonds
- [x] `GET    /api/diamonds`         (paginated, filter by status/search, lean projection)
- [x] `GET    /api/diamonds/stats`   (aggregated counts + inventory value)
- [x] `GET    /api/diamonds/:id`
- [x] `POST   /api/diamonds`         (single add, with image/cert upload)
- [x] `PATCH  /api/diamonds/:id`
- [x] `DELETE /api/diamonds/:id`
- [x] `POST   /api/diamonds/bulk-upload`  (Excel file → parse → validate → insert)
- [x] `PATCH  /api/diamonds/:id/hold`     (toggle On Hold)

### Customers
- [x] `GET / GET:id / POST / PATCH / DELETE  /api/customers`

### Memos
- [x] `GET    /api/memos`
- [x] `GET    /api/memos/:id`
- [x] `POST   /api/memos`              (select diamonds + customer → set On Memo)
- [x] `PATCH  /api/memos/:id`
- [x] `DELETE /api/memos/:id`          (revert diamond statuses)
- [x] `POST   /api/memos/:id/convert`  (→ Invoice, set On Invoice)

### Invoices
- [x] `GET    /api/invoices`
- [x] `GET    /api/invoices/:id`
- [x] `POST   /api/invoices`           (select diamonds + customer)
- [x] `PATCH  /api/invoices/:id`
- [x] `DELETE /api/invoices/:id`
- [x] `PATCH  /api/invoices/:id/finalize` (→ Sold)

**Checklist:**
- [x] Every route protected by `auth` + `rbac`
- [x] Correct status codes (200/201/400/401/403/404/409)
- [x] Health check route `GET /api/health` (useful for Render)

---

## 8. File & Excel Handling

- [x] `multer` (memory storage) to receive uploads
- [x] Image/certificate → upload buffer to **Cloudinary**, save returned URL
- [x] Excel bulk upload → **SheetJS (xlsx)** parse rows
- [x] Validate each row (required fields, types, duplicate SKU)
- [x] Insert valid rows; return a **summary** (`inserted`, `skipped`, `errors[]`)
- [x] Provide a **sample Excel template** (`npm run sample-excel` → `sample-diamonds.xlsx`)

---

## 9. Frontend (React + Vite)

### Setup
- [x] Vite project + React Router + axios
- [x] `client.js` axios instance attaches JWT from storage
- [x] `AuthContext` (login, logout, current user, permissions)
- [x] `ProtectedRoute` guards routes; permission gate hides nav items
- [x] Tailwind styling
- [x] *(added)* React Query for caching/dedup; route-level code splitting

### Pages / Features
- [x] **Login page** (with show/hide password eye + whitespace-trim)
- [x] **Layout** (sidebar nav + topbar with logout)
- [x] **Dashboard** (counts + inventory-by-status + total value, via stats endpoint)
- [x] **Diamonds:** list/table with status badges + **live search** + status filter + **sortable columns** + **pagination**
- [x] **Diamonds:** add/edit form with image + certificate upload + **inline validation**
- [x] **Diamonds:** bulk Excel upload screen (show result summary)
- [x] **Diamonds:** On Hold toggle (optimistic)
- [x] **Customers:** list + add/edit form + delete + live search + validation
- [x] **Memos:** list (paginated)
- [x] **Memos:** create (searchable diamond picker + pick customer + order summary/totals)
- [x] **Memos:** view + **Print** (branded printable layout)
- [x] **Memos:** convert to invoice button
- [x] **Invoices:** list (paginated)
- [x] **Invoices:** create (select diamonds + customer) and/or from memo
- [x] **Invoices:** view + **Print**
- [x] **Invoices:** finalize → Sold
- [x] **Staff management (Admin only):** create staff + set permissions + validation

### Print
- [x] Shared `PrintDocument` component: company branding, customer details, line items, totals
- [x] Uses `window.print()` with print-friendly CSS

---

## 10. Deployment

### MongoDB Atlas
- [ ] Create free cluster + DB user
- [ ] Get connection string (URI)
- [ ] Allow network access (0.0.0.0/0 for demo)

### Cloudinary
- [ ] Create account, grab cloud name + API key + secret

### Backend → Render
- [ ] Push backend to GitHub
- [ ] Create Render Web Service from repo
- [ ] Set env vars: `MONGO_URI`, `JWT_SECRET`, `CLOUDINARY_*`, `CLIENT_URL`, `PORT`
- [ ] Confirm live backend URL responds at `/api/health`

### Frontend → Vercel
- [ ] Push frontend to GitHub
- [ ] Import project into Vercel
- [ ] Set env var: `VITE_API_URL` = live Render URL
- [ ] Confirm live frontend URL loads and can log in

### Wiring
- [ ] Update backend CORS to allow the Vercel domain
- [ ] End-to-end test on live URLs (login → add diamond → memo → invoice → sold)

---

## 11. Priority Order (if time runs short — brief says "secure core over broken breadth")

1. **P0 — must ship:** Auth (login + JWT + hashed pw), Diamond CRUD, Customer CRUD, status workflow, deployed live URLs
2. **P1 — core value:** Memo create + On Memo, Invoice create + On Invoice + Sold, convert memo→invoice, status guard (409 on Sold/On Invoice)
3. **P2 — strong polish:** Excel bulk upload, Cloudinary image/cert upload, Print buttons, RBAC staff management
4. **P3 — nice-to-have:** Dashboard stats, filters/search, On Hold toggle, sample Excel template

> Document anything left incomplete in the README.

---

## 12. Final Deliverables Checklist (what they grade)

- [ ] **Live frontend URL** (Vercel) — working
- [ ] **Live backend URL** (Render) — working
- [ ] **GitHub repo(s)** — clean commits, no committed secrets
- [x] **README** — setup steps + env var list + sample Excel format + demo admin login + notes
- [x] **Working auth** with hashed passwords
- [x] **Admin + Staff roles** enforced on backend AND frontend
- [x] **Diamond module** — full CRUD + single add + Excel bulk + image upload
- [x] **Customer module** — full CRUD + selectable in memo/invoice
- [x] **Memo module** — full CRUD + On Memo + order summary + print + convert
- [x] **Invoice module** — full CRUD + On Invoice + Sold + order summary + print
- [x] **Status integrity** — Sold/On Invoice diamonds blocked from new memo/invoice (tested)
- [ ] **All secrets in env vars** on Render + Vercel dashboards *(local env ✅; set on dashboards at deploy)*

---

## 13. Suggested 2-Day Timeline

**Day 1 (Backend foundation + deploy early)**
- Morning: repos, Mongo, models, auth + JWT + RBAC middleware
- Afternoon: Diamond + Customer CRUD, status engine, deploy backend to Render (deploy early to catch issues)

**Day 1 evening:** Frontend scaffold, auth flow, Diamond + Customer pages, deploy to Vercel

**Day 2 (Transactions + polish)**
- Morning: Memo create/convert + Invoice create/finalize + status guards
- Afternoon: Excel upload, Cloudinary, Print pages, Staff management
- Evening: end-to-end test on live URLs, write READMEs, final commits

---

_Tick boxes as you build. When in doubt, prioritize a secure, working core that is deployed live._
