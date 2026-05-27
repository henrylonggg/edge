import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const SEC_USER_AGENT = process.env.SEC_USER_AGENT || "EdgeStockApp/4.0 contact@example.com";
const FINNHUB_BASE = "https://finnhub.io/api/v1";

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());
app.use(morgan("dev"));

const cache = new Map();
const cacheGet = (key, ttlMs) => {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.t > ttlMs) return null;
  return hit.v;
};
const cacheSet = (key, v) => cache.set(key, { t: Date.now(), v });

const safeNum = (v) => {
  if (v === null || v === undefined || v === "" || v === "None") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const pct = (decimal) => decimal == null ? null : decimal * 100;
const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));
const round = (v, d = 2) => v == null || !Number.isFinite(v) ? null : Number(v.toFixed(d));

async function getJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.error || data?.message || data?.raw || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data;
}

async function finnhub(path, params = {}) {
  if (!FINNHUB_API_KEY || FINNHUB_API_KEY.includes("PUT_YOUR")) {
    throw new Error("Missing Finnhub API key. Add FINNHUB_API_KEY to server/.env");
  }
  const url = new URL(`${FINNHUB_BASE}${path}`);
  Object.entries({ ...params, token: FINNHUB_API_KEY }).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  return getJson(url);
}

async function getTickerMap() {
  const key = "sec-ticker-map";
  const cached = cacheGet(key, 24 * 60 * 60 * 1000);
  if (cached) return cached;
  const data = await getJson("https://www.sec.gov/files/company_tickers.json", {
    headers: { "User-Agent": SEC_USER_AGENT, "Accept-Encoding": "gzip, deflate" }
  });
  const map = new Map();
  Object.values(data).forEach((item) => {
    map.set(String(item.ticker).toUpperCase(), String(item.cik_str).padStart(10, "0"));
  });
  cacheSet(key, map);
  return map;
}

async function getCompanyFacts(ticker) {
  try {
    const map = await getTickerMap();
    const cik = map.get(ticker.toUpperCase());
    if (!cik) return null;
    const key = `sec-facts-${cik}`;
    const cached = cacheGet(key, 12 * 60 * 60 * 1000);
    if (cached) return cached;
    const data = await getJson(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, {
      headers: { "User-Agent": SEC_USER_AGENT, "Accept-Encoding": "gzip, deflate" }
    });
    cacheSet(key, data);
    return data;
  } catch (e) {
    console.warn("SEC fallback failed:", e.message);
    return null;
  }
}

function latestFact(facts, tags, unit = "USD", statement = "annual") {
  if (!facts?.facts?.["us-gaap"]) return null;
  for (const tag of tags) {
    const obj = facts.facts["us-gaap"][tag];
    if (!obj?.units) continue;
    const unitKey = obj.units[unit] ? unit : Object.keys(obj.units)[0];
    const arr = obj.units[unitKey] || [];
    const clean = arr
      .filter(x => x.val !== undefined && x.val !== null)
      .filter(x => statement === "any" || ["10-K", "10-Q"].includes(x.form))
      .sort((a, b) => {
        const byEnd = new Date(b.end || 0) - new Date(a.end || 0);
        if (byEnd !== 0) return byEnd;
        return new Date(b.filed || 0) - new Date(a.filed || 0);
      });
    const annual = statement === "annual" ? clean.filter(x => x.form === "10-K") : clean;
    const pick = (annual[0] || clean[0]);
    if (pick) return { value: safeNum(pick.val), tag, end: pick.end, form: pick.form };
  }
  return null;
}

function getFinnMetric(metric, names) {
  for (const name of names) {
    const v = safeNum(metric?.[name]);
    if (v !== null) return { value: v, source: "Finnhub", key: name };
  }
  return null;
}

