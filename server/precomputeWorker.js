/*
  Continuous Supabase precompute worker

  Behavior:
  - Runs one stock every 3 minutes.
  - Walks through a fixed universe of up to 3,500 tickers in order.
  - Stores each completed report through precomputeStore/Supabase.
  - Keeps running until the full 3,500 are complete, which is about 7.3 days at 3 minutes each.
  - When the last ticker finishes, the cursor resets to 0 and the next cycle starts again at ticker 1.
  - No nightly window, no one-time window, no batch stopping.
  - buildStockAnalysis still receives the previous stored report so its internal TTL/cache rules can avoid unnecessary Twelve Data calls.
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

const UNIVERSE_SIZE = Math.max(1, Number(process.env.EVAL_PRECOMPUTE_UNIVERSE_SIZE || 3500));
const TICKER_INTERVAL_MS = Math.max(60_000, Number(process.env.EVAL_PRECOMPUTE_TICKER_INTERVAL_MS || 180_000));
const TICKER_TIMEOUT_MS = Math.max(60_000, Number(process.env.EVAL_PRECOMPUTE_TICKER_TIMEOUT_MS || 170_000));
const LOOP_INTERVAL_MS = Math.max(10_000, Math.min(60_000, Number(process.env.EVAL_PRECOMPUTE_LOOP_INTERVAL_MS || 30_000)));
const ENABLED = String(process.env.EVAL_PRECOMPUTE_ENABLED || "false").toLowerCase() === "true";
const FORCE_REFRESH_PER_TICKER = String(process.env.EVAL_PRECOMPUTE_FORCE_REFRESH || "false").toLowerCase() === "true";

let running = false;
let timer = null;
let nextRunAt = 0;

function nowIso() {
  return new Date().toISOString();
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
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(",")[0])
      .map(cleanPrecomputeTicker)
      .filter(Boolean);
  } catch (error) {
    console.warn("[precompute] universe file failed:", error?.message || error);
    return [];
  }
}

export function getPrecomputeUniverse() {
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
    if (fixedUnique.length >= UNIVERSE_SIZE) break;
  }

  return fixedUnique;
}

function clampCursor(cursor, universeLength) {
  const n = Number(cursor);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (!universeLength) return 0;
  return Math.floor(n) % universeLength;
}

function getContinuousState(universeLength) {
  const state = getPrecomputeState() || {};
  const cursor = clampCursor(state.continuousCursor ?? state.dayCursor ?? 0, universeLength);
  const cycle = Math.max(1, Number(state.continuousCycle || state.cycle || 1));
  return { state, cursor, cycle };
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
    precomputeMode: true,
    includeAiScoreSummary: false,
    refreshNews: false,
    refreshRisk: false,

    // The worker controls pacing. score.js should still decide which Twelve Data
    // endpoint data is stale based on its metric TTLs.
    refreshMissingOnly: !FORCE_REFRESH_PER_TICKER,
    quoteFirst: false,
    staggerApiUsage: true,

    refreshFundamentals: true,
    refreshValuation: true,
    refreshMarket: true,
    refreshProfile: true,
  });

  putPrecomputedReport(symbol, report);
  return report;
}

async function runPrecomputeLoopOnce() {
  if (!ENABLED || running) return;

  const now = Date.now();
  if (nextRunAt && now < nextRunAt) return;

  running = true;
  try {
    const universe = getPrecomputeUniverse();
    if (!universe.length) {
      console.warn("[precompute] no tickers available. Check EVAL_PRECOMPUTE_UNIVERSE_PATH or EVAL_PRECOMPUTE_OVERRIDE_TICKERS.");
      nextRunAt = Date.now() + TICKER_INTERVAL_MS;
      return;
    }

    const { cursor, cycle } = getContinuousState(universe.length);
    const symbol = universe[cursor];
    const startedAt = Date.now();

    console.log(`[precompute] cycle ${cycle} ${cursor + 1}/${universe.length}: ${symbol}`);

    let ok = false;
    let score = null;
    let errorMessage = null;

    try {
      const report = await withTimeout(computeOne(symbol), TICKER_TIMEOUT_MS, `[precompute] ${symbol}`);
      score = report?.grades?.edgeScore ?? report?.score ?? null;
      ok = true;
    } catch (error) {
      errorMessage = error?.message || "failed";
      console.warn(`[precompute] failed ${symbol}:`, errorMessage);
    }

    const elapsed = Date.now() - startedAt;
    const nextCursorRaw = cursor + 1;
    const finishedCycle = nextCursorRaw >= universe.length;
    const nextCursor = finishedCycle ? 0 : nextCursorRaw;
    const nextCycle = finishedCycle ? cycle + 1 : cycle;

    updatePrecomputeState({
      continuousMode: true,
      continuousCursor: nextCursor,
      continuousCycle: nextCycle,
      dayCursor: nextCursor,
      weekCursor: 0,
      lastRunAt: nowIso(),
      lastSymbol: symbol,
      lastSymbolIndex: cursor,
      lastUniverseSize: universe.length,
      lastCycleCompletedAt: finishedCycle ? nowIso() : undefined,
      lastResultOk: ok,
      lastResultScore: score,
      lastError: errorMessage,
    });

    nextRunAt = Date.now() + Math.max(0, TICKER_INTERVAL_MS - elapsed);

    if (finishedCycle) {
      console.log(`[precompute] completed cycle ${cycle}. Restarting at ticker 1 in ${Math.round(TICKER_INTERVAL_MS / 1000)} seconds.`);
    }
  } finally {
    running = false;
  }
}

export function startPrecomputeWorker() {
  if (!ENABLED) {
    console.log("[precompute] disabled. Set EVAL_PRECOMPUTE_ENABLED=true to run one ticker every 3 minutes.");
    return null;
  }

  if (timer) return timer;

  const universe = getPrecomputeUniverse();
  const estimatedDays = (universe.length * TICKER_INTERVAL_MS) / (24 * 60 * 60 * 1000);

  console.log(
    `[precompute] enabled. Continuous Supabase refresh: ${universe.length} stocks, one ticker every ${Math.round(TICKER_INTERVAL_MS / 1000)} seconds, estimated ${estimatedDays.toFixed(2)} days per full cycle.`,
  );

  timer = setInterval(() => {
    runPrecomputeLoopOnce();
  }, LOOP_INTERVAL_MS);

  setTimeout(() => {
    runPrecomputeLoopOnce();
  }, 5000);

  return timer;
}

export async function runPrecomputeNow(symbols = []) {
  const cleaned = [...new Set(symbols.map(cleanPrecomputeTicker).filter(Boolean))];
  const results = [];

  for (const symbol of cleaned) {
    try {
      const report = await withTimeout(computeOne(symbol), TICKER_TIMEOUT_MS, `[manual-precompute] ${symbol}`);
      results.push({ symbol, ok: true, score: report?.grades?.edgeScore ?? report?.score ?? null });
    } catch (error) {
      results.push({ symbol, ok: false, error: error?.message || "failed" });
    }

    await sleep(TICKER_INTERVAL_MS);
  }

  return results;
}

export async function runTechnicalRefreshNow(symbols = []) {
  return runPrecomputeNow(symbols);
}
