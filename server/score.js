// Eval update: Twelve Data database-only scoring. UI reads stored reports; nightly worker refreshes metrics.
const TWELVE_DATA_BASE_URL = "https://api.twelvedata.com";
const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";
const MASSIVE_BASE_URL = "https://api.massive.com";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const NEWS_SENTIMENT_MODEL = process.env.OPENAI_NEWS_MODEL || "gpt-4.1-nano";

const CATEGORY_LABELS = {
  growth: "Growth",
  profitability: "Profitability",
  financialHealth: "Financial Health",
  valuation: "Valuation",
    momentum: "Momentum",
  pullback: "Pullback",
};

const PROVIDER_TIMEOUT_MS = Number(process.env.PROVIDER_TIMEOUT_MS || 4500);
const DAY_MS_SCORE = 24 * 60 * 60 * 1000;
const twelveProviderCache = new Map();
const twelveProviderInFlight = new Map();
const TWELVE_PROVIDER_CACHE_MAX = 1400;
const PERMANENT_IDENTITY_CACHE_MS_SCORE = 10 * 365 * DAY_MS_SCORE;
const DAILY_METRIC_CACHE_MS_SCORE = 1 * DAY_MS_SCORE;
const QUARTERLY_METRIC_CACHE_MS_SCORE = 120 * DAY_MS_SCORE;
const YEARLY_METRIC_CACHE_MS_SCORE = 180 * DAY_MS_SCORE;
const providerResponseCache = new Map();
const providerResponseInFlight = new Map();
const PROVIDER_RESPONSE_CACHE_MAX = 1800;

function providerApiKey(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value && String(value).trim()) return String(value).trim();
  }
  return "";
}

function stableProviderCacheKey(provider, endpoint, params = {}) {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b));
  return `${provider}:${endpoint}:${JSON.stringify(entries)}`;
}

function providerMetricTtlMs(provider, endpoint = "") {
  const lower = `${provider}:${endpoint}`.toLowerCase();
  if (lower.includes("profile") || lower.includes("logo")) return PERMANENT_IDENTITY_CACHE_MS_SCORE;
  if (lower.includes("quote") || lower.includes("time_series")) return scoreMarketQuoteCacheTtlMs();
  if (lower.includes("metric") || lower.includes("ratio") || lower.includes("key-metrics")) return 7 * DAY_MS_SCORE;
  if (lower.includes("financial") || lower.includes("income") || lower.includes("balance") || lower.includes("cash-flow") || lower.includes("statement")) return QUARTERLY_METRIC_CACHE_MS_SCORE;
  return DAILY_METRIC_CACHE_MS_SCORE;
}

async function fetchProviderJson(provider, baseUrl, endpoint, params = {}, timeoutMs = PROVIDER_TIMEOUT_MS) {
  if (!baseUrl || !endpoint) return null;
  const cacheKey = stableProviderCacheKey(provider, endpoint, params);
  const cached = providerResponseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  if (cached) providerResponseCache.delete(cacheKey);
  if (providerResponseInFlight.has(cacheKey)) return providerResponseInFlight.get(cacheKey);

  const promise = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = new URL(`${baseUrl}${endpoint}`);
      Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
      });
      const response = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "Eval/1.0" } });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.error || data?.Error || data?.['Error Message'] || data?.s === 'error') {
        console.warn(`${provider} request failed:`, response.status, endpoint, data?.error || data?.Error || data?.['Error Message'] || data?.message || "");
        return null;
      }
      providerResponseCache.set(cacheKey, { savedAt: Date.now(), expiresAt: Date.now() + providerMetricTtlMs(provider, endpoint), data });
      if (providerResponseCache.size > PROVIDER_RESPONSE_CACHE_MAX) providerResponseCache.delete(providerResponseCache.keys().next().value);
      return data;
    } catch (error) {
      console.warn(`${provider} optional fetch failed:`, error?.name === "AbortError" ? "timed out" : error?.message || error);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  })().finally(() => providerResponseInFlight.delete(cacheKey));

  providerResponseInFlight.set(cacheKey, promise);
  return promise;
}


function stableTwelveCacheKey(endpoint, params = {}) {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b));
  return `${endpoint}:${JSON.stringify(entries)}`;
}

function isPostMarketCloseEtScore() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const weekday = parts.find((part) => part.type === "weekday")?.value || "";
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  return !["Sat", "Sun"].includes(weekday) && (hour > 16 || (hour === 16 && minute >= 0));
}


function scoreMarketQuoteCacheTtlMs() {
  // One quote per symbol per market window. This prevents live price routes from burning credits
  // while still allowing a fresh value after the open/close window changes.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = map.weekday;
  const hour = Number(map.hour || 0);
  const minute = Number(map.minute || 0);
  const isTradingDay = !["Sat", "Sun"].includes(weekday);
  if (!isTradingDay) return 24 * 60 * 60 * 1000;
  if (hour < 9 || (hour === 9 && minute < 30)) return 6 * 60 * 60 * 1000;
  if (hour < 16) return 15 * 60 * 1000;
  return 18 * 60 * 60 * 1000;
}

function twelveProviderTtlMs(endpoint, params = {}) {
  const interval = String(params?.interval || "").toLowerCase();
  const period = String(params?.period || "").toLowerCase();

  if (endpoint === "/profile" || endpoint === "/logo") return PERMANENT_IDENTITY_CACHE_MS_SCORE;
  if (endpoint === "/quote" || endpoint === "/price") return scoreMarketQuoteCacheTtlMs();

  if (["/income_statement", "/balance_sheet", "/cash_flow"].includes(endpoint)) {
    if (period.includes("quarter")) return QUARTERLY_METRIC_CACHE_MS_SCORE;
    return YEARLY_METRIC_CACHE_MS_SCORE;
  }

  if (endpoint === "/earnings") return QUARTERLY_METRIC_CACHE_MS_SCORE;
  if (endpoint === "/statistics") return 30 * DAY_MS_SCORE;

  if (endpoint === "/time_series") return YEARLY_METRIC_CACHE_MS_SCORE;

  return DAILY_METRIC_CACHE_MS_SCORE;
}

function readTwelveProviderCache(endpoint, params = {}) {
  const key = stableTwelveCacheKey(endpoint, params);
  const cached = twelveProviderCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  if (cached) twelveProviderCache.delete(key);
  return undefined;
}

function writeTwelveProviderCache(endpoint, params = {}, data) {
  if (!data) return;
  const key = stableTwelveCacheKey(endpoint, params);
  twelveProviderCache.set(key, { savedAt: Date.now(), expiresAt: Date.now() + twelveProviderTtlMs(endpoint, params), data });
  if (twelveProviderCache.size > TWELVE_PROVIDER_CACHE_MAX) twelveProviderCache.delete(twelveProviderCache.keys().next().value);
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstNumber(...values) {
  for (const value of values) {
    const number = safeNumber(value);
    if (number !== null) return number;
  }
  return null;
}

function clamp(value, min = 0, max = 10) {
  const number = safeNumber(value);
  if (number === null) return null;
  return Math.max(min, Math.min(max, number));
}

function metric(value, suffix = "", source = "Multi-source", formula = "") {
  const number = safeNumber(value);
  return {
    value: number,
    suffix,
    source,
    formula,
  };
}

function metricsFromCachedReport(report) {
  const metrics = report?.metrics || {};
  const extracted = {};

  for (const [key, entry] of Object.entries(metrics)) {
    const value = safeNumber(entry?.value);
    if (value !== null) extracted[key] = value;
  }

  return extracted;
}

function divide(a, b) {
  const x = safeNumber(a);
  const y = safeNumber(b);
  if (x === null || y === null || y === 0) return null;
  return x / y;
}

function percentChange(latest, prior) {
  const l = safeNumber(latest);
  const p = safeNumber(prior);
  if (l === null || p === null || p === 0) return null;
  return ((l - p) / Math.abs(p)) * 100;
}

function annualizedGrowth(latest, prior, years) {
  const l = safeNumber(latest);
  const p = safeNumber(prior);
  const y = safeNumber(years);
  if (l === null || p === null || l <= 0 || p <= 0 || y === null || y <= 0) return null;
  return (Math.pow(l / p, 1 / y) - 1) * 100;
}

function setDerivedMetric(target, key, value) {
  if (scoreInputNumber(target?.[key]) === null && scoreInputNumber(value) !== null) {
    target[key] = value;
  }
}

function toMillions(value) {
  const n = safeNumber(value);
  return n === null ? null : n / 1_000_000;
}

function percentFromDecimal(value) {
  const n = scoreInputNumber(value);
  if (n === null) return null;
  return Math.abs(n) <= 1.5 ? n * 100 : n;
}

function scoreText(value) {
  const n = safeNumber(value);
  return n === null ? "N/A" : n.toFixed(1);
}

function twelveDataEnabled() {
  return Boolean(process.env.TWELVE_DATA_API_KEY || process.env.TWELVEDATA_API_KEY);
}

function twelveDataApiKey() {
  return process.env.TWELVE_DATA_API_KEY || process.env.TWELVEDATA_API_KEY || "";
}

async function fetchTwelveDataOptional(endpoint, params = {}) {
  const apiKey = twelveDataApiKey();
  if (!apiKey) return null;

  const cached = readTwelveProviderCache(endpoint, params);
  if (cached !== undefined) return cached;

  const requestKey = stableTwelveCacheKey(endpoint, params);
  if (twelveProviderInFlight.has(requestKey)) return twelveProviderInFlight.get(requestKey);

  const promise = (async () => {
    const url = new URL(`${TWELVE_DATA_BASE_URL}${endpoint}`);
    Object.entries({ ...params, apikey: apiKey }).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });

    const data = await fetchJsonOptional(url, "Twelve Data");
    if (!data || data?.status === "error" || data?.code || data?.message === "**symbol** not found") {
      if (data?.message) console.warn("Twelve Data returned message:", data.message);
      return null;
    }
    writeTwelveProviderCache(endpoint, params, data);
    return data;
  })().finally(() => twelveProviderInFlight.delete(requestKey));

  twelveProviderInFlight.set(requestKey, promise);
  return promise;
}

function cleanTwelveNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).replace(/[%,$]/g, "").replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
}

function normalizeTwelveQuote(data = {}) {
  const current = firstNumber(
    cleanTwelveNumber(data?.close),
    cleanTwelveNumber(data?.price),
    cleanTwelveNumber(data?.last),
    cleanTwelveNumber(data?.current)
  );
  const previousClose = firstNumber(
    cleanTwelveNumber(data?.previous_close),
    cleanTwelveNumber(data?.previousClose),
    cleanTwelveNumber(data?.prev_close)
  );
  const change = firstNumber(
    cleanTwelveNumber(data?.change),
    current !== null && previousClose !== null ? current - previousClose : null
  );
  const changePercent = firstNumber(
    cleanTwelveNumber(data?.percent_change),
    cleanTwelveNumber(data?.change_percent),
    cleanTwelveNumber(data?.percentChange),
    current !== null && previousClose !== null && previousClose > 0 ? ((current - previousClose) / previousClose) * 100 : null
  );

  if (current === null && changePercent === null) return null;

  return {
    c: current,
    d: change,
    dp: changePercent,
    h: firstNumber(cleanTwelveNumber(data?.high), cleanTwelveNumber(data?.day_high)),
    l: firstNumber(cleanTwelveNumber(data?.low), cleanTwelveNumber(data?.day_low)),
    o: firstNumber(cleanTwelveNumber(data?.open)),
    pc: previousClose,
  };
}

async function fetchTwelveDataQuote(symbol) {
  const data = await fetchTwelveDataOptional("/quote", { symbol });
  return normalizeTwelveQuote(data);
}

async function fetchTwelveDataProfile(symbol) {
  const data = await fetchTwelveDataOptional("/profile", { symbol });
  if (!data || typeof data !== "object") return null;
  return {
    ticker: data?.symbol || symbol,
    name: data?.name || data?.company_name || data?.companyName || symbol,
    finnhubIndustry: data?.industry || data?.sector || "Public company",
    marketCapitalization: toMillions(firstNumber(cleanTwelveNumber(data?.market_cap), cleanTwelveNumber(data?.marketCapitalization), cleanTwelveNumber(data?.market_capitalization))),
    exchange: data?.exchange || data?.exchange_short_name || "",
    currency: data?.currency || "",
    country: data?.country || "",
    weburl: data?.website || data?.weburl || "",
    logo: "",
  };
}

