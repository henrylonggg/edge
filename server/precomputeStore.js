import fs from "fs";
import path from "path";

const DAY_MS = 24 * 60 * 60 * 1000;
const STORE_PATH = process.env.EVAL_PRECOMPUTE_STORE_PATH || path.join(process.cwd(), "data", "eval-precomputed-reports.json");
const STATE_PATH = process.env.EVAL_PRECOMPUTE_STATE_PATH || path.join(process.cwd(), "data", "eval-precompute-state.json");
const MAX_REPORTS = Number(process.env.EVAL_PRECOMPUTE_MAX_REPORTS || 4000);
const REPORT_TTL_MS = Number(process.env.EVAL_PRECOMPUTE_REPORT_TTL_MS || 8 * DAY_MS);
const DATABASE_URL = process.env.DATABASE_URL || "";

let reports = new Map();
let state = { weekCursor: 0, dayCursor: 0, techCursor: 0, lastBatchDate: "", lastTechRefreshDate: "" };
let pgPoolPromise = null;
let dbReadyPromise = null;

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

function saveReportsLocal() {
  try {
    ensureDir(STORE_PATH);
    const ordered = [...reports.entries()]
      .sort(([, a], [, b]) => Number(b?.savedAt || 0) - Number(a?.savedAt || 0))
      .slice(0, MAX_REPORTS);
    reports = new Map(ordered);
    fs.writeFileSync(STORE_PATH, JSON.stringify(Object.fromEntries(reports), null, 2));
  } catch (error) {
    console.warn("Precompute local report store save failed:", error?.message || error);
  }
}

function saveStateLocal() {
  try {
    ensureDir(STATE_PATH);
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  } catch (error) {
    console.warn("Precompute local state save failed:", error?.message || error);
  }
}

async function getPgPool() {
  if (!DATABASE_URL) return null;
  if (!pgPoolPromise) {
    pgPoolPromise = import("pg")
      .then(({ Pool }) => new Pool({
        connectionString: DATABASE_URL,
        ssl: process.env.DATABASE_URL_SSL === "false" ? false : { rejectUnauthorized: false },
        max: Number(process.env.EVAL_DB_POOL_MAX || 5),
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
      }))
      .catch((error) => {
        console.warn("Postgres unavailable. Falling back to local store:", error?.message || error);
        return null;
      });
  }
  return pgPoolPromise;
}

async function ensureDatabaseTables() {
  const pool = await getPgPool();
  if (!pool) return false;
  await pool.query(`
    create table if not exists precomputed_reports (
      symbol text primary key,
      report jsonb not null,
      saved_at timestamptz not null default now(),
      fundamentals_updated_at timestamptz,
      technicals_updated_at timestamptz,
      updated_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    create table if not exists precompute_state (
      id text primary key,
      state jsonb not null,
      updated_at timestamptz not null default now()
    );
  `);
  return true;
}

async function loadFromDatabase() {
  const ready = await ensureDatabaseTables();
  if (!ready) return false;
  const pool = await getPgPool();
  const cutoff = new Date(Date.now() - REPORT_TTL_MS).toISOString();
  const reportRows = await pool.query(
    `select symbol, report, extract(epoch from saved_at) * 1000 as saved_ms
       from precomputed_reports
      where saved_at >= $1
      order by saved_at desc
      limit $2`,
    [cutoff, MAX_REPORTS]
  );
  reports = new Map(
    reportRows.rows.map((row) => [
      cleanPrecomputeTicker(row.symbol),
      { savedAt: Number(row.saved_ms || Date.now()), report: row.report },
    ])
  );

  const stateRows = await pool.query(`select state from precompute_state where id = 'main' limit 1`);
  if (stateRows.rows[0]?.state) state = { ...state, ...stateRows.rows[0].state };
  console.log(`[precompute-store] loaded ${reports.size} reports from Supabase/Postgres`);
  return true;
}

