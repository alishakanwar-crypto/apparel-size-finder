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
    CalibrationCreate,
    CalibrationResponse,
    AIImageInput,
    AIEstimatedMeasurements,
    AISizeRecommendation,
)
from sizing import compute_fit_score, fit_label
from pose_estimation import (
    decode_image,
    detect_pose,
    extract_pixel_measurements,
    compute_real_measurements,
    draw_landmarks_on_image,
)
from model_downloader import ensure_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_model()
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
    try:
        await db.execute(f"UPDATE sizes SET {set_clause} WHERE id = ?", values)
        await db.commit()
    except aiosqlite.IntegrityError:
        raise HTTPException(status_code=400, detail=f"Size name '{data.get('name', '')}' already exists")

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


# ── Calibration ──────────────────────────────────────────────────────────────


@app.post("/api/calibration", response_model=CalibrationResponse, status_code=201)
async def create_calibration(cal: CalibrationCreate, db: aiosqlite.Connection = Depends(get_db)):
    """Calibrate using a reference dummy image with known measurements."""
    try:
        image = decode_image(cal.image_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    landmarks = detect_pose(image)
    if not landmarks:
        raise HTTPException(status_code=400, detail="Could not detect pose in calibration image. Ensure the full body is visible.")

    pixel_meas = extract_pixel_measurements(landmarks)

    # Compute pixels-per-inch using shoulder width as primary reference
    ppi_shoulder = pixel_meas.shoulder_width_px / cal.shoulder_real
    ppi_torso = pixel_meas.torso_length_px / cal.torso_real
    pixels_per_inch = (ppi_shoulder + ppi_torso) / 2

    # Deactivate previous calibrations
    await db.execute("UPDATE calibration SET is_active = 0")

    cursor = await db.execute(
        """INSERT INTO calibration (name, chest_real, shoulder_real, torso_real,
           shoulder_px, torso_px, chest_px, pixels_per_inch, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)""",
        (cal.name, cal.chest_real, cal.shoulder_real, cal.torso_real,
         pixel_meas.shoulder_width_px, pixel_meas.torso_length_px,
         pixel_meas.chest_width_px, pixels_per_inch),
    )
    await db.commit()

    return CalibrationResponse(
        id=cursor.lastrowid,
        name=cal.name,
        chest_real=cal.chest_real,
        shoulder_real=cal.shoulder_real,
        torso_real=cal.torso_real,
        shoulder_px=pixel_meas.shoulder_width_px,
        torso_px=pixel_meas.torso_length_px,
        chest_px=pixel_meas.chest_width_px,
        pixels_per_inch=pixels_per_inch,
        is_active=True,
    )


@app.get("/api/calibration", response_model=CalibrationResponse | None)
async def get_active_calibration(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT * FROM calibration WHERE is_active = 1 ORDER BY id DESC LIMIT 1")
    row = await cursor.fetchone()
    if not row:
        return None
    data = dict(row)
    data["is_active"] = bool(data["is_active"])
    return data


@app.delete("/api/calibration/{cal_id}", status_code=204)
async def delete_calibration(cal_id: int, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT id FROM calibration WHERE id = ?", (cal_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Calibration not found")
    await db.execute("DELETE FROM calibration WHERE id = ?", (cal_id,))
    await db.commit()


# ── AI Size Estimation ───────────────────────────────────────────────────────


@app.post("/api/ai-measure", response_model=AISizeRecommendation)
async def ai_measure(payload: AIImageInput, db: aiosqlite.Connection = Depends(get_db)):
    """Estimate body measurements from an image and recommend sizes."""
    # Get active calibration
    cursor = await db.execute("SELECT * FROM calibration WHERE is_active = 1 ORDER BY id DESC LIMIT 1")
    cal_row = await cursor.fetchone()
    if not cal_row:
        raise HTTPException(status_code=400, detail="No calibration found. Please calibrate with a reference dummy first.")
    cal = dict(cal_row)

    # Decode and process image
    try:
        image = decode_image(payload.image_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    landmarks = detect_pose(image)
    if not landmarks:
        raise HTTPException(
            status_code=400,
            detail="Could not detect body pose. Ensure the customer is standing straight, facing forward, with full body visible.",
        )

    pixel_meas = extract_pixel_measurements(landmarks)
    real_meas = compute_real_measurements(pixel_meas, cal["pixels_per_inch"])
    annotated = draw_landmarks_on_image(image, landmarks)

    # Get all sizes and compute scores
    cursor = await db.execute("SELECT * FROM sizes ORDER BY chest_min")
    sizes = [dict(r) for r in await cursor.fetchall()]
    if not sizes:
        raise HTTPException(status_code=400, detail="No sizes configured.")

    scores = []
    for s in sizes:
        score = compute_fit_score(
            real_meas.chest, real_meas.shoulder, real_meas.sleeve_length,
            real_meas.body_length, real_meas.waist, s,
        )
        scores.append({"size": s["name"], "score": score, "label": fit_label(score)})

    scores.sort(key=lambda x: x["score"], reverse=True)
    best = scores[0]
    comfort = scores[1] if len(scores) > 1 else None

    # Save customer record
    cursor = await db.execute(
        """INSERT INTO customers (name, phone, chest, shoulder, sleeve_length, body_length, waist, recommended_size, fit_score)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (payload.customer_name, payload.customer_phone, real_meas.chest,
         real_meas.shoulder, real_meas.sleeve_length, real_meas.body_length,
         real_meas.waist, best["size"], best["score"]),
    )
    await db.commit()

    confidence_note = (
        "High confidence" if best["score"] >= 85
        else "Moderate confidence" if best["score"] >= 70
        else "Low confidence — consider manual measurement"
    )

    return AISizeRecommendation(
        estimated_measurements=AIEstimatedMeasurements(
            chest=real_meas.chest,
            shoulder=real_meas.shoulder,
            sleeve_length=real_meas.sleeve_length,
            body_length=real_meas.body_length,
            waist=real_meas.waist,
        ),
        best_fit=best,
        comfort_fit=comfort,
        all_scores=scores,
        annotated_image=annotated,
        customer_id=cursor.lastrowid,
        confidence_note=confidence_note,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
