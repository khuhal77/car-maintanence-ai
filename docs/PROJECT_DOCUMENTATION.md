# VEHIQ — Vehicle Part Diagnostics

**Photo-based diagnostics for car and bike parts, with live retailer price comparison.**

Built for Smart India Hackathon (SIH). This document is the single source of
truth for what the project is, how it's built, how it works end to end, and
how to run/extend it.

---

## 1. Problem Statement

Vehicle owners routinely face a fragmented, low-trust process when a part
wears out:

1. They can't always tell *what's* wrong or *how urgent* it is.
2. Once they know, they don't know which parts to buy.
3. Once they know the parts, comparing prices across retailers is manual
   and time-consuming.

**VEHIQ collapses this into one flow**: upload a photo → get a diagnosis with
a confidence score → see the exact replacement parts → compare prices across
retailers, ranked lowest to highest.

---

## 2. Product Overview

| | |
|---|---|
| **Name** | VEHIQ (Vehicle Diagnostics) |
| **Input** | A photo of a car/bike part (JPG, PNG, WEBP, ≤5MB) |
| **Output** | Issue description, severity, confidence score, recommended replacement parts, ranked retailer prices |
| **Scope (MVP)** | 7 part categories — battery, brake pads, spark plugs, air filter, oil filter, tires, wiper blades |
| **Users** | Individual vehicle owners (B2C); roadmap includes fleet/workshop B2B |

