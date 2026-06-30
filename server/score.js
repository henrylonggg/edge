// Eval update: removed Earnings Quality and Efficiency categories.
// Eval score.js Twelve Data only provider update.
const TWELVE_DATA_BASE_URL = "https://api.twelvedata.com";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const NEWS_SENTIMENT_MODEL = process.env.OPENAI_NEWS_MODEL || "gpt-4.1-nano";

const CATEGORY_LABELS = {
  growth: "Growth",
  profitability: "Profitability",
  financialHealth: "Financial Health",
  valuation: "Valuation",
  momentum: "Momentum",
  reversal: "Pullback",
  quality: "Quality",
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

function stableTwelveCacheKey(endpoint, params = {}) {
  const enriched = { ...params };
  if (endpoint === "/quote" || endpoint === "/price") enriched.__marketWindow = scoreMarketQuoteCacheWindowEt();
  const entries = Object.entries(enriched)
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


function scoreMarketQuoteCacheWindowEt(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const weekday = map.weekday;
  const isTradingDay = !["Sat", "Sun"].includes(weekday);
  const hour = Number(map.hour);
  const minute = Number(map.minute);
  const date = `${map.year}-${map.month}-${map.day}`;

  if (!isTradingDay) return `${date}:closed`;
  if (hour < 9 || (hour === 9 && minute < 30)) return `${date}:preopen`;
  if (hour < 16) return `${date}:open930`;
  return `${date}:close4pm`;
}

function scoreMarketQuoteCacheTtlMs(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const weekday = map.weekday;
  const isTradingDay = !["Sat", "Sun"].includes(weekday);
  const hour = Number(map.hour);
  const minute = Number(map.minute);

  if (!isTradingDay) return DAY_MS_SCORE;
  if (hour < 9 || (hour === 9 && minute < 30)) return 18 * 60 * 60 * 1000;
  if (hour < 16) return 7 * 60 * 60 * 1000;
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
  if (endpoint === "/statistics") return DAILY_METRIC_CACHE_MS_SCORE;

  if (endpoint === "/time_series") {
    if (interval.includes("min")) return 10 * 60 * 1000;
    if (isPostMarketCloseEtScore()) return 36 * 60 * 60 * 1000;
    return 6 * 60 * 60 * 1000;
  }

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

function normalizeTwelveKey(key = "") {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function deepFindTwelveNumber(obj, keyNames = [], depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 5) return null;
  const targets = new Set(keyNames.map(normalizeTwelveKey));
  for (const [key, value] of Object.entries(obj)) {
    if (targets.has(normalizeTwelveKey(key))) {
      const num = cleanTwelveNumber(value);
      if (num !== null) return num;
    }
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const found = deepFindTwelveNumber(value, keyNames, depth + 1);
      if (found !== null) return found;
    }
  }
  return null;
}

function deepFindTwelveList(obj, preferredKeys = [], depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 5) return [];
  if (Array.isArray(obj)) return obj;
  const targets = preferredKeys.map(normalizeTwelveKey);
  for (const [key, value] of Object.entries(obj)) {
    if (targets.includes(normalizeTwelveKey(key)) && Array.isArray(value)) return value;
  }
  for (const [key, value] of Object.entries(obj)) {
    if (targets.includes(normalizeTwelveKey(key)) && value && typeof value === "object") {
      const nested = deepFindTwelveList(value, preferredKeys, depth + 1);
      if (nested.length) return nested;
    }
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const nested = deepFindTwelveList(value, preferredKeys, depth + 1);
      if (nested.length) return nested;
    }
  }
  return [];
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

async function fetchTwelveDataMarketData(symbol) {
  if (!twelveDataEnabled()) {
    return { quote: null, metrics: {}, source: "Twelve Data unavailable" };
  }

  const data = await fetchTwelveDataOptional("/time_series", {
    symbol,
    interval: "1day",
    outputsize: 370,
    order: "ASC",
  });

  const rawRows = Array.isArray(data?.values) ? data.values : [];
  const rows = rawRows
    .map((row) => ({
      date: row?.datetime || row?.date,
      open: cleanTwelveNumber(row?.open),
      high: cleanTwelveNumber(row?.high),
      low: cleanTwelveNumber(row?.low),
      close: cleanTwelveNumber(row?.close),
    }))
    .filter((row) => row.close !== null)
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));

  if (!rows.length) return { quote: null, metrics: {}, source: "Twelve Data" };

  const last = rows[rows.length - 1];
  const prev = rows[rows.length - 2] || null;
  const currentPrice = last.close;
  const previousClose = prev?.close ?? null;
  const highs = rows.map((row) => row.high).filter((value) => value !== null);
  const lows = rows.map((row) => row.low).filter((value) => value !== null);
  const high52 = highs.length ? Math.max(...highs) : null;
  const low52 = lows.length ? Math.min(...lows) : null;

  const closeDaysAgo = (days) => {
    if (!rows.length) return null;
    const target = new Date(`${last.date}T00:00:00Z`).getTime() - days * 24 * 60 * 60 * 1000;
    let selected = rows[0];
    for (const row of rows) {
      const t = new Date(`${row.date}T00:00:00Z`).getTime();
      if (Number.isFinite(t) && t <= target) selected = row;
      else break;
    }
    return selected?.close ?? null;
  };

  const pctReturn = (days) => {
    const past = closeDaysAgo(days);
    return currentPrice !== null && past !== null && past > 0 ? ((currentPrice - past) / past) * 100 : null;
  };

  const dayChange = currentPrice !== null && previousClose !== null ? currentPrice - previousClose : null;
  const dayChangePercent = currentPrice !== null && previousClose !== null && previousClose > 0
    ? ((currentPrice - previousClose) / previousClose) * 100
    : null;

  return {
    quote: {
      c: currentPrice,
      d: dayChange,
      dp: dayChangePercent,
      h: last.high,
      l: last.low,
      o: last.open,
      pc: previousClose,
    },
    metrics: {
      priceReturn4Week: pctReturn(28),
      priceReturn13Week: pctReturn(91),
      priceReturn26Week: pctReturn(182),
      priceReturn52Week: pctReturn(364),
      weekHigh: high52,
      weekLow: low52,
      dayChangePercent,
    },
    source: "Twelve Data",
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
  const list = deepFindTwelveList(data, [
    "values", "data", "income_statement", "incomeStatements", "incomeStatement", "annualReports", "quarterlyReports",
    "balance_sheet", "balanceSheets", "balanceSheet", "cash_flow", "cashFlows", "cashFlow", "statements", "items", "result", "results"
  ]);
  return list.length ? list : (typeof data === "object" ? [data] : []);
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
  return deepFindTwelveNumber(obj, keys);
}

