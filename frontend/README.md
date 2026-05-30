# Diamond Inventory — Frontend

React + Vite single-page app for the Stienhardt Diamond Inventory Management Software.
Talks to the backend exclusively over REST. Includes login, role-aware navigation,
the four modules, Excel bulk upload, image uploads, and printable memos/invoices.

## Tech
React 18 · Vite · React Router · Axios · Tailwind CSS

## Setup

```bash
cd frontend
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev               # http://localhost:5173
```

Set `VITE_API_URL` to your backend's base URL **including `/api`**:
- Local: `http://localhost:5000/api`
- Production: `https://<your-render-service>.onrender.com/api`

## Scripts
| Command | Description |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |

## How auth works
On login the JWT is stored in `localStorage` and attached to every request by an Axios
interceptor. `AuthContext` exposes `can(module, action)` so the UI hides actions a Staff
member isn't permitted to perform. The backend independently enforces the same rules —
the UI gating is convenience, not security.

## Pages
- **Login**
- **Dashboard** — counts + inventory-by-status + total value
- **Diamonds** — table with filters/search, single add/edit (+ image & certificate upload), Excel bulk upload, On Hold toggle
- **Customers** — full CRUD
- **Memos** — create (pick customer + available diamonds, order summary), view/print, convert to invoice
- **Invoices** — create, view/print, finalize (→ Sold)
- **Staff** (admin only) — create staff and set per-module permissions

## Deploy to Vercel
1. Push this folder to its own GitHub repo.
2. Vercel → **Add New Project** → import the repo (framework auto-detected: Vite).
3. Add env var `VITE_API_URL` = your Render backend URL + `/api`.
4. Deploy. Then set the backend's `CLIENT_URL` to this Vercel URL and redeploy the backend.
