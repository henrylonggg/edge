import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { buildStockAnalysis } from "./score.js";

dotenv.config();

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

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const analysisCache = new Map();
const industryCache = new Map();

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

async function getCachedAnalysis(symbol) {
  const clean = cleanTicker(symbol);
  if (!clean) throw new Error("Missing ticker symbol.");

  const cached = analysisCache.get(clean);
  if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
    return {
      ...cached.data,
      cache: { hit: true, ttlHours: 1 },
    };
  }

  const data = await buildStockAnalysis(clean);
  const payload = {
    ...data,
    cache: { hit: false, ttlHours: 1 },
  };

  analysisCache.set(clean, {
    savedAt: Date.now(),
    data: payload,
  });

  return payload;
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "Eval backend",
    routes: ["/api/health", "/api/analyze/:symbol", "/api/industry-top/:industry"],
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "Eval backend",
    hasFinnhubKey: Boolean(process.env.FINNHUB_API_KEY),
    cacheSize: analysisCache.size,
  });
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
        cache: { hit: true, ttlHours: 1 },
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
      cachedForHours: 1,
      cache: { hit: false, ttlHours: 1 },
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

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
  });
});

app.listen(PORT, () => {
  console.log(`Eval backend running on port ${PORT}`);
});
