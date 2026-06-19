"""
main.py — Hotel Aditya Grand Order Assistant API
==================================================
FastAPI application serving the AI-powered recommendation system.
Run with: cd e:\\Finternship\\backend && py -m uvicorn main:app --reload --port 8000
API docs: http://localhost:8000/docs
"""

import os
import sys
import io
import json
import sqlite3
import re
import tempfile
import threading
from datetime import date, timedelta, datetime
from typing import List, Optional
from math import ceil

from fastapi import FastAPI, Query, APIRouter, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

# ── Fix Windows console encoding ──────────────────────────────────────────────
if sys.platform == 'win32':
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except Exception:
        pass

# ── Load .env ─────────────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
except ImportError:
    pass

# ── Paths ──────────────────────────────────────────────────────────────────────
_HERE       = os.path.dirname(os.path.abspath(__file__))
ROOT        = os.path.join(_HERE, '..')
DB_PATH     = os.environ.get('DB_PATH', os.path.join(_HERE, 'hotel_aditya.db'))
FRONTEND    = os.path.join(ROOT, 'frontend')
CONFIG_PATH = os.path.join(_HERE, 'config.json')

# ── Render persistent-disk DB seeding ─────────────────────────────────────────
# On Render, DB_PATH = /data/hotel_aditya.db (persistent disk).
# On first boot the disk is empty, so copy the bundled DB from the repo.
import shutil as _shutil
_BUNDLED_DB = os.path.join(_HERE, 'hotel_aditya.db')
if DB_PATH != _BUNDLED_DB and not os.path.exists(DB_PATH) and os.path.exists(_BUNDLED_DB):
    try:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        _shutil.copy2(_BUNDLED_DB, DB_PATH)
        print(f'[startup] Seeded DB from {_BUNDLED_DB} → {DB_PATH}')
    except Exception as _seed_err:
        print(f'[startup] DB seed failed ({_seed_err}), falling back to bundled DB')
        DB_PATH = _BUNDLED_DB


# ── Config helpers ─────────────────────────────────────────────────────────────

# Keys that must NEVER be stored in or read from config.json.
# They must come from environment variables only.
_SECRET_KEYS = {'openweather_api_key', 'gemini_api_key'}

# In-memory key store: holds keys set via the Settings UI for the current session.
# These are lost on server restart — set Render env vars for persistence.
_RUNTIME_KEYS: dict = {}


def _load_config() -> dict:
    """Load config.json, stripping any API keys so they are never read from disk."""
    try:
        with open(CONFIG_PATH, encoding='utf-8') as f:
            cfg = json.load(f)
    except Exception:
        cfg = {}
    # Remove any secrets that may have leaked into config.json previously
    for k in _SECRET_KEYS:
        cfg.pop(k, None)
    return cfg


def _save_config(updates: dict) -> None:
    """Persist non-secret settings to config.json. API keys are silently ignored."""
    cfg = _load_config()
    # Strip secrets before writing — they must live in env vars only
    safe_updates = {k: v for k, v in updates.items() if k not in _SECRET_KEYS}
    cfg.update(safe_updates)
    with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(cfg, f, indent=2)


# ── DB helper ──────────────────────────────────────────────────────────────────

def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA journal_mode=WAL')
    return conn


# ── Engine imports ─────────────────────────────────────────────────────────────

try:
    from engine.recommender import generate_recommendations, get_recommendation_context
    RECS_AVAILABLE = True
except Exception as _recs_err:
    RECS_AVAILABLE = False
    print(f'[main] Recommender not available: {_recs_err}')
    def generate_recommendations(date_str: str) -> list:
        return []
    def get_recommendation_context(date_str: str) -> dict:
        return {}

try:
    from engine.ml_engine import train_model as _ml_train, get_model_info
    ML_AVAILABLE = True
except Exception as _ml_err:
    ML_AVAILABLE = False
    print(f'[main] ML engine not available: {_ml_err}')
    def get_model_info() -> dict:
        return {'model_type': 'unavailable'}


# ── FastAPI app ────────────────────────────────────────────────────────────────

