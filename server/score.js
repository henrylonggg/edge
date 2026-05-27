const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

function clamp(value, min = 0, max = 100) {
function clamp(value, min = 0, max = 10) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function scoreMetric(value, goodLow, goodHigh, reverse = false) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 5;
  }

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

  let score;

  if (reverse) {
    score = 10 - ((n - goodLow) / (goodHigh - goodLow)) * 10;
  } else {
    score = ((n - goodLow) / (goodHigh - goodLow)) * 10;
  }

  return Number(clamp(score, 1, 10).toFixed(1));
function metric(value, suffix = "", source = "Finnhub", formula = "") {
  return {
    value: safeNumber(value),
    suffix,
    source,
    formula,
  };
}

async function fetchFinnhub(path, params = {}) {
@@ -38,7 +34,6 @@ async function fetchFinnhub(path, params = {}) {
  });

  const response = await fetch(url);

  const data = await response.json().catch(() => null);

  if (!response.ok) {
@@ -48,26 +43,148 @@ async function fetchFinnhub(path, params = {}) {
  return data;
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
function scoreGrowth(revenueGrowth) {
  const g = safeNumber(revenueGrowth);

  if (g === null) return 6;
  if (g >= 40) return 10;
  if (g >= 25) return 9;
  if (g >= 15) return 8;
  if (g >= 8) return 7;
  if (g >= 3) return 6;
  if (g >= 0) return 5;
  if (g >= -5) return 4;
  return 3;
}

function metric(value, suffix = "", source = "Finnhub", formula = "") {
  return {
    value: safeNumber(value),
    suffix,
    source,
    formula,
  };
function scoreProfitability(roe, netMargin) {
  const r = safeNumber(roe);
  const m = safeNumber(netMargin);

  let roeScore = 6;
  let marginScore = 6;

  if (r !== null) {
    if (r >= 60) roeScore = 10;
    else if (r >= 35) roeScore = 9;
    else if (r >= 20) roeScore = 8;
    else if (r >= 12) roeScore = 7;
    else if (r >= 5) roeScore = 6;
    else if (r >= 0) roeScore = 5;
    else roeScore = 3;
  }

  if (m !== null) {
    if (m >= 35) marginScore = 10;
    else if (m >= 25) marginScore = 9;
    else if (m >= 15) marginScore = 8;
    else if (m >= 8) marginScore = 7;
    else if (m >= 3) marginScore = 6;
    else if (m >= 0) marginScore = 5;
    else marginScore = 3;
  }

  return Number(((roeScore * 0.55) + (marginScore * 0.45)).toFixed(1));
}

function scoreFinancialHealth(debtToEquity, marketCapM) {
  const d = safeNumber(debtToEquity);
  const cap = safeNumber(marketCapM);

  let debtScore = 7;

  if (d !== null) {
    if (d <= 0.3) debtScore = 10;
    else if (d <= 0.7) debtScore = 9;
    else if (d <= 1.2) debtScore = 8;
    else if (d <= 2.0) debtScore = 6;
    else if (d <= 3.0) debtScore = 4;
    else debtScore = 2;
  }

  let sizeBonus = 0;

  if (cap !== null) {
    if (cap >= 500000) sizeBonus = 0.8;
    else if (cap >= 100000) sizeBonus = 0.5;
    else if (cap >= 10000) sizeBonus = 0.2;
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

  if (b >= 1.6 || d >= 2.5) return "High";
  if (b >= 1.2 || d >= 1.2) return "Medium";
  if (b >= 1.8 || d >= 3) return "High";
  if (b >= 1.25 || d >= 1.5) return "Medium";
  return "Low";
}

@@ -90,26 +207,58 @@ export async function buildStockAnalysis(symbol) {

  const m = metricsRaw?.metric || {};

  const peRatio = safeNumber(m.peNormalizedAnnual || m.peTTM || m.peBasicExclExtraTTM);
  const peRatio = safeNumber(
    m.peNormalizedAnnual ||
      m.peTTM ||
      m.peBasicExclExtraTTM
  );

  const roe = safeNumber(m.roeTTM || m.roeRfy);
  const debtToEquity = safeNumber(m["totalDebt/totalEquityAnnual"] || m["totalDebt/totalEquityQuarterly"]);
  const netMargin = safeNumber(m.netProfitMarginTTM || m.netProfitMarginAnnual);
  const revenueGrowth = safeNumber(m.revenueGrowthTTMYoy || m.revenueGrowthQuarterlyYoy);

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

  const growthScore = scoreMetric(revenueGrowth, -10, 30);
  const profitabilityScore = scoreMetric(roe, 0, 35);
  const healthScore = scoreMetric(debtToEquity, 0, 2.5, true);
  const valuationScore = scoreMetric(peRatio, 5, 45, true);
  const momentumScore = scoreMetric(safeNumber(quote.dp), -5, 5);
  const reversalScore = scoreMetric(safeNumber(quote.dp), -10, 10, true);
  /*
    Better weighting for high-quality companies:

    Growth: 25%
    Profitability: 25%
    Financial Health: 20%
    Valuation: 12%
    Momentum: 10%
    Pullback: 8%

    This means a great company can still score high even if valuation is expensive.
  */
  const edgeScore =
    growthScore * 0.22 +
    profitabilityScore * 0.22 +
    healthScore * 0.18 +
    valuationScore * 0.18 +
    momentumScore * 0.12 +
    growthScore * 0.25 +
    profitabilityScore * 0.25 +
    healthScore * 0.2 +
    valuationScore * 0.12 +
    momentumScore * 0.1 +
    reversalScore * 0.08;

  const riskLabel = getRiskLabel(beta, debtToEquity);
@@ -118,18 +267,31 @@ export async function buildStockAnalysis(symbol) {
    symbol: cleanSymbol,
    profile,
    quote,
    companyDescription:
      `${profile.name || cleanSymbol} is a publicly traded company in the ${profile.finnhubIndustry || "market"} industry.`,

    evaluationSummary:
      `${cleanSymbol} has an Edge Score of ${edgeScore.toFixed(1)} out of 10. The score combines growth, profitability, financial health, valuation, momentum, and pullback/reversal factors. Risk is currently labeled as ${riskLabel}.`,
    companyDescription: `${profile.name || cleanSymbol} is a publicly traded company in the ${
      profile.finnhubIndustry || "market"
    } industry.`,

    evaluationSummary: `${cleanSymbol} has an Edge Score of ${edgeScore.toFixed(
      1
    )} out of 10. The score weighs growth, profitability, financial health, valuation, momentum, and pullback opportunity. Expensive valuations reduce the score, but they do not completely overpower strong company quality.`,

    metrics: {
      peRatio: metric(peRatio, "", "Finnhub", "Price / Earnings"),
      roe: metric(roe, "%", "Finnhub", "Net Income / Shareholder Equity"),
      debtToEquity: metric(debtToEquity, "", "Finnhub", "Total Debt / Total Equity"),
      debtToEquity: metric(
        debtToEquity,
        "",
        "Finnhub",
        "Total Debt / Total Equity"
      ),
      netMargin: metric(netMargin, "%", "Finnhub", "Net Income / Revenue"),
      revenueGrowth: metric(revenueGrowth, "%", "Finnhub", "Revenue growth year over year"),
      revenueGrowth: metric(
        revenueGrowth,
        "%",
        "Finnhub",
        "Revenue growth year over year"
      ),
      beta: metric(beta, "", "Finnhub", "Volatility compared with market"),
    },

@@ -145,7 +307,7 @@ export async function buildStockAnalysis(symbol) {
        reversal: reversalScore,
      },
      context: {
        marketCapM: safeNumber(profile.marketCapitalization),
        marketCapM,
      },
    },
  };
