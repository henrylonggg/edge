const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";
const MASSIVE_BASE_URL = "https://api.massive.com";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const NEWS_SENTIMENT_MODEL = process.env.OPENAI_NEWS_MODEL || "gpt-4.1-nano";


function clamp(value, min = 0, max = 10) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function safeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function metric(value, suffix = "", source = "Finnhub", formula = "") {
  return {
    value: safeNumber(value),
    suffix,
    source,
    formula,
  };
}

function firstNumber(...values) {
  for (const value of values) {
    const n = safeNumber(value);
    if (n !== null) return n;
  }
  return null;
}

function divide(a, b) {
  const x = safeNumber(a);
  const y = safeNumber(b);
  if (x === null || y === null || y === 0) return null;
  return x / y;
}

function toPercentValue(value) {
  const n = safeNumber(value);
  if (n === null) return null;
  return Math.abs(n) <= 1.5 ? n * 100 : n;
}

function absNumber(value) {
  const n = safeNumber(value);
  return n === null ? null : Math.abs(n);
}


function toMillions(value) {
  const n = safeNumber(value);
  if (n === null) return null;
  return n / 1_000_000;
}

function percentGrowth(current, previous) {
  const c = safeNumber(current);
  const p = safeNumber(previous);
  if (c === null || p === null || p === 0) return null;
  return ((c - p) / Math.abs(p)) * 100;
}

function cagr(current, previous, years) {
  const c = safeNumber(current);
  const p = safeNumber(previous);
  const y = safeNumber(years);
  if (c === null || p === null || y === null || y <= 0 || c <= 0 || p <= 0) return null;
  return (Math.pow(c / p, 1 / y) - 1) * 100;
}

function pickMetric(metrics, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(metrics, key)) {
      const value = safeNumber(metrics[key]);
      if (value !== null) return value;
    }
  }
  return null;
}

function pickScaledMetric(metrics, candidates) {
  for (const candidate of candidates) {
    const key = typeof candidate === "string" ? candidate : candidate.key;
    const scale = typeof candidate === "string" ? 1 : candidate.scale || 1;

    if (Object.prototype.hasOwnProperty.call(metrics, key)) {
      const value = safeNumber(metrics[key]);
      if (value !== null) return value * scale;
    }
  }

  return null;
}

function availableWeightedAverage(items, fallback = 6.0) {
  const used = items.filter(
    (item) => item.score !== null && item.score !== undefined && Number.isFinite(Number(item.score))
  );
  if (!used.length) return fallback;

  const totalWeight = used.reduce((sum, item) => sum + (item.weight || 1), 0);
  if (!totalWeight) return fallback;

  const total = used.reduce((sum, item) => sum + Number(item.score) * (item.weight || 1), 0);
  return Number(clamp(total / totalWeight).toFixed(1));
}

function highIsGood(value, poor, excellent) {
  const n = safeNumber(value);
  if (n === null) return null;
  if (excellent === poor) return 6.0;
  const score = ((n - poor) / (excellent - poor)) * 10;
  return Number(clamp(score + 0.35, 2.0, 10).toFixed(1));
}

function lowIsGood(value, excellent, poor) {
  const n = safeNumber(value);
  if (n === null) return null;
  if (poor === excellent) return 6.0;
  const score = 10 - ((n - excellent) / (poor - excellent)) * 10;
  return Number(clamp(score + 0.35, 2.0, 10).toFixed(1));
}

function rangeSweetSpot(value, idealLow, idealHigh, weakLow, weakHigh) {
  const n = safeNumber(value);
  if (n === null) return null;
  if (n >= idealLow && n <= idealHigh) return 10;
  if (n < idealLow) return highIsGood(n, weakLow, idealLow);
  return lowIsGood(n, idealHigh, weakHigh);
}

async function fetchFinnhub(path, params = {}) {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    throw new Error("Missing FINNHUB_API_KEY in Render environment variables.");
  }

  const url = new URL(`${FINNHUB_BASE_URL}${path}`);

  Object.entries({ ...params, token: apiKey }).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `Finnhub request failed: ${response.status}`);
  }

  return data;
}

async function fetchFinnhubOptional(path, params = {}) {
  try {
    return await fetchFinnhub(path, params);
  } catch (error) {
    console.warn(`Optional Finnhub fetch failed for ${path}:`, error?.message || error);
    return null;
  }
}


async function fetchFmpOptional(path, params = {}) {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL(`${FMP_BASE_URL}${path}`);
    Object.entries({ ...params, apikey: apiKey }).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });

    const response = await fetch(url);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.warn(`Optional FMP fetch failed for ${path}:`, response.status, data?.Error || data?.error || "");
      return null;
    }

    return data;
  } catch (error) {
    console.warn(`Optional FMP fetch failed for ${path}:`, error?.message || error);
    return null;
  }
}

