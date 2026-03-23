import { useState, useRef, useCallback, useEffect } from "react";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const FALLBACK_DB = [
  { id:"f1", name:"CeraVe Moisturizing Cream", brand:"CeraVe", category:"Moisturizer", price:16.99, size:"16 oz", price_per_oz:1.06, ingredients:["water","glycerin","ceramide np","ceramide ap","ceramide eop","hyaluronic acid","niacinamide","dimethicone","phenoxyethanol","sodium hyaluronate","xanthan gum","tocopherol","cholesterol"] },
  { id:"f2", name:"Neutrogena Hydro Boost", brand:"Neutrogena", category:"Moisturizer", price:19.97, size:"1.7 oz", price_per_oz:11.75, ingredients:["water","dimethicone","glycerin","hyaluronic acid","sodium hyaluronate","phenoxyethanol","carbomer","cetyl alcohol","tocopheryl acetate"] },
  { id:"f3", name:"The Ordinary Hyaluronic Acid 2%", brand:"The Ordinary", category:"Serum", price:8.90, size:"1 oz", price_per_oz:8.90, ingredients:["water","sodium hyaluronate","hyaluronic acid","glycerin","pentylene glycol","panthenol","citric acid","phenoxyethanol"] },
  { id:"f4", name:"Paula's Choice 2% BHA", brand:"Paula's Choice", category:"Exfoliant", price:34.00, size:"4 oz", price_per_oz:8.50, ingredients:["water","butylene glycol","salicylic acid","polysorbate 20","allantoin","sodium hydroxide"] },
  { id:"f5", name:"Stridex Maximum Strength", brand:"Stridex", category:"Exfoliant", price:9.99, size:"90 pads", price_per_oz:0.11, ingredients:["water","salicylic acid","ammonium xylenesulfonate","hydroxyethylcellulose","citric acid"] },
];

async function fetchProducts(category) {
  if (!SUPABASE_URL || !SUPABASE_ANON) return null;
  const headers = { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${SUPABASE_ANON}` };
  const PAGE = 1000;
  let all = [], offset = 0;
  while (true) {
    let url = `${SUPABASE_URL}/rest/v1/products?select=*&limit=${PAGE}&offset=${offset}`;
    if (category && category !== "All") url += `&category=eq.${encodeURIComponent(category)}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`${res.status}`);
    const page = await res.json();
    if (!page.length) break;
    all = all.concat(page);
    if (page.length < PAGE) break;
    offset += PAGE;
  }
  return all.map(p => ({
    ...p,
    price_per_oz: p.price_per_oz || 0,
    ingredients: typeof p.ingredients === "string"
      ? JSON.parse(p.ingredients)
      : (p.ingredients || []),
  }));
}

function parseIngredients(raw) {
  return raw.toLowerCase().split(/[\n,;]+/).map(s => s.trim().replace(/^\d+\.\s*/,"")).filter(Boolean);
}