app = FastAPI(
    title='Hotel Aditya Grand — Order Assistant API',
    description=(
        'AI-powered next-day order recommendations for Hotel Aditya Grand, Kandukur. '
        'Uses 45+ days of historical POS data + weather + festival signals. '
        'Powered by LightGBM with rule-based fallback.'
    ),
    version='2.0.0',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:8000',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'https://harsha-mandala.github.io',          # GitHub Pages frontend
        'https://finternship-elite-crew.onrender.com', # Render backend (self-requests)
        '*',                                           # Fallback for any other origin
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


# ═══════════════════════════════════════════════════════════════════════════════
# HEALTH
# ═══════════════════════════════════════════════════════════════════════════════

@app.get('/health', tags=['Health'])
def health_check():
    """Full health check — DB stats + model info."""
    try:
        conn = _conn()
        sales_rows  = conn.execute('SELECT COUNT(*) FROM daily_sales').fetchone()[0]
        menu_items  = conn.execute('SELECT COUNT(*) FROM menu_items').fetchone()[0]
        conn.close()
        db_status = 'ok'
    except Exception as e:
        sales_rows = 0
        menu_items = 0
        db_status  = f'error: {e}'

    return {
        'status':     'ok',
        'service':    'Hotel Aditya Grand Order Assistant',
        'version':    '2.0.0',
        'db':         db_status,
        'sales_rows': sales_rows,
        'menu_items': menu_items,
        'model_info': get_model_info(),
        'docs':       '/docs',
    }


@app.get('/ping', tags=['Health'])
def ping():
    """Lightweight health-check."""
    return {'pong': True}


# ═══════════════════════════════════════════════════════════════════════════════
# DASHBOARD ROUTER
# ═══════════════════════════════════════════════════════════════════════════════

dash_router = APIRouter(prefix='/dashboard', tags=['Dashboard'])


@dash_router.get('/summary')
def dashboard_summary():
    """
    Today's revenue, top-selling items, weather, and festival info.
    """
    today = date.today().isoformat()
    conn  = _conn()

    # Today's revenue
    rev_row = conn.execute(
        'SELECT COALESCE(SUM(gross_revenue), 0) FROM daily_sales WHERE date = ?', (today,)
    ).fetchone()
    today_revenue = round(float(rev_row[0]), 2)

    # Top 5 items by qty today
    top_rows = conn.execute(
        'SELECT item_name, SUM(qty_sold) AS qty, SUM(gross_revenue) AS rev '
        'FROM daily_sales WHERE date = ? '
        'GROUP BY item_name ORDER BY qty DESC LIMIT 5',
        (today,)
    ).fetchall()
    top_items = [
        {'item_name': r[0], 'qty_sold': int(r[1]), 'revenue': round(float(r[2]), 2)}
        for r in top_rows
    ]

    # Weather for today (or tomorrow if today not available)
    weather = None
    try:
        from engine.weather_service import get_weather_for_date
        weather = get_weather_for_date(today)
        if weather is None:
            weather = get_weather_for_date((date.today() + timedelta(days=1)).isoformat())
    except Exception:
        pass

    # Festival for today
    festival_info: dict = {}
    try:
        from engine.festival_service import get_festival_multiplier, get_upcoming_festivals
        mult, name = get_festival_multiplier(today)
        upcoming   = get_upcoming_festivals(today, lookahead_days=7)
        festival_info = {
            'today': {'name': name, 'multiplier': mult} if name else None,
            'upcoming': upcoming[:3],
        }
    except Exception:
        pass

    # Total revenue this month
    month_start = today[:7] + '-01'
    month_rev   = conn.execute(
        'SELECT COALESCE(SUM(gross_revenue), 0) FROM daily_sales WHERE date >= ?',
        (month_start,)
    ).fetchone()[0]

    conn.close()

    return {
        'date':           today,
        'today_revenue':  today_revenue,
        'month_revenue':  round(float(month_rev), 2),
        'top_items':      top_items,
        'weather':        dict(weather) if weather else None,
        'festival':       festival_info,
    }


@dash_router.get('/revenue-trend')
def revenue_trend(days: int = Query(default=30, ge=1, le=365)):
    """Daily gross revenue for the last N days."""
    conn      = _conn()
    cutoff    = (date.today() - timedelta(days=days)).isoformat()
    rows      = conn.execute(
        'SELECT date, ROUND(SUM(gross_revenue), 2) AS revenue '
        'FROM daily_sales WHERE date >= ? '
        'GROUP BY date ORDER BY date ASC',
        (cutoff,)
    ).fetchall()
    conn.close()
    return {
        'days': days,
        'series': [{'date': r[0], 'revenue': float(r[1])} for r in rows],
    }


@dash_router.get('/category-trends')
def category_trends(days: int = Query(default=30, ge=1, le=365)):
    """Revenue and qty by category for the last N days."""
    conn   = _conn()
    cutoff = (date.today() - timedelta(days=days)).isoformat()
    rows   = conn.execute(
        'SELECT mi.category, '
        '       ROUND(SUM(ds.gross_revenue), 2) AS revenue, '
        '       SUM(ds.qty_sold) AS qty '
        'FROM daily_sales ds '
        'LEFT JOIN menu_items mi ON ds.item_name = mi.item_name '
        'WHERE ds.date >= ? '
        'GROUP BY mi.category '
        'ORDER BY revenue DESC',
        (cutoff,)
    ).fetchall()
    conn.close()
    return {
        'days': days,
        'categories': [
            {'category': r[0] or 'other', 'revenue': float(r[1]), 'qty': int(r[2])}
            for r in rows
        ],
    }


@dash_router.get('/actual-vs-predicted')
def actual_vs_predicted():
    """Compare today's actual sales vs predicted sales by category."""
    conn = _conn()
    today = date.today().isoformat()
    
    # 1. Actuals for today by category
    actual_rows = conn.execute(
        'SELECT mi.category, SUM(ds.qty_sold) '
        'FROM daily_sales ds '
        'LEFT JOIN menu_items mi ON ds.item_name = mi.item_name '
        'WHERE ds.date = ? '
        'GROUP BY mi.category',
        (today,)
    ).fetchall()
    
    actuals = { (r[0] or 'other'): int(r[1]) for r in actual_rows }
    
    # 2. Predicted for today by category
    predicted = {}
    if RECS_AVAILABLE:
        try:
            recs = generate_recommendations(today)
            for r in recs:
                cat = r.get('category', 'other')
                predicted[cat] = predicted.get(cat, 0) + int(r.get('recommended_qty', 0))
        except Exception as e:
            print(f'[main] Error generating predictions for chart: {e}')
            
    conn.close()
    
    all_cats = set(actuals.keys()).union(set(predicted.keys()))
    results = []
    for cat in all_cats:
        results.append({
            'category': cat,
            'actual_qty': actuals.get(cat, 0),
            'predicted_qty': predicted.get(cat, 0)
        })
        
    results.sort(key=lambda x: -(x['actual_qty'] + x['predicted_qty']))
    return {'date': today, 'categories': results}


app.include_router(dash_router)


# ═══════════════════════════════════════════════════════════════════════════════
# ITEMS ROUTER
# ═══════════════════════════════════════════════════════════════════════════════

items_router = APIRouter(prefix='/items', tags=['Items'])


@items_router.get('/')
def list_items(category: Optional[str] = Query(default=None)):
    """List all menu items, optionally filtered by category."""
    conn = _conn()
    if category:
        rows = conn.execute(
            'SELECT item_name, category, avg_qty FROM menu_items '
            'WHERE LOWER(category) = LOWER(?) ORDER BY item_name',
            (category,)
        ).fetchall()
    else:
        rows = conn.execute(
            'SELECT item_name, category, avg_qty FROM menu_items ORDER BY category, item_name'
        ).fetchall()
    conn.close()
    return {
        'count': len(rows),
        'items': [
            {'item_name': r[0], 'category': r[1], 'avg_qty': r[2]}
            for r in rows
        ],
    }


@items_router.get('/categories')
def list_categories():
    """List all distinct categories."""
    conn  = _conn()
    rows  = conn.execute(
        'SELECT DISTINCT category, COUNT(*) AS item_count '
        'FROM menu_items GROUP BY category ORDER BY category'
    ).fetchall()
    conn.close()
    return {'categories': [{'category': r[0], 'item_count': r[1]} for r in rows]}


app.include_router(items_router)


# ═══════════════════════════════════════════════════════════════════════════════
# SALES ROUTER
# ═══════════════════════════════════════════════════════════════════════════════

sales_router = APIRouter(prefix='/sales', tags=['Sales'])


class SaleEntry(BaseModel):
    date:          str
    item_name:     str
    qty_sold:      int
    gross_revenue: Optional[float] = None
    source:        Optional[str]   = 'manual'


@sales_router.get('/')
def get_sales(date_filter: Optional[str] = Query(default=None, alias='date'),
              limit: int = Query(default=100, ge=1, le=1000)):
    """Get sales records, optionally filtered by date."""
    conn = _conn()
    if date_filter:
        rows = conn.execute(
            'SELECT date, item_name, qty_sold, gross_revenue, source '
            'FROM daily_sales WHERE date = ? ORDER BY item_name LIMIT ?',
            (date_filter, limit)
        ).fetchall()
    else:
        rows = conn.execute(
            'SELECT date, item_name, qty_sold, gross_revenue, source '
            'FROM daily_sales ORDER BY date DESC, item_name LIMIT ?',
            (limit,)
        ).fetchall()
    conn.close()
    return {
        'count': len(rows),
        'sales': [
            {
                'date': r[0], 'item_name': r[1],
                'qty_sold': r[2], 'gross_revenue': r[3], 'source': r[4],
            }
            for r in rows
        ],
    }


@sales_router.post('/log')
def log_sales(entries: List[SaleEntry]):
    """
    Upsert one or more sales entries.
    Because daily_sales has UNIQUE(date, item_name), INSERT OR REPLACE
    will UPDATE the existing row if it already exists, so clicking
    'Save' multiple times never duplicates data.
    """
    conn   = _conn()
    saved  = 0
    errors = []

    for entry in entries:
        revenue = entry.gross_revenue if entry.gross_revenue is not None else 0.0

        try:
            # INSERT OR REPLACE leverages UNIQUE(date, item_name):
            # if a row already exists for this date+item, it is replaced (updated).
            # This means saving the same form twice sets the final qty, not doubles it.
            conn.execute(
                'INSERT OR REPLACE INTO daily_sales '
                '(date, item_name, qty_sold, gross_revenue, source) '
                'VALUES (?, ?, ?, ?, ?)',
                (entry.date, entry.item_name, entry.qty_sold,
                 revenue, entry.source or 'manual')
            )
            saved += 1
        except Exception as e:
            errors.append({'item': entry.item_name, 'error': str(e)})

    conn.commit()
    conn.close()
    return {'saved': saved, 'errors': errors}


@sales_router.get('/trends')
def item_trend(
    item: str = Query(..., description='Item name to get trend for'),
    days: int = Query(default=30, ge=1, le=180),
):
    """Daily qty_sold trend for a specific item over the last N days."""
    conn   = _conn()
    cutoff = (date.today() - timedelta(days=days)).isoformat()
    rows   = conn.execute(
        'SELECT date, SUM(qty_sold) AS qty '
        'FROM daily_sales WHERE item_name = ? AND date >= ? '
        'GROUP BY date ORDER BY date ASC',
        (item, cutoff)
    ).fetchall()
    conn.close()
    return {
        'item': item,
        'days': days,
        'series': [{'date': r[0], 'qty': int(r[1])} for r in rows],
    }


@sales_router.post('/upload-pdf')
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a POS PDF bill and extract sales records via OCR.
    Returns a Server-Sent Events stream with progress updates.
    """
    file_bytes = await file.read()
    filename   = file.filename or 'upload.pdf'

    async def generate():
        def event(status: str, msg: str, progress: int = 0, rows: int = None) -> str:
            d: dict = {'status': status, 'msg': msg, 'progress': progress}
            if rows is not None:
                d['rows'] = rows
            return f'data: {json.dumps(d)}\n\n'

        yield event('reading', f'\U0001f4c4 Reading PDF: {filename}', 5)

        try:
            import fitz   # PyMuPDF
            import asyncio
            
            # Read Gemini key: env var first (persistent), then runtime store (session-only)
            gemini_key = os.environ.get('GEMINI_API_KEY', '').strip() or _RUNTIME_KEYS.get('gemini_api_key', '')

            # ── Known items from DB ────────────────────────────────────────────
            conn2       = _conn()
            known_items = set(
                r[0] for r in conn2.execute('SELECT item_name FROM menu_items').fetchall()
            )
            
            # ── Parse date from filename ───────────────────────────────────────
            date_match = re.search(r'(\d{2})-(\d{2})-(\d{4})', filename)
            if date_match:
                sale_date = f'{date_match.group(3)}-{date_match.group(2)}-{date_match.group(1)}'
            else:
                iso_match = re.search(r'(\d{4})-(\d{2})-(\d{2})', filename)
                sale_date = iso_match.group(0) if iso_match else date.today().isoformat()
                
            rows_to_insert: List[tuple] = []
            yield event('date', f'📅 Sale date detected: {sale_date}', 8)

            if gemini_key:
                yield event('ocr', f'\U0001f916 Using Gemini 2.5 Flash for OCR...', 20)
                try:
                    from engine.gemini_ocr import process_pdf_with_gemini
                    items = await asyncio.to_thread(
                        process_pdf_with_gemini, file_bytes, gemini_key, list(known_items), sale_date
                    )

                    # Build case-insensitive lookup for known items
                    known_lower = {n.lower(): n for n in known_items}
                    matched = 0
                    unmatched = []

                    for item in items:
                        name = (item.get('item_name') or '').strip()
                        qty  = item.get('qty')
                        if not name or not isinstance(qty, (int, float)) or int(qty) <= 0:
                            continue
                        # Try exact match first, then case-insensitive
                        canonical = None
                        if name in known_items:
                            canonical = name
                        elif name.lower() in known_lower:
                            canonical = known_lower[name.lower()]
                        else:
                            unmatched.append(name)
                            continue
                        gross = float(item.get('gross') or 0.0)
                        rows_to_insert.append((sale_date, canonical, int(qty), gross))
                        matched += 1

                    if unmatched:
                        print(f'[main] Gemini returned {len(unmatched)} unmatched items: {unmatched[:10]}')

                    yield event('normalizing', f'\U0001f9f9 AI matched {matched} items to menu...', 75)

                except Exception as e:
                    import traceback
                    print(f'[main] Gemini OCR error: {traceback.format_exc()}')
                    # Fall through to EasyOCR instead of killing the stream
                    yield event('ocr', f'\u26a0\ufe0f Gemini failed ({e}), falling back to standard OCR...', 15)
                    gemini_key = ''  # trigger EasyOCR block below

                    
            else:
                # EasyOCR Fallback
                pdf     = fitz.open(stream=file_bytes, filetype='pdf')
                n_pages = len(pdf)
                yield event('ocr', f'\U0001f916 Starting OCR on {n_pages} page(s)...', 10)
    
                all_text: List[str] = []
    
                try:
                    import easyocr
                    reader = easyocr.Reader(['en'], gpu=False, verbose=False)
                    for i, page in enumerate(pdf):
                        pct = 10 + int((i / n_pages) * 60)
                        yield event('ocr', f'\U0001f916 OCR page {i + 1} of {n_pages}...', pct)
                        mat      = fitz.Matrix(2, 2)
                        pix      = page.get_pixmap(matrix=mat)
                        img_bytes = pix.tobytes('png')
                        # Run CPU-bound OCR in a separate thread so it doesn't block the FastAPI event loop
                        results  = await asyncio.to_thread(reader.readtext, img_bytes, detail=0)
                        all_text.extend(str(t) for t in results)
    
                except ImportError:
                    yield event('ocr', '\U0001f4dd Extracting text from PDF (no EasyOCR)...', 50)
                    for page in pdf:
                        all_text.extend(page.get_text().split('\n'))
    
                pdf.close()
                yield event('normalizing', '\U0001f9f9 Normalizing item names...', 75)
                
                # ── Normalize function ─────────────────────────────────────────────
                data_pipeline = os.path.join(ROOT, 'data_pipeline')
                if data_pipeline not in sys.path:
                    sys.path.insert(0, data_pipeline)
                try:
                    from clean_data import normalize_item_name
                except ImportError:
                    def normalize_item_name(x: str) -> str:  # type: ignore
                        return x.strip().title()
                        
                # ── Parse item + qty pairs from OCR text ───────────────────────────
                qty_pattern   = re.compile(r'^\d+\.?\d*$')
                lines = [l for l in all_text if l]
    
                i = 0
                while i < len(lines):
                    line = str(lines[i]).strip()
                    if len(line) > 2:
                        normalized = normalize_item_name(line)
                        if normalized in known_items:
                            # Look ahead up to 4 lines for a standalone integer qty
                            for j in range(i + 1, min(i + 5, len(lines))):
                                candidate = str(lines[j]).strip()
                                if qty_pattern.match(candidate):
                                    try:
                                        qty = int(float(candidate))
                                        if 0 < qty < 1000:
                                            rows_to_insert.append((sale_date, normalized, qty))
                                        break
                                    except (ValueError, TypeError):
                                        pass
                    i += 1

            yield event('saving', f'\U0001f4be Saving {len(rows_to_insert)} records...', 90)

            saved = 0
            for row in rows_to_insert:
                sale_date_r, item_name, qty = row[0], row[1], row[2]
                rev = float(row[3]) if len(row) > 3 else 0.0
                try:
                    conn2.execute(
                        'INSERT OR REPLACE INTO daily_sales '
                        '(date, item_name, qty_sold, gross_revenue, source) '
                        'VALUES (?, ?, ?, ?, ?)',
                        (sale_date_r, item_name, qty, rev, 'pdf_upload')
                    )
                    saved += 1
                except Exception:
                    pass
            conn2.commit()
            conn2.close()

            yield event(
                'done',
                f'\u2705 Done! {saved} sales records added for {sale_date}.',
                100,
                saved,
            )

        except Exception as exc:
            import traceback
            print(f'[main] PDF upload error: {traceback.format_exc()}')
            yield event('error', f'\u274c Error: {exc}', 0)

    return StreamingResponse(
        generate(),
        media_type='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'},
    )


app.include_router(sales_router)


# ═══════════════════════════════════════════════════════════════════════════════
# RECOMMENDATIONS ROUTER
# ═══════════════════════════════════════════════════════════════════════════════

rec_router = APIRouter(prefix='/recommendations', tags=['Recommendations'])


class OverrideEntry(BaseModel):
    date:         str
    item_name:    str
    merchant_qty: int
    reason:       Optional[str] = None


@rec_router.get('/')
def get_recommendations(date_param: Optional[str] = Query(default=None, alias='date')):
    """
    Generate AI recommendations for a given date.
    Defaults to tomorrow if no date provided.
    """
    if date_param is None:
        date_param = (datetime.today() + timedelta(days=1)).strftime('%Y-%m-%d')

    if RECS_AVAILABLE:
        try:
            recs = generate_recommendations(date_param)
            return {'date': date_param, 'recommendations': recs, 'count': len(recs)}
        except Exception as e:
            print(f'[main] Recommendation error: {e}')

    return {
        'date': date_param,
        'recommendations': [],
        'count': 0,
        'error': 'Recommendation engine unavailable',
    }


@rec_router.get('/context')
def get_context(date_param: Optional[str] = Query(default=None, alias='date')):
    """
    Return weather + festival context for a date.
    Useful for displaying context cards on the frontend.
    """
    if date_param is None:
        date_param = (datetime.today() + timedelta(days=1)).strftime('%Y-%m-%d')

    if RECS_AVAILABLE:
        try:
            ctx = get_recommendation_context(date_param)
            return ctx
        except Exception as e:
            print(f'[main] Context error: {e}')

    return {'date': date_param, 'error': 'Context engine unavailable'}


@rec_router.put('/override')
def save_override(entry: OverrideEntry):
    """
    Save merchant's manual quantity override for a recommendation.
    Updates the recommendations table's merchant_qty column.
    """
    conn = _conn()
    try:
        # Check if recommendation row exists
        existing = conn.execute(
            'SELECT rowid FROM recommendations WHERE date = ? AND item_name = ?',
            (entry.date, entry.item_name)
        ).fetchone()

        if existing:
            conn.execute(
                'UPDATE recommendations SET merchant_qty = ?, reason = COALESCE(?, reason) '
                'WHERE date = ? AND item_name = ?',
                (entry.merchant_qty, entry.reason, entry.date, entry.item_name)
            )
        else:
            conn.execute(
                'INSERT INTO recommendations (date, item_name, merchant_qty, reason) '
                'VALUES (?, ?, ?, ?)',
                (entry.date, entry.item_name, entry.merchant_qty, entry.reason)
            )
        conn.commit()
    finally:
        conn.close()

    return {'status': 'saved', 'date': entry.date, 'item_name': entry.item_name}


@rec_router.get('/accuracy')
def recommendation_accuracy(days: int = Query(default=14, ge=1, le=90)):
    """
    Back-test: compare past recommendations vs actual sales.
    Returns per-item MAE and overall accuracy metrics.
    """
    conn   = _conn()
    cutoff = (date.today() - timedelta(days=days)).isoformat()

    rows = conn.execute(
        """
        SELECT
            r.date,
            r.item_name,
            r.recommended_qty,
            COALESCE(r.merchant_qty, r.recommended_qty) AS final_qty,
            COALESCE(s.actual_qty, 0) AS actual_qty
        FROM recommendations r
        LEFT JOIN (
            SELECT date, item_name, SUM(qty_sold) AS actual_qty
            FROM daily_sales
            GROUP BY date, item_name
        ) s ON r.date = s.date AND r.item_name = s.item_name
        WHERE r.date >= ? AND r.recommended_qty IS NOT NULL
        ORDER BY r.date DESC, r.item_name
        """,
        (cutoff,)
    ).fetchall()
    conn.close()

    if not rows:
        return {'days': days, 'message': 'No recommendation data found', 'items': []}

    total_error   = 0.0
    total_records = 0
    item_stats: dict = {}

    for r in rows:
        recommended = float(r[2] or 0)
        final_qty   = float(r[3] or 0)
        actual      = float(r[4] or 0)
        error       = abs(final_qty - actual)

        total_error   += error
        total_records += 1

        name = r[1]
        if name not in item_stats:
            item_stats[name] = {'total_error': 0, 'count': 0}
        item_stats[name]['total_error'] += error
        item_stats[name]['count']       += 1

    overall_mae = round(total_error / total_records, 2) if total_records else 0.0

    item_results = sorted(
        [
            {
                'item_name': name,
                'mae':       round(s['total_error'] / s['count'], 2),
                'records':   s['count'],
            }
            for name, s in item_stats.items()
        ],
        key=lambda x: -x['mae'],
    )

    return {
        'days':         days,
        'overall_mae':  overall_mae,
        'total_records': total_records,
        'items':        item_results,
    }


app.include_router(rec_router)


# ═══════════════════════════════════════════════════════════════════════════════
# SETTINGS ROUTER
# ═══════════════════════════════════════════════════════════════════════════════

settings_router = APIRouter(prefix='/settings', tags=['Settings'])


class SettingsUpdate(BaseModel):
    openweather_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


@settings_router.get('/')
def get_settings():
    """Return current settings and DB stats."""
    cfg  = _load_config()
    conn = _conn()
    try:
        rows  = conn.execute('SELECT COUNT(*) FROM daily_sales').fetchone()[0]
        items = conn.execute('SELECT COUNT(*) FROM menu_items').fetchone()[0]
        dates = conn.execute('SELECT MIN(date), MAX(date) FROM daily_sales').fetchone()
        date_range = f'{dates[0]} to {dates[1]}' if dates and dates[0] else 'N/A'
    except Exception:
        rows, items, date_range = 0, 0, 'N/A'
    finally:
        conn.close()

    mi = get_model_info()

    return {
        # Check env var first (persistent), then runtime in-memory store (session, set via Settings UI)
        'openweather_key_set': bool(os.environ.get('OPENWEATHER_API_KEY', '').strip() or _RUNTIME_KEYS.get('openweather_api_key', '')),
        'gemini_key_set':      bool(os.environ.get('GEMINI_API_KEY', '').strip() or _RUNTIME_KEYS.get('gemini_api_key', '')),
        'latitude':            cfg.get('latitude', None),
        'longitude':           cfg.get('longitude', None),
        'weather_source':      cfg.get('weather_source', 'mock'),
        'model_info':          mi,
        'db_stats': {
            'total_rows':  rows,
            'menu_items':  items,
            'date_range':  date_range,
        },
    }


@settings_router.post('/')
def save_settings(body: SettingsUpdate):
    """Save API key and related settings. When location changes, clears weather cache and re-fetches."""
    updates: dict = {}
    location_changed = False

    if body.openweather_api_key is not None:
        updates['openweather_api_key'] = body.openweather_api_key
        updates['weather_source'] = 'real' if body.openweather_api_key.strip() else 'mock'

        # Update weather service API key in memory
        try:
            from engine import weather_service
            weather_service.update_api_key(body.openweather_api_key)
        except Exception as e:
            print(f'[main] Could not update weather_service API key: {e}')

    if body.gemini_api_key is not None:
        updates['gemini_api_key'] = body.gemini_api_key
        # Store in session memory (lost on restart — set GEMINI_API_KEY env var on Render for persistence)
        _RUNTIME_KEYS['gemini_api_key'] = body.gemini_api_key.strip()
        # Reset model index so we start fresh with the new key
        try:
            from engine.gemini_ocr import reset_model_index
            reset_model_index()
        except Exception as e:
            print(f'[main] Could not reset gemini model index: {e}')

    if body.latitude is not None:
        updates['latitude'] = body.latitude
        location_changed = True

    if body.longitude is not None:
        updates['longitude'] = body.longitude
        location_changed = True

    if updates:
        _save_config(updates)

    # If location changed, clear weather cache and re-fetch in background
    weather_refresh_result = None
    if location_changed:
        try:
            from engine import weather_service
            # Run synchronously (fast — just 1-2 API calls)
            weather_refresh_result = weather_service.refresh_weather_for_location()
            # Also clear the dashboard cache key so next load gets fresh weather
            print(f'[main] Location updated → weather refreshed: {weather_refresh_result}')
        except Exception as e:
            print(f'[main] Could not refresh weather after location change: {e}')

    resp = {'status': 'saved', 'updates': list(updates.keys())}
    if weather_refresh_result:
        resp['weather_refreshed'] = True
        resp['new_weather'] = weather_refresh_result.get('today')
    return resp


@settings_router.post('/refresh-weather')
def refresh_weather():
    """
    Clear weather cache for today+future and re-fetch using current config coordinates.
    Called by the frontend "Refresh Weather" button in Settings.
    """
    try:
        from engine.weather_service import refresh_weather_for_location
        result = refresh_weather_for_location()
        return {
            'status':         'refreshed',
            'cleared_rows':   result.get('cleared_rows', 0),
            'today_weather':  result.get('today'),
            'tomorrow_weather': result.get('tomorrow'),
            'lat':            result.get('lat'),
            'lon':            result.get('lon'),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Weather refresh failed: {e}')


@settings_router.get('/gemini-model')
def get_gemini_model():
    """Return the currently active Gemini model name."""
    try:
        from engine.gemini_ocr import get_current_model, APP_STATE
        return {'current_model': get_current_model(), 'model_idx': APP_STATE['model_idx']}
    except Exception as e:
        return {'current_model': 'unknown', 'error': str(e)}


@settings_router.post('/retrain')
def retrain_model():
    """Trigger a background model retrain."""
    if not ML_AVAILABLE:
        raise HTTPException(status_code=400, detail='ML engine not available')

    def _do_train():
        try:
            info = _ml_train()
            print(f'[main] Model retrained: {info}')
        except Exception as e:
            print(f'[main] Training failed: {e}')

    threading.Thread(target=_do_train, daemon=True).start()
    return {
        'status':  'training_started',
        'message': 'Model retraining started in background (~30s). Check /settings for completion.',
    }


app.include_router(settings_router)


# ═══════════════════════════════════════════════════════════════════════════════
# WEATHER ROUTER
# ═══════════════════════════════════════════════════════════════════════════════

weather_router = APIRouter(prefix='/weather', tags=['Weather'])


@weather_router.get('/')
def get_weather(date_param: Optional[str] = Query(default=None, alias='date')):
    """
    Get weather for a specific date.
    If not cached, fetches/generates it.
    """
    if date_param is None:
        date_param = (datetime.today() + timedelta(days=1)).strftime('%Y-%m-%d')

    try:
        from engine.weather_service import get_weather_for_date, fetch_and_store_weather
        weather = get_weather_for_date(date_param)
        if weather is None:
            weather = fetch_and_store_weather(date_param)
        return {'date': date_param, 'weather': weather}
    except Exception as e:
        return {'date': date_param, 'weather': None, 'error': str(e)}


@weather_router.get('/all')
def get_all_weather():
    """Return all cached weather records."""
    try:
        from engine.weather_service import get_all_weather
        return {'records': get_all_weather()}
    except Exception as e:
        return {'records': [], 'error': str(e)}


app.include_router(weather_router)


# ═══════════════════════════════════════════════════════════════════════════════
# FRONTEND STATIC FILES
# ═══════════════════════════════════════════════════════════════════════════════

if os.path.isdir(FRONTEND):
    _css = os.path.join(FRONTEND, 'css')
    _js  = os.path.join(FRONTEND, 'js')
    _img = os.path.join(FRONTEND, 'images')

    if os.path.isdir(_css):
        app.mount('/css',    StaticFiles(directory=_css), name='css')
    if os.path.isdir(_js):
        app.mount('/js',     StaticFiles(directory=_js),  name='js')
    if os.path.isdir(_img):
        app.mount('/images', StaticFiles(directory=_img), name='images')

    @app.get('/', include_in_schema=False)
    def serve_index():
        return FileResponse(os.path.join(FRONTEND, 'index.html'))

    @app.get('/{path:path}', include_in_schema=False)
    def serve_spa(path: str):
        # Try exact file first
        full_path = os.path.join(FRONTEND, path)
        if os.path.isfile(full_path):
            return FileResponse(full_path)
        # Fall back to SPA index
        return FileResponse(os.path.join(FRONTEND, 'index.html'))
