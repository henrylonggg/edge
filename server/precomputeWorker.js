import fs from "fs";
import path from "path";
import { buildDailyTechnicalRefresh, buildStockAnalysis } from "./score.js";
import {
  cleanPrecomputeTicker,
  getPrecomputeState,
  getPrecomputedReport,
  putPrecomputedReport,
  updatePrecomputeState,
} from "./precomputeStore.js";

const DEFAULT_UNIVERSE = ["AAPL","MSFT","NVDA","GOOGL","AMZN","META","TSLA","AVGO","JPM","LLY"];
const DEFAULT_UNIVERSE_PATH = path.join(path.dirname(new URL(import.meta.url).pathname), "data", "universe.json");

const DEFAULT_NIGHTLY_WINDOW_START_MINUTES = 23 * 60; // 11:00 PM ET after the one-time test morning
const DEFAULT_NIGHTLY_WINDOW_END_MINUTES = 7 * 60 + 30; // 7:30 AM ET after the one-time test morning
const ONE_TIME_TEST_WINDOW_DATE = process.env.EVAL_ONE_TIME_TEST_WINDOW_DATE || "2026-07-01";
const ONE_TIME_TEST_WINDOW_ENABLED = String(process.env.EVAL_ONE_TIME_TEST_WINDOW_ENABLED || "true").toLowerCase() !== "false";
const ONE_TIME_TEST_WINDOW_START_MINUTES = Number(process.env.EVAL_ONE_TIME_TEST_WINDOW_START_MINUTES || 15); // 10:10 AM ET
const ONE_TIME_TEST_WINDOW_END_MINUTES = Number(process.env.EVAL_ONE_TIME_TEST_WINDOW_END_MINUTES || 8 * 60 + 45); // 6:40 PM ET
const NIGHTLY_WINDOW_START_MINUTES = Number(process.env.EVAL_PRECOMPUTE_WINDOW_START_MINUTES || DEFAULT_NIGHTLY_WINDOW_START_MINUTES);
const NIGHTLY_WINDOW_END_MINUTES = Number(process.env.EVAL_PRECOMPUTE_WINDOW_END_MINUTES || DEFAULT_NIGHTLY_WINDOW_END_MINUTES);
const TECH_WINDOW_START_MINUTES = Number(process.env.EVAL_TECH_REFRESH_WINDOW_START_MINUTES || 9 * 60 + 15); // 8:00 AM ET
const TECH_WINDOW_END_MINUTES = Number(process.env.EVAL_TECH_REFRESH_WINDOW_END_MINUTES || 9 * 60 + 30); // 8:30 AM ET
const BATCH_SIZE = Number(process.env.EVAL_PRECOMPUTE_BATCH_SIZE || 500);
const WEEKLY_SIZE = Number(process.env.EVAL_PRECOMPUTE_WEEKLY_SIZE || 3500);
const TICKER_INTERVAL_MS = Math.max(15_000, Number(process.env.EVAL_PRECOMPUTE_TICKER_INTERVAL_MS || 60_000));
const TECH_TICKER_INTERVAL_MS = Math.max(100, Number(process.env.EVAL_TECH_REFRESH_TICKER_INTERVAL_MS || 250));
const LOOP_INTERVAL_MS = Math.max(15_000, Number(process.env.EVAL_PRECOMPUTE_LOOP_INTERVAL_MS || 30_000));
const ENABLED = String(process.env.EVAL_PRECOMPUTE_ENABLED || "false").toLowerCase() === "true";
const TECH_ENABLED = String(process.env.EVAL_TECH_REFRESH_ENABLED || "true").toLowerCase() !== "false";
let running = false;
let techRunning = false;
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

function getEtDateKey(date = new Date()) {
  return etParts(date).dateKey;
}

function previousEtDateKey(date = new Date()) {
  return getEtDateKey(new Date(date.getTime() - 24 * 60 * 60 * 1000));
}

function activePrecomputeWindow() {
  const now = new Date();
  const parts = etParts(now);
  if (ONE_TIME_TEST_WINDOW_ENABLED && parts.dateKey === ONE_TIME_TEST_WINDOW_DATE) {
    return {
      startMinutes: ONE_TIME_TEST_WINDOW_START_MINUTES,
      endMinutes: ONE_TIME_TEST_WINDOW_END_MINUTES,
      label: "12:15 AM-8:45 AM ET one-time test window",
      oneTime: true,
    };
  }

  return {
    startMinutes: NIGHTLY_WINDOW_START_MINUTES,
    endMinutes: NIGHTLY_WINDOW_END_MINUTES,
    label: "11:00 PM-7:30 AM ET",
    oneTime: false,
  };
}

function isInsideWindow(startMinutes, endMinutes) {
  const { minutes } = etParts();
  if (startMinutes <= endMinutes) return minutes >= startMinutes && minutes < endMinutes;
  return minutes >= startMinutes || minutes < endMinutes;
}

