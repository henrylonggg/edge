// Eval update: FMP 6000 stock ticker lookup route.
// Eval update: AI assistant expanded as support agent.
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { buildStockAnalysis } from "./score.js";

dotenv.config();

const EVAL_FAQ_KNOWLEDGE = "Eval FAQ knowledge base summary:\n- Eval is a stock-evaluation dashboard, not financial advice.\n- Users search tickers, use Ticker Lookup, save Watchlist stocks, compare 2-5 watchlist stocks, read industry rankings, and ask Eval AI support questions.\n- Ticker Lookup uses the StockAnalysis.com stocks table cached by the backend. It lets users type company names, see tickers on the right, and click a ticker to load the Analyze dashboard.\n- Eval Score is 0.0-10.0 and blends Growth, Profitability, Financial Health, Valuation, Momentum, Pullback, and News Sentiment.\n- Green/yellow/red indicate stronger/mixed/weaker score ranges. Score numbers are educational and not buy/sell/hold recommendations.\n- Metric cards are bar charts from 0-10. Popups/question marks explain category inputs and can be closed with the X button.\n- Price, Momentum, and Pullback use Massive and cache about 1 day.\n- Growth, Profitability, and Financial Health use light FMP/Finnhub fallback and cache about 4 months.\n- Valuation caches about 1 month.\n- Risk and News Sentiment cache about 7 days.\n- Finnhub is used for profile/news and fallback metrics. FMP is used lightly for fundamentals. Massive is used for market data. StockAnalysis.com is used for ticker lookup. OpenAI summarizes/explains support and news.\n- If providers fail, Eval should use fallback providers, cached categories, or the last valid report instead of scoring missing metrics as zero.\n- Watchlist stores saved tickers and powers Compare and stock-specific Eval AI questions.\n- Compare requires 2-5 watchlist stocks and includes clickable radar labels to hide/show tickers.\n- Industry pages show Top 5 peers and use the same cached analysis for each stock. Industry radar labels are clickable.\n- Eval AI should answer all FAQ-style questions about app navigation, dashboard sections, dropdown menu, ticker lookup, score rings, metrics, caching, data sources, watchlist, compare, industry rankings, news sentiment, troubleshooting, profile/sign-in basics, terms/contact/support, and loaded/watchlist stocks.\n- Eval AI should not answer unrelated questions outside Eval. Stock-specific questions require the ticker to be loaded on dashboard or saved in watchlist.";

