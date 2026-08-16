# Car Maintenance AI — Frontend

Next.js 14 (App Router) + TypeScript + Tailwind CSS frontend for the
Car Maintenance AI SIH prototype.

## Structure

```
frontend/
├── app/
│   ├── page.tsx           # Home page (upload flow)
│   ├── layout.tsx         # Root layout, wraps app in ApiProvider
│   ├── globals.css        # Tailwind directives
│   └── result/
│       └── page.tsx       # Diagnosis + price results page
├── components/
│   ├── ImageUpload.tsx     # File picker + preview
│   ├── DiagnosisCard.tsx   # Severity-coded diagnosis display
│   └── PriceComparison.tsx # Retailer price comparison table
├── contexts/
│   └── ApiContext.tsx      # Axios calls to backend, shared loading/error state
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── tsconfig.json
```

## Setup

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. Requires the backend running at
`http://localhost:5000` (see `backend/README.md`).

## Flow

1. `app/page.tsx` — user uploads a photo via `ImageUpload`, which reads it
   as base64 and calls `diagnose()` from `ApiContext`.
2. Result is stored in `sessionStorage` and the user is routed to `/result`.
3. `app/result/page.tsx` reads the stored diagnosis, fetches prices via
   `getPrices()`, and renders `DiagnosisCard` + `PriceComparison`.

## Notes

- `API_BASE_URL` is hardcoded to `http://localhost:5000` in
  `contexts/ApiContext.tsx` — update this before deploying (e.g. to your
  Render backend URL).
- No `localStorage`/`sessionStorage` restrictions apply here since this is a
  standalone Next.js app (not a Claude artifact) — `sessionStorage` is used
  intentionally to pass data between pages.
