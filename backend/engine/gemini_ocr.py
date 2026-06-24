"""
gemini_ocr.py — Gemini-powered PDF OCR for Hotel Aditya Grand sales bills.

Model fallback chain (best → acceptable):
  gemini-3.5-flash → gemini-3.0-flash → gemini-2.5-flash → gemma-4-31b-it

Retry logic:
  - 429 (rate-limit / RPD exhausted): wait RATE_LIMIT_WAIT_SECONDS then try next model
  - 503 (server busy): wait SERVER_BUSY_WAIT_SECONDS then retry same model
  - Other errors: immediately try next model

PDF FORMAT (what the bills look like):
  Each page has an "Item-wise Sales" table with three columns:
    Item             Qty    Gross
    ─────────────────────────────
    CHICKEN DUM BIRYANI   16   4,128.00
    SP CHICKEN BIRYANI    23   6,141.00
    MI.WATER LT           56   1,120.00
    Butter Non            22   1,100.00
    COOL DRINK 250 ML     33     660.00
    ...

  Headers/footers to IGNORE:
    "Hotel Aditya Grand", "Item-wise Sales", "Period:", "Printed:",
    "Total", "NoCash", "Discount", "CGST", "SGST", "Grand Total"
"""

import os
import csv
import re
import time
import fitz
import base64
import json
from datetime import date
import urllib.request
import urllib.error

# ── Path to write extracted CSVs ───────────────────────────────────────────────
_HERE = os.path.dirname(os.path.abspath(__file__))
UPLOAD_CSV_PATH = os.path.join(_HERE, '..', '..', 'data_pipeline', 'uploaded_sales_data.csv')
CSV_FIELDS = ['date', 'item_name', 'qty_sold', 'gross_revenue', 'source']

# ── Model fallback chain (best to acceptable) ──────────────────────────────────
MODELS = [
    # Gemini 3.5 Generation (Latest, highly optimized for coding/agentic tasks)
    "gemini-3.5-pro",
    "gemini-3.5-flash",

    # Gemini 3.1 Generation (High volume, cost efficient)
    "gemini-3.1-pro",
    "gemini-3.1-pro-preview",
    "gemini-3.1-flash",
    "gemini-3.1-flash-lite",

    # Gemini 3.0 Family
    "gemini-3.0-pro",
    "gemini-3.0-flash",
    "gemini-3-pro-preview",
    "gemini-3-flash-preview",

    # Gemini 2.5 Family
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",

    # Gemini 2.0 Family
    "gemini-2.0-pro-exp-02-05",
    "gemini-2.0-flash",

    # Gemini 1.5 Family (Standard production fallbacks)
    "gemini-1.5-pro",
    "gemini-1.5-flash",
]

RATE_LIMIT_WAIT_SECONDS  = 65   # wait when quota (429) hit; then try next model
SERVER_BUSY_WAIT_SECONDS = 15   # wait when server overloaded (503); retry same model
MAX_RETRIES              = 5    # max retries per model before moving on
MAX_PAGES_PER_BATCH      = 25   # split PDFs larger than this into chunks

# Global state — persists across calls within the same process lifetime
APP_STATE = {
    "model_idx": 0   # which model we are currently using
}

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"


# ── HTTP helpers ───────────────────────────────────────────────────────────────

def _post_json(url: str, payload: dict, timeout: int = 120) -> dict:
    """POST JSON payload and return parsed response dict.  Raises urllib.error.HTTPError on HTTP errors."""
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode('utf-8'))