const app = express();
const PORT = process.env.PORT || 5050;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://getstockeval.com",
  "https://www.getstockeval.com",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Allow Vercel preview deployments.
      if (/^https:\/\/.*\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      return callback(null, true);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const DAY_MS = 24 * 60 * 60 * 1000;
const COMPONENT_TTLS_MS = {
  fundamentals: 120 * DAY_MS, // growth, profitability, financial health: about 4 months
  valuation: 30 * DAY_MS, // valuation: about 1 month
  market: 1 * DAY_MS, // price, momentum, pullback: 1 day
  news: 7 * DAY_MS, // news sentiment: 7 days
  risk: 7 * DAY_MS, // risk label: 7 days
  profile: 120 * DAY_MS,
};
const REPORT_CACHE_TTL_MS = Math.min(
  COMPONENT_TTLS_MS.fundamentals,
  COMPONENT_TTLS_MS.valuation,
  COMPONENT_TTLS_MS.market,
  COMPONENT_TTLS_MS.news,
  COMPONENT_TTLS_MS.risk
);
const analysisCache = new Map();
const lastValidAnalysisCache = new Map();
const industryCache = new Map();
const tickerLookupCache = { savedAt: 0, data: [] };
const TICKER_LOOKUP_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for StockAnalysis.com stocks table

const INDUSTRY_UNIVERSES = {
  Technology: ["AAPL", "MSFT", "ORCL", "CRM", "ADBE", "NOW", "INTU", "IBM", "SHOP", "SNOW", "DDOG", "PLTR"],
  Software: ["MSFT", "ORCL", "CRM", "ADBE", "NOW", "INTU", "SNOW", "DDOG", "PLTR", "TEAM", "MDB", "NET"],
  Semiconductors: ["NVDA", "AVGO", "AMD", "INTC", "QCOM", "TXN", "MU", "ADI", "MRVL", "NXPI", "MCHP", "ON", "LRCX", "KLAC", "AMAT"],
  "Consumer Electronics": ["AAPL", "SONY", "DELL", "HPQ", "LOGI", "GRMN"],
  "Internet Content & Information": ["GOOGL", "META", "NFLX", "SPOT", "PINS", "RDDT", "SNAP", "MTCH", "BIDU"],
  "Communication Services": ["TMUS", "VZ", "T", "CMCSA", "CHTR", "LUMN"],
  Entertainment: ["NFLX", "DIS", "WBD", "PARA", "LYV", "ROKU"],
  Retail: ["AMZN", "WMT", "COST", "HD", "LOW", "TGT", "TJX", "ROST", "BBY", "ULTA", "DG", "DLTR"],
  "Travel Services": ["BKNG", "EXPE", "ABNB", "TCOM", "TRIP", "MMYT"],
  Restaurants: ["MCD", "SBUX", "CMG", "YUM", "DRI", "QSR", "DPZ", "WING", "TXRH", "CAKE"],
  "Auto Manufacturers": ["TSLA", "GM", "F", "RIVN", "LCID", "TM", "HMC", "STLA"],
  Banks: ["JPM", "BAC", "WFC", "C", "GS", "MS", "USB", "PNC", "TFC", "COF"],
  "Financial Services": ["V", "MA", "AXP", "PYPL", "SQ", "BLK", "SCHW", "SPGI", "MCO", "ICE"],
  Insurance: ["BRK.B", "PGR", "CB", "AIG", "MET", "PRU", "AFL", "ALL", "TRV"],
  "Healthcare Plans": ["UNH", "ELV", "CI", "HUM", "CNC", "MOH"],
  "Drug Manufacturers": ["LLY", "JNJ", "MRK", "ABBV", "PFE", "BMY", "AMGN", "GILD", "VRTX", "REGN", "BIIB"],
  "Medical Devices": ["ISRG", "ABT", "SYK", "MDT", "BSX", "EW", "DXCM", "ZBH"],
  "Oil & Gas": ["XOM", "CVX", "COP", "EOG", "OXY", "DVN", "FANG", "MPC", "PSX", "VLO"],
  "Aerospace & Defense": ["RTX", "LMT", "NOC", "GD", "BA", "TDG", "HWM", "TXT", "LHX"],
  Utilities: ["NEE", "DUK", "SO", "AEP", "D", "EXC", "SRE", "XEL", "PEG", "ED"],
  "Real Estate": ["PLD", "AMT", "EQIX", "SPG", "O", "WELL", "DLR", "PSA", "CCI", "VICI", "AVB", "EQR"],
  Beverages: ["KO", "PEP", "MNST", "KDP", "CELH", "TAP"],
  "Packaged Foods": ["MDLZ", "GIS", "K", "CPB", "HSY", "SJM", "CAG"],
  "Household & Personal Products": ["PG", "CL", "KMB", "EL", "CHD", "CLX"],
};

const INDUSTRY_ALIASES = [
  ["Semiconductors", ["semiconductor", "semiconductors", "chip", "chips"]],
  ["Software", ["software", "application software", "infrastructure software", "saas"]],
  ["Consumer Electronics", ["consumer electronics", "computer hardware", "electronic components"]],
  ["Internet Content & Information", ["internet content", "internet information", "interactive media", "media"]],
  ["Communication Services", ["telecom", "telecommunication", "communication services", "wireless"]],
  ["Entertainment", ["entertainment", "streaming"]],
  ["Travel Services", ["travel", "lodging", "hotels", "booking", "resorts"]],
  ["Restaurants", ["restaurant", "restaurants", "coffee", "dining"]],
  ["Auto Manufacturers", ["auto manufacturers", "automobiles", "auto", "vehicles", "ev"]],
  ["Retail", ["retail", "discount stores", "home improvement retail", "apparel retail"]],
  ["Banks", ["bank", "banks", "banking", "regional banks"]],
  ["Financial Services", ["financial services", "credit services", "asset management", "capital markets", "payments"]],
  ["Insurance", ["insurance"]],
  ["Healthcare Plans", ["healthcare plans", "managed healthcare"]],
  ["Drug Manufacturers", ["drug manufacturer", "biotechnology", "pharmaceutical", "pharma"]],
  ["Medical Devices", ["medical devices", "medical instruments", "medical equipment"]],
  ["Oil & Gas", ["oil", "gas", "energy", "refining", "exploration"]],
  ["Aerospace & Defense", ["aerospace", "defense"]],
  ["Utilities", ["utility", "utilities", "regulated electric"]],
  ["Real Estate", ["real estate", "reit", "reits"]],
  ["Technology", ["technology", "information technology", "tech"]],
];

function cleanTicker(symbol) {
  return String(symbol || "").trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "");
}


function decodeHtmlEntities(value = "") {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value = "") {
  return decodeHtmlEntities(String(value || "").replace(/<[^>]*>/g, " "));
}

function isStockAnalysisTickerLike(item = {}) {
  const symbol = cleanTicker(item.symbol || item.ticker);
  const name = String(item.name || item.companyName || "").trim();

  if (!symbol || !name) return false;
  if (symbol.length > 10) return false;
  if (/[=/^]/.test(symbol)) return false;
  if (/warrant|unit|rights|preferred|depositary|note|bond|etf|fund|trust/i.test(name)) return false;

  return true;
}