async function fetchMassiveOptional(path, params = {}) {
  const apiKey = process.env.MASSIVE_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL(`${MASSIVE_BASE_URL}${path}`);
    Object.entries({ ...params, apiKey }).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });

    const response = await fetch(url);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.warn(`Optional Massive fetch failed for ${path}:`, response.status, data?.error || data?.message || "");
      return null;
    }

    return data;
  } catch (error) {
    console.warn(`Optional Massive fetch failed for ${path}:`, error?.message || error);
    return null;
  }
}

async function fetchOpenAiNewsSentiment(symbol, profile, newsItems = []) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !Array.isArray(newsItems) || !newsItems.length) {
    return null;
  }

  const compactNews = newsItems
    .slice(0, 8)
    .map((item, index) => ({
      n: index + 1,
      date: item.publishedDate || item.datetime || item.date || "",
      source: item.site || item.source || "",
      title: item.title || item.headline || "",
      text: item.text || item.summary || "",
      url: item.url || "",
    }))
    .filter((item) => item.title || item.text);

  if (!compactNews.length) return null;

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: NEWS_SENTIMENT_MODEL,
        temperature: 0.15,
        max_tokens: 220,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You score recent stock news sentiment. Return only valid JSON with keys score, label, summary. score is 0-10. label is Bullish, Neutral, or Bearish. summary must be exactly 3 short sentences. Do not give financial advice.",
          },
          {
            role: "user",
            content: JSON.stringify({
              ticker: symbol,
              company: profile?.name || symbol,
              news: compactNews,
            }),
          },
        ],
      }),
    });

    const json = await response.json().catch(() => null);
    if (!response.ok) {
      console.warn("OpenAI news sentiment failed:", response.status, json?.error?.message || "");
      return null;
    }

    const content = json?.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(content || "{}");
    const score = clamp(parsed.score, 0, 10);

    return {
      score: Number(score.toFixed(1)),
      label: parsed.label || (score >= 7 ? "Bullish" : score <= 4 ? "Bearish" : "Neutral"),
      summary: String(parsed.summary || "").trim(),
      articleCount: compactNews.length,
      source: "OpenAI + recent news",
      model: NEWS_SENTIMENT_MODEL,
    };
  } catch (error) {
    console.warn("OpenAI news sentiment parse failed:", error?.message || error);
    return null;
  }
}

function arrayFirst(value) {
  return Array.isArray(value) && value.length ? value[0] : null;
}

async function fetchFmpBundle(symbol) {
  const clean = String(symbol || "").trim().toUpperCase();
  if (!process.env.FMP_API_KEY) return null;

  const [
    profile,
    quote,
    ratiosTtm,
    keyMetricsTtm,
    incomeAnnual,
    balanceAnnual,
    cashflowAnnual,
    growthAnnual,
    enterpriseValues,
    news,
  ] = await Promise.all([
    fetchFmpOptional(`/profile/${clean}`),
    fetchFmpOptional(`/quote/${clean}`),
    fetchFmpOptional(`/ratios-ttm/${clean}`),
    fetchFmpOptional(`/key-metrics-ttm/${clean}`),
    fetchFmpOptional(`/income-statement/${clean}`, { period: "annual", limit: 6 }),
    fetchFmpOptional(`/balance-sheet-statement/${clean}`, { period: "annual", limit: 6 }),
    fetchFmpOptional(`/cash-flow-statement/${clean}`, { period: "annual", limit: 6 }),
    fetchFmpOptional(`/financial-growth/${clean}`, { period: "annual", limit: 6 }),
    fetchFmpOptional(`/enterprise-values/${clean}`, { period: "annual", limit: 2 }),
    fetchFmpOptional(`/stock_news`, { tickers: clean, limit: 8 }),
  ]);

  return {
    profile: arrayFirst(profile),
    quote: arrayFirst(quote),
    ratiosTtm: arrayFirst(ratiosTtm),
    keyMetricsTtm: arrayFirst(keyMetricsTtm),
    incomeAnnual: Array.isArray(incomeAnnual) ? incomeAnnual : [],
    balanceAnnual: Array.isArray(balanceAnnual) ? balanceAnnual : [],
    cashflowAnnual: Array.isArray(cashflowAnnual) ? cashflowAnnual : [],
    growthAnnual: Array.isArray(growthAnnual) ? growthAnnual : [],
    enterpriseValues: Array.isArray(enterpriseValues) ? enterpriseValues : [],
    news: Array.isArray(news) ? news : [],
  };
}