function normalizeTwelveSeriesRows(data) {
  return twelveList(data)
    .map((row) => ({
      date: row?.datetime || row?.date || row?.timestamp || "",
      datetime: row?.datetime || row?.date || row?.timestamp || "",
      close: cleanTwelveNumber(row?.close),
      high: cleanTwelveNumber(row?.high),
      low: cleanTwelveNumber(row?.low),
      open: cleanTwelveNumber(row?.open),
      volume: cleanTwelveNumber(row?.volume),
    }))
    .filter((row) => row.close !== null && row.close > 0)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function technicalMetricsFromRows(rows = [], mode = "daily") {
  const cleanRows = Array.isArray(rows) ? rows.filter((row) => safeNumber(row?.close) !== null && row.close > 0) : [];
  const latest = cleanRows.at(-1) || null;
  const current = latest?.close ?? null;
  const closes = cleanRows.map((row) => row.close);
  const back = (n) => cleanRows.length > n ? cleanRows[cleanRows.length - 1 - n]?.close ?? null : null;
  const ret = (n) => {
    const prior = back(n);
    return current !== null && prior !== null && prior > 0 ? ((current - prior) / prior) * 100 : null;
  };
  const trailing = mode === "weekly" ? cleanRows.slice(-52) : cleanRows.slice(-260);
  const highs = trailing.map((row) => safeNumber(row.high) ?? safeNumber(row.close)).filter((value) => value !== null);
  const lows = trailing.map((row) => safeNumber(row.low) ?? safeNumber(row.close)).filter((value) => value !== null);
  const weekHigh = highs.length ? Math.max(...highs) : null;
  const weekLow = lows.length ? Math.min(...lows) : null;

  return {
    currentPrice: current,
    priceReturn4Week: mode === "weekly" ? ret(4) : ret(20),
    priceReturn12Week: mode === "weekly" ? ret(12) : ret(60),
    priceReturn13Week: mode === "weekly" ? ret(13) : ret(65),
    priceReturn26Week: mode === "weekly" ? ret(26) : ret(130),
    priceReturn52Week: mode === "weekly" ? ret(52) : ret(260),
    rsi14: computeRsiFromCloses(closes, 14),
    weekHigh,
    weekLow,
    pullbackFromHigh: current !== null && weekHigh ? ((weekHigh - current) / weekHigh) * 100 : null,
    distanceFrom52WeekLow: current !== null && weekLow ? ((current - weekLow) / weekLow) * 100 : null,
  };
}

function mergeTechnicalMetrics(primary = {}, fallback = {}) {
  const out = { ...(fallback || {}) };
  for (const [key, value] of Object.entries(primary || {})) {
    if (safeNumber(value) !== null) out[key] = value;
  }
  return out;
}

async function fetchTwelveDataMarketData(symbol) {
  // Daily time_series is the primary technical source. If Twelve returns too few
  // daily rows for a ticker, retry with weekly bars so 12W/26W/52W momentum and
  // 52-week pullback still calculate instead of saving nulls to Supabase.
  const dailyData = await fetchTwelveDataOptional("/time_series", { symbol, interval: "1day", outputsize: 1300 });
  const dailyRows = normalizeTwelveSeriesRows(dailyData);
  const dailyMetrics = technicalMetricsFromRows(dailyRows, "daily");

  const needsWeeklyFallback = [
    dailyMetrics.priceReturn12Week,
    dailyMetrics.priceReturn26Week,
    dailyMetrics.priceReturn52Week,
    dailyMetrics.rsi14,
    dailyMetrics.pullbackFromHigh,
    dailyMetrics.distanceFrom52WeekLow,
  ].some((value) => safeNumber(value) === null);

  let weeklyRows = [];
  let weeklyMetrics = {};
  if (needsWeeklyFallback) {
    const weeklyData = await fetchTwelveDataOptional("/time_series", { symbol, interval: "1week", outputsize: 260 });
    weeklyRows = normalizeTwelveSeriesRows(weeklyData);
    weeklyMetrics = technicalMetricsFromRows(weeklyRows, "weekly");
  }

  const metrics = mergeTechnicalMetrics(dailyMetrics, weeklyMetrics);
  // Prefer the latest daily price if available, but keep weekly fallback values for missing returns.
  if (safeNumber(dailyMetrics.currentPrice) !== null) metrics.currentPrice = dailyMetrics.currentPrice;
  if (safeNumber(dailyMetrics.rsi14) !== null) metrics.rsi14 = dailyMetrics.rsi14;

  const latest = dailyRows.at(-1) || weeklyRows.at(-1) || null;
  const prev = dailyRows.length > 1 ? dailyRows[dailyRows.length - 2]?.close : (weeklyRows.length > 1 ? weeklyRows[weeklyRows.length - 2]?.close : null);
  const current = metrics.currentPrice ?? latest?.close ?? null;

  const missingCore = [metrics.priceReturn12Week, metrics.priceReturn26Week, metrics.priceReturn52Week, metrics.rsi14, metrics.pullbackFromHigh, metrics.distanceFrom52WeekLow]
    .filter((value) => safeNumber(value) === null).length;
  if (missingCore) {
    console.warn(`[technical] ${symbol} missing ${missingCore}/6 momentum/pullback inputs after time_series fallback. dailyRows=${dailyRows.length} weeklyRows=${weeklyRows.length}`);
  }

  return {
    rows: dailyRows.length ? dailyRows : weeklyRows,
    weeklyRows,
    quote: current !== null ? {
      c: current,
      d: safeNumber(prev) !== null ? current - prev : null,
      dp: safeNumber(prev) !== null && prev > 0 ? ((current - prev) / prev) * 100 : null,
      h: latest?.high ?? null,
      l: latest?.low ?? null,
      o: latest?.open ?? null,
      pc: prev,
    } : null,
    metrics,
    source: weeklyRows.length && needsWeeklyFallback ? "Twelve Data /time_series daily+weekly" : "Twelve Data /time_series daily",
  };
}
async function fetchJsonOptional(url, providerName) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.warn(`${providerName} request failed: ${response.status} ${url.pathname || ""}`);


      return null;
    }

    if (data?.error || data?.["Error Message"] || data?.["Note"]) {
      console.warn(`${providerName} returned an API message:`, data?.error || data?.["Error Message"] || data?.["Note"]);
      return null;
    }

    return data;
  } catch (error) {
    const message = error?.name === "AbortError" ? "timed out" : error?.message || error;
    console.warn(`${providerName} optional fetch failed:`, message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
function latestObject(list) {
  return Array.isArray(list) && list.length ? list[0] || {} : {};
}

function firstFmpNumber(object, ...keys) {
  for (const key of keys) {
    const value = safeNumber(object?.[key]);
    if (value !== null) return value;
  }
  return null;
}

function fmpPercent(value) {
  const n = safeNumber(value);
  if (n === null) return null;
  return Math.abs(n) <= 1.5 ? n * 100 : n;
}



function twelveList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  for (const key of ["values", "data", "income_statement", "balance_sheet", "cash_flow", "statements", "items", "result"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return typeof data === "object" ? [data] : [];
}

function twelveLatest(data) {
  const list = twelveList(data);
  return list[0] || {};
}

function pickTwelveNumber(obj = {}, keys = []) {
  for (const key of keys) {
    const value = cleanTwelveNumber(obj?.[key]);
    if (value !== null) return value;
  }
  return null;
}

function pickTwelveNumberFlexible(obj = {}, keyGroups = []) {
  const flat = flattenTwelveStats(obj || {});
  for (const keys of keyGroups) {
    const list = Array.isArray(keys) ? keys : [keys];
    const direct = pickTwelveNumber(obj, list);
    if (direct !== null) return direct;
    for (const key of list) {
      const normalized = normalizeStatKey(key);
      const fromFlat = cleanTwelveNumber(flat?.[normalized]);
      if (fromFlat !== null) return fromFlat;
    }
  }
  return null;
}

function trailingSum(rows = [], aliases = [], count = 4) {
  const values = (Array.isArray(rows) ? rows : [])
    .slice(0, count)
    .map((row) => pickTwelveNumberFlexible(row, aliases))
    .filter((value) => value !== null);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0);
}

function trailingAverage(rows = [], aliases = [], count = 4) {
  const values = (Array.isArray(rows) ? rows : [])
    .slice(0, count)
    .map((row) => pickTwelveNumberFlexible(row, aliases))
    .filter((value) => value !== null);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function firstStatementNumber(rows = [], aliases = []) {
  for (const row of Array.isArray(rows) ? rows : []) {
    const value = pickTwelveNumberFlexible(row, aliases);
    if (value !== null) return value;
  }
  return null;
}

function pctChangeFromList(list, key) {
  const rows = Array.isArray(list) ? list : [];
  if (rows.length < 2) return null;
  const latest = pickTwelveNumber(rows[0], [key]);
  const prior = pickTwelveNumber(rows[Math.min(rows.length - 1, 3)], [key]);
  if (latest === null || prior === null || prior === 0) return null;
  return ((latest - prior) / Math.abs(prior)) * 100;
}

function normalizeStatKey(key) {
  return String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function flattenTwelveStats(input, out = {}) {
  if (!input || typeof input !== "object") return out;
  if (Array.isArray(input)) {
    input.forEach((item) => flattenTwelveStats(item, out));
    return out;
  }
  for (const [key, value] of Object.entries(input)) {
    if (value && typeof value === "object") flattenTwelveStats(value, out);
    else {
      const cleanKey = normalizeStatKey(key);
      const number = cleanTwelveNumber(value);
      if (cleanKey && number !== null && out[cleanKey] === undefined) out[cleanKey] = number;
    }
  }
  return out;
}

function statNumber(flat, keys = []) {
  for (const key of keys) {
    const value = flat?.[normalizeStatKey(key)];
    if (value !== undefined && value !== null && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function statPercent(flat, keys = []) {
  const value = statNumber(flat, keys);
  if (value === null) return null;
  return Math.abs(value) <= 1.5 ? value * 100 : value;
}


function cleanPercentMaybe(value) {
  const n = safeNumber(value);
  if (n === null) return null;
  return Math.abs(n) <= 1.5 ? n * 100 : n;
}

function finnhubMetricValue(metric = {}, ...keys) {
  for (const key of keys) {
    const value = safeNumber(metric?.[key]);
    if (value !== null) return value;
  }
  return null;
}

async function fetchFinnhubProfile(symbol) {
  const token = providerApiKey("FINNHUB_API_KEY", "VITE_FINNHUB_API_KEY");
  if (!token) return null;
  const data = await fetchProviderJson("Finnhub", FINNHUB_BASE_URL, "/stock/profile2", { symbol, token }, 4500);
  if (!data || typeof data !== "object" || (!data.name && !data.ticker && !data.logo)) return null;
  return {
    ticker: data?.ticker || symbol,
    name: data?.name || symbol,
    finnhubIndustry: data?.finnhubIndustry || data?.ggroup || data?.sector || "Public company",
    marketCapitalization: firstNumber(data?.marketCapitalization),
    exchange: data?.exchange || "",
    currency: data?.currency || "USD",
    country: data?.country || "",
    weburl: data?.weburl || "",
    logo: data?.logo || "",
  };
}

async function fetchFinnhubFundamentals(symbol) {
  const token = providerApiKey("FINNHUB_API_KEY", "VITE_FINNHUB_API_KEY");
  if (!token) return { metrics: {}, raw: {}, source: "Finnhub disabled" };
  const [metricData, reportedData] = await Promise.all([
    fetchProviderJson("Finnhub", FINNHUB_BASE_URL, "/stock/metric", { symbol, metric: "all", token }, 5500),
    fetchProviderJson("Finnhub", FINNHUB_BASE_URL, "/stock/financials-reported", { symbol, freq: "annual", token }, 6500),
  ]);
  const m = metricData?.metric || {};
  const reported = buildExactReportedFinancials(reportedData || {});
  const latest = reported?.latest || {};
  const metrics = {
    marketCapM: finnhubMetricValue(m, "marketCapitalization"),
    beta: finnhubMetricValue(m, "beta"),
    peRatio: finnhubMetricValue(m, "peTTM", "peBasicExclExtraTTM", "peNormalizedAnnual"),
    forwardPe: finnhubMetricValue(m, "forwardPE", "forwardPe"),
    pegRatio: finnhubMetricValue(m, "pegRatio"),
    priceToSales: finnhubMetricValue(m, "psTTM", "psAnnual"),
    priceToBook: finnhubMetricValue(m, "pbQuarterly", "pbAnnual"),
    priceToCashFlow: finnhubMetricValue(m, "pcfShareTTM"),
    priceToFreeCashFlow: finnhubMetricValue(m, "pfcfShareTTM"),
    evToEbitda: finnhubMetricValue(m, "evToEbitda", "evToEbitdaTTM"),
    dividendYield: cleanPercentMaybe(finnhubMetricValue(m, "currentDividendYieldTTM", "dividendYieldIndicatedAnnual")),
    revenueGrowth: cleanPercentMaybe(finnhubMetricValue(m, "revenueGrowthTTMYoy", "revenueGrowthQuarterlyYoy")),
    revenueGrowthQuarterly: cleanPercentMaybe(finnhubMetricValue(m, "revenueGrowthQuarterlyYoy")),
    revenueGrowth3Y: cleanPercentMaybe(firstNumber(reported?.revenueGrowth3Y, finnhubMetricValue(m, "revenueGrowth3Y"))),
    revenueGrowth5Y: cleanPercentMaybe(finnhubMetricValue(m, "revenueGrowth5Y")),
    epsGrowth: cleanPercentMaybe(finnhubMetricValue(m, "epsGrowthTTMYoy", "epsGrowthQuarterlyYoy")),
    epsGrowth3Y: cleanPercentMaybe(firstNumber(reported?.epsGrowth3Y, finnhubMetricValue(m, "epsGrowth3Y"))),
    epsGrowth5Y: cleanPercentMaybe(finnhubMetricValue(m, "epsGrowth5Y")),
    netIncomeGrowth3Y: cleanPercentMaybe(firstNumber(reported?.netIncomeGrowth3Y, finnhubMetricValue(m, "netIncomeGrowth3Y"))),
    roe: cleanPercentMaybe(finnhubMetricValue(m, "roeTTM", "roeRfy")),
    roa: cleanPercentMaybe(finnhubMetricValue(m, "roaTTM", "roaRfy")),
    roi: cleanPercentMaybe(finnhubMetricValue(m, "roiTTM", "roiAnnual")),
    grossMargin: cleanPercentMaybe(finnhubMetricValue(m, "grossMarginTTM", "grossMarginAnnual")),
    operatingMargin: cleanPercentMaybe(finnhubMetricValue(m, "operatingMarginTTM", "operatingMarginAnnual")),
    pretaxMargin: cleanPercentMaybe(finnhubMetricValue(m, "pretaxMarginTTM", "pretaxMarginAnnual")),
    netMargin: cleanPercentMaybe(finnhubMetricValue(m, "netProfitMarginTTM", "netProfitMarginAnnual")),
    debtToEquity: finnhubMetricValue(m, "totalDebtToEquityQuarterly", "totalDebtToEquityAnnual"),
    longTermDebtToEquity: finnhubMetricValue(m, "longTermDebtToEquityQuarterly", "longTermDebtToEquityAnnual"),
    currentRatio: finnhubMetricValue(m, "currentRatioQuarterly", "currentRatioAnnual"),
    quickRatio: finnhubMetricValue(m, "quickRatioQuarterly", "quickRatioAnnual"),
    cashRatio: finnhubMetricValue(m, "cashRatioQuarterly", "cashRatioAnnual"),
    assetTurnover: finnhubMetricValue(m, "assetTurnoverTTM", "assetTurnoverAnnual"),
    interestCoverage: finnhubMetricValue(m, "interestCoverageTTM", "interestCoverageAnnual"),
    cashFlowToDebt: finnhubMetricValue(m, "cashFlowToDebtTTM", "cashFlowToDebtAnnual"),
    operatingCashFlowPerShare: finnhubMetricValue(m, "operatingCashFlowPerShareTTM", "operatingCashFlowPerShareAnnual"),
    freeCashFlowPerShare: finnhubMetricValue(m, "freeCashFlowPerShareTTM", "freeCashFlowPerShareAnnual"),
    totalDebtToCapital: finnhubMetricValue(m, "totalDebtToCapitalizationQuarterly", "totalDebtToCapitalizationAnnual"),
    netDebtToEbitda: finnhubMetricValue(m, "netDebtToEBITDATTM", "netDebtToEBITDAAnnual"),
    revenue: firstNumber(latest.revenue),
    operatingIncome: firstNumber(latest.operatingIncome),
    netIncome: firstNumber(latest.netIncome),
    operatingCashFlow: firstNumber(latest.operatingCashFlow),
    freeCashFlow: firstNumber(latest.freeCashFlow),
    totalDebt: firstNumber(latest.totalDebt),
    shareholderEquity: firstNumber(latest.shareholderEquity),
    totalAssets: firstNumber(latest.totalAssets),
    currentLiabilities: firstNumber(latest.currentLiabilities),
    cashAndEquivalents: firstNumber(latest.cashAndEquivalents),
  };
  return { metrics, raw: { metricData, reportedData }, source: "Finnhub stock/metric + financials-reported" };
}

async function fetchFinnhubCompanyNews(symbol) {
  const token = providerApiKey("FINNHUB_API_KEY", "VITE_FINNHUB_API_KEY");
  if (!token) return [];
  const to = new Date();
  const from = new Date(Date.now() - 21 * DAY_MS_SCORE);
  const fmtDate = (d) => d.toISOString().slice(0, 10);
  const data = await fetchProviderJson("Finnhub", FINNHUB_BASE_URL, "/company-news", { symbol, from: fmtDate(from), to: fmtDate(to), token }, 5500);
  if (!Array.isArray(data)) return [];
  return data
    .filter((item) => item && (item.headline || item.summary) && item.url)
    .slice(0, 12)
    .map((item) => ({
      title: item.headline || item.title || "Company news",
      summary: item.summary || "",
      url: item.url || "",
      source: item.source || "Finnhub",
      publishedAt: item.datetime ? new Date(Number(item.datetime) * 1000).toISOString() : "",
    }))
    .slice(0, 3);
}

function mapFmpMetrics(ratio = {}, key = {}, growthRows = [], incomeRows = [], balanceRows = [], cashRows = []) {
  const latestIncome = Array.isArray(incomeRows) ? incomeRows[0] || {} : {};
  const latestBalance = Array.isArray(balanceRows) ? balanceRows[0] || {} : {};
  const latestCash = Array.isArray(cashRows) ? cashRows[0] || {} : {};
  const latestGrowth = Array.isArray(growthRows) ? growthRows[0] || {} : {};
  const growthOld = Array.isArray(growthRows) ? growthRows[Math.min(growthRows.length - 1, 3)] || {} : {};
  const revenueGrowth3Y = firstNumber(latestGrowth?.revenueGrowth, latestGrowth?.growthRevenue);
  return {
    marketCapM: toMillions(firstNumber(key?.marketCapTTM, key?.marketCap)),
    peRatio: firstNumber(ratio?.priceEarningsRatioTTM, key?.peRatioTTM, key?.peRatio),
    priceToSales: firstNumber(ratio?.priceToSalesRatioTTM, key?.priceToSalesRatioTTM),
    priceToBook: firstNumber(ratio?.priceToBookRatioTTM, key?.pbRatioTTM),
    priceToCashFlow: firstNumber(ratio?.priceCashFlowRatioTTM, key?.pocfratioTTM),
    priceToFreeCashFlow: firstNumber(ratio?.priceToFreeCashFlowsRatioTTM, key?.pfcfRatioTTM),
    evToEbitda: firstNumber(key?.enterpriseValueOverEBITDATTM, key?.evToEbitda),
    dividendYield: cleanPercentMaybe(firstNumber(ratio?.dividendYielTTM, key?.dividendYieldTTM)),
    revenueGrowth: cleanPercentMaybe(firstNumber(latestGrowth?.revenueGrowth, latestGrowth?.growthRevenue, latestGrowth?.growthRevenueTTM)),
    revenueGrowth3Y: cleanPercentMaybe(revenueGrowth3Y),
    epsGrowth: cleanPercentMaybe(firstNumber(latestGrowth?.epsgrowth, latestGrowth?.growthEPS, latestGrowth?.epsdilutedGrowth)),
    epsGrowth3Y: cleanPercentMaybe(firstNumber(growthOld?.epsgrowth, growthOld?.growthEPS)),
    grossMargin: cleanPercentMaybe(firstNumber(ratio?.grossProfitMarginTTM, ratio?.grossProfitMargin)),
    operatingMargin: cleanPercentMaybe(firstNumber(ratio?.operatingProfitMarginTTM, ratio?.operatingProfitMargin)),
    netMargin: cleanPercentMaybe(firstNumber(ratio?.netProfitMarginTTM, ratio?.netProfitMargin)),
    roe: cleanPercentMaybe(firstNumber(ratio?.returnOnEquityTTM, ratio?.returnOnEquity)),
    roa: cleanPercentMaybe(firstNumber(ratio?.returnOnAssetsTTM, ratio?.returnOnAssets)),
    debtToEquity: firstNumber(ratio?.debtEquityRatioTTM, ratio?.debtEquityRatio),
    currentRatio: firstNumber(ratio?.currentRatioTTM, ratio?.currentRatio),
    quickRatio: firstNumber(ratio?.quickRatioTTM, ratio?.quickRatio),
    cashRatio: firstNumber(ratio?.cashRatioTTM, ratio?.cashRatio),
    interestCoverage: firstNumber(ratio?.interestCoverageTTM, ratio?.interestCoverage),
    cashFlowToDebt: firstNumber(ratio?.cashFlowToDebtRatioTTM, ratio?.cashFlowToDebtRatio),
    revenue: firstNumber(latestIncome?.revenue),
    operatingIncome: firstNumber(latestIncome?.operatingIncome),
    netIncome: firstNumber(latestIncome?.netIncome),
    totalAssets: firstNumber(latestBalance?.totalAssets),
    shareholderEquity: firstNumber(latestBalance?.totalStockholdersEquity, latestBalance?.totalEquity),
    currentLiabilities: firstNumber(latestBalance?.totalCurrentLiabilities),
    totalDebt: firstNumber(latestBalance?.totalDebt, (safeNumber(latestBalance?.shortTermDebt) || 0) + (safeNumber(latestBalance?.longTermDebt) || 0)),
    cashAndEquivalents: firstNumber(latestBalance?.cashAndCashEquivalents, latestBalance?.cashAndShortTermInvestments),
    operatingCashFlow: firstNumber(latestCash?.operatingCashFlow, latestCash?.netCashProvidedByOperatingActivities),
    freeCashFlow: firstNumber(latestCash?.freeCashFlow),
  };
}

async function fetchFmpFundamentals(symbol) {
  const apikey = providerApiKey("FMP_API_KEY", "FINANCIAL_MODELING_PREP_API_KEY");
  if (!apikey) return { metrics: {}, raw: {}, source: "FMP disabled" };
  const [ratios, keyMetrics, growth, income, balance, cash] = await Promise.all([
    fetchProviderJson("FMP", FMP_BASE_URL, `/ratios-ttm/${encodeURIComponent(symbol)}`, { apikey }, 5500),
    fetchProviderJson("FMP", FMP_BASE_URL, `/key-metrics-ttm/${encodeURIComponent(symbol)}`, { apikey }, 5500),
    fetchProviderJson("FMP", FMP_BASE_URL, `/financial-growth/${encodeURIComponent(symbol)}`, { period: "annual", limit: 5, apikey }, 5500),
    fetchProviderJson("FMP", FMP_BASE_URL, `/income-statement/${encodeURIComponent(symbol)}`, { period: "annual", limit: 5, apikey }, 5500),
    fetchProviderJson("FMP", FMP_BASE_URL, `/balance-sheet-statement/${encodeURIComponent(symbol)}`, { period: "annual", limit: 5, apikey }, 5500),
    fetchProviderJson("FMP", FMP_BASE_URL, `/cash-flow-statement/${encodeURIComponent(symbol)}`, { period: "annual", limit: 5, apikey }, 5500),
  ]);
  const ratio = Array.isArray(ratios) ? ratios[0] || {} : ratios || {};
  const key = Array.isArray(keyMetrics) ? keyMetrics[0] || {} : keyMetrics || {};
  return { metrics: mapFmpMetrics(ratio, key, growth, income, balance, cash), raw: { ratios, keyMetrics, growth, income, balance, cash }, source: "FMP ratios/key-metrics/statements fallback" };
}

function flattenMassiveFinancials(data = {}) {
  const item = Array.isArray(data?.results) ? data.results[0] || {} : {};
  const financials = item?.financials || {};
  const income = financials?.income_statement || {};
  const balance = financials?.balance_sheet || {};
  const cash = financials?.cash_flow_statement || {};
  const get = (obj, key) => firstNumber(obj?.[key]?.value, obj?.[key]);
  return {
    revenue: get(income, "revenues"),
    operatingIncome: get(income, "operating_income_loss"),
    netIncome: get(income, "net_income_loss"),
    totalAssets: get(balance, "assets"),
    shareholderEquity: get(balance, "equity"),
    currentLiabilities: get(balance, "current_liabilities"),
    cashAndEquivalents: get(balance, "cash_and_cash_equivalents_at_carrying_value"),
    operatingCashFlow: get(cash, "net_cash_flow_from_operating_activities"),
    freeCashFlow: null,
  };
}

async function fetchMassiveFundamentals(symbol) {
  const apiKey = providerApiKey("MASSIVE_API_KEY", "POLYGON_API_KEY");
  if (!apiKey) return { metrics: {}, raw: {}, source: "Massive disabled" };
  const data = await fetchProviderJson("Massive", MASSIVE_BASE_URL, "/vX/reference/financials", { ticker: symbol, timeframe: "annual", limit: 4, apiKey }, 6000);
  return { metrics: flattenMassiveFinancials(data || {}), raw: data || {}, source: "Massive financials fallback" };
}

async function fetchTwelveDataFundamentals(symbol) {
  // CREDIT CONTROL: one fundamentals endpoint per stock.
  // Twelve Data /statistics is the only route used for metric calculations.
  const statistics = await fetchTwelveDataOptional("/statistics", { symbol });
  const flat = flattenTwelveStats(statistics || {});

  const marketCapM = toMillions(statNumber(flat, ["market_cap", "marketCap", "market_capitalization"]));
  const sharesOutstanding = statNumber(flat, ["shares_outstanding", "sharesOutstanding", "shares", "weighted_average_shares_outstanding"]);
  const revenue = firstNumber(
    statNumber(flat, ["revenue_ttm", "total_revenue_ttm", "revenue", "total_revenue"]),
    statNumber(flat, ["sales_ttm", "sales"])
  );

  const metrics = {
    revenue,
    netIncome: statNumber(flat, ["net_income_ttm", "net_income", "netIncome"]),
    operatingIncome: statNumber(flat, ["operating_income_ttm", "operating_income", "ebit"]),
    grossProfit: statNumber(flat, ["gross_profit_ttm", "gross_profit"]),
    ebitda: statNumber(flat, ["ebitda_ttm", "ebitda"]),
    totalDebt: statNumber(flat, ["total_debt", "totalDebt"]),
    shareholderEquity: statNumber(flat, ["shareholders_equity", "shareholder_equity", "total_equity", "book_value"]),
    totalAssets: statNumber(flat, ["total_assets", "totalAssets"]),
    cashAndEquivalents: statNumber(flat, ["cash_and_equivalents", "cash", "cash_and_short_term_investments"]),
    operatingCashFlow: statNumber(flat, ["operating_cash_flow_ttm", "operating_cash_flow"]),
    freeCashFlow: statNumber(flat, ["free_cash_flow_ttm", "free_cash_flow"]),
    revenueGrowth: statPercent(flat, ["revenue_growth_yoy", "revenue_yoy_growth", "revenue_growth", "quarterly_revenue_growth_yoy"]),
    revenueGrowthQuarterly: statPercent(flat, ["quarterly_revenue_growth_yoy", "revenue_growth_quarterly", "revenue_growth_qoq"]),
    revenueGrowth3Y: statPercent(flat, ["revenue_growth_3y", "revenue_3y_growth", "revenue_cagr_3y"]),
    revenueGrowth5Y: statPercent(flat, ["revenue_growth_5y", "revenue_5y_growth", "revenue_cagr_5y"]),
    epsGrowth: statPercent(flat, ["eps_growth_yoy", "eps_yoy_growth", "eps_growth", "quarterly_earnings_growth_yoy"]),
    epsGrowth3Y: statPercent(flat, ["eps_growth_3y", "eps_3y_growth", "eps_cagr_3y"]),
    epsGrowth5Y: statPercent(flat, ["eps_growth_5y", "eps_5y_growth", "eps_cagr_5y"]),
    netIncomeGrowth3Y: statPercent(flat, ["net_income_growth_3y", "netincomegrowth3y"]),
    grossMargin: statPercent(flat, ["gross_margin", "gross_profit_margin", "gross_margin_ttm"]),
    operatingMargin: statPercent(flat, ["operating_margin", "operating_margin_ttm"]),
    pretaxMargin: statPercent(flat, ["pretax_margin", "pre_tax_margin"]),
    netMargin: statPercent(flat, ["net_margin", "profit_margin", "net_profit_margin", "net_margin_ttm"]),
    roe: statPercent(flat, ["return_on_equity", "roe", "return_on_equity_ttm"]),
    roa: statPercent(flat, ["return_on_assets", "roa", "return_on_assets_ttm"]),
    roi: statPercent(flat, ["return_on_investment", "roi", "return_on_capital", "roic"]),
    peRatio: statNumber(flat, ["pe_ratio", "trailing_pe", "price_earnings_ratio", "peratio"]),
    forwardPe: statNumber(flat, ["forward_pe", "forward_pe_ratio"]),
    pegRatio: statNumber(flat, ["peg_ratio", "pegratio"]),
    priceToSales: statNumber(flat, ["price_to_sales", "price_sales_ttm", "price_to_sales_ttm"]),
    priceToBook: statNumber(flat, ["price_to_book", "price_book_mrq", "price_to_book_mrq"]),
    priceToCashFlow: statNumber(flat, ["price_to_cash_flow", "price_cash_flow"]),
    priceToFreeCashFlow: statNumber(flat, ["price_to_free_cash_flow", "price_free_cash_flow"]),
    dividendYield: statPercent(flat, ["dividend_yield", "dividend_yield_ttm"]),
    beta: statNumber(flat, ["beta"]),
    currentRatio: statNumber(flat, ["current_ratio", "currentratio"]),
    quickRatio: statNumber(flat, ["quick_ratio", "quickratio"]),
    cashRatio: statNumber(flat, ["cash_ratio", "cashratio"]),
    debtToEquity: statNumber(flat, ["debt_to_equity", "total_debt_to_equity", "debt_equity_ratio"]),
    longTermDebtToEquity: statNumber(flat, ["long_term_debt_to_equity", "longtermdebttoequity"]),
    totalDebtToCapital: statNumber(flat, ["total_debt_to_capital", "debt_to_capital"]),
    netDebtToEbitda: statNumber(flat, ["net_debt_to_ebitda", "netdebttoebitda"]),
    interestCoverage: statNumber(flat, ["interest_coverage", "interestcoverage"]),
    cashFlowToDebt: statNumber(flat, ["cash_flow_to_debt", "operating_cash_flow_to_debt"]),
    operatingCashFlowPerShare: statNumber(flat, ["operating_cash_flow_per_share", "operatingcashflowpershare"]),
    freeCashFlowPerShare: statNumber(flat, ["free_cash_flow_per_share", "freecashflowpershare"]),
    priceReturn4Week: statPercent(flat, ["4_week_price_return", "4weekpricereturndaily", "month_to_date_price_return"]),
    priceReturn13Week: statPercent(flat, ["13_week_price_return", "13weekpricereturndaily", "3_month_price_return"]),
    priceReturn26Week: statPercent(flat, ["26_week_price_return", "26weekpricereturndaily", "6_month_price_return"]),
    priceReturn52Week: statPercent(flat, ["52_week_price_return", "52weekpricereturndaily", "year_to_date_price_return"]),
    weekHigh: statNumber(flat, ["52_week_high", "52weekhigh", "year_high"]),
    weekLow: statNumber(flat, ["52_week_low", "52weeklow", "year_low"]),
    currentPrice: statNumber(flat, ["current_price", "currentprice", "last_price", "lastprice", "price", "close"]),
    marketCapM,
    sharesOutstanding,
    enterpriseValue: toMillions(statNumber(flat, ["enterprise_value", "enterpriseValue"])),
    evToEbitda: statNumber(flat, ["enterprise_value_to_ebitda", "ev_to_ebitda", "evEbitda"]),
    ebit: statNumber(flat, ["ebit", "operating_income", "operating_income_ttm"]),
    interestExpense: statNumber(flat, ["interest_expense", "interestexpense"]),
    currentAssets: statNumber(flat, ["total_current_assets", "current_assets"]),
    currentLiabilities: statNumber(flat, ["total_current_liabilities", "current_liabilities"]),
  };

  // If /statistics is too sparse to support the six-category Eval model, add the
  // minimum statement calls needed to calculate real fundamentals. These calls are
  // cached for months and only run when the low-credit statistics payload is missing
  // core data groups.
  const initialUsableCount = validMetricInputCount([
    metrics.revenueGrowth, metrics.epsGrowth, metrics.roe, metrics.roa, metrics.roi,
    metrics.grossMargin, metrics.operatingMargin, metrics.netMargin, metrics.debtToEquity,
    metrics.currentRatio, metrics.quickRatio, metrics.peRatio, metrics.priceToSales,
    metrics.priceToBook, metrics.beta, metrics.priceReturn52Week,
  ]);

  const hasGrowthInput = validMetricInputCount([metrics.revenueGrowth, metrics.revenueGrowthQuarterly, metrics.revenueGrowth3Y, metrics.epsGrowth, metrics.epsGrowth3Y]) > 0;
  const hasProfitInput = validMetricInputCount([metrics.roe, metrics.roa, metrics.roi, metrics.grossMargin, metrics.operatingMargin, metrics.netMargin]) > 0;
  const hasHealthInput = validMetricInputCount([metrics.debtToEquity, metrics.currentRatio, metrics.quickRatio, metrics.cashRatio, metrics.interestCoverage, metrics.cashFlowToDebt, metrics.totalDebt, metrics.shareholderEquity]) > 0;
  const hasValuationInput = validMetricInputCount([metrics.peRatio, metrics.forwardPe, metrics.pegRatio, metrics.priceToSales, metrics.priceToBook, metrics.priceToFreeCashFlow]) > 0;
  // Single-ticker mode: spend more Twelve Data credits to get the richest possible metric set.
  // Still stays well under the requested 400-credit ceiling: statistics + 3 statements + weekly prices + profile/logo/quote/chart.
  const needsStatementFallback = true;

  let statementRaw = null;
  if (needsStatementFallback) {
    const [incomeData, balanceData, cashData] = await Promise.all([
      fetchTwelveDataOptional("/income_statement", { symbol, period: "annual" }),
      fetchTwelveDataOptional("/balance_sheet", { symbol, period: "annual" }),
      fetchTwelveDataOptional("/cash_flow", { symbol, period: "annual" }),
    ]);

    const incomeRows = twelveList(incomeData);
    const balanceRows = twelveList(balanceData);
    const cashRows = twelveList(cashData);
    const income = incomeRows[0] || {};
    const priorIncome = incomeRows[1] || incomeRows[2] || {};
    const balance = balanceRows[0] || {};
    const cash = cashRows[0] || {};

    const statementRevenue = pickTwelveNumberFlexible(income, [["revenue", "total_revenue", "sales", "total_operating_revenue"]]);
    const priorRevenue = pickTwelveNumberFlexible(priorIncome, [["revenue", "total_revenue", "sales", "total_operating_revenue"]]);
    const olderIncome = incomeRows[2] || incomeRows[3] || {};
    const oldestIncome = incomeRows[Math.min(incomeRows.length - 1, 4)] || {};
    const olderRevenue = pickTwelveNumberFlexible(olderIncome, [["revenue", "total_revenue", "sales", "total_operating_revenue"]]);
    const oldestRevenue = pickTwelveNumberFlexible(oldestIncome, [["revenue", "total_revenue", "sales", "total_operating_revenue"]]);
    const epsLatest = pickTwelveNumberFlexible(income, [["eps", "eps_diluted", "diluted_eps", "earnings_per_share", "basic_eps"]]);
    const epsPrior = pickTwelveNumberFlexible(priorIncome, [["eps", "eps_diluted", "diluted_eps", "earnings_per_share", "basic_eps"]]);
    const epsOldest = pickTwelveNumberFlexible(oldestIncome, [["eps", "eps_diluted", "diluted_eps", "earnings_per_share", "basic_eps"]]);
    const netIncome = pickTwelveNumberFlexible(income, [["net_income", "net_income_common_stockholders", "net_income_available_to_common_shareholders"]]);
    const priorNetIncome = pickTwelveNumberFlexible(priorIncome, [["net_income", "net_income_common_stockholders", "net_income_available_to_common_shareholders"]]);
    const oldestNetIncome = pickTwelveNumberFlexible(oldestIncome, [["net_income", "net_income_common_stockholders", "net_income_available_to_common_shareholders"]]);
    const operatingIncome = pickTwelveNumberFlexible(income, [["operating_income", "operating_profit"], ["ebit"]]);
    const grossProfit = pickTwelveNumberFlexible(income, [["gross_profit"]]);
    const pretaxIncome = pickTwelveNumberFlexible(income, [["pretax_income", "income_before_tax", "income_before_income_taxes"]]);
    const incomeTaxExpense = pickTwelveNumberFlexible(income, [["income_tax_expense", "tax_provision", "provision_for_income_taxes"]]);
    const interestExpense = Math.abs(firstNumber(pickTwelveNumberFlexible(income, [["interest_expense", "interestexpense"]]), pickTwelveNumberFlexible(income, [["net_interest_income"]])) || 0) || null;
    const ebitda = firstNumber(pickTwelveNumberFlexible(income, [["ebitda"]]), operatingIncome !== null ? operatingIncome + Math.abs(firstNumber(pickTwelveNumberFlexible(cash, [["depreciation_and_amortization", "depreciation_amortization"]]), pickTwelveNumberFlexible(income, [["depreciation_and_amortization"]])) || 0) : null);
    const dilutedShares = firstNumber(pickTwelveNumberFlexible(income, [["weighted_average_shares_outstanding_diluted", "weighted_average_shares_diluted", "diluted_average_shares"]]), metrics.sharesOutstanding);
    const totalAssets = pickTwelveNumberFlexible(balance, [["total_assets"]]);
    const currentAssets = pickTwelveNumberFlexible(balance, [["total_current_assets", "current_assets"]]);
    const inventory = pickTwelveNumberFlexible(balance, [["inventory", "inventories"]]);
    const accountsReceivable = pickTwelveNumberFlexible(balance, [["accounts_receivable", "net_receivables", "trade_and_other_receivables"]]);
    const shortTermInvestments = pickTwelveNumberFlexible(balance, [["short_term_investments", "marketable_securities"]]);
    const currentLiabilities = pickTwelveNumberFlexible(balance, [["total_current_liabilities", "current_liabilities"]]);
    const totalLiabilities = pickTwelveNumberFlexible(balance, [["total_liabilities"]]);
    const shortTermDebt = pickTwelveNumberFlexible(balance, [["short_term_debt", "current_debt"]]);
    const longTermDebt = pickTwelveNumberFlexible(balance, [["long_term_debt", "non_current_debt"]]);
    const totalDebt = firstNumber(pickTwelveNumberFlexible(balance, [["total_debt"]]), (safeNumber(shortTermDebt) || 0) + (safeNumber(longTermDebt) || 0));
    const shareholderEquity = pickTwelveNumberFlexible(balance, [["total_equity", "shareholders_equity", "total_shareholders_equity", "total_stockholders_equity"]]);
    const cashAndEquivalents = pickTwelveNumberFlexible(balance, [["cash_and_cash_equivalents", "cash_and_equivalents", "cash", "cash_cash_equivalents_and_short_term_investments"]]);
    const operatingCashFlow = pickTwelveNumberFlexible(cash, [["operating_cash_flow", "cash_flow_from_operating_activities", "net_cash_provided_by_operating_activities"]]);
    const capex = pickTwelveNumberFlexible(cash, [["capital_expenditure", "capital_expenditures", "capex"]]);
    const freeCashFlow = firstNumber(pickTwelveNumberFlexible(cash, [["free_cash_flow"]]), operatingCashFlow !== null && capex !== null ? operatingCashFlow - Math.abs(capex) : null);
    const dividendsPaid = Math.abs(firstNumber(pickTwelveNumberFlexible(cash, [["dividends_paid", "dividend_payments", "cash_dividends_paid"]])) || 0) || null;

    metrics.revenue = firstNumber(metrics.revenue, statementRevenue);
    metrics.netIncome = firstNumber(metrics.netIncome, netIncome);
    metrics.operatingIncome = firstNumber(metrics.operatingIncome, operatingIncome);
    metrics.grossProfit = firstNumber(metrics.grossProfit, grossProfit);
    metrics.totalDebt = firstNumber(metrics.totalDebt, totalDebt);
    metrics.shareholderEquity = firstNumber(metrics.shareholderEquity, shareholderEquity);
    metrics.totalAssets = firstNumber(metrics.totalAssets, totalAssets);
    metrics.cashAndEquivalents = firstNumber(metrics.cashAndEquivalents, cashAndEquivalents);
    metrics.operatingCashFlow = firstNumber(metrics.operatingCashFlow, operatingCashFlow);
    metrics.freeCashFlow = firstNumber(metrics.freeCashFlow, freeCashFlow);
    metrics.priorRevenue = firstNumber(metrics.priorRevenue, priorRevenue);
    metrics.olderRevenue = firstNumber(metrics.olderRevenue, olderRevenue);
    metrics.oldestRevenue = firstNumber(metrics.oldestRevenue, oldestRevenue);
    metrics.epsLatest = firstNumber(metrics.epsLatest, epsLatest);
    metrics.epsPrior = firstNumber(metrics.epsPrior, epsPrior);
    metrics.epsOldest = firstNumber(metrics.epsOldest, epsOldest);
    metrics.priorNetIncome = firstNumber(metrics.priorNetIncome, priorNetIncome);
    metrics.oldestNetIncome = firstNumber(metrics.oldestNetIncome, oldestNetIncome);
    metrics.currentAssets = firstNumber(metrics.currentAssets, currentAssets);
    metrics.currentLiabilities = firstNumber(metrics.currentLiabilities, currentLiabilities);
    metrics.totalLiabilities = firstNumber(metrics.totalLiabilities, totalLiabilities);
    metrics.inventory = firstNumber(metrics.inventory, inventory);
    metrics.accountsReceivable = firstNumber(metrics.accountsReceivable, accountsReceivable);
    metrics.shortTermInvestments = firstNumber(metrics.shortTermInvestments, shortTermInvestments);
    metrics.shortTermDebt = firstNumber(metrics.shortTermDebt, shortTermDebt);
    metrics.longTermDebt = firstNumber(metrics.longTermDebt, longTermDebt);
    metrics.pretaxIncome = firstNumber(metrics.pretaxIncome, pretaxIncome);
    metrics.incomeTaxExpense = firstNumber(metrics.incomeTaxExpense, incomeTaxExpense);
    metrics.interestExpense = firstNumber(metrics.interestExpense, interestExpense);
    metrics.ebitda = firstNumber(metrics.ebitda, ebitda);
    metrics.dilutedShares = firstNumber(metrics.dilutedShares, dilutedShares);
    metrics.capex = firstNumber(metrics.capex, capex);
    metrics.dividendsPaid = firstNumber(metrics.dividendsPaid, dividendsPaid);

    const compoundGrowth = (latest, prior, years) => {
      const l = safeNumber(latest);
      const p = safeNumber(prior);
      const y = safeNumber(years);
      if (l === null || p === null || p <= 0 || l <= 0 || y === null || y <= 0) return null;
      return (Math.pow(l / p, 1 / y) - 1) * 100;
    };

    metrics.revenueGrowth = firstNumber(metrics.revenueGrowth, statementRevenue !== null && priorRevenue !== null && priorRevenue !== 0 ? ((statementRevenue - priorRevenue) / Math.abs(priorRevenue)) * 100 : null);
    metrics.revenueGrowth3Y = firstNumber(metrics.revenueGrowth3Y, compoundGrowth(statementRevenue, olderRevenue, 3));
    metrics.revenueGrowth5Y = firstNumber(metrics.revenueGrowth5Y, compoundGrowth(statementRevenue, oldestRevenue, Math.min(Math.max(incomeRows.length - 1, 1), 5)));
    metrics.epsGrowth = firstNumber(metrics.epsGrowth, epsLatest !== null && epsPrior !== null && epsPrior !== 0 ? ((epsLatest - epsPrior) / Math.abs(epsPrior)) * 100 : null);
    metrics.epsGrowth5Y = firstNumber(metrics.epsGrowth5Y, compoundGrowth(epsLatest, epsOldest, Math.min(Math.max(incomeRows.length - 1, 1), 5)));
    metrics.netIncomeGrowth3Y = firstNumber(metrics.netIncomeGrowth3Y, compoundGrowth(netIncome, oldestNetIncome, Math.min(Math.max(incomeRows.length - 1, 1), 5)), netIncome !== null && priorNetIncome !== null && priorNetIncome !== 0 ? ((netIncome - priorNetIncome) / Math.abs(priorNetIncome)) * 100 : null);
    metrics.grossMargin = firstNumber(metrics.grossMargin, divide(grossProfit, statementRevenue) !== null ? divide(grossProfit, statementRevenue) * 100 : null);
    metrics.operatingMargin = firstNumber(metrics.operatingMargin, divide(operatingIncome, statementRevenue) !== null ? divide(operatingIncome, statementRevenue) * 100 : null);
    metrics.netMargin = firstNumber(metrics.netMargin, divide(netIncome, statementRevenue) !== null ? divide(netIncome, statementRevenue) * 100 : null);
    metrics.roe = firstNumber(metrics.roe, divide(netIncome, shareholderEquity) !== null ? divide(netIncome, shareholderEquity) * 100 : null);
    metrics.roa = firstNumber(metrics.roa, divide(netIncome, totalAssets) !== null ? divide(netIncome, totalAssets) * 100 : null);
    metrics.debtToEquity = firstNumber(metrics.debtToEquity, divide(totalDebt, shareholderEquity));
    metrics.currentRatio = firstNumber(metrics.currentRatio, divide(currentAssets, currentLiabilities));
    metrics.quickRatio = firstNumber(metrics.quickRatio, divide((safeNumber(cashAndEquivalents) || 0) + (safeNumber(shortTermInvestments) || 0) + (safeNumber(accountsReceivable) || 0), currentLiabilities));
    metrics.cashRatio = firstNumber(metrics.cashRatio, divide(cashAndEquivalents, currentLiabilities));
    metrics.cashFlowToDebt = firstNumber(metrics.cashFlowToDebt, divide(operatingCashFlow, totalDebt));
    metrics.operatingCashFlowPerShare = firstNumber(metrics.operatingCashFlowPerShare, divide(operatingCashFlow, sharesOutstanding));
    metrics.freeCashFlowPerShare = firstNumber(metrics.freeCashFlowPerShare, divide(freeCashFlow, sharesOutstanding));
    metrics.assetTurnover = firstNumber(metrics.assetTurnover, divide(statementRevenue, totalAssets));
    metrics.equityRatio = firstNumber(metrics.equityRatio, divide(shareholderEquity, totalAssets));
    metrics.debtToAssets = firstNumber(metrics.debtToAssets, divide(totalDebt, totalAssets));
    metrics.pretaxMargin = firstNumber(metrics.pretaxMargin, divide(pretaxIncome, statementRevenue) !== null ? divide(pretaxIncome, statementRevenue) * 100 : null);
    metrics.fcfMargin = firstNumber(metrics.fcfMargin, divide(freeCashFlow, statementRevenue) !== null ? divide(freeCashFlow, statementRevenue) * 100 : null);
    metrics.ocfMargin = firstNumber(metrics.ocfMargin, divide(operatingCashFlow, statementRevenue) !== null ? divide(operatingCashFlow, statementRevenue) * 100 : null);
    metrics.payoutRatio = firstNumber(metrics.payoutRatio, divide(dividendsPaid, netIncome) !== null ? Math.abs(divide(dividendsPaid, netIncome)) * 100 : null);
    metrics.interestCoverage = firstNumber(metrics.interestCoverage, divide(operatingIncome, interestExpense));
    metrics.priceToSales = firstNumber(metrics.priceToSales, metrics.marketCapM !== null && statementRevenue !== null ? divide(metrics.marketCapM * 1_000_000, statementRevenue) : null);
    metrics.priceToBook = firstNumber(metrics.priceToBook, metrics.marketCapM !== null && shareholderEquity !== null ? divide(metrics.marketCapM * 1_000_000, shareholderEquity) : null);

    statementRaw = { incomeData, balanceData, cashData };
  }

  return { metrics, raw: { statistics, flat, statements: statementRaw }, source: statementRaw ? "Twelve Data /statistics + sparse fallback statements" : "Twelve Data /statistics only" };
}


function hasUsableQuote(quote = {}) {
  return safeNumber(quote?.c) !== null || safeNumber(quote?.dp) !== null;
}

function bestQuote({ cachedQuote, twelveQuote, finnhubQuote, massiveQuote, fmpQuote }) {
  // Current price and percent change priority:
  // 1. Twelve Data quote
  // 2. Twelve Data quote
  // 3. Twelve Data/Twelve Data aggregate-derived latest close
  // 4. Twelve Data quote
  // 5. cached previous quote
  const sources = [twelveQuote, finnhubQuote, massiveQuote, fmpQuote, cachedQuote].filter(Boolean);
  const out = {};

  for (const key of ["c", "d", "dp", "h", "l", "o", "pc"]) {
    for (const source of sources) {
      const value = safeNumber(source?.[key]);
      if (value !== null) {
        out[key] = value;
        break;
      }
    }
  }

  if (out.dp === undefined && out.c !== undefined && out.pc !== undefined && out.pc > 0) {
    out.dp = ((out.c - out.pc) / out.pc) * 100;
  }

  if (out.d === undefined && out.c !== undefined && out.pc !== undefined) {
    out.d = out.c - out.pc;
  }

  return out;
}

function mergeDefined(...objects) {
  const result = {};
  for (const object of objects) {
    if (!object || typeof object !== "object") continue;
    for (const [key, value] of Object.entries(object)) {
      if (safeNumber(value) !== null || (typeof value === "string" && value.trim())) {
        result[key] = value;
      }
    }
  }
  return result;
}

function applyMetricFallbacks(target, primary = {}, fallback = {}) {
  // Fallback fills only missing values.
  for (const [key, value] of Object.entries(fallback || {})) {
    if (scoreInputNumber(target[key]) === null && scoreInputNumber(value) !== null) {
      target[key] = value;
    }
  }

  // Primary source is allowed to overwrite because it is the preferred source for that metric group.
  for (const [key, value] of Object.entries(primary || {})) {
    if (scoreInputNumber(value) !== null) {
      target[key] = value;
    }
  }

  return target;
}

function countValidMetricInputs(values = []) {
  return values.filter((value) => scoreInputNumber(value) !== null).length;
}

function isUsableProviderPayload(object) {
  return object && typeof object === "object" && Object.keys(object).length > 0;
}

function scoreInputNumber(value) {
  const n = safeNumber(value);
  if (n === null || n === 0) return null;
  return n;
}

function metricScore(value, points) {
  const n = scoreInputNumber(value);
  if (n === null) return null;

  for (const [threshold, score] of points) {
    if (n >= threshold) return score;
  }

  return points.length ? points[points.length - 1][1] : null;
}


function scoreProfitMetric(value, thresholds = []) {
  const n = scoreInputNumber(value);
  if (n === null) return null;

  const sorted = (Array.isArray(thresholds) ? thresholds : [])
    .map((x) => safeNumber(x))
    .filter((x) => x !== null)
    .sort((a, b) => a - b);

  if (!sorted.length) return null;

  const scoreSteps = [5.2, 6.1, 7.0, 7.9, 8.8, 9.6, 10.0];
  let bucket = 0;

  for (const threshold of sorted) {
    if (n >= threshold) bucket += 1;
    else break;
  }

  if (n < 0) return 3.5;
  return clamp(scoreSteps[Math.min(bucket, scoreSteps.length - 1)], 0, 10);
}

function inverseMetricScore(value, points) {
  const n = scoreInputNumber(value);
  if (n === null) return null;

  for (const [threshold, score] of points) {
    if (n <= threshold) return score;
  }

  return points.length ? points[points.length - 1][1] : null;
}

function availableWeightedAverage(items = [], fallback = null) {
  let total = 0;
  let weight = 0;

  for (const item of items) {
    const score = safeNumber(item?.score);
    const w = safeNumber(item?.weight) ?? 1;

    // Missing metrics are skipped entirely. Their weight is redistributed across
    // the metrics that actually exist, so one missing API field cannot tank a score.
    if (score !== null && w > 0) {
      total += score * w;
      weight += w;
    }
  }

  if (!weight) return fallback;
  return Number((total / weight).toFixed(1));
}

function validMetricInputCount(values = []) {
  return values.filter((value) => scoreInputNumber(value) !== null).length;
}

function categoryAverage(items = []) {
  return availableWeightedAverage(items, null);
}
function weightedMetricInput(label, category, value, score, weight) {
  const usableValue = scoreInputNumber(value);
  const usableScore = safeNumber(score);
  const usableWeight = safeNumber(weight);
  if (usableValue === null || usableScore === null || usableWeight === null || usableWeight <= 0) return null;
  return { label, category, value: usableValue, score: usableScore, weight: usableWeight };
}


function publicMetricCount(metrics = {}) {
  return Object.values(metrics || {}).filter((entry) => safeNumber(entry?.value) !== null).length;
}

function getRiskLabel(metrics = {}, healthScore = null) {
  const beta = safeNumber(metrics.beta);
  const debtToEquity = safeNumber(metrics.debtToEquity);

  if ((beta !== null && beta >= 1.8) || (debtToEquity !== null && debtToEquity >= 3) || (healthScore !== null && healthScore <= 4)) {
    return "High";
  }

  if ((beta !== null && beta >= 1.25) || (debtToEquity !== null && debtToEquity >= 1.5) || (healthScore !== null && healthScore <= 6)) {
    return "Medium";
  }

  return "Low";
}

function gradeFrom10(value) {
  const score = safeNumber(value);
  if (score === null) return "N/A";
  if (score >= 9.3) return "A+";
  if (score >= 9.0) return "A";
  if (score >= 8.7) return "A-";
  if (score >= 8.3) return "B+";
  if (score >= 8.0) return "B";
  if (score >= 7.7) return "B-";
  if (score >= 7.3) return "C+";
  if (score >= 7.0) return "C";
  if (score >= 6.5) return "C-";
  if (score >= 6.0) return "D+";
  if (score >= 5.5) return "D";
  return "F";
}



function cleanConceptKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function reportedLineValue(statement = {}, aliases = []) {
  const rows = [
    ...(Array.isArray(statement?.ic) ? statement.ic : []),
    ...(Array.isArray(statement?.bs) ? statement.bs : []),
    ...(Array.isArray(statement?.cf) ? statement.cf : []),
  ];

  const cleanedAliases = aliases.map(cleanConceptKey);

  // Pass 1: exact concept match.
  for (const alias of cleanedAliases) {
    const row = rows.find((item) => cleanConceptKey(item?.concept) === alias);
    const value = firstNumber(row?.value, row?.amount);
    if (value !== null && value !== 0) return value;
  }

  // Pass 2: exact label/name match.
  for (const alias of cleanedAliases) {
    const row = rows.find((item) => cleanConceptKey(item?.label) === alias || cleanConceptKey(item?.name) === alias);
    const value = firstNumber(row?.value, row?.amount);
    if (value !== null && value !== 0) return value;
  }

  // Pass 3: contains match, only if no exact match exists.
  for (const alias of cleanedAliases) {
    const row = rows.find((item) => {
      const concept = cleanConceptKey(item?.concept);
      const label = cleanConceptKey(item?.label);
      const name = cleanConceptKey(item?.name);
      return concept.includes(alias) || label.includes(alias) || name.includes(alias);
    });
    const value = firstNumber(row?.value, row?.amount);
    if (value !== null && value !== 0) return value;
  }

  return null;
}

function buildExactReportedFinancials(reported = {}) {
  const reports = Array.isArray(reported?.data) ? reported.data : [];
  const annual = reports
    .filter((report) => {
      const form = String(report?.form || "").toUpperCase();
      const freq = String(report?.freq || "").toLowerCase();
      return form.includes("10-K") || freq === "annual" || report?.report;
    })
    .sort((a, b) => String(b?.endDate || b?.filedDate || b?.year || "").localeCompare(String(a?.endDate || a?.filedDate || a?.year || "")))
    .slice(0, 4);

  const rows = annual.map((report) => {
    const r = report?.report || report;

    const revenue = reportedLineValue(r, [
      "us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax",
      "us-gaap:Revenues",
      "us-gaap:SalesRevenueNet",
      "RevenueFromContractWithCustomerExcludingAssessedTax",
      "Revenues",
      "SalesRevenueNet",
    ]);

    const operatingIncome = reportedLineValue(r, [
      "us-gaap:OperatingIncomeLoss",
      "OperatingIncomeLoss",
      "OperatingIncome",
      "IncomeFromOperations",
    ]);

    const netIncome = reportedLineValue(r, [
      "us-gaap:NetIncomeLoss",
      "us-gaap:ProfitLoss",
      "NetIncomeLoss",
      "ProfitLoss",
      "NetIncome",
    ]);

    const operatingCashFlow = reportedLineValue(r, [
      "us-gaap:NetCashProvidedByUsedInOperatingActivities",
      "NetCashProvidedByUsedInOperatingActivities",
      "NetCashProvidedByOperatingActivities",
      "OperatingCashFlow",
    ]);

    const capexRaw = reportedLineValue(r, [
      "us-gaap:PaymentsToAcquirePropertyPlantAndEquipment",
      "PaymentsToAcquirePropertyPlantAndEquipment",
      "PaymentsToAcquireProductiveAssets",
      "CapitalExpenditures",
      "Capex",
    ]);

    const totalDebt = reportedLineValue(r, [
      "us-gaap:LongTermDebtAndFinanceLeaseObligationsCurrent",
      "us-gaap:ShortTermBorrowings",
      "us-gaap:LongTermDebtCurrent",
      "us-gaap:LongTermDebtNoncurrent",
      "LongTermDebtAndFinanceLeaseObligationsCurrent",
      "ShortTermBorrowings",
      "LongTermDebtCurrent",
      "LongTermDebtNoncurrent",
      "TotalDebt",
      "Debt",
    ]);

    const longDebt = reportedLineValue(r, [
      "us-gaap:LongTermDebtNoncurrent",
      "LongTermDebtNoncurrent",
      "LongTermDebt",
    ]);

    const currentDebt = reportedLineValue(r, [
      "us-gaap:LongTermDebtCurrent",
      "us-gaap:ShortTermBorrowings",
      "LongTermDebtCurrent",
      "ShortTermBorrowings",
    ]);

    const shareholderEquity = reportedLineValue(r, [
      "us-gaap:StockholdersEquity",
      "us-gaap:StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
      "StockholdersEquity",
      "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
      "ShareholdersEquity",
      "ShareholderEquity",
      "TotalEquity",
    ]);

    const cashAndEquivalents = reportedLineValue(r, [
      "us-gaap:CashAndCashEquivalentsAtCarryingValue",
      "us-gaap:CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
      "CashAndCashEquivalentsAtCarryingValue",
      "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
      "CashAndCashEquivalents",
      "CashEquivalents",
    ]);

    const totalAssets = reportedLineValue(r, [
      "us-gaap:Assets",
      "Assets",
      "TotalAssets",
    ]);

    const currentLiabilities = reportedLineValue(r, [
      "us-gaap:LiabilitiesCurrent",
      "LiabilitiesCurrent",
      "CurrentLiabilities",
      "TotalCurrentLiabilities",
    ]);

    const eps = reportedLineValue(r, [
      "us-gaap:EarningsPerShareDiluted",
      "EarningsPerShareDiluted",
      "DilutedEarningsPerShare",
      "EPSDiluted",
    ]);

    const combinedDebt =
      totalDebt !== null
        ? totalDebt
        : (safeNumber(longDebt) || 0) + (safeNumber(currentDebt) || 0) || null;

    const capex = capexRaw === null ? null : -Math.abs(capexRaw);
    const freeCashFlow =
      operatingCashFlow !== null && capex !== null
        ? operatingCashFlow - Math.abs(capex)
        : null;

    return {
      year: report?.year || report?.endDate || report?.filedDate || null,
      revenue,
      operatingIncome,
      netIncome,
      operatingCashFlow,
      capex,
      freeCashFlow,
      totalDebt: combinedDebt,
      shareholderEquity,
      cashAndEquivalents,
      totalAssets,
      currentLiabilities,
      eps,
    };
  });

  function pctChange(key) {
    const usable = rows.filter((row) => scoreInputNumber(row?.[key]) !== null);
    if (usable.length < 2) return null;
    const latest = usable[0][key];
    const oldest = usable[Math.min(usable.length - 1, 3)][key];
    if (!oldest) return null;
    return ((latest - oldest) / Math.abs(oldest)) * 100;
  }

  return {
    latest: rows[0] || {},
    revenueGrowth3Y: pctChange("revenue"),
    netIncomeGrowth3Y: pctChange("netIncome"),
    epsGrowth3Y: pctChange("eps"),
  };
}


function statementValue(statement = {}, names = []) {
  const rows = [
    ...(Array.isArray(statement?.ic) ? statement.ic : []),
    ...(Array.isArray(statement?.bs) ? statement.bs : []),
    ...(Array.isArray(statement?.cf) ? statement.cf : []),
  ];

  for (const name of names) {
    const needle = String(name).toLowerCase().replace(/[^a-z0-9]/g, "");
    const row = rows.find((item) => {
      const concept = String(item?.concept || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const label = String(item?.label || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const rowName = String(item?.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return concept.includes(needle) || label.includes(needle) || rowName.includes(needle);
    });

    const value = firstNumber(row?.value, row?.amount);
    if (value !== null && value !== 0) return value;
  }

  return null;
}

function buildReportedFinancials(reported = {}) {
  const reports = Array.isArray(reported?.data) ? reported.data : [];
  const annual = reports
    .filter((report) => {
      const form = String(report?.form || "").toUpperCase();
      const freq = String(report?.freq || "").toLowerCase();
      return form.includes("10-K") || freq === "annual" || report?.report;
    })
    .sort((a, b) => String(b?.endDate || b?.filedDate || b?.year || "").localeCompare(String(a?.endDate || a?.filedDate || a?.year || "")))
    .slice(0, 4);

  const rows = annual.map((report) => {
    const r = report?.report || report;
    const revenue = statementValue(r, ["revenue", "revenues", "salesrevenue", "salesrevenuenet", "sales"]);
    const netIncome = statementValue(r, ["netincome", "netincomeloss", "profitloss"]);
    const operatingIncome = statementValue(r, ["operatingincome", "operatingincomeloss", "incomefromoperations"]);
    const operatingCashFlow = statementValue(r, ["netcashprovidedbyusedinoperatingactivities", "netcashprovidedbyoperatingactivities", "operatingcashflow"]);
    const capexRaw = statementValue(r, ["paymentstoacquirepropertyplantandequipment", "paymentstoacquireproductiveassets", "capitalexpenditures", "capex"]);
    const totalAssets = statementValue(r, ["assets", "totalassets"]);
    const totalDebt = statementValue(r, ["debt", "longtermdebt", "shorttermborrowings", "totaldebt"]);
    const shareholderEquity = statementValue(r, ["stockholdersequity", "shareholdersequity", "stockholdersequityincludingportionattributabletononcontrollinginterest"]);
    const cashAndEquivalents = statementValue(r, ["cashandcashequivalents", "cashandcash equivalents", "cashcashequivalentsrestrictedcashandrestrictedcashequivalents"]);
    const eps = statementValue(r, ["earningspersharediluted", "dilutedearningspershare", "epsdiluted", "earningspershare"]);

    const capex = capexRaw === null ? null : -Math.abs(capexRaw);
    const freeCashFlow =
      operatingCashFlow !== null && capex !== null
        ? operatingCashFlow - Math.abs(capex)
        : null;

    return {
      year: report?.year || report?.endDate || report?.filedDate || null,
      revenue,
      netIncome,
      operatingIncome,
      operatingCashFlow,
      capex,
      freeCashFlow,
      totalAssets,
      totalDebt,
      shareholderEquity,
      cashAndEquivalents,
      eps,
    };
  });

  function pctChange(key) {
    const usable = rows.filter((row) => scoreInputNumber(row?.[key]) !== null);
    if (usable.length < 2) return null;
    const latest = usable[0][key];
    const oldest = usable[Math.min(usable.length - 1, 3)][key];
    if (!oldest) return null;
    return ((latest - oldest) / Math.abs(oldest)) * 100;
  }

  return {
    latest: rows[0] || {},
    revenueGrowth3Y: pctChange("revenue"),
    netIncomeGrowth3Y: pctChange("netIncome"),
    epsGrowth3Y: pctChange("eps"),
  };
}


function buildExtractedMetrics(profile, quote, raw = {}) {
  const currentPrice = firstNumber(quote?.c, raw.currentPrice);
  const marketCapM = firstNumber(profile?.marketCapitalization, raw.marketCapM);

  const weekHigh = firstNumber(raw.weekHigh, raw["52WeekHigh"], raw["52WeekHighDate"]);
  const weekLow = firstNumber(raw.weekLow, raw["52WeekLow"]);

  const pullbackFromHigh =
    currentPrice !== null && weekHigh !== null && weekHigh > 0
      ? ((weekHigh - currentPrice) / weekHigh) * 100
      : null;

  const distanceFrom52WeekLow =
    currentPrice !== null && weekLow !== null && weekLow > 0
      ? ((currentPrice - weekLow) / weekLow) * 100
      : null;

  return {
    currentPrice,
    marketCapM,
    beta: firstNumber(raw.beta, raw.betaAnnual),

    peRatio: firstNumber(raw.peTTM, raw.peNormalizedAnnual, raw.peBasicExclExtraTTM, raw.peRatio),
    forwardPe: firstNumber(raw.forwardPE, raw.forwardPe),
    pegRatio: firstNumber(raw.pegRatio),
    priceToSales: firstNumber(raw.psTTM, raw.psAnnual, raw.priceToSales),
    priceToBook: firstNumber(raw.pbQuarterly, raw.pbAnnual, raw.priceToBook),
    priceToCashFlow: firstNumber(raw.pcfShareTTM, raw.priceToCashFlow),
    priceToFreeCashFlow: firstNumber(raw.pfcfShareTTM, raw.priceToFreeCashFlow),
    dividendYield: percentFromDecimal(firstNumber(raw.currentDividendYieldTTM, raw.dividendYieldIndicatedAnnual, raw.dividendYield)),

    revenueGrowth: percentFromDecimal(firstNumber(raw.revenueGrowthTTMYoy, raw.revenueGrowthQuarterlyYoy, raw.revenueGrowth, raw.revenueGrowth5Y)),
    revenueGrowthQuarterly: percentFromDecimal(firstNumber(raw.revenueGrowthQuarterlyYoy, raw.revenueGrowthQuarterly)),
    revenueGrowth3Y: percentFromDecimal(firstNumber(raw.revenueGrowth3Y)),
    revenueGrowth5Y: percentFromDecimal(firstNumber(raw.revenueGrowth5Y)),

    epsGrowth: percentFromDecimal(firstNumber(raw.epsGrowthTTMYoy, raw.epsGrowthQuarterlyYoy, raw.epsGrowth)),
    epsGrowth3Y: percentFromDecimal(firstNumber(raw.epsGrowth3Y)),
    epsGrowth5Y: percentFromDecimal(firstNumber(raw.epsGrowth5Y)),

    roe: percentFromDecimal(firstNumber(raw.roeTTM, raw.roeRfy, raw.roe)),
    roa: percentFromDecimal(firstNumber(raw.roaTTM, raw.roaRfy, raw.roa)),
    roi: percentFromDecimal(firstNumber(raw.roiTTM, raw.roiAnnual, raw.roi, raw.roicCalculated)),
    grossMargin: percentFromDecimal(firstNumber(raw.grossMarginTTM, raw.grossMarginAnnual, raw.grossMargin)),
    operatingMargin: percentFromDecimal(firstNumber(raw.operatingMarginTTM, raw.operatingMarginAnnual, raw.operatingMargin)),
    pretaxMargin: percentFromDecimal(firstNumber(raw.pretaxMarginTTM, raw.pretaxMarginAnnual, raw.pretaxMargin)),
    netMargin: percentFromDecimal(firstNumber(raw.netProfitMarginTTM, raw.netProfitMarginAnnual, raw.netMargin)),

    debtToEquity: firstNumber(raw.totalDebtToEquityQuarterly, raw.totalDebtToEquityAnnual, raw.debtToEquity),
    longTermDebtToEquity: firstNumber(raw.longTermDebtToEquityQuarterly, raw.longTermDebtToEquityAnnual, raw.longTermDebtToEquity),
    currentRatio: firstNumber(raw.currentRatioQuarterly, raw.currentRatioAnnual, raw.currentRatio),
    quickRatio: firstNumber(raw.quickRatioQuarterly, raw.quickRatioAnnual, raw.quickRatio),
    cashRatio: firstNumber(raw.cashRatioQuarterly, raw.cashRatioAnnual, raw.cashRatio),
    assetTurnover: firstNumber(raw.assetTurnoverTTM, raw.assetTurnoverAnnual, raw.assetTurnover),
    operatingIncome: firstNumber(raw.operatingIncomeTTM, raw.operatingIncomeAnnual, raw.operatingIncome),
    operatingCashFlow: firstNumber(raw.operatingCashFlowTTM, raw.operatingCashFlowAnnual, raw.operatingCashFlow),
    capex: firstNumber(raw.capexTTM, raw.capexAnnual, raw.capitalExpenditureTTM, raw.capitalExpenditureAnnual, raw.capex, raw.capitalExpenditure),
    freeCashFlow: firstNumber(raw.freeCashFlowTTM, raw.freeCashFlowAnnual, raw.freeCashFlow),
    pretaxIncome: firstNumber(raw.pretaxIncomeTTM, raw.pretaxIncomeAnnual, raw.pretaxIncome, raw.incomeBeforeTax),
    incomeTaxExpense: firstNumber(raw.incomeTaxExpenseTTM, raw.incomeTaxExpenseAnnual, raw.incomeTaxExpense),
    ebitda: firstNumber(raw.ebitdaTTM, raw.ebitdaAnnual, raw.ebitda),
    dilutedShares: firstNumber(raw.dilutedSharesOutstanding, raw.weightedAverageShsOutDil, raw.sharesOutstanding),
    dividendsPaid: firstNumber(raw.dividendsPaid, raw.dividendPayments),
    fcfMargin: percentFromDecimal(firstNumber(raw.fcfMargin, raw.freeCashFlowMargin)),
    ocfMargin: percentFromDecimal(firstNumber(raw.ocfMargin, raw.operatingCashFlowMargin)),
    netIncome: firstNumber(raw.netIncomeTTM, raw.netIncomeAnnual, raw.netIncome),
    priorRevenue: firstNumber(raw.priorRevenue),
    olderRevenue: firstNumber(raw.olderRevenue),
    oldestRevenue: firstNumber(raw.oldestRevenue),
    epsLatest: firstNumber(raw.epsLatest),
    epsPrior: firstNumber(raw.epsPrior),
    epsOldest: firstNumber(raw.epsOldest),
    priorNetIncome: firstNumber(raw.priorNetIncome),
    oldestNetIncome: firstNumber(raw.oldestNetIncome),
    grossProfit: firstNumber(raw.grossProfitTTM, raw.grossProfitAnnual, raw.grossProfit),
    ebitda: firstNumber(raw.ebitdaTTM, raw.ebitdaAnnual, raw.ebitda),
    ebit: firstNumber(raw.ebitTTM, raw.ebitAnnual, raw.ebit, raw.operatingIncomeTTM, raw.operatingIncomeAnnual, raw.operatingIncome),
    interestExpense: firstNumber(raw.interestExpenseTTM, raw.interestExpenseAnnual, raw.interestExpense),
    currentAssets: firstNumber(raw.totalCurrentAssetsQuarterly, raw.totalCurrentAssetsAnnual, raw.currentAssetsQuarterly, raw.currentAssetsAnnual, raw.currentAssets),
    totalAssets: firstNumber(raw.totalAssetsQuarterly, raw.totalAssetsAnnual, raw.totalAssets),
    currentLiabilities: firstNumber(raw.totalCurrentLiabilitiesQuarterly, raw.totalCurrentLiabilitiesAnnual, raw.currentLiabilitiesQuarterly, raw.currentLiabilitiesAnnual, raw.currentLiabilities),
    totalLiabilities: firstNumber(raw.totalLiabilitiesQuarterly, raw.totalLiabilitiesAnnual, raw.totalLiabilities),
    inventory: firstNumber(raw.inventoryQuarterly, raw.inventoryAnnual, raw.inventory),
    accountsReceivable: firstNumber(raw.accountsReceivableQuarterly, raw.accountsReceivableAnnual, raw.accountsReceivable, raw.netReceivables),
    shortTermInvestments: firstNumber(raw.shortTermInvestmentsQuarterly, raw.shortTermInvestmentsAnnual, raw.shortTermInvestments),
    shortTermDebt: firstNumber(raw.shortTermDebtQuarterly, raw.shortTermDebtAnnual, raw.shortTermDebt),
    longTermDebt: firstNumber(raw.longTermDebtQuarterly, raw.longTermDebtAnnual, raw.longTermDebt),
    totalDebt: firstNumber(raw.totalDebtQuarterly, raw.totalDebtAnnual, raw.totalDebt),
    debtToAssets: firstNumber(raw.debtToAssets),
    equityRatio: firstNumber(raw.equityRatio),
    shareholderEquity: firstNumber(raw.totalEquityQuarterly, raw.totalEquityAnnual, raw.shareholderEquity, raw.bookValuePerShareAnnual && raw.sharesOutstanding ? raw.bookValuePerShareAnnual * raw.sharesOutstanding : null),
    cashAndEquivalents: firstNumber(raw.cashAndEquivalentsQuarterly, raw.cashAndEquivalentsAnnual, raw.cashAndEquivalents, raw.cashPerShareAnnual && raw.sharesOutstanding ? raw.cashPerShareAnnual * raw.sharesOutstanding : null),
    netIncomeGrowth3Y: percentFromDecimal(firstNumber(raw.netIncomeGrowth3Y, raw.netIncomeGrowth3YAnnual, raw["3YearNetIncomeGrowth"])),
    interestCoverage: firstNumber(raw.interestCoverageTTM, raw.interestCoverageAnnual, raw.interestCoverage),
    cashFlowToDebt: firstNumber(raw.cashFlowToDebtTTM, raw.cashFlowToDebtAnnual, raw.cashFlowToDebt),
    operatingCashFlowPerShare: firstNumber(raw.operatingCashFlowPerShareTTM, raw.operatingCashFlowPerShareAnnual, raw.operatingCashFlowPerShare),
    freeCashFlowPerShare: firstNumber(raw.freeCashFlowPerShareTTM, raw.freeCashFlowPerShareAnnual, raw.freeCashFlowPerShare),
    totalDebtToCapital: firstNumber(raw.totalDebtToCapitalizationQuarterly, raw.totalDebtToCapitalizationAnnual, raw.totalDebtToCapital),
    netDebtToEbitda: firstNumber(raw.netDebtToEBITDATTM, raw.netDebtToEBITDAAnnual, raw.netDebtToEbitda),

    priceReturn4Week: firstNumber(raw["4WeekPriceReturnDaily"], raw.monthToDatePriceReturnDaily, raw.priceReturn4Week),
    priceReturn12Week: firstNumber(raw.priceReturn12Week, raw["12WeekPriceReturnDaily"]),
    priceReturn13Week: firstNumber(raw["13WeekPriceReturnDaily"], raw["3MonthPriceReturnDaily"], raw.priceReturn13Week),
    priceReturn26Week: firstNumber(raw["26WeekPriceReturnDaily"], raw["6MonthPriceReturnDaily"], raw.priceReturn26Week),
    priceReturn52Week: firstNumber(raw["52WeekPriceReturnDaily"], raw.yearToDatePriceReturnDaily, raw.priceReturn52Week),
    weekHigh,
    weekLow,
    rsi14: firstNumber(raw.rsi14, raw.rsi, raw.relativeStrengthIndex14),
    pullbackFromHigh: firstNumber(raw.pullbackFromHigh, pullbackFromHigh),
    distanceFrom52WeekLow,
    dayChangePercent: firstNumber(quote?.dp),
  };
}


function deriveMissingMetrics(m = {}) {
  // This is the core "calculate it if we can" layer. Provider fields are treated as
  // raw ingredients. If Twelve gives revenue + prior revenue but not YoY growth, we
  // calculate YoY growth. If it gives balance-sheet pieces but not ratios, we derive
  // the ratios. Missing values remain voided and never count as zero.
  setDerivedMetric(m, "revenueGrowth", percentChange(m.revenue, m.priorRevenue));
  setDerivedMetric(m, "revenueGrowth3Y", annualizedGrowth(m.revenue, m.olderRevenue, 3));
  setDerivedMetric(m, "revenueGrowth5Y", annualizedGrowth(m.revenue, m.oldestRevenue, 5));

  setDerivedMetric(m, "epsGrowth", percentChange(firstNumber(m.epsLatest, m.eps), m.epsPrior));
  setDerivedMetric(m, "epsGrowth3Y", annualizedGrowth(firstNumber(m.epsLatest, m.eps), m.epsOldest, 3));
  setDerivedMetric(m, "epsGrowth5Y", annualizedGrowth(firstNumber(m.epsLatest, m.eps), m.epsOldest, 5));
  setDerivedMetric(m, "netIncomeGrowth3Y", annualizedGrowth(m.netIncome, m.oldestNetIncome, 3));
  setDerivedMetric(m, "netIncomeGrowth", percentChange(m.netIncome, m.priorNetIncome));

  setDerivedMetric(m, "grossMargin", divide(m.grossProfit, m.revenue) !== null ? divide(m.grossProfit, m.revenue) * 100 : null);
  setDerivedMetric(m, "operatingMargin", divide(m.operatingIncome, m.revenue) !== null ? divide(m.operatingIncome, m.revenue) * 100 : null);
  setDerivedMetric(m, "pretaxMargin", divide(m.pretaxIncome, m.revenue) !== null ? divide(m.pretaxIncome, m.revenue) * 100 : null);
  setDerivedMetric(m, "netMargin", divide(m.netIncome, m.revenue) !== null ? divide(m.netIncome, m.revenue) * 100 : null);
  setDerivedMetric(m, "fcfMargin", divide(m.freeCashFlow, m.revenue) !== null ? divide(m.freeCashFlow, m.revenue) * 100 : null);
  setDerivedMetric(m, "ocfMargin", divide(m.operatingCashFlow, m.revenue) !== null ? divide(m.operatingCashFlow, m.revenue) * 100 : null);

  setDerivedMetric(m, "roe", divide(m.netIncome, m.shareholderEquity) !== null ? divide(m.netIncome, m.shareholderEquity) * 100 : null);
  setDerivedMetric(m, "roa", divide(m.netIncome, m.totalAssets) !== null ? divide(m.netIncome, m.totalAssets) * 100 : null);
  const investedCapital = firstNumber(m.investedCapital, (safeNumber(m.totalDebt) !== null && safeNumber(m.shareholderEquity) !== null) ? m.totalDebt + m.shareholderEquity - (safeNumber(m.cashAndEquivalents) || 0) : null);
  setDerivedMetric(m, "investedCapital", investedCapital);
  setDerivedMetric(m, "roicCalculated", divide(firstNumber(m.nopat, safeNumber(m.operatingIncome) !== null ? m.operatingIncome * 0.79 : null), investedCapital) !== null ? divide(firstNumber(m.nopat, safeNumber(m.operatingIncome) !== null ? m.operatingIncome * 0.79 : null), investedCapital) * 100 : null);
  setDerivedMetric(m, "roi", m.roicCalculated);

  setDerivedMetric(m, "debtToEquity", divide(m.totalDebt, m.shareholderEquity));
  setDerivedMetric(m, "debtToAssets", divide(m.totalDebt, m.totalAssets));
  setDerivedMetric(m, "equityRatio", divide(m.shareholderEquity, m.totalAssets));
  setDerivedMetric(m, "totalDebt", firstNumber(m.totalDebt, (safeNumber(m.shortTermDebt) || 0) + (safeNumber(m.longTermDebt) || 0)));
  setDerivedMetric(m, "longTermDebtToEquity", divide(m.longTermDebt, m.shareholderEquity));
  setDerivedMetric(m, "totalLiabilitiesToAssets", divide(m.totalLiabilities, m.totalAssets));
  setDerivedMetric(m, "totalDebtToCapital", divide(m.totalDebt, (safeNumber(m.totalDebt) || 0) + (safeNumber(m.shareholderEquity) || 0)));
  setDerivedMetric(m, "currentRatio", divide(m.currentAssets, m.currentLiabilities));
  setDerivedMetric(m, "quickRatio", divide((safeNumber(m.cashAndEquivalents) || 0) + (safeNumber(m.shortTermInvestments) || 0) + (safeNumber(m.accountsReceivable) || 0), m.currentLiabilities));
  setDerivedMetric(m, "cashRatio", divide(m.cashAndEquivalents, m.currentLiabilities));
  setDerivedMetric(m, "cashFlowToDebt", divide(m.operatingCashFlow, m.totalDebt));
  setDerivedMetric(m, "interestCoverage", divide(firstNumber(m.ebit, m.operatingIncome), Math.abs(safeNumber(m.interestExpense) || 0)));

  setDerivedMetric(m, "freeCashFlow", safeNumber(m.operatingCashFlow) !== null && safeNumber(m.capex) !== null ? m.operatingCashFlow - Math.abs(m.capex) : null);
  setDerivedMetric(m, "freeCashFlowPerShare", divide(m.freeCashFlow, m.sharesOutstanding));
  setDerivedMetric(m, "operatingCashFlowPerShare", divide(m.operatingCashFlow, m.sharesOutstanding));
  setDerivedMetric(m, "assetTurnover", divide(m.revenue, m.totalAssets));
  setDerivedMetric(m, "cashConversionRatio", divide(m.freeCashFlow, m.netIncome));
  setDerivedMetric(m, "operatingCashConversion", divide(m.operatingCashFlow, m.netIncome));
  setDerivedMetric(m, "accrualRatio", divide((safeNumber(m.netIncome) || 0) - (safeNumber(m.operatingCashFlow) || 0), m.totalAssets));
  setDerivedMetric(m, "payoutRatio", divide(Math.abs(safeNumber(m.dividendsPaid) || 0), m.netIncome) !== null ? divide(Math.abs(safeNumber(m.dividendsPaid) || 0), m.netIncome) * 100 : null);
  setDerivedMetric(m, "taxRate", divide(m.incomeTaxExpense, m.pretaxIncome) !== null ? divide(m.incomeTaxExpense, m.pretaxIncome) * 100 : null);

  const marketCapDollars = safeNumber(m.marketCapM) !== null ? m.marketCapM * 1_000_000 : null;
  setDerivedMetric(m, "priceToSales", divide(marketCapDollars, m.revenue));
  setDerivedMetric(m, "priceToBook", divide(marketCapDollars, m.shareholderEquity));
  setDerivedMetric(m, "priceToCashFlow", divide(marketCapDollars, m.operatingCashFlow));
  setDerivedMetric(m, "priceToFreeCashFlow", divide(marketCapDollars, m.freeCashFlow));
  setDerivedMetric(m, "enterpriseValue", safeNumber(m.enterpriseValue) !== null ? m.enterpriseValue : (marketCapDollars !== null ? toMillions(marketCapDollars + (safeNumber(m.totalDebt) || 0) - (safeNumber(m.cashAndEquivalents) || 0)) : null));
  const evDollars = safeNumber(m.enterpriseValue) !== null ? (m.enterpriseValue > 1_000_000 ? m.enterpriseValue : m.enterpriseValue * 1_000_000) : null;
  setDerivedMetric(m, "evToEbitda", divide(evDollars, m.ebitda));
  setDerivedMetric(m, "peRatio", divide(safeNumber(m.currentPrice) !== null ? m.currentPrice : null, m.epsLatest));

  setDerivedMetric(m, "pullbackFromHigh", safeNumber(m.currentPrice) !== null && safeNumber(m.weekHigh) !== null && m.weekHigh > 0 ? ((m.weekHigh - m.currentPrice) / m.weekHigh) * 100 : null);
  setDerivedMetric(m, "distanceFrom52WeekLow", safeNumber(m.currentPrice) !== null && safeNumber(m.weekLow) !== null && m.weekLow > 0 ? ((m.currentPrice - m.weekLow) / m.weekLow) * 100 : null);

  return m;
}

function scoreGrowth(m = {}) {
  return categoryAverage(
    [
      { score: metricScore(m.revenueGrowth, [[40, 10], [25, 9], [15, 8], [8, 7], [3, 6], [0, 5], [-5, 4], [-999, 3]]), weight: 0.30 },
      { score: metricScore(m.revenueGrowthQuarterly, [[35, 10], [22, 9], [12, 8], [6, 7], [2, 6], [0, 5], [-5, 4], [-999, 3]]), weight: 0.15 },
      { score: metricScore(m.revenueGrowth3Y, [[25, 10], [18, 9], [12, 8], [7, 7], [3, 6], [0, 5], [-5, 4], [-999, 3]]), weight: 0.15 },
      { score: metricScore(m.revenueGrowth5Y, [[20, 10], [14, 9], [9, 8], [5, 7], [2, 6], [0, 5], [-5, 4], [-999, 3]]), weight: 0.10 },
      { score: metricScore(m.epsGrowth, [[40, 10], [25, 9], [15, 8], [8, 7], [3, 6], [0, 5], [-10, 4], [-999, 3]]), weight: 0.18 },
      { score: metricScore(m.epsGrowth3Y, [[25, 10], [18, 9], [12, 8], [7, 7], [3, 6], [0, 5], [-10, 4], [-999, 3]]), weight: 0.07 },
      { score: metricScore(m.epsGrowth5Y, [[22, 10], [16, 9], [10, 8], [6, 7], [2, 6], [0, 5], [-10, 4], [-999, 3]]), weight: 0.05 },
      { score: metricScore(m.netIncomeGrowth3Y, [[30, 10], [20, 9], [12, 8], [6, 7], [2, 6], [0, 5], [-10, 4], [-999, 3]]), weight: 0.10 },
    ]
  );
}

function scoreProfitability(m = {}) {
  const marginReturnScore = categoryAverage(
    [
      { score: metricScore(m.roe, [[60, 10], [35, 9], [20, 8], [12, 7], [5, 6], [0, 5], [-999, 3]]), weight: 0.20 },
      { score: metricScore(m.roa, [[18, 10], [12, 9], [8, 8], [5, 7], [2, 6], [0, 5], [-999, 3]]), weight: 0.12 },
      { score: metricScore(m.roi, [[30, 10], [20, 9], [14, 8], [9, 7], [4, 6], [0, 5], [-999, 3]]), weight: 0.12 },
      { score: metricScore(m.grossMargin, [[70, 10], [55, 9], [40, 8], [28, 7], [18, 6], [8, 5], [-999, 3]]), weight: 0.12 },
      { score: metricScore(m.operatingMargin, [[35, 10], [25, 9], [15, 8], [8, 7], [3, 6], [0, 5], [-999, 3]]), weight: 0.19 },
      { score: metricScore(m.netMargin, [[30, 10], [20, 9], [12, 8], [7, 7], [3, 6], [0, 5], [-999, 3]]), weight: 0.15 },
    ]
  );

  const earningsGrowthSupport = categoryAverage(
    [
      { score: metricScore(m.epsGrowth, [[40, 10], [25, 9], [15, 8], [8, 7], [3, 6], [0, 5], [-10, 4], [-999, 3]]), weight: 0.45 },
      { score: metricScore(m.epsGrowth3Y, [[25, 10], [18, 9], [12, 8], [7, 7], [3, 6], [0, 5], [-10, 4], [-999, 3]]), weight: 0.25 },
      { score: metricScore(m.epsGrowth5Y, [[22, 10], [16, 9], [10, 8], [6, 7], [2, 6], [0, 5], [-10, 4], [-999, 3]]), weight: 0.15 },
      { score: metricScore(m.netIncomeGrowth3Y, [[30, 10], [20, 9], [12, 8], [6, 7], [2, 6], [0, 5], [-10, 4], [-999, 3]]), weight: 0.15 },
    ]
  );

  return availableWeightedAverage([
    { score: marginReturnScore, weight: marginReturnScore === null ? 0 : 0.82 },
    { score: earningsGrowthSupport, weight: earningsGrowthSupport === null ? 0 : 0.18 },
  ], null);
}

function scoreFinancialHealth(m = {}) {
  const leverageScore = availableWeightedAverage(
    [
      { score: inverseMetricScore(m.debtToEquity, [[0.3, 10], [0.7, 9], [1.2, 8], [2.0, 6.8], [3.0, 5.8], [999, 4.6]]), weight: 0.38 },
      { score: inverseMetricScore(m.longTermDebtToEquity, [[0.3, 10], [0.7, 9], [1.2, 8], [2.0, 6.8], [3.0, 5.8], [999, 4.6]]), weight: 0.25 },
      { score: inverseMetricScore(m.totalDebtToCapital, [[0.25, 10], [0.4, 9], [0.6, 7.8], [0.8, 6.4], [1.0, 5.2], [999, 4.4]]), weight: 0.20 },
      { score: inverseMetricScore(m.netDebtToEbitda, [[0.5, 10], [1.5, 9], [2.5, 8], [4, 6.8], [6, 5.5], [999, 4.4]]), weight: 0.17 },
    ],
    null
  );

  const liquidityScore = availableWeightedAverage(
    [
      { score: metricScore(m.currentRatio, [[3, 9.2], [2, 8.7], [1.5, 8.2], [1, 7.2], [0.75, 6.0], [-999, 5.0]]), weight: 0.45 },
      { score: metricScore(m.quickRatio, [[2, 9], [1.4, 8.5], [1, 7.7], [0.7, 6.2], [-999, 5.0]]), weight: 0.30 },
      { score: metricScore(m.cashRatio, [[1, 9], [0.5, 8.2], [0.25, 7], [0.1, 5.8], [-999, 5.0]]), weight: 0.25 },
    ],
    null
  );

  const coverageScore = availableWeightedAverage(
    [
      { score: metricScore(m.interestCoverage, [[40, 10], [20, 9.3], [10, 8.5], [5, 7.2], [2, 6], [0.5, 4.8], [-999, 4]]), weight: 0.45 },
      { score: metricScore(m.cashFlowToDebt, [[0.7, 10], [0.45, 9], [0.25, 8], [0.12, 6.8], [0.05, 5.5], [-999, 4.5]]), weight: 0.25 },
      { score: metricScore(m.operatingCashFlowPerShare, [[20, 10], [10, 9], [5, 8], [2, 7], [0.5, 5.8], [-999, 4.5]]), weight: 0.15 },
      { score: metricScore(m.freeCashFlowPerShare, [[15, 10], [7.5, 9], [3, 8], [1, 6.8], [0.25, 5.6], [-999, 4.5]]), weight: 0.15 },
    ],
    null
  );

  const profitabilitySupport = availableWeightedAverage(
    [
      { score: metricScore(m.operatingMargin, [[35, 10], [25, 9.2], [15, 8.4], [8, 7.2], [3, 6.2], [0.5, 5], [-999, 4]]), weight: 0.36 },
      { score: metricScore(m.netMargin, [[30, 10], [20, 9.1], [12, 8.3], [7, 7.2], [3, 6.2], [0.5, 5], [-999, 4]]), weight: 0.24 },
      { score: metricScore(m.roe, [[60, 10], [35, 9.2], [20, 8.4], [12, 7.4], [5, 6.2], [0.5, 5], [-999, 4]]), weight: 0.22 },
      { score: metricScore(m.roa, [[18, 10], [12, 9.2], [8, 8.4], [5, 7.4], [2, 6.2], [0.5, 5], [-999, 4]]), weight: 0.18 },
    ],
    null
  );

  const sizeSupport = metricScore(m.marketCapM, [[1_000_000, 9.0], [500_000, 8.6], [100_000, 7.8], [25_000, 7.0], [5_000, 6.0], [-999, 5.0]]);

  const availableHealthInputs = [
    m.debtToEquity,
    m.longTermDebtToEquity,
    m.totalDebtToCapital,
    m.netDebtToEbitda,
    m.currentRatio,
    m.quickRatio,
    m.cashRatio,
    m.interestCoverage,
    m.cashFlowToDebt,
    m.operatingCashFlowPerShare,
    m.freeCashFlowPerShare,
  ].filter((value) => scoreInputNumber(value) !== null).length;

  const coreScore = availableWeightedAverage(
    [
      { score: leverageScore, weight: leverageScore === null ? 0 : 0.34 },
      { score: liquidityScore, weight: liquidityScore === null ? 0 : 0.24 },
      { score: coverageScore, weight: coverageScore === null ? 0 : 0.24 },
      { score: profitabilitySupport, weight: profitabilitySupport === null ? 0 : 0.18 },
    ],
    null
  );

  const supportScore = availableWeightedAverage(
    [
      { score: profitabilitySupport, weight: profitabilitySupport === null ? 0 : 0.68 },
      { score: sizeSupport, weight: sizeSupport === null ? 0 : 0.32 },
    ],
    null
  );

  // If the API only gives 1-2 usable balance-sheet fields, do not let a single weak ratio
  // crush companies with massive scale and strong margins/returns.
  const supportWeight = availableHealthInputs >= 6 ? 0.20 : availableHealthInputs >= 3 ? 0.35 : 0.55;

  const finalScore = availableWeightedAverage(
    [
      { score: coreScore, weight: coreScore === null ? 0 : 1 - supportWeight },
      { score: supportScore, weight: supportScore === null ? 0 : supportWeight },
    ],
    null
  );

  return finalScore === null ? null : Number(clamp(finalScore, 0, 10).toFixed(1));
}




function scoreValuation(m = {}, growthScore = 6, profitabilityScore = 6) {
  const raw = categoryAverage(
    [
      { score: inverseMetricScore(m.peRatio, [[12, 9.5], [18, 8.5], [25, 7.5], [35, 6.5], [50, 5.5], [75, 4.5], [9999, 3.5]]), weight: 0.25 },
      { score: inverseMetricScore(m.forwardPe, [[14, 9], [20, 8], [28, 7], [40, 6], [60, 5], [9999, 3.5]]), weight: 0.10 },
      { score: inverseMetricScore(m.pegRatio, [[0.8, 9.5], [1.2, 8.5], [1.8, 7.5], [2.5, 6], [4, 4.5], [9999, 3]]), weight: 0.15 },
      { score: inverseMetricScore(m.priceToSales, [[2, 9], [4, 8], [7, 6.5], [12, 5], [20, 3.5], [9999, 2.5]]), weight: 0.18 },
      { score: inverseMetricScore(m.priceToBook, [[2, 9], [4, 8], [7, 6.5], [12, 5], [20, 3.5], [9999, 2.5]]), weight: 0.12 },
      { score: inverseMetricScore(m.priceToFreeCashFlow, [[15, 9], [25, 8], [40, 6.5], [65, 5], [100, 3.5], [9999, 2.5]]), weight: 0.20 },
    ]
  );

  if (raw === null) return null;
  const businessSupport = availableWeightedAverage([{ score: growthScore, weight: 0.215 }, { score: profitabilityScore, weight: 0.205 }], 6);
  return Number(clamp(raw + Math.max(-0.5, Math.min(0.8, (businessSupport - 6) * 0.12))).toFixed(1));
}


function scoreQuality(m = {}) {
  return categoryAverage(
    [
      { score: metricScore(m.roicCalculated, [[30, 10], [20, 9], [14, 8], [9, 7], [4, 6], [0, 5], [-999, 3]]), weight: 0.22 },
      { score: metricScore(m.freeCashFlowPerShare, [[15, 10], [7.5, 9], [3, 8], [1, 6.8], [0.25, 5.6], [-999, 4.5]]), weight: 0.16 },
      { score: metricScore(m.fcfMargin, [[30, 10], [20, 9], [12, 8], [7, 7], [3, 6], [0, 5], [-999, 3.5]]), weight: 0.16 },
      { score: metricScore(m.ocfMargin, [[35, 10], [24, 9], [15, 8], [8, 7], [3, 6], [0, 5], [-999, 3.5]]), weight: 0.12 },
      { score: metricScore(m.cashConversionRatio, [[1.25, 10], [1, 9], [0.75, 8], [0.45, 6.8], [0.15, 5.5], [-999, 4.5]]), weight: 0.14 },
      { score: inverseMetricScore(m.accrualRatio, [[-0.08, 9.5], [0, 8.5], [0.06, 7.2], [0.12, 6.0], [0.25, 4.8], [999, 3.5]]), weight: 0.10 },
      { score: metricScore(m.assetTurnover, [[1.4, 9], [1, 8], [0.65, 7], [0.35, 6], [0.15, 5], [-999, 4]]), weight: 0.10 },
    ]
  );
}

function scoreMomentum(m = {}) {
  return categoryAverage(
    [
      { score: metricScore(m.priceReturn12Week ?? m.priceReturn13Week, [[25, 10], [15, 9], [8, 8], [2, 7], [-5, 5], [-15, 4], [-999, 3]]), weight: 0.36 },
      { score: metricScore(m.priceReturn26Week, [[40, 10], [25, 9], [12, 8], [3, 7], [-8, 5], [-20, 4], [-999, 3]]), weight: 0.34 },
      { score: metricScore(m.priceReturn52Week, [[70, 10], [40, 9], [20, 8], [5, 7], [-10, 5], [-25, 4], [-999, 3]]), weight: 0.30 },
    ]
  );
}

function scorePullback(m = {}) {
  return categoryAverage(
    [
      { score: inverseMetricScore(m.rsi14, [[30, 8.8], [40, 8], [55, 7], [65, 6], [75, 4.5], [999, 3.5]]), weight: 0.45 },
      { score: metricScore(m.pullbackFromHigh, [[35, 9], [25, 8], [15, 7], [8, 6], [3, 5], [0, 4], [-999, 3]]), weight: 0.35 },
      { score: metricScore(m.distanceFrom52WeekLow, [[80, 9], [50, 8], [30, 7], [15, 6], [5, 5], [-999, 3]]), weight: 0.20 },
    ]
  );
}

function strongestWeakest(categories = {}) {
  const entries = Object.entries(categories)
    .filter(([, value]) => safeNumber(value) !== null)
    .sort((a, b) => safeNumber(b[1]) - safeNumber(a[1]));

  const strongest = entries[0];
  const weakest = entries[entries.length - 1];

  return {
    strongest: strongest ? `${labelCategory(strongest[0])} ${scoreText(strongest[1])}` : "N/A",
    weakest: weakest ? `${labelCategory(weakest[0])} ${scoreText(weakest[1])}` : "N/A",
  };
}

function labelCategory(key) {
  const labels = { growth: "Growth", profitability: "Profitability", financialHealth: "Financial Health", valuation: "Valuation", momentum: "Momentum", pullback: "Pullback" };

  return labels[key] || key;
}



function compactNewsText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9$\.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


const evalArticleImageCache = new Map();

function isQualityEvalArticleImage(imageUrl = "", articleUrl = "") {
  const raw = String(imageUrl || "").trim();
  if (!/^https?:\/\//i.test(raw)) return false;
  const lower = raw.toLowerCase();
  const bad = /(logo|favicon|icon|sprite|placeholder|blank|transparent|default-image|default_logo|avatar|profile|author|rss|apple-touch|finance-logo|yahoo-finance-logo|share-card|og-default|markets-logo)/i;
  if (bad.test(lower)) return false;
  if (/\.svg(\?|$)/i.test(lower)) return false;
  if (/1x1|pixel|spacer/i.test(lower)) return false;
  return true;
}

async function fetchEvalArticleCoverImage(articleUrl = "") {
  const url = String(articleUrl || "").trim();
  if (!/^https?:\/\//i.test(url)) return "";
  const cached = evalArticleImageCache.get(url);
  if (cached !== undefined) return cached;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2200);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 EvalBot/1.0",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) throw new Error("cover fetch failed");
    const html = await response.text();
    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      const candidate = match?.[1]?.replace(/&amp;/g, "&").trim();
      if (isQualityEvalArticleImage(candidate, url)) {
        evalArticleImageCache.set(url, candidate);
        return candidate;
      }
    }
  } catch {
    // Keep news fast and usable if the publisher blocks article-page metadata fetches.
  } finally {
    clearTimeout(timeout);
  }
  evalArticleImageCache.set(url, "");
  if (evalArticleImageCache.size > 120) {
    for (const key of evalArticleImageCache.keys()) {
      evalArticleImageCache.delete(key);
      if (evalArticleImageCache.size <= 80) break;
    }
  }
  return "";
}

async function resolveEvalArticleImage(item = {}) {
  const articleUrl = String(item.url || "");
  const initial = isQualityEvalArticleImage(item.image, articleUrl) ? String(item.image).trim() : "";
  return initial || await fetchEvalArticleCoverImage(articleUrl);
}

function companyNewsAliases(symbol, profile = {}) {
  const aliases = new Set();
  const cleanSymbol = String(symbol || "").toUpperCase().trim();
  if (cleanSymbol) aliases.add(cleanSymbol.toLowerCase());
  if (cleanSymbol.includes(".")) aliases.add(cleanSymbol.split(".")[0].toLowerCase());

  const name = String(profile?.name || profile?.ticker || "").trim();
  if (name) {
    aliases.add(compactNewsText(name));
    const simplified = compactNewsText(
      name
        .replace(/\b(incorporated|inc\.?|corp\.?|corporation|company|co\.?|ltd\.?|limited|plc|holdings?|group|class a|class b|ordinary shares|common stock|adr|ads)\b/gi, " ")
        .trim()
    );
    if (simplified) aliases.add(simplified);

    const words = simplified.split(" ").filter((word) => word.length > 2 && !["the", "and", "for", "with"].includes(word));
    if (words.length >= 2) aliases.add(words.slice(0, 2).join(" "));
    if (words.length >= 1 && words[0].length >= 5) aliases.add(words[0]);
  }

  return Array.from(aliases).filter(Boolean);
}

function newsSpecificityScore(item = {}, symbol, profile = {}) {
  const aliases = companyNewsAliases(symbol, profile);
  const cleanSymbol = String(symbol || "").toUpperCase().trim();
  const text = compactNewsText(`${item?.headline || item?.title || ""} ${item?.summary || ""} ${item?.url || ""}`);
  const headline = compactNewsText(item?.headline || item?.title || "");

  let score = 0;
  for (const alias of aliases) {
    if (!alias) continue;
    const cleanAlias = compactNewsText(alias);
    if (!cleanAlias) continue;
    if (headline.includes(cleanAlias)) score += 6;
    else if (text.includes(cleanAlias)) score += 3;
  }

  if (cleanSymbol && new RegExp(`(^|[^a-z0-9])${cleanSymbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").toLowerCase()}([^a-z0-9]|$)`).test(text)) {
    score += 8;
  }

  const broadOnlyTerms = ["s&p", "sp500", "nasdaq", "dow", "market movers", "top gainers", "top losers", "session", "watchlist"];
  if (broadOnlyTerms.some((term) => text.includes(term)) && score < 8) score -= 4;

  return score;
}

async function fetchRecentNews(symbol, profile = {}) {
  // Twelve Data does not provide the requested ticker-specific news sentiment feed.
  // Stock data remains Twelve Data only; news sentiment stays neutral until a separate news provider is added.
  return [];
}


function buildFallbackNewsOverallSummary(news = []) {
  if (!Array.isArray(news) || !news.length) {
    return "No recent ticker-specific company news was available from the active stock data provider. Eval keeps the news score neutral when there are no usable recent articles, so the overall score is not pushed higher or lower by missing headlines. The rest of the Eval Score still comes from company metrics, valuation, market behavior, and financial-health signals. When new ticker-specific articles become available, Eval will summarize them and give the news section a weighted score. This section is educational and should be read as context, not as a buy or sell signal.";
  }

  const titles = news.slice(0, 3).map((item, index) => item?.title || `article ${index + 1}`);
  const first = titles[0] || "the first article";
  const second = titles[1] || "the second article";
  const third = titles[2] || "the third article";

  return `The latest ticker-specific news set includes ${first}, ${second}, and ${third}. AI scoring is temporarily unavailable, so Eval is using a neutral 5.0 placeholder instead of inventing a precise news impact. The articles are still shown below so users can read the actual headlines and summaries behind the news section. Because the news score is neutral, it should not be treated as the main reason the Eval Score moved higher or lower. The company’s fundamentals, valuation, market behavior, and financial-health data carry more weight until AI news scoring is available again. Once OpenAI responds successfully, this section will become a weighted AI summary of the three ticker-specific news articles.`;
}

function fallbackNewsSentiment(news = []) {
  return {
    score: 5.0,
    label: "Neutral",
    summary: buildFallbackNewsOverallSummary(news),
    topics: news.map((item, index) => ({
      title: item.title || `News article ${index + 1}`,
      summary: item.summary || "No summary was available for this article.",
      url: item.url || "",
      source: item.source || "",
      image: isQualityEvalArticleImage(item.image, item.url) ? item.image : "",
      score: 5.0,
      weight: index === 0 ? 45 : index === 1 ? 35 : 20,
      impact: "Neutral impact.",
    })),
    articleCount: news.length,
    articles: news,
    source: "Fallback",
  };
}

function normalizeTopicWeights(topics) {
  if (!Array.isArray(topics) || !topics.length) return [];

  const defaults = [45, 35, 20];
  const cleaned = topics.slice(0, 3).map((topic, index) => ({
    title: String(topic?.title || `News article ${index + 1}`).trim(),
    summary: String(topic?.summary || "No summary available.").trim(),
    url: String(topic?.url || "").trim(),
    source: String(topic?.source || "").trim(),
    image: isQualityEvalArticleImage(topic?.image, topic?.url) ? String(topic?.image || "").trim() : "",
    score: Number((clamp(topic?.score, 0, 10) ?? 5).toFixed(1)),
    weight: Math.max(0, Math.min(100, safeNumber(topic?.weight) ?? defaults[index] ?? 20)),
    impact: String(topic?.impact || "").trim(),
  }));

  const total = cleaned.reduce((sum, topic) => sum + topic.weight, 0);
  if (total <= 0) return cleaned.map((topic, index) => ({ ...topic, weight: defaults[index] ?? 0 }));

  let normalized = cleaned.map((topic) => ({
    ...topic,
    weight: Number(((topic.weight / total) * 100).toFixed(0)),
  }));

  const normalizedTotal = normalized.reduce((sum, topic) => sum + topic.weight, 0);
  const diff = 100 - normalizedTotal;
  if (normalized.length && diff !== 0) {
    const maxIndex = normalized.reduce((best, topic, index, arr) => topic.weight > arr[best].weight ? index : best, 0);
    normalized[maxIndex] = { ...normalized[maxIndex], weight: Math.max(0, normalized[maxIndex].weight + diff) };
  }

  return normalized;
}

async function scoreNewsSentiment(symbol, profile, news = []) {
  const openAiKey = process.env.OPENAI_API_KEY;

  if (!openAiKey || !news.length) {
    return fallbackNewsSentiment(news);
  }

  const timeoutMs = Math.max(2000, Number(process.env.OPENAI_NEWS_TIMEOUT_MS || 6000));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: NEWS_SENTIMENT_MODEL,
        temperature: 0.12,
        max_tokens: 1450,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are Eval's stock-specific news sentiment rater. Analyze only the latest ticker-specific company-news articles provided for the requested ticker. Return only valid JSON with keys score, label, summary, topics. score must be a precise 0.0-10.0 number to one decimal, not a whole-number placeholder, where 0.0 is very negative for this stock, 5.0 is neutral, and 10.0 is very positive for this stock. label must be Bullish, Neutral, or Bearish. summary must be 5-7 clear sentences that summarize all three articles together, explain the shared theme, mention why the news matters for this specific company, and explain why the weighted news score received that exact decimal score. topics must be exactly 3 objects when 3 articles are provided. Each topic must include title, summary, url, source, score, weight, impact. Each topic summary must be exactly 3 short simple sentences: what happened, why it matters for this company/ticker, and whether it helps or hurts the stock context. Each topic score must be a precise decimal to one tenth such as 2.1, 5.3, or 6.7. Weight each topic by actual stock impact, company specificity, recency, and importance; weights must total 100. If an article is broad market/peer news and only weakly related to the ticker, give it lower weight and explain that. Do not give buy/sell advice.",
          },
          {
            role: "user",
            content: JSON.stringify({
              ticker: symbol,
              company: profile?.name || symbol,
              articles: news,
            }),
          },
        ],
      }),
    });

    clearTimeout(timeout);
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      console.warn("OpenAI news sentiment failed:", response.status, json?.error?.message || "");
      return fallbackNewsSentiment(news);
    }

    const parsed = JSON.parse(json?.choices?.[0]?.message?.content || "{}");
    let topics = normalizeTopicWeights(parsed.topics);

    topics = news.map((article, index) => {
      const topic = topics[index] || {};
      return {
        title: topic.title || article.title || `News article ${index + 1}`,
        summary: topic.summary || article.summary || "No summary available.",
        url: topic.url || article.url || "",
        source: topic.source || article.source || "",
        image: isQualityEvalArticleImage(topic.image, topic.url || article.url) ? topic.image : (isQualityEvalArticleImage(article.image, article.url) ? article.image : ""),
        score: Number((clamp(topic.score, 0, 10) ?? 5).toFixed(1)),
        weight: topic.weight ?? (index === 0 ? 45 : index === 1 ? 35 : 20),
        impact: topic.impact || "Neutral impact.",
      };
    });

    topics = normalizeTopicWeights(topics);
    const totalWeight = topics.reduce((sum, topic) => sum + topic.weight, 0) || 100;
    const weightedScore = topics.reduce((sum, topic) => sum + topic.score * (topic.weight / totalWeight), 0);
    const finalScore = Number((clamp(weightedScore, 0, 10) ?? 5).toFixed(1));

    return {
      score: finalScore,
      label: parsed.label || (finalScore >= 7 ? "Bullish" : finalScore <= 4 ? "Bearish" : "Neutral"),
      summary:
        String(parsed.summary || "").trim() ||
        buildFallbackNewsOverallSummary(news),
      topics,
      articleCount: topics.length,
      articles: news,
      source: "OpenAI weighted top 3 ticker-specific company-news articles",
      model: NEWS_SENTIMENT_MODEL,
    };
  } catch (error) {
    clearTimeout(timeout);
    console.warn("AI news sentiment scoring failed:", error?.name === "AbortError" ? "OpenAI news sentiment timed out" : error?.message || error);
    return fallbackNewsSentiment(news);
  }
}



function categoryTone(score) {
  const n = safeNumber(score);
  if (n === null) return "neutral";
  if (n >= 7.5) return "strong";
  if (n >= 6.5) return "mixed";
  return "weak";
}

function simpleMetricText(value, suffix = "") {
  const n = safeNumber(value);
  if (n === null) return "N/A";
  return `${n.toFixed(Math.abs(n) >= 100 ? 0 : 1)}${suffix}`;
}

function metricsFromReportValues(reportMetrics = {}) {
  const out = {};
  for (const [key, item] of Object.entries(reportMetrics || {})) {
    const value = safeNumber(item?.value);
    if (value !== null) out[key] = value;
  }
  return out;
}

function fallbackScoreSummary(symbol, profile, categories, metrics, edgeScore) {
  const entries = Object.entries(categories || {})
    .filter(([, value]) => safeNumber(value) !== null)
    .sort((a, b) => safeNumber(b[1]) - safeNumber(a[1]));
  const strongest = entries[0];
  const weakest = entries[entries.length - 1];
  const companyName = profile?.name || symbol;
  const strongestLabel = strongest ? CATEGORY_LABELS[strongest[0]] || strongest[0] : "available metrics";
  const weakestLabel = weakest ? CATEGORY_LABELS[weakest[0]] || weakest[0] : "limited data";

  return {
    source: "Local fallback",
    generatedAt: new Date().toISOString(),
    headline: `${companyName} scores ${scoreText(edgeScore)} because ${strongestLabel.toLowerCase()} is the clearest support while ${weakestLabel.toLowerCase()} is the main drag.`,
    verdict: safeNumber(edgeScore) >= 7.5 ? "Strong company profile" : safeNumber(edgeScore) >= 6.5 ? "Mixed but usable profile" : "Needs stronger data support",
    summary: `${companyName}'s Eval Score blends company fundamentals, market behavior, valuation, and recent news. The strongest area is ${strongestLabel.toLowerCase()}, while ${weakestLabel.toLowerCase()} is the biggest reason the score is not higher.`,
    metricBreakdown: [
      {
        category: "Growth",
        score: safeNumber(categories?.growth),
        tone: categoryTone(categories?.growth),
        why: `Growth blends revenue growth, earnings growth, and recent stock movement. Revenue growth is ${simpleMetricText(metrics?.revenueGrowth, "%")} and EPS growth is ${simpleMetricText(metrics?.epsGrowth, "%")}.`,
      },
      {
        category: "Profitability",
        score: safeNumber(categories?.profitability),
        tone: categoryTone(categories?.profitability),
        why: `Profitability shows how efficiently the company turns business activity into profit. ROE is ${simpleMetricText(metrics?.roe, "%")} and net margin is ${simpleMetricText(metrics?.netMargin, "%")}.`,
      },
      {
        category: "Financial Health",
        score: safeNumber(categories?.financialHealth),
        tone: categoryTone(categories?.financialHealth),
        why: `Financial health checks balance-sheet stability. Debt-to-equity is ${simpleMetricText(metrics?.debtToEquity)} and current ratio is ${simpleMetricText(metrics?.currentRatio)}.`,
      },
      {
        category: "Valuation",
        score: safeNumber(categories?.valuation),
        tone: categoryTone(categories?.valuation),
        why: `Valuation compares the stock price to fundamentals. P/E is ${simpleMetricText(metrics?.peRatio)} and price-to-sales is ${simpleMetricText(metrics?.priceToSales)}.`,
      },
      {
        category: "Momentum",
        score: safeNumber(categories?.momentum),
        tone: categoryTone(categories?.momentum),
        why: `Momentum measures recent market strength. The 52-week return is ${simpleMetricText(metrics?.priceReturn52Week, "%")} and beta is ${simpleMetricText(metrics?.beta)}.`,
      },
    ].filter((item) => safeNumber(item.score) !== null),
    positives: strongest ? [`Best category: ${strongestLabel} at ${scoreText(strongest[1])}/10`] : [],
    concerns: weakest ? [`Weakest category: ${weakestLabel} at ${scoreText(weakest[1])}/10`] : [],
    takeaway: "Use this as an educational company-quality summary, not a buy or sell recommendation.",
  };
}

function parseScoreSummaryJson(content) {
  if (!content || typeof content !== "string") return null;
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

async function generateScoreSummary(symbol, profile, categories, metrics, edgeScore) {
  const fallback = fallbackScoreSummary(symbol, profile, categories, metrics, edgeScore);
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) return fallback;

  const timeoutMs = Math.max(1200, Number(process.env.OPENAI_SCORE_SUMMARY_TIMEOUT_MS || 3500));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const payload = {
    symbol,
    companyName: profile?.name || symbol,
    industry: profile?.finnhubIndustry || "Public company",
    evalScore: safeNumber(edgeScore),
    categories,
    metrics: {
      revenueGrowth: metrics?.revenueGrowth,
      epsGrowth: metrics?.epsGrowth,
      roe: metrics?.roe,
      netMargin: metrics?.netMargin,
      operatingMargin: metrics?.operatingMargin,
      debtToEquity: metrics?.debtToEquity,
      currentRatio: metrics?.currentRatio,
      peRatio: metrics?.peRatio,
      priceToSales: metrics?.priceToSales,
      priceToBook: metrics?.priceToBook,
      beta: metrics?.beta,
      priceReturn52Week: metrics?.priceReturn52Week,
    },
  };

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_SCORE_SUMMARY_MODEL || NEWS_SENTIMENT_MODEL,
        temperature: 0.25,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content:
              "You generate clear stock score explanations for Eval. Use only the provided company data, metrics, category scores, profile/industry context, and recent news summaries. Explain why the Eval Score is where it is, explain what each metric means in beginner-friendly language, and connect the score to real-world company context without giving buy/sell/hold advice. Return only valid JSON.",
          },
          {
            role: "user",
            content: JSON.stringify({
              instructions:
                "Return JSON with keys: headline, verdict, summary, metricBreakdown, positives, concerns, takeaway. Do not include a newsConnection key. summary must be 4-6 polished sentences explaining the company-specific reason for the Eval Score using the metrics, industry context, and relevant recent news context. metricBreakdown must be 5-7 objects with category, score, tone, why. Each why must explain what that metric/category means, cite the specific provided metric values when available, and explain why it helps or hurts this specific company. tone must be strong, mixed, weak, or neutral. Keep text polished, specific to the company, and easy for beginners.",
              data: payload,
            }),
          },
        ],
      }),
    });

    clearTimeout(timeout);
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      console.warn("OpenAI score summary failed:", response.status, json?.error?.message || "");
      return fallback;
    }

    const parsed = parseScoreSummaryJson(json?.choices?.[0]?.message?.content);
    if (!parsed || typeof parsed !== "object") return fallback;

    const { newsConnection: _removedNewsConnection, ...cleanParsed } = parsed;

    return {
      ...fallback,
      ...cleanParsed,
      source: "OpenAI score summary",
      generatedAt: new Date().toISOString(),
      metricBreakdown: Array.isArray(parsed.metricBreakdown) && parsed.metricBreakdown.length
        ? parsed.metricBreakdown.slice(0, 7).map((item) => ({
            category: String(item?.category || "Metric"),
            score: safeNumber(item?.score),
            tone: ["strong", "mixed", "weak", "neutral"].includes(item?.tone) ? item.tone : categoryTone(item?.score),
            why: String(item?.why || "This category helps explain the final Eval Score."),
          }))
        : fallback.metricBreakdown,
      positives: Array.isArray(parsed.positives) ? parsed.positives.slice(0, 4).map(String) : fallback.positives,
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns.slice(0, 4).map(String) : fallback.concerns,
    };
  } catch (error) {
    clearTimeout(timeout);
    console.warn("AI score summary generation failed:", error?.name === "AbortError" ? "OpenAI summary timed out" : error?.message || error);
    return fallback;
  }
}

