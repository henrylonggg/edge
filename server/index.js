// server/index.js

import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { buildStockAnalysis, buildInvestmentRecommendation } from "./score.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_ORIGIN,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (!origin || allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

const FINNHUB_BASE = "https://finnhub.io/api/v1";
const SEC_COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";

let tickerCikCache = null;
const analysisCache = new Map();

function requireEnv(name) {
  const value = process.env[name];

  if (!value || value.includes("PUT_YOUR")) {
    throw new Error(`Missing ${name}. Add it in Render environment variables.`);
  }

  return value;
}

function normalizeTicker(ticker) {
  return String(ticker || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z.-]/g, "");
}

function getCache(key) {
  const item = analysisCache.get(key);

  if (!item) return null;

  const ageMs = Date.now() - item.createdAt;
  const maxAgeMs = 1000 * 60 * 10;

  if (ageMs > maxAgeMs) {
    analysisCache.delete(key);
    return null;
  }

  return item.data;
}

function setCache(key, data) {
  analysisCache.set(key, {
    createdAt: Date.now(),
    data,
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed: ${response.status} ${text.slice(0, 120)}`);
  }

  return response.json();
}

async function fetchFinnhub(path, params = {}) {
  const apiKey = requireEnv("FINNHUB_API_KEY");

  const url = new URL(`${FINNHUB_BASE}${path}`);

  Object.entries({
    ...params,
    token: apiKey,
  }).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  return fetchJson(url);
}

async function getTickerCikMap() {
  if (tickerCikCache) return tickerCikCache;

  const userAgent =
    process.env.SEC_USER_AGENT ||
    "StockEdgeAI contact@example.com";

  const data = await fetchJson(SEC_COMPANY_TICKERS_URL, {
    headers: {
      "User-Agent": userAgent,
      Accept: "application/json",
    },
  });

  const map = new Map();

  Object.values(data).forEach((company) => {
    if (company?.ticker && company?.cik_str) {
      const ticker = String(company.ticker).toUpperCase();
      const cik = String(company.cik_str).padStart(10, "0");
      map.set(ticker, cik);
    }
  });

  tickerCikCache = map;
  return map;
}

async function fetchSecFacts(ticker) {
  try {
    const map = await getTickerCikMap();
    const cik = map.get(ticker);

    if (!cik) return null;

    const userAgent =
      process.env.SEC_USER_AGENT ||
      "StockEdgeAI contact@example.com";

    const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;

    return await fetchJson(url, {
      headers: {
        "User-Agent": userAgent,
        Accept: "application/json",
      },
    });
  } catch (error) {
    console.warn("SEC facts unavailable:", error.message);
    return null;
  }
}

async function fetchCandles(ticker) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const oneYearAgo = now - 365 * 24 * 60 * 60;

    const data = await fetchFinnhub("/stock/candle", {
      symbol: ticker,
      resolution: "D",
      from: oneYearAgo,
      to: now,
    });

    if (data?.s !== "ok" || !Array.isArray(data.c)) {
      return [];
    }

    return data.c.map((close, index) => ({
      time: data.t?.[index],
      open: data.o?.[index],
      high: data.h?.[index],
      low: data.l?.[index],
      close,
      volume: data.v?.[index],
    }));
  } catch (error) {
    console.warn("Candles unavailable:", error.message);
    return [];
  }
}

async function fetchAnalysis(ticker) {
  const cacheKey = `analysis:${ticker}`;
  const cached = getCache(cacheKey);

  if (cached) return cached;

  const [profile, quote, metricData, secFacts, candles] = await Promise.all([
    fetchFinnhub("/stock/profile2", { symbol: ticker }).catch(() => null),
    fetchFinnhub("/quote", { symbol: ticker }).catch(() => null),
    fetchFinnhub("/stock/metric", { symbol: ticker, metric: "all" }).catch(() => null),
    fetchSecFacts(ticker),
    fetchCandles(ticker),
  ]);

  if (!profile || Object.keys(profile).length === 0) {
    throw new Error("Ticker not found or Finnhub did not return company data.");
  }

  const analysis = buildStockAnalysis({
    ticker,
    profile,
    quote,
    metricData,
    secFacts,
    candles,
  });

  setCache(cacheKey, analysis);

  return analysis;
}

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    app: "StockEdgeAI API",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
  });
});

app.get("/api/analyze/:ticker", async (req, res) => {
  try {
    const ticker = normalizeTicker(req.params.ticker);

    if (!ticker) {
      return res.status(400).json({
        error: "Ticker is required.",
      });
    }

    const analysis = await fetchAnalysis(ticker);

    res.json(analysis);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message || "Failed to analyze stock.",
    });
  }
});

app.post("/api/recommend", async (req, res) => {
  try {
    const ticker = normalizeTicker(req.body.ticker);
    const amount = Number(req.body.amount);

    if (!ticker) {
      return res.status(400).json({
        error: "Ticker is required.",
      });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        error: "Enter a valid investment amount.",
      });
    }

    const analysis = await fetchAnalysis(ticker);

    const recommendation = buildInvestmentRecommendation({
      amount,
      analysis,
    });

    res.json({
      ticker,
      recommendation,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message || "Failed to calculate recommendation.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`StockEdgeAI server running on port ${PORT}`);
});
