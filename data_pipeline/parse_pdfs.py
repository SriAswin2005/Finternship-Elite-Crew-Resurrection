"""
PDF Parser — Hotel Aditya Grand
Extracts Item | Qty | Gross from daily sales PDFs using PyMuPDF + EasyOCR
"""

import fitz  # PyMuPDF
import easyocr
import numpy as np
import re
import os
import csv
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
OUTPUT_CSV = Path(__file__).parent / "raw_sales_data.csv"

# EasyOCR reader — initialize once (English)
print("Initializing EasyOCR reader...")
reader = easyocr.Reader(['en'], gpu=False, verbose=False)
print("EasyOCR ready.")

SKIP_PATTERNS = [
    r'^\s*$',
    r'Item\s+Qty\s+Gross',
    r'^(Total|NoCash|Discount|CGST|SGST|Grand|Printed|Period|Item)\b',
    r'Hotel\s+Aditya',
    r'Item-wise\s+Sales',
    r'^\d{4}-\d{2}-\d{2}',
]

def should_skip(line: str) -> bool:
    for pattern in SKIP_PATTERNS:
        if re.search(pattern, line, re.IGNORECASE):
            return True
    return False

def parse_date_from_filename(filename: str) -> str:
    """'01-04-2026.pdf' or '25-04-2026_1.pdf' → '2026-04-01'"""
    base = filename.replace('_1', '').replace('.pdf', '')
    parts = base.split('-')
    if len(parts) == 3:
        return f"{parts[2]}-{parts[1]}-{parts[0]}"
    return filename

def clean_number(s: str) -> float:
    """'1,300.00' → 1300.0"""
    return float(s.replace(',', '').strip())

def extract_rows_from_ocr_results(results, date: str) -> list[dict]:
    """
    results: list of (bbox, text, confidence) from EasyOCR
    We reconstruct lines by grouping text boxes with similar Y coords,
    then parse Item | Qty | Gross pattern.
    """
    # Sort by Y then X
    results_sorted = sorted(results, key=lambda r: (round(r[0][0][1] / 20), r[0][0][0]))

    # Group into lines (boxes within 20px vertically)
    lines = []
    current_y = None
    current_line = []

    for bbox, text, conf in results_sorted:
        y = round(bbox[0][1] / 20)
        if current_y is None:
            current_y = y
        if abs(y - current_y) <= 1:
            current_line.append((bbox[0][0], text, conf))
        else:
            if current_line:
                # Sort by X within line
                current_line.sort(key=lambda x: x[0])
                lines.append(' '.join(t for _, t, _ in current_line))
            current_line = [(bbox[0][0], text, conf)]
            current_y = y

    if current_line:
        current_line.sort(key=lambda x: x[0])
        lines.append(' '.join(t for _, t, _ in current_line))

    rows = []
    for line in lines:
        line = line.strip()
        if not line or should_skip(line):
            continue

        # Pattern: <item_name> <qty_int> <gross_decimal>
        # e.g. "CHICKEN DUM BIRYANI 16 4,128.00"
        match = re.match(
            r'^(.+?)\s+(\d{1,4})\s+([\d,]+\.\d{2})\s*$',
            line
        )
        if match:
            item = match.group(1).strip()
            qty = int(match.group(2))
            gross = clean_number(match.group(3))
            # Sanity check: skip header-like items
            if qty > 0 and gross >= 0 and len(item) > 1:
                rows.append({
                    'date': date,
                    'item_raw': item,
                    'qty_sold': qty,
                    'gross_revenue': gross
                })
    return rows

def process_pdf(pdf_path: Path) -> list[dict]:
    date_str = parse_date_from_filename(pdf_path.name)
    doc = fitz.open(str(pdf_path))
    all_rows = []

    for page_num, page in enumerate(doc):
        # Render at 2x zoom for better OCR quality
        mat = fitz.Matrix(2, 2)
        pix = page.get_pixmap(matrix=mat)
        # Convert to numpy array for EasyOCR
        img_array = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
            pix.height, pix.width, pix.n
        )
        if pix.n == 4:  # RGBA → RGB
            img_array = img_array[:, :, :3]

        try:
            results = reader.readtext(img_array)
            rows = extract_rows_from_ocr_results(results, date_str)
            all_rows.extend(rows)
        except Exception as e:
            print(f"  [WARN] Page {page_num+1} OCR failed: {e}")

    doc.close()
    return all_rows

def main():
    pdf_files = sorted(DATA_DIR.glob("*.pdf"))
    print(f"Found {len(pdf_files)} PDF files in {DATA_DIR}")

    all_data = []
    failed = []

    # Open CSV for incremental writing (write after each file)
    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    csv_file = open(OUTPUT_CSV, 'w', newline='', encoding='utf-8')
    writer = csv.DictWriter(csv_file, fieldnames=['date', 'item_raw', 'qty_sold', 'gross_revenue'])
    writer.writeheader()

    for i, pdf_path in enumerate(pdf_files):
        print(f"[{i+1}/{len(pdf_files)}] Processing: {pdf_path.name} ...", end=' ', flush=True)
        try:
            rows = process_pdf(pdf_path)
            print(f"-> {len(rows)} rows")
            all_data.extend(rows)
            # Write this file's rows immediately to CSV
            writer.writerows(rows)
            csv_file.flush()
        except Exception as e:
            print(f"-> FAILED: {e}")
            failed.append(pdf_path.name)

    csv_file.close()

    print(f"\nTotal rows extracted: {len(all_data)}")
    if failed:
        print(f"Failed files: {failed}")
    print(f"Saved -> {OUTPUT_CSV}")

if __name__ == '__main__':
    main()
