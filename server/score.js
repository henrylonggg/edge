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

function scoreGrowth(revenueGrowth) {
  const g = safeNumber(revenueGrowth);

  if (g === null) return 5.9;
  if (g >= 40) return 9.5;
  if (g >= 25) return 8.8;
  if (g >= 15) return 7.6;
  if (g >= 8) return 6.1;
  if (g >= 3) return 5.4;
  if (g >= 0) return 4.7;
  if (g >= -2.5) return 4.1;
  if (g >= -5) return 3.8;
  return 3.2;
}

function scoreProfitability(roe, netMargin) {
  const r = safeNumber(roe);
  const m = safeNumber(netMargin);

  let roeScore = 6;
  let marginScore = 6;

  if (r !== null) {
    if (r >= 60) roeScore = 9.5;
    else if (r >= 35) roeScore = 9;
    else if (r >= 27.5) roeScore = 8.5;
    else if (r >= 20) roeScore = 8;
    else if (r >= 16) roeScore = 7.5;
    else if (r >= 12) roeScore = 7;
    else if (r >= 8.5) roeScore = 6.5;
    else if (r >= 5) roeScore = 6;
    else if (r >= 2.5) roeScore = 5.5;
    else if (r >= 0) roeScore = 5;
    else roeScore = 3.3;
  }

  if (m !== null) {
    if (m >= 35) marginScore = 9.5;
    else if (m >= 25) marginScore = 9.1;
    else if (m >= 15) marginScore = 8.3;
    else if (m >= 11.5) marginScore = 7.7;
    else if (m >= 8) marginScore = 7.1;
    else if (m >= 5) marginScore = 6.3;
    else if (m >= 3) marginScore = 5.5;
    else if (m >= 0) marginScore = 4.8;
    else marginScore = 3.3;
  }

  return Number(((roeScore * 0.55) + (marginScore * 0.45)).toFixed(1));
}

function scoreFinancialHealth(debtToEquity, marketCapM) {
  const d = safeNumber(debtToEquity);
  const cap = safeNumber(marketCapM);

  let debtScore = 7;

  if (d !== null) {
    if (d <= 0.3) debtScore = 10;
    else if (d <= 0.7) debtScore = 9.1;
    else if (d <= 1.2) debtScore = 8.2;
    else if (d <= 2.0) debtScore = 6.4;
    else if (d <= 3.0) debtScore = 4.3;
    else debtScore = 2.2;
  }

  let sizeBonus = 0;

  if (cap !== null) {
    if (cap >= 500000) sizeBonus = 0.75;
    else if (cap >= 100000) sizeBonus = 0.45;
    else if (cap >= 10000) sizeBonus = 0.175;
  }

  return Number(clamp(debtScore + sizeBonus).toFixed(1));
}

function scoreValuation(peRatio, revenueGrowth, roe, netMargin) {
  const pe = safeNumber(peRatio);
  const g = safeNumber(revenueGrowth);
  const r = safeNumber(roe);
  const m = safeNumber(netMargin);

  if (pe === null || pe <= 0) return 6;

  let score;

  if (pe <= 12) score = 9.5;
  else if (pe <= 18) score = 8.5;
  else if (pe <= 25) score = 7.5;
  else if (pe <= 35) score = 6.5;
  else if (pe <= 50) score = 5.5;
  else if (pe <= 75) score = 4.5;
  else score = 3.5;

  // Premium companies deserve a valuation cushion if quality/growth is strong.
  if (g !== null && g >= 20) score += 1.2;
  else if (g !== null && g >= 10) score += 0.7;

  if (r !== null && r >= 25) score += 0.7;
  if (m !== null && m >= 20) score += 0.5;

  // Keep valuation from destroying great companies completely.
  return Number(clamp(score, 3, 10).toFixed(1));
}