function pctChangeFromList(list, key) {
  const rows = Array.isArray(list) ? list : [];
  if (rows.length < 2) return null;
  const latest = pickTwelveNumber(rows[0], [key]);
  const prior = pickTwelveNumber(rows[Math.min(rows.length - 1, 3)], [key]);
  if (latest === null || prior === null || prior === 0) return null;
  return ((latest - prior) / Math.abs(prior)) * 100;
}

async function fetchTwelveDataFundamentals(symbol) {
  const [statisticsRaw, incomeRaw, balanceRaw, cashRaw, incomeQuarterlyRaw, balanceQuarterlyRaw, cashQuarterlyRaw, earningsRaw] = await Promise.all([
    fetchTwelveDataOptional("/statistics", { symbol }),
    fetchTwelveDataOptional("/income_statement", { symbol, period: "annual" }),
    fetchTwelveDataOptional("/balance_sheet", { symbol, period: "annual" }),
    fetchTwelveDataOptional("/cash_flow", { symbol, period: "annual" }),
    fetchTwelveDataOptional("/income_statement", { symbol, period: "quarterly" }),
    fetchTwelveDataOptional("/balance_sheet", { symbol, period: "quarterly" }),
    fetchTwelveDataOptional("/cash_flow", { symbol, period: "quarterly" }),
    fetchTwelveDataOptional("/earnings", { symbol }),
  ]);

  const s = statisticsRaw?.statistics || statisticsRaw?.data || statisticsRaw || {};
  const incomeList = twelveList(incomeRaw);
  const balanceList = twelveList(balanceRaw);
  const cashList = twelveList(cashRaw);
  const incomeQuarterlyList = twelveList(incomeQuarterlyRaw);
  const balanceQuarterlyList = twelveList(balanceQuarterlyRaw);
  const cashQuarterlyList = twelveList(cashQuarterlyRaw);
  const income = incomeList[0] || incomeQuarterlyList[0] || {};
  const balance = balanceList[0] || balanceQuarterlyList[0] || {};
  const cash = cashList[0] || cashQuarterlyList[0] || {};
  const qIncome = incomeQuarterlyList[0] || {};
  const qPriorIncome = incomeQuarterlyList[4] || incomeQuarterlyList[1] || {};

  const revenue = firstNumber(
    pickTwelveNumber(income, ["revenue", "total_revenue", "totalRevenue", "sales"]),
    pickTwelveNumber(s, ["revenue_ttm", "revenue", "total_revenue"])
  );
  const netIncome = firstNumber(pickTwelveNumber(income, ["net_income", "netIncome", "net_income_common_stockholders"]), pickTwelveNumber(s, ["net_income_ttm", "net_income"]));
  const grossProfit = pickTwelveNumber(income, ["gross_profit", "grossProfit"]);
  const operatingIncome = pickTwelveNumber(income, ["operating_income", "operatingIncome", "ebit"]);
  const pretaxIncome = pickTwelveNumber(income, ["income_before_tax", "pretax_income", "incomeBeforeTax"]);
  const interestExpense = pickTwelveNumber(income, ["interest_expense", "interestExpense"]);
  const ebit = firstNumber(pickTwelveNumber(income, ["ebit", "operating_income", "operatingIncome"]), operatingIncome);
  const ebitda = firstNumber(pickTwelveNumber(income, ["ebitda"]), pickTwelveNumber(s, ["ebitda", "ebitda_ttm"]));
  const eps = firstNumber(pickTwelveNumber(income, ["eps", "diluted_eps", "eps_diluted", "epsDiluted"]), pickTwelveNumber(s, ["eps", "eps_ttm", "trailing_eps"]));

  const totalDebt = firstNumber(pickTwelveNumber(balance, ["total_debt", "short_long_term_debt_total", "shortLongTermDebtTotal", "long_term_debt", "short_term_debt", "totalDebt"]), pickTwelveNumber(s, ["total_debt", "totalDebt"]));
  const equity = firstNumber(pickTwelveNumber(balance, ["total_equity", "total_shareholder_equity", "shareholder_equity", "totalStockholderEquity"]), pickTwelveNumber(s, ["shareholder_equity"]));
  const assets = firstNumber(pickTwelveNumber(balance, ["total_assets", "totalAssets"]), pickTwelveNumber(s, ["total_assets"]));
  const currentAssets = pickTwelveNumber(balance, ["total_current_assets", "current_assets", "totalCurrentAssets"]);
  const currentLiabilities = pickTwelveNumber(balance, ["total_current_liabilities", "current_liabilities", "totalCurrentLiabilities"]);
  const cashEq = pickTwelveNumber(balance, ["cash_and_cash_equivalents", "cash_and_equivalents", "cash", "cashAndCashEquivalents"]);
  const inventory = pickTwelveNumber(balance, ["inventory", "inventories"]);
  const longTermDebt = pickTwelveNumber(balance, ["long_term_debt", "longTermDebt"]);

  const operatingCashFlow = pickTwelveNumber(cash, ["operating_cash_flow", "cash_flow_from_operating_activities", "net_cash_from_operating_activities"]);
  const capex = pickTwelveNumber(cash, ["capital_expenditures", "capital_expenditure", "capex"]);
  const fcf = firstNumber(pickTwelveNumber(cash, ["free_cash_flow", "freeCashFlow"]), operatingCashFlow !== null && capex !== null ? operatingCashFlow - Math.abs(capex) : null);

  const shares = firstNumber(pickTwelveNumber(s, ["shares_outstanding", "weighted_average_shares", "shares", "sharesOutstanding"]), pickTwelveNumber(income, ["weighted_average_shares", "weightedAverageShsOut", "weightedAverageSharesOutstanding"]));
  const marketCap = firstNumber(pickTwelveNumber(s, ["market_capitalization", "market_cap", "marketCapitalization", "marketCap"]));
  const enterpriseValue = firstNumber(pickTwelveNumber(s, ["enterprise_value", "enterpriseValue"]), marketCap !== null ? marketCap + (totalDebt || 0) - (cashEq || 0) : null);
  const investedCapital = firstNumber(pickTwelveNumber(s, ["invested_capital", "investedCapital"]), equity !== null || totalDebt !== null || cashEq !== null ? (equity || 0) + (totalDebt || 0) - (cashEq || 0) : null);
  const taxRateDecimal = pretaxIncome && netIncome !== null ? Math.max(0, Math.min(0.5, 1 - (netIncome / pretaxIncome))) : null;
  const nopat = ebit !== null ? ebit * (1 - (taxRateDecimal ?? 0.21)) : null;
  const qRevenueGrowth = (() => {
    const latest = pickTwelveNumber(qIncome, ["revenue", "total_revenue", "totalRevenue", "sales"]);
    const prior = pickTwelveNumber(qPriorIncome, ["revenue", "total_revenue", "totalRevenue", "sales"]);
    return latest !== null && prior !== null && prior !== 0 ? ((latest - prior) / Math.abs(prior)) * 100 : null;
  })();

  return {
    raw: { statistics, income, balance, cash, earnings: earningsRaw },
    metrics: {
      revenue,
      netIncome,
      operatingIncome,
      totalDebt,
      shareholderEquity: equity,
      cashAndEquivalents: cashEq,
      totalAssets: assets,
      currentLiabilities,
      operatingCashFlow,
      capex,
      freeCashFlow: fcf,
      revenueGrowth: firstNumber(pickTwelveNumber(s, ["revenue_growth", "revenue_growth_ttm", "revenueGrowth", "revenueGrowthTTM"]), pctChangeFromList(incomeList, "revenue"), pctChangeFromList(incomeList, "total_revenue")),
      revenueGrowthQuarterly: qRevenueGrowth,
      revenueGrowth3Y: firstNumber(pctChangeFromList(incomeList.slice(0,4), "revenue"), pctChangeFromList(incomeList.slice(0,4), "total_revenue")),
      revenueGrowth5Y: firstNumber(pctChangeFromList(incomeList.slice(0,6), "revenue"), pctChangeFromList(incomeList.slice(0,6), "total_revenue")),
      epsGrowth: firstNumber(pickTwelveNumber(s, ["eps_growth", "epsGrowth"]), pctChangeFromList(incomeList, "eps"), pctChangeFromList(incomeList, "diluted_eps")),
      epsGrowth3Y: firstNumber(pctChangeFromList(incomeList.slice(0,4), "eps"), pctChangeFromList(incomeList.slice(0,4), "diluted_eps")),
      epsGrowth5Y: firstNumber(pctChangeFromList(incomeList.slice(0,6), "eps"), pctChangeFromList(incomeList.slice(0,6), "diluted_eps")),
      netIncomeGrowth3Y: pctChangeFromList(incomeList.slice(0,4), "net_income"),
      grossMargin: firstNumber(pickTwelveNumber(s, ["gross_margin", "gross_margin_ttm"]), revenue && grossProfit !== null ? grossProfit / revenue * 100 : null),
      operatingMargin: firstNumber(pickTwelveNumber(s, ["operating_margin", "operating_margin_ttm"]), revenue && operatingIncome !== null ? operatingIncome / revenue * 100 : null),
      pretaxMargin: revenue && pretaxIncome !== null ? pretaxIncome / revenue * 100 : null,
      netMargin: firstNumber(pickTwelveNumber(s, ["profit_margin", "net_margin", "net_profit_margin_ttm"]), revenue && netIncome !== null ? netIncome / revenue * 100 : null),
      roe: firstNumber(pickTwelveNumber(s, ["return_on_equity", "roe"]), equity && netIncome !== null ? netIncome / equity * 100 : null),
      roa: firstNumber(pickTwelveNumber(s, ["return_on_assets", "roa"]), assets && netIncome !== null ? netIncome / assets * 100 : null),
      roicCalculated: firstNumber(pickTwelveNumber(s, ["return_on_invested_capital", "roic"]), investedCapital && nopat !== null ? (nopat / investedCapital) * 100 : null),
      nopat,
      investedCapital,
      debtToEquity: firstNumber(pickTwelveNumber(s, ["debt_to_equity", "debt_equity_ratio"]), equity && totalDebt !== null ? totalDebt / equity : null),
      longTermDebtToEquity: equity && longTermDebt !== null ? longTermDebt / equity : null,
      currentRatio: firstNumber(pickTwelveNumber(s, ["current_ratio"]), currentAssets && currentLiabilities ? currentAssets / currentLiabilities : null),
      quickRatio: currentAssets && inventory !== null && currentLiabilities ? (currentAssets - inventory) / currentLiabilities : pickTwelveNumber(s, ["quick_ratio"]),
      cashRatio: cashEq !== null && currentLiabilities ? cashEq / currentLiabilities : null,
      interestCoverage: interestExpense ? Math.abs(ebit || operatingIncome || 0) / Math.abs(interestExpense) : pickTwelveNumber(s, ["interest_coverage", "interestCoverage"]),
      cashFlowToDebt: totalDebt && operatingCashFlow !== null ? operatingCashFlow / totalDebt : null,
      freeCashFlowPerShare: shares && fcf !== null ? fcf / shares : null,
      operatingCashFlowPerShare: shares && operatingCashFlow !== null ? operatingCashFlow / shares : null,
      peRatio: pickTwelveNumber(s, ["trailing_pe", "pe_ratio", "price_to_earnings"]),
      forwardPe: pickTwelveNumber(s, ["forward_pe"]),
      pegRatio: pickTwelveNumber(s, ["peg_ratio"]),
      priceToSales: pickTwelveNumber(s, ["price_to_sales", "price_sales_ttm"]),
      priceToBook: pickTwelveNumber(s, ["price_to_book", "price_book"]),
      priceToCashFlow: firstNumber(pickTwelveNumber(s, ["price_to_cash_flow", "priceCashFlowRatio"]), marketCap && operatingCashFlow ? marketCap / operatingCashFlow : null),
      priceToFreeCashFlow: firstNumber(pickTwelveNumber(s, ["price_to_free_cash_flow", "priceFreeCashFlowRatio"]), marketCap && fcf ? marketCap / fcf : null),
      dividendYield: pickTwelveNumber(s, ["dividend_yield", "trailing_annual_dividend_yield"]),
      beta: pickTwelveNumber(s, ["beta"]),
      marketCapM: toMillions(marketCap),
      enterpriseValue: toMillions(enterpriseValue),
      ebitda: toMillions(ebitda),
      evToEbitda: enterpriseValue && ebitda ? enterpriseValue / ebitda : null,
      sharesOutstanding: shares,
      revenuePerShare: shares && revenue ? revenue / shares : null,
      eps,
    },
  };
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

    if (score !== null && w > 0) {
      total += score * w;
      weight += w;
    }
  }

  if (!weight) return fallback;
  return Number((total / weight).toFixed(1));
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
  const currentPrice = safeNumber(quote?.c);
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

    peRatio: firstNumber(raw.peTTM, raw.peNormalizedAnnual, raw.peBasicExclExtraTTM),
    forwardPe: firstNumber(raw.forwardPE),
    pegRatio: firstNumber(raw.pegRatio),
    priceToSales: firstNumber(raw.psTTM, raw.psAnnual),
    priceToBook: firstNumber(raw.pbQuarterly, raw.pbAnnual),
    priceToCashFlow: firstNumber(raw.pcfShareTTM),
    priceToFreeCashFlow: firstNumber(raw.pfcfShareTTM),
    dividendYield: percentFromDecimal(firstNumber(raw.currentDividendYieldTTM, raw.dividendYieldIndicatedAnnual)),

    revenueGrowth: percentFromDecimal(firstNumber(raw.revenueGrowthTTMYoy, raw.revenueGrowthQuarterlyYoy, raw.revenueGrowth5Y)),
    revenueGrowthQuarterly: percentFromDecimal(firstNumber(raw.revenueGrowthQuarterlyYoy)),
    revenueGrowth3Y: percentFromDecimal(firstNumber(raw.revenueGrowth3Y)),
    revenueGrowth5Y: percentFromDecimal(firstNumber(raw.revenueGrowth5Y)),

    epsGrowth: percentFromDecimal(firstNumber(raw.epsGrowthTTMYoy, raw.epsGrowthQuarterlyYoy)),
    epsGrowth3Y: percentFromDecimal(firstNumber(raw.epsGrowth3Y)),
    epsGrowth5Y: percentFromDecimal(firstNumber(raw.epsGrowth5Y)),

    roe: percentFromDecimal(firstNumber(raw.roeTTM, raw.roeRfy)),
    roa: percentFromDecimal(firstNumber(raw.roaTTM, raw.roaRfy)),
    roi: percentFromDecimal(firstNumber(raw.roiTTM, raw.roiAnnual)),
    grossMargin: percentFromDecimal(firstNumber(raw.grossMarginTTM, raw.grossMarginAnnual)),
    operatingMargin: percentFromDecimal(firstNumber(raw.operatingMarginTTM, raw.operatingMarginAnnual)),
    pretaxMargin: percentFromDecimal(firstNumber(raw.pretaxMarginTTM, raw.pretaxMarginAnnual)),
    netMargin: percentFromDecimal(firstNumber(raw.netProfitMarginTTM, raw.netProfitMarginAnnual)),

    debtToEquity: firstNumber(raw.totalDebtToEquityQuarterly, raw.totalDebtToEquityAnnual),
    longTermDebtToEquity: firstNumber(raw.longTermDebtToEquityQuarterly, raw.longTermDebtToEquityAnnual),
    currentRatio: firstNumber(raw.currentRatioQuarterly, raw.currentRatioAnnual),
    quickRatio: firstNumber(raw.quickRatioQuarterly, raw.quickRatioAnnual),
    cashRatio: firstNumber(raw.cashRatioQuarterly, raw.cashRatioAnnual),
    assetTurnover: firstNumber(raw.assetTurnoverTTM, raw.assetTurnoverAnnual),
    operatingIncome: firstNumber(raw.operatingIncomeTTM, raw.operatingIncomeAnnual),
    operatingCashFlow: firstNumber(raw.operatingCashFlowTTM, raw.operatingCashFlowAnnual),
    capex: firstNumber(raw.capexTTM, raw.capexAnnual, raw.capitalExpenditureTTM, raw.capitalExpenditureAnnual),
    freeCashFlow: firstNumber(raw.freeCashFlowTTM, raw.freeCashFlowAnnual),
    netIncome: firstNumber(raw.netIncomeTTM, raw.netIncomeAnnual),
    totalAssets: firstNumber(raw.totalAssetsQuarterly, raw.totalAssetsAnnual),
    currentLiabilities: firstNumber(raw.totalCurrentLiabilitiesQuarterly, raw.totalCurrentLiabilitiesAnnual, raw.currentLiabilitiesQuarterly, raw.currentLiabilitiesAnnual),
    totalDebt: firstNumber(raw.totalDebtQuarterly, raw.totalDebtAnnual),
    shareholderEquity: firstNumber(raw.totalEquityQuarterly, raw.totalEquityAnnual, raw.bookValuePerShareAnnual && raw.sharesOutstanding ? raw.bookValuePerShareAnnual * raw.sharesOutstanding : null),
    cashAndEquivalents: firstNumber(raw.cashAndEquivalentsQuarterly, raw.cashAndEquivalentsAnnual, raw.cashPerShareAnnual && raw.sharesOutstanding ? raw.cashPerShareAnnual * raw.sharesOutstanding : null),
    netIncomeGrowth3Y: percentFromDecimal(firstNumber(raw.netIncomeGrowth3Y, raw.netIncomeGrowth3YAnnual, raw["3YearNetIncomeGrowth"])),
    interestCoverage: firstNumber(raw.interestCoverageTTM, raw.interestCoverageAnnual),
    cashFlowToDebt: firstNumber(raw.cashFlowToDebtTTM, raw.cashFlowToDebtAnnual),
    operatingCashFlowPerShare: firstNumber(raw.operatingCashFlowPerShareTTM, raw.operatingCashFlowPerShareAnnual),
    freeCashFlowPerShare: firstNumber(raw.freeCashFlowPerShareTTM, raw.freeCashFlowPerShareAnnual),
    totalDebtToCapital: firstNumber(raw.totalDebtToCapitalizationQuarterly, raw.totalDebtToCapitalizationAnnual),
    netDebtToEbitda: firstNumber(raw.netDebtToEBITDATTM, raw.netDebtToEBITDAAnnual),

    priceReturn4Week: firstNumber(raw["4WeekPriceReturnDaily"], raw.monthToDatePriceReturnDaily),
    priceReturn13Week: firstNumber(raw["13WeekPriceReturnDaily"], raw["3MonthPriceReturnDaily"]),
    priceReturn26Week: firstNumber(raw["26WeekPriceReturnDaily"], raw["6MonthPriceReturnDaily"]),
    priceReturn52Week: firstNumber(raw["52WeekPriceReturnDaily"], raw.yearToDatePriceReturnDaily),
    weekHigh,
    weekLow,
    pullbackFromHigh,
    distanceFrom52WeekLow,
    dayChangePercent: firstNumber(quote?.dp),
  };
}