async function fetchMassiveQuote(symbol) {
  const clean = String(symbol || "").trim().toUpperCase();
  const data = await fetchMassiveOptional(`/v2/snapshot/locale/us/markets/stocks/tickers/${clean}`);
  const t = data?.ticker || data?.results || null;
  if (!t) return null;

  const current = firstNumber(t?.lastTrade?.p, t?.day?.c, t?.prevDay?.c);
  const previousClose = safeNumber(t?.prevDay?.c);
  const change = firstNumber(
    t?.todaysChange,
    current !== null && previousClose !== null ? current - previousClose : null
  );
  const changePercent = firstNumber(
    t?.todaysChangePerc,
    change !== null && previousClose ? (change / previousClose) * 100 : null
  );

  return current !== null
    ? {
        c: current,
        d: change,
        dp: changePercent,
        source: "Massive snapshot",
      }
    : null;
}

function fmpDerivedMetrics(fmp, fallbackProfile = {}, fallbackQuote = {}) {
  if (!fmp) return {};

  const profile = fmp.profile || {};
  const quote = fmp.quote || {};
  const ratios = fmp.ratiosTtm || {};
  const keyMetrics = fmp.keyMetricsTtm || {};
  const income = fmp.incomeAnnual?.[0] || {};
  const priorIncome = fmp.incomeAnnual?.[1] || {};
  const income3 = fmp.incomeAnnual?.[3] || {};
  const income5 = fmp.incomeAnnual?.[5] || {};
  const balance = fmp.balanceAnnual?.[0] || {};
  const cashflow = fmp.cashflowAnnual?.[0] || {};
  const growth = fmp.growthAnnual?.[0] || {};
  const ev = fmp.enterpriseValues?.[0] || {};

  const marketCap = firstNumber(profile.mktCap, quote.marketCap, ev.marketCapitalization, safeNumber(fallbackProfile?.marketCapitalization) !== null ? fallbackProfile.marketCapitalization * 1_000_000 : null);
  const currentPrice = firstNumber(quote.price, fallbackQuote?.c);
  const sharesOutstanding = firstNumber(profile.sharesOutstanding, ev.numberOfShares, currentPrice ? marketCap / currentPrice : null);

  const revenue = firstNumber(income.revenue);
  const grossProfit = firstNumber(income.grossProfit);
  const operatingIncome = firstNumber(income.operatingIncome);
  const ebitda = firstNumber(income.ebitda);
  const ebit = firstNumber(income.ebit, operatingIncome);
  const pretaxIncome = firstNumber(income.incomeBeforeTax);
  const incomeTaxExpense = firstNumber(income.incomeTaxExpense);
  const interestExpense = Math.abs(firstNumber(income.interestExpense) || 0) || null;
  const netIncome = firstNumber(income.netIncome);
  const eps = firstNumber(income.epsdiluted, income.eps);

  const currentAssets = firstNumber(balance.totalCurrentAssets);
  const currentLiabilities = firstNumber(balance.totalCurrentLiabilities);
  const cash = firstNumber(balance.cashAndCashEquivalents, balance.cashAndShortTermInvestments);
  const totalDebt = firstNumber(balance.totalDebt, (safeNumber(balance.shortTermDebt) || 0) + (safeNumber(balance.longTermDebt) || 0) || null);
  const longTermDebt = firstNumber(balance.longTermDebt);
  const equity = firstNumber(balance.totalStockholdersEquity, balance.totalEquity);
  const assets = firstNumber(balance.totalAssets);

  const operatingCashFlow = firstNumber(cashflow.operatingCashFlow, cashflow.netCashProvidedByOperatingActivities);
  const capex = firstNumber(cashflow.capitalExpenditure, cashflow.capitalExpenditures);
  const freeCashFlow = firstNumber(cashflow.freeCashFlow, operatingCashFlow !== null && capex !== null ? operatingCashFlow - Math.abs(capex) : null);

  const enterpriseValue = firstNumber(ev.enterpriseValue, marketCap !== null && totalDebt !== null ? marketCap + totalDebt - (cash || 0) : null);

  return {
    source: "FMP",
    marketCap,
    marketCapM: marketCap !== null ? marketCap / 1_000_000 : null,
    currentPrice,
    sharesOutstanding,
    revenue,
    grossProfit,
    operatingIncome,
    ebit,
    ebitda,
    pretaxIncome,
    incomeTaxExpense,
    interestExpense,
    netIncome,
    eps,
    currentAssets,
    currentLiabilities,
    cash,
    totalDebt,
    longTermDebt,
    equity,
    assets,
    operatingCashFlow,
    capex,
    freeCashFlow,
    enterpriseValue,

    peRatio: firstNumber(ratios.priceEarningsRatioTTM, keyMetrics.peRatioTTM),
    forwardPe: null,
    pegRatio: firstNumber(ratios.priceEarningsToGrowthRatioTTM),
    priceToSales: firstNumber(ratios.priceToSalesRatioTTM, keyMetrics.priceToSalesRatioTTM),
    priceToBook: firstNumber(ratios.priceToBookRatioTTM, keyMetrics.pbRatioTTM),
    priceToCashFlow: firstNumber(ratios.priceCashFlowRatioTTM, keyMetrics.pocfratioTTM),
    priceToFreeCashFlow: firstNumber(ratios.priceToFreeCashFlowsRatioTTM, keyMetrics.pfcfRatioTTM),
    evToSales: firstNumber(keyMetrics.enterpriseValueMultipleTTM, enterpriseValue !== null && revenue ? enterpriseValue / revenue : null),
    evToEbitda: firstNumber(keyMetrics.enterpriseValueOverEBITDATTM, enterpriseValue !== null && ebitda ? enterpriseValue / ebitda : null),

    roe: firstNumber(toPercentValue(ratios.returnOnEquityTTM), toPercentValue(keyMetrics.roeTTM), divide(netIncome, equity) !== null ? divide(netIncome, equity) * 100 : null),
    roa: firstNumber(toPercentValue(ratios.returnOnAssetsTTM), toPercentValue(keyMetrics.roaTTM), divide(netIncome, assets) !== null ? divide(netIncome, assets) * 100 : null),
    roi: firstNumber(toPercentValue(ratios.returnOnCapitalEmployedTTM), toPercentValue(keyMetrics.roicTTM)),
    grossMargin: firstNumber(toPercentValue(ratios.grossProfitMarginTTM), divide(grossProfit, revenue) !== null ? divide(grossProfit, revenue) * 100 : null),
    operatingMargin: firstNumber(toPercentValue(ratios.operatingProfitMarginTTM), divide(operatingIncome, revenue) !== null ? divide(operatingIncome, revenue) * 100 : null),
    pretaxMargin: firstNumber(divide(pretaxIncome, revenue) !== null ? divide(pretaxIncome, revenue) * 100 : null),
    netMargin: firstNumber(toPercentValue(ratios.netProfitMarginTTM), divide(netIncome, revenue) !== null ? divide(netIncome, revenue) * 100 : null),

    revenueGrowth: firstNumber(toPercentValue(growth.revenueGrowth), percentGrowth(revenue, priorIncome.revenue)),
    revenueGrowth3Y: cagr(revenue, income3.revenue, 3),
    revenueGrowth5Y: cagr(revenue, income5.revenue, 5),
    epsGrowth: firstNumber(toPercentValue(growth.epsgrowth), percentGrowth(eps, priorIncome.epsdiluted || priorIncome.eps)),
    epsGrowth3Y: cagr(eps, income3.epsdiluted || income3.eps, 3),
    epsGrowth5Y: cagr(eps, income5.epsdiluted || income5.eps, 5),

    debtToEquity: firstNumber(ratios.debtEquityRatioTTM, divide(totalDebt, equity)),
    longTermDebtToEquity: divide(longTermDebt, equity),
    currentRatio: firstNumber(ratios.currentRatioTTM, divide(currentAssets, currentLiabilities)),
    quickRatio: firstNumber(ratios.quickRatioTTM),
    cashRatio: firstNumber(ratios.cashRatioTTM, divide(cash, currentLiabilities)),
    assetTurnover: firstNumber(ratios.assetTurnoverTTM, divide(revenue, assets)),
    dividendYield: firstNumber(toPercentValue(keyMetrics.dividendYieldTTM)),
  };
}

