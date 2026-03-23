"""
DupeLab — Open Beauty Facts → Google Sheets Pipeline
Run: python fetch_products.py
Output: products.csv  (paste this into Google Sheets)
"""

import requests
import pandas as pd
import time
import sys

# ── CONFIG ────────────────────────────────────────────────────────────────────
PAGE_SIZE = 100          # products per API request
MAX_PAGES = 20           # 20 x 100 = 2000 products max (increase if you want more)
OUTPUT_FILE = "products.csv"

CATEGORY_MAP = {
    "moisturizers": "Moisturizer",
    "moisturizer": "Moisturizer",
    "face-creams": "Moisturizer",
    "serums": "Serum",
    "face-serum": "Serum",
    "toners": "Toner",
    "face-toner": "Toner",
    "sunscreens": "Sunscreen",
    "sun-care": "Sunscreen",
    "cleansers": "Cleanser",
    "face-wash": "Cleanser",
    "exfoliants": "Exfoliant",
    "eye-creams": "Eye Cream",
    "lip-care": "Lip Care",
    "foundations": "Makeup",
    "concealers": "Makeup",
    "makeup": "Makeup",
    "anti-aging": "Anti-Aging",
    "vitamin-c": "Vitamin C",
    "retinol": "Retinol",
    "masks": "Mask",
    "face-masks": "Mask",
    "oils": "Face Oil",
    "face-oils": "Face Oil",
}

def normalize_category(raw_categories: str) -> str:
    if not raw_categories:
        return "Other"
    cats = raw_categories.lower().replace(" ", "-")
    for key, value in CATEGORY_MAP.items():
        if key in cats:
            return value
    return "Other"

def clean_ingredients(raw: str) -> str:
    if not raw:
        return ""
    # Normalize separators, lowercase, strip extras
    cleaned = (
        raw.lower()
        .replace("\n", ", ")
        .replace(";", ",")
        .replace(" - ", ", ")
        .replace("  ", " ")
    )
    parts = [p.strip().strip(".*-") for p in cleaned.split(",")]
    parts = [p for p in parts if 2 < len(p) < 80]
    return ", ".join(parts)

def estimate_price(product: dict) -> float:
    """Open Beauty Facts has no price data — we derive a rough estimate from brand tier."""
    brand = (product.get("brands") or "").lower()
    
    luxury = ["la mer", "sk-ii", "estee lauder", "lancôme", "lancome", "sisley", "tatcha", "drunk elephant", "augustinus bader"]
    high_end = ["paula's choice", "the ordinary", "dr. brandt", "peter thomas roth", "murad", "olehenriksen", "sunday riley"]
    drugstore = ["cetaphil", "cerave", "neutrogena", "olay", "l'oreal", "loreal", "garnier", "nivea", "pond's", "ponds", "st. ives", "e.l.f", "elf cosmetics", "wet n wild", "nyx"]
    
    if any(b in brand for b in luxury):
        return round(60 + hash(brand) % 80, 2)
    elif any(b in brand for b in high_end):
        return round(20 + hash(brand) % 40, 2)
    elif any(b in brand for b in drugstore):
        return round(6 + hash(brand) % 20, 2)
    else:
        return round(12 + hash(brand) % 30, 2)

def fetch_page(page: int) -> list:
    url = "https://world.openbeautyfacts.org/cgi/search.pl"
    params = {
        "action": "process",
        "tagtype_0": "categories",
        "tag_contains_0": "contains",
        "tag_0": "face",
        "json": 1,
        "page": page,
        "page_size": PAGE_SIZE,
        "fields": "product_name,brands,categories,ingredients_text,quantity,image_small_url",
        "sort_by": "unique_scans_n",  # most scanned = most popular
    }
    try:
        r = requests.get(url, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()
        return data.get("products", [])
    except Exception as e:
        print(f"  ⚠ Page {page} failed: {e}")
        return []

def main():
    print("🔬 DupeLab — Open Beauty Facts Fetcher")
    print(f"   Fetching up to {MAX_PAGES * PAGE_SIZE} products...\n")

    all_rows = []
    seen_names = set()

    for page in range(1, MAX_PAGES + 1):
        print(f"  Fetching page {page}/{MAX_PAGES}...", end=" ")
        products = fetch_page(page)
        
        if not products:
            print("empty, stopping.")
            break

        added = 0
        for p in products:
            name = (p.get("product_name") or "").strip()
            brand = (p.get("brands") or "").strip()
            ingredients_raw = p.get("ingredients_text") or ""
            
            # Skip if missing key data
            if not name or not brand or not ingredients_raw:
                continue
            
            # Skip duplicates
            key = f"{name.lower()}|{brand.lower()}"
            if key in seen_names:
                continue
            seen_names.add(key)

            ingredients = clean_ingredients(ingredients_raw)
            if len(ingredients.split(",")) < 3:
                continue  # skip products with barely any ingredients

            category = normalize_category(p.get("categories") or "")
            quantity = (p.get("quantity") or "").strip()
            price = estimate_price(p)

            all_rows.append({
                "name": name,
                "brand": brand,
                "category": category,
                "price": price,
                "size": quantity or "varies",
                "ingredients": ingredients,
                "image_url": p.get("image_small_url") or "",
            })
            added += 1

        print(f"{added} products added (total: {len(all_rows)})")
        time.sleep(0.3)  # be polite to the API

    if not all_rows:
        print("\n❌ No products fetched. Check your internet connection.")
        sys.exit(1)

    df = pd.DataFrame(all_rows)
    df = df.drop_duplicates(subset=["name", "brand"])
    df = df[df["ingredients"].str.len() > 20]
    df.to_csv(OUTPUT_FILE, index=False)

    print(f"\n✅ Done! {len(df)} products saved to {OUTPUT_FILE}")
    print(f"   Categories: {df['category'].value_counts().to_dict()}")
    print(f"\n📋 Next step: open {OUTPUT_FILE} and paste into Google Sheets")

if __name__ == "__main__":
    main()