function scoreGrowth(m = {}) {
  return availableWeightedAverage(
    [
      { score: metricScore(m.revenueGrowth, [[40, 10], [25, 9], [15, 8], [8, 7], [3, 6], [0, 5], [-5, 4], [-999, 3]]), weight: 0.30 },
      { score: metricScore(m.revenueGrowthQuarterly, [[35, 10], [22, 9], [12, 8], [6, 7], [2, 6], [0, 5], [-5, 4], [-999, 3]]), weight: 0.15 },
      { score: metricScore(m.revenueGrowth3Y, [[25, 10], [18, 9], [12, 8], [7, 7], [3, 6], [0, 5], [-5, 4], [-999, 3]]), weight: 0.15 },
      { score: metricScore(m.revenueGrowth5Y, [[20, 10], [14, 9], [9, 8], [5, 7], [2, 6], [0, 5], [-5, 4], [-999, 3]]), weight: 0.10 },
      { score: metricScore(m.epsGrowth, [[40, 10], [25, 9], [15, 8], [8, 7], [3, 6], [0, 5], [-10, 4], [-999, 3]]), weight: 0.20 },
      { score: metricScore(m.epsGrowth3Y, [[25, 10], [18, 9], [12, 8], [7, 7], [3, 6], [0, 5], [-10, 4], [-999, 3]]), weight: 0.10 },
    ],
    6
  );
}