def _call_gemini_with_fallback(payload: dict, api_key: str) -> dict:
    """
    Try MODELS in order, with retry logic per model.
    Returns parsed API response dict on success.
    Raises RuntimeError if all models/retries exhausted.
    """
    start_idx = APP_STATE["model_idx"]
    n = len(MODELS)

    for offset in range(n):
        idx = (start_idx + offset) % n
        model = MODELS[idx]
        url = GEMINI_BASE_URL.format(model=model, key=api_key)

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                print(f"[gemini_ocr] Trying {model} (attempt {attempt}/{MAX_RETRIES})...")
                resp = _post_json(url, payload)
                # Success — lock in this model for future calls
                APP_STATE["model_idx"] = idx
                print(f"[gemini_ocr] ✅ Success with {model}")
                return resp

            except urllib.error.HTTPError as e:
                status = e.code
                body = ""
                try:
                    body = e.read().decode('utf-8', errors='replace')[:300]
                except Exception:
                    pass

                if status == 429:
                    # Rate-limit or RPD exhausted → wait then try NEXT model
                    print(f"[gemini_ocr] ⚠️ {model} returned 429 (rate-limit). "
                          f"Waiting {RATE_LIMIT_WAIT_SECONDS}s then rotating model...")
                    time.sleep(RATE_LIMIT_WAIT_SECONDS)
                    break  # break retry loop → move to next model

                elif status == 503:
                    # Server busy → wait then retry SAME model
                    print(f"[gemini_ocr] ⚠️ {model} returned 503 (busy). "
                          f"Waiting {SERVER_BUSY_WAIT_SECONDS}s then retrying...")
                    time.sleep(SERVER_BUSY_WAIT_SECONDS)
                    continue  # retry same model

                elif status == 404:
                    # Model not found → immediately try next model
                    print(f"[gemini_ocr] ❌ {model} returned 404 (not found). Trying next model...")
                    break

                else:
                    # Other HTTP error → try next model
                    print(f"[gemini_ocr] ❌ {model} returned HTTP {status}: {body}. Trying next model...")
                    break

            except Exception as e:
                print(f"[gemini_ocr] ❌ {model} exception: {e}. Trying next model...")
                break  # move to next model

    raise RuntimeError(
        f"All Gemini models exhausted after retries: {MODELS}. "
        "Check your API key and quota."
    )


# ── Build prompt & payload ─────────────────────────────────────────────────────

def _build_payload(page_images_b64: list, known_items: list) -> dict:
    """Build the Gemini API request payload for a batch of page images."""
    items_list_str = '\n'.join(f'  - {item}' for item in sorted(known_items))

    prompt = f"""You are an OCR assistant for Hotel Aditya Grand, a restaurant in Andhra Pradesh, India.

You will receive image(s) of a daily "Item-wise Sales" POS report.

== PDF FORMAT ==
Each page shows a table with three columns:
  Item Name | Qty | Gross Amount

Example rows:
  CHICKEN DUM BIRYANI        16    4,128.00
  SP CHICKEN BIRYANI         23    6,141.00
  MI.WATER LT                56    1,120.00
  Butter Non                 22    1,100.00
  COOL DRINK 250 ML          33      660.00
  chi lolypop 6 pic          10    3,250.00
  MUTTON FRY PIECE BIRYANI    5    1,910.00

== WHAT TO IGNORE ==
Skip any lines that contain: "Hotel Aditya Grand", "Item-wise Sales", "Period:", "Printed:",
"Total", "NoCash", "Discount", "CGST", "SGST", "Grand Total", column headers.

== ITEM NAME NORMALIZATION ==
Item names in the bill are often spelled inconsistently. You MUST map each extracted item
to EXACTLY one item from the Known Menu Items list below using fuzzy/semantic matching.
Common variations to handle:
  "MI.WATER .500ml" / "MIWATER .50Oml" / "MIWATER LT" / "MI.WATER 500ml"
  "chi lolypop 6 pic" / "Chicken Lolypop 6 Pcs" / "CHICKEN LOLYPOP 6 PC"
  "Butter Non" / "Bulter Non" / "butter non" (→ Butter Naan)
  "PANNER Biryani" / "panner biryani" (→ Paneer Biryani)
  "Cashewnut Panner Biryani" / "Cashw nut Panner Biryani"
  "CDB FAMILLY PACK" / "CDB Family Pack"
  "SP CHICKEN BIRYANI" / "Sp Chicken Biryani"
Only include items you can confidently match to the known list. Skip unknowns.

== KNOWN MENU ITEMS ==
{items_list_str}

== OUTPUT FORMAT ==
Return ONLY a valid JSON array. No markdown, no explanation, no code fences.
Each object must have exactly three fields: item_name (exact string from Known Menu Items), qty (integer), gross (float).

Example output:
[
  {{"item_name": "Chicken Dum Biryani", "qty": 16, "gross": 4128.00}},
  {{"item_name": "SP Chicken Biryani", "qty": 23, "gross": 6141.00}},
  {{"item_name": "Mi Water Lt", "qty": 56, "gross": 1120.00}}
]"""

    parts = [{"text": prompt}]
    for img_b64 in page_images_b64:
        parts.append({
            "inline_data": {
                "mime_type": "image/png",
                "data": img_b64
            }
        })

    return {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "temperature": 0.05,
            "maxOutputTokens": 8192,
        }
    }


