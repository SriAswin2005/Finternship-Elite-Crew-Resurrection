"""
Data Cleaner -- Hotel Aditya Grand
Normalizes raw OCR-extracted item names into canonical clean names,
assigns categories, and produces cleaned_sales_data.csv
"""

import pandas as pd
import json
import re
from pathlib import Path

RAW_CSV     = Path(__file__).parent / "raw_sales_data.csv"
OUTPUT_CSV  = Path(__file__).parent / "cleaned_sales_data.csv"
MAP_JSON    = Path(__file__).parent / "item_name_map.json"

# --- Manual canonical name map ------------------------------------------------
# Keys: lowercased raw names (or substrings)  ?  canonical clean name
ITEM_MAP = {
    # Biryanis
    "chicken dum biryani":         "Chicken Dum Biryani",
    "chicken fry piece biryani":   "Chicken Fry Piece Biryani",
    "veg biryani":                 "Veg Biryani",
    "egg biryani":                 "Egg Biryani",
    "egg bir":                     "Egg Biryani",
    "biryani rice":                "Biryani Rice",
    "chota cb biryani":            "Chota CB Biryani",
    "chota sp biryani":            "Chota Sp Biryani",
    "cashewnut panner biryani":    "Cashewnut Paneer Biryani",
    "chicken lolypop biryani":     "Chicken Lollypop Biryani",
    "spl veg biryani":             "Spl Veg Biryani",
    "to day spl chicken biryani":  "Sp Chicken Biryani",
    "today spl chicken biryani":   "Sp Chicken Biryani",
    "sp chicken biryani":          "Sp Chicken Biryani",

    # Chicken
    "chilli chicken bl":           "Chilli Chicken BL",
    "chilli chicken":              "Chilli Chicken BL",
    "butter chicken bl":           "Butter Chicken BL",
    "bulter chicken bl":           "Butter Chicken BL",
    "andhra chicken":              "Andhra Chicken BL",
    "andhra chicken  bl":          "Andhra Chicken BL",
    "andhra chicken (b)":          "Andhra Chicken BL",
    "andhra chicken bl":           "Andhra Chicken BL",
    "kadai chicken (b)":           "Kadai Chicken",
    "kadai chicken bl":            "Kadai Chicken",
    "kadai chicken bl 4":          "Kadai Chicken",
    "chicken 65 bl":               "Chicken 65 BL",
    "chicken 85 bl":               "Chicken 85 BL",
    "chicken 555 bl":              "Chicken 555 BL",
    "dragen chicken (bl)":         "Dragon Chicken BL",
    "dragen chicken (bl) 4":       "Dragon Chicken BL",
    "dragon chicken (bl)":         "Dragon Chicken BL",
    "chicken curry (b)":           "Chicken Curry (B)",
    "chicken curry bl":            "Chicken Curry BL",
    "chicken fry (b)":             "Chicken Fry (B)",
    "chicken fry bl":              "Chicken Fry BL",
    "chicken egg drop (b)":        "Chicken Egg Drop",
    "chicken egg drop bl":         "Chicken Egg Drop",
    "chi mejistic":                "Chicken Majestic",
    "chicken majestic":            "Chicken Majestic",
    "chicken mejistick":           "Chicken Majestic",
    "chicken alfa bl":             "Chicken Alfa BL",
    "chicken pakoda bl":           "Chicken Pakoda BL",
    "chicken manchuria bl":        "Chicken Manchuria BL",
    "chicken drums (b)":           "Chicken Drums (B)",
    "r r chicken bl":              "R R Chicken BL",
    "star chicken (b)":            "Star Chicken (B)",
    "star chicken bl":             "Star Chicken BL",
    "pepper chieken bl":           "Pepper Chicken BL",
    "murgi masala b":              "Murgi Masala",
    "to day spl chi (bl)":         "Today Spl Chicken BL",

    # Lollypops
    "chi lolypop 6 pic":           "Chicken Lollypop 6pc",
    "chicken loly pop 6 pes":      "Chicken Lollypop 6pc",
    "chicken loly pop 6 pcs":      "Chicken Lollypop 6pc",
    "chicken lolypop 3pc":         "Chicken Lollypop 3pc",
    "chicken lolypop 3pcs":        "Chicken Lollypop 3pc",
    "chicken lolypop 6 pcs":       "Chicken Lollypop 6pc",
    "chicken lolypop 6pc":         "Chicken Lollypop 6pc",
    "chi loly pop (b)":            "Chicken Lollypop 6pc",
    "chi lolypop pic":             "Chicken Lollypop 6pc",
    "chi lolypop bir (f) pack":    "Chicken Lollypop Biryani Family Pack",

    # Breads / Naan  -- merge all OCR variants
    "butter non":                  "Butter Naan",
    "butter naan":                 "Butter Naan",
    "bulter non":                  "Butter Naan",
    "plain non":                   "Plain Naan",
    "garlic non":                  "Garlic Naan",
    "bulter roti":                 "Butter Roti",
    "butter roti":                 "Butter Roti",
    "masala kulcha":               "Masala Kulcha",
    "panner kulcha":               "Paneer Kulcha",

    # Rice dishes
    "curd rice":                   "Curd Rice",
    "curd rice 17":                "Curd Rice",
    "1 by 2 curd rice":            "Curd Rice",
    "spl curd rice":               "Curd Rice",
    "veg fried rice":              "Veg Fried Rice",
    "spl veg fried rice":          "Spl Veg Fried Rice",
    "plain rice":                  "Plain Rice",
    "zeera rice":                  "Zeera Rice",
    "cashw nut fried rice":        "Cashewnut Fried Rice",
    "spl cashewnut fried rice":    "Cashewnut Fried Rice",
    "cashewnul panner(f) rice":    "Cashewnut Paneer Fried Rice",
    "cashew panner fried rice (f) pack": "Cashewnut Paneer Fried Rice",
    "mixed fried rice n v":        "Mixed Fried Rice",
    "mixed fried rice veg":        "Mixed Veg Fried Rice",
    "sp chicken fried rice":       "Sp Chicken Fried Rice",
    "sezwan chi fried rice":       "Szechwan Chicken Fried Rice",
    "sezwan gobi fried rice":      "Szechwan Gobi Fried Rice",
    "gobi fried rice":             "Gobi Fried Rice",
    "panner fried rice":           "Paneer Fried Rice",
    "mushuroom fried rice":        "Mushroom Fried Rice",
    "egg fried rice":              "Egg Fried Rice",
    "prawns fried rice":           "Prawns Fried Rice",
    "chicken fried rice":          "Chicken Fried Rice",
    "biryani rice":                "Biryani Rice",

    # Water -- CRITICAL: merge all OCR variants into 2 items
    "mi.water lt":                 "Mineral Water 1L",
    "mi.water 1lt":                "Mineral Water 1L",
    "miwater lt":                  "Mineral Water 1L",
    "mlwater lt":                  "Mineral Water 1L",
    "mi.water .500ml":             "Mineral Water 500ml",
    "mi.water 500ml":              "Mineral Water 500ml",
    "miwater .500ml":              "Mineral Water 500ml",
    "miwater .50oml":              "Mineral Water 500ml",
    "mlwater .500ml":              "Mineral Water 500ml",
    "soda .750ml":                 "Soda 750ml",
    "soda 750ml":                  "Soda 750ml",
    "fresh leman soda":            "Fresh Lemon Soda",
    "butter milk":                 "Butter Milk",
    "butter mlk":                  "Butter Milk",

    # Beverages
    "cool drink 250 ml":           "Cool Drink 250ml",
    "cool drink 250ml":            "Cool Drink 250ml",
    "cool drink 500 ml":           "Cool Drink 500ml",
    "lassi salt":                  "Lassi Salt",
    "lassi sweet":                 "Lassi Sweet",
    "belgium choco milk shake":    "Belgium Choco Milk Shake",
    "belgom chocolate ice cream":  "Belgium Choco Ice Cream",
    "butr scotch milk shake":      "Butterscotch Milk Shake",
    "black current milk shake":    "Black Currant Milk Shake",
    "black current ice cream":     "Black Currant Ice Cream",
    "caramelnuts milk shake":      "Caramel Nuts Milk Shake",
    "caramilnuts ice cream":       "Caramel Nuts Ice Cream",

    # Ice Creams
    "american nuts ice cream":     "American Nuts Ice Cream",
    "anjeerbadam ice cream":       "Anjeerbadam Ice Cream",
    "anjeerbadam ice crean":       "Anjeerbadam Ice Cream",
    "strawberry ice cream":        "Strawberry Ice Cream",
    "vannila ice cream":           "Vanilla Ice Cream",
    "vanilla ice cream":           "Vanilla Ice Cream",
    "chocochips ice cream":        "Chocochips Ice Cream",
    "butterscotch ice cream":      "Butterscotch Ice Cream",
    "pineapple ice creem":         "Pineapple Ice Cream",
    "pista ice cream":             "Pista Ice Cream",

    # Paneer (consolidate OCR variants)
    "paneer":                      "Paneer",
    "panner biryani":              "Paneer Biryani",
    "paneer butter masala":        "Paneer Butter Masala",
    "palak paneer":                "Palak Paneer",
    "chilli paneer":               "Chilli Paneer",
    "paneer 65":                   "Paneer 65",
    "panner machuria":             "Paneer Manchuria",
    "panner mejestick":            "Paneer Majestic",
    "panner tikka":                "Paneer Tikka",
    "kadai paneer":                "Kadai Paneer",
    "panner bir (f) pack":         "Paneer Biryani Family Pack",
    "cashewnut panner curry":      "Cashewnut Paneer Curry",

    # Seafood
    "fish appolo":                 "Fish Apollo",
    "fish apollo":                 "Fish Apollo",
    "fish curry small":            "Fish Curry Small",
    "fish curry large":            "Fish Curry Large",
    "spl fish curry":              "Spl Fish Curry",
    "fish roast  small":           "Fish Roast Small",
    "fish roast large":            "Fish Roast Large",
    "spl fish biryani":            "Spl Fish Biryani",
    "chilli prawns":               "Chilli Prawns",
    "chilli fish":                 "Chilli Fish",
    "loose prawns":                "Prawns",
    "prwans fry":                  "Prawns Fry",
    "r r prawns":                  "R R Prawns",
    "prawns curry":                "Prawns Curry",
    "prawns biryani":              "Prawns Biryani",
    "prawns biryani 4":            "Prawns Biryani",
    "spl koramenu pulusu":         "Spl Koramenu Pulusu",

    # Soups
    "chicken manchow soup":        "Chicken Manchow Soup",
    "veg manchow soup":            "Veg Manchow Soup",
    "veg sweet corn soup":         "Veg Sweet Corn Soup",
    "veg hot n sour soup":         "Veg Hot N Sour Soup",
    "tomoto soup":                 "Tomato Soup",
    "lemon coriander soup":        "Lemon Coriander Soup",
    "mutton soup":                 "Mutton Soup",
    "chicken hot n sour":          "Chicken Hot N Sour Soup",
    "mutton hot nsour":            "Mutton Hot N Sour",
    "chicken corn soup":           "Chicken Corn Soup",

    # Eggs
    "boiled egg":                  "Boiled Egg",
    "boild veg":                   "Boiled Egg",
    "omlett":                      "Omelette",
    "egg burzi":                   "Egg Burji",
    "egg curry":                   "Egg Curry",
    "egg kheema curry":            "Egg Kheema Curry",
    "egg manchuria":               "Egg Manchuria",
    "egg masala":                  "Egg Masala",
    "chilli egg":                  "Chilli Egg",

    # Gobi / Veg starters
    "gobi munchuria":              "Gobi Manchuria",
    "gobi manchuria":              "Gobi Manchuria",
    "chilli gobi":                 "Chilli Gobi",
    "gobi 65":                     "Gobi 65",
    "veg machuria":                "Veg Manchuria",
    "chilli mushuroom":            "Chilli Mushroom",
    "mushroom pepper & salt":      "Mushroom Pepper Salt",
    "mushroom pepper  & salt":     "Mushroom Pepper Salt",
    "kadai mushroom":              "Kadai Mushroom",
    "mushroom curry":              "Mushroom Curry",
    "mushuroom biryani":           "Mushroom Biryani",
    "mushuroom bir (f) pack":      "Mushroom Biryani Family Pack",
    "baby corn":                   "Baby Corn",
    "baby corn 555":               "Baby Corn 555",
    "baby corn 65":                "Baby Corn 65",
    "baby corn manchuria":         "Baby Corn Manchuria",
    "baby corn pepper salt":       "Baby Corn Pepper Salt",
    "crispy baby corn":            "Crispy Baby Corn",
    "crispy corn":                 "Crispy Corn",
    "cashewnut curry":             "Cashewnut Curry",
    "cashewnut masala curry":      "Cashewnut Curry",
    "cashewnut fry":               "Cashewnut Fry",
    "cashewnut melhi":             "Cashewnut Methi",
    "cashewnut methi":             "Cashewnut Methi",
    "cashewnut tomato":            "Cashewnut Tomato",
    "cashewnut mushuram curry":    "Cashewnut Mushroom Curry",
    "cashewnut chicken bl":        "Cashewnut Chicken BL",
    "cashewnul biryani":           "Cashewnut Biryani",
    "cashewnut biryani":           "Cashewnut Biryani",
    "cashewnut bir (f)pack":       "Cashewnut Biryani Family Pack",
    "ground nut masala":           "Ground Nut Masala",
    "greenpiece masala":           "Green Peas Masala",

    # Mutton
    "mutton fry piece biryani":    "Mutton Fry Piece Biryani",
    "chota mutton bir":            "Chota Mutton Biryani",
    "chota cdb biryani":           "Chota CDB Biryani",
    "mutton curry (l)":            "Mutton Curry (L)",
    "mutton curry (s)":            "Mutton Curry (S)",
    "kalmi biryani":               "Kalmi Biryani",
    "mogalai biryani":             "Mughlai Biryani",
    "moghalai chicken bl":         "Mughlai Chicken BL",
    "moghali biriyani family pack":"Mughlai Biryani Family Pack",
    "aditya spl biryani":          "Aditya Spl Biryani",
    "mixed veg biryani":           "Mixed Veg Biryani",

    # Tandoori
    "tandoori chicken biryani":    "Tandoori Chicken Biryani",
    "tandoori chicken full":       "Tandoori Chicken Full",
    "tandoori chicken half":       "Tandoori Chicken Half",
    "tandoori kabab full":         "Tandoori Kabab Full",
    "tandoori kabab half":         "Tandoori Kabab Half",
    "to day spl tikka":            "Today Spl Tikka",

    # Family Packs
    "cb family pack":              "CB Family Pack",
    "cdb familly pack":            "CDB Family Pack",
    "cdb family pack":             "CDB Family Pack",
    "sp family pack":              "Sp Family Pack",
    "spl veg family pack":         "Spl Veg Family Pack",
    "mtb family pack":             "MTB Family Pack",

    # Veg Curries
    "mix veg curry":               "Mix Veg Curry",
    "kadai veg":                   "Kadai Veg",
    "palak curry":                 "Palak Curry",
    "malai kofta":                 "Malai Kofta",
    "methi chaman":                "Methi Chaman",
    "methi chaman 5":              "Methi Chaman",
    "veg bhuton":                  "Veg Bhutan",
    "veg salad":                   "Veg Salad",
    "curd":                        "Curd",
    "openitem":                    "Open Item",
}

