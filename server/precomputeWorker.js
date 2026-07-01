import fs from "fs";
import path from "path";
import { buildStockAnalysis } from "./score.js";
import {
  cleanPrecomputeTicker,
  getPrecomputeState,
  putPrecomputedReport,
  updatePrecomputeState,
} from "./precomputeStore.js";

const DEFAULT_UNIVERSE = ["AAPL","MSFT","NVDA","GOOGL","AMZN","META","TSLA","AVGO","JPM","LLY"];
const DEFAULT_UNIVERSE_PATH = path.join(path.dirname(new URL(import.meta.url).pathname), "data", "universe.json");

const WINDOW_START_MINUTES = 23 * 60 + 30; // 11:30 PM ET
const WINDOW_END_MINUTES = 8 * 60; // 8:00 AM ET
const BATCH_SIZE = Number(process.env.EVAL_PRECOMPUTE_BATCH_SIZE || 500);
const WEEKLY_SIZE = Number(process.env.EVAL_PRECOMPUTE_WEEKLY_SIZE || 3500);
const TICKER_INTERVAL_MS = Math.max(45_000, Number(process.env.EVAL_PRECOMPUTE_TICKER_INTERVAL_MS || 60_000));
const LOOP_INTERVAL_MS = Math.max(30_000, Number(process.env.EVAL_PRECOMPUTE_LOOP_INTERVAL_MS || 60_000));
const ENABLED = String(process.env.EVAL_PRECOMPUTE_ENABLED || "false").toLowerCase() === "true";
let running = false;
let timer = null;

function etParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type)?.value || "";
  return {
    dateKey: `${pick("year")}-${pick("month")}-${pick("day")}`,
    minutes: Number(pick("hour")) * 60 + Number(pick("minute")),
  };
}

function isInsidePrecomputeWindow() {
  const { minutes } = etParts();
  return minutes >= WINDOW_START_MINUTES || minutes < WINDOW_END_MINUTES;
}

function normalizeUniverseEntry(entry) {
  if (typeof entry === "string") return cleanPrecomputeTicker(entry);
  if (entry && typeof entry === "object") return cleanPrecomputeTicker(entry.symbol || entry.ticker);
  return "";
}

function parseUniverseFromFile(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return [];
    const ext = path.extname(filePath).toLowerCase();
    const raw = fs.readFileSync(filePath, "utf8");
    if (ext === ".json") {
      const parsed = JSON.parse(raw);
      const entries = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.tickers) ? parsed.tickers : [];
      return entries.map(normalizeUniverseEntry).filter(Boolean);
    }
    return raw
      .split(/\r?\n/g)
      .map((line) => line.split(",")[0])
      .map(cleanPrecomputeTicker)
      .filter(Boolean);
  } catch (error) {
    console.warn("Precompute universe file failed:", error?.message || error);
    return [];
  }
}

export function getPrecomputeUniverse() {
  // Fixed order matters: position 1 stays position 1, position 3500 stays position 3500.
  // Do not sort by rank, market cap, usage, watchlist count, or search activity here.
  const overrideTickers = String(process.env.EVAL_PRECOMPUTE_OVERRIDE_TICKERS || "")
    .split(",")
    .map(cleanPrecomputeTicker)
    .filter(Boolean);
  const universePath = process.env.EVAL_PRECOMPUTE_UNIVERSE_PATH || DEFAULT_UNIVERSE_PATH;
  const fileTickers = parseUniverseFromFile(universePath);
  const base = overrideTickers.length ? overrideTickers : (fileTickers.length ? fileTickers : DEFAULT_UNIVERSE);
  const fixedUnique = [];
  const seen = new Set();
  for (const ticker of base.map(cleanPrecomputeTicker).filter(Boolean)) {
    if (seen.has(ticker)) continue;
    seen.add(ticker);
    fixedUnique.push(ticker);
    if (fixedUnique.length >= WEEKLY_SIZE) break;
  }
  return fixedUnique;
}

function todaysBatch() {
  const universe = getPrecomputeUniverse();
  const { dateKey } = etParts();
  const current = getPrecomputeState();
  let weekCursor = Number(current.weekCursor || 0);
  let dayCursor = Number(current.dayCursor || 0);

  if (current.lastBatchDate !== dateKey) {
    dayCursor = 0;
    weekCursor = weekCursor >= universe.length ? 0 : weekCursor;
    updatePrecomputeState({ lastBatchDate: dateKey, dayCursor, weekCursor });
  }

  const batch = universe.slice(weekCursor, Math.min(weekCursor + BATCH_SIZE, universe.length));
  if (batch.length < BATCH_SIZE && universe.length) batch.push(...universe.slice(0, BATCH_SIZE - batch.length));
  return { batch, dayCursor, weekCursor, universeSize: universe.length, dateKey };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function computeOne(symbol) {
  const report = await buildStockAnalysis(symbol, {
    cachedReport: null,
    refreshFundamentals: true,
    refreshValuation: true,
    refreshMarket: true,
    refreshNews: true,
    refreshRisk: true,
    refreshProfile: true,
    includeAiScoreSummary: false,
    precomputeMode: true,
  });
  putPrecomputedReport(symbol, report);
  return report;
}

async function runPrecomputeLoopOnce() {
  if (!ENABLED || running || !isInsidePrecomputeWindow()) return;
  running = true;
  try {
    const { batch, dayCursor, weekCursor, universeSize, dateKey } = todaysBatch();
    if (!batch.length || dayCursor >= batch.length) return;

    const symbol = batch[dayCursor];
    console.log(`[precompute] ${dateKey} ${dayCursor + 1}/${batch.length}: ${symbol}`);
    try {
      await computeOne(symbol);
    } catch (error) {
      console.warn(`[precompute] failed ${symbol}:`, error?.message || error);
    }

    const nextDayCursor = dayCursor + 1;
    const finishedBatch = nextDayCursor >= batch.length;
    const nextWeekCursor = finishedBatch ? (weekCursor + BATCH_SIZE >= universeSize ? 0 : weekCursor + BATCH_SIZE) : weekCursor;
    updatePrecomputeState({
      lastBatchDate: dateKey,
      dayCursor: nextDayCursor,
      weekCursor: nextWeekCursor,
      lastRunAt: new Date().toISOString(),
      lastSymbol: symbol,
    });
    await sleep(TICKER_INTERVAL_MS);
  } finally {
    running = false;
  }
}

export function startPrecomputeWorker() {
  if (!ENABLED) {
    console.log("[precompute] disabled. Set EVAL_PRECOMPUTE_ENABLED=true to turn on nightly database refresh.");
    return null;
  }
  if (timer) return timer;
  console.log(`[precompute] enabled. Window 11:30 PM-8:00 AM ET, ${BATCH_SIZE}/day, ${WEEKLY_SIZE}/week cap.`);
  timer = setInterval(runPrecomputeLoopOnce, LOOP_INTERVAL_MS);
  setTimeout(runPrecomputeLoopOnce, 5000);
  return timer;
}

export async function runPrecomputeNow(symbols = []) {
  const cleaned = [...new Set(symbols.map(cleanPrecomputeTicker).filter(Boolean))];
  const results = [];
  for (const symbol of cleaned) {
    try {
      const report = await computeOne(symbol);
      results.push({ symbol, ok: true, score: report?.grades?.edgeScore ?? null });
      await sleep(TICKER_INTERVAL_MS);
    } catch (error) {
      results.push({ symbol, ok: false, error: error?.message || "failed" });
    }
  }
  return results;
}