function parseStockAnalysisTable(html = "") {
  const seen = new Set();
  const results = [];

  // Preferred parser for actual SSR table rows.
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const row = rowMatch[1];
    const linkMatch = row.match(/href=["']\/stocks\/([^\/"']+)\/["'][^>]*>\s*([^<]+?)\s*<\/a>/i);
    if (!linkMatch) continue;

    const symbol = cleanTicker(decodeHtmlEntities(linkMatch[2] || linkMatch[1]).toUpperCase());
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => stripTags(cell[1]));
    const name = cells.find((cell) => cell && cell !== symbol && !/^[0-9.,]+[KMBT]?$/.test(cell)) || "";

    const item = {
      symbol,
      name,
      source: "StockAnalysis.com",
    };

    if (isStockAnalysisTickerLike(item) && !seen.has(symbol)) {
      seen.add(symbol);
      results.push(item);
    }
  }

  // Fallback parser for the simplified text-like HTML returned by some environments.
  if (results.length < 100) {
    const linkRegex = /href=["']\/stocks\/([a-z0-9.-]+)\/["'][^>]*>\s*([A-Z0-9.-]+)\s*<\/a>\s*([^<\n\r]+)/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const symbol = cleanTicker(match[2] || match[1]);
      let tail = decodeHtmlEntities(match[3] || "").replace(/\s+/g, " ").trim();

      // Remove obvious trailing market-cap text if it is directly attached.
      tail = tail.replace(/\s+\d+(?:\.\d+)?[KMBT]\s*$/i, "").trim();

      const item = {
        symbol,
        name: tail,
        source: "StockAnalysis.com",
      };

      if (isStockAnalysisTickerLike(item) && !seen.has(symbol)) {
        seen.add(symbol);
        results.push(item);
      }
    }
  }

  return results.sort((a, b) => a.symbol.localeCompare(b.symbol));
}

async function fetchStockAnalysisTickerList() {
  const response = await fetch("https://stockanalysis.com/stocks/", {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; EvalTickerLookup/1.0)",
      "Accept": "text/html,application/xhtml+xml",
    },
  });

  const html = await response.text();

  if (!response.ok) {
    throw new Error(`StockAnalysis.com ticker page failed: ${response.status}`);
  }

  const parsed = parseStockAnalysisTable(html);

  if (parsed.length < 500) {
    throw new Error(`StockAnalysis.com ticker parse returned only ${parsed.length} stocks.`);
  }

  return parsed;
}

async function getStockAnalysisTickerLookupList() {
  if (tickerLookupCache.data.length && Date.now() - tickerLookupCache.savedAt < TICKER_LOOKUP_TTL_MS) {
    return tickerLookupCache.data;
  }

  const data = await fetchStockAnalysisTickerList();
  tickerLookupCache.savedAt = Date.now();
  tickerLookupCache.data = data;
  return data;
}


