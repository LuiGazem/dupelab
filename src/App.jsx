import { useState, useRef, useCallback, useEffect } from "react";

// ─── CONFIG: paste your Google Sheets CSV URL here after setup ───────────────
// Instructions in README — replace this with your published sheet URL
const SHEETS_CSV_URL = import.meta.env.VITE_SHEETS_URL || "";

// ─── FALLBACK local data (used if no sheet URL set yet) ──────────────────────
const FALLBACK_DB = [
  { id: "f1", name: "CeraVe Moisturizing Cream", brand: "CeraVe", category: "Moisturizer", price: 16.99, size: "16 oz", pricePerOz: 1.06, ingredients: ["water","glycerin","cetearyl alcohol","caprylic triglyceride","cetyl alcohol","ceramide np","ceramide ap","ceramide eop","carbomer","hyaluronic acid","niacinamide","dimethicone","phenoxyethanol","sodium lauroyl lactylate","cholesterol","sodium hyaluronate","xanthan gum","tocopherol"] },
  { id: "f2", name: "Neutrogena Hydro Boost", brand: "Neutrogena", category: "Moisturizer", price: 19.97, size: "1.7 oz", pricePerOz: 11.75, ingredients: ["water","dimethicone","glycerin","hyaluronic acid","sodium hyaluronate","phenoxyethanol","carbomer","dimethicone crosspolymer","sodium hydroxide","caprylic triglyceride","cetyl alcohol","tocopheryl acetate","disodium edta"] },
  { id: "f3", name: "The Ordinary Hyaluronic Acid 2% + B5", brand: "The Ordinary", category: "Serum", price: 8.90, size: "1 oz", pricePerOz: 8.90, ingredients: ["water","sodium hyaluronate","hyaluronic acid","glycerin","pentylene glycol","sodium hydroxide","panthenol","trisodium ethylenediamine disuccinate","citric acid","phenoxyethanol","ethylhexylglycerin"] },
  { id: "f4", name: "Paula's Choice 2% BHA", brand: "Paula's Choice", category: "Exfoliant", price: 34.00, size: "4 oz", pricePerOz: 8.50, ingredients: ["water","butylene glycol","methylpropanediol","salicylic acid","polysorbate 20","camellia sinensis leaf extract","allantoin","sodium hydroxide","tetrasodium edta"] },
  { id: "f5", name: "Stridex Maximum Strength Pads", brand: "Stridex", category: "Exfoliant", price: 9.99, size: "90 pads", pricePerOz: 0.11, ingredients: ["water","salicylic acid","ammonium xylenesulfonate","ppg-14 butyl ether","hydroxyethylcellulose","citric acid","dmdm hydantoin"] },
  { id: "f6", name: "La Roche-Posay Toleriane Double Repair", brand: "La Roche-Posay", category: "Moisturizer", price: 22.99, size: "2.5 oz", pricePerOz: 9.20, ingredients: ["water","glycerin","niacinamide","ceramide np","ceramide ap","ceramide eop","dimethicone","sodium hyaluronate","hyaluronic acid","caprylic triglyceride","squalane","tocopherol","carbomer","phenoxyethanol","xanthan gum","cetearyl alcohol","cholesterol"] },
  { id: "f7", name: "Pond's Moisturizing Cream", brand: "Pond's", category: "Moisturizer", price: 5.47, size: "13.5 oz", pricePerOz: 0.41, ingredients: ["water","glycerin","mineral oil","dimethicone","cetyl alcohol","stearyl alcohol","niacinamide","petrolatum","sodium hyaluronate","tocopheryl acetate","carbomer","phenoxyethanol","sodium hydroxide","disodium edta","xanthan gum"] },
  { id: "f8", name: "Drunk Elephant C-Firma Fresh Day Serum", brand: "Drunk Elephant", category: "Vitamin C", price: 78.00, size: "1 oz", pricePerOz: 78.00, ingredients: ["water","ascorbic acid","glycerin","isododecane","niacinamide","panthenol","sodium hyaluronate","tocopherol","ferulic acid","citric acid","ethylhexylglycerin","phenoxyethanol"] },
  { id: "f9", name: "The Inkey List Vitamin C Serum", brand: "The Inkey List", category: "Vitamin C", price: 14.99, size: "1 oz", pricePerOz: 14.99, ingredients: ["water","ascorbic acid","glycerin","niacinamide","sodium hyaluronate","tocopherol","ferulic acid","panthenol","citric acid","phenoxyethanol","ethylhexylglycerin"] },
  { id: "f10", name: "Cosrx Snail Mucin 96 Power Essence", brand: "Cosrx", category: "Serum", price: 25.00, size: "3.38 oz", pricePerOz: 7.40, ingredients: ["snail secretion filtrate","water","glycerin","hyaluronic acid","sodium hyaluronate","panthenol","allantoin","arginine","sodium acetylated hyaluronate","beta-glucan","niacinamide","phenoxyethanol","ethylhexylglycerin"] },
  { id: "f11", name: "Hada Labo Gokujyun Premium Lotion", brand: "Hada Labo", category: "Toner", price: 12.50, size: "5.1 oz", pricePerOz: 2.45, ingredients: ["water","glycerin","hyaluronic acid","sodium hyaluronate","sodium hyaluronate crosspolymer","hydroxypropyltrimonium hyaluronate","pentylene glycol","peg-60 hydrogenated castor oil","phenoxyethanol","methylparaben"] },
  { id: "f12", name: "Olay Regenerist Micro-Sculpting Cream", brand: "Olay", category: "Anti-Aging", price: 28.99, size: "1.7 oz", pricePerOz: 17.05, ingredients: ["water","glycerin","niacinamide","panthenol","dimethicone","cyclopentasiloxane","cetyl alcohol","glyceryl stearate","hyaluronic acid","sodium hyaluronate","retinol","tocopheryl acetate","carbomer","phenoxyethanol","sodium hydroxide","disodium edta"] },
  { id: "f13", name: "Klairs Supple Preparation Unscented Toner", brand: "Klairs", category: "Toner", price: 22.00, size: "5.07 oz", pricePerOz: 4.34, ingredients: ["water","glycerin","hyaluronic acid","sodium hyaluronate","niacinamide","panthenol","beta-glucan","centella asiatica extract","allantoin","sodium pca","ceramide np","carbomer","xanthan gum","phenoxyethanol"] },
  { id: "f14", name: "Tarte Shape Tape Concealer", brand: "Tarte", category: "Makeup", price: 29.00, size: "0.338 oz", pricePerOz: 85.80, ingredients: ["water","cyclopentasiloxane","dimethicone","glycerin","niacinamide","titanium dioxide","iron oxides","mica","silica","phenoxyethanol","caprylyl glycol","hexylene glycol","sodium hyaluronate","tocopheryl acetate"] },
  { id: "f15", name: "e.l.f. Camo Concealer", brand: "e.l.f.", category: "Makeup", price: 10.00, size: "0.203 oz", pricePerOz: 49.26, ingredients: ["cyclopentasiloxane","dimethicone","water","glycerin","niacinamide","titanium dioxide","iron oxides","mica","silica","phenoxyethanol","sodium hyaluronate","tocopheryl acetate"] },
];