export async function buildAiScoreSummaryFromReport(report = {}) {
  const symbol = String(report?.symbol || report?.profile?.ticker || "").trim().toUpperCase();
  if (!symbol) throw new Error("Missing ticker symbol for score breakdown.");

  const profile = report?.profile || { ticker: symbol, name: symbol, finnhubIndustry: "Public company" };
  const categories = report?.grades?.categories || {};
  const metrics = metricsFromReportValues(report?.metrics || {});
  const edgeScore = report?.grades?.edgeScore;

  return generateScoreSummary(symbol, profile, categories, metrics, null, edgeScore);
}

function buildStoredChartData(rows = []) {
  const clean = Array.isArray(rows) ? rows.filter((row) => safeNumber(row?.close) !== null && safeNumber(row?.close) > 0) : [];
  return {
    D: clean.slice(-120),
    "1M": clean.slice(-32),
    "3M": clean.slice(-90),
    "6M": clean.slice(-180),
    "1Y": clean.filter((_, i) => i % 5 === 0).slice(-58),
    "5Y": clean.filter((_, i) => i % 21 === 0).slice(-62),
  };
}

function computeRsiFromCloses(closes = [], period = 14) {
  const vals = closes.map(safeNumber).filter((v) => v !== null && v > 0);
  if (vals.length < period + 1) return null;
  const slice = vals.slice(-(period + 1));
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < slice.length; i += 1) {
    const diff = slice[i] - slice[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Number((100 - (100 / (1 + rs))).toFixed(2));
}

function calculateTechnicalFromRows(rows = []) {
  const normalized = Array.isArray(rows) ? rows
    .map((row) => ({ datetime: row?.datetime || row?.date, close: safeNumber(row?.close) }))
    .filter((row) => row.close !== null && row.close > 0) : [];
  const closes = normalized.map((row) => row.close);
  const last = closes.at(-1) ?? null;
  const atBack = (n) => closes.length > n ? closes[closes.length - 1 - n] : null;
  const ret = (n) => {
    const prior = atBack(n);
    return last !== null && prior !== null && prior > 0 ? ((last - prior) / prior) * 100 : null;
  };
  const high52 = closes.length ? Math.max(...closes.slice(-260)) : null;
  const low52 = closes.length ? Math.min(...closes.slice(-260)) : null;
  return {
    rows: normalized,
    current: last,
    priceReturn4Week: ret(20),
    priceReturn12Week: ret(60),
    priceReturn13Week: ret(65),
    priceReturn26Week: ret(130),
    priceReturn52Week: ret(260),
    rsi14: computeRsiFromCloses(closes, 14),
    pullbackFromHigh: last !== null && high52 ? ((high52 - last) / high52) * 100 : null,
    distanceFrom52WeekLow: last !== null && low52 ? ((last - low52) / low52) * 100 : null,
  };
}

export async function buildDailyTechnicalRefresh(symbol, cachedReport = null) {
  const cleanSymbol = String(symbol || '').trim().toUpperCase();
  const quote = await fetchTwelveDataQuote(cleanSymbol);
  const marketData = await fetchTwelveDataMarketData(cleanSymbol);
  const rows = Array.isArray(marketData?.rows) ? marketData.rows : [];
  const tech = calculateTechnicalFromRows(rows);
  const extracted = { ...(cachedReport?.extracted || {}), ...tech, dayChangePercent: quote?.dp ?? cachedReport?.metrics?.dayChangePercent?.value ?? null };
  const momentumInputs = [
    weightedMetricInput("12W return", "momentum", extracted.priceReturn12Week ?? extracted.priceReturn13Week, metricScore(extracted.priceReturn12Week ?? extracted.priceReturn13Week, [[25, 10], [15, 9], [8, 8], [2, 7], [-5, 5], [-15, 4], [-999, 3]]), 4),
    weightedMetricInput("26W return", "momentum", extracted.priceReturn26Week, metricScore(extracted.priceReturn26Week, [[40, 10], [25, 9], [12, 8], [3, 7], [-8, 5], [-20, 4], [-999, 3]]), 4),
    weightedMetricInput("52W return", "momentum", extracted.priceReturn52Week, metricScore(extracted.priceReturn52Week, [[70, 10], [40, 9], [20, 8], [5, 7], [-10, 5], [-25, 4], [-999, 3]]), 3),
  ].filter(Boolean);
  const pullbackInputs = [
    weightedMetricInput("RSI 14", "pullback", extracted.rsi14, inverseMetricScore(extracted.rsi14, [[30, 8.8], [40, 8], [55, 7], [65, 6], [75, 4.5], [999, 3.5]]), 5),
    weightedMetricInput("Pullback from high", "pullback", extracted.pullbackFromHigh, metricScore(extracted.pullbackFromHigh, [[35, 9], [25, 8], [15, 7], [8, 6], [3, 5], [0, 4], [-999, 3]]), 3),
    weightedMetricInput("52W low distance", "pullback", extracted.distanceFrom52WeekLow, metricScore(extracted.distanceFrom52WeekLow, [[80, 9], [50, 8], [30, 7], [15, 6], [5, 5], [-999, 3]]), 2),
  ].filter(Boolean);
  const momentumScore = availableWeightedAverage(momentumInputs, null);
  const pullbackScore = availableWeightedAverage(pullbackInputs, null);
  const categories = { ...(cachedReport?.grades?.categories || {}) };
  if (momentumScore !== null) categories.momentum = momentumScore;
  if (pullbackScore !== null) categories.pullback = pullbackScore;
  delete categories.newsSentiment;
  delete categories.quality;
  const categoryScoreInputs = [
    weightedMetricInput("Profitability", "overall", categories.profitability, categories.profitability, 22),
    weightedMetricInput("Financial Health", "overall", categories.financialHealth, categories.financialHealth, 20),
    weightedMetricInput("Valuation", "overall", categories.valuation, categories.valuation, 18),
    weightedMetricInput("Growth", "overall", categories.growth, categories.growth, 16),
    weightedMetricInput("Momentum", "overall", categories.momentum, categories.momentum, 14),
    weightedMetricInput("Pullback", "overall", categories.pullback, categories.pullback, 10),
  ].filter(Boolean);
  const edgeScore = availableWeightedAverage(categoryScoreInputs, null);
  const metrics = { ...(cachedReport?.metrics || {}) };
  for (const [key, val] of Object.entries({ priceReturn4Week: extracted.priceReturn4Week, priceReturn12Week: extracted.priceReturn12Week, priceReturn13Week: extracted.priceReturn13Week, priceReturn26Week: extracted.priceReturn26Week, priceReturn52Week: extracted.priceReturn52Week, rsi14: extracted.rsi14, pullbackFromHigh: extracted.pullbackFromHigh, distanceFrom52WeekLow: extracted.distanceFrom52WeekLow, dayChangePercent: extracted.dayChangePercent })) {
    metrics[key] = metric(val, key.includes('Return') || key.includes('pullback') || key.includes('distance') || key === 'dayChangePercent' ? '%' : '', 'Twelve Data daily technical refresh', 'Stored daily technical value');
  }
  return {
    ...(cachedReport || {}),
    symbol: cleanSymbol,
    quote: { ...(cachedReport?.quote || {}), ...(quote || {}), c: quote?.c ?? tech.current ?? cachedReport?.quote?.c ?? null },
    chartData: { ...(cachedReport?.chartData || {}), D: rows.slice(-120), '6M': rows.slice(-180), '1Y': rows.filter((_, i) => i % 5 === 0).slice(-58), '5Y': rows.filter((_, i) => i % 21 === 0).slice(-62) },
    metrics,
    grades: { ...(cachedReport?.grades || {}), edgeScore, grade: gradeFrom10(edgeScore), categories },
    extracted,
    technicalRefreshedAt: new Date().toISOString(),
  };
}

export async function buildStockAnalysis(symbol, options = {}) {
  const cleanSymbol = String(symbol || "").trim().toUpperCase();
  if (!cleanSymbol) throw new Error("Missing ticker symbol.");

  const cachedReport = options?.cachedReport || null;
  const hasCachedReport = Boolean(cachedReport?.grades?.categories);
  const refreshProfile = options?.refreshProfile ?? !hasCachedReport;
  const refreshFundamentals = options?.refreshFundamentals ?? true;
  const refreshMarket = options?.refreshMarket ?? true;
  const refreshNews = false;
  const includeAiScoreSummary = options?.includeAiScoreSummary !== false;

  if (!process.env.TWELVE_DATA_API_KEY) {
    throw new Error("Missing TWELVE_DATA_API_KEY in Render environment variables.");
  }

  const [twelveProfile, twelveFundamentals] = await Promise.all([
    refreshProfile ? fetchTwelveDataProfile(cleanSymbol) : (cachedReport?.profile || null),
    (refreshFundamentals || !hasCachedReport) ? fetchTwelveDataFundamentals(cleanSymbol) : { metrics: metricsFromCachedReport(cachedReport), raw: {}, source: "Cached report" },
  ]);
  const finnhubProfile = {};
  const finnhubFundamentals = { metrics: {}, raw: {}, source: "Finnhub disabled" };
  const fmpFundamentals = { metrics: {}, raw: {}, source: "FMP disabled" };
  const massiveFundamentals = { metrics: {}, raw: {}, source: "Massive disabled" };
  const existingMarketInputs = validMetricInputCount([
    twelveFundamentals?.metrics?.priceReturn12Week,
    twelveFundamentals?.metrics?.priceReturn13Week,
    twelveFundamentals?.metrics?.priceReturn26Week,
    twelveFundamentals?.metrics?.priceReturn52Week,
    twelveFundamentals?.metrics?.rsi14,
    twelveFundamentals?.metrics?.pullbackFromHigh,
    twelveFundamentals?.metrics?.distanceFrom52WeekLow,
  ]);
  const twelveMarket = refreshMarket && existingMarketInputs < 6
    ? await fetchTwelveDataMarketData(cleanSymbol)
    : { quote: null, metrics: {}, source: existingMarketInputs >= 6 ? "Twelve Data cached technical market data" : "Market refresh disabled" };
  const twelveQuote = null;

  const cachedProfile = cachedReport?.profile || {};
  const profile = {
    ...(cachedProfile || {}),
    ...(twelveProfile || {}),
    ...(finnhubProfile || {}),
    ticker: finnhubProfile?.ticker || twelveProfile?.ticker || cachedProfile?.ticker || cleanSymbol,
    name: finnhubProfile?.name || twelveProfile?.name || cachedProfile?.name || cleanSymbol,
    finnhubIndustry: finnhubProfile?.finnhubIndustry || twelveProfile?.finnhubIndustry || cachedProfile?.finnhubIndustry || "Public company",
    marketCapitalization: firstNumber(finnhubProfile?.marketCapitalization, twelveProfile?.marketCapitalization, finnhubFundamentals?.metrics?.marketCapM, fmpFundamentals?.metrics?.marketCapM, twelveFundamentals?.metrics?.marketCapM, cachedProfile?.marketCapitalization),
    weburl: finnhubProfile?.weburl || twelveProfile?.weburl || cachedProfile?.weburl || "",
    logo: `/api/company-logo/${encodeURIComponent(cleanSymbol)}`,
  };

  const quote = bestQuote({ cachedQuote: {}, twelveQuote: twelveQuote || twelveMarket?.quote || {} });
  if (!profile || (!profile.ticker && !profile.name)) throw new Error(`No Twelve Data profile found for ${cleanSymbol}.`);

  const cachedMetrics = metricsFromCachedReport(cachedReport);
  const twelveMarketMetrics = twelveMarket?.metrics || {};
  const finnhubMetrics = finnhubFundamentals?.metrics || {};
  const fmpMetrics = fmpFundamentals?.metrics || {};
  const massiveMetrics = massiveFundamentals?.metrics || {};
  const twelveFundamentalMetrics = twelveFundamentals?.metrics || {};
  // Metric priority: cached report + Twelve Data profile/statistics/time-series only. Missing values are voided, never counted as zero.
  const raw = mergeDefined(cachedMetrics, twelveFundamentalMetrics, massiveMetrics, fmpMetrics, finnhubMetrics, twelveMarketMetrics);
  const extracted = buildExtractedMetrics(profile, quote, raw);
  applyMetricFallbacks(extracted, cachedMetrics, cachedMetrics);
  applyMetricFallbacks(extracted, twelveFundamentalMetrics, cachedMetrics);
  applyMetricFallbacks(extracted, massiveMetrics, cachedMetrics);
  applyMetricFallbacks(extracted, fmpMetrics, cachedMetrics);
  applyMetricFallbacks(extracted, finnhubMetrics, cachedMetrics);
  applyMetricFallbacks(extracted, twelveMarketMetrics, cachedMetrics);
  deriveMissingMetrics(extracted);

  // Hard guard: if the historical series exists, Momentum/Pullback inputs should not stay voided.
  // This prevents saving reports like NVDA with null momentum/pullback when time_series returned usable rows.
  const technicalFromRows = calculateTechnicalFromRows(Array.isArray(twelveMarket?.rows) ? twelveMarket.rows : []);
  applyMetricFallbacks(extracted, technicalFromRows, cachedMetrics);
  deriveMissingMetrics(extracted);

  extracted.nopat = scoreInputNumber(extracted.operatingIncome) !== null ? extracted.operatingIncome * (1 - 0.21) : null;
  extracted.investedCapital = scoreInputNumber(extracted.totalDebt) !== null && scoreInputNumber(extracted.shareholderEquity) !== null
    ? extracted.totalDebt + extracted.shareholderEquity - (safeNumber(extracted.cashAndEquivalents) || 0)
    : null;
  extracted.roicCalculated = scoreInputNumber(extracted.nopat) !== null && scoreInputNumber(extracted.investedCapital) !== null
    ? (extracted.nopat / extracted.investedCapital) * 100
    : firstNumber(extracted.roicCalculated);
  extracted.freeCashFlow = firstNumber(extracted.freeCashFlow, extracted.operatingCashFlow !== null && extracted.capex !== null ? extracted.operatingCashFlow - Math.abs(extracted.capex) : null);
  extracted.cashConversionRatio = scoreInputNumber(extracted.netIncome) !== null && scoreInputNumber(extracted.freeCashFlow) !== null ? extracted.freeCashFlow / extracted.netIncome : null;
  extracted.accrualRatio = scoreInputNumber(extracted.totalAssets) !== null && scoreInputNumber(extracted.netIncome) !== null && scoreInputNumber(extracted.freeCashFlow) !== null ? (extracted.netIncome - extracted.freeCashFlow) / extracted.totalAssets : null;

  
  const profitabilityScore = scoreProfitability(extracted);
  const healthScore = scoreFinancialHealth(extracted);
  const growthScore = categoryAverage([
    { score: metricScore(extracted.revenueGrowth, [[35, 10], [25, 9], [15, 8], [8, 7], [3, 6], [0, 5], [-8, 4], [-999, 3]]), weight: 0.30 },
    { score: metricScore(extracted.revenueGrowth3Y, [[25, 10], [18, 9], [12, 8], [7, 7], [3, 6], [0, 5], [-8, 4], [-999, 3]]), weight: 0.18 },
    { score: metricScore(extracted.revenueGrowth5Y, [[20, 10], [15, 9], [10, 8], [6, 7], [2, 6], [0, 5], [-8, 4], [-999, 3]]), weight: 0.12 },
    { score: metricScore(extracted.epsGrowth, [[45, 10], [30, 9], [18, 8], [9, 7], [3, 6], [0, 5], [-10, 4], [-999, 3]]), weight: 0.24 },
    { score: metricScore(extracted.epsGrowth3Y, [[28, 10], [20, 9], [13, 8], [7, 7], [3, 6], [0, 5], [-10, 4], [-999, 3]]), weight: 0.10 },
    { score: metricScore(extracted.priceReturn13Week, [[25, 10], [15, 9], [8, 8], [2, 7], [-5, 5], [-15, 4], [-999, 3]]), weight: 0.06 },
  ]);
  const earningsGrowthSupportScore = growthScore;
  const valuationScore = scoreValuation(extracted, earningsGrowthSupportScore ?? 6, profitabilityScore);
  const momentumScore = scoreMomentum(extracted);
  const pullbackScore = scorePullback(extracted);

  const categories = { growth: growthScore, profitability: profitabilityScore, financialHealth: healthScore, valuation: valuationScore, momentum: momentumScore, pullback: pullbackScore };
  const metricScoreInputs = [
    // Growth: revenue growth, earnings growth, and recent stock movement. Missing values are skipped, never counted as zero.
    weightedMetricInput("Revenue growth", "growth", extracted.revenueGrowth, metricScore(extracted.revenueGrowth, [[35, 10], [25, 9], [15, 8], [8, 7], [3, 6], [0, 5], [-8, 4], [-999, 3]]), 7.5),
    weightedMetricInput("3Y revenue growth", "growth", extracted.revenueGrowth3Y, metricScore(extracted.revenueGrowth3Y, [[25, 10], [18, 9], [12, 8], [7, 7], [3, 6], [0, 5], [-8, 4], [-999, 3]]), 5.0),
    weightedMetricInput("5Y revenue growth", "growth", extracted.revenueGrowth5Y, metricScore(extracted.revenueGrowth5Y, [[20, 10], [15, 9], [10, 8], [6, 7], [2, 6], [0, 5], [-8, 4], [-999, 3]]), 3.5),
    weightedMetricInput("EPS growth", "growth", extracted.epsGrowth, metricScore(extracted.epsGrowth, [[45, 10], [30, 9], [18, 8], [9, 7], [3, 6], [0, 5], [-10, 4], [-999, 3]]), 7.0),
    weightedMetricInput("3Y EPS growth", "growth", extracted.epsGrowth3Y, metricScore(extracted.epsGrowth3Y, [[28, 10], [20, 9], [13, 8], [7, 7], [3, 6], [0, 5], [-10, 4], [-999, 3]]), 4.0),
    weightedMetricInput("Recent stock movement", "growth", extracted.priceReturn13Week, metricScore(extracted.priceReturn13Week, [[25, 10], [15, 9], [8, 8], [2, 7], [-5, 5], [-15, 4], [-999, 3]]), 2.0),

    // Profitability / execution: measures whether the business actually converts sales and capital into returns.
    weightedMetricInput("ROE", "profitability", extracted.roe, metricScore(extracted.roe, [[60, 10], [35, 9], [20, 8], [12, 7], [5, 6], [0, 5], [-999, 3]]), 9.0),
    weightedMetricInput("ROA", "profitability", extracted.roa, metricScore(extracted.roa, [[18, 10], [12, 9], [8, 8], [5, 7], [2, 6], [0, 5], [-999, 3]]), 6.0),
    weightedMetricInput("ROIC", "profitability", extracted.roicCalculated, metricScore(extracted.roicCalculated, [[30, 10], [20, 9], [14, 8], [9, 7], [4, 6], [0, 5], [-999, 3]]), 8.0),
    weightedMetricInput("Operating margin", "profitability", extracted.operatingMargin, metricScore(extracted.operatingMargin, [[35, 10], [25, 9], [15, 8], [8, 7], [3, 6], [0, 5], [-999, 3]]), 8.0),
    weightedMetricInput("Net margin", "profitability", extracted.netMargin, metricScore(extracted.netMargin, [[30, 10], [20, 9], [12, 8], [7, 7], [3, 6], [0, 5], [-999, 3]]), 7.0),
    weightedMetricInput("Gross margin", "profitability", extracted.grossMargin, metricScore(extracted.grossMargin, [[70, 10], [55, 9], [40, 8], [28, 7], [18, 6], [8, 5], [-999, 3]]), 4.5),
    // Financial health: protects the score from companies with weak balance sheets.
    weightedMetricInput("Debt / equity", "financialHealth", extracted.debtToEquity, inverseMetricScore(extracted.debtToEquity, [[0.3, 10], [0.7, 9], [1.2, 8], [2.0, 6.8], [3.0, 5.8], [999, 4.6]]), 7.5),
    weightedMetricInput("Long-term debt / equity", "financialHealth", extracted.longTermDebtToEquity, inverseMetricScore(extracted.longTermDebtToEquity, [[0.3, 10], [0.7, 9], [1.2, 8], [2.0, 6.8], [3.0, 5.8], [999, 4.6]]), 5.0),
    weightedMetricInput("Current ratio", "financialHealth", extracted.currentRatio, metricScore(extracted.currentRatio, [[3, 9.2], [2, 8.7], [1.5, 8.2], [1, 7.2], [0.75, 6.0], [-999, 5.0]]), 4.5),
    weightedMetricInput("Quick ratio", "financialHealth", extracted.quickRatio, metricScore(extracted.quickRatio, [[2, 9], [1.4, 8.5], [1, 7.7], [0.7, 6.2], [-999, 5.0]]), 3.5),
    weightedMetricInput("Interest coverage", "financialHealth", extracted.interestCoverage, metricScore(extracted.interestCoverage, [[40, 10], [20, 9.3], [10, 8.5], [5, 7.2], [2, 6], [0.5, 4.8], [-999, 4]]), 6.0),
    weightedMetricInput("Operating income margin", "financialHealth", extracted.operatingMargin, metricScore(extracted.operatingMargin, [[35, 10], [25, 9], [15, 8], [8, 7], [3, 6], [0, 5], [-999, 3]]), 4.5),
    weightedMetricInput("Pretax margin", "financialHealth", extracted.pretaxMargin, metricScore(extracted.pretaxMargin, [[30, 10], [20, 9], [12, 8], [7, 7], [3, 6], [0, 5], [-999, 3]]), 3.0),
    weightedMetricInput("Cash flow / debt", "financialHealth", extracted.cashFlowToDebt, metricScore(extracted.cashFlowToDebt, [[0.7, 10], [0.45, 9], [0.25, 8], [0.12, 6.8], [0.05, 5.5], [-999, 4.5]]), 4.0),
    weightedMetricInput("FCF / share", "financialHealth", extracted.freeCashFlowPerShare, metricScore(extracted.freeCashFlowPerShare, [[15, 10], [7.5, 9], [3, 8], [1, 6.8], [0.25, 5.6], [-999, 4.5]]), 3.0),

    // Valuation: important, but not allowed to dominate when only one cheapness ratio exists.
    weightedMetricInput("P/E", "valuation", extracted.peRatio, inverseMetricScore(extracted.peRatio, [[12, 9.5], [18, 8.5], [25, 7.5], [35, 6.5], [50, 5.5], [75, 4.5], [9999, 3.5]]), 7.0),
    weightedMetricInput("Forward P/E", "valuation", extracted.forwardPe, inverseMetricScore(extracted.forwardPe, [[14, 9], [20, 8], [28, 7], [40, 6], [60, 5], [9999, 3.5]]), 4.0),
    weightedMetricInput("PEG", "valuation", extracted.pegRatio, inverseMetricScore(extracted.pegRatio, [[0.8, 9.5], [1.2, 8.5], [1.8, 7.5], [2.5, 6], [4, 4.5], [9999, 3]]), 6.0),
    weightedMetricInput("Price / sales", "valuation", extracted.priceToSales, inverseMetricScore(extracted.priceToSales, [[2, 9], [4, 8], [7, 6.5], [12, 5], [20, 3.5], [9999, 2.5]]), 5.0),
    weightedMetricInput("Price / book", "valuation", extracted.priceToBook, inverseMetricScore(extracted.priceToBook, [[2, 9], [4, 8], [7, 6.5], [12, 5], [20, 3.5], [9999, 2.5]]), 3.0),
    weightedMetricInput("Price / FCF", "valuation", extracted.priceToFreeCashFlow, inverseMetricScore(extracted.priceToFreeCashFlow, [[15, 9], [25, 8], [40, 6.5], [65, 5], [100, 3.5], [9999, 2.5]]), 5.5),
    weightedMetricInput("EV / EBITDA", "valuation", extracted.evToEbitda, inverseMetricScore(extracted.evToEbitda, [[10, 9], [16, 8], [24, 6.5], [35, 5], [60, 3.5], [9999, 2.5]]), 4.0),
    weightedMetricInput("Dividend yield", "valuation", extracted.dividendYield, metricScore(extracted.dividendYield, [[6, 8.5], [3, 7.5], [1, 6.5], [0, 5.5], [-999, 5]]), 1.5),

    // Momentum: 12-week, 26-week, and 52-week price movement only.
    weightedMetricInput("12W return", "momentum", extracted.priceReturn12Week ?? extracted.priceReturn13Week, metricScore(extracted.priceReturn12Week ?? extracted.priceReturn13Week, [[25, 10], [15, 9], [8, 8], [2, 7], [-5, 5], [-15, 4], [-999, 3]]), 4.0),
    weightedMetricInput("26W return", "momentum", extracted.priceReturn26Week, metricScore(extracted.priceReturn26Week, [[40, 10], [25, 9], [12, 8], [3, 7], [-8, 5], [-20, 4], [-999, 3]]), 3.5),
    weightedMetricInput("52W return", "momentum", extracted.priceReturn52Week, metricScore(extracted.priceReturn52Week, [[70, 10], [40, 9], [20, 8], [5, 7], [-10, 5], [-25, 4], [-999, 3]]), 3.0),

    // Pullback: RSI + technical distance from recent highs/lows.
    weightedMetricInput("RSI 14", "pullback", extracted.rsi14, inverseMetricScore(extracted.rsi14, [[30, 8.8], [40, 8], [55, 7], [65, 6], [75, 4.5], [999, 3.5]]), 4.5),
    weightedMetricInput("Pullback from high", "pullback", extracted.pullbackFromHigh, metricScore(extracted.pullbackFromHigh, [[35, 9], [25, 8], [15, 7], [8, 6], [3, 5], [0, 4], [-999, 3]]), 3.5),
    weightedMetricInput("52W low distance", "pullback", extracted.distanceFrom52WeekLow, metricScore(extracted.distanceFrom52WeekLow, [[80, 9], [50, 8], [30, 7], [15, 6], [5, 5], [-999, 3]]), 2.0),
  ].filter(Boolean);

  const validInputCounts = {
    growth: metricScoreInputs.filter((item) => item.category === "growth").length,
    profitability: metricScoreInputs.filter((item) => item.category === "profitability").length,
    financialHealth: metricScoreInputs.filter((item) => item.category === "financialHealth").length,
    valuation: metricScoreInputs.filter((item) => item.category === "valuation").length,
    momentum: metricScoreInputs.filter((item) => item.category === "momentum").length,
    pullback: metricScoreInputs.filter((item) => item.category === "pullback").length,
  };

  const validCategoryCount = Object.values(categories).filter((value) => safeNumber(value) !== null).length;
  const totalValidMetricInputs = metricScoreInputs.length;
  const categoriesWithDataCount = Object.values(validInputCounts).filter((value) => Number(value || 0) > 0).length;
  const coreCategoryKeys = ["growth", "profitability", "financialHealth", "valuation",  "momentum", "pullback"];
  const hasAllCoreCategoryScores = coreCategoryKeys.every((key) => safeNumber(categories[key]) !== null);
  const categoryScoreInputs = [
    weightedMetricInput("Profitability", "overall", categories.profitability, categories.profitability, 22),
    weightedMetricInput("Financial Health", "overall", categories.financialHealth, categories.financialHealth, 19),
    weightedMetricInput("Valuation", "overall", categories.valuation, categories.valuation, 18),
    weightedMetricInput("Growth", "overall", categories.growth, categories.growth, 17),
    weightedMetricInput("Momentum", "overall", categories.momentum, categories.momentum, 14),
    weightedMetricInput("Pullback", "overall", categories.pullback, categories.pullback, 10),
  ].filter(Boolean);
  const canCalculateEvalScore = validCategoryCount >= 3 && totalValidMetricInputs >= 10;
  const edgeScore = canCalculateEvalScore ? availableWeightedAverage(categoryScoreInputs, null) : null;

  const riskLabel = null;
  const sw = strongestWeakest(categories);
  const src = "Twelve Data precomputed database";
  const reportMetrics = {
    revenueGrowth: metric(extracted.revenueGrowth, "%", src, "Revenue growth YoY"),
    revenueGrowth3Y: metric(extracted.revenueGrowth3Y, "%", src, "3-year revenue CAGR"),
    revenueGrowth5Y: metric(extracted.revenueGrowth5Y, "%", src, "5-year revenue CAGR"),
    epsGrowth: metric(extracted.epsGrowth, "%", src, "EPS growth YoY"),
    epsGrowth3Y: metric(extracted.epsGrowth3Y, "%", src, "3-year EPS growth"),
    epsGrowth5Y: metric(extracted.epsGrowth5Y, "%", src, "5-year EPS growth"),
    netIncomeGrowth3Y: metric(extracted.netIncomeGrowth3Y, "%", src, "3-year net income growth"),
    roe: metric(extracted.roe, "%", src, "Return on equity"), roa: metric(extracted.roa, "%", src, "Return on assets"), roi: metric(extracted.roicCalculated, "%", src, "Return on invested capital"), grossMargin: metric(extracted.grossMargin, "%", src, "Gross profit / revenue"), operatingMargin: metric(extracted.operatingMargin, "%", src, "Operating income / revenue"), pretaxMargin: metric(extracted.pretaxMargin, "%", src, "Pretax income / revenue"), netMargin: metric(extracted.netMargin, "%", src, "Net income / revenue"), fcfMargin: metric(extracted.fcfMargin, "%", src, "Free cash flow / revenue"), ocfMargin: metric(extracted.ocfMargin, "%", src, "Operating cash flow / revenue"),
    debtToEquity: metric(extracted.debtToEquity, "", src, "Total debt / equity"), longTermDebtToEquity: metric(extracted.longTermDebtToEquity, "", src, "Long-term debt / equity"), debtToAssets: metric(extracted.debtToAssets, "", src, "Total debt / assets"), equityRatio: metric(extracted.equityRatio, "", src, "Equity / assets"), currentRatio: metric(extracted.currentRatio, "", src, "Current assets / current liabilities"), quickRatio: metric(extracted.quickRatio, "", src, "Quick assets / current liabilities"), cashRatio: metric(extracted.cashRatio, "", src, "Cash / current liabilities"), assetTurnover: metric(extracted.assetTurnover, "", src, "Revenue / assets"), interestCoverage: metric(extracted.interestCoverage, "", src, "EBIT / interest expense"), cashFlowToDebt: metric(extracted.cashFlowToDebt, "", src, "Operating cash flow / total debt"), operatingCashFlowPerShare: metric(extracted.operatingCashFlowPerShare, "", src, "Operating cash flow / share"), freeCashFlowPerShare: metric(extracted.freeCashFlowPerShare, "", src, "Free cash flow / share"), totalDebtToCapital: metric(extracted.totalDebtToCapital, "", src, "Debt / total capital"), netDebtToEbitda: metric(extracted.netDebtToEbitda, "", src, "Net debt / EBITDA"),
    peRatio: metric(extracted.peRatio, "", src, "Price / earnings"), forwardPe: metric(extracted.forwardPe, "", src, "Forward price / earnings"), pegRatio: metric(extracted.pegRatio, "", src, "P/E / growth"), priceToSales: metric(extracted.priceToSales, "", src, "Price / sales"), priceToBook: metric(extracted.priceToBook, "", src, "Price / book value"), priceToCashFlow: metric(extracted.priceToCashFlow, "", src, "Price / cash flow"), priceToFreeCashFlow: metric(extracted.priceToFreeCashFlow, "", src, "Price / free cash flow"), dividendYield: metric(extracted.dividendYield, "%", src, "Annual dividend yield"),
    beta: metric(extracted.beta, "", src, "Volatility compared with market"), dayChangePercent: metric(extracted.dayChangePercent, "%", src, "Current daily price change"), priceReturn4Week: metric(extracted.priceReturn4Week, "%", src, "4-week price return"), priceReturn12Week: metric(extracted.priceReturn12Week, "%", src, "12-week price return"), priceReturn13Week: metric(extracted.priceReturn13Week, "%", src, "13-week price return"), priceReturn26Week: metric(extracted.priceReturn26Week, "%", src, "26-week price return"), priceReturn52Week: metric(extracted.priceReturn52Week, "%", src, "52-week price return"), distanceFrom52WeekLow: metric(extracted.distanceFrom52WeekLow, "%", src, "(Current price - 52-week low) / 52-week low"),
    revenue: metric(extracted.revenue, "", src, "Revenue"),
    sharesOutstanding: metric(extracted.sharesOutstanding, "", src, "Shares outstanding"),
    marketCapM: metric(extracted.marketCapM, "M", src, "Market capitalization in millions"), enterpriseValue: metric(extracted.enterpriseValue, "M", src, "Enterprise value"), ebitda: metric(extracted.ebitda, "M", src, "EBITDA"), evToEbitda: metric(extracted.evToEbitda, "", src, "EV/EBITDA"),
    cashConversionRatio: metric(extracted.cashConversionRatio, "", src, "Free cash flow / net income"), operatingCashConversion: metric(extracted.operatingCashConversion, "", src, "Operating cash flow / net income"), accrualRatio: metric(extracted.accrualRatio, "", src, "(Net income - operating cash flow) / assets"), roicCalculated: metric(extracted.roicCalculated, "%", src, "NOPAT / invested capital"), payoutRatio: metric(extracted.payoutRatio, "%", src, "Dividends paid / net income"), taxRate: metric(extracted.taxRate, "%", src, "Income tax / pretax income"), totalLiabilitiesToAssets: metric(extracted.totalLiabilitiesToAssets, "", src, "Total liabilities / total assets"), pullbackFromHigh: metric(extracted.pullbackFromHigh, "%", src, "Distance below 52-week high"),

  };

  const publicUsableMetricCount = publicMetricCount(reportMetrics);
  const aiScoreSummary = includeAiScoreSummary && edgeScore !== null ? await generateScoreSummary(cleanSymbol, profile, categories, metricsFromReportValues(reportMetrics), edgeScore) : null;
  const scoreTextForSummary = edgeScore === null ? "N/A" : edgeScore.toFixed(1);
  return {
    symbol: cleanSymbol,
    profile: { ...profile, ticker: profile.ticker || cleanSymbol, name: profile.name || cleanSymbol, finnhubIndustry: profile.finnhubIndustry || "Public company" },
    quote: quote || { c: null, d: null, dp: null, h: null, l: null, o: null, pc: null },
    chartData: buildStoredChartData(twelveMarket?.rows || []),
    companyDescription: `${profile.name || cleanSymbol} is a publicly traded company in the ${profile.finnhubIndustry || "market"} industry.`,
    evaluationSummary: edgeScore === null
      ? `${cleanSymbol} does not have enough usable data across the core Eval categories for an Eval Score yet.`
      : `${cleanSymbol} has an Eval Score of ${scoreTextForSummary} out of 10. The score is calculated from available weighted metrics across growth, profitability, financial health, valuation, momentum, and pullback. Twelve Data precomputes the stored report, using profile, key metrics, income statement, balance sheet, and time-series data. Missing or voided inputs are skipped instead of counted as zero.`,
    strengths: [sw.strongest],
    weaknesses: [sw.weakest],
    grades: {
      edgeScore,
      grade: gradeFrom10(edgeScore),
      riskLabel,
      categories,
      context: { marketCapM: extracted.marketCapM },
      dataQuality: {
        validCategoryCount,
        validInputCounts,
        totalValidMetricInputs,
        publicUsableMetricCount,
        minRequiredMetrics: 18,
        targetMetricInputs: 30,
        minimumTargetPerCategory: 3,
        requiredCategories: coreCategoryKeys,
        hasAllCoreCategoryScores,
        canCalculateEvalScore,
        scoreRule: "Eval Score uses six weighted categories with automatic redistribution when a metric is missing: Profitability 22%, Valuation 20%, Growth 19%, Financial Health 18%, Momentum 13%, Pullback 8%.",
        providerStatus: { twelveDataKey: Boolean(process.env.TWELVE_DATA_API_KEY), databaseOnly: true, apiMinimization: "Browser/UI reads stored Eval database reports only. Twelve Data calls run inside scheduled backend workers." },
        sources: { price: "Twelve Data quote/WebSocket", marketData: twelveMarket?.source || "Twelve Data time_series", fundamentals: [finnhubFundamentals?.source, fmpFundamentals?.source, massiveFundamentals?.source, twelveFundamentals?.source].filter(Boolean).join(" | "), profile: finnhubProfile ? "Finnhub profile2" : "Twelve Data profile" }
      }
    },
    metrics: reportMetrics,
    aiScoreSummary,
  };
}