async function saveReportDatabase(symbol, entry) {
  const pool = await getPgPool();
  if (!pool || !entry?.report) return false;
  const report = entry.report;
  const savedAtDate = new Date(Number(entry.savedAt || Date.now()));
  const fundamentalsAt = report?.fundamentalsUpdatedAt || report?.fundamentalsRefreshedAt || report?.precomputedAt || savedAtDate.toISOString();
  const technicalsAt = report?.technicalsUpdatedAt || report?.technicalRefreshedAt || report?.precomputedAt || savedAtDate.toISOString();
  await pool.query(
    `insert into precomputed_reports (symbol, report, saved_at, fundamentals_updated_at, technicals_updated_at, updated_at)
     values ($1, $2::jsonb, $3, $4, $5, now())
     on conflict (symbol) do update set
       report = excluded.report,
       saved_at = excluded.saved_at,
       fundamentals_updated_at = excluded.fundamentals_updated_at,
       technicals_updated_at = excluded.technicals_updated_at,
       updated_at = now()`,
    [symbol, JSON.stringify(report), savedAtDate.toISOString(), fundamentalsAt, technicalsAt]
  );
  return true;
}

async function saveStateDatabase() {
  const pool = await getPgPool();
  if (!pool) return false;
  await pool.query(
    `insert into precompute_state (id, state, updated_at)
     values ('main', $1::jsonb, now())
     on conflict (id) do update set state = excluded.state, updated_at = now()`,
    [JSON.stringify(state)]
  );
  return true;
}

export function loadPrecomputeStore() {
  const rawReports = safeReadJson(STORE_PATH, {});
  reports = new Map(Object.entries(rawReports || {}).map(([k, v]) => [String(k).toUpperCase(), v]));
  state = { ...state, ...safeReadJson(STATE_PATH, {}) };

  if (DATABASE_URL) {
    dbReadyPromise = loadFromDatabase().catch((error) => {
      console.warn("Precompute database load failed. Using local cache fallback:", error?.message || error);
      return false;
    });
  }
}

export async function waitForPrecomputeStoreReady() {
  if (dbReadyPromise) await dbReadyPromise;
  return true;
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
  const entry = { savedAt, report: { ...report, symbol: ticker, precomputedAt: new Date(savedAt).toISOString() } };
  reports.set(ticker, entry);

  // Local backup is optional; the persistent source of truth is DATABASE_URL when set.
  saveReportsLocal();
  saveReportDatabase(ticker, entry).catch((error) => {
    console.warn(`[precompute-store] database save failed for ${ticker}:`, error?.message || error);
  });

  return { symbol: ticker, savedAt };
}

export function getAllPrecomputedReports() {
  return [...reports.entries()]
    .map(([symbol, entry]) => ({
      symbol,
      savedAt: entry?.savedAt || null,
      updatedAt: entry?.savedAt ? new Date(entry.savedAt).toISOString() : "",
      report: entry?.report || null,
      companyName: entry?.report?.profile?.name || entry?.report?.companyName || entry?.report?.name || "",
      evalScore: entry?.report?.grades?.edgeScore ?? entry?.report?.evalScore ?? null,
      profitability: entry?.report?.grades?.categories?.profitability ?? null,
      financialHealth: entry?.report?.grades?.categories?.financialHealth ?? null,
      valuation: entry?.report?.grades?.categories?.valuation ?? null,
      growth: entry?.report?.grades?.categories?.growth ?? null,
      momentum: entry?.report?.grades?.categories?.momentum ?? null,
      pullback: entry?.report?.grades?.categories?.pullback ?? null,
    }))
    .sort((a, b) => String(a.symbol).localeCompare(String(b.symbol)));
}

export function getPrecomputeState() {
  return {
    ...state,
    storedReports: reports.size,
    databaseConfigured: Boolean(DATABASE_URL),
  };
}

export function updatePrecomputeState(patch = {}) {
  state = { ...state, ...patch };
  saveStateLocal();
  saveStateDatabase().catch((error) => {
    console.warn("[precompute-store] database state save failed:", error?.message || error);
  });
  return getPrecomputeState();
}

loadPrecomputeStore();
