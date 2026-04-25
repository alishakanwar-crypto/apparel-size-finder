# SizeFit — Apparel Size Finder

A web application for apparel shops that takes customer body measurements and recommends the best-fitting shirt size from the shop's size chart. Includes AI-powered image-based body measurement estimation.

## Features

- **Smart Size Matching** — Enter chest, shoulder, sleeve length, body length, and waist measurements. The app uses a weighted scoring algorithm to find the best-fitting size.
- **AI Size Detection** — Capture or upload a customer photo to automatically estimate body measurements using computer vision (MediaPipe Pose).
- **Dummy Calibration** — Calibrate the system with a reference mannequin of known measurements to establish pixel-to-real-world scaling.
- **Best Fit + Comfort Fit** — AI mode recommends a primary size and an alternative comfort-fit option with confidence scores.
- **Size Chart Management** — Add, edit, and delete shirt sizes with their measurement ranges (pre-loaded with standard Indian sizes XS–3XL).
- **Customer Records** — Every measurement (manual or AI) is saved with the customer's name, phone, recommended size, and fit score.
- **Privacy First** — Customer images are processed in-memory and never stored.

## Tech Stack

| Layer    | Technology                                       |
| -------- | ------------------------------------------------ |
| Backend  | Python, FastAPI, SQLite (aiosqlite)              |
| AI/CV    | MediaPipe Pose Landmarker, OpenCV, NumPy         |
| Frontend | React, Vite, Tailwind CSS v4                     |
| Icons    | Lucide React                                     |

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
# API runs at http://localhost:8000
# Pose model (~30 MB) is auto-downloaded on first startup
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# UI runs at http://localhost:5173 (proxies /api to backend)
```

## How the AI Sizing Works

1. **Calibrate** — Place a reference mannequin (dummy) at the shop entrance. Upload its photo and enter its known measurements (shoulder width, chest, torso length). The system computes a pixels-per-inch ratio.
2. **Capture** — When a customer arrives, use the camera or upload a photo. The customer should be standing straight, facing forward, with full body visible.
3. **Detect** — MediaPipe Pose detects 33 body landmarks. Key distances (shoulder width, torso length, arm length, hip width) are extracted in pixels.
4. **Convert** — Pixel distances are converted to real inches using the calibration ratio. Circumference measurements (chest, waist) are estimated from width using geometric approximation.
5. **Match** — The weighted scoring engine finds the best-fitting and comfort-fit sizes from the store's size chart.

## API Endpoints

| Method | Path                     | Description                          |
| ------ | ------------------------ | ------------------------------------ |
| GET    | `/api/sizes`             | List all sizes                       |
| POST   | `/api/sizes`             | Add a new size                       |
| PUT    | `/api/sizes/{id}`        | Update a size                        |
| DELETE | `/api/sizes/{id}`        | Delete a size                        |
| POST   | `/api/recommend`         | Get size recommendation (manual)     |
| GET    | `/api/customers`         | List customer records                |
| DELETE | `/api/customers/{id}`    | Delete a customer record             |
| POST   | `/api/calibration`       | Calibrate with reference dummy image |
| GET    | `/api/calibration`       | Get active calibration               |
| DELETE | `/api/calibration/{id}`  | Delete a calibration                 |
| POST   | `/api/ai-measure`        | AI-based measurement + recommendation|

## Size Matching Algorithm

The engine computes a weighted fit score for each size:
- **Chest** (weight 3.0) and **Waist** (weight 2.0) use range-based matching — zero penalty if within the size's min–max range.
- **Shoulder** (weight 2.5), **Sleeve Length** (1.5), and **Body Length** (1.0) use point-based matching.
- Penalties are converted to a 0–100 score using exponential decay.