# --- Category Rules (applied to canonical names) ----------------------------
CATEGORY_RULES = [
    ("biryani",     ["biryani", "biriyani"]),
    ("chicken",     ["chicken", "andhra", "chilli chicken", "dragon", "kadai"]),
    ("bread",       ["naan", "roti", "paratha", "non"]),
    ("rice",        ["fried rice", "curd rice", "biryani rice"]),
    ("beverage",    ["cool drink", "lassi", "milk shake", "juice", "water"]),
    ("ice_cream",   ["ice cream"]),
    ("seafood",     ["fish", "prawn", "crab"]),
    ("soup",        ["soup"]),
    ("egg",         ["boiled egg", "egg drop", "egg bir"]),
    ("starter",     ["lollypop", "french fries", "manchuria", "manchow",
                     "gobi", "cashewnut", "65", "85"]),
    ("family_pack", ["family pack"]),
    ("dairy",       ["curd", "paneer"]),
]

def assign_category(canonical_name: str) -> str:
    name_lower = canonical_name.lower()
    for category, keywords in CATEGORY_RULES:
        if any(kw in name_lower for kw in keywords):
            return category
    return "other"

def normalize_item(raw_name: str) -> str:
    key = raw_name.strip().lower()
    # Direct map lookup
    if key in ITEM_MAP:
        return ITEM_MAP[key]
    # Partial match
    for pattern, canonical in ITEM_MAP.items():
        if pattern in key:
            return canonical
    # Fallback: title-case the raw
    return raw_name.strip().title()

