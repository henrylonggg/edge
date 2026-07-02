/*
  Replacement precomputeWorker.js behavior for one-time first-500 refresh:
  - One-time run starts today at 10:15 AM ET.
  - It continues until the 500-stock batch is complete, even after normal window end.
  - Quote-first and cached-report/missing-only behavior should be handled inside buildStockAnalysis.
  - Future normal schedule remains 11:00 PM–7:30 AM ET.
*/

import fs from "fs";
import path from "path";
import { buildStockAnalysis } from "./score.js";
import {
  cleanPrecomputeTicker,
  getPrecomputeState,
  getPrecomputedReport,
  putPrecomputedReport,
  updatePrecomputeState,
} from "./precomputeStore.js";

const DEFAULT_UNIVERSE = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "AVGO", "JPM", "LLY"];
const DEFAULT_UNIVERSE_PATH = path.join(path.dirname(new URL(import.meta.url).pathname), "data", "universe.json");

const DEFAULT_NIGHTLY_WINDOW_START_MINUTES = 23 * 60; // 11:00 PM ET
const DEFAULT_NIGHTLY_WINDOW_END_MINUTES = 7 * 60 + 30; // 7:30 AM ET

const ONE_TIME_TEST_WINDOW_ENABLED = String(process.env.EVAL_ONE_TIME_TEST_WINDOW_ENABLED || "true").toLowerCase() !== "false";
const ONE_TIME_TEST_WINDOW_DATE = process.env.EVAL_ONE_TIME_TEST_WINDOW_DATE || new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const ONE_TIME_TEST_WINDOW_START_MINUTES = Number(process.env.EVAL_ONE_TIME_TEST_WINDOW_START_MINUTES || (10 * 60 + 15)); // 10:15 AM ET
const ONE_TIME_RUN_UNTIL_DONE = String(process.env.EVAL_ONE_TIME_RUN_UNTIL_DONE || "true").toLowerCase() !== "false";

const NIGHTLY_WINDOW_START_MINUTES = Number(process.env.EVAL_PRECOMPUTE_WINDOW_START_MINUTES || DEFAULT_NIGHTLY_WINDOW_START_MINUTES);
const NIGHTLY_WINDOW_END_MINUTES = Number(process.env.EVAL_PRECOMPUTE_WINDOW_END_MINUTES || DEFAULT_NIGHTLY_WINDOW_END_MINUTES);
const BATCH_SIZE = Number(process.env.EVAL_PRECOMPUTE_BATCH_SIZE || 500);
const WEEKLY_SIZE = Number(process.env.EVAL_PRECOMPUTE_WEEKLY_SIZE || 3500);
const TICKER_INTERVAL_MS = Math.max(15_000, Number(process.env.EVAL_PRECOMPUTE_TICKER_INTERVAL_MS || 120_000));
const TICKER_TIMEOUT_MS = Math.max(60_000, Number(process.env.EVAL_PRECOMPUTE_TICKER_TIMEOUT_MS || 120_000));
const LOOP_INTERVAL_MS = Math.max(15_000, Number(process.env.EVAL_PRECOMPUTE_LOOP_INTERVAL_MS || 30_000));
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

function previousEtDateKey(date = new Date()) {
  const prior = new Date(date.getTime() - 24 * 60 * 60 * 1000);
  return etParts(prior).dateKey;
}

function isInsideWindow(startMinutes, endMinutes) {
  const { minutes } = etParts();
  if (startMinutes <= endMinutes) return minutes >= startMinutes && minutes < endMinutes;
  return minutes >= startMinutes || minutes < endMinutes;
}

function activePrecomputeWindow() {
  const parts = etParts();
  if (ONE_TIME_TEST_WINDOW_ENABLED && parts.dateKey === ONE_TIME_TEST_WINDOW_DATE) {
    return {
      startMinutes: ONE_TIME_TEST_WINDOW_START_MINUTES,
      endMinutes: 24 * 60,
      label: "10:15 AM ET one-time first-500 run until done",
      oneTime: true,
      runUntilDone: ONE_TIME_RUN_UNTIL_DONE,
    };
  }
  return {
    startMinutes: NIGHTLY_WINDOW_START_MINUTES,
    endMinutes: NIGHTLY_WINDOW_END_MINUTES,
    label: "11:00 PM-7:30 AM ET",
    oneTime: false,
    runUntilDone: false,
  };
}

function operationalBatchDateKey(startMinutes, endMinutes) {
  const now = new Date();
  const { dateKey, minutes } = etParts(now);
  if (startMinutes > endMinutes && minutes < endMinutes) return previousEtDateKey(now);
  return dateKey;
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
  const dateKey = window.oneTime ? `${ONE_TIME_TEST_WINDOW_DATE}-one-time-1015am` : operationalBatchDateKey(window.startMinutes, window.endMinutes);
  const current = getPrecomputeState();
  let weekCursor = window.oneTime ? 0 : Number(current.weekCursor || 0);
  let dayCursor = Number(current.dayCursor || 0);

  if (current.lastBatchDate !== dateKey) {
    dayCursor = 0;
    weekCursor = window.oneTime ? 0 : (weekCursor >= universe.length ? 0 : weekCursor);
    updatePrecomputeState({ lastBatchDate: dateKey, dayCursor, weekCursor });
  }

  const batch = universe.slice(weekCursor, Math.min(weekCursor + BATCH_SIZE, universe.length));
  return { batch, dayCursor, weekCursor, universeSize: universe.length, dateKey, window };
}