function calculateWaccAndDcf(inputs = {}, metrics = {}) {
  const marketCap = firstNumber(
    inputs.marketCap,
    inputs.marketCapM !== null && inputs.marketCapM !== undefined ? inputs.marketCapM * 1_000_000 : null
  );
  const totalDebt = firstNumber(inputs.totalDebt, 0);
  const cash = firstNumber(inputs.cash, 0);
  const interestExpense = absNumber(inputs.interestExpense);
  const pretaxIncome = safeNumber(inputs.pretaxIncome);
  const taxExpense = absNumber(inputs.incomeTaxExpense);
  const beta = firstNumber(metrics.beta, inputs.beta, 1.0);
  const freeCashFlow = safeNumber(inputs.freeCashFlow);
  const sharesOutstanding = safeNumber(inputs.sharesOutstanding);
  const revenueGrowth = firstNumber(metrics.revenueGrowth3Y, metrics.revenueGrowth5Y, metrics.revenueGrowth, 5);
  const currentPrice = safeNumber(inputs.currentPrice);

  const riskFreeRate = (safeNumber(process.env.RISK_FREE_RATE) ?? 4.5) / 100;
  const equityRiskPremium = (safeNumber(process.env.EQUITY_RISK_PREMIUM) ?? 5.5) / 100;
  const terminalGrowthRate = (safeNumber(process.env.TERMINAL_GROWTH_RATE) ?? 2.5) / 100;

  const normalizedBeta = Math.max(0.4, Math.min(2.8, Number(beta) || 1.0));
  const taxRate =
    pretaxIncome !== null && pretaxIncome > 0 && taxExpense !== null
      ? Math.max(0, Math.min(0.35, taxExpense / pretaxIncome))
      : 0.21;

  const costOfEquity = riskFreeRate + normalizedBeta * equityRiskPremium;

  const rawCostOfDebt =
    totalDebt && totalDebt > 0 && interestExpense !== null && interestExpense > 0
      ? interestExpense / totalDebt
      : null;

  const costOfDebt = rawCostOfDebt !== null ? Math.max(0.01, Math.min(0.18, rawCostOfDebt)) : 0.055;
  const equityValue = marketCap || 0;
  const debtValue = totalDebt || 0;
  const totalCapital = equityValue + debtValue;

  const wacc =
    totalCapital > 0
      ? (equityValue / totalCapital) * costOfEquity + (debtValue / totalCapital) * costOfDebt * (1 - taxRate)
      : null;

  if (
    wacc === null ||
    freeCashFlow === null ||
    freeCashFlow <= 0 ||
    sharesOutstanding === null ||
    sharesOutstanding <= 0 ||
    wacc <= terminalGrowthRate + 0.005
  ) {
    return {
      wacc: wacc !== null ? wacc * 100 : null,
      costOfEquity: costOfEquity * 100,
      afterTaxCostOfDebt: costOfDebt * (1 - taxRate) * 100,
      taxRate: taxRate * 100,
      intrinsicValue: null,
      dcfEnterpriseValue: null,
      intrinsicValueGap: null,
      source: "Calculated when enough FMP/Finnhub data exists",
    };
  }

  const cappedGrowth = Math.max(-0.02, Math.min(Math.min(0.12, wacc - terminalGrowthRate - 0.01), (revenueGrowth || 5) / 100));
  let projected = freeCashFlow;
  const projectedFcfs = [];

  for (let year = 1; year <= 5; year += 1) {
    projected *= 1 + cappedGrowth;
    projectedFcfs.push(projected);
  }

  const presentValueFcfs = projectedFcfs.reduce(
    (sum, fcf, index) => sum + fcf / Math.pow(1 + wacc, index + 1),
    0
  );

  const terminalValue = projectedFcfs[4] * (1 + terminalGrowthRate) / (wacc - terminalGrowthRate);
  const presentTerminalValue = terminalValue / Math.pow(1 + wacc, 5);
  const enterpriseValue = presentValueFcfs + presentTerminalValue;
  const equityValueFromDcf = enterpriseValue + (cash || 0) - (totalDebt || 0);
  const intrinsicValue = equityValueFromDcf / sharesOutstanding;
  const intrinsicValueGap =
    currentPrice !== null && currentPrice > 0 && intrinsicValue > 0
      ? ((intrinsicValue - currentPrice) / currentPrice) * 100
      : null;

  return {
    wacc: wacc * 100,
    costOfEquity: costOfEquity * 100,
    afterTaxCostOfDebt: costOfDebt * (1 - taxRate) * 100,
    taxRate: taxRate * 100,
    intrinsicValue,
    dcfEnterpriseValue: enterpriseValue,
    intrinsicValueGap,
    dcfGrowthRate: cappedGrowth * 100,
    terminalGrowthRate: terminalGrowthRate * 100,
    source: "Calculated from financial statements",
  };
}


