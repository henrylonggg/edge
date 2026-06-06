// Eval update: AI assistant expanded as support agent.
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
              "You are Eval AI, the support assistant inside the Eval stock-evaluation website. Your main job is to help users navigate and understand the app. You CAN answer questions about how to use the dashboard, search ticker bar, dropdown menu, AI Assistant page, Compare page, Watchlist, industry ranking pages, metric cards, bar charts, radar charts, Eval Score rings, score colors, price/risk cards, news sentiment, article cards, Terms & Conditions, Contact/Support page, profile/sign-in basics, and how to add, remove, refresh, or compare stocks. You CAN explain what the metrics mean in simple language. You CAN answer stock-specific questions only using the current loaded stock or tickers saved in the user's watchlist context. If a stock is not loaded or in the watchlist, tell the user to add it to the watchlist first. Do NOT answer unrelated questions outside Eval. Do NOT give buy/sell commands or financial advice. Be helpful like a website support agent. Keep answers clear and under 110 words.",
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
