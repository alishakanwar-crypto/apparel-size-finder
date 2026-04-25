# SizeFit — Apparel Size Finder

A web application for apparel shops that takes customer body measurements and recommends the best-fitting shirt size from the shop's size chart.

## Features

- **Smart Size Matching** — Enter chest, shoulder, sleeve length, body length, and waist measurements. The app uses a weighted scoring algorithm to find the best-fitting size.
- **Size Chart Management** — Add, edit, and delete shirt sizes with their measurement ranges (pre-loaded with standard Indian sizes XS–3XL).
- **Customer Records** — Every measurement is saved with the customer's name, phone, recommended size, and fit score for future reference.
- **Fit Score** — Each recommendation includes a 0–100% fit score across all available sizes so the shopkeeper can see alternatives.

## Tech Stack

| Layer    | Technology                        |
| -------- | --------------------------------- |
| Backend  | Python, FastAPI, SQLite (aiosqlite) |
| Frontend | React, Vite, Tailwind CSS v4      |
| Icons    | Lucide React                      |

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
# API runs at http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# UI runs at http://localhost:5173 (proxies /api to backend)
```

## API Endpoints

| Method | Path                  | Description                    |
| ------ | --------------------- | ------------------------------ |
| GET    | `/api/sizes`          | List all sizes                 |
| POST   | `/api/sizes`          | Add a new size                 |
| PUT    | `/api/sizes/{id}`     | Update a size                  |
| DELETE | `/api/sizes/{id}`     | Delete a size                  |
| POST   | `/api/recommend`      | Get size recommendation        |
| GET    | `/api/customers`      | List customer records          |
| DELETE | `/api/customers/{id}` | Delete a customer record       |

## Size Matching Algorithm

The engine computes a weighted fit score for each size:
- **Chest** (weight 3.0) and **Waist** (weight 2.0) use range-based matching — zero penalty if within the size's min–max range.
- **Shoulder** (weight 2.5), **Sleeve Length** (1.5), and **Body Length** (1.0) use point-based matching.
- Penalties are converted to a 0–100 score using exponential decay.