function scoreMomentum(dayChangePercent, beta) {
  const dp = safeNumber(dayChangePercent);
  const b = safeNumber(beta);

  let score = 6;

  if (dp !== null) {
    if (dp >= 4) score = 9;
    else if (dp >= 2) score = 8;
    else if (dp >= 0.5) score = 7;
    else if (dp >= -0.5) score = 6;
    else if (dp >= -2) score = 5;
    else if (dp >= -4) score = 4;
    else score = 3;
  }

  // Very high beta adds risk, so slight penalty.
  if (b !== null && b > 1.8) score -= 0.5;

  return Number(clamp(score).toFixed(1));
}

function scorePullback(dayChangePercent) {
  const dp = safeNumber(dayChangePercent);

  if (dp === null) return 6;

  // Pullback score means "buy-the-dip opportunity," not overall quality.
  if (dp <= -5) return 8.5;
  if (dp <= -3) return 8;
  if (dp <= -1.5) return 7;
  if (dp <= 0) return 6.5;
  if (dp <= 2) return 6;
  if (dp <= 5) return 5;
  return 4;
}

function getRiskLabel(beta, debtToEquity) {
  const b = safeNumber(beta) ?? 1;
  const d = safeNumber(debtToEquity) ?? 0;

  if (b >= 1.8 || d >= 3) return "High";
  if (b >= 1.25 || d >= 1.5) return "Medium";
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

  const peRatio = safeNumber(
    m.peNormalizedAnnual ||
      m.peTTM ||
      m.peBasicExclExtraTTM
  );

  const roe = safeNumber(m.roeTTM || m.roeRfy);

  const debtToEquity = safeNumber(
    m["totalDebt/totalEquityAnnual"] ||
      m["totalDebt/totalEquityQuarterly"]
  );

  const netMargin = safeNumber(
    m.netProfitMarginTTM ||
      m.netProfitMarginAnnual
  );

  const revenueGrowth = safeNumber(
    m.revenueGrowthTTMYoy ||
      m.revenueGrowthQuarterlyYoy
  );

  const beta = safeNumber(m.beta);
  const marketCapM = safeNumber(profile.marketCapitalization);
  const dayChangePercent = safeNumber(quote.dp);

  const growthScore = scoreGrowth(revenueGrowth);
  const profitabilityScore = scoreProfitability(roe, netMargin);
  const healthScore = scoreFinancialHealth(debtToEquity, marketCapM);
  const valuationScore = scoreValuation(peRatio, revenueGrowth, roe, netMargin);
  const momentumScore = scoreMomentum(dayChangePercent, beta);
  const reversalScore = scorePullback(dayChangePercent);

  /*
    Better weighting for high-quality companies:

    Growth: 23.75%
    Profitability: 23.75%
    Financial Health: 20%
    Valuation: 14.5%
    Momentum: 10%
    Pullback: 8%

    This means a great company can still score high even if valuation is expensive.
  */
  const edgeScore =
    growthScore * 0.2375 +
    profitabilityScore * 0.2375 +
    healthScore * 0.2 +
    valuationScore * 0.145 +
    momentumScore * 0.1 +
    reversalScore * 0.08;

  const riskLabel = getRiskLabel(beta, debtToEquity);

  return {
    symbol: cleanSymbol,
    profile,
    quote,

    companyDescription: `${profile.name || cleanSymbol} is a publicly traded company in the ${
      profile.finnhubIndustry || "market"
    } industry.`,

    evaluationSummary: `${cleanSymbol} has an Edge Score of ${edgeScore.toFixed(
      1
    )} out of 10. The score weighs growth, profitability, financial health, valuation, momentum, and pullback opportunity. Expensive valuations reduce the score, but they do not completely overpower strong company quality.`,

    metrics: {
      peRatio: metric(peRatio, "", "Finnhub", "Price / Earnings"),
      roe: metric(roe, "%", "Finnhub", "Net Income / Shareholder Equity"),
      debtToEquity: metric(
        debtToEquity,
        "",
        "Finnhub",
        "Total Debt / Total Equity"
      ),
      netMargin: metric(netMargin, "%", "Finnhub", "Net Income / Revenue"),
      revenueGrowth: metric(
        revenueGrowth,
        "%",
        "Finnhub",
        "Revenue growth year over year"
      ),
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
        marketCapM,
      },
    },
  };
}