### Design principle
The MVP intentionally uses **mocked data for prices/retailers** and a
**placeholder-mapped pretrained model** for detection. This is a conscious
scope decision for a 36-hour build — see [Section 8](#8-known-limitations--why)
for the reasoning.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                    │
│  ┌───────────┐   ┌──────────────┐   ┌────────────────────┐  │
│  │  Upload    │──▶│  Diagnosis   │──▶│  Price Comparison   │  │
│  │  (home)    │   │  Card        │   │  (retailer ranking) │  │
│  └───────────┘   └──────────────┘   └────────────────────┘  │
│         │ axios (ApiContext)                                 │
└─────────┼──────────────────────────────────────────────────┘
          │  HTTP / JSON
┌─────────▼──────────────────────────────────────────────────┐
│                     BACKEND (FastAPI)                        │
│  ┌────────────────┐   ┌────────────────┐   ┌─────────────┐  │
│  │ /api/diagnose   │──▶│ car_parts.py    │──▶│ diagnosis.py │  │
│  │                 │   │ (YOLOv8 primary)│   │ (heuristic   │  │
│  │                 │   │                 │   │  fallback)   │  │
│  └────────────────┘   └────────────────┘   └─────────────┘  │
│  ┌────────────────┐   ┌────────────────────────────────┐    │
│  │ /api/prices     │──▶│ data/prices.json (mock retailers)│   │
│  └────────────────┘   └────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐     │
│  │ data/parts-db.json (issue → parts → symptoms map)   │     │
│  └────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────┘
```

### Data flow (single request lifecycle)

1. User uploads/drops an image on the home page (`app/page.tsx`).
2. `ImageUpload.tsx` reads the file as base64, calls `onImageSelect`.
3. `ApiContext.diagnose()` POSTs `{ image_base64 }` to `POST /api/diagnose`.
4. Backend route (`routes/diagnose.py`) strips the data-URI prefix and calls
   `detect_car_part()` in `models/car_parts.py`.
5. **Detection cascade** (see [Section 5](#5-detection-pipeline)):
   - YOLOv8 tries to match a known vehicle class → direct part mapping.
   - If it sees a vehicle but can't map it to a specific part → hands off
     to the heuristic classifier with a contextual note.
   - If YOLO finds nothing at all → heuristic classifier runs directly.
6. Result (`diagnosis`, `parts`, `avg_price`, `part_type`) is returned to
   the frontend and stored in `sessionStorage`.
7. Frontend navigates to `/result`, which reads the stored diagnosis and
   calls `POST /api/prices` with `{ part_type, base_price }`.
8. `routes/prices.py` applies each mock retailer's markup + random variance
   to the base price, sorts ascending, returns the list.
9. `/result` renders `DiagnosisCard` (severity, confidence, parts list) and
   `PriceComparison` (ranked retailer table).

---

## 4. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend framework | Next.js 14 (App Router) | File-based routing, fast iteration, good Vercel deploy story |
| Frontend language | TypeScript | Type safety across API boundary |
| Styling | Tailwind CSS + CSS custom properties | Utility speed + a custom design-token system (see design doc below) |
| Backend framework | FastAPI | Async, auto-generated docs at `/docs`, fast to iterate |
| Backend language | Python 3.11+ | Required for ML libraries |
| Detection model (primary) | YOLOv8n (Ultralytics, pretrained on COCO) | Free, fast, no training required for MVP |
| Detection model (fallback) | Custom heuristic (`diagnosis.py`) | Zero-dependency, deterministic, guarantees *a* result even when YOLO can't map the image |
| Data storage | JSON files (`data/*.json`) | No DB setup overhead; trivially editable during a live demo |
| HTTP client | Axios | Simple, typed, wraps error handling in `ApiContext` |

---

## 5. Detection Pipeline

This is the core "AI" of the app and the part most likely to be scrutinized
by judges, so it's documented in detail.

### 5.1 Primary path — YOLOv8n

`models/car_parts.py` loads a pretrained `yolov8n.pt` (COCO-trained, not
fine-tuned on car parts). Detected COCO classes are mapped to part
categories:

| COCO class | Part category | Confidence threshold |
|---|---|---|
| `car`, `truck`, `bus`, `train` | `vehicle_body` → battery | 0.15 |
| `motorcycle` | `motorcycle_part` → spark plug | 0.15 |
| `bicycle` | `wheel_part` → brake pad | 0.15 |
| `bottle` | `fluid_container` → oil filter | 0.15 |

The threshold is deliberately low (0.15) to catch partial/angled/close-up
shots, trading some precision for demo-time recall.

### 5.2 Vehicle-adjacent fallback

If YOLO detects a vehicle-related object that doesn't map to a specific
part (e.g. a full street scene with a distant car), the system does **not**
force a part guess — it hands off to the heuristic classifier with an
appended note: *"Vehicle detected in scene; closer photo of the part gives
a more specific result."*

### 5.3 Heuristic fallback — `diagnosis.py`

When YOLO finds nothing mappable, `classify_car_part_cnn()` runs a
lightweight brightness/contrast heuristic over the image and picks the
closest matching part class. This keeps the demo functional with zero
external model dependency, but:

- Confidence is **hard-capped at 60%**.
- The recommendation text is appended with an explicit low-confidence
  disclaimer.

This cascade is a deliberate honesty mechanism: the app always returns a
specific, useful result, but it never overstates certainty it doesn't have.

### 5.4 Roadmap: fine-tuned model

Post-hackathon, the natural next step is collecting a labeled dataset of
car/bike part photos (500–1000+ images per class) and fine-tuning
`yolov8n.pt` directly on those classes, eliminating the COCO-mapping layer
entirely.

---

## 6. API Reference

Base URL (local): `http://localhost:5000`

### `POST /api/diagnose`
Diagnose a car/bike part from a base64-encoded image.

**Request**
```json
{ "image_base64": "<base64 string, with or without data-URI prefix>" }
```

**Response** `200`
```json
{
  "diagnosis": {
    "type": "battery",
    "issue": "Car battery degraded or failing",
    "severity": "medium",
    "recommendation": "Check battery voltage (should be 12.6V)...",
    "parts": ["12V Car Battery 60Ah", "Battery Terminals", "Battery Cable"],
    "confidence": 0.82,
    "detected_object": "car",
    "detection_valid": true,
    "method": "yolo"
  },
  "parts": ["12V Car Battery 60Ah", "Battery Terminals", "Battery Cable"],
  "avg_price": 3500,
  "part_type": "battery"
}
```

### `POST /api/diagnose/upload`
Same as above but accepts a `multipart/form-data` file upload (`file`
field) instead of base64 JSON.

### `POST /api/prices`
**Request**
```json
{ "part_type": "battery", "base_price": 3500 }
```

**Response** `200` — array sorted ascending by price
```json
[
  { "retailer": "Flipkart", "logo": "🛍️", "price": 3680, "rating": 4.4, "delivery": "2 days", "link": "https://flipkart.com/search?q=car+battery" },
  { "retailer": "Amazon", "logo": "🛒", "price": 3850, "rating": 4.5, "delivery": "2-3 days", "link": "..." }
]
```

### `GET /api/prices/retailers`
Returns the configured mock retailer list (name, logo, delivery estimate).

### `GET /`, `GET /health`, `GET /api/info`
Health checks and a self-describing endpoint list.

Interactive Swagger docs are auto-generated at `/docs` when the server is
running.

---

## 7. Project Structure

```
car-maintenance-ai/
├── backend/
│   ├── models/
│   │   ├── car_parts.py     # YOLOv8 detection + part-category mapping
│   │   └── diagnosis.py     # Heuristic fallback classifier
│   ├── routes/
│   │   ├── diagnose.py       # POST /api/diagnose[/upload]
│   │   └── prices.py         # POST /api/prices, GET /api/prices/retailers
│   ├── utils/
│   │   └── helpers.py        # base64 validation, INR formatting, etc.
│   ├── data/
│   │   ├── parts-db.json      # Issue/severity/parts/symptoms per part type
│   │   └── prices.json        # Mock retailer markup + delivery config
│   ├── main.py                 # FastAPI app, CORS, routing, startup logs
│   ├── requirements.txt
│   ├── .env
│   └── README.md
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # Home — hero, upload viewfinder, part index
│   │   ├── layout.tsx          # Root layout, wraps app in ApiProvider
│   │   ├── globals.css         # Design tokens (colors, fonts, textures)
│   │   └── result/page.tsx     # Diagnostic report + price comparison
│   ├── components/
│   │   ├── ImageUpload.tsx      # Drag/drop + file picker, viewfinder style
│   │   ├── DiagnosisCard.tsx    # Severity strip, parts list, confidence bar
│   │   └── PriceComparison.tsx  # Ranked retailer table
│   ├── contexts/
│   │   └── ApiContext.tsx       # Axios wrapper, shared loading/error state
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── README.md
│
└── docs/                        # (this file lives here)
```

---

## 8. Known Limitations — Why

Every MVP shortcut below is a deliberate scope decision, not an oversight —
useful to state explicitly in a judged setting.

| Limitation | Why it's acceptable for MVP | Fix path |
|---|---|---|
| Detection uses a COCO-pretrained model, not one trained on car parts | No labeled dataset existed in the hackathon window | Collect 500–1000 labeled images/class, fine-tune YOLOv8 |
| Prices are mocked (markup formula, not live APIs) | Retailer API access/approval takes longer than 36 hrs | Swap `data/prices.json` logic for real Amazon/Flipkart affiliate APIs — route contract (`/api/prices`) doesn't need to change |
| Data stored in JSON files, not a database | Zero setup time, edit live during demo Q&A | Migrate to Postgres/MongoDB once multi-user state (history, accounts) is needed |
| Heuristic fallback is brightness/contrast-based, not a real CNN | Keeps the demo dependency-light and always-available | Replace with a trained lightweight classifier (MobileNetV2 transfer learning) |
| No user accounts / auth | Out of scope for a diagnostics MVP | Add auth (e.g. NextAuth) if the roadmap includes saved vehicle history |

---

## 9. Design System

The frontend follows a **diagnostic-instrument** visual identity (branded
"VEHIQ") rather than a generic e-commerce look — chosen deliberately so the
UI reads as a technical readout, reinforcing trust in the diagnosis itself.

| Token | Value | Use |
|---|---|---|
| `--bg-base` | `#0B0F14` | Page background |
| `--bg-panel` | `#141A21` | Card/panel surfaces |
| `--accent-signal` | `#FF6B35` | Primary actions, active states |
| `--accent-diagnostic` | `#2DD4A7` | Success/low-severity, "best price" |
| `--status-high` / `-medium` / `-low` | red / amber / green | Severity indicators |

**Typography**: Space Grotesk (display headings) + Inter (body copy) +
JetBrains Mono (all data — prices, confidence %, part codes) — the
monospace treatment is what makes results read as a scan output rather than
a shopping cart.

**Signature element**: the upload zone uses a camera-viewfinder frame with
corner brackets; the results page is laid out as a diagnostic report with a
severity status strip and confidence meter.

---

## 10. Setup & Running Locally

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```
Runs at `http://localhost:5000`. Docs at `/docs`.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs at `http://localhost:3000`. Requires backend running for API calls.

### Environment
`backend/.env` controls host/port/model/logging config — no secrets
required for local dev since no external APIs are called.

---

## 11. Deployment

| Layer | Recommended free tier |
|---|---|
| Backend | Render.com (Python web service) |
| Frontend | Vercel (native Next.js support) |

Update `API_BASE_URL` in `frontend/contexts/ApiContext.tsx` from
`http://localhost:5000` to the deployed backend URL before shipping.

**Note**: free tiers cold-start after inactivity — warm the backend up a
few minutes before a live demo/judging session.

---

## 12. Roadmap

1. **Fine-tune detection** on a labeled car/bike parts dataset.
2. **Real retailer integration** (Amazon/Flipkart affiliate APIs) behind
   the existing `/api/prices` contract.
3. **Expand vehicle scope** beyond cars/bikes (appliances, industrial
   equipment) using the same detection-cascade pattern.
4. **Persistent vehicle history** — track past diagnoses per vehicle, flag
   recurring issues.
5. **Mobile app** with native camera capture instead of file upload.
6. **Confidence-aware UX**: surface "get a second scan" prompts when
   confidence is low, rather than only a text disclaimer.

---

## 13. Impact & Business Case (for pitch)

- **Time saved**: seconds instead of manual research across multiple
  retailer sites/apps.
- **Cost saved**: typical spread between highest and lowest retailer price
  in the mock data is 10–15%, directly surfaced to the user.
- **Trust mechanism**: explicit confidence scoring and severity flags avoid
  presenting a photo-based guess as a certified diagnosis — positions the
  product as a triage/comparison tool, not a replacement for a mechanic.
- **Scalability**: the detection-cascade + JSON-driven parts/pricing
  pattern generalizes to other maintenance domains (appliances, industrial
  equipment) without architectural changes.