function normalizeIndustryName(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getIndustryKey(industry = "") {
  const clean = normalizeIndustryName(industry);

  for (const [key, terms] of INDUSTRY_ALIASES) {
    if (terms.some((term) => clean.includes(normalizeIndustryName(term)))) {
      return key;
    }
  }

  return Object.keys(INDUSTRY_UNIVERSES).find((key) => normalizeIndustryName(key) === clean) || "Technology";
}

function isValidAnalysisPayload(data) {
  const score = Number(data?.grades?.edgeScore);
  const validCategories = Number(data?.grades?.dataQuality?.validCategoryCount || 0);
  const inputCounts = data?.grades?.dataQuality?.validInputCounts || {};

  const hasEnoughFundamentals =
    Number(inputCounts.growth || 0) >= 2 ||
    Number(inputCounts.profitability || 0) >= 2 ||
    Number(inputCounts.financialHealth || 0) >= 2 ||
    Number(inputCounts.valuation || 0) >= 2;

  const hasMarketData = Number(inputCounts.marketData || 0) >= 2 || Boolean(data?.quote?.c);

  return Number.isFinite(score) && score >= 2 && validCategories >= 5 && hasMarketData && hasEnoughFundamentals;
}

function hoursFromMs(ms) {
  return Number((ms / (60 * 60 * 1000)).toFixed(1));
}

function componentMetaFor(savedAt = {}) {
  return {
    fundamentals: hoursFromMs(COMPONENT_TTLS_MS.fundamentals),
    valuation: hoursFromMs(COMPONENT_TTLS_MS.valuation),
    market: hoursFromMs(COMPONENT_TTLS_MS.market),
    news: hoursFromMs(COMPONENT_TTLS_MS.news),
    risk: hoursFromMs(COMPONENT_TTLS_MS.risk),
    profile: hoursFromMs(COMPONENT_TTLS_MS.profile),
    savedAt,
  };
}

function withCacheInfo(data, cacheInfo, savedAt = {}) {
  return {
    ...data,
    cache: {
      ...(data?.cache || {}),
      ...cacheInfo,
      ttlHours: 24,
      componentTtlsHours: componentMetaFor(savedAt),
    },
  };
}

function isFresh(savedAt, key) {
  const saved = Number(savedAt?.[key] || 0);
  if (!saved) return false;
  return Date.now() - saved < COMPONENT_TTLS_MS[key];
}

function getRefreshPlan(savedAt = {}) {
  return {
    refreshFundamentals: !isFresh(savedAt, "fundamentals"),
    refreshValuation: !isFresh(savedAt, "valuation"),
    refreshMarket: !isFresh(savedAt, "market"),
    refreshNews: !isFresh(savedAt, "news"),
    refreshRisk: !isFresh(savedAt, "risk"),
    refreshProfile: !isFresh(savedAt, "profile"),
  };
}

function allComponentsFresh(plan) {
  return !Object.values(plan).some(Boolean);
}

function scoreToneName(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return "N/A";
  if (n >= 7.5) return "Strong";
  if (n >= 6.5) return "Mixed";
  return "Weak";
}

function scoreText10(score) {
  const n = Number(score);
  return Number.isFinite(n) ? n.toFixed(1) : "N/A";
}

function availableWeightedAverage(values, fallback = null) {
  let total = 0;
  let weight = 0;

  for (const item of values) {
    const score = Number(item?.score);
    const w = Number(item?.weight);
    if (Number.isFinite(score) && Number.isFinite(w) && w > 0) {
      total += score * w;
      weight += w;
    }
  }

  if (weight === 0) return fallback;
  return Math.max(0, Math.min(10, total / weight));
}

function strongestWeakestFromCategories(categories = {}) {
  const entries = Object.entries(categories)
    .map(([key, value]) => [key, Number(value)])
    .filter(([, value]) => Number.isFinite(value));

  const label = (key) =>
    ({
      growth: "Growth",
      profitability: "Profitability",
      financialHealth: "Financial Health",
      valuation: "Valuation",
      momentum: "Momentum",
      reversal: "Pullback",
      newsSentiment: "News Sentiment",
    }[key] || key);

  if (!entries.length) {
    return { strongest: "Not enough category data yet.", weakest: "Not enough category data yet." };
  }

  const strongest = entries.reduce((best, item) => (item[1] > best[1] ? item : best), entries[0]);
  const weakest = entries.reduce((worst, item) => (item[1] < worst[1] ? item : worst), entries[0]);

  return {
    strongest: `${label(strongest[0])} is the strongest category at ${scoreText10(strongest[1])}/10.`,
    weakest: `${label(weakest[0])} is the weakest category at ${scoreText10(weakest[1])}/10.`,
  };
}

const FUNDAMENTAL_CATEGORY_KEYS = ["growth", "profitability", "financialHealth"];
const VALUATION_CATEGORY_KEYS = ["valuation"];
const MARKET_CATEGORY_KEYS = ["momentum", "reversal"];
const NEWS_CATEGORY_KEYS = ["newsSentiment"];

const FUNDAMENTAL_METRIC_KEYS = [
  "revenueGrowth",
  "revenueGrowthQuarterly",
  "revenueGrowth3Y",
  "revenueGrowth5Y",
  "epsGrowth",
  "epsGrowth3Y",
  "epsGrowth5Y",
  "roe",
  "roa",
  "roi",
  "grossMargin",
  "operatingMargin",
  "pretaxMargin",
  "netMargin",
  "debtToEquity",
  "longTermDebtToEquity",
  "currentRatio",
  "quickRatio",
  "cashRatio",
  "assetTurnover",
  "interestCoverage",
  "cashFlowToDebt",
  "operatingCashFlowPerShare",
  "freeCashFlowPerShare",
  "totalDebtToCapital",
  "netDebtToEbitda",
  "marketCapM",
];

const VALUATION_METRIC_KEYS = [
  "peRatio",
  "forwardPe",
  "pegRatio",
  "priceToSales",
  "priceToBook",
  "priceToCashFlow",
  "priceToFreeCashFlow",
  "dividendYield",
  "wacc",
  "costOfEquity",
  "afterTaxCostOfDebt",
  "taxRate",
  "dcfEnterpriseValue",
  "intrinsicValue",
  "intrinsicValueGap",
  "dcfGrowthRate",
];

const MARKET_METRIC_KEYS = [
  "beta",
  "dayChangePercent",
  "priceReturn4Week",
  "priceReturn13Week",
  "priceReturn26Week",
  "priceReturn52Week",
  "distanceFrom52WeekLow",
  "pullbackFromHigh",
];

function copyKeys(target = {}, source = {}, keys = []) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source || {}, key)) {
      target[key] = source[key];
    }
  }
}