def _parse_response(resp_data: dict) -> list:
    """Extract and parse the JSON array from a Gemini API response."""
    text_res = resp_data['candidates'][0]['content']['parts'][0]['text'].strip()
    print(f"[gemini_ocr] Raw response (first 400 chars):\n{text_res[:400]}")

    # Strip markdown fences if present
    text_res = re.sub(r'^```(?:json)?\s*', '', text_res)
    text_res = re.sub(r'\s*```\s*$', '', text_res.strip())

    items = json.loads(text_res)
    if not isinstance(items, list):
        raise ValueError(f"Expected JSON array, got {type(items).__name__}")

    print(f"[gemini_ocr] Extracted {len(items)} items")
    for it in items:
        print(f"  {it}")
    return items


# ── Public API ─────────────────────────────────────────────────────────────────

def process_pdf_with_gemini(file_bytes: bytes, api_key: str, known_items: list, sale_date: str = None) -> list:
    """
    Extracts sales items from a Hotel Aditya Grand daily sales PDF using Gemini.
    Uses model fallback chain with automatic retry on rate-limit / server errors.

    Args:
        file_bytes:   raw PDF bytes
        api_key:      Gemini API key
        known_items:  list of canonical item names from menu_items table
        sale_date:    YYYY-MM-DD string for the sale date (used for CSV logging)

    Returns:
        list of dicts: [{"item_name": str, "qty": int, "gross": float}, ...]
    Raises:
        RuntimeError if all models are exhausted without a successful response.
    """
    if sale_date is None:
        sale_date = date.today().isoformat()

    # Convert PDF pages to base64 images
    pdf = fitz.open(stream=file_bytes, filetype='pdf')
    all_pages_b64 = []
    for page in pdf:
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        img_bytes = pix.tobytes('png')
        all_pages_b64.append(base64.b64encode(img_bytes).decode('utf-8'))
    pdf.close()

    total_pages = len(all_pages_b64)
    print(f"[gemini_ocr] Processing {total_pages} page(s) for date {sale_date}")

    all_items: list = []

    # Split into batches if PDF is large
    for batch_start in range(0, total_pages, MAX_PAGES_PER_BATCH):
        batch = all_pages_b64[batch_start:batch_start + MAX_PAGES_PER_BATCH]
        batch_num = batch_start // MAX_PAGES_PER_BATCH + 1
        total_batches = (total_pages + MAX_PAGES_PER_BATCH - 1) // MAX_PAGES_PER_BATCH

        print(f"[gemini_ocr] Batch {batch_num}/{total_batches} ({len(batch)} pages)")
        payload = _build_payload(batch, known_items)
        resp_data = _call_gemini_with_fallback(payload, api_key)
        batch_items = _parse_response(resp_data)
        all_items.extend(batch_items)

    # Save to CSV for audit trail
    _append_to_csv(all_items, sale_date)
    return all_items


def reset_model_index():
    """Reset to the best (first) model. Call after a long idle period."""
    APP_STATE["model_idx"] = 0
    print("[gemini_ocr] Model index reset to 0 (gemini-3.5-pro)")


def get_current_model() -> str:
    """Return the name of the currently active model."""
    return MODELS[APP_STATE["model_idx"]]


# ── CSV audit trail ────────────────────────────────────────────────────────────

def _append_to_csv(items: list, sale_date: str):
    """Append extracted items to the uploaded_sales_data.csv audit file."""
    try:
        os.makedirs(os.path.dirname(UPLOAD_CSV_PATH), exist_ok=True)
        file_exists = os.path.isfile(UPLOAD_CSV_PATH)

        with open(UPLOAD_CSV_PATH, 'a', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
            if not file_exists:
                writer.writeheader()
            for item in items:
                name = item.get('item_name', '')
                qty = item.get('qty', 0)
                gross = item.get('gross', 0.0)
                if name and qty:
                    writer.writerow({
                        'date': sale_date,
                        'item_name': name,
                        'qty_sold': int(qty),
                        'gross_revenue': float(gross),
                        'source': 'gemini_ocr'
                    })
        print(f"[gemini_ocr] Appended {len(items)} rows to CSV: {UPLOAD_CSV_PATH}")
    except Exception as e:
        print(f"[gemini_ocr] Warning: could not write to CSV: {e}")
