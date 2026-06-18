"""
Database setup and data loader -- Hotel Aditya Grand
Creates SQLite DB schema and loads cleaned sales data + festivals
"""

import sqlite3
import pandas as pd
import json
from pathlib import Path

DB_PATH      = Path(__file__).parent.parent / "backend" / "hotel_aditya.db"
CLEANED_CSV  = Path(__file__).parent / "cleaned_sales_data.csv"
FESTIVALS    = Path(__file__).parent.parent / "data" / "festivals_2026.json"

def get_connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(str(DB_PATH))

def create_tables():
    conn = get_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS daily_sales (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            date          TEXT NOT NULL,
            item_name     TEXT NOT NULL,
            category      TEXT,
            qty_sold      INTEGER NOT NULL,
            gross_revenue REAL DEFAULT 0,
            day_of_week   TEXT,
            dow_num       INTEGER,
            source        TEXT DEFAULT 'pdf_import'
        );

        CREATE INDEX IF NOT EXISTS idx_sales_date     ON daily_sales(date);
        CREATE INDEX IF NOT EXISTS idx_sales_item     ON daily_sales(item_name);
        CREATE INDEX IF NOT EXISTS idx_sales_category ON daily_sales(category);

        CREATE TABLE IF NOT EXISTS menu_items (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            item_name    TEXT UNIQUE NOT NULL,
            category     TEXT,
            avg_qty      REAL DEFAULT 0,
            is_perishable INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS weather_data (
            date         TEXT PRIMARY KEY,
            max_temp     REAL,
            min_temp     REAL,
            condition    TEXT,
            rainfall_mm  REAL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS festivals (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            date             TEXT NOT NULL,
            name             TEXT NOT NULL,
            type             TEXT,
            demand_multiplier REAL DEFAULT 1.0
        );

        CREATE TABLE IF NOT EXISTS recommendations (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            date             TEXT NOT NULL,
            item_name        TEXT NOT NULL,
            category         TEXT,
            recommended_qty  INTEGER,
            base_avg         REAL,
            dow_factor       REAL DEFAULT 1.0,
            weather_factor   REAL DEFAULT 1.0,
            festival_factor  REAL DEFAULT 1.0,
            trend_factor     REAL DEFAULT 1.0,
            reason           TEXT,
            merchant_override INTEGER,
            created_at       TEXT DEFAULT (datetime('now'))
        );
    """)
    conn.commit()
    conn.close()
    print("[OK] Tables created (or already exist).")

def load_sales_data():
    if not CLEANED_CSV.exists():
        print(f"ERROR: {CLEANED_CSV} not found. Run clean_data.py first.")
        return

    df = pd.read_csv(CLEANED_CSV)
    conn = get_connection()

    # Clear existing pdf_import data to avoid duplicates on re-run
    conn.execute("DELETE FROM daily_sales WHERE source = 'pdf_import'")

    df['source'] = 'pdf_import'
    df.to_sql('daily_sales', conn, if_exists='append', index=False)

    # Build menu_items from unique items with their avg qty
    item_stats = df.groupby(['item_name', 'category']).agg(
        avg_qty=('qty_sold', 'mean')
    ).reset_index()

    conn.execute("DELETE FROM menu_items")
    item_stats.to_sql('menu_items', conn, if_exists='append', index=False)

    conn.commit()
    conn.close()

    print(f"[OK] Loaded {len(df)} sales records")
    print(f"[OK] Loaded {len(item_stats)} menu items")

def load_festivals():
    if not FESTIVALS.exists():
        print(f"WARN: {FESTIVALS} not found -- skipping festivals")
        return

    with open(FESTIVALS, encoding='utf-8') as f:
        festivals = json.load(f)

    conn = get_connection()
    conn.execute("DELETE FROM festivals")
    for fest in festivals:
        conn.execute(
            "INSERT INTO festivals (date, name, type, demand_multiplier) VALUES (?,?,?,?)",
            (fest['date'], fest['name'], fest['type'], fest['demand_multiplier'])
        )
    conn.commit()
    conn.close()
    print(f"[OK] Loaded {len(festivals)} festivals")

def verify():
    conn = get_connection()
    cur  = conn.cursor()
    for table in ['daily_sales', 'menu_items', 'festivals']:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        count = cur.fetchone()[0]
        print(f"  {table}: {count} rows")
    conn.close()

if __name__ == '__main__':
    print("Setting up database...")
    create_tables()
    load_sales_data()
    load_festivals()
    print("\nDatabase verification:")
    verify()
    print(f"\nDB saved at: {DB_PATH}")