function mergeByTtl(cachedReport, freshReport, plan) {
  if (!cachedReport?.grades || !freshReport?.grades) return freshReport;

  const merged = structuredClone(freshReport);
  const cachedCategories = cachedReport?.grades?.categories || {};
  const freshCategories = freshReport?.grades?.categories || {};
  merged.grades.categories = { ...freshCategories };

  if (!plan.refreshFundamentals) {
    copyKeys(merged.grades.categories, cachedCategories, FUNDAMENTAL_CATEGORY_KEYS);
    copyKeys(merged.metrics, cachedReport.metrics, FUNDAMENTAL_METRIC_KEYS);
  }

  if (!plan.refreshValuation) {
    copyKeys(merged.grades.categories, cachedCategories, VALUATION_CATEGORY_KEYS);
    copyKeys(merged.metrics, cachedReport.metrics, VALUATION_METRIC_KEYS);
  }

  if (!plan.refreshMarket) {
    merged.quote = cachedReport.quote || merged.quote;
    copyKeys(merged.grades.categories, cachedCategories, MARKET_CATEGORY_KEYS);
    copyKeys(merged.metrics, cachedReport.metrics, MARKET_METRIC_KEYS);
  }

  if (!plan.refreshNews) {
    copyKeys(merged.grades.categories, cachedCategories, NEWS_CATEGORY_KEYS);
    if (cachedReport.metrics?.newsSentiment) merged.metrics.newsSentiment = cachedReport.metrics.newsSentiment;
    if (cachedReport.newsSentiment) merged.newsSentiment = cachedReport.newsSentiment;
  }

  if (!plan.refreshRisk && cachedReport?.grades?.riskLabel) {
    merged.grades.riskLabel = cachedReport.grades.riskLabel;
  }

  if (!plan.refreshProfile && cachedReport?.profile) {
    merged.profile = cachedReport.profile;
  }

  const categories = merged.grades.categories || {};
  const edgeScore = availableWeightedAverage(
    [
      { score: categories.growth, weight: 0.215 },
      { score: categories.profitability, weight: 0.205 },
      { score: categories.financialHealth, weight: 0.175 },
      { score: categories.valuation, weight: 0.150 },
      { score: categories.momentum, weight: 0.105 },
      { score: categories.reversal, weight: 0.075 },
      { score: categories.newsSentiment, weight: 0.075 },
    ],
    Number(merged.grades.edgeScore)
  );

  merged.grades.edgeScore = Number(edgeScore.toFixed(1));
  merged.grades.grade = scoreToneName(edgeScore);

  const sw = strongestWeakestFromCategories(categories);
  merged.strengths = [sw.strongest];
  merged.weaknesses = [sw.weakest];
  merged.evaluationSummary = `${merged.symbol} has an Eval Score of ${scoreText10(edgeScore)} out of 10. The score blends growth, profitability, financial health, valuation, momentum, pullback, and news sentiment.`;

  if (merged.grades.dataQuality) {
    merged.grades.dataQuality.componentCachePolicy = "growth/profitability/financial health 4 months, valuation 1 month, price/momentum/pullback 1 day, risk/news 7 days";
  }

  return merged;
}

function updatedComponentSavedAt(previous = {}, plan = {}) {
  const now = Date.now();
  return {
    fundamentals: previous.fundamentals && !plan.refreshFundamentals ? previous.fundamentals : now,
    valuation: previous.valuation && !plan.refreshValuation ? previous.valuation : now,
    market: previous.market && !plan.refreshMarket ? previous.market : now,
    news: previous.news && !plan.refreshNews ? previous.news : now,
    risk: previous.risk && !plan.refreshRisk ? previous.risk : now,
    profile: previous.profile && !plan.refreshProfile ? previous.profile : now,
  };
}