def main():
    if not RAW_CSV.exists():
        print(f"ERROR: {RAW_CSV} not found. Run parse_pdfs.py first.")
        return

    df = pd.read_csv(RAW_CSV)
    print(f"Loaded {len(df)} raw rows from {RAW_CSV}")
    print(f"Date range: {df['date'].min()} ? {df['date'].max()}")
    print(f"Unique raw item names: {df['item_raw'].nunique()}")

    # Normalize
    df['item_name'] = df['item_raw'].apply(normalize_item)
    df['category']  = df['item_name'].apply(assign_category)

    # Convert types
    df['date']          = pd.to_datetime(df['date'])
    df['qty_sold']      = pd.to_numeric(df['qty_sold'], errors='coerce').fillna(0).astype(int)
    df['gross_revenue'] = pd.to_numeric(df['gross_revenue'], errors='coerce').fillna(0.0)

    # Drop rows with 0 qty (OCR misreads)
    df = df[df['qty_sold'] > 0].copy()

    # Aggregate: if same item appears twice on same date (OCR duplicate), sum
    df = df.groupby(['date', 'item_name', 'category'], as_index=False).agg(
        qty_sold=('qty_sold', 'sum'),
        gross_revenue=('gross_revenue', 'sum')
    )

    # Add day-of-week column
    df['day_of_week'] = df['date'].dt.day_name()
    df['dow_num']     = df['date'].dt.weekday   # 0=Mon, 6=Sun

    # Sort
    df = df.sort_values(['date', 'item_name']).reset_index(drop=True)

    print(f"\nAfter cleaning: {len(df)} rows")
    print(f"Unique canonical items: {df['item_name'].nunique()}")
    print(f"Unique dates: {df['date'].nunique()}")
    print(f"\nCategory distribution:\n{df.groupby('category')['item_name'].nunique()}")
    print(f"\nTop 15 items by total qty sold:")
    top = df.groupby('item_name')['qty_sold'].sum().sort_values(ascending=False).head(15)
    print(top.to_string())

    # Save
    df['date'] = df['date'].dt.strftime('%Y-%m-%d')
    df.to_csv(OUTPUT_CSV, index=False)

    # Also save the item map for reference
    with open(MAP_JSON, 'w', encoding='utf-8') as f:
        json.dump(ITEM_MAP, f, indent=2, ensure_ascii=False)

    print(f"\nSaved ? {OUTPUT_CSV}")
    print(f"Saved ? {MAP_JSON}")

if __name__ == '__main__':
    main()