export async function buildStockAnalysis(symbol) {
  const cleanSymbol = String(symbol || "").trim().toUpperCase();

  if (!cleanSymbol) {
    throw new Error("Missing ticker symbol.");
  }

  const [
    finnhubProfile,
    finnhubQuote,
    metricsRaw,
    annualFinancials,
    quarterlyFinancials,
    fmpBundle,
    massiveQuote,
    finnhubNews,
  ] = await Promise.all([
    fetchFinnhubOptional("/stock/profile2", { symbol: cleanSymbol }),
    fetchFinnhubOptional("/quote", { symbol: cleanSymbol }),
    fetchFinnhubOptional("/stock/metric", { symbol: cleanSymbol, metric: "all" }),
    fetchFinnhubOptional("/stock/financials-reported", { symbol: cleanSymbol, freq: "annual" }),
    fetchFinnhubOptional("/stock/financials-reported", { symbol: cleanSymbol, freq: "quarterly" }),
    fetchFmpBundle(cleanSymbol),
    fetchMassiveQuote(cleanSymbol),
    fetchFinnhubOptional("/company-news", {
      symbol: cleanSymbol,
      from: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString().slice(0, 10),
      to: new Date().toISOString().slice(0, 10),
    }),
  ]);

  const profile = {
    ...(finnhubProfile || {}),
    ...(fmpBundle?.profile
      ? {
          name: fmpBundle.profile.companyName || finnhubProfile?.name,
          ticker: fmpBundle.profile.symbol || finnhubProfile?.ticker || cleanSymbol,
          marketCapitalization:
            firstNumber(
              finnhubProfile?.marketCapitalization,
              safeNumber(fmpBundle.profile.mktCap) !== null ? fmpBundle.profile.mktCap / 1_000_000 : null
            ),
          finnhubIndustry: finnhubProfile?.finnhubIndustry || fmpBundle.profile.industry || fmpBundle.profile.sector,
          weburl: finnhubProfile?.weburl || fmpBundle.profile.website,
          logo: finnhubProfile?.logo || fmpBundle.profile.image,
        }
      : {}),
  };

  const quote = {
    ...(finnhubQuote || {}),
    ...(fmpBundle?.quote?.price ? { c: fmpBundle.quote.price, d: fmpBundle.quote.change, dp: fmpBundle.quote.changesPercentage } : {}),
    ...(massiveQuote || {}),
  };

  if (safeNumber(quote.c) === null && safeNumber(fmpBundle?.profile?.price) !== null) {
    quote.c = fmpBundle.profile.price;
  }

  if (!profile || (!profile.ticker && !profile.name)) {
    throw new Error(
      `No company profile found for ${cleanSymbol}. Check FINNHUB_API_KEY or FMP_API_KEY in Render.`
    );
  }

  if (!profile.ticker) {
    profile.ticker = cleanSymbol;
  }

  const rawMetricData = metricsRaw?.metric || {};
  const finnhubExtracted = buildExtractedMetrics(profile, quote, rawMetricData, annualFinancials, quarterlyFinancials);
  const fmpExtracted = fmpDerivedMetrics(fmpBundle, profile, quote);

  const extracted = {
    ...finnhubExtracted,
    ...Object.fromEntries(
      Object.entries(fmpExtracted).filter(([, value]) => value !== null && value !== undefined)
    ),
    beta: firstNumber(finnhubExtracted.beta, fmpBundle?.profile?.beta),
    dayChangePercent: firstNumber(quote?.dp, finnhubExtracted.dayChangePercent),
    priceReturn4Week: firstNumber(finnhubExtracted.priceReturn4Week),
    priceReturn13Week: firstNumber(finnhubExtracted.priceReturn13Week),
    priceReturn26Week: firstNumber(finnhubExtracted.priceReturn26Week),
    priceReturn52Week: firstNumber(finnhubExtracted.priceReturn52Week),
    weekHigh: firstNumber(finnhubExtracted.weekHigh, fmpBundle?.quote?.yearHigh),
    weekLow: firstNumber(finnhubExtracted.weekLow, fmpBundle?.quote?.yearLow),
  };

  extracted.pullbackFromHigh =
    extracted.currentPrice !== null && extracted.currentPrice !== undefined && extracted.weekHigh
      ? ((extracted.weekHigh - extracted.currentPrice) / extracted.weekHigh) * 100
      : extracted.pullbackFromHigh;

  extracted.distanceFrom52WeekLow =
    extracted.currentPrice !== null && extracted.currentPrice !== undefined && extracted.weekLow
      ? ((extracted.currentPrice - extracted.weekLow) / extracted.weekLow) * 100
      : extracted.distanceFrom52WeekLow;

  const valuationModel = calculateWaccAndDcf(extracted, extracted);
  const newsSentiment = await fetchOpenAiNewsSentiment(
    cleanSymbol,
    profile,
    Array.isArray(fmpBundle?.news) && fmpBundle.news.length ? fmpBundle.news : (Array.isArray(finnhubNews) ? finnhubNews : [])
  );

  const growthScore = scoreGrowth(extracted);
  const profitabilityScore = scoreProfitability(extracted);
  const healthScore = scoreFinancialHealth(extracted);
  const valuationScore = scoreValuation(extracted, growthScore, profitabilityScore);
  const momentumScore = scoreMomentum(extracted);
  const reversalScore = scorePullback(extracted);
  const newsSentimentScore = newsSentiment?.score ?? null;

  const edgeScore = availableWeightedAverage([
    { score: growthScore, weight: 0.216 },
    { score: profitabilityScore, weight: 0.207 },
    { score: healthScore, weight: 0.179 },
    { score: valuationScore, weight: 0.133 },
    { score: momentumScore, weight: 0.106 },
    { score: reversalScore, weight: 0.079 },
    { score: newsSentimentScore, weight: 0.08 },
  ], 6.0);

  const riskLabel = getRiskLabel(extracted, healthScore, profitabilityScore);

  return {
    symbol: cleanSymbol,
    profile,
    quote,

    companyDescription: `${profile.name || cleanSymbol} is a publicly traded company in the ${
      profile.finnhubIndustry || "market"
    } industry.`,

    evaluationSummary: `${cleanSymbol} has an Eval Score of ${edgeScore.toFixed(
      1
    )} out of 10. The score blends growth, profitability, financial health, valuation, momentum, pullback opportunity, and news sentiment using available quote, basic-financial, and reported financial-statement data.`,

    metrics: {
      peRatio: metric(extracted.peRatio, "", "Finnhub", "Price / Earnings"),
      forwardPe: metric(extracted.forwardPe, "", "Finnhub", "Forward Price / Earnings"),
      pegRatio: metric(extracted.pegRatio, "", "Finnhub", "P/E adjusted by expected growth"),
      priceToSales: metric(extracted.priceToSales, "", extracted.priceToSales !== null ? "Calculated" : "Finnhub", "Market Cap / Revenue"),
      priceToBook: metric(extracted.priceToBook, "", extracted.priceToBook !== null ? "Calculated" : "Finnhub", "Market Cap / Shareholders' Equity"),
      priceToCashFlow: metric(extracted.priceToCashFlow, "", extracted.priceToCashFlow !== null ? "Calculated" : "Finnhub", "Market Cap / Operating Cash Flow"),
      priceToFreeCashFlow: metric(extracted.priceToFreeCashFlow, "", extracted.priceToFreeCashFlow !== null ? "Calculated" : "Finnhub", "Market Cap / Free Cash Flow"),
      enterpriseValue: metric(toMillions(extracted.enterpriseValue), "M", extracted.enterpriseValue !== null ? "Calculated" : "Finnhub", "Market Cap + Total Debt - Cash, shown in millions"),
      ebitda: metric(toMillions(extracted.ebitda), "M", firstNumber(fmpExtracted.ebitda) !== null ? "FMP" : "Calculated", "EBITDA shown in millions"),
      evToEbitda: metric(extracted.evToEbitda, "", firstNumber(fmpExtracted.evToEbitda) !== null ? "FMP" : "Calculated", "Enterprise Value / EBITDA"),
      dividendYield: metric(extracted.dividendYield, "%", "Finnhub/FMP", "Annual dividend yield"),

      roe: metric(extracted.roe, "%", extracted.roe !== null ? "Calculated" : "Finnhub", "Net Income / Shareholder Equity"),
      roa: metric(extracted.roa, "%", extracted.roa !== null ? "Calculated" : "Finnhub", "Net Income / Assets"),
      roi: metric(extracted.roi, "%", extracted.roi !== null ? "Calculated" : "Finnhub", "Operating Income / Invested Capital"),
      grossMargin: metric(extracted.grossMargin, "%", extracted.grossMargin !== null ? "Calculated" : "Finnhub", "Gross Profit / Revenue"),
      operatingMargin: metric(extracted.operatingMargin, "%", extracted.operatingMargin !== null ? "Calculated" : "Finnhub", "Operating Income / Revenue"),
      pretaxMargin: metric(extracted.pretaxMargin, "%", extracted.pretaxMargin !== null ? "Calculated" : "Finnhub", "Pretax Income / Revenue"),
      netMargin: metric(extracted.netMargin, "%", extracted.netMargin !== null ? "Calculated" : "Finnhub", "Net Income / Revenue"),

      revenueGrowth: metric(extracted.revenueGrowth, "%", extracted.revenueGrowth !== null ? "Calculated" : "Finnhub", "Annual revenue growth"),
      revenueGrowthQuarterly: metric(extracted.revenueGrowthQuarterly, "%", extracted.revenueGrowthQuarterly !== null ? "Calculated" : "Finnhub", "Quarterly revenue growth year over year"),
      revenueGrowth3Y: metric(extracted.revenueGrowth3Y, "%", extracted.revenueGrowth3Y !== null ? "Calculated" : "Finnhub", "3-year revenue CAGR"),
      revenueGrowth5Y: metric(extracted.revenueGrowth5Y, "%", extracted.revenueGrowth5Y !== null ? "Calculated" : "Finnhub", "5-year revenue CAGR"),
      epsGrowth: metric(extracted.epsGrowth, "%", extracted.epsGrowth !== null ? "Calculated" : "Finnhub", "Annual diluted EPS growth"),
      epsGrowth3Y: metric(extracted.epsGrowth3Y, "%", extracted.epsGrowth3Y !== null ? "Calculated" : "Finnhub", "3-year EPS CAGR"),
      epsGrowth5Y: metric(extracted.epsGrowth5Y, "%", extracted.epsGrowth5Y !== null ? "Calculated" : "Finnhub", "5-year EPS CAGR"),

      debtToEquity: metric(extracted.debtToEquity, "", extracted.debtToEquity !== null ? "Calculated" : "Finnhub", "Total Debt / Total Equity"),
      longTermDebtToEquity: metric(extracted.longTermDebtToEquity, "", extracted.longTermDebtToEquity !== null ? "Calculated" : "Finnhub", "Long-Term Debt / Equity"),
      currentRatio: metric(extracted.currentRatio, "", extracted.currentRatio !== null ? "Calculated" : "Finnhub", "Current Assets / Current Liabilities"),
      quickRatio: metric(extracted.quickRatio, "", extracted.quickRatio !== null ? "Calculated" : "Finnhub", "Quick Assets / Current Liabilities"),
      cashRatio: metric(extracted.cashRatio, "", extracted.cashRatio !== null ? "Calculated" : "Finnhub", "Cash / Current Liabilities"),
      assetTurnover: metric(extracted.assetTurnover, "", extracted.assetTurnover !== null ? "Calculated" : "Finnhub", "Revenue / Assets"),

      operatingCashFlow: metric(extracted.operatingCashFlow, "", "Calculated", "Cash flow from operations"),
      freeCashFlow: metric(extracted.freeCashFlow, "", "Calculated", "Operating Cash Flow - Capital Expenditures"),
      beta: metric(extracted.beta, "", "Finnhub", "Volatility compared with market"),
      dayChangePercent: metric(extracted.dayChangePercent, "%", "Finnhub", "Current day price move"),
      priceReturn4Week: metric(extracted.priceReturn4Week, "%", "Finnhub", "4-week price return"),
      priceReturn13Week: metric(extracted.priceReturn13Week, "%", "Finnhub", "13-week price return"),
      priceReturn26Week: metric(extracted.priceReturn26Week, "%", "Finnhub", "26-week price return"),
      priceReturn52Week: metric(extracted.priceReturn52Week, "%", "Finnhub", "52-week price return"),
      weekHigh: metric(extracted.weekHigh, "", "Finnhub", "52-week high price"),
      weekLow: metric(extracted.weekLow, "", "Finnhub", "52-week low price"),
      pullbackFromHigh: metric(extracted.pullbackFromHigh, "%", "Calculated", "Distance below 52-week high"),
      distanceFrom52WeekLow: metric(extracted.distanceFrom52WeekLow, "%", "Calculated", "Distance above 52-week low"),

      wacc: metric(valuationModel.wacc, "%", valuationModel.source, "WACC = (Equity weight × cost of equity) + (Debt weight × after-tax cost of debt)"),
      costOfEquity: metric(valuationModel.costOfEquity, "%", valuationModel.source, "Risk-free rate + beta × equity risk premium"),
      afterTaxCostOfDebt: metric(valuationModel.afterTaxCostOfDebt, "%", valuationModel.source, "Cost of debt × (1 - tax rate)"),
      taxRate: metric(valuationModel.taxRate, "%", valuationModel.source, "Income tax expense / pretax income"),
      dcfEnterpriseValue: metric(toMillions(valuationModel.dcfEnterpriseValue), "M", valuationModel.source, "Present value of projected FCF + terminal value"),
      intrinsicValue: metric(valuationModel.intrinsicValue, "", valuationModel.source, "DCF equity value / shares outstanding"),
      intrinsicValueGap: metric(valuationModel.intrinsicValueGap, "%", valuationModel.source, "(Intrinsic Value - Current Price) / Current Price"),
      dcfGrowthRate: metric(valuationModel.dcfGrowthRate, "%", valuationModel.source, "Capped projected FCF growth rate used in DCF"),
      newsSentiment: metric(newsSentimentScore, "", newsSentiment?.source || "OpenAI + recent news", "AI score from recent company news headlines/snippets"),
      marketCapM: metric(extracted.marketCapM, "M", firstNumber(fmpExtracted.marketCapM) !== null ? "FMP" : "Finnhub", "Market capitalization in millions"),
    },

    newsSentiment: newsSentiment || {
      score: null,
      label: "Unavailable",
      summary: "Recent news sentiment was not available. Add OPENAI_API_KEY plus FMP_API_KEY or FINNHUB_API_KEY news access. This does not affect the Eval Score.",
      articleCount: 0,
    },

    grades: {
      edgeScore: Number(edgeScore.toFixed(1)),
      riskLabel,
      categories: {
        growth: growthScore,
        profitability: profitabilityScore,
        financialHealth: healthScore,
        valuation: valuationScore,
        momentum: momentumScore,
        reversal: reversalScore,
        newsSentiment: newsSentimentScore,
      },
      context: {
        marketCapM: extracted.marketCapM,
        wacc: valuationModel.wacc,
        intrinsicValue: valuationModel.intrinsicValue,
        intrinsicValueGap: valuationModel.intrinsicValueGap,
        newsSentiment: newsSentiment,
      },
    },
  };
}
