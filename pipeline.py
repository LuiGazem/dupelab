"""
DupeLab Pipeline
────────────────
Flow:
  1. Firecrawl scrapes Sephora product pages → ingredients + price
  2. Open Beauty Facts API → finds cheaper ingredient matches
  3. dlt loads everything into Supabase (products + dupes tables)

Setup:
  pip install dlt[postgres] firecrawl-py requests python-dotenv

Secrets needed (put in .env):
  FIRECRAWL_API_KEY=...
  SUPABASE_DB_URL=postgresql://postgres:PASSWORD@db.xxxx.supabase.co:5432/postgres
"""

import os, time, re, json, requests
from dotenv import load_dotenv
import dlt
from typing import Iterator

load_dotenv()

FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY")
SUPABASE_DB_URL   = os.getenv("SUPABASE_DB_URL")

SEPHORA_URLS = [
    "https://www.sephora.com/product/moisturizing-cream-P420652",
    "https://www.sephora.com/product/ultra-facial-cream-P15720",
    "https://www.sephora.com/product/tatcha-the-water-cream-P394639",
    "https://www.sephora.com/product/the-ordinary-hyaluronic-acid-2-b5-P455542",
    "https://www.sephora.com/product/c-firma-fresh-day-serum-P461619",
    "https://www.sephora.com/product/retinol-0-5-in-squalane-P461548",
    "https://www.sephora.com/product/vitamin-c-suspension-23-ha-spheres-2-P461551",
    "https://www.sephora.com/product/lala-retro-whipped-cream-P461621",
    "https://www.sephora.com/product/protini-polypeptide-cream-P461618",
    "https://www.sephora.com/product/youth-to-the-people-superfood-cleanser-P441180",
]

CATEGORY_MAP = {
    "moisturizer": "Moisturizer", "cream": "Moisturizer", "lotion": "Moisturizer",
    "serum": "Serum", "essence": "Serum",
    "toner": "Toner",
    "cleanser": "Cleanser", "wash": "Cleanser",
    "spf": "Sunscreen", "sunscreen": "Sunscreen",
    "retinol": "Retinol",
    "vitamin c": "Vitamin C", "ascorbic": "Vitamin C",
    "exfoliant": "Exfoliant", "aha": "Exfoliant", "bha": "Exfoliant",
    "eye": "Eye Cream",
    "mask": "Mask",
    "oil": "Face Oil",
    "foundation": "Makeup", "concealer": "Makeup",
}

KEY_INGREDIENTS = [
    "retinol","hyaluronic acid","sodium hyaluronate","niacinamide","ceramide",
    "vitamin c","ascorbic acid","salicylic acid","glycolic acid","ferulic acid",
    "squalane","peptide","collagen","centella asiatica","allantoin","panthenol",
    "tocopherol","beta-glucan","glycerin","dimethicone","lactic acid","azelaic acid",
]

def guess_category(name, ingredients):
    text = (name + " " + ingredients).lower()
    for kw, cat in CATEGORY_MAP.items():
        if kw in text:
            return cat
    return "Other"

def clean_ingredients(raw):
    cleaned = raw.lower().replace("\n", ",").replace(";", ",")
    parts = [p.strip().strip(".*-*()") for p in cleaned.split(",")]
    return [p for p in parts if 2 < len(p) < 80]

def score_match(input_ings, product_ings):
    if not input_ings:
        return {"score": 0, "match_count": 0, "key_match_count": 0}
    match_count = key_match_count = 0
    for ing in input_ings:
        if any(ing in pi or pi in ing for pi in product_ings):
            match_count += 1
            if any(k in ing for k in KEY_INGREDIENTS):
                key_match_count += 1
    score = min(100, (match_count / len(input_ings)) * 100 + key_match_count * 5)
    return {"score": round(score, 1), "match_count": match_count, "key_match_count": key_match_count}

def scrape_sephora_product(url):
    print(f"  Scraping {url.split('/')[-1]}...")
    try:
        resp = requests.post(
            "https://api.firecrawl.dev/v1/scrape",
            headers={"Authorization": f"Bearer {FIRECRAWL_API_KEY}", "Content-Type": "application/json"},
            json={
                "url": url,
                "formats": ["extract"],
                "extract": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "product_name": {"type": "string"},
                            "brand":        {"type": "string"},
                            "price":        {"type": "number"},
                            "size":         {"type": "string"},
                            "ingredients":  {"type": "string"},
                        },
                        "required": ["product_name", "brand", "ingredients"],
                    }
                },
            },
            timeout=30,
        )
        resp.raise_for_status()
        extracted = resp.json().get("data", {}).get("extract", {})
        if not extracted.get("ingredients"):
            return None
        ings = clean_ingredients(extracted["ingredients"])
        price = float(extracted.get("price") or 0)
        size_str = extracted.get("size", "")
        size_oz_match = re.search(r"[\d.]+", size_str)
        size_oz = float(size_oz_match.group()) if size_oz_match else 1.0
        price_per_oz = round(price / size_oz, 2) if size_oz > 0 else price
        return {
            "name": extracted.get("product_name", "Unknown"),
            "brand": extracted.get("brand", "Unknown"),
            "price": price, "size": size_str,
            "price_per_oz": price_per_oz,
            "category": guess_category(extracted.get("product_name", ""), extracted["ingredients"]),
            "ingredients": json.dumps(ings),
            "source_url": url, "source": "sephora",
        }
    except Exception as e:
        print(f"    Failed: {e}")
        return None