function scoreMatch(input, product) {
  const keys = ["retinol","hyaluronic acid","sodium hyaluronate","niacinamide","ceramide","vitamin c","ascorbic acid","salicylic acid","ferulic acid","squalane","peptide","allantoin","panthenol","tocopherol","beta-glucan","glycerin","dimethicone"];
  let match = 0, key = 0, matched = [];
  for (const ing of input) {
    if (product.some(pi => pi.includes(ing) || ing.includes(pi))) {
      match++; matched.push(ing);
      if (keys.some(k => ing.includes(k) || k.includes(ing))) key++;
    }
  }
  return { score: Math.min(100, (input.length ? (match/input.length)*100 : 0) + key*5), matchCount: match, keyMatchCount: key, matchedIngredients: matched, totalInput: input.length };
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  :root{--ink:#1a1a2e;--cream:#faf7f2;--warm:#fffef9;--sage:#7a9e7e;--gold:#c9a84c;--gold-light:#f5e6c3;--coral-light:#fce4dc;--steel:#8892a4;--border:#e8e2d9;--card:#fff;--shadow:0 1px 3px rgba(26,26,46,.08),0 4px 16px rgba(26,26,46,.06);--shadow-lg:0 8px 32px rgba(26,26,46,.12)}
  body{background:var(--cream);font-family:'DM Sans',sans-serif;color:var(--ink)}
  .app{min-height:100vh}
  .header{background:var(--ink);padding:20px 32px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
  .header-logo{display:flex;align-items:center;gap:10px}
  .logo-icon{width:36px;height:36px;background:var(--gold);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px}
  .logo-text{font-family:'DM Serif Display',serif;font-size:20px;color:var(--cream)}
  .logo-sub{font-size:11px;color:var(--steel);letter-spacing:1.5px;text-transform:uppercase;margin-top:1px}
  .badge{background:rgba(201,168,76,.15);border:1px solid rgba(201,168,76,.3);color:var(--gold);font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;padding:5px 10px;border-radius:20px}
  .badge.live{background:rgba(90,170,96,.15);border-color:rgba(90,170,96,.3);color:#5aaa60}
  .main{max-width:1100px;margin:0 auto;padding:40px 24px 80px}
  .hero{text-align:center;margin-bottom:48px}
  .eyebrow{display:inline-flex;align-items:center;gap:6px;background:var(--gold-light);color:#8a6a1e;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;padding:5px 14px;border-radius:20px;margin-bottom:16px}
  .hero h1{font-family:'DM Serif Display',serif;font-size:clamp(32px,5vw,52px);color:var(--ink);line-height:1.1;letter-spacing:-1px;margin-bottom:14px}
  .hero h1 em{font-style:italic;color:var(--sage)}
  .hero-sub{font-size:16px;color:var(--steel);max-width:480px;margin:0 auto;line-height:1.6}
  .step-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px}
  @media(max-width:640px){.step-grid{grid-template-columns:1fr}}
  .card{background:var(--card);border-radius:16px;border:1px solid var(--border);box-shadow:var(--shadow);overflow:hidden}
  .card-header{padding:20px 24px 0;display:flex;align-items:center;gap:10px}
  .step-num{width:28px;height:28px;background:var(--ink);color:var(--cream);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0}
  .card-title{font-size:14px;font-weight:600;color:var(--ink)}
  .card-body{padding:16px 24px 24px}
  .textarea-wrap{position:relative;margin-bottom:12px}
  textarea{width:100%;height:180px;background:var(--cream);border:1.5px solid var(--border);border-radius:12px;padding:14px 16px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--ink);resize:none;outline:none;transition:border-color .2s;line-height:1.6}
  textarea:focus{border-color:var(--sage)}
  textarea::placeholder{color:var(--steel);opacity:.7}
  .char-count{position:absolute;bottom:10px;right:12px;font-size:11px;color:var(--steel);opacity:.6}
  .row{display:flex;gap:8px}
  .btn-ghost{background:none;border:1.5px solid var(--border);border-radius:8px;padding:7px 14px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;color:var(--steel);cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:5px}
  .btn-ghost:hover{background:var(--cream);border-color:var(--steel);color:var(--ink)}
  .upload-zone{border:2px dashed var(--border);border-radius:12px;padding:28px;text-align:center;cursor:pointer;transition:all .2s;background:var(--warm)}
  .upload-zone:hover,.upload-zone.drag{border-color:var(--sage);background:#f0f7f1}
  .upload-icon{font-size:28px;margin-bottom:8px}
  .upload-label{font-size:13px;font-weight:500;color:var(--ink);margin-bottom:4px}
  .upload-sub{font-size:12px;color:var(--steel)}
  .upload-zone input{display:none}
  .filter-row{display:flex;flex-wrap:wrap;gap:8px;padding:16px 24px 24px}
  .filter-btn{background:none;border:1.5px solid var(--border);border-radius:20px;padding:6px 14px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;color:var(--steel);cursor:pointer;transition:all .15s}
  .filter-btn:hover{border-color:var(--sage);color:var(--sage)}
  .filter-btn.active{background:var(--ink);border-color:var(--ink);color:var(--cream)}
  .cta-wrap{text-align:center;margin:8px 0 40px}
  .btn-primary{background:var(--ink);color:var(--cream);border:none;border-radius:12px;padding:14px 36px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:8px}
  .btn-primary:hover{background:#2d2d4a;transform:translateY(-1px);box-shadow:0 6px 20px rgba(26,26,46,.2)}
  .btn-primary:disabled{opacity:.4;cursor:not-allowed;transform:none}
  .results-header{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px}
  .results-title{font-family:'DM Serif Display',serif;font-size:28px;color:var(--ink);letter-spacing:-.5px}
  .results-meta{font-size:13px;color:var(--steel);margin-top:2px}
  .sort-select{background:var(--card);border:1.5px solid var(--border);border-radius:8px;padding:7px 12px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--ink);cursor:pointer;outline:none}
  .results-grid{display:grid;gap:16px}
  .result-card{background:var(--card);border-radius:16px;border:1.5px solid var(--border);box-shadow:var(--shadow);overflow:hidden;transition:all .2s;animation:slideUp .3s ease both}
  .result-card:hover{box-shadow:var(--shadow-lg);transform:translateY(-1px)}
  @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  .result-inner{display:grid;grid-template-columns:auto 1fr auto;gap:20px;padding:20px 24px;align-items:center}
  @media(max-width:600px){.result-inner{grid-template-columns:1fr}}
  .result-emoji{width:52px;height:52px;background:var(--cream);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;border:1px solid var(--border)}
  .result-name{font-family:'DM Serif Display',serif;font-size:17px;color:var(--ink);margin-bottom:2px}
  .result-brand{font-size:12px;color:var(--steel);font-weight:500;letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px}
  .bar-wrap{display:flex;align-items:center;gap:8px;margin-bottom:8px}
  .bar-bg{flex:1;max-width:180px;height:6px;background:var(--border);border-radius:10px;overflow:hidden}
  .bar-fill{height:100%;border-radius:10px;transition:width .6s cubic-bezier(.34,1.56,.64,1)}
  .score-label{font-size:12px;font-weight:600}
  .tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
  .tag{background:var(--cream);border:1px solid var(--border);border-radius:6px;padding:3px 8px;font-size:11px;color:var(--steel);font-weight:500}
  .tag.matched{background:#e8f4ea;border-color:#b8d8bb;color:#3d7a42;font-weight:600}
  .price-block{text-align:right;flex-shrink:0}
  .price-main{font-family:'DM Serif Display',serif;font-size:24px;color:var(--ink);letter-spacing:-.5px}
  .price-size{font-size:11px;color:var(--steel);margin-bottom:6px}
  .save-badge{display:inline-flex;align-items:center;gap:4px;background:#e8f4ea;border:1px solid #b8d8bb;color:#2e6b33;font-size:12px;font-weight:600;padding:4px 10px;border-radius:20px}
  .exp-badge{display:inline-flex;align-items:center;gap:4px;background:var(--coral-light);border:1px solid #f0bdb1;color:#a84b33;font-size:12px;font-weight:600;padding:4px 10px;border-radius:20px}
  .expand-row{background:var(--cream);border-top:1px solid var(--border);padding:14px 24px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;transition:background .15s}
  .expand-row:hover{background:#f0ece5}
  .expand-label{font-size:12px;font-weight:500;color:var(--steel)}
  .expand-icon{font-size:10px;color:var(--steel);transition:transform .2s}
  .expand-icon.open{transform:rotate(180deg)}
  .ing-list{padding:16px 24px 20px;border-top:1px solid var(--border);background:var(--warm)}
  .ing-title{font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--steel);margin-bottom:10px}
  .ing-pills{display:flex;flex-wrap:wrap;gap:5px}
  .empty-state{text-align:center;padding:60px 24px;color:var(--steel)}
  .empty-icon{font-size:40px;margin-bottom:12px}
  .empty-title{font-family:'DM Serif Display',serif;font-size:22px;color:var(--ink);margin-bottom:6px}
  .empty-sub{font-size:14px;line-height:1.6}
  .stats-bar{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px}
  .stat-item{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 20px;text-align:center}
  .stat-value{font-family:'DM Serif Display',serif;font-size:28px;color:var(--ink)}
  .stat-label{font-size:11px;color:var(--steel);font-weight:500;letter-spacing:.5px;text-transform:uppercase;margin-top:2px}
  .back-btn{background:none;border:none;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;color:var(--steel);cursor:pointer;display:flex;align-items:center;gap:6px;margin-bottom:28px;transition:color .15s;padding:0}
  .back-btn:hover{color:var(--ink)}
  .divider{border:none;border-top:1px solid var(--border);margin:0}
  .spinner{display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}
  .spinner.dark{border-color:rgba(201,168,76,.3);border-top-color:var(--gold)}
  @keyframes spin{to{transform:rotate(360deg)}}
`;

const EMOJIS = {Moisturizer:"💧",Serum:"🔬",Toner:"🌿",Exfoliant:"⚗️",Sunscreen:"☀️",Cleanser:"🧼","Eye Cream":"👁️",Makeup:"🎨","Anti-Aging":"✨","Vitamin C":"🍊",Retinol:"💊",Mask:"🧖","Face Oil":"🫒",Other:"🧴"};

function ResultCard({ product, matchData, referencePrice, index }) {
  const [expanded, setExpanded] = useState(false);
  const score = matchData.score;
  const ppo = product.price_per_oz || 0;
  const savingsPct = referencePrice ? Math.round(((referencePrice - ppo) / referencePrice) * 100) : null;
  const barColor = score >= 70 ? "#5aaa60" : score >= 40 ? "#c9a84c" : "#e07a5f";
  return (
    <div className="result-card" style={{animationDelay:`${index*.06}s`}}>
      <div className="result-inner">
        <div className="result-emoji">{EMOJIS[product.category]||"🧴"}</div>
        <div>
          <div className="result-brand">{product.brand}</div>
          <div className="result-name">{product.name}</div>
          <div className="bar-wrap">
            <div className="bar-bg"><div className="bar-fill" style={{width:`${score}%`,background:barColor}}/></div>
            <span className="score-label" style={{color:barColor}}>{Math.round(score)}% match</span>
          </div>
          <div className="tags">
            <span className="tag">{product.category}</span>
            <span className="tag">{matchData.matchCount}/{matchData.totalInput} ingredients</span>
            {matchData.keyMatchCount > 0 && <span className="tag matched">⚡ {matchData.keyMatchCount} key actives</span>}
          </div>
        </div>
        <div className="price-block">
          <div className="price-main">${(product.price||0).toFixed(2)}</div>
          <div className="price-size">{product.size} · ${ppo.toFixed(2)}/oz</div>
          {savingsPct > 5 ? <span className="save-badge">↓ {savingsPct}% cheaper/oz</span>
           : savingsPct < -5 ? <span className="exp-badge">↑ {Math.abs(savingsPct)}% pricier/oz</span> : null}
        </div>
      </div>
      <hr className="divider"/>
      <div className="expand-row" onClick={()=>setExpanded(e=>!e)}>
        <span className="expand-label">{expanded?"Hide":"Show"} matched ingredients {matchData.matchedIngredients.length>0&&`(${matchData.matchedIngredients.length})`}</span>
        <span className={`expand-icon ${expanded?"open":""}`}>▼</span>
      </div>
      {expanded && (
        <div className="ing-list">
          <div className="ing-title">Full ingredient list</div>
          <div className="ing-pills">
            {(product.ingredients||[]).map(ing=>{
              const isMatch = matchData.matchedIngredients.some(m=>ing.includes(m)||m.includes(ing));
              return <span key={ing} className={`tag ${isMatch?"matched":""}`}>{ing}</span>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("input");
  const [ingredientText, setIngredientText] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("match");
  const [results, setResults] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dbStatus, setDbStatus] = useState("checking");
  const [dbCount, setDbCount] = useState(0);
  const [categories, setCategories] = useState(["All","Moisturizer","Serum","Toner","Exfoliant","Sunscreen","Cleanser","Eye Cream","Makeup","Anti-Aging","Vitamin C","Retinol","Mask","Face Oil","Other"]);
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON) { setDbStatus("fallback"); return; }
    fetch(`${SUPABASE_URL}/rest/v1/products?select=_dlt_id&limit=1`, {
      headers:{
        "apikey": SUPABASE_ANON,
        "Authorization": `Bearer ${SUPABASE_ANON}`,
        "Prefer": "count=exact",
      },
    })
    .then(r => {
      const range = r.headers.get("content-range"); // e.g. "0-0/14182"
      const total = range ? parseInt(range.split("/")[1]) : 0;
      setDbCount(total);
      setDbStatus("live");
    })
    .catch(()=>setDbStatus("fallback"));
  },[]);

  const handleFile = useCallback((file)=>{
    if (!file) return;
    const r = new FileReader();
    r.onload = e => setIngredientText(e.target.result);
    r.readAsText(file);
  },[]);

  const runSearch = async () => {
    const parsed = parseIngredients(ingredientText);
    if (!parsed.length) return;
    setIsSearching(true);
    try {
      let pool;
      if (dbStatus === "live") {
        pool = await fetchProducts(category);
      } else {
        pool = category !== "All" ? FALLBACK_DB.filter(p=>p.category===category) : FALLBACK_DB;
      }
      const scored = pool.map(product=>({
        product,
        matchData: scoreMatch(parsed, product.ingredients||[]),
      })).filter(r=>r.matchData.score>5);
      const avg = scored.length ? scored.reduce((s,r)=>s+(r.product.price_per_oz||0),0)/scored.length : null;
      setResults(scored.map(r=>({...r,avgPricePerOz:avg})));
      setView("results");
    } catch(e) { console.error(e); }
    finally { setIsSearching(false); }
  };

  const sorted = [...results].sort((a,b)=>{
    if (sortBy==="match") return b.matchData.score-a.matchData.score;
    if (sortBy==="price_asc") return (a.product.price||0)-(b.product.price||0);
    if (sortBy==="price_desc") return (b.product.price||0)-(a.product.price||0);
    if (sortBy==="savings") return (a.product.price_per_oz||0)-(b.product.price_per_oz||0);
    return 0;
  });

  const avgPrice = results.length ? results.reduce((s,r)=>s+(r.product.price_per_oz||0),0)/results.length : 0;
  const cheapest = results.length ? results.reduce((m,r)=>(r.product.price_per_oz||0)<(m.product.price_per_oz||0)?r:m,results[0]) : null;

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
          {dbStatus==="checking" && <span className="badge"><span className="spinner dark"/> Connecting...</span>}
          {dbStatus==="live" && <span className="badge live">🟢 {dbCount} products live</span>}
          {dbStatus==="fallback" && <span className="badge">🔬 {FALLBACK_DB.length} products indexed</span>}
        </header>

        <main className="main">
          {view==="input" && <>
            <div className="hero">
              <div className="eyebrow">✦ Free ingredient analysis</div>
              <h1>Find your product's<br/><em>cheaper twin</em></h1>
              <p className="hero-sub">Paste or upload any ingredient list and we'll match it against our database — sorted by price and ingredient overlap.</p>
            </div>

            <div className="step-grid">
              <div className="card">
                <div className="card-header"><div className="step-num">1</div><div className="card-title">Paste your ingredients</div></div>
                <div className="card-body">
                  <div className="textarea-wrap">
                    <textarea placeholder={"Water, Glycerin, Niacinamide, Ceramide NP, Hyaluronic Acid...\n\n(one per line or comma-separated)"} value={ingredientText} onChange={e=>setIngredientText(e.target.value)}/>
                    <span className="char-count">{parseIngredients(ingredientText).length} ingredients</span>
                  </div>
                  <div className="row">
                    <button className="btn-ghost" onClick={()=>setIngredientText("")}>✕ Clear</button>
                    <button className="btn-ghost" onClick={()=>setIngredientText("Water, Glycerin, Niacinamide, Ceramide NP, Ceramide AP, Ceramide EOP, Hyaluronic Acid, Sodium Hyaluronate, Dimethicone, Cetearyl Alcohol, Caprylic Triglyceride, Cholesterol, Tocopherol, Xanthan Gum, Phenoxyethanol")}>✦ Load example</button>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><div className="step-num">2</div><div className="card-title">Or upload a .txt file</div></div>
                <div className="card-body">
                  <div className={`upload-zone ${isDragOver?"drag":""}`}
                    onDragOver={e=>{e.preventDefault();setIsDragOver(true)}}
                    onDragLeave={()=>setIsDragOver(false)}
                    onDrop={e=>{e.preventDefault();setIsDragOver(false);handleFile(e.dataTransfer.files[0])}}
                    onClick={()=>fileInputRef.current?.click()}>
                    <div className="upload-icon">📄</div>
                    <div className="upload-label">Drop a file or click to browse</div>
                    <div className="upload-sub">.txt — ingredients one per line or comma-separated</div>
                    <input ref={fileInputRef} type="file" accept=".txt,.csv" onChange={e=>handleFile(e.target.files[0])}/>
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{marginBottom:"32px"}}>
              <div className="card-header"><div className="step-num">3</div><div className="card-title">Filter by category <span style={{fontWeight:400,color:"var(--steel)"}}>(optional)</span></div></div>
              <div className="filter-row">
                {categories.map(cat=>(
                  <button key={cat} className={`filter-btn ${category===cat?"active":""}`} onClick={()=>setCategory(cat)}>{cat}</button>
                ))}
              </div>
            </div>

            <div className="cta-wrap">
              <button className="btn-primary" onClick={runSearch} disabled={!parseIngredients(ingredientText).length||isSearching}>
                {isSearching ? <><span className="spinner"/> Searching...</> : "🔬 Find Dupes"}
              </button>
            </div>
          </>}

          {view==="results" && <>
            <button className="back-btn" onClick={()=>setView("input")}>← Back to search</button>
            <div className="stats-bar">
              <div className="stat-item"><div className="stat-value">{results.length}</div><div className="stat-label">Matches found</div></div>
              <div className="stat-item"><div className="stat-value">{cheapest?`$${(cheapest.product.price||0).toFixed(2)}`:"—"}</div><div className="stat-label">Cheapest dupe</div></div>
              <div className="stat-item"><div className="stat-value">${avgPrice.toFixed(2)}</div><div className="stat-label">Avg price / oz</div></div>
            </div>
            <div className="results-header">
              <div>
                <div className="results-title">Your dupes</div>
                <div className="results-meta">{results.length} products · {category!=="All"?category:"all categories"}</div>
              </div>
              <select className="sort-select" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
                <option value="match">Sort: Best match</option>
                <option value="price_asc">Sort: Price low → high</option>
                <option value="price_desc">Sort: Price high → low</option>
                <option value="savings">Sort: Cheapest per oz</option>
              </select>
            </div>
            {sorted.length > 0
              ? <div className="results-grid">{sorted.map((r,i)=><ResultCard key={r.product._dlt_id||i} product={r.product} matchData={r.matchData} referencePrice={r.avgPricePerOz} index={i}/>)}</div>
              : <div className="empty-state"><div className="empty-icon">🔍</div><div className="empty-title">No matches found</div><div className="empty-sub">Try "All" categories or check your ingredient formatting.</div></div>
            }
          </>}
        </main>
      </div>
    </>
  );
}
