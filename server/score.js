const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

const clamp = (value, min = 0, max = 100) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.max(min, Math.min(max, num));
};

const isValidNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num !== 0;
};

const round = (value, digits = 1) => {
  if (!Number.isFinite(Number(value))) return null;
  return Number(Number(value).toFixed(digits));
};

async function fetchFinnhub(path) {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey || apiKey === "PUT_YOUR_FINNHUB_KEY_HERE") {
    throw new Error("Missing Finnhub API key. Add FINNHUB_API_KEY to server/.env");
  }

  const url = new URL(`${FINNHUB_BASE_URL}${path}`);
  url.searchParams.set("token", apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Finnhub request failed: ${response.status}`);
  }

  return response.json();
}

function getMetric(metrics, possibleKeys) {
  for (const key of possibleKeys) {
    const value = metrics?.[key];

    if (isValidNumber(value)) {
      return Number(value);
    }
  }

  return null;
}

function averageValidScores(scores) {
  const valid = scores.filter((score) => Number.isFinite(score));

  if (!valid.length) return null;

  return valid.reduce((sum, score) => sum + score, 0) / valid.length;
}

function scoreHigherBetter(value, weak, strong) {
  if (!isValidNumber(value)) return null;

  const score = ((value - weak) / (strong - weak)) * 100;
  return clamp(score);
}

function scoreLowerBetter(value, strong, weak) {
  if (!isValidNumber(value)) return null;

  const score = ((weak - value) / (weak - strong)) * 100;
  return clamp(score);
}

function scoreBeta(beta) {
  if (!isValidNumber(beta)) return null;

  const b = Number(beta);

  if (b >= 0.85 && b <= 1.25) return 90;
  if (b >= 0.65 && b < 0.85) return 78;
  if (b > 1.25 && b <= 1.55) return 72;
  if (b >= 0.45 && b < 0.65) return 62;
  if (b > 1.55 && b <= 2.0) return 52;

  return 35;
}

function scorePE(pe) {
  if (!isValidNumber(pe)) return null;

  const value = Number(pe);

  if (value <= 0) return null;
  if (value >= 12 && value <= 28) return 90;
  if (value > 28 && value <= 40) return 75;
  if (value > 40 && value <= 60) return 55;
  if (value > 60) return 35;
  if (value < 8) return 55;

  return 70;
}

function scorePS(ps) {
  if (!isValidNumber(ps)) return null;

  const value = Number(ps);

  if (value <= 0) return null;
  if (value <= 2) return 90;
  if (value <= 5) return 78;
  if (value <= 9) return 62;
  if (value <= 15) return 45;

  return 30;
}

function scorePB(pb) {
  if (!isValidNumber(pb)) return null;

  const value = Number(pb);

  if (value <= 0) return null;
  if (value <= 3) return 88;
  if (value <= 6) return 72;
  if (value <= 10) return 55;
  if (value <= 18) return 40;

  return 25;
}

function buildMetricScore(name, metrics) {
  const validMetrics = metrics.filter((item) => Number.isFinite(item.score));
  const score = averageValidScores(validMetrics.map((item) => item.score));

  return {
    name,
    score: score === null ? 50 : round(score),
    usedMetrics: validMetrics.map((item) => ({
      label: item.label,
      value: round(item.value, 2),
      score: round(item.score),
    })),
    skippedMetrics: metrics
      .filter((item) => !Number.isFinite(item.score))
      .map((item) => item.label),
  };
}

function calculateScores(metricData, quoteData) {
  const metrics = metricData?.metric || {};

  const currentPrice = quoteData?.c || null;

  // ----------------------------
  // VALUATION: 3-way average
  // P/E + P/S + P/B
  // ----------------------------
  const peRatio = getMetric(metrics, [
    "peTTM",
    "peNormalizedAnnual",
    "peExclExtraTTM",
    "peInclExtraTTM",
  ]);

  const psRatio = getMetric(metrics, [
    "psTTM",
    "psAnnual",
    "priceToSalesRatioTTM",
  ]);

  const pbRatio = getMetric(metrics, [
    "pbAnnual",
    "pbQuarterly",
    "priceToBookAnnual",
    "priceToBookQuarterly",
  ]);

  const valuation = buildMetricScore("Valuation", [
    {
      label: "P/E Ratio",
      value: peRatio,
      score: scorePE(peRatio),
    },
    {
      label: "P/S Ratio",
      value: psRatio,
      score: scorePS(psRatio),
    },
    {
      label: "P/B Ratio",
      value: pbRatio,
      score: scorePB(pbRatio),
    },
  ]);

  // ----------------------------
  // GROWTH: 2-way average
  // Revenue Growth + EPS Growth
  // ----------------------------
  const revenueGrowth = getMetric(metrics, [
    "revenueGrowthTTMYoy",
    "revenueGrowthQuarterlyYoy",
    "revenueGrowth3Y",
    "revenueGrowth5Y",
  ]);

  const epsGrowth = getMetric(metrics, [
    "epsGrowthTTMYoy",
    "epsGrowthQuarterlyYoy",
    "epsGrowth3Y",
    "epsGrowth5Y",
  ]);

  const growth = buildMetricScore("Growth", [
    {
      label: "Revenue Growth",
      value: revenueGrowth,
      score: scoreHigherBetter(revenueGrowth, -10, 25),
    },
    {
      label: "EPS Growth",
      value: epsGrowth,
      score: scoreHigherBetter(epsGrowth, -15, 30),
    },
  ]);

  // ----------------------------
  // MOMENTUM: 2-way average
  // 6M Price Return + Distance From 52W High
  // ----------------------------
  const priceReturn6M = getMetric(metrics, [
    "priceReturn6M",
    "priceReturn26Week",
    "26WeekPriceReturnDaily",
  ]);

  const fiftyTwoWeekHigh = getMetric(metrics, [
    "52WeekHigh",
    "52WeekHighDate",
  ]);

  let distanceFromHigh = null;

  if (isValidNumber(currentPrice) && isValidNumber(fiftyTwoWeekHigh)) {
    distanceFromHigh = ((currentPrice - fiftyTwoWeekHigh) / fiftyTwoWeekHigh) * 100;
  }

  const momentum = buildMetricScore("Momentum", [
    {
      label: "6M Price Return",
      value: priceReturn6M,
      score: scoreHigherBetter(priceReturn6M, -20, 35),
    },
    {
      label: "Distance From 52W High",
      value: distanceFromHigh,
      score: scoreHigherBetter(distanceFromHigh, -35, 0),
    },
  ]);

  // ----------------------------
  // PROFITABILITY: 2-way average
  // ROE + Net Profit Margin
  // ----------------------------
  const roe = getMetric(metrics, [
    "roeTTM",
    "roeRfy",
    "roeAnnual",
  ]);

  const netMargin = getMetric(metrics, [
    "netProfitMarginTTM",
    "netProfitMarginAnnual",
    "netMarginTTM",
  ]);

  const profitability = buildMetricScore("Profitability", [
    {
      label: "Return on Equity",
      value: roe,
      score: scoreHigherBetter(roe, 0, 30),
    },
    {
      label: "Net Profit Margin",
      value: netMargin,
      score: scoreHigherBetter(netMargin, 0, 28),
    },
  ]);

  // ----------------------------
  // STABILITY: 2-way average
  // Beta + Debt/Equity
  // ----------------------------
  const beta = getMetric(metrics, [
    "beta",
    "beta5Y",
  ]);

  const debtToEquity = getMetric(metrics, [
    "totalDebt/totalEquityAnnual",
    "totalDebt/totalEquityQuarterly",
    "debtEquityRatioAnnual",
    "debtEquityRatioQuarterly",
  ]);

  const stability = buildMetricScore("Stability", [
    {
      label: "Beta",
      value: beta,
      score: scoreBeta(beta),
    },
    {
      label: "Debt/Equity",
      value: debtToEquity,
      score: scoreLowerBetter(debtToEquity, 0.2, 2.5),
    },
  ]);

  const categoryScores = {
    valuation,
    growth,
    momentum,
    profitability,
    stability,
  };

  const finalPowerScore = averageValidScores([
    valuation.score * 0.22,
    growth.score * 0.23,
    momentum.score * 0.20,
    profitability.score * 0.22,
    stability.score * 0.13,
  ]);

  const powerScore = finalPowerScore === null ? 50 : round(finalPowerScore);

  return {
    powerScore,
    rating: getRating(powerScore),
    categories: categoryScores,
    rawMetrics: {
      peRatio,
      psRatio,
      pbRatio,
      revenueGrowth,
      epsGrowth,
      priceReturn6M,
      distanceFromHigh,
      roe,
      netMargin,
      beta,
      debtToEquity,
    },
  };
}

function getRating(score) {
  if (score >= 90) return "Elite";
  if (score >= 80) return "Strong Buy";
  if (score >= 70) return "Buy";
  if (score >= 60) return "Hold";
  if (score >= 50) return "Weak Hold";
  return "Avoid";
}

export async function buildStockAnalysis(symbol) {
  const cleanSymbol = String(symbol || "")
    .trim()
    .toUpperCase();

  if (!cleanSymbol) {
    throw new Error("Ticker symbol is required.");
  }

  const [quoteData, profileData, metricData] = await Promise.all([
    fetchFinnhub(`/quote?symbol=${encodeURIComponent(cleanSymbol)}`),
    fetchFinnhub(`/stock/profile2?symbol=${encodeURIComponent(cleanSymbol)}`),
    fetchFinnhub(`/stock/metric?symbol=${encodeURIComponent(cleanSymbol)}&metric=all`),
  ]);

  if (!quoteData || !isValidNumber(quoteData.c)) {
    throw new Error(`No live quote found for ${cleanSymbol}.`);
  }

  const scores = calculateScores(metricData, quoteData);

  return {
    symbol: cleanSymbol,
    companyName: profileData?.name || cleanSymbol,
    exchange: profileData?.exchange || null,
    industry: profileData?.finnhubIndustry || null,
    currentPrice: round(quoteData.c, 2),
    change: round(quoteData.d, 2),
    changePercent: round(quoteData.dp, 2),
    highToday: round(quoteData.h, 2),
    lowToday: round(quoteData.l, 2),
    openToday: round(quoteData.o, 2),
    previousClose: round(quoteData.pc, 2),
    powerScore: scores.powerScore,
    rating: scores.rating,
    categories: scores.categories,
    rawMetrics: scores.rawMetrics,
    explanation: buildExplanation(scores),
  };
}

function buildExplanation(scores) {
  const categories = scores.categories;

  return {
    summary: `This score uses valuation, growth, momentum, profitability, and stability. Missing Finnhub metrics are skipped instead of counted as zero.`,
    valuation: `Valuation averages P/E, P/S, and P/B when available.`,
    growth: `Growth averages revenue growth and EPS growth when available.`,
    momentum: `Momentum averages 6-month price return and distance from the 52-week high when available.`,
    profitability: `Profitability averages return on equity and net profit margin when available.`,
    stability: `Stability averages beta and debt/equity when available.`,
    skippedData: {
      valuation: categories.valuation.skippedMetrics,
      growth: categories.growth.skippedMetrics,
      momentum: categories.momentum.skippedMetrics,
      profitability: categories.profitability.skippedMetrics,
      stability: categories.stability.skippedMetrics,
    },
  };
}
