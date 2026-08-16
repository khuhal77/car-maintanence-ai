# Car Maintenance AI — Backend

FastAPI backend that diagnoses car part issues from a photo and returns
recommended replacement parts + a price comparison across mock retailers.

## Structure

```
backend/
├── models/
│   ├── car_parts.py     # YOLOv8-based detection + diagnosis mapping
│   └── diagnosis.py     # Lightweight heuristic/CNN fallback classifier
├── routes/
│   ├── diagnose.py       # POST /api/diagnose, /api/diagnose/upload
│   └── prices.py         # POST /api/prices, GET /api/prices/retailers
├── utils/
│   └── helpers.py        # base64 validation, formatting helpers
├── data/
│   ├── parts-db.json      # Mock parts/issues database
│   └── prices.json        # Mock retailer markup/delivery data
├── main.py                # FastAPI app entry point
├── requirements.txt
└── .env
```

## Setup

```bash
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```

Server runs at `http://localhost:5000`. Interactive docs at `/docs`.

## API Endpoints

### `POST /api/diagnose`
```json
{ "image_base64": "..." }
```
Returns diagnosis, recommended parts, and average price.

### `POST /api/diagnose/upload`
Multipart file upload alternative to the base64 endpoint.

### `POST /api/prices`
```json
{ "part_type": "battery", "base_price": 3500 }
```
Returns a sorted list of retailer prices.

### `GET /api/prices/retailers`
Returns the list of configured mock retailers.

## Notes

- `car_parts.py` uses pretrained YOLOv8n (COCO classes), mapped to car-part
  categories as a placeholder. For production, fine-tune YOLOv8 on a labeled
  car-parts dataset.
- `diagnosis.py` provides a fast, dependency-light heuristic fallback so the
  demo works even if YOLO/TensorFlow fails to load.
- All pricing is mocked via `data/prices.json`; swap in real retailer APIs
  later without changing the route contract.
