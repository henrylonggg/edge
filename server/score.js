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

  if (g >= 75) return 10.0;
  if (g >= 70) return 9.7;
  if (g >= 65) return 9.4;
  if (g >= 60) return 9.1;
  if (g >= 55) return 8.8;
  if (g >= 50) return 8.5;
  if (g >= 45) return 8.2;
  if (g >= 40) return 7.9;
  if (g >= 35) return 7.6;
  if (g >= 30) return 7.3;
  if (g >= 25) return 7.0;
  if (g >= 21) return 6.7;
  if (g >= 17) return 6.4;
  if (g >= 13) return 6.1;
  if (g >= 10) return 5.8;
  if (g >= 7) return 5.5;
  if (g >= 5) return 5.2;
  if (g >= 3) return 4.9;
  if (g >= 1) return 4.6;
  if (g >= 0) return 4.3;
  if (g >= -2) return 4.0;
  if (g >= -5) return 3.7;
  if (g >= -8) return 3.4;
  if (g >= -12) return 3.1;
  if (g >= -16) return 2.8;
  if (g >= -20) return 2.5;
  if (g >= -30) return 2.1;

  return 1.7;
}

function scoreProfitability(roe, netMargin) {
  const r = safeNumber(roe);
  const m = safeNumber(netMargin);

  let roeScore = 6;
  let marginScore = 6;

  if (r !== null) {
   if (r >= 75) roeScore = 10.0;
   else if (r >= 70) roeScore = 9.7;
   else if (r >= 65) roeScore = 9.4;
   else if (r >= 60) roeScore = 9.1;
   else if (r >= 55) roeScore = 8.8;
   else if (r >= 50) roeScore = 8.5;
   else if (r >= 45) roeScore = 8.2;
   else if (r >= 40) roeScore = 7.9;
   else if (r >= 35) roeScore = 7.6;
   else if (r >= 30) roeScore = 7.3;
   else if (r >= 25) roeScore = 7.0;
   else if (r >= 21) roeScore = 6.7;
   else if (r >= 17) roeScore = 6.4;
   else if (r >= 13) roeScore = 6.1;
   else if (r >= 10) roeScore = 5.8;
   else if (r >= 7) roeScore = 5.5;
   else if (r >= 5) roeScore = 5.2;
   else if (r >= 3) roeScore = 4.9;
   else if (r >= 1) roeScore = 4.6;
   else if (r >= 0) roeScore = 4.3;
   else if (r >= -2) roeScore = 4.0;
   else if (r >= -5) roeScore = 3.7;
   else if (r >= -8) roeScore = 3.4;
   else if (r >= -12) roeScore = 3.1;
   else if (r >= -16) roeScore = 2.8;
   else if (r >= -20) roeScore = 2.5;
   else roeScore = 2.0;
    
 }

  if (m !== null) {
   if (m >= 50) marginScore = 10.0;
   else if (m >= 45) marginScore = 9.7;
   else if (m >= 40) marginScore = 9.4;
   else if (m >= 35) marginScore = 9.1;
   else if (m >= 32) marginScore = 8.8;
   else if (m >= 29) marginScore = 8.5;
   else if (m >= 26) marginScore = 8.2;
   else if (m >= 23) marginScore = 7.9;
   else if (m >= 20) marginScore = 7.6;
   else if (m >= 17) marginScore = 7.3;
   else if (m >= 15) marginScore = 7.0;
   else if (m >= 13) marginScore = 6.7;
   else if (m >= 11) marginScore = 6.4;
   else if (m >= 9) marginScore = 6.1;
   else if (m >= 7) marginScore = 5.8;
   else if (m >= 5) marginScore = 5.5;
   else if (m >= 3) marginScore = 5.2;
   else if (m >= 1) marginScore = 4.9;
   else if (m >= 0) marginScore = 4.6;
   else if (m >= -2) marginScore = 4.0;
   else if (m >= -5) marginScore = 3.5;
   else if (m >= -10) marginScore = 3.0;
   else if (m >= -15) marginScore = 2.5;
   else marginScore = 2.0;
  }

  return Number(((roeScore * 0.55) + (marginScore * 0.45)).toFixed(1));
}

function scoreFinancialHealth(debtToEquity, marketCapM) {
  const d = safeNumber(debtToEquity);
  const cap = safeNumber(marketCapM);

  let debtScore = 7;

  if (d !== null) {
   if (d <= 0.10) debtScore = 10.0;
   else if (d <= 0.20) debtScore = 9.7;
   else if (d <= 0.30) debtScore = 9.4;
   else if (d <= 0.45) debtScore = 9.1;
   else if (d <= 0.60) debtScore = 8.8;
   else if (d <= 0.75) debtScore = 8.5;
   else if (d <= 0.90) debtScore = 8.2;
   else if (d <= 1.05) debtScore = 7.9;
   else if (d <= 1.20) debtScore = 7.6;
   else if (d <= 1.40) debtScore = 7.3;
   else if (d <= 1.60) debtScore = 7.0;
   else if (d <= 1.80) debtScore = 6.7;
   else if (d <= 2.00) debtScore = 6.4;
   else if (d <= 2.25) debtScore = 6.1;
   else if (d <= 2.50) debtScore = 5.8;
   else if (d <= 2.75) debtScore = 5.5;
   else if (d <= 3.00) debtScore = 5.2;
   else if (d <= 3.50) debtScore = 4.8;
   else if (d <= 4.00) debtScore = 4.4;
   else if (d <= 5.00) debtScore = 4.0;
   else if (d <= 6.00) debtScore = 3.5;
   else if (d <= 8.00) debtScore = 3.0;
   else if (d <= 10.00) debtScore = 2.5;
   else debtScore = 2.0;
  }

  let sizeBonus = 0;

  if (cap !== null) {
   if (cap >= 3000000) sizeBonus = 0.82;
   else if (cap >= 2000000) sizeBonus = 0.71;
   else if (cap >= 1000000) sizeBonus = 0.63;
   else if (cap >= 750000) sizeBonus = 0.515;
   else if (cap >= 500000) sizeBonus = 0.375;
   else if (cap >= 300000) sizeBonus = 0.3;
   else if (cap >= 150000) sizeBonus = 0.235;
   else if (cap >= 100000) sizeBonus = 0.15;
   else if (cap >= 50000) sizeBonus = 0.1;
   else if (cap >= 10000) sizeBonus = 0.05;
   else sizeBonus = 0.0;
  }

  return Number(clamp(debtScore + sizeBonus).toFixed(1));
}