function deriveMetrics({ quote, finMetric, facts }) {
  const price = safeNum(quote?.c);

  const revenue = latestFact(facts, ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet"]);
  const netIncome = latestFact(facts, ["NetIncomeLoss", "ProfitLoss"]);
  const operatingIncome = latestFact(facts, ["OperatingIncomeLoss"]);
  const equity = latestFact(facts, ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"]);
  const liabilities = latestFact(facts, ["Liabilities"]);
  const currentAssets = latestFact(facts, ["AssetsCurrent"]);
  const currentLiabilities = latestFact(facts, ["LiabilitiesCurrent"]);
  const dilutedShares = latestFact(facts, ["WeightedAverageNumberOfDilutedSharesOutstanding", "WeightedAverageNumberOfSharesOutstandingDiluted"], "shares");

  const out = {};
  const add = (name, raw, calcFn, suffix = "") => {
    if (raw?.value !== null && raw?.value !== undefined) {
      out[name] = { value: round(raw.value), source: raw.source || "SEC", formula: raw.formula || null, suffix, key: raw.key || raw.tag || null };
      return;
    }
    const calc = calcFn?.();
    if (calc?.value !== null && calc?.value !== undefined && Number.isFinite(calc.value)) {
      out[name] = { value: round(calc.value), source: "Calculated from SEC", formula: calc.formula, suffix, key: calc.key || null };
    } else {
      out[name] = { value: null, source: "Unavailable", formula: null, suffix, key: null };
    }
  };

  add("peRatio", getFinnMetric(finMetric, ["peTTM", "peNormalizedAnnual", "peBasicExclExtraTTM", "peExclExtraTTM"]), () => {
    if (!price || !netIncome?.value || !dilutedShares?.value) return null;
    const eps = netIncome.value / dilutedShares.value;
    if (eps <= 0) return null;
    return { value: price / eps, formula: "P/E = Price ÷ (Net Income ÷ Diluted Shares)" };
  }, "x");

  add("roe", getFinnMetric(finMetric, ["roeTTM", "roeRfy", "roeAnnual"]), () => {
    if (!netIncome?.value || !equity?.value) return null;
    return { value: pct(netIncome.value / equity.value), formula: "ROE = Net Income ÷ Shareholders' Equity" };
  }, "%");

  add("debtToEquity", getFinnMetric(finMetric, ["totalDebt/totalEquityAnnual", "totalDebt/totalEquityMRQ", "ltDebt/equityAnnual", "ltDebt/equityMRQ"]), () => {
    if (!liabilities?.value || !equity?.value) return null;
    return { value: liabilities.value / equity.value, formula: "Debt-to-Equity = Total Liabilities ÷ Shareholders' Equity" };
  }, "x");

  add("netMargin", getFinnMetric(finMetric, ["netProfitMarginTTM", "netProfitMarginAnnual", "netMarginTTM"]), () => {
    if (!netIncome?.value || !revenue?.value) return null;
    return { value: pct(netIncome.value / revenue.value), formula: "Net Margin = Net Income ÷ Revenue" };
  }, "%");

  add("operatingMargin", getFinnMetric(finMetric, ["operatingMarginTTM", "operatingMarginAnnual"]), () => {
    if (!operatingIncome?.value || !revenue?.value) return null;
    return { value: pct(operatingIncome.value / revenue.value), formula: "Operating Margin = Operating Income ÷ Revenue" };
  }, "%");

  add("currentRatio", getFinnMetric(finMetric, ["currentRatioAnnual", "currentRatioMRQ"]), () => {
    if (!currentAssets?.value || !currentLiabilities?.value) return null;
    return { value: currentAssets.value / currentLiabilities.value, formula: "Current Ratio = Current Assets ÷ Current Liabilities" };
  }, "x");

  add("beta", getFinnMetric(finMetric, ["beta"]), () => null, "");
  add("revenueGrowth", getFinnMetric(finMetric, ["revenueGrowthTTMYoy", "revenueGrowthQuarterlyYoy", "revenueGrowth3Y"]), () => null, "%");
  add("epsGrowth", getFinnMetric(finMetric, ["epsGrowthTTMYoy", "epsGrowthQuarterlyYoy", "epsGrowth3Y"]), () => null, "%");
  add("grossMargin", getFinnMetric(finMetric, ["grossMarginTTM", "grossMarginAnnual"]), () => null, "%");
  add("psRatio", getFinnMetric(finMetric, ["psTTM", "psAnnual"]), () => null, "x");
  add("pbRatio", getFinnMetric(finMetric, ["pbAnnual", "pbMRQ"]), () => null, "x");
  add("fiftyTwoWeekHigh", getFinnMetric(finMetric, ["52WeekHigh"]), () => null, "");
  add("fiftyTwoWeekLow", getFinnMetric(finMetric, ["52WeekLow"]), () => null, "");
  add("marketCap", getFinnMetric(finMetric, ["marketCapitalization"]), () => null, "M");

  return out;
}

const scoreHigherBetter = (v, anchors) => {
  if (v == null) return null;
  const [bad, ok, good, great] = anchors;
  if (v <= bad) return 20;
  if (v <= ok) return 40 + ((v - bad) / (ok - bad)) * 20;
  if (v <= good) return 60 + ((v - ok) / (good - ok)) * 20;
  if (v <= great) return 80 + ((v - good) / (great - good)) * 15;
  return 95;
};
const scoreLowerBetter = (v, anchors) => {
  if (v == null) return null;
  const [great, good, ok, bad] = anchors;
  if (v <= great) return 95;
  if (v <= good) return 80 + ((good - v) / (good - great)) * 15;
  if (v <= ok) return 60 + ((ok - v) / (ok - good)) * 20;
  if (v <= bad) return 35 + ((bad - v) / (bad - ok)) * 25;
  return 20;
};
function averageAvailable(items) {
  const valid = items.filter(Number.isFinite);
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}
function letterGrade(score) {
  if (score == null) return "N/A";
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 67) return "D+";
  if (score >= 63) return "D";
  if (score >= 60) return "D-";
  return "F";
}

function calculateGrades(metrics, quote, profile) {
  const m = Object.fromEntries(Object.entries(metrics).map(([k, obj]) => [k, obj.value]));
  const price = safeNum(quote?.c);
  const prev = safeNum(quote?.pc);
  const dayReturn = price && prev ? ((price - prev) / prev) * 100 : null;
  const high = m.fiftyTwoWeekHigh;
  const low = m.fiftyTwoWeekLow;
  const fromHigh = price && high ? ((price - high) / high) * 100 : null;
  const fromLow = price && low ? ((price - low) / low) * 100 : null;
  const marketCapM = m.marketCap || safeNum(profile?.marketCapitalization);

  const growth = averageAvailable([
    scoreHigherBetter(m.revenueGrowth, [-5, 5, 15, 30]),
    scoreHigherBetter(m.epsGrowth, [-10, 5, 18, 35])
  ]);
  const profitability = averageAvailable([
    scoreHigherBetter(m.roe, [0, 8, 18, 35]),
    scoreHigherBetter(m.netMargin, [0, 8, 18, 30]),
    scoreHigherBetter(m.operatingMargin, [0, 10, 22, 35]),
    scoreHigherBetter(m.grossMargin, [15, 35, 55, 75])
  ]);
  const financialHealth = averageAvailable([
    scoreLowerBetter(m.debtToEquity, [0.4, 1.0, 2.0, 4.0]),
    scoreHigherBetter(m.currentRatio, [0.6, 1.0, 1.8, 3.0])
  ]);
  // Growth-adjusted valuation: high multiples are less terrible if growth/profitability is strong.
  const growthBonus = ((growth || 50) - 50) * 0.22 + ((profitability || 50) - 50) * 0.18;
  const valuation = clamp(averageAvailable([
    scoreLowerBetter(m.peRatio, [12, 25, 45, 80]),
    scoreLowerBetter(m.psRatio, [2, 6, 12, 25]),
    scoreLowerBetter(m.pbRatio, [2, 6, 12, 25])
  ]) + growthBonus);
  const momentum = averageAvailable([
    dayReturn == null ? null : clamp(55 + dayReturn * 5, 20, 95),
    fromHigh == null ? null : clamp(95 + fromHigh * 1.2, 20, 95),
    fromLow == null ? null : clamp(45 + fromLow * 0.45, 25, 95)
  ]);
  // Reversal is high when down from high but fundamentals are still solid.
  const fundamentalBase = averageAvailable([growth, profitability, financialHealth]) || 50;
  const pullback = fromHigh == null ? null : Math.abs(Math.min(fromHigh, 0));
  const reversal = pullback == null ? null : clamp(35 + pullback * 1.1 + (fundamentalBase - 50) * 0.6 - Math.max((m.debtToEquity || 0) - 2, 0) * 8, 20, 95);

  const weights = { growth: 0.20, profitability: 0.22, financialHealth: 0.16, valuation: 0.17, momentum: 0.12, reversal: 0.13 };
  const weighted = Object.entries({ growth, profitability, financialHealth, valuation, momentum, reversal })
    .filter(([, v]) => Number.isFinite(v));
  const weightSum = weighted.reduce((s, [k]) => s + weights[k], 0);
  const edgeScore = weighted.length ? weighted.reduce((s, [k, v]) => s + v * weights[k], 0) / weightSum : null;

  const beta = m.beta ?? 1;
  let risk = 40;
  if (marketCapM && marketCapM < 2000) risk += 22;
  else if (marketCapM && marketCapM < 10000) risk += 12;
  else if (marketCapM && marketCapM > 200000) risk -= 8;
  risk += Math.max(0, beta - 1) * 18;
  risk += Math.max(0, (m.debtToEquity || 0) - 1.5) * 6;
  risk += profitability != null ? (60 - profitability) * 0.18 : 0;
  risk = clamp(risk, 10, 95);

  return {
    categories: {
      growth: round(growth, 1), profitability: round(profitability, 1), financialHealth: round(financialHealth, 1),
      valuation: round(valuation, 1), momentum: round(momentum, 1), reversal: round(reversal, 1)
    },
    edgeScore: round(edgeScore, 1),
    letter: letterGrade(edgeScore),
    riskScore: round(risk, 1),
    riskLabel: risk < 35 ? "Low" : risk < 58 ? "Medium" : risk < 78 ? "High" : "Very High",
    context: { dayReturn: round(dayReturn, 2), fromHigh: round(fromHigh, 2), fromLow: round(fromLow, 2), marketCapM: round(marketCapM, 0) }
  };
}

const COMPANY_PLAYBOOK = {
  AAPL: "Apple designs and sells iPhones, Macs, iPads, Apple Watches, AirPods, and services like iCloud, Apple Music, Apple TV+, and the App Store. The simple way to think about Apple is hardware plus a giant services ecosystem: people buy the devices, then keep spending money inside Apple’s software and subscription world.",
  MSFT: "Microsoft sells business software, cloud computing, gaming products, and AI tools. Its biggest engines are Microsoft 365, Azure cloud, Windows, LinkedIn, Xbox, and enterprise software. The company makes a lot of recurring money because businesses pay every month or year to keep using its tools.",
  NVDA: "Nvidia designs advanced chips called GPUs that power AI, gaming, data centers, robotics, and high-performance computing. It does not mainly sell normal consumer electronics; its biggest growth driver is selling powerful AI chips and related systems to companies building artificial intelligence products.",
  AMZN: "Amazon runs a massive online marketplace, sells subscriptions through Prime, operates AWS cloud computing, sells ads, and owns businesses like Whole Foods. The retail side is huge, but AWS and advertising are extremely important because they can be much more profitable than shipping packages.",
  GOOGL: "Alphabet is the parent company of Google. It makes most of its money from ads on Google Search, YouTube, and partner websites. It also owns Android, Google Cloud, Gmail, Maps, Chrome, and AI products. Think of it as an internet advertising giant with major cloud and AI businesses.",
  META: "Meta owns Facebook, Instagram, WhatsApp, Messenger, and Threads. Most of its money comes from digital ads shown inside those apps. The company also spends heavily on AI and virtual reality, but the core business is still attention-based advertising across huge social platforms.",
  TSLA: "Tesla makes electric vehicles, batteries, solar products, charging systems, and software features for cars. Investors often value it like a technology and automation company, not just a car company, because of its focus on EV scale, autonomous driving, energy storage, and manufacturing efficiency.",
  AVGO: "Broadcom designs semiconductors and infrastructure software used in networking, broadband, wireless, storage, cybersecurity, and data centers. A simple way to view it is as a behind-the-scenes supplier for chips and software that large tech and telecom systems depend on.",
  AMD: "AMD designs CPUs, GPUs, and data-center chips used in computers, gaming consoles, servers, and AI systems. It competes with companies like Intel and Nvidia by selling high-performance chips for PCs, cloud data centers, and graphics workloads.",
  NFLX: "Netflix is a streaming entertainment company. It makes money from subscriptions and advertising plans, then spends heavily on shows, movies, live events, and global content to keep people watching and paying each month.",
  JPM: "JPMorgan Chase is one of the largest banks in the world. It makes money from consumer banking, credit cards, investment banking, trading, wealth management, and lending. Its business is tied to interest rates, loan demand, market activity, and overall economic strength.",
  COST: "Costco runs membership-based warehouse stores. Customers pay annual membership fees to access low-price bulk goods, groceries, gas, pharmacy items, electronics, and household products. The membership model is important because it creates steady recurring revenue and loyal customers.",
  WMT: "Walmart operates discount stores, grocery stores, warehouse clubs, and online retail. Its business is built around high sales volume, low prices, supply-chain scale, and everyday consumer spending.",
  LLY: "Eli Lilly develops and sells prescription medicines, including diabetes, obesity, cancer, immunology, and neuroscience drugs. Its value depends heavily on drug demand, patent protection, clinical trials, and its ability to keep launching successful treatments.",
  V: "Visa runs a global payments network. It does not usually lend money like a bank; it earns fees when card payments move through its network. That makes Visa more like a toll road for digital payments.",
  MA: "Mastercard runs a global payments network that helps banks, merchants, and customers process card and digital payments. Like Visa, it mainly earns transaction-related fees rather than acting like a traditional lender.",
  XOM: "Exxon Mobil explores for, produces, refines, and sells oil, natural gas, chemicals, and fuel products. Its profits are strongly affected by energy prices, production levels, refining margins, and global demand for oil and gas."
};

function companySummary(profile, symbol) {
  const ticker = String(symbol || "").toUpperCase();
  const name = profile?.name || ticker;
  const industry = profile?.finnhubIndustry || "its industry";
  const exchange = profile?.exchange || "a public exchange";
  const base = COMPANY_PLAYBOOK[ticker];
  if (base) {
    return `${base} ${name} trades on ${exchange}, and Edge grades it by separating the business quality from the stock price so an expensive stock is not automatically called bad and a falling stock is not automatically called broken.`;
  }
  return `${name} operates in the ${industry} industry and trades on ${exchange}. Edge looks at the company like a beginner investor would: what the business does, whether it is profitable, how much debt it carries, whether the stock price looks expensive compared with earnings, and whether the recent trend supports or weakens the setup.`;
}

function evaluationSummary({ profile, grades, metrics }) {
  const name = profile?.name || "This company";
  const c = grades.categories;
  const best = Object.entries(c).filter(([,v]) => v != null).sort((a,b)=>b[1]-a[1])[0];
  const worst = Object.entries(c).filter(([,v]) => v != null).sort((a,b)=>a[1]-b[1])[0];
  const pe = metrics.peRatio.value;
  const roe = metrics.roe.value;
  const de = metrics.debtToEquity.value;
  const risk = grades.riskLabel?.toLowerCase() || "unknown";
  const parts = [];
  parts.push(`${name} gets an Edge Score of ${grades.edgeScore ?? "N/A"}, which equals a ${grades.letter}. Think of that like a school grade for the stock setup, not a promise that the price will go up.`);
  if (best) parts.push(`The strongest part is ${labelCategory(best[0])}. That is the area helping the stock grade the most right now.`);
  if (worst) parts.push(`The weakest part is ${labelCategory(worst[0])}. That is the area you should check before putting real money into it.`);
  if (pe != null) parts.push(`Its P/E ratio is ${pe}x. In simple terms, this shows how much investors are paying for each dollar of profit. Higher can be okay for fast growers, but it means expectations are bigger.`);
  if (roe != null) parts.push(`Its ROE is ${roe}%. That tells you how efficiently the company turns shareholder money into profit.`);
  if (de != null) parts.push(`Its debt-to-equity is ${de}x. Lower usually means the company is less dependent on debt, while higher debt can make the stock riskier if business slows down.`);
  parts.push(`The risk level is ${risk}. For a new investor, the main idea is simple: a strong score can still be risky if the company is expensive, highly volatile, or carrying too much debt.`);
  return parts.join(" ");
}
function labelCategory(k) {
  return ({ growth:"growth", profitability:"profitability", financialHealth:"financial health", valuation:"valuation", momentum:"price momentum", reversal:"pullback opportunity" })[k] || k;
}

function positionSuggestion(investment, grades) {
  const amount = safeNum(investment);
  if (!amount || !grades.edgeScore) return null;
  const score = grades.edgeScore;
  const risk = grades.riskScore || 50;
  let pct = 0;
  if (score >= 90) pct = 16;
  else if (score >= 82) pct = 12;
  else if (score >= 75) pct = 8;
  else if (score >= 68) pct = 5;
  else pct = 2;
  if (risk > 75) pct *= 0.45;
  else if (risk > 60) pct *= 0.65;
  else if (risk < 35) pct *= 1.15;
  pct = clamp(pct, 1, 18);
  return {
    percent: round(pct, 1),
    dollars: round(amount * pct / 100, 2),
    explanation: `Based on the Edge Score and ${grades.riskLabel.toLowerCase()} risk, a reasonable starter position would be about ${round(pct,1)}% of the money you typed in. This keeps you involved without putting too much into one stock.`
  };
}

async function analyzeSymbol(symbol, investment) {
  symbol = symbol.toUpperCase().trim();
  const cacheKey = `analysis-${symbol}`;
  let base = cacheGet(cacheKey, 5 * 60 * 1000);
  if (!base) {
    const [profile, quote, basic, facts] = await Promise.all([
      finnhub("/stock/profile2", { symbol }),
      finnhub("/quote", { symbol }),
      finnhub("/stock/metric", { symbol, metric: "all" }),
      getCompanyFacts(symbol)
    ]);
    const finMetric = basic?.metric || {};
    const metrics = deriveMetrics({ quote, finMetric, facts });
    const grades = calculateGrades(metrics, quote, profile);
    base = {
      symbol,
      profile,
      quote,
      metrics,
      grades,
      companyDescription: companySummary(profile, symbol),
      evaluationSummary: evaluationSummary({ profile, grades, metrics }),
      dataNotes: [
        "Finnhub is used for quote, company profile, and basic financial metrics.",
        "SEC EDGAR is used as a free fallback to calculate missing fundamentals.",
        "Missing metrics are skipped instead of being counted as zero."
      ],
      updatedAt: new Date().toISOString()
    };
    cacheSet(cacheKey, base);
  }
  return { ...base, position: positionSuggestion(investment, base.grades) };
}

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.get("/api/analyze/:symbol", async (req, res) => {
  try {
    const data = await analyzeSymbol(req.params.symbol, req.query.investment);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const TOP_UNIVERSE = ["NVDA","MSFT","AAPL","AMZN","META","GOOGL","AVGO","TSLA","LLY","JPM","V","MA","COST","NFLX","AMD","CRM","ORCL","ADBE","UNH","HD","PG","KO","PEP","WMT","XOM"];
app.get("/api/top-scores", async (req, res) => {
  try {
    const key = "top-scores";
    const cached = cacheGet(key, 10 * 60 * 1000);
    if (cached) return res.json(cached);
    const results = [];
    for (const symbol of TOP_UNIVERSE) {
      try {
        const item = await analyzeSymbol(symbol);
        results.push({
          symbol,
          name: item.profile?.name || symbol,
          score: item.grades.edgeScore,
          letter: item.grades.letter,
          risk: item.grades.riskLabel,
          price: item.quote?.c
        });
      } catch (e) {
        console.warn(`Top score failed for ${symbol}:`, e.message);
      }
    }
    const top = results.filter(x => x.score != null).sort((a,b)=>b.score-a.score).slice(0,10);
    const payload = { top, universe: TOP_UNIVERSE.length, updatedAt: new Date().toISOString() };
    cacheSet(key, payload);
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


function normalizeScore(score) {
  if (score == null || !Number.isFinite(Number(score))) return null;
  const n = Number(score);
  return n <= 10 ? n : n / 10;
}
function score10(score) {
  const n = normalizeScore(score);
  return n == null ? null : round(n, 1);
}
function extractTickers(text, watchlist = [], current = null) {
  const upper = String(text || "").toUpperCase();
  const known = new Set([...(watchlist || []).map(x => x.symbol), current?.symbol].filter(Boolean).map(x => String(x).toUpperCase()));
  const matches = [...upper.matchAll(/\b[A-Z]{1,5}\b/g)].map(m => m[0]);
  const ignored = new Set([
    "IF","IS","A","AN","THE","BUY","SELL","AND","OR","BUT","MORE","THAN","EVEN","STOCK","STOCKS","WHAT","DO","I","IT","TO","IN","OF","FOR","ON","BY","VS","ARE","AM","AI","ETF","ROE","EPS","PE","CEO","CFO","SEC","IPO"
  ]);
  const out = [];
  for (const m of matches) {
    if (ignored.has(m)) continue;
    if (known.has(m) || matches.length <= 10) out.push(m);
  }
  return [...new Set(out)].slice(0, 5);
}
function compactForAI(item) {
  if (!item) return null;
  const g = item.grades || {};
  const m = item.metrics || {};
  const cat = g.categories || {};
  const metric = (obj) => obj?.value == null ? null : `${obj.value}${obj.suffix || ""}`;
  return {
    symbol: item.symbol,
    name: item.profile?.name || item.symbol,
    industry: item.profile?.finnhubIndustry || null,
    price: item.quote?.c ?? null,
    edgeScore: score10(g.edgeScore),
    risk: g.riskLabel || null,
    categories: Object.fromEntries(Object.entries(cat).map(([k,v]) => [k, score10(v)])),
    keyMetrics: {
      peRatio: metric(m.peRatio),
      roe: metric(m.roe),
      debtToEquity: metric(m.debtToEquity),
      netMargin: metric(m.netMargin),
      revenueGrowth: metric(m.revenueGrowth),
      beta: metric(m.beta)
    },
    description: item.companyDescription || null,
    summary: item.evaluationSummary || null
  };
}
async function buildAssistantContext({ question, current, watchlist }) {
  const list = Array.isArray(watchlist) ? watchlist : [];
  const tickers = extractTickers(question, list, current);
  const analyzed = [];
  for (const ticker of tickers) {
    try {
      const item = await analyzeSymbol(ticker);
      analyzed.push(compactForAI(item));
    } catch (e) {
      analyzed.push({ symbol: ticker, error: e.message });
    }
  }
  const watchSummary = list
    .filter(x => x && x.symbol)
    .slice(0, 30)
    .map(x => ({
      symbol: x.symbol,
      name: x.name,
      edgeScore: score10(x.score),
      risk: x.risk,
      price: x.price
    }))
    .sort((a,b)=>(b.edgeScore || 0)-(a.edgeScore || 0));
  return {
    analyzedTickers: analyzed,
    currentStock: compactForAI(current),
    watchlist: watchSummary,
    scoreScale: "Edge scores run from 0.0 to 10.0. Under 5.5 is weak/red, 5.5 to 7.4 is moderate/yellow, and 7.5 or higher is strong/green."
  };
}
async function askOpenAI({ question, context }) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes("PUT_YOUR")) {
    throw new Error("Missing OPENAI_API_KEY. Add it to server/.env to enable the real Edge AI Assistant.");
  }
  const body = {
    model: OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `You are Edge Assistant, a beginner-friendly stock investing education assistant inside a web app. Answer only stock-market, investing, company-analysis, valuation, portfolio construction, risk, and metric-definition questions. If the user asks something unrelated, briefly redirect back to investing. Explain things like the user is 16 and new to investing: clear, practical, simple language. Do not promise returns. Do not give personalized financial advice or tell the user they must buy/sell. Use words like "could", "usually", "risk", "consider", and "educational only". When comparing stocks, use the Edge Score, risk level, metrics, and watchlist context if provided. Keep answers concise but useful. End with one clear takeaway.`
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Question: ${question}\n\nEdge context JSON:\n${JSON.stringify(context, null, 2)}`
          }
        ]
      }
    ],
    temperature: 0.35,
    max_output_tokens: 700
  };
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || data?.raw || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  if (data.output_text) return data.output_text.trim();
  const pieces = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.text) pieces.push(content.text);
    }
  }
  return pieces.join("\n").trim() || "I could not create a response.";
}

app.post("/api/assistant", async (req, res) => {
  try {
    const question = String(req.body?.question || "").trim();
    if (!question) return res.status(400).json({ error: "Ask a stock-related question first." });
    const context = await buildAssistantContext(req.body || {});
    const answer = await askOpenAI({ question, context });
    res.json({ answer, model: OPENAI_MODEL, contextUsed: context.analyzedTickers.map(x => x.symbol).filter(Boolean) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/advisor", async (req, res) => {
  try {
    const question = String(req.body?.question || "").trim();
    const context = await buildAssistantContext(req.body || {});
    const answer = await askOpenAI({ question, context });
    res.json({ answer, model: OPENAI_MODEL });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`Edge server running on http://localhost:${PORT}`));
