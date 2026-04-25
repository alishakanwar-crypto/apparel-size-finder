import aiosqlite
import os

_data_dir = "/data" if os.path.isdir("/data") else os.path.dirname(__file__)
DB_PATH = os.path.join(_data_dir, "apparel.db")


async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    try:
        yield db
    finally:
        await db.close()


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("""
            CREATE TABLE IF NOT EXISTS sizes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                chest_min REAL NOT NULL,
                chest_max REAL NOT NULL,
                shoulder REAL NOT NULL,
                sleeve_length REAL NOT NULL,
                body_length REAL NOT NULL,
                waist_min REAL NOT NULL,
                waist_max REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT,
                chest REAL NOT NULL,
                shoulder REAL NOT NULL,
                sleeve_length REAL NOT NULL,
                body_length REAL NOT NULL,
                waist REAL NOT NULL,
                recommended_size TEXT,
                fit_score REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS calibration (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL DEFAULT 'default',
                chest_real REAL NOT NULL,
                shoulder_real REAL NOT NULL,
                torso_real REAL NOT NULL,
                shoulder_px REAL,
                torso_px REAL,
                chest_px REAL,
                pixels_per_inch REAL,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.commit()


async def seed_default_sizes():
    """Seed the database with standard Indian shirt sizes if empty."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM sizes")
        row = await cursor.fetchone()
        if row["cnt"] > 0:
            return

        default_sizes = [
            ("XS", 34, 36, 15.5, 23, 26, 28, 30),
            ("S", 36, 38, 16.5, 24, 27, 30, 32),
            ("M", 38, 40, 17.5, 25, 28, 32, 34),
            ("L", 40, 42, 18.5, 25.5, 29, 34, 36),
            ("XL", 42, 44, 19.5, 26, 30, 36, 38),
            ("XXL", 44, 46, 20.5, 26.5, 31, 38, 40),
            ("3XL", 46, 48, 21.5, 27, 32, 40, 42),
        ]
        await db.executemany(
            """INSERT INTO sizes (name, chest_min, chest_max, shoulder,
               sleeve_length, body_length, waist_min, waist_max)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            default_sizes,
        )
        await db.commit()
