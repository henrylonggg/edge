const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function scoreMetric(value, goodLow, goodHigh, reverse = false) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 5;
  }

  const n = Number(value);

  let score;

  if (reverse) {
    score = 10 - ((n - goodLow) / (goodHigh - goodLow)) * 10;
  } else {
    score = ((n - goodLow) / (goodHigh - goodLow)) * 10;
  }

  return Number(clamp(score, 1, 10).toFixed(1));
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

function getRiskLabel(beta, debtToEquity) {
  const b = safeNumber(beta) ?? 1;
  const d = safeNumber(debtToEquity) ?? 0;

  if (b >= 1.6 || d >= 2.5) return "High";
  if (b >= 1.2 || d >= 1.2) return "Medium";
  return "Low";
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

  const m = metricsRaw?.metric || {};

  const peRatio = safeNumber(m.peNormalizedAnnual || m.peTTM || m.peBasicExclExtraTTM);
  const roe = safeNumber(m.roeTTM || m.roeRfy);
  const debtToEquity = safeNumber(m["totalDebt/totalEquityAnnual"] || m["totalDebt/totalEquityQuarterly"]);
  const netMargin = safeNumber(m.netProfitMarginTTM || m.netProfitMarginAnnual);
  const revenueGrowth = safeNumber(m.revenueGrowthTTMYoy || m.revenueGrowthQuarterlyYoy);
  const beta = safeNumber(m.beta);

  const growthScore = scoreMetric(revenueGrowth, -10, 30);
  const profitabilityScore = scoreMetric(roe, 0, 35);
  const healthScore = scoreMetric(debtToEquity, 0, 2.5, true);
  const valuationScore = scoreMetric(peRatio, 5, 45, true);
  const momentumScore = scoreMetric(safeNumber(quote.dp), -5, 5);
  const reversalScore = scoreMetric(safeNumber(quote.dp), -10, 10, true);

  const edgeScore =
    growthScore * 0.22 +
    profitabilityScore * 0.22 +
    healthScore * 0.18 +
    valuationScore * 0.18 +
    momentumScore * 0.12 +
    reversalScore * 0.08;

  const riskLabel = getRiskLabel(beta, debtToEquity);

  return {
    symbol: cleanSymbol,
    profile,
    quote,
    companyDescription:
      `${profile.name || cleanSymbol} is a publicly traded company in the ${profile.finnhubIndustry || "market"} industry.`,

    evaluationSummary:
      `${cleanSymbol} has an Edge Score of ${edgeScore.toFixed(1)} out of 10. The score combines growth, profitability, financial health, valuation, momentum, and pullback/reversal factors. Risk is currently labeled as ${riskLabel}.`,

    metrics: {
      peRatio: metric(peRatio, "", "Finnhub", "Price / Earnings"),
      roe: metric(roe, "%", "Finnhub", "Net Income / Shareholder Equity"),
      debtToEquity: metric(debtToEquity, "", "Finnhub", "Total Debt / Total Equity"),
      netMargin: metric(netMargin, "%", "Finnhub", "Net Income / Revenue"),
      revenueGrowth: metric(revenueGrowth, "%", "Finnhub", "Revenue growth year over year"),
      beta: metric(beta, "", "Finnhub", "Volatility compared with market"),
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
        marketCapM: safeNumber(profile.marketCapitalization),
      },
    },
  };
}