function operationalBatchDateKey(startMinutes, endMinutes) {
  const now = new Date();
  const { dateKey, minutes } = etParts(now);
  // For overnight windows such as 11:00 PM-7:30 AM, the after-midnight portion
  // belongs to the previous evening's batch instead of accidentally starting a new batch.
  if (startMinutes > endMinutes && minutes < endMinutes) return previousEtDateKey(now);
  return dateKey;
}

function isInsidePrecomputeWindow() {
  const window = activePrecomputeWindow();
  return isInsideWindow(window.startMinutes, window.endMinutes);
}

function isInsideTechRefreshWindow() {
  return isInsideWindow(TECH_WINDOW_START_MINUTES, TECH_WINDOW_END_MINUTES);
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
    return raw.split(/\r?\n/g).map((line) => line.split(",")[0]).map(cleanPrecomputeTicker).filter(Boolean);
  } catch (error) {
    console.warn("Precompute universe file failed:", error?.message || error);
    return [];
  }
}

export function getPrecomputeUniverse() {
  const overrideTickers = String(process.env.EVAL_PRECOMPUTE_OVERRIDE_TICKERS || "").split(",").map(cleanPrecomputeTicker).filter(Boolean);
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
  const window = activePrecomputeWindow();
  const dateKey = operationalBatchDateKey(window.startMinutes, window.endMinutes);
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

function technicalRefreshCursor() {
  const universe = getPrecomputeUniverse();
  const window = activePrecomputeWindow();
  const dateKey = operationalBatchDateKey(window.startMinutes, window.endMinutes);
  const current = getPrecomputeState();
  let techCursor = Number(current.techCursor || 0);
  if (current.lastTechRefreshDate !== dateKey) {
    techCursor = 0;
    updatePrecomputeState({ lastTechRefreshDate: dateKey, techCursor });
  }
  return { universe, techCursor, dateKey };
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
    refreshNews: false,
    refreshRisk: false,
    refreshProfile: true,
    includeAiScoreSummary: false,
    precomputeMode: true,
  });
  putPrecomputedReport(symbol, report);
  return report;
}

async function refreshOneTechnical(symbol) {
  const current = getPrecomputedReport(symbol);
  const report = await buildDailyTechnicalRefresh(symbol, current);
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
    updatePrecomputeState({ lastBatchDate: dateKey, dayCursor: nextDayCursor, weekCursor: nextWeekCursor, lastRunAt: new Date().toISOString(), lastSymbol: symbol });
    await sleep(TICKER_INTERVAL_MS);
  } finally {
    running = false;
  }
}

async function runTechnicalRefreshLoopOnce() {
  if (!ENABLED || !TECH_ENABLED || techRunning || !isInsideTechRefreshWindow()) return;
  techRunning = true;
  try {
    const { universe, techCursor, dateKey } = technicalRefreshCursor();
    if (!universe.length || techCursor >= universe.length) return;
    const symbol = universe[techCursor];
    console.log(`[tech-refresh] ${dateKey} ${techCursor + 1}/${universe.length}: ${symbol}`);
    try {
      await refreshOneTechnical(symbol);
    } catch (error) {
      console.warn(`[tech-refresh] failed ${symbol}:`, error?.message || error);
    }
    updatePrecomputeState({ lastTechRefreshDate: dateKey, techCursor: techCursor + 1, lastTechRefreshAt: new Date().toISOString(), lastTechSymbol: symbol });
    await sleep(TECH_TICKER_INTERVAL_MS);
  } finally {
    techRunning = false;
  }
}

export function startPrecomputeWorker() {
  if (!ENABLED) {
    console.log("[precompute] disabled. Set EVAL_PRECOMPUTE_ENABLED=true to turn on database refresh.");
    return null;
  }
  if (timer) return timer;
  const window = activePrecomputeWindow();
  console.log(`[precompute] enabled. Fundamentals window ${window.label}, ${BATCH_SIZE}/day, ${WEEKLY_SIZE}/week cap. Tech refresh 9:15-9:30 AM ET.`);
  timer = setInterval(() => {
    runPrecomputeLoopOnce();
    runTechnicalRefreshLoopOnce();
  }, LOOP_INTERVAL_MS);
  setTimeout(() => { runPrecomputeLoopOnce(); runTechnicalRefreshLoopOnce(); }, 5000);
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

export async function runTechnicalRefreshNow(symbols = []) {
  const cleaned = [...new Set(symbols.map(cleanPrecomputeTicker).filter(Boolean))];
  const results = [];
  for (const symbol of cleaned) {
    try {
      const report = await refreshOneTechnical(symbol);
      results.push({ symbol, ok: true, score: report?.grades?.edgeScore ?? null });
      await sleep(TECH_TICKER_INTERVAL_MS);
    } catch (error) {
      results.push({ symbol, ok: false, error: error?.message || "failed" });
    }
  }
  return results;
}