async function getCachedAnalysis(symbol) {
  const clean = cleanTicker(symbol);
  if (!clean) throw new Error("Missing ticker symbol.");

  const cached = analysisCache.get(clean);
  const cachedReport = cached?.data || null;
  const savedAt = cached?.componentSavedAt || {};
  const plan = getRefreshPlan(savedAt);

  if (cachedReport && allComponentsFresh(plan)) {
    return withCacheInfo(cachedReport, { hit: true, componentHit: true }, savedAt);
  }

  const lastValid = lastValidAnalysisCache.get(clean);

  try {
    const data = await buildStockAnalysis(clean, {
      cachedReport,
      refreshFundamentals: plan.refreshFundamentals,
      refreshValuation: plan.refreshValuation,
      refreshMarket: plan.refreshMarket,
      refreshNews: plan.refreshNews,
      refreshRisk: plan.refreshRisk,
      refreshProfile: plan.refreshProfile,
    });

    const merged = cachedReport ? mergeByTtl(cachedReport, data, plan) : data;
    const componentSavedAt = updatedComponentSavedAt(savedAt, plan);
    const payload = withCacheInfo(merged, {
      hit: false,
      refreshed: Object.entries(plan).filter(([, value]) => value).map(([key]) => key),
    }, componentSavedAt);

    if (!isValidAnalysisPayload(payload)) {
      if (lastValid?.data) {
        return withCacheInfo(lastValid.data, {
          hit: true,
          fallback: "lastValid",
          reason: "New report had incomplete provider data or rate-limited source response.",
        }, lastValid.componentSavedAt || {});
      }

      return {
        ...payload,
        warning: "Partial provider data. Score may be unavailable until data sources recover.",
      };
    }

    analysisCache.set(clean, {
      savedAt: Date.now(),
      componentSavedAt,
      data: payload,
    });

    lastValidAnalysisCache.set(clean, {
      savedAt: Date.now(),
      componentSavedAt,
      data: payload,
    });

    return payload;
  } catch (error) {
    if (lastValid?.data) {
      return withCacheInfo(lastValid.data, {
        hit: true,
        fallback: "lastValid",
        reason: error?.message || "Provider fetch failed.",
      }, lastValid.componentSavedAt || {});
    }

    throw error;
  }
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "Eval backend",
    routes: ["/api/health", "/api/ticker-lookup", "/api/analyze/:symbol", "/api/industry-top/:industry"],
    cacheTtlHours: 24,
    componentCachePolicy: "fundamentals 4 months, valuation 1 month, market/price 1 day, risk/news 7 days",
    dataProviderPlan: "Massive + light FMP + Finnhub with last-valid fallback",
    faqCount: 1050,
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "Eval backend",
    dataProviders: {
      finnhub: Boolean(process.env.FINNHUB_API_KEY),
      massive: Boolean(process.env.MASSIVE_API_KEY),
      fmp: Boolean(process.env.FMP_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
    },
    cacheTtlHours: 24,
    componentCachePolicy: "fundamentals 4 months, valuation 1 month, market/price 1 day, risk/news 7 days",
    cacheSize: analysisCache.size,
    lastValidCacheSize: lastValidAnalysisCache.size,
    tickerLookupCacheSize: tickerLookupCache.data.length,
    tickerLookupSource: "StockAnalysis.com/stocks",
    fallbackPolicy: "Component-level cache plus minimized provider calls: Massive for price/history, light FMP for fundamentals, Finnhub for profile/news/fallback metrics, StockAnalysis.com for ticker lookup, lastValid cache as final safety net.",
    faqCount: 1050,
  });
});


app.get("/api/ticker-lookup", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    const limit = Math.min(Math.max(Number(req.query.limit) || 150, 1), 300);
    const list = await getStockAnalysisTickerLookupList();

    const results = (!q
      ? list.slice(0, limit)
      : list
          .filter((item) => {
            const symbol = item.symbol.toLowerCase();
            const name = item.name.toLowerCase();
            return symbol.includes(q) || name.includes(q);
          })
          .sort((a, b) => {
            const aSymbol = a.symbol.toLowerCase();
            const bSymbol = b.symbol.toLowerCase();
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();

            const score = (symbol, name) =>
              (symbol === q ? -60 : 0) +
              (name === q ? -50 : 0) +
              (symbol.startsWith(q) ? -40 : 0) +
              (name.startsWith(q) ? -30 : 0) +
              (symbol.includes(q) ? -10 : 0) +
              (name.includes(q) ? -5 : 0);

            return score(aSymbol, aName) - score(bSymbol, bName) || a.symbol.localeCompare(b.symbol);
          })
          .slice(0, limit)
    );

    res.json({
      query: q,
      count: results.length,
      totalAvailable: list.length,
      cached: tickerLookupCache.savedAt > 0,
      source: "StockAnalysis.com stocks table",
      results,
    });
  } catch (error) {
    console.error("Ticker lookup route failed:", error?.stack || error?.message || error);
    res.status(500).json({
      error: error?.message || "Could not load ticker lookup list.",
      source: "StockAnalysis.com stocks table",
      results: [],
    });
  }
});

app.get("/api/analyze/:symbol", async (req, res) => {
  try {
    const symbol = cleanTicker(req.params.symbol);
    const data = await getCachedAnalysis(symbol);
    res.json(data);
  } catch (error) {
    console.error("Analyze route failed:", error?.stack || error?.message || error);
    res.status(500).json({
      error: error?.message || "Could not analyze this stock.",
      route: "api/analyze",
    });
  }
});

