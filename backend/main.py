from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import aiosqlite

from database import get_db, init_db, seed_default_sizes
from models import (
    SizeCreate,
    SizeUpdate,
    SizeResponse,
    MeasurementInput,
    SizeRecommendation,
    CustomerRecord,
)
from sizing import compute_fit_score, fit_label


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_default_sizes()
    yield


app = FastAPI(
    title="Apparel Size Finder",
    description="Takes customer measurements and recommends the best-fitting shirt size.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Size Chart CRUD ──────────────────────────────────────────────────────────


@app.get("/api/sizes", response_model=list[SizeResponse])
async def list_sizes(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        "SELECT id, name, chest_min, chest_max, shoulder, sleeve_length, body_length, waist_min, waist_max FROM sizes ORDER BY chest_min"
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@app.post("/api/sizes", response_model=SizeResponse, status_code=201)
async def create_size(size: SizeCreate, db: aiosqlite.Connection = Depends(get_db)):
    try:
        cursor = await db.execute(
            """INSERT INTO sizes (name, chest_min, chest_max, shoulder, sleeve_length, body_length, waist_min, waist_max)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (size.name, size.chest_min, size.chest_max, size.shoulder, size.sleeve_length, size.body_length, size.waist_min, size.waist_max),
        )
        await db.commit()
        new_id = cursor.lastrowid
    except aiosqlite.IntegrityError:
        raise HTTPException(status_code=400, detail=f"Size '{size.name}' already exists")
    return {**size.model_dump(), "id": new_id}


@app.put("/api/sizes/{size_id}", response_model=SizeResponse)
async def update_size(size_id: int, updates: SizeUpdate, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT * FROM sizes WHERE id = ?", (size_id,))
    existing = await cursor.fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Size not found")

    data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join(f"{k} = ?" for k in data)
    values = list(data.values()) + [size_id]
    await db.execute(f"UPDATE sizes SET {set_clause} WHERE id = ?", values)
    await db.commit()

    cursor = await db.execute("SELECT * FROM sizes WHERE id = ?", (size_id,))
    row = await cursor.fetchone()
    return dict(row)


@app.delete("/api/sizes/{size_id}", status_code=204)
async def delete_size(size_id: int, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT id FROM sizes WHERE id = ?", (size_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Size not found")
    await db.execute("DELETE FROM sizes WHERE id = ?", (size_id,))
    await db.commit()


# ── Recommendation Engine ────────────────────────────────────────────────────


@app.post("/api/recommend", response_model=SizeRecommendation)
async def recommend_size(measurement: MeasurementInput, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT * FROM sizes ORDER BY chest_min")
    sizes = [dict(r) for r in await cursor.fetchall()]

    if not sizes:
        raise HTTPException(status_code=400, detail="No sizes configured. Add sizes first.")

    scores = []
    for s in sizes:
        score = compute_fit_score(
            measurement.chest,
            measurement.shoulder,
            measurement.sleeve_length,
            measurement.body_length,
            measurement.waist,
            s,
        )
        scores.append({"size": s["name"], "score": score, "label": fit_label(score)})

    scores.sort(key=lambda x: x["score"], reverse=True)
    best = scores[0]

    # Save customer record
    cursor = await db.execute(
        """INSERT INTO customers (name, phone, chest, shoulder, sleeve_length, body_length, waist, recommended_size, fit_score)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            measurement.name,
            measurement.phone,
            measurement.chest,
            measurement.shoulder,
            measurement.sleeve_length,
            measurement.body_length,
            measurement.waist,
            best["size"],
            best["score"],
        ),
    )
    await db.commit()

    return SizeRecommendation(
        recommended_size=best["size"],
        fit_score=best["score"],
        fit_label=best["label"],
        all_scores=scores,
        customer_id=cursor.lastrowid,
    )


# ── Customer Records ─────────────────────────────────────────────────────────


@app.get("/api/customers", response_model=list[CustomerRecord])
async def list_customers(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        "SELECT * FROM customers ORDER BY created_at DESC LIMIT 100"
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@app.delete("/api/customers/{customer_id}", status_code=204)
async def delete_customer(customer_id: int, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT id FROM customers WHERE id = ?", (customer_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Customer not found")
    await db.execute("DELETE FROM customers WHERE id = ?", (customer_id,))
    await db.commit()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