// ─── CSV PARSER ───────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));

  return lines.slice(1).map((line, idx) => {
    // handle commas inside quotes
    const cols = [];
    let inQuote = false, cur = "";
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim());

    const row = {};
    headers.forEach((h, i) => row[h] = cols[i] || "");

    const ingredientsRaw = row.ingredients || "";
    const ingredients = ingredientsRaw
      .toLowerCase()
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const price = parseFloat(row.price) || 0;
    const sizeOz = parseFloat((row.size || "").replace(/[^0-9.]/g, "")) || 1;
    const pricePerOz = sizeOz > 0 ? parseFloat((price / sizeOz).toFixed(2)) : price;

    return {
      id: `sheet_${idx}`,
      name: row.name || "Unknown",
      brand: row.brand || "Unknown",
      category: row.category || "Other",
      price,
      size: row.size || "",
      pricePerOz,
      ingredients,
    };
  }).filter(p => p.name !== "Unknown" && p.ingredients.length > 2);
}

// ─── MATCHING ─────────────────────────────────────────────────────────────────
function parseIngredients(raw) {
  return raw.toLowerCase().split(/[\n,;]+/).map(s => s.trim().replace(/^\d+\.\s*/, "")).filter(Boolean);
}

function scoreMatch(inputIngredients, productIngredients) {
  const keyIngredients = ["retinol","hyaluronic acid","sodium hyaluronate","niacinamide","ceramide np","ceramide ap","ceramide eop","vitamin c","ascorbic acid","salicylic acid","glycolic acid","kojic acid","arbutin","ferulic acid","squalane","peptide","collagen","centella asiatica","allantoin","panthenol","tocopherol","beta-glucan","snail secretion filtrate","glycerin","dimethicone"];
  let matchCount = 0, keyMatchCount = 0;
  const matchedIngredients = [];
  for (const ingredient of inputIngredients) {
    const found = productIngredients.some(pi => pi.includes(ingredient) || ingredient.includes(pi));
    if (found) {
      matchCount++;
      matchedIngredients.push(ingredient);
      if (keyIngredients.some(k => ingredient.includes(k) || k.includes(ingredient))) keyMatchCount++;
    }
  }
  const baseScore = inputIngredients.length > 0 ? (matchCount / inputIngredients.length) * 100 : 0;
  return { score: Math.min(100, baseScore + keyMatchCount * 5), matchCount, keyMatchCount, matchedIngredients, totalInput: inputIngredients.length };
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --ink: #1a1a2e; --cream: #faf7f2; --warm-white: #fffef9;
    --sage: #7a9e7e; --sage-light: #c8deca;
    --gold: #c9a84c; --gold-light: #f5e6c3;
    --coral: #e07a5f; --coral-light: #fce4dc;
    --steel: #8892a4; --border: #e8e2d9; --card: #ffffff;
    --shadow: 0 1px 3px rgba(26,26,46,0.08), 0 4px 16px rgba(26,26,46,0.06);
    --shadow-lg: 0 8px 32px rgba(26,26,46,0.12);
  }
  body { background: var(--cream); font-family: 'DM Sans', sans-serif; color: var(--ink); }
  .app { min-height: 100vh; }
  .header { background: var(--ink); padding: 20px 32px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
  .header-logo { display: flex; align-items: center; gap: 10px; }
  .logo-icon { width: 36px; height: 36px; background: var(--gold); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
  .logo-text { font-family: 'DM Serif Display', serif; font-size: 20px; color: var(--cream); letter-spacing: -0.3px; }
  .logo-sub { font-size: 11px; color: var(--steel); letter-spacing: 1.5px; text-transform: uppercase; margin-top: 1px; }
  .header-badge { background: rgba(201,168,76,0.15); border: 1px solid rgba(201,168,76,0.3); color: var(--gold); font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; padding: 5px 10px; border-radius: 20px; cursor: default; }
  .db-loading { color: var(--steel); font-size: 11px; }
  .main { max-width: 1100px; margin: 0 auto; padding: 40px 24px 80px; }
  .hero { text-align: center; margin-bottom: 48px; }
  .hero-eyebrow { display: inline-flex; align-items: center; gap: 6px; background: var(--gold-light); color: #8a6a1e; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; padding: 5px 14px; border-radius: 20px; margin-bottom: 16px; }
  .hero h1 { font-family: 'DM Serif Display', serif; font-size: clamp(32px, 5vw, 52px); color: var(--ink); line-height: 1.1; letter-spacing: -1px; margin-bottom: 14px; }
  .hero h1 em { font-style: italic; color: var(--sage); }
  .hero-sub { font-size: 16px; color: var(--steel); max-width: 480px; margin: 0 auto; line-height: 1.6; }
  .step-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  @media (max-width: 640px) { .step-grid { grid-template-columns: 1fr; } }
  .card { background: var(--card); border-radius: 16px; border: 1px solid var(--border); box-shadow: var(--shadow); overflow: hidden; }
  .card-header { padding: 20px 24px 0; display: flex; align-items: center; gap: 10px; }
  .step-num { width: 28px; height: 28px; background: var(--ink); color: var(--cream); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0; }
  .card-title { font-size: 14px; font-weight: 600; color: var(--ink); letter-spacing: -0.2px; }
  .card-body { padding: 16px 24px 24px; }
  .textarea-wrap { position: relative; margin-bottom: 12px; }
  textarea { width: 100%; height: 180px; background: var(--cream); border: 1.5px solid var(--border); border-radius: 12px; padding: 14px 16px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: var(--ink); resize: none; outline: none; transition: border-color 0.2s; line-height: 1.6; }
  textarea:focus { border-color: var(--sage); }
  textarea::placeholder { color: var(--steel); opacity: 0.7; }
  .char-count { position: absolute; bottom: 10px; right: 12px; font-size: 11px; color: var(--steel); opacity: 0.6; }
  .textarea-actions { display: flex; gap: 8px; }
  .btn-ghost { background: none; border: 1.5px solid var(--border); border-radius: 8px; padding: 7px 14px; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500; color: var(--steel); cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 5px; }
  .btn-ghost:hover { background: var(--cream); border-color: var(--steel); color: var(--ink); }
  .upload-zone { border: 2px dashed var(--border); border-radius: 12px; padding: 28px; text-align: center; cursor: pointer; transition: all 0.2s; background: var(--warm-white); }
  .upload-zone:hover, .upload-zone.drag-over { border-color: var(--sage); background: #f0f7f1; }
  .upload-icon { font-size: 28px; margin-bottom: 8px; }
  .upload-label { font-size: 13px; font-weight: 500; color: var(--ink); margin-bottom: 4px; }
  .upload-sub { font-size: 12px; color: var(--steel); }
  .upload-zone input { display: none; }
  .filter-row { display: flex; flex-wrap: wrap; gap: 8px; padding: 16px 24px 24px; }
  .filter-btn { background: none; border: 1.5px solid var(--border); border-radius: 20px; padding: 6px 14px; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500; color: var(--steel); cursor: pointer; transition: all 0.15s; }
  .filter-btn:hover { border-color: var(--sage); color: var(--sage); }
  .filter-btn.active { background: var(--ink); border-color: var(--ink); color: var(--cream); }
  .cta-wrap { text-align: center; margin: 8px 0 40px; }
  .btn-primary { background: var(--ink); color: var(--cream); border: none; border-radius: 12px; padding: 14px 36px; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; letter-spacing: -0.2px; }
  .btn-primary:hover { background: #2d2d4a; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(26,26,46,0.2); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .results-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
  .results-title { font-family: 'DM Serif Display', serif; font-size: 28px; color: var(--ink); letter-spacing: -0.5px; }
  .results-meta { font-size: 13px; color: var(--steel); margin-top: 2px; }
  .sort-select { background: var(--card); border: 1.5px solid var(--border); border-radius: 8px; padding: 7px 12px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: var(--ink); cursor: pointer; outline: none; }
  .results-grid { display: grid; gap: 16px; }
  .result-card { background: var(--card); border-radius: 16px; border: 1.5px solid var(--border); box-shadow: var(--shadow); overflow: hidden; transition: all 0.2s; animation: slideUp 0.3s ease both; }
  .result-card:hover { box-shadow: var(--shadow-lg); transform: translateY(-1px); }
  @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .result-inner { display: grid; grid-template-columns: auto 1fr auto; gap: 20px; padding: 20px 24px; align-items: center; }
  @media (max-width: 600px) { .result-inner { grid-template-columns: 1fr; } }
  .result-emoji { width: 52px; height: 52px; background: var(--cream); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 26px; flex-shrink: 0; border: 1px solid var(--border); overflow: hidden; }
  .result-emoji img { width: 100%; height: 100%; object-fit: cover; }
  .result-name { font-family: 'DM Serif Display', serif; font-size: 17px; color: var(--ink); letter-spacing: -0.2px; margin-bottom: 2px; }
  .result-brand { font-size: 12px; color: var(--steel); font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 8px; }
  .match-bar-wrap { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .match-bar-bg { flex: 1; max-width: 180px; height: 6px; background: var(--border); border-radius: 10px; overflow: hidden; }
  .match-bar-fill { height: 100%; border-radius: 10px; transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
  .match-score-label { font-size: 12px; font-weight: 600; }
  .tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
  .tag { background: var(--cream); border: 1px solid var(--border); border-radius: 6px; padding: 3px 8px; font-size: 11px; color: var(--steel); font-weight: 500; }
  .tag.matched { background: #e8f4ea; border-color: #b8d8bb; color: #3d7a42; font-weight: 600; }
  .result-price-block { text-align: right; flex-shrink: 0; }
  .price-main { font-family: 'DM Serif Display', serif; font-size: 24px; color: var(--ink); letter-spacing: -0.5px; }
  .price-size { font-size: 11px; color: var(--steel); margin-bottom: 6px; }
  .savings-badge { display: inline-flex; align-items: center; gap: 4px; background: #e8f4ea; border: 1px solid #b8d8bb; color: #2e6b33; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 20px; }
  .expensive-badge { display: inline-flex; align-items: center; gap: 4px; background: var(--coral-light); border: 1px solid #f0bdb1; color: #a84b33; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 20px; }
  .result-expand { background: var(--cream); border-top: 1px solid var(--border); padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: background 0.15s; }
  .result-expand:hover { background: #f0ece5; }
  .expand-label { font-size: 12px; font-weight: 500; color: var(--steel); }
  .expand-icon { font-size: 10px; color: var(--steel); transition: transform 0.2s; }
  .expand-icon.open { transform: rotate(180deg); }
  .ingredient-list { padding: 16px 24px 20px; border-top: 1px solid var(--border); background: var(--warm-white); }
  .ingredient-list-title { font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--steel); margin-bottom: 10px; }
  .ingredient-pills { display: flex; flex-wrap: wrap; gap: 5px; }
  .empty-state { text-align: center; padding: 60px 24px; color: var(--steel); }
  .empty-icon { font-size: 40px; margin-bottom: 12px; }
  .empty-title { font-family: 'DM Serif Display', serif; font-size: 22px; color: var(--ink); margin-bottom: 6px; }
  .empty-sub { font-size: 14px; line-height: 1.6; }
  .stats-bar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
  .stat-item { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; text-align: center; }
  .stat-value { font-family: 'DM Serif Display', serif; font-size: 28px; color: var(--ink); letter-spacing: -0.5px; }
  .stat-label { font-size: 11px; color: var(--steel); font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 2px; }
  .back-btn { background: none; border: none; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: var(--steel); cursor: pointer; display: flex; align-items: center; gap: 6px; margin-bottom: 28px; transition: color 0.15s; padding: 0; }
  .back-btn:hover { color: var(--ink); }
  .divider { border: none; border-top: 1px solid var(--border); margin: 0; }
  .db-banner { background: var(--gold-light); border: 1px solid #e0c97a; border-radius: 12px; padding: 12px 20px; margin-bottom: 28px; display: flex; align-items: center; gap: 10px; font-size: 13px; color: #7a5e0f; }
  .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid #e0c97a; border-top-color: #8a6a1e; border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

// ─── RESULT CARD ─────────────────────────────────────────────────────────────
function ResultCard({ product, matchData, referencePrice, index }) {
  const [expanded, setExpanded] = useState(false);
  const score = matchData.score;
  const savingsPct = referencePrice
    ? Math.round(((referencePrice - product.pricePerOz) / referencePrice) * 100)
    : null;
  const barColor = score >= 70 ? "#5aaa60" : score >= 40 ? "#c9a84c" : "#e07a5f";

  const EMOJIS = { Moisturizer:"💧", Serum:"🔬", Toner:"🌿", Exfoliant:"⚗️", Sunscreen:"☀️", Cleanser:"🧼", "Eye Cream":"👁️", Makeup:"🎨", "Anti-Aging":"✨", "Vitamin C":"🍊", Retinol:"💊", Mask:"🧖", "Face Oil":"🫒", Other:"🧴" };

  return (
    <div className="result-card" style={{ animationDelay: `${index * 0.06}s` }}>
      <div className="result-inner">
        <div className="result-emoji">
          {EMOJIS[product.category] || "🧴"}
        </div>
        <div>
          <div className="result-brand">{product.brand}</div>
          <div className="result-name">{product.name}</div>
          <div className="match-bar-wrap">
            <div className="match-bar-bg">
              <div className="match-bar-fill" style={{ width: `${score}%`, background: barColor }} />
            </div>
            <span className="match-score-label" style={{ color: barColor }}>{Math.round(score)}% match</span>
          </div>
          <div className="tags">
            <span className="tag">{product.category}</span>
            <span className="tag">{matchData.matchCount}/{matchData.totalInput} ingredients</span>
            {matchData.keyMatchCount > 0 && <span className="tag matched">⚡ {matchData.keyMatchCount} key actives</span>}
          </div>
        </div>
        <div className="result-price-block">
          <div className="price-main">${product.price.toFixed(2)}</div>
          <div className="price-size">{product.size} · ${product.pricePerOz}/oz</div>
          {savingsPct !== null && savingsPct > 5 ? (
            <span className="savings-badge">↓ {savingsPct}% cheaper/oz</span>
          ) : savingsPct !== null && savingsPct < -5 ? (
            <span className="expensive-badge">↑ {Math.abs(savingsPct)}% pricier/oz</span>
          ) : null}
        </div>
      </div>
      <hr className="divider" />
      <div className="result-expand" onClick={() => setExpanded(e => !e)}>
        <span className="expand-label">
          {expanded ? "Hide" : "Show"} matched ingredients {matchData.matchedIngredients.length > 0 && `(${matchData.matchedIngredients.length})`}
        </span>
        <span className={`expand-icon ${expanded ? "open" : ""}`}>▼</span>
      </div>
      {expanded && (
        <div className="ingredient-list">
          <div className="ingredient-list-title">Full ingredient list</div>
          <div className="ingredient-pills">
            {product.ingredients.map(ing => {
              const isMatch = matchData.matchedIngredients.some(m => ing.includes(m) || m.includes(ing));
              return <span key={ing} className={`tag ${isMatch ? "matched" : ""}`}>{ing}</span>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("input");
  const [ingredientText, setIngredientText] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("match");
  const [results, setResults] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [productDB, setProductDB] = useState(FALLBACK_DB);
  const [dbStatus, setDbStatus] = useState("fallback"); // "fallback" | "loading" | "loaded" | "error"
  const fileInputRef = useRef();

  // ── Load from Google Sheets on mount ──────────────────────────────────────
  useEffect(() => {
    if (!SHEETS_CSV_URL) return;
    setDbStatus("loading");
    fetch(SHEETS_CSV_URL)
      .then(r => r.text())
      .then(text => {
        const parsed = parseCSV(text);
        if (parsed.length > 0) {
          setProductDB(parsed);
          setDbStatus("loaded");
        } else {
          setDbStatus("error");
        }
      })
      .catch(() => setDbStatus("error"));
  }, []);

  const categories = ["All", ...new Set(productDB.map(p => p.category))].sort();

  const handleFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setIngredientText(e.target.result);
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const runSearch = () => {
    const parsed = parseIngredients(ingredientText);
    if (parsed.length === 0) return;
    let pool = productDB;
    if (category !== "All") pool = pool.filter(p => p.category === category);
    const scored = pool.map(product => ({
      product,
      matchData: scoreMatch(parsed, product.ingredients),
    })).filter(r => r.matchData.score > 5);
    const avgPricePerOz = scored.length > 0 ? scored.reduce((s, r) => s + r.product.pricePerOz, 0) / scored.length : null;
    setResults(scored.map(r => ({ ...r, avgPricePerOz })));
    setView("results");
  };

  const sortedResults = [...results].sort((a, b) => {
    if (sortBy === "match") return b.matchData.score - a.matchData.score;
    if (sortBy === "price_asc") return a.product.price - b.product.price;
    if (sortBy === "price_desc") return b.product.price - a.product.price;
    if (sortBy === "savings") return a.product.pricePerOz - b.product.pricePerOz;
    return 0;
  });

  const avgPrice = results.length ? results.reduce((s, r) => s + r.product.pricePerOz, 0) / results.length : 0;
  const cheapestDupe = results.length ? results.reduce((min, r) => r.product.pricePerOz < min.product.pricePerOz ? r : min, results[0]) : null;

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <header className="header">
          <div className="header-logo">
            <div className="logo-icon">🧬</div>
            <div>
              <div className="logo-text">DupeLab</div>
              <div className="logo-sub">Ingredient Intelligence</div>
            </div>
          </div>
          <div>
            {dbStatus === "loading" && <span className="db-loading"><span className="spinner" /> Loading database...</span>}
            {dbStatus !== "loading" && (
              <span className="header-badge">🔬 {productDB.length} products indexed</span>
            )}
          </div>
        </header>

        <main className="main">
          {view === "input" && (
            <>
              <div className="hero">
                <div className="hero-eyebrow">✦ Free ingredient analysis</div>
                <h1>Find your product's<br /><em>cheaper twin</em></h1>
                <p className="hero-sub">Paste or upload any ingredient list and we'll match it against our database — sorted by price and ingredient overlap.</p>
              </div>

              {dbStatus === "error" && (
                <div className="db-banner">⚠️ Couldn't load live database — using local fallback (15 products). Check your VITE_SHEETS_URL.</div>
              )}

              <div className="step-grid">
                <div className="card">
                  <div className="card-header">
                    <div className="step-num">1</div>
                    <div className="card-title">Paste your ingredients</div>
                  </div>
                  <div className="card-body">
                    <div className="textarea-wrap">
                      <textarea
                        placeholder={"Water, Glycerin, Niacinamide, Ceramide NP, Hyaluronic Acid...\n\n(one per line or comma-separated)"}
                        value={ingredientText}
                        onChange={e => setIngredientText(e.target.value)}
                      />
                      <span className="char-count">{parseIngredients(ingredientText).length} ingredients</span>
                    </div>
                    <div className="textarea-actions">
                      <button className="btn-ghost" onClick={() => setIngredientText("")}>✕ Clear</button>
                      <button className="btn-ghost" onClick={() => setIngredientText("Water, Glycerin, Niacinamide, Ceramide NP, Ceramide AP, Ceramide EOP, Hyaluronic Acid, Sodium Hyaluronate, Dimethicone, Cetearyl Alcohol, Caprylic Triglyceride, Cholesterol, Tocopherol, Xanthan Gum, Phenoxyethanol")}>
                        ✦ Load example
                      </button>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <div className="step-num">2</div>
                    <div className="card-title">Or upload a .txt file</div>
                  </div>
                  <div className="card-body">
                    <div
                      className={`upload-zone ${isDragOver ? "drag-over" : ""}`}
                      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="upload-icon">📄</div>
                      <div className="upload-label">Drop a file or click to browse</div>
                      <div className="upload-sub">.txt — ingredients one per line or comma-separated</div>
                      <input ref={fileInputRef} type="file" accept=".txt,.csv" onChange={e => handleFile(e.target.files[0])} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: "32px" }}>
                <div className="card-header">
                  <div className="step-num">3</div>
                  <div className="card-title">Filter by category <span style={{ fontWeight: 400, color: "var(--steel)" }}>(optional)</span></div>
                </div>
                <div className="filter-row">
                  {categories.map(cat => (
                    <button key={cat} className={`filter-btn ${category === cat ? "active" : ""}`} onClick={() => setCategory(cat)}>{cat}</button>
                  ))}
                </div>
              </div>

              <div className="cta-wrap">
                <button className="btn-primary" onClick={runSearch} disabled={parseIngredients(ingredientText).length === 0}>
                  🔬 Find Dupes
                </button>
              </div>
            </>
          )}

          {view === "results" && (
            <>
              <button className="back-btn" onClick={() => setView("input")}>← Back to search</button>
              <div className="stats-bar">
                <div className="stat-item"><div className="stat-value">{results.length}</div><div className="stat-label">Matches found</div></div>
                <div className="stat-item"><div className="stat-value">{cheapestDupe ? `$${cheapestDupe.product.price.toFixed(2)}` : "—"}</div><div className="stat-label">Cheapest dupe</div></div>
                <div className="stat-item"><div className="stat-value">${avgPrice.toFixed(2)}</div><div className="stat-label">Avg price / oz</div></div>
              </div>
              <div className="results-header">
                <div>
                  <div className="results-title">Your dupes</div>
                  <div className="results-meta">{results.length} products · {category !== "All" ? category : "all categories"}</div>
                </div>
                <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="match">Sort: Best match</option>
                  <option value="price_asc">Sort: Price low → high</option>
                  <option value="price_desc">Sort: Price high → low</option>
                  <option value="savings">Sort: Cheapest per oz</option>
                </select>
              </div>
              {sortedResults.length > 0 ? (
                <div className="results-grid">
                  {sortedResults.map((r, i) => (
                    <ResultCard key={r.product.id} product={r.product} matchData={r.matchData} referencePrice={r.avgPricePerOz} index={i} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">🔍</div>
                  <div className="empty-title">No matches found</div>
                  <div className="empty-sub">Try switching to "All" categories or check your ingredient formatting.</div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