app.get("/api/industry-top/:industry", async (req, res) => {
  try {
    const industry = String(req.params.industry || "").trim();
    const symbol = cleanTicker(req.query.symbol);
    const industryKey = getIndustryKey(industry);
    const cacheKey = `${industryKey}:${symbol}`;

    const cached = industryCache.get(cacheKey);
    if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
      return res.json({
        ...cached.data,
        cache: { hit: true, ttlHours: 24 },
      });
    }

    const universe = [...new Set([symbol, ...(INDUSTRY_UNIVERSES[industryKey] || [])].filter(Boolean))].slice(0, 12);
    const results = [];

    for (const ticker of universe) {
      try {
        const analysis = await getCachedAnalysis(ticker);
        const score = Number(analysis?.grades?.edgeScore);

        if (Number.isFinite(score)) {
          results.push({
            symbol: ticker,
            name: analysis?.profile?.name || ticker,
            industry: analysis?.profile?.finnhubIndustry || industryKey,
            score,
            price: analysis?.quote?.c ?? null,
            categories: analysis?.grades?.categories || {},
            riskLabel: analysis?.grades?.riskLabel || "",
          });
        }
      } catch (error) {
        console.warn(`Industry ranking skipped ${ticker}:`, error?.message || error);
      }
    }

    const leaders = results.sort((a, b) => b.score - a.score).slice(0, 5);

    const payload = {
      industry,
      industryKey,
      candidates: universe,
      leaders,
      limit: 5,
      cachedForHours: 24,
      cache: { hit: false, ttlHours: 24 },
    };

    industryCache.set(cacheKey, {
      savedAt: Date.now(),
      data: payload,
    });

    res.json(payload);
  } catch (error) {
    console.error("Industry top route failed:", error?.stack || error?.message || error);
    res.status(500).json({
      error: error?.message || "Could not rank this industry.",
      route: "api/industry-top",
    });
  }
});


