"""
Master setup script — runs the full data pipeline in sequence.
Run from the project root: python setup_all.py
"""

import subprocess
import sys
import os
from pathlib import Path

ROOT = Path(__file__).parent

def run(label: str, cmd: list, cwd: Path):
    print(f"\n{'─'*60}")
    print(f"▶  {label}")
    print(f"{'─'*60}")
    result = subprocess.run(cmd, cwd=str(cwd), capture_output=False)
    if result.returncode != 0:
        print(f"\n❌ FAILED: {label}")
        sys.exit(1)
    print(f"✅ Done: {label}")

if __name__ == '__main__':
    python = sys.executable

    # Step 1: Parse PDFs → raw_sales_data.csv
    raw_csv = ROOT / "data_pipeline" / "raw_sales_data.csv"
    if raw_csv.exists():
        print(f"✅ raw_sales_data.csv already exists — skipping PDF parsing")
    else:
        run("Parse PDFs (EasyOCR)", [python, "parse_pdfs.py"], ROOT / "data_pipeline")

    # Step 2: Clean data → cleaned_sales_data.csv
    cleaned_csv = ROOT / "data_pipeline" / "cleaned_sales_data.csv"
    if cleaned_csv.exists():
        print(f"✅ cleaned_sales_data.csv already exists — skipping cleaning")
    else:
        run("Clean & normalize data", [python, "clean_data.py"], ROOT / "data_pipeline")

    # Step 3: Load to DB
    run("Load data to SQLite DB", [python, "load_to_db.py"], ROOT / "data_pipeline")

    # Step 4: EDA
    run("Run EDA analysis", [python, "eda_analysis.py"], ROOT / "analysis")

    # Step 5: Validate
    run("Validate recommendation engine", [python, "validate.py"], ROOT / "backend")

    print(f"\n{'='*60}")
    print("  ALL DONE! Starting FastAPI server...")
    print(f"{'='*60}")
    print("  API docs → http://localhost:8000/docs")
    print("  Stop with Ctrl+C")
    print()

    os.chdir(str(ROOT / "backend"))
    os.execvp(python, [python, "-m", "uvicorn", "main:app", "--reload", "--port", "8000"])