function scoreProfitability(m = {}) {
  return availableWeightedAverage(
    [
      { score: metricScore(m.roe, [[60, 10], [35, 9], [20, 8], [12, 7], [5, 6], [0, 5], [-999, 3]]), weight: 0.22 },
      { score: metricScore(m.roa, [[18, 10], [12, 9], [8, 8], [5, 7], [2, 6], [0, 5], [-999, 3]]), weight: 0.14 },
      { score: metricScore(m.roi, [[30, 10], [20, 9], [14, 8], [9, 7], [4, 6], [0, 5], [-999, 3]]), weight: 0.14 },
      { score: metricScore(m.grossMargin, [[70, 10], [55, 9], [40, 8], [28, 7], [18, 6], [8, 5], [-999, 3]]), weight: 0.13 },
      { score: metricScore(m.operatingMargin, [[35, 10], [25, 9], [15, 8], [8, 7], [3, 6], [0, 5], [-999, 3]]), weight: 0.20 },
      { score: metricScore(m.netMargin, [[30, 10], [20, 9], [12, 8], [7, 7], [3, 6], [0, 5], [-999, 3]]), weight: 0.17 },
    ],
    6
  );
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
    supportScore ?? coreScore ?? 6.5
  );

  return Number(clamp(finalScore, 0, 10).toFixed(1));
}