function shouldRunPrecompute() {
  const window = activePrecomputeWindow();
  const state = getPrecomputeState();
  const batchKey = window.oneTime ? `${ONE_TIME_TEST_WINDOW_DATE}-one-time-1015am` : operationalBatchDateKey(window.startMinutes, window.endMinutes);
  const { minutes } = etParts();

  if (window.oneTime && window.runUntilDone && state.lastBatchDate === batchKey) {
    const cursor = Number(state.dayCursor || 0);
    if (cursor > 0 && cursor < BATCH_SIZE) return true;
  }

  if (window.oneTime) return minutes >= window.startMinutes;
  return isInsideWindow(window.startMinutes, window.endMinutes);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout(promise, ms, label) {
  let timerId;
  const timeout = new Promise((_, reject) => {
    timerId = setTimeout(() => reject(new Error(`${label || "operation"} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timerId);
  }
}

async function computeOne(symbol) {
  const cachedReport = getPrecomputedReport(symbol);
  const report = await buildStockAnalysis(symbol, {
    cachedReport,
    quoteFirst: true,
    refreshMissingOnly: true,
    staggerApiUsage: true,
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

async function runPrecomputeLoopOnce() {
  if (!ENABLED || running || !shouldRunPrecompute()) return;
  running = true;
  try {
    const { batch, dayCursor, weekCursor, universeSize, dateKey, window } = todaysBatch();
    if (!batch.length || dayCursor >= batch.length) {
      if (window.oneTime) console.log(`[precompute] one-time batch complete: ${dateKey}`);
      return;
    }

    const symbol = batch[dayCursor];
    const startedAt = Date.now();
    console.log(`[precompute] ${dateKey} ${dayCursor + 1}/${batch.length}: ${symbol} quote-first`);
    try {
      await withTimeout(computeOne(symbol), TICKER_TIMEOUT_MS, `[precompute] ${symbol}`);
    } catch (error) {
      console.warn(`[precompute] failed ${symbol}:`, error?.message || error);
    }

    const nextDayCursor = dayCursor + 1;
    const finishedBatch = nextDayCursor >= batch.length;
    const nextWeekCursor = window.oneTime
      ? 0
      : (finishedBatch ? (weekCursor + BATCH_SIZE >= universeSize ? 0 : weekCursor + BATCH_SIZE) : weekCursor);

    updatePrecomputeState({
      lastBatchDate: dateKey,
      dayCursor: nextDayCursor,
      weekCursor: nextWeekCursor,
      lastRunAt: new Date().toISOString(),
      lastSymbol: symbol,
      oneTimeRunDone: window.oneTime && finishedBatch,
    });

    const elapsed = Date.now() - startedAt;
    const remainingSpacing = Math.max(0, TICKER_INTERVAL_MS - elapsed);
    if (remainingSpacing > 0) await sleep(remainingSpacing);
  } finally {
    running = false;
  }
}

export function startPrecomputeWorker() {
  if (!ENABLED) {
    console.log("[precompute] disabled. Set EVAL_PRECOMPUTE_ENABLED=true to turn on database refresh.");
    return null;
  }
  if (timer) return timer;
  const window = activePrecomputeWindow();
  console.log(`[precompute] enabled. Fundamentals window ${window.label}, ${BATCH_SIZE}/day, ${WEEKLY_SIZE}/week cap. Interval ${TICKER_INTERVAL_MS}ms, timeout ${TICKER_TIMEOUT_MS}ms.`);
  timer = setInterval(() => {
    runPrecomputeLoopOnce();
  }, LOOP_INTERVAL_MS);
  setTimeout(() => { runPrecomputeLoopOnce(); }, 5000);
  return timer;
}

export async function runPrecomputeNow(symbols = []) {
  const cleaned = [...new Set(symbols.map(cleanPrecomputeTicker).filter(Boolean))];
  const results = [];
  for (const symbol of cleaned) {
    try {
      const report = await withTimeout(computeOne(symbol), TICKER_TIMEOUT_MS, `[manual-precompute] ${symbol}`);
      results.push({ symbol, ok: true, score: report?.grades?.edgeScore ?? null });
      await sleep(TICKER_INTERVAL_MS);
    } catch (error) {
      results.push({ symbol, ok: false, error: error?.message || "failed" });
    }
  }
  return results;
}

export async function runTechnicalRefreshNow(symbols = []) {
  return runPrecomputeNow(symbols);
}
