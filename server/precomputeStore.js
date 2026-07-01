import fs from "fs";
import path from "path";

const DAY_MS = 24 * 60 * 60 * 1000;
const STORE_PATH = process.env.EVAL_PRECOMPUTE_STORE_PATH || path.join(process.cwd(), "data", "eval-precomputed-reports.json");
const STATE_PATH = process.env.EVAL_PRECOMPUTE_STATE_PATH || path.join(process.cwd(), "data", "eval-precompute-state.json");
const MAX_REPORTS = Number(process.env.EVAL_PRECOMPUTE_MAX_REPORTS || 4000);
const REPORT_TTL_MS = Number(process.env.EVAL_PRECOMPUTE_REPORT_TTL_MS || 8 * DAY_MS);

let reports = new Map();
let state = { weekCursor: 0, dayCursor: 0, lastBatchDate: "" };

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function safeReadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveReports() {
  try {
    ensureDir(STORE_PATH);
    const ordered = [...reports.entries()]
      .sort(([, a], [, b]) => Number(b?.savedAt || 0) - Number(a?.savedAt || 0))
      .slice(0, MAX_REPORTS);
    reports = new Map(ordered);
    fs.writeFileSync(STORE_PATH, JSON.stringify(Object.fromEntries(reports), null, 2));
  } catch (error) {
    console.warn("Precompute report store save failed:", error?.message || error);
  }
}

function saveState() {
  try {
    ensureDir(STATE_PATH);
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  } catch (error) {
    console.warn("Precompute state save failed:", error?.message || error);
  }
}

export function loadPrecomputeStore() {
  const rawReports = safeReadJson(STORE_PATH, {});
  reports = new Map(Object.entries(rawReports || {}).map(([k, v]) => [String(k).toUpperCase(), v]));
  state = { ...state, ...safeReadJson(STATE_PATH, {}) };
}

export function cleanPrecomputeTicker(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "").slice(0, 16);
}

export function getPrecomputedReport(symbol) {
  const ticker = cleanPrecomputeTicker(symbol);
  if (!ticker) return null;
  const entry = reports.get(ticker);
  if (!entry?.report) return null;
  const savedAt = Number(entry.savedAt || 0);
  if (!savedAt || Date.now() - savedAt > REPORT_TTL_MS) return null;
  return {
    ...entry.report,
    precomputed: true,
    precomputedAt: new Date(savedAt).toISOString(),
  };
}

export function putPrecomputedReport(symbol, report) {
  const ticker = cleanPrecomputeTicker(symbol || report?.symbol);
  if (!ticker || !report) return null;
  const savedAt = Date.now();
  reports.set(ticker, { savedAt, report: { ...report, symbol: ticker } });
  saveReports();
  return { symbol: ticker, savedAt };
}

export function getPrecomputeState() {
  return { ...state, storedReports: reports.size };
}

export function updatePrecomputeState(patch = {}) {
  state = { ...state, ...patch };
  saveState();
  return getPrecomputeState();
}

loadPrecomputeStore();