function scoreValuation(m = {}, growthScore = 6, profitabilityScore = 6) {
  const raw = availableWeightedAverage(
    [
      { score: inverseMetricScore(m.peRatio, [[12, 9.5], [18, 8.5], [25, 7.5], [35, 6.5], [50, 5.5], [75, 4.5], [9999, 3.5]]), weight: 0.25 },
      { score: inverseMetricScore(m.forwardPe, [[14, 9], [20, 8], [28, 7], [40, 6], [60, 5], [9999, 3.5]]), weight: 0.10 },
      { score: inverseMetricScore(m.pegRatio, [[0.8, 9.5], [1.2, 8.5], [1.8, 7.5], [2.5, 6], [4, 4.5], [9999, 3]]), weight: 0.15 },
      { score: inverseMetricScore(m.priceToSales, [[2, 9], [4, 8], [7, 6.5], [12, 5], [20, 3.5], [9999, 2.5]]), weight: 0.18 },
      { score: inverseMetricScore(m.priceToBook, [[2, 9], [4, 8], [7, 6.5], [12, 5], [20, 3.5], [9999, 2.5]]), weight: 0.12 },
      { score: inverseMetricScore(m.priceToFreeCashFlow, [[15, 9], [25, 8], [40, 6.5], [65, 5], [100, 3.5], [9999, 2.5]]), weight: 0.20 },
    ],
    6
  );

  const quality = availableWeightedAverage([{ score: growthScore, weight: 0.215 }, { score: profitabilityScore, weight: 0.205 }], 6);
  return Number(clamp(raw + Math.max(-0.5, Math.min(0.8, (quality - 6) * 0.12))).toFixed(1));
}