app.post("/api/assistant", async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const question = String(req.body?.question || "").trim().slice(0, 150);
    const current = req.body?.current || null;
    const watchlist = Array.isArray(req.body?.watchlist) ? req.body.watchlist : [];

    if (!question) {
      return res.status(400).json({ error: "Missing question." });
    }

    const allowedWebsiteTerms = [
      "eval",
      "score",
      "power score",
      "stock",
      "ticker",
      "watchlist",
      "price",
      "risk",
      "industry",
      "industries",
      "news",
      "sentiment",
      "growth",
      "profitability",
      "financial health",
      "valuation",
      "momentum",
      "pullback",
      "company",
      "metric",
      "metrics",
      "category",
      "categories",
      "strong",
      "weak",
      "strongest",
      "weakest",
      "dashboard",
      "website",
      "app",
      "page",
      "button",
      "menu",
      "dropdown",
      "navigate",
      "navigation",
      "how do i",
      "how to",
      "where is",
      "what is",
      "explain",
      "use",
      "using",
      "add",
      "remove",
      "delete",
      "refresh",
      "search",
      "open",
      "click",
      "chart",
      "bar chart",
      "radar",
      "compare",
      "comparison",
      "article",
      "read article",
      "bubble",
      "color",
      "green",
      "yellow",
      "red",
      "rank",
      "ranking",
      "industry ranking",
      "homepage",
      "home",
      "terms",
      "conditions",
      "contact",
      "support",
      "profile",
      "sign in",
      "log in",
      "login",
      "dashboard",
      "clerk",
    ];

    const supportIntentTerms = [
      "how",
      "help",
      "use",
      "navigate",
      "where",
      "what does",
      "what is",
      "explain",
      "show",
      "find",
      "open",
      "click",
      "button",
      "page",
      "menu",
      "dropdown",
      "dashboard",
      "watchlist",
      "compare",
      "metrics",
      "score",
      "industry",
      "news sentiment",
      "risk",
      "price",
      "contact",
      "terms",
      "homepage",
      "profile",
    ];

    const normalizedQuestion = question.toLowerCase();
    const hasWebsiteTerm = allowedWebsiteTerms.some((term) => normalizedQuestion.includes(term));
    const hasSupportIntent = supportIntentTerms.some((term) => normalizedQuestion.includes(term));

    const currentSymbol = String(current?.symbol || current?.profile?.ticker || "").toLowerCase();
    const currentName = String(current?.profile?.name || "").toLowerCase();
    const watchlistSymbols = watchlist
      .map((item) => String(item?.symbol || item?.ticker || "").toLowerCase())
      .filter(Boolean);

    const stockLikeTokens = [...question.toUpperCase().matchAll(/\b[A-Z]{1,5}(?:\.[A-Z])?\b/g)].map((match) => match[0]);
    const allAllowedStockSymbols = [...new Set([currentSymbol, ...watchlistSymbols].filter(Boolean))];
    const mentionedAllowedTicker = stockLikeTokens.some((token) => allAllowedStockSymbols.includes(token.toLowerCase()));

    const mentionsKnownTicker =
      (currentSymbol && normalizedQuestion.includes(currentSymbol)) ||
      watchlistSymbols.some((symbol) => normalizedQuestion.includes(symbol)) ||
      mentionedAllowedTicker;

    const stockAnalysisWords = /\b(should i|buy|sell|hold|invest|investment|target|price target|undervalued|overvalued|better stock|compare|valuation|risk|sentiment|earnings|revenue|profit|growth|momentum|pullback|financial health|metrics?|score|news)\b/i.test(question);
    const asksAboutSpecificStock = stockLikeTokens.length > 0 && stockAnalysisWords;

    const asksGeneralUnrelated =
      /\b(weather|sports score|recipe|movie|music|dating|politics|history homework|essay|song|lyrics|fraternity|hockey|travel|write my|homework answer)\b/i.test(question) &&
      !hasWebsiteTerm &&
      !mentionsKnownTicker;

    if (asksGeneralUnrelated || (!hasWebsiteTerm && !hasSupportIntent && !mentionsKnownTicker && !currentName.includes(normalizedQuestion))) {
      return res.json({
        answer:
          "I can help with Eval support, including navigation, dashboard features, watchlist, compare, metrics, news sentiment, risk, industry rankings, and stocks saved in your watchlist.",
      });
    }

    if (asksAboutSpecificStock && !mentionsKnownTicker) {
      return res.json({
        answer:
          "I can help with specific stock questions only when that ticker is loaded on the dashboard or saved in your watchlist. Add the ticker to your watchlist first, then ask again.",
      });
    }

    if (!apiKey) {
      return res.status(200).json({
        answer:
          "Eval AI is not connected yet. Add OPENAI_API_KEY in Render environment variables to enable assistant responses.",
      });
    }

    const watchlistContext = watchlist
      .slice(0, 15)
      .map((item) => {
        const symbol = item?.symbol || item?.ticker || "";
        const score = item?.score ?? item?.edgeScore ?? "N/A";
        const strongest = item?.strongest || item?.strength || "N/A";
        const weakest = item?.weakest || item?.weakness || "N/A";
        return `${symbol}: Eval Score ${score}, Strong: ${strongest}, Weak: ${weakest}`;
      })
      .filter(Boolean)
      .join("\n");

    const currentContext = current
      ? JSON.stringify({
          symbol: current.symbol,
          name: current.profile?.name,
          industry: current.profile?.finnhubIndustry,
          price: current.quote?.c,
          dailyChangePercent: current.quote?.dp,
          evalScore: current.grades?.edgeScore,
          risk: current.grades?.riskLabel,
          categories: current.grades?.categories,
          strengths: current.strengths,
          weaknesses: current.weaknesses,
          newsSentiment: current.newsSentiment,
          metrics: current.metrics,
        })
      : "No current stock loaded.";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_ASSISTANT_MODEL || "gpt-4.1-nano",
        temperature: 0.15,
        max_tokens: 125,
        messages: [
          {
            role: "system",
            content:
              `You are Eval AI, the support assistant inside the Eval stock-evaluation website. Your main job is to help users navigate and understand the app. You CAN answer questions about all Eval FAQs, how to use the dashboard, ticker lookup, search ticker bar, dropdown menu, AI Assistant page, Compare page, Watchlist, industry ranking pages, metric cards, bar charts, radar charts, Eval Score rings, score colors, price/risk cards, data caching, data sources, provider fallbacks, news sentiment, article cards, Terms & Conditions, Contact/Support page, profile/sign-in basics, and how to add, remove, refresh, or compare stocks. You CAN explain what the metrics mean in simple language. You CAN answer stock-specific questions only using the current loaded stock or tickers saved in the user's watchlist context. If a stock is not loaded or in the watchlist, tell the user to load it or add it to the watchlist first. Do NOT answer unrelated questions outside Eval. Do NOT give buy/sell commands or financial advice. Be helpful like a website support agent. Keep answers clear and under 130 words.

FAQ KNOWLEDGE:
${EVAL_FAQ_KNOWLEDGE}`,
          },
          {
            role: "user",
            content: `Question: ${question}\n\nCurrent Eval website stock context:\n${currentContext}\n\nEval website watchlist context:\n${watchlistContext || "No watchlist context."}`,
          },
        ],
      }),
    });

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("OpenAI assistant failed:", response.status, json?.error?.message || "");
      return res.status(200).json({
        answer:
          "Eval AI could not reach OpenAI right now. Check your OPENAI_API_KEY or billing settings in Render.",
      });
    }

    const answer = json?.choices?.[0]?.message?.content?.trim();

    return res.json({
      answer:
        answer ||
        "I can help with Eval support, including navigation, dashboard features, watchlist, compare, metrics, news sentiment, risk, industry rankings, and stocks saved in your watchlist.",
    });
  } catch (error) {
    console.error("Assistant route failed:", error?.stack || error?.message || error);
    return res.status(500).json({
      error: error?.message || "Assistant route failed.",
      route: "api/assistant",
    });
  }
});


app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
  });
});

app.listen(PORT, () => {
  console.log(`Eval backend running on port ${PORT}`);
});
