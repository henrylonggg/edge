const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

function clamp(value, min = 0, max = 10) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function safeNumber(value) {
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

function pickMetric(metrics, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(metrics, key)) {
      const value = safeNumber(metrics[key]);
      if (value !== null) return value;
    }
  }
  return null;
}

function availableWeightedAverage(items, fallback = 5.8) {
  const used = items.filter((item) => item.score !== null && item.score !== undefined && Number.isFinite(Number(item.score)));
  if (!used.length) return fallback;

  const totalWeight = used.reduce((sum, item) => sum + (item.weight || 1), 0);
  if (!totalWeight) return fallback;

  const total = used.reduce((sum, item) => sum + Number(item.score) * (item.weight || 1), 0);
  return Number(clamp(total / totalWeight).toFixed(1));
}

function highIsGood(value, poor, excellent) {
  const n = safeNumber(value);
  if (n === null) return null;
  if (excellent === poor) return 5.8;
  const score = ((n - poor) / (excellent - poor)) * 10;
  return Number(clamp(score, 1.5, 10).toFixed(1));
}

function lowIsGood(value, excellent, poor) {
  const n = safeNumber(value);
  if (n === null) return null;
  if (poor === excellent) return 5.8;
  const score = 10 - ((n - excellent) / (poor - excellent)) * 10;
  return Number(clamp(score, 1.5, 10).toFixed(1));
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

function scoreGrowth(metrics) {
  return availableWeightedAverage([
    { score: highIsGood(metrics.revenueGrowth, -8, 30), weight: 1.45 },
    { score: highIsGood(metrics.revenueGrowthQuarterly, -8, 25), weight: 1.05 },
    { score: highIsGood(metrics.revenueGrowth3Y, -5, 22), weight: 0.9 },
    { score: highIsGood(metrics.revenueGrowth5Y, -3, 18), weight: 0.75 },
    { score: highIsGood(metrics.epsGrowth, -12, 30), weight: 1.35 },
    { score: highIsGood(metrics.epsGrowth3Y, -8, 22), weight: 0.8 },
    { score: highIsGood(metrics.epsGrowth5Y, -5, 18), weight: 0.65 },
  ]);
}

function scoreProfitability(metrics) {
  return availableWeightedAverage([
    { score: highIsGood(metrics.roe, 0, 35), weight: 1.35 },
    { score: highIsGood(metrics.roa, 0, 18), weight: 0.85 },
    { score: highIsGood(metrics.roi, 0, 22), weight: 0.75 },
    { score: highIsGood(metrics.netMargin, 0, 28), weight: 1.15 },
    { score: highIsGood(metrics.operatingMargin, 0, 30), weight: 1.0 },
    { score: highIsGood(metrics.grossMargin, 15, 65), weight: 0.55 },
    { score: highIsGood(metrics.pretaxMargin, 0, 28), weight: 0.55 },
  ]);
}

function scoreFinancialHealth(metrics) {
  return availableWeightedAverage([
    { score: lowIsGood(metrics.debtToEquity, 0.2, 4.0), weight: 1.35 },
    { score: lowIsGood(metrics.longTermDebtToEquity, 0.15, 3.0), weight: 0.75 },
    { score: rangeSweetSpot(metrics.currentRatio, 1.4, 3.5, 0.55, 7.0), weight: 0.95 },
    { score: rangeSweetSpot(metrics.quickRatio, 1.0, 2.8, 0.35, 6.0), weight: 0.75 },
    { score: rangeSweetSpot(metrics.cashRatio, 0.25, 2.0, 0.02, 5.0), weight: 0.45 },
    { score: highIsGood(metrics.assetTurnover, 0.1, 1.2), weight: 0.3 },
    { score: highIsGood(metrics.marketCapM, 5_000, 750_000), weight: 0.45 },
  ]);
}

function scoreValuation(metrics, growthScore, profitabilityScore) {
  const raw = availableWeightedAverage([
    { score: lowIsGood(metrics.peRatio, 10, 75), weight: 1.2 },
    { score: lowIsGood(metrics.forwardPe, 10, 60), weight: 0.75 },
    { score: lowIsGood(metrics.priceToSales, 1.0, 18), weight: 0.75 },
    { score: lowIsGood(metrics.priceToBook, 1.0, 14), weight: 0.55 },
    { score: lowIsGood(metrics.priceToCashFlow, 8, 55), weight: 0.55 },
    { score: lowIsGood(metrics.priceToFreeCashFlow, 10, 70), weight: 0.55 },
    { score: lowIsGood(metrics.evToEbitda, 8, 45), weight: 0.7 },
    { score: lowIsGood(metrics.pegRatio, 0.7, 3.5), weight: 0.65 },
    { score: highIsGood(metrics.dividendYield, 0, 4.5), weight: 0.2 },
  ], 5.9);

  // Better companies can deserve richer multiples, but valuation still matters.
  const qualityAdjustment =
    (growthScore >= 7.7 ? 0.45 : growthScore >= 6.8 ? 0.25 : 0) +
    (profitabilityScore >= 7.7 ? 0.45 : profitabilityScore >= 6.8 ? 0.25 : 0);

  return Number(clamp(raw + qualityAdjustment, 2.5, 10).toFixed(1));
}

function scoreMomentum(metrics) {
  const betaPenalty = metrics.beta !== null && metrics.beta > 1.8 ? -0.35 : 0;

  const raw = availableWeightedAverage([
    { score: highIsGood(metrics.dayChangePercent, -4, 5), weight: 0.55 },
    { score: highIsGood(metrics.priceReturn4Week, -8, 14), weight: 0.85 },
    { score: highIsGood(metrics.priceReturn13Week, -12, 24), weight: 1.0 },
    { score: highIsGood(metrics.priceReturn26Week, -18, 35), weight: 0.9 },
    { score: highIsGood(metrics.priceReturn52Week, -25, 55), weight: 0.75 },
    { score: highIsGood(metrics.distanceFrom52WeekLow, 0, 80), weight: 0.35 },
  ]);

  return Number(clamp(raw + betaPenalty).toFixed(1));
}

function scorePullback(metrics) {
  return availableWeightedAverage([
    { score: highIsGood(metrics.pullbackFromHigh, 0, 35), weight: 1.15 },
    { score: lowIsGood(metrics.priceReturn4Week, -10, 18), weight: 0.55 },
    { score: lowIsGood(metrics.priceReturn13Week, -15, 28), weight: 0.45 },
    { score: rangeSweetSpot(metrics.distanceFrom52WeekLow, 18, 75, 0, 180), weight: 0.35 },
    { score: lowIsGood(metrics.dayChangePercent, -4, 5), weight: 0.25 },
  ], 6.0);
}

function getRiskLabel(metrics, financialHealthScore, profitabilityScore) {
  let riskPoints = 0;

  if (metrics.beta !== null) {
    if (metrics.beta >= 2.3) riskPoints += 4;
    else if (metrics.beta >= 1.8) riskPoints += 3;
    else if (metrics.beta >= 1.25) riskPoints += 2;
    else if (metrics.beta <= 0.65) riskPoints -= 1;
  }

  if (metrics.debtToEquity !== null) {
    if (metrics.debtToEquity >= 5) riskPoints += 4;
    else if (metrics.debtToEquity >= 3) riskPoints += 3;
    else if (metrics.debtToEquity >= 1.5) riskPoints += 2;
    else if (metrics.debtToEquity <= 0.5) riskPoints -= 1;
  }

  if (metrics.currentRatio !== null) {
    if (metrics.currentRatio < 0.75) riskPoints += 2;
    else if (metrics.currentRatio >= 1.5) riskPoints -= 1;
  }

  if (metrics.marketCapM !== null) {
    if (metrics.marketCapM < 2_000) riskPoints += 2;
    else if (metrics.marketCapM >= 200_000) riskPoints -= 1;
  }

  if (financialHealthScore <= 4.5) riskPoints += 2;
  if (profitabilityScore <= 4.5) riskPoints += 1;

  if (riskPoints >= 7) return "Very High";
  if (riskPoints >= 5) return "High";
  if (riskPoints >= 3) return "Medium";
  if (riskPoints <= -2) return "Very Low";
  return "Low";
}

function buildExtractedMetrics(profile, quote, m) {
  const currentPrice = safeNumber(quote?.c);
  const weekHigh = pickMetric(m, ["52WeekHigh", "52WeekHighAdjusted"]);
  const weekLow = pickMetric(m, ["52WeekLow", "52WeekLowAdjusted"]);

  const pullbackFromHigh =
    currentPrice !== null && weekHigh !== null && weekHigh > 0
      ? ((weekHigh - currentPrice) / weekHigh) * 100
      : null;

  const distanceFrom52WeekLow =
    currentPrice !== null && weekLow !== null && weekLow > 0
      ? ((currentPrice - weekLow) / weekLow) * 100
      : null;

  return {
    peRatio: pickMetric(m, ["peNormalizedAnnual", "peTTM", "peBasicExclExtraTTM", "peInclExtraTTM"]),
    forwardPe: pickMetric(m, ["forwardPE", "peForward", "forwardPeAnnual"]),
    pegRatio: pickMetric(m, ["pegRatio", "pegTTM", "pegAnnual"]),
    priceToSales: pickMetric(m, ["psTTM", "psAnnual", "priceToSalesTTM"]),
    priceToBook: pickMetric(m, ["pbQuarterly", "pbAnnual", "priceToBookAnnual"]),
    priceToCashFlow: pickMetric(m, ["pcfShareTTM", "pcfShareAnnual", "priceToCashFlowTTM"]),
    priceToFreeCashFlow: pickMetric(m, ["pfcfShareTTM", "pfcfShareAnnual", "priceToFreeCashFlowTTM"]),
    evToEbitda: pickMetric(m, ["evToEbitda", "ev/ebitda", "enterpriseValueOverEBITDA"]),
    dividendYield: pickMetric(m, ["dividendYieldIndicatedAnnual", "currentDividendYieldTTM", "dividendYield5Y"]),

    roe: pickMetric(m, ["roeTTM", "roeRfy", "roeAnnual"]),
    roa: pickMetric(m, ["roaTTM", "roaRfy", "roaAnnual"]),
    roi: pickMetric(m, ["roiTTM", "roiAnnual", "roicTTM", "roicAnnual"]),
    grossMargin: pickMetric(m, ["grossMarginTTM", "grossMarginAnnual"]),
    operatingMargin: pickMetric(m, ["operatingMarginTTM", "operatingMarginAnnual"]),
    pretaxMargin: pickMetric(m, ["pretaxMarginTTM", "pretaxMarginAnnual"]),
    netMargin: pickMetric(m, ["netProfitMarginTTM", "netProfitMarginAnnual"]),

    revenueGrowth: pickMetric(m, ["revenueGrowthTTMYoy", "revenueGrowthYOY", "revenueGrowthAnnualYoy"]),
    revenueGrowthQuarterly: pickMetric(m, ["revenueGrowthQuarterlyYoy", "revenueGrowthQuarterly"]),
    revenueGrowth3Y: pickMetric(m, ["revenueGrowth3Y", "revenueGrowth3YCAGR"]),
    revenueGrowth5Y: pickMetric(m, ["revenueGrowth5Y", "revenueGrowth5YCAGR"]),
    epsGrowth: pickMetric(m, ["epsGrowthTTMYoy", "epsGrowthYOY", "epsGrowthAnnualYoy"]),
    epsGrowth3Y: pickMetric(m, ["epsGrowth3Y", "epsGrowth3YCAGR"]),
    epsGrowth5Y: pickMetric(m, ["epsGrowth5Y", "epsGrowth5YCAGR"]),

    debtToEquity: pickMetric(m, ["totalDebt/totalEquityAnnual", "totalDebt/totalEquityQuarterly"]),
    longTermDebtToEquity: pickMetric(m, ["longTermDebt/equityAnnual", "longTermDebt/equityQuarterly"]),
    currentRatio: pickMetric(m, ["currentRatioAnnual", "currentRatioQuarterly"]),
    quickRatio: pickMetric(m, ["quickRatioAnnual", "quickRatioQuarterly"]),
    cashRatio: pickMetric(m, ["cashRatioAnnual", "cashRatioQuarterly"]),
    assetTurnover: pickMetric(m, ["assetTurnoverAnnual", "assetTurnoverTTM"]),

    beta: pickMetric(m, ["beta"]),
    dayChangePercent: safeNumber(quote?.dp),
    priceReturn4Week: pickMetric(m, ["4WeekPriceReturnDaily", "monthToDatePriceReturnDaily"]),
    priceReturn13Week: pickMetric(m, ["13WeekPriceReturnDaily"]),
    priceReturn26Week: pickMetric(m, ["26WeekPriceReturnDaily"]),
    priceReturn52Week: pickMetric(m, ["52WeekPriceReturnDaily"]),
    weekHigh,
    weekLow,
    pullbackFromHigh,
    distanceFrom52WeekLow,

    marketCapM: safeNumber(profile?.marketCapitalization),
  };
}

export async function buildStockAnalysis(symbol) {
  const cleanSymbol = String(symbol || "").trim().toUpperCase();

  if (!cleanSymbol) {
    throw new Error("Missing ticker symbol.");
  }

  const [profile, quote, metricsRaw] = await Promise.all([
    fetchFinnhub("/stock/profile2", { symbol: cleanSymbol }),
    fetchFinnhub("/quote", { symbol: cleanSymbol }),
    fetchFinnhub("/stock/metric", { symbol: cleanSymbol, metric: "all" }),
  ]);

  if (!profile || !profile.ticker) {
    throw new Error(`No company profile found for ${cleanSymbol}.`);
  }

  const rawMetricData = metricsRaw?.metric || {};
  const extracted = buildExtractedMetrics(profile, quote, rawMetricData);

  const growthScore = scoreGrowth(extracted);
  const profitabilityScore = scoreProfitability(extracted);
  const healthScore = scoreFinancialHealth(extracted);
  const valuationScore = scoreValuation(extracted, growthScore, profitabilityScore);
  const momentumScore = scoreMomentum(extracted);
  const reversalScore = scorePullback(extracted);

  const edgeScore = availableWeightedAverage([
    { score: growthScore, weight: 0.235 },
    { score: profitabilityScore, weight: 0.225 },
    { score: healthScore, weight: 0.195 },
    { score: valuationScore, weight: 0.145 },
    { score: momentumScore, weight: 0.115 },
    { score: reversalScore, weight: 0.085 },
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
    )} out of 10. The score blends growth, profitability, financial health, valuation, momentum, and pullback opportunity. Missing Finnhub fields are excluded from the weighting rather than treated as bad data.`,

    metrics: {
      peRatio: metric(extracted.peRatio, "", "Finnhub", "Price / Earnings"),
      forwardPe: metric(extracted.forwardPe, "", "Finnhub", "Forward Price / Earnings"),
      pegRatio: metric(extracted.pegRatio, "", "Finnhub", "P/E adjusted by expected growth"),
      priceToSales: metric(extracted.priceToSales, "", "Finnhub", "Market value / Sales"),
      priceToBook: metric(extracted.priceToBook, "", "Finnhub", "Market value / Book value"),
      priceToCashFlow: metric(extracted.priceToCashFlow, "", "Finnhub", "Price / Cash Flow"),
      priceToFreeCashFlow: metric(extracted.priceToFreeCashFlow, "", "Finnhub", "Price / Free Cash Flow"),
      evToEbitda: metric(extracted.evToEbitda, "", "Finnhub", "Enterprise Value / EBITDA"),
      dividendYield: metric(extracted.dividendYield, "%", "Finnhub", "Annual dividend yield"),

      roe: metric(extracted.roe, "%", "Finnhub", "Net Income / Shareholder Equity"),
      roa: metric(extracted.roa, "%", "Finnhub", "Net Income / Assets"),
      roi: metric(extracted.roi, "%", "Finnhub", "Return on investment / capital efficiency"),
      grossMargin: metric(extracted.grossMargin, "%", "Finnhub", "Gross Profit / Revenue"),
      operatingMargin: metric(extracted.operatingMargin, "%", "Finnhub", "Operating Income / Revenue"),
      pretaxMargin: metric(extracted.pretaxMargin, "%", "Finnhub", "Pretax Income / Revenue"),
      netMargin: metric(extracted.netMargin, "%", "Finnhub", "Net Income / Revenue"),

      revenueGrowth: metric(extracted.revenueGrowth, "%", "Finnhub", "Revenue growth year over year"),
      revenueGrowthQuarterly: metric(extracted.revenueGrowthQuarterly, "%", "Finnhub", "Quarterly revenue growth year over year"),
      revenueGrowth3Y: metric(extracted.revenueGrowth3Y, "%", "Finnhub", "3-year revenue growth"),
      revenueGrowth5Y: metric(extracted.revenueGrowth5Y, "%", "Finnhub", "5-year revenue growth"),
      epsGrowth: metric(extracted.epsGrowth, "%", "Finnhub", "EPS growth year over year"),
      epsGrowth3Y: metric(extracted.epsGrowth3Y, "%", "Finnhub", "3-year EPS growth"),
      epsGrowth5Y: metric(extracted.epsGrowth5Y, "%", "Finnhub", "5-year EPS growth"),

      debtToEquity: metric(extracted.debtToEquity, "", "Finnhub", "Total Debt / Total Equity"),
      longTermDebtToEquity: metric(extracted.longTermDebtToEquity, "", "Finnhub", "Long-Term Debt / Equity"),
      currentRatio: metric(extracted.currentRatio, "", "Finnhub", "Current Assets / Current Liabilities"),
      quickRatio: metric(extracted.quickRatio, "", "Finnhub", "Liquid Assets / Current Liabilities"),
      cashRatio: metric(extracted.cashRatio, "", "Finnhub", "Cash / Current Liabilities"),
      assetTurnover: metric(extracted.assetTurnover, "", "Finnhub", "Revenue / Assets"),

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

      marketCapM: metric(extracted.marketCapM, "M", "Finnhub", "Market capitalization in millions"),
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
      },
      context: {
        marketCapM: extracted.marketCapM,
      },
    },
  };
}