def estimate_price(brand):
    b = brand.lower()
    if any(x in b for x in ["la mer","sk-ii","sisley","tatcha","drunk elephant","augustinus"]):
        return round(65 + abs(hash(b)) % 80, 2)
    if any(x in b for x in ["paula's choice","the ordinary","murad","sunday riley"]):
        return round(22 + abs(hash(b)) % 40, 2)
    if any(x in b for x in ["cerave","neutrogena","olay","l'oreal","garnier","nivea","pond"]):
        return round(7 + abs(hash(b)) % 18, 2)
    return round(14 + abs(hash(b)) % 28, 2)

def fetch_obf_products(max_pages=20):
    print("\nFetching Open Beauty Facts...")
    all_products, seen = [], set()
    for page in range(1, max_pages + 1):
        try:
            r = requests.get(
                "https://world.openbeautyfacts.org/cgi/search.pl",
                params={"action": "process","tagtype_0": "categories","tag_contains_0": "contains",
                        "tag_0": "face","json": 1,"page": page,"page_size": 100,
                        "fields": "product_name,brands,categories,ingredients_text,quantity",
                        "sort_by": "unique_scans_n"},
                timeout=15,
            )
            products = r.json().get("products", [])
            if not products:
                break
            for p in products:
                name = (p.get("product_name") or "").strip()
                brand = (p.get("brands") or "").strip()
                ings_raw = p.get("ingredients_text") or ""
                if not name or not brand or not ings_raw:
                    continue
                key = f"{name.lower()}|{brand.lower()}"
                if key in seen: continue
                seen.add(key)
                ings = clean_ingredients(ings_raw)
                if len(ings) < 3: continue
                price = estimate_price(brand)
                size = (p.get("quantity") or "varies").strip()
                size_oz_m = re.search(r"[\d.]+", size)
                size_oz = float(size_oz_m.group()) if size_oz_m else 1.0
                all_products.append({
                    "name": name, "brand": brand, "price": price, "size": size,
                    "price_per_oz": round(price / size_oz, 2) if size_oz > 0 else price,
                    "category": guess_category(name, ings_raw),
                    "ingredients": json.dumps(ings),
                    "source_url": "", "source": "open_beauty_facts",
                })
            print(f"  Page {page}: {len(all_products)} total")
            time.sleep(0.3)
        except Exception as e:
            print(f"  Page {page} error: {e}")
            break
    return all_products

def find_dupes(sephora_products, obf_products):
    print("\nMatching dupes...")
    dupes = []
    for sp in sephora_products:
        sp_ings = json.loads(sp["ingredients"])
        candidates = []
        for op in obf_products:
            op_ings = json.loads(op["ingredients"])
            result = score_match(sp_ings, op_ings)
            if result["score"] < 10: continue
            savings_pct = round(((sp["price_per_oz"] - op["price_per_oz"]) / sp["price_per_oz"]) * 100, 1) if sp["price_per_oz"] > 0 else 0
            candidates.append({
                "source_product_name": sp["name"], "source_brand": sp["brand"],
                "source_price": sp["price"], "source_price_per_oz": sp["price_per_oz"],
                "dupe_product_name": op["name"], "dupe_brand": op["brand"],
                "dupe_price": op["price"], "dupe_price_per_oz": op["price_per_oz"],
                "dupe_size": op["size"], "dupe_category": op["category"],
                "match_score": result["score"], "match_count": result["match_count"],
                "key_match_count": result["key_match_count"], "savings_pct": savings_pct,
                "dupe_ingredients": op["ingredients"],
            })
        top5 = sorted(candidates, key=lambda x: x["match_score"], reverse=True)[:5]
        dupes.extend(top5)
        print(f"  {sp['name'][:40]}: {len(top5)} dupes")
    return dupes

@dlt.resource(name="products", write_disposition="replace")
def products_resource(all_products):
    yield from all_products

@dlt.resource(name="dupes", write_disposition="replace")
def dupes_resource(all_dupes):
    yield from all_dupes

@dlt.source
def dupelab_source(all_products, all_dupes):
    return [products_resource(all_products), dupes_resource(all_dupes)]

def main():
    print("DupeLab Pipeline\n")

    # Step 1: Firecrawl → Sephora
    print("STEP 1: Scraping Sephora")
    sephora_products = []
    if FIRECRAWL_API_KEY:
        for url in SEPHORA_URLS:
            p = scrape_sephora_product(url)
            if p: sephora_products.append(p)
            time.sleep(1)
        print(f"  {len(sephora_products)} Sephora products scraped")
    else:
        print("  No FIRECRAWL_API_KEY set — skipping Sephora scrape")

    # Step 2: Open Beauty Facts
    print("\nSTEP 2: Open Beauty Facts")
    obf_products = fetch_obf_products(max_pages=20)
    print(f"  {len(obf_products)} OBF products loaded")

    all_products = sephora_products + obf_products

    # Step 3: Find dupes
    print("\nSTEP 3: Finding Dupes")
    all_dupes = find_dupes(sephora_products, obf_products) if sephora_products else []
    print(f"  {len(all_dupes)} dupe pairs generated")

    # Step 4: Load to Supabase
    print("\nSTEP 4: Loading to Supabase")
    pipeline = dlt.pipeline(
        pipeline_name="dupelab",
        destination=dlt.destinations.postgres(SUPABASE_DB_URL),
        dataset_name="public",
    )
    info = pipeline.run(dupelab_source(all_products, all_dupes))
    print(f"  Load complete: {info}")
    print(f"\nDone! {len(all_products)} products + {len(all_dupes)} dupes in Supabase.")

if __name__ == "__main__":
    main()