function scoreValuation(peRatio, revenueGrowth, roe, netMargin) {
  const pe = safeNumber(peRatio);
  const g = safeNumber(revenueGrowth);
  const r = safeNumber(roe);
  const m = safeNumber(netMargin);

  if (pe === null || pe <= 0) return 5.9;

  let score;

  if (pe <= 8) score = 10.0;
  else if (pe <= 10) score = 9.7;
  else if (pe <= 12) score = 9.4;
  else if (pe <= 14) score = 9.1;
  else if (pe <= 16) score = 8.8;
  else if (pe <= 18) score = 8.5;
  else if (pe <= 20) score = 8.2;
  else if (pe <= 22) score = 7.9;
  else if (pe <= 25) score = 7.6;
  else if (pe <= 28) score = 7.3;
  else if (pe <= 32) score = 7.0;
  else if (pe <= 35) score = 6.7;
  else if (pe <= 40) score = 6.4;
  else if (pe <= 45) score = 6.1;
  else if (pe <= 50) score = 5.8;
  else if (pe <= 60) score = 5.4;
  else if (pe <= 75) score = 5.0;
  else if (pe <= 100) score = 4.5;
  else if (pe <= 150) score = 4.0;
  else if (pe <= 200) score = 3.5;
  else score = 3.0;
}

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
   if (dp >= 8) score = 10.0;
   else if (dp >= 7) score = 9.7;
   else if (dp >= 6) score = 9.4;
   else if (dp >= 5) score = 9.1;
   else if (dp >= 4) score = 8.8;
   else if (dp >= 3.5) score = 8.5;
   else if (dp >= 3) score = 8.2;
   else if (dp >= 2.5) score = 7.9;
   else if (dp >= 2) score = 7.6;
   else if (dp >= 1.5) score = 7.3;
   else if (dp >= 1) score = 7.0;
   else if (dp >= 0.5) score = 6.7;
   else if (dp >= 0.25) score = 6.4;
   else if (dp >= 0) score = 6.1;
   else if (dp >= -0.5) score = 5.8;
   else if (dp >= -1) score = 5.5;
   else if (dp >= -1.5) score = 5.2;
   else if (dp >= -2) score = 4.9;
   else if (dp >= -3) score = 4.5;
   else if (dp >= -4) score = 4.1;
   else if (dp >= -5) score = 3.7;
   else if (dp >= -7) score = 3.3;
   else if (dp >= -10) score = 2.8;
   else score = 2.3;
    
 }

  // Very high beta adds risk, so slight penalty.
  if (b !== null && b > 1.8) score -= 0.5;

  return Number(clamp(score).toFixed(1));
}

function scorePullback(dayChangePercent) {
  const dp = safeNumber(dayChangePercent);

  if (dp === null) return 6;

  // Pullback score means "buy-the-dip opportunity," not overall quality.
  if (dp <= -10) return 10.0;
  if (dp <= -9) return 9.7;
  if (dp <= -8) return 9.4;
  if (dp <= -7) return 9.1;
  if (dp <= -6) return 8.8;
  if (dp <= -5) return 8.5;
  if (dp <= -4.5) return 8.2;
  if (dp <= -4) return 7.9;
  if (dp <= -3.5) return 7.6;
  if (dp <= -3) return 7.3;
  if (dp <= -2.5) return 7.0;
  if (dp <= -2) return 6.8;
  if (dp <= -1.5) return 6.6;
  if (dp <= -1) return 6.4;
  if (dp <= -0.5) return 6.2;
  if (dp <= 0) return 6.0;
  if (dp <= 0.5) return 5.8;
  if (dp <= 1) return 5.6;
  if (dp <= 1.5) return 5.4;
  if (dp <= 2) return 5.2;
  if (dp <= 3) return 5.0;
  if (dp <= 4) return 4.8;
  if (dp <= 5) return 4.6;
  if (dp <= 7) return 4.3;
  if (dp <= 10) return 4.0;

  return 3.7;
}

function getRiskLabel(beta, debtToEquity) {
  const b = safeNumber(beta) ?? 1;
  const d = safeNumber(debtToEquity) ?? 0;

  if (b >= 2.3 || d >= 5) return "Very High";
  if (b >= 1.8 || d >= 3) return "High";
  if (b >= 1.25 || d >= 1.5) return "Medium";
  if (b <= 0.65 && d <= 0.5) return "Very Low";
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

    Growth: 25%
    Profitability: 25%
    Financial Health: 20%
    Valuation: 12%
    Momentum: 10%
    Pullback: 8%

    This means a great company can still score high even if valuation is expensive.
  */
  const edgeScore =
    growthScore * 0.2425 +
    profitabilityScore * 0.2350 +
    healthScore * 0.20.25 +
    valuationScore * 0.14 +
    momentumScore * 0.1 +
    reversalScore * 0.075;

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