function scoreMomentum(m = {}) {
  return availableWeightedAverage(
    [
      { score: metricScore(m.priceReturn4Week, [[15, 10], [8, 9], [3, 8], [0, 7], [-5, 5], [-12, 4], [-999, 3]]), weight: 0.22 },
      { score: metricScore(m.priceReturn13Week, [[25, 10], [15, 9], [8, 8], [2, 7], [-5, 5], [-15, 4], [-999, 3]]), weight: 0.25 },
      { score: metricScore(m.priceReturn26Week, [[40, 10], [25, 9], [12, 8], [3, 7], [-8, 5], [-20, 4], [-999, 3]]), weight: 0.22 },
      { score: metricScore(m.priceReturn52Week, [[70, 10], [40, 9], [20, 8], [5, 7], [-10, 5], [-25, 4], [-999, 3]]), weight: 0.21 },
      { score: metricScore(m.dayChangePercent, [[5, 9], [2, 8], [0, 6.5], [-2, 5], [-5, 4], [-999, 3]]), weight: 0.10 },
    ],
    6
  );
}

function scorePullback(m = {}) {
  return availableWeightedAverage(
    [
      { score: metricScore(m.pullbackFromHigh, [[35, 9], [25, 8], [15, 7], [8, 6], [3, 5], [0, 4], [-999, 3]]), weight: 0.42 },
      { score: inverseMetricScore(m.priceReturn4Week, [[-8, 8.5], [-4, 7.5], [0, 6.5], [5, 5], [12, 4], [999, 3]]), weight: 0.25 },
      { score: metricScore(m.distanceFrom52WeekLow, [[80, 9], [50, 8], [30, 7], [15, 6], [5, 5], [-999, 3]]), weight: 0.18 },
      { score: inverseMetricScore(m.dayChangePercent, [[-5, 8.5], [-2, 7.5], [0, 6.5], [3, 5.5], [8, 4], [999, 3]]), weight: 0.15 },
    ],
    6
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
  const labels = {
    growth: "Growth",
    profitability: "Profitability",
    financialHealth: "Financial Health",
    valuation: "Valuation",
    momentum: "Momentum",
    reversal: "Pullback",
    quality: "Quality",
  };

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

function fallbackScoreSummary(symbol, profile, categories, metrics, newsSentiment, edgeScore) {
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
    summary: `${companyName}'s Eval Score blends company fundamentals, valuation, market behavior, and quality inputs. The strongest area is ${strongestLabel.toLowerCase()}, while ${weakestLabel.toLowerCase()} is the biggest reason the score is not higher.`,
    metricBreakdown: [
      {
        category: "Growth",
        score: safeNumber(categories?.growth),
        tone: categoryTone(categories?.growth),
        why: `Growth looks at sales and EPS expansion. Revenue growth is ${simpleMetricText(metrics?.revenueGrowth, "%")} and EPS growth is ${simpleMetricText(metrics?.epsGrowth, "%")}.`,
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

async function generateScoreSummary(symbol, profile, categories, metrics, newsSentiment, edgeScore) {
  const fallback = fallbackScoreSummary(symbol, profile, categories, metrics, newsSentiment, edgeScore);
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
      pullbackFromHigh: metrics?.pullbackFromHigh,
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
              "You generate clear stock score explanations for Eval. Use only the provided company data, metrics, category scores, profile/industry context, . Explain why the Eval Score is where it is, explain what each metric means in beginner-friendly language, and connect the score to real-world company context without giving buy/sell/hold advice. Return only valid JSON.",
          },
          {
            role: "user",
            content: JSON.stringify({
              instructions:
                "Return JSON with keys: headline, verdict, summary, metricBreakdown, positives, concerns, takeaway. Do not include a newsConnection key. summary must be 4-6 polished sentences explaining the company-specific reason for the Eval Score using the metrics, industry context, . metricBreakdown must be 5-7 objects with category, score, tone, why. Each why must explain what that metric/category means, cite the specific provided metric values when available, and explain why it helps or hurts this specific company. tone must be strong, mixed, weak, or neutral. Keep text polished, specific to the company, and easy for beginners.",
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

export async function buildStockAnalysis(symbol, options = {}) {
  const cleanSymbol = String(symbol || "").trim().toUpperCase();
  if (!cleanSymbol) throw new Error("Missing ticker symbol.");

  const cachedReport = options?.cachedReport || null;
  const hasCachedReport = Boolean(cachedReport?.grades?.categories);
  const refreshProfile = options?.refreshProfile ?? !hasCachedReport;
  const refreshFundamentals = options?.refreshFundamentals ?? true;
  const refreshMarket = options?.refreshMarket ?? true;
  const refreshNews = options?.refreshNews ?? true;
  const includeAiScoreSummary = options?.includeAiScoreSummary !== false;

  if (!process.env.TWELVE_DATA_API_KEY) {
    throw new Error("Missing TWELVE_DATA_API_KEY in Render environment variables.");
  }

  const [twelveProfile, twelveQuote, twelveMarket, twelveFundamentals] = await Promise.all([
    refreshProfile ? fetchTwelveDataProfile(cleanSymbol) : (cachedReport?.profile || null),
    null,
    { quote: null, metrics: {}, source: "Market price data disabled" },
    (refreshFundamentals || !hasCachedReport) ? fetchTwelveDataFundamentals(cleanSymbol) : { metrics: metricsFromCachedReport(cachedReport), raw: {} },
  ]);

  const cachedProfile = cachedReport?.profile || {};
  const profile = {
    ...(cachedProfile || {}),
    ...(twelveProfile || {}),
    ticker: twelveProfile?.ticker || cachedProfile?.ticker || cleanSymbol,
    name: twelveProfile?.name || cachedProfile?.name || cleanSymbol,
    finnhubIndustry: twelveProfile?.finnhubIndustry || cachedProfile?.finnhubIndustry || "Public company",
    marketCapitalization: firstNumber(twelveProfile?.marketCapitalization, twelveFundamentals?.metrics?.marketCapM, cachedProfile?.marketCapitalization),
    weburl: twelveProfile?.weburl || cachedProfile?.weburl || "",
    logo: twelveProfile?.logo || cachedProfile?.logo || `/api/company-logo/${encodeURIComponent(cleanSymbol)}`,
  };

  const quote = bestQuote({ cachedQuote: {}, twelveQuote: twelveQuote || twelveMarket?.quote || {} });
  // Do not fail the entire analysis when Twelve Data has no profile/logo for a ticker.
  // Price/metric data can still exist, and the UI can fall back to the ticker symbol.
  const cachedMetrics = metricsFromCachedReport(cachedReport);
  const twelveMarketMetrics = twelveMarket?.metrics || {};
  const twelveFundamentalMetrics = twelveFundamentals?.metrics || {};
  const raw = mergeDefined(cachedMetrics, twelveMarketMetrics, twelveFundamentalMetrics);
  const extracted = buildExtractedMetrics(profile, quote, raw);
  applyMetricFallbacks(extracted, twelveFundamentalMetrics, cachedMetrics);
  applyMetricFallbacks(extracted, twelveMarketMetrics, cachedMetrics);

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

  const growthScore = scoreGrowth(extracted);
  const profitabilityScore = scoreProfitability(extracted);
  const healthScore = scoreFinancialHealth(extracted);
  const valuationScore = scoreValuation(extracted, growthScore, profitabilityScore);
  const momentumScore = scoreMomentum(extracted);
  const reversalScore = scorePullback(extracted);
  const qualityScore = availableWeightedAverage([
    { score: extracted.roicCalculated !== null ? scoreProfitMetric(extracted.roicCalculated, [2,5,8,12,18,25]) : null, weight: .35 },
    { score: extracted.cashConversionRatio !== null ? scoreProfitMetric(extracted.cashConversionRatio * 100, [20,40,60,80,100,130]) : null, weight: .35 },
    { score: extracted.freeCashFlowPerShare !== null ? scoreProfitMetric(extracted.freeCashFlowPerShare, [0,1,2,4,8,12]) : null, weight: .30 },
  ], 1);

  const categories = { growth: growthScore, profitability: profitabilityScore, financialHealth: healthScore, valuation: valuationScore, momentum: momentumScore, reversal: reversalScore, quality: qualityScore };
  const validCategoryCount = Object.values(categories).filter((value) => safeNumber(value) !== null).length;
  const validInputCounts = {
    growth: countValidMetricInputs([extracted.revenueGrowth, extracted.revenueGrowthQuarterly, extracted.revenueGrowth3Y, extracted.revenueGrowth5Y, extracted.epsGrowth, extracted.epsGrowth3Y, extracted.epsGrowth5Y, extracted.netIncomeGrowth3Y]),
    profitability: countValidMetricInputs([extracted.operatingMargin, extracted.netMargin, extracted.roe, extracted.roa, extracted.roicCalculated, extracted.freeCashFlowPerShare]),
    financialHealth: countValidMetricInputs([extracted.debtToEquity, extracted.longTermDebtToEquity, extracted.currentRatio, extracted.quickRatio, extracted.cashRatio, extracted.interestCoverage, extracted.cashFlowToDebt, extracted.totalDebt, extracted.shareholderEquity, extracted.cashAndEquivalents]),
    valuation: countValidMetricInputs([extracted.peRatio, extracted.forwardPe, extracted.priceToSales, extracted.priceToBook, extracted.priceToCashFlow, extracted.priceToFreeCashFlow, extracted.pegRatio, extracted.marketCapM]),
    marketData: countValidMetricInputs([extracted.currentPrice, extracted.priceReturn4Week, extracted.priceReturn13Week, extracted.priceReturn26Week, extracted.priceReturn52Week, extracted.weekHigh, extracted.weekLow, extracted.dayChangePercent]),
    quality: countValidMetricInputs([extracted.roicCalculated, extracted.cashConversionRatio, extracted.freeCashFlowPerShare]),
  };

  const edgeScore = availableWeightedAverage([
    { score: growthScore, weight: 0.22 },
    { score: profitabilityScore, weight: 0.20 },
    { score: healthScore, weight: 0.17 },
    { score: valuationScore, weight: 0.16 },
    { score: momentumScore, weight: 0.11 },
    { score: reversalScore, weight: 0.07 },
    { score: qualityScore, weight: 0.07 },
  ], 5);

  const riskLabel = getRiskLabel(extracted, healthScore);
  const sw = strongestWeakest(categories);
  const src = "Twelve Data";
  const reportMetrics = {
    revenueGrowth: metric(extracted.revenueGrowth, "%", src, "Revenue growth YoY"),
    revenueGrowthQuarterly: metric(extracted.revenueGrowthQuarterly, "%", src, "Quarterly revenue growth YoY"),
    revenueGrowth3Y: metric(extracted.revenueGrowth3Y, "%", src, "3-year revenue growth"),
    revenueGrowth5Y: metric(extracted.revenueGrowth5Y, "%", src, "5-year revenue growth"),
    epsGrowth: metric(extracted.epsGrowth, "%", src, "EPS growth YoY"),
    epsGrowth3Y: metric(extracted.epsGrowth3Y, "%", src, "3-year EPS growth"),
    epsGrowth5Y: metric(extracted.epsGrowth5Y, "%", src, "5-year EPS growth"),
    roe: metric(extracted.roe, "%", src, "Return on equity"), roa: metric(extracted.roa, "%", src, "Return on assets"), roi: metric(extracted.roicCalculated, "%", src, "Return on invested capital"), grossMargin: metric(extracted.grossMargin, "%", src, "Gross profit / revenue"), operatingMargin: metric(extracted.operatingMargin, "%", src, "Operating income / revenue"), pretaxMargin: metric(extracted.pretaxMargin, "%", src, "Pretax income / revenue"), netMargin: metric(extracted.netMargin, "%", src, "Net income / revenue"),
    debtToEquity: metric(extracted.debtToEquity, "", src, "Total debt / equity"), longTermDebtToEquity: metric(extracted.longTermDebtToEquity, "", src, "Long-term debt / equity"), currentRatio: metric(extracted.currentRatio, "", src, "Current assets / current liabilities"), quickRatio: metric(extracted.quickRatio, "", src, "Quick assets / current liabilities"), cashRatio: metric(extracted.cashRatio, "", src, "Cash / current liabilities"), assetTurnover: metric(extracted.assetTurnover, "", src, "Revenue / assets"), interestCoverage: metric(extracted.interestCoverage, "", src, "EBIT / interest expense"), cashFlowToDebt: metric(extracted.cashFlowToDebt, "", src, "Operating cash flow / total debt"), operatingCashFlowPerShare: metric(extracted.operatingCashFlowPerShare, "", src, "Operating cash flow / share"), freeCashFlowPerShare: metric(extracted.freeCashFlowPerShare, "", src, "Free cash flow / share"), totalDebtToCapital: metric(extracted.totalDebtToCapital, "", src, "Debt / total capital"), netDebtToEbitda: metric(extracted.netDebtToEbitda, "", src, "Net debt / EBITDA"),
    peRatio: metric(extracted.peRatio, "", src, "Price / earnings"), forwardPe: metric(extracted.forwardPe, "", src, "Forward price / earnings"), pegRatio: metric(extracted.pegRatio, "", src, "P/E / growth"), priceToSales: metric(extracted.priceToSales, "", src, "Price / sales"), priceToBook: metric(extracted.priceToBook, "", src, "Price / book value"), priceToCashFlow: metric(extracted.priceToCashFlow, "", src, "Price / cash flow"), priceToFreeCashFlow: metric(extracted.priceToFreeCashFlow, "", src, "Price / free cash flow"), dividendYield: metric(extracted.dividendYield, "%", src, "Annual dividend yield"),
    beta: metric(extracted.beta, "", src, "Volatility compared with market"), dayChangePercent: metric(extracted.dayChangePercent, "%", src, "Current daily price change"), priceReturn4Week: metric(extracted.priceReturn4Week, "%", src, "4-week price return"), priceReturn13Week: metric(extracted.priceReturn13Week, "%", src, "13-week price return"), priceReturn26Week: metric(extracted.priceReturn26Week, "%", src, "26-week price return"), priceReturn52Week: metric(extracted.priceReturn52Week, "%", src, "52-week price return"), distanceFrom52WeekLow: metric(extracted.distanceFrom52WeekLow, "%", src, "(Current price - 52-week low) / 52-week low"), pullbackFromHigh: metric(extracted.pullbackFromHigh, "%", src, "(52-week high - current price) / 52-week high"),
    revenue: metric(extracted.revenue, "", src, "Revenue"),
    sharesOutstanding: metric(extracted.sharesOutstanding, "", src, "Shares outstanding"),
    marketCapM: metric(extracted.marketCapM, "M", src, "Market capitalization in millions"), enterpriseValue: metric(extracted.enterpriseValue, "M", src, "Enterprise value"), ebitda: metric(extracted.ebitda, "M", src, "EBITDA"), evToEbitda: metric(extracted.evToEbitda, "", src, "EV/EBITDA"),
    wacc: metric(null, "%", "DCF", "User-selected DCF calculator"), costOfEquity: metric(null, "%", "DCF", "User-selected DCF calculator"), afterTaxCostOfDebt: metric(null, "%", "DCF", "User-selected DCF calculator"), taxRate: metric(null, "%", "DCF", "User-selected DCF calculator"), dcfEnterpriseValue: metric(null, "M", "DCF", "User-selected DCF calculator"), intrinsicValue: metric(null, "", "DCF", "User-selected DCF calculator"), intrinsicValueGap: metric(null, "%", "DCF", "User-selected DCF calculator"), dcfGrowthRate: metric(null, "%", "DCF", "User-selected DCF calculator"),
  };

  const aiScoreSummary = includeAiScoreSummary ? await generateScoreSummary(cleanSymbol, profile, categories, metricsFromReportValues(reportMetrics), null, edgeScore) : null;
  return { symbol: cleanSymbol, profile: { ...profile, ticker: profile.ticker || cleanSymbol, name: profile.name || cleanSymbol, finnhubIndustry: profile.finnhubIndustry || "Public company" }, quote: { c: null, d: null, dp: null, h: null, l: null, o: null, pc: null }, companyDescription: `${profile.name || cleanSymbol} is a publicly traded company in the ${profile.finnhubIndustry || "market"} industry.`, evaluationSummary: `${cleanSymbol} has an Eval Score of ${edgeScore.toFixed(1)} out of 10. The score blends growth, profitability, financial health, valuation, momentum, pullback, and quality.`, strengths: [sw.strongest], weaknesses: [sw.weakest], grades: { edgeScore, grade: gradeFrom10(edgeScore), riskLabel, categories, context: { marketCapM: extracted.marketCapM }, dataQuality: { validCategoryCount, minRequiredCategories: 5, validInputCounts, providerStatus: { twelveDataKey: Boolean(process.env.TWELVE_DATA_API_KEY), apiMinimization: "Twelve Data is the only stock data provider. News sentiment is currently removed." }, sources: { price: "Twelve Data", marketData: "Twelve Data", fundamentals: "Twelve Data", profile: "Twelve Data" } } }, metrics: reportMetrics, aiScoreSummary };
}
