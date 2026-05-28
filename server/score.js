// server/score.js

function isValidNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function cleanNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function clamp(value, min, max) {
  if (!isValidNumber(value)) return null;
  return Math.max(min, Math.min(max, value));
}

function percent(value) {
  const num = cleanNumber(value);
  if (num === null) return null;
  return num;
}

function scoreHigherBetter(value, excellent, poor) {
  const num = cleanNumber(value);
  if (num === null) return null;

  if (excellent === poor) return null;

  const score = ((num - poor) / (excellent - poor)) * 100;
  return clamp(score, 0, 100);
}

function scoreLowerBetter(value, excellent, poor) {
  const num = cleanNumber(value);
  if (num === null) return null;

  if (excellent === poor) return null;

  const score = ((poor - num) / (poor - excellent)) * 100;
  return clamp(score, 0, 100);
}

function weightedAverage(items) {
  const validItems = items.filter(
    (item) => isValidNumber(item.score) && isValidNumber(item.weight) && item.weight > 0
  );

  if (validItems.length === 0) {
    return {
      score: null,
      used: [],
      skipped: items.map((item) => item.name),
    };
  }

  const totalWeight = validItems.reduce((sum, item) => sum + item.weight, 0);

  const score =
    validItems.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight;

  return {
    score: clamp(score, 0, 100),
    used: validItems.map((item) => item.name),
    skipped: items
      .filter((item) => !isValidNumber(item.score))
      .map((item) => item.name),
  };
}

function formatMoney(value) {
  const num = cleanNumber(value);
  if (num === null) return "N/A";

  if (Math.abs(num) >= 1_000_000_000_000) {
    return `$${(num / 1_000_000_000_000).toFixed(2)}T`;
  }

  if (Math.abs(num) >= 1_000_000_000) {
    return `$${(num / 1_000_000_000).toFixed(2)}B`;
  }

  if (Math.abs(num) >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(2)}M`;
  }

  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function getMetric(metricData, key) {
  const value = metricData?.metric?.[key];
  return cleanNumber(value);
}

function getSecFact(secFacts, possibleTags) {
  if (!secFacts?.facts?.["us-gaap"]) return null;

  const gaap = secFacts.facts["us-gaap"];

  for (const tag of possibleTags) {
    const item = gaap[tag];
    if (!item?.units) continue;

    const unitKeys = Object.keys(item.units);

    for (const unit of unitKeys) {
      const values = item.units[unit];
      if (!Array.isArray(values)) continue;

      const validValues = values
        .filter((v) => cleanNumber(v.val) !== null && v.fy && v.fp)
        .sort((a, b) => {
          const aDate = new Date(a.end || a.filed || 0).getTime();
          const bDate = new Date(b.end || b.filed || 0).getTime();
          return bDate - aDate;
        });

      if (validValues.length > 0) {
        return cleanNumber(validValues[0].val);
      }
    }
  }

  return null;
}

function calculatePriceMomentum(candles) {
  if (!Array.isArray(candles) || candles.length < 30) return null;

  const first = cleanNumber(candles[0]?.close);
  const last = cleanNumber(candles[candles.length - 1]?.close);

  if (first === null || last === null || first <= 0) return null;

  return ((last - first) / first) * 100;
}

function calculateVolatility(candles) {
  if (!Array.isArray(candles) || candles.length < 30) return null;

  const returns = [];

  for (let i = 1; i < candles.length; i++) {
    const prev = cleanNumber(candles[i - 1]?.close);
    const curr = cleanNumber(candles[i]?.close);

    if (prev && curr) {
      returns.push((curr - prev) / prev);
    }
  }

  if (returns.length < 20) return null;

  const avg = returns.reduce((sum, r) => sum + r, 0) / returns.length;

  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / returns.length;

  const dailyVolatility = Math.sqrt(variance);
  const annualizedVolatility = dailyVolatility * Math.sqrt(252);

  return annualizedVolatility * 100;
}

function calculateMaxDrawdown(candles) {
  if (!Array.isArray(candles) || candles.length < 30) return null;

  let peak = cleanNumber(candles[0]?.close);
  let maxDrawdown = 0;

  if (peak === null) return null;

  for (const candle of candles) {
    const price = cleanNumber(candle.close);
    if (price === null) continue;

    if (price > peak) peak = price;

    const drawdown = ((peak - price) / peak) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  return maxDrawdown;
}

function calculateTrendStrength(candles) {
  if (!Array.isArray(candles) || candles.length < 60) return null;

  const closes = candles.map((c) => cleanNumber(c.close)).filter((v) => v !== null);

  if (closes.length < 60) return null;

  const latest = closes[closes.length - 1];
  const sma50 =
    closes.slice(-50).reduce((sum, price) => sum + price, 0) / 50;

  if (!latest || !sma50) return null;

  return ((latest - sma50) / sma50) * 100;
}

function calculateMetrics({ ticker, profile, quote, metricData, secFacts, candles }) {
  const marketCap = cleanNumber(profile?.marketCapitalization)
    ? cleanNumber(profile.marketCapitalization) * 1_000_000
    : null;

  const currentPrice = cleanNumber(quote?.c);

  const peTTM = getMetric(metricData, "peNormalizedAnnual") ?? getMetric(metricData, "peTTM");
  const psTTM = getMetric(metricData, "psTTM");
  const pbAnnual = getMetric(metricData, "pbAnnual");
  const evToEbitda = getMetric(metricData, "evToEbitdaTTM");
  const grossMargin = getMetric(metricData, "grossMarginTTM");
  const operatingMargin = getMetric(metricData, "operatingMarginTTM");
  const netMargin = getMetric(metricData, "netProfitMarginTTM");
  const roe = getMetric(metricData, "roeTTM");
  const roa = getMetric(metricData, "roaTTM");
  const currentRatio = getMetric(metricData, "currentRatioAnnual");
  const quickRatio = getMetric(metricData, "quickRatioAnnual");
  const debtToEquity = getMetric(metricData, "totalDebt/totalEquityAnnual");
  const revenueGrowth = getMetric(metricData, "revenueGrowthTTMYoy");
  const epsGrowth = getMetric(metricData, "epsGrowthTTMYoy");
  const ebitdaCagr5Y = getMetric(metricData, "ebitdaCagr5Y");
  const beta = getMetric(metricData, "beta");
  const dividendYield = getMetric(metricData, "dividendYieldIndicatedAnnual");

  const revenue = getSecFact(secFacts, [
    "Revenues",
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "SalesRevenueNet",
  ]);

  const netIncome = getSecFact(secFacts, [
    "NetIncomeLoss",
    "ProfitLoss",
  ]);

  const operatingIncome = getSecFact(secFacts, [
    "OperatingIncomeLoss",
  ]);

  const ebitda = getSecFact(secFacts, [
    "EarningsBeforeInterestTaxesDepreciationAndAmortization",
    "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest",
  ]);

  const freeCashFlow = getSecFact(secFacts, [
    "FreeCashFlow",
    "NetCashProvidedByUsedInOperatingActivities",
  ]);

  const priceMomentum1Y = calculatePriceMomentum(candles);
  const volatility = calculateVolatility(candles);
  const maxDrawdown = calculateMaxDrawdown(candles);
  const trendStrength = calculateTrendStrength(candles);

  return {
    ticker,
    companyName: profile?.name || ticker,
    description:
      profile?.finnhubIndustry
        ? `${profile.name || ticker} operates in the ${profile.finnhubIndustry} industry.`
        : "N/A",
    industry: profile?.finnhubIndustry || "N/A",
    exchange: profile?.exchange || "N/A",
    logo: profile?.logo || null,
    currentPrice,
    marketCap,
    peTTM,
    psTTM,
    pbAnnual,
    evToEbitda,
    grossMargin,
    operatingMargin,
    netMargin,
    roe,
    roa,
    currentRatio,
    quickRatio,
    debtToEquity,
    revenueGrowth,
    epsGrowth,
    ebitdaCagr5Y,
    beta,
    dividendYield,
    revenue,
    netIncome,
    operatingIncome,
    ebitda,
    freeCashFlow,
    priceMomentum1Y,
    volatility,
    maxDrawdown,
    trendStrength,
  };
}

function buildScore(metrics) {
  const valuation = weightedAverage([
    {
      name: "P/E Ratio",
      score: scoreLowerBetter(metrics.peTTM, 12, 45),
      weight: 0.25,
    },
    {
      name: "Price/Sales",
      score: scoreLowerBetter(metrics.psTTM, 2, 15),
      weight: 0.2,
    },
    {
      name: "Price/Book",
      score: scoreLowerBetter(metrics.pbAnnual, 2, 18),
      weight: 0.15,
    },
    {
      name: "EV/EBITDA",
      score: scoreLowerBetter(metrics.evToEbitda, 8, 35),
      weight: 0.25,
    },
    {
      name: "Market Cap Stability",
      score: scoreHigherBetter(metrics.marketCap, 250_000_000_000, 1_000_000_000),
      weight: 0.15,
    },
  ]);

  const profitability = weightedAverage([
    {
      name: "Gross Margin",
      score: scoreHigherBetter(metrics.grossMargin, 65, 15),
      weight: 0.2,
    },
    {
      name: "Operating Margin",
      score: scoreHigherBetter(metrics.operatingMargin, 30, 0),
      weight: 0.2,
    },
    {
      name: "Net Margin",
      score: scoreHigherBetter(metrics.netMargin, 25, -5),
      weight: 0.2,
    },
    {
      name: "ROE",
      score: scoreHigherBetter(metrics.roe, 30, 0),
      weight: 0.2,
    },
    {
      name: "ROA",
      score: scoreHigherBetter(metrics.roa, 15, 0),
      weight: 0.1,
    },
    {
      name: "EBITDA",
      score: scoreHigherBetter(metrics.ebitda, 50_000_000_000, 0),
      weight: 0.1,
    },
  ]);

  const growth = weightedAverage([
    {
      name: "Revenue Growth",
      score: scoreHigherBetter(metrics.revenueGrowth, 25, -10),
      weight: 0.35,
    },
    {
      name: "EPS Growth",
      score: scoreHigherBetter(metrics.epsGrowth, 25, -15),
      weight: 0.35,
    },
    {
      name: "EBITDA Growth",
      score: scoreHigherBetter(metrics.ebitdaCagr5Y, 20, -10),
      weight: 0.15,
    },
    {
      name: "Price Momentum",
      score: scoreHigherBetter(metrics.priceMomentum1Y, 40, -30),
      weight: 0.15,
    },
  ]);

  const financialStrength = weightedAverage([
    {
      name: "Current Ratio",
      score: scoreHigherBetter(metrics.currentRatio, 2.5, 0.7),
      weight: 0.25,
    },
    {
      name: "Quick Ratio",
      score: scoreHigherBetter(metrics.quickRatio, 1.8, 0.5),
      weight: 0.2,
    },
    {
      name: "Debt/Equity",
      score: scoreLowerBetter(metrics.debtToEquity, 0.3, 3),
      weight: 0.25,
    },
    {
      name: "Free Cash Flow",
      score: scoreHigherBetter(metrics.freeCashFlow, 20_000_000_000, -1_000_000_000),
      weight: 0.15,
    },
    {
      name: "Net Income",
      score: scoreHigherBetter(metrics.netIncome, 25_000_000_000, -1_000_000_000),
      weight: 0.15,
    },
  ]);

  const momentum = weightedAverage([
    {
      name: "1Y Price Momentum",
      score: scoreHigherBetter(metrics.priceMomentum1Y, 45, -35),
      weight: 0.35,
    },
    {
      name: "Trend vs SMA50",
      score: scoreHigherBetter(metrics.trendStrength, 15, -15),
      weight: 0.25,
    },
    {
      name: "Volatility Control",
      score: scoreLowerBetter(metrics.volatility, 18, 70),
      weight: 0.2,
    },
    {
      name: "Drawdown Control",
      score: scoreLowerBetter(metrics.maxDrawdown, 12, 60),
      weight: 0.2,
    },
  ]);

  const risk = weightedAverage([
    {
      name: "Beta",
      score: scoreLowerBetter(Math.abs((metrics.beta ?? 1) - 1), 0.05, 1.5),
      weight: 0.25,
    },
    {
      name: "Volatility",
      score: scoreLowerBetter(metrics.volatility, 18, 75),
      weight: 0.3,
    },
    {
      name: "Max Drawdown",
      score: scoreLowerBetter(metrics.maxDrawdown, 10, 65),
      weight: 0.25,
    },
    {
      name: "Debt Risk",
      score: scoreLowerBetter(metrics.debtToEquity, 0.4, 3.5),
      weight: 0.2,
    },
  ]);

  const finalScore = weightedAverage([
    {
      name: "Valuation",
      score: valuation.score,
      weight: 0.18,
    },
    {
      name: "Profitability",
      score: profitability.score,
      weight: 0.22,
    },
    {
      name: "Growth",
      score: growth.score,
      weight: 0.2,
    },
    {
      name: "Financial Strength",
      score: financialStrength.score,
      weight: 0.17,
    },
    {
      name: "Momentum",
      score: momentum.score,
      weight: 0.13,
    },
    {
      name: "Risk Control",
      score: risk.score,
      weight: 0.1,
    },
  ]);

  const powerScore = finalScore.score === null ? null : Number((finalScore.score / 10).toFixed(1));

  let rating = "N/A";
  let riskLabel = "N/A";

  if (powerScore !== null) {
    if (powerScore >= 8.5) rating = "Strong Buy";
    else if (powerScore >= 7.3) rating = "Buy";
    else if (powerScore >= 6.2) rating = "Hold";
    else if (powerScore >= 5.0) rating = "Weak Hold";
    else rating = "Avoid";
  }

  if (risk.score !== null) {
    if (risk.score >= 75) riskLabel = "Low Risk";
    else if (risk.score >= 55) riskLabel = "Medium Risk";
    else riskLabel = "High Risk";
  }

  return {
    powerScore,
    rating,
    riskLabel,
    categories: {
      valuation,
      profitability,
      growth,
      financialStrength,
      momentum,
      risk,
    },
    finalUsedCategories: finalScore.used,
    finalSkippedCategories: finalScore.skipped,
  };
}

export function buildInvestmentRecommendation({ amount, analysis }) {
  const investmentAmount = cleanNumber(amount);

  if (investmentAmount === null || investmentAmount <= 0 || !analysis?.score?.powerScore) {
    return {
      available: false,
      recommendedPercent: null,
      recommendedDollarAmount: null,
      explanation: "Enter a valid amount to calculate a recommendation.",
    };
  }

  const powerScore = analysis.score.powerScore;
  const riskScore = analysis.score.categories?.risk?.score;
  const valuationScore = analysis.score.categories?.valuation?.score;
  const profitabilityScore = analysis.score.categories?.profitability?.score;
  const growthScore = analysis.score.categories?.growth?.score;
  const momentumScore = analysis.score.categories?.momentum?.score;
  const financialStrengthScore = analysis.score.categories?.financialStrength?.score;

  const allocationScore = weightedAverage([
    {
      name: "Power Score",
      score: powerScore * 10,
      weight: 0.3,
    },
    {
      name: "Risk Control",
      score: riskScore,
      weight: 0.2,
    },
    {
      name: "Valuation",
      score: valuationScore,
      weight: 0.15,
    },
    {
      name: "Profitability",
      score: profitabilityScore,
      weight: 0.15,
    },
    {
      name: "Growth",
      score: growthScore,
      weight: 0.1,
    },
    {
      name: "Financial Strength",
      score: financialStrengthScore,
      weight: 0.1,
    },
    {
      name: "Momentum",
      score: momentumScore,
      weight: 0.05,
    },
  ]);

  if (allocationScore.score === null) {
    return {
      available: false,
      recommendedPercent: null,
      recommendedDollarAmount: null,
      explanation: "Not enough valid metrics were available to calculate an investment recommendation.",
    };
  }

  let recommendedPercent;

  if (allocationScore.score >= 85) recommendedPercent = 70;
  else if (allocationScore.score >= 75) recommendedPercent = 55;
  else if (allocationScore.score >= 65) recommendedPercent = 40;
  else if (allocationScore.score >= 55) recommendedPercent = 25;
  else if (allocationScore.score >= 45) recommendedPercent = 12;
  else recommendedPercent = 5;

  if (analysis.score.riskLabel === "High Risk") {
    recommendedPercent *= 0.65;
  }

  if (valuationScore !== null && valuationScore < 35) {
    recommendedPercent *= 0.75;
  }

  recommendedPercent = Math.round(recommendedPercent);

  const recommendedDollarAmount = investmentAmount * (recommendedPercent / 100);

  return {
    available: true,
    recommendedPercent,
    recommendedDollarAmount: Number(recommendedDollarAmount.toFixed(2)),
    usedMetrics: allocationScore.used,
    skippedMetrics: allocationScore.skipped,
    explanation: `Based on the current Power Score, risk level, valuation, profitability, growth, and financial strength, the suggested allocation is ${recommendedPercent}% of the amount entered.`,
  };
}

export function buildStockAnalysis({ ticker, profile, quote, metricData, secFacts, candles }) {
  const metrics = calculateMetrics({
    ticker,
    profile,
    quote,
    metricData,
    secFacts,
    candles,
  });

  const score = buildScore(metrics);

  return {
    ticker,
    companyName: metrics.companyName,
    description: metrics.description,
    industry: metrics.industry,
    exchange: metrics.exchange,
    logo: metrics.logo,
    currentPrice: metrics.currentPrice,
    score,
    metrics: {
      marketCap: metrics.marketCap,
      currentPrice: metrics.currentPrice,
      peTTM: metrics.peTTM,
      psTTM: metrics.psTTM,
      pbAnnual: metrics.pbAnnual,
      evToEbitda: metrics.evToEbitda,
      grossMargin: metrics.grossMargin,
      operatingMargin: metrics.operatingMargin,
      netMargin: metrics.netMargin,
      roe: metrics.roe,
      roa: metrics.roa,
      currentRatio: metrics.currentRatio,
      quickRatio: metrics.quickRatio,
      debtToEquity: metrics.debtToEquity,
      revenueGrowth: metrics.revenueGrowth,
      epsGrowth: metrics.epsGrowth,
      ebitdaCagr5Y: metrics.ebitdaCagr5Y,
      beta: metrics.beta,
      dividendYield: metrics.dividendYield,
      revenue: metrics.revenue,
      netIncome: metrics.netIncome,
      operatingIncome: metrics.operatingIncome,
      ebitda: metrics.ebitda,
      freeCashFlow: metrics.freeCashFlow,
      priceMomentum1Y: metrics.priceMomentum1Y,
      volatility: metrics.volatility,
      maxDrawdown: metrics.maxDrawdown,
      trendStrength: metrics.trendStrength,
    },
    displayMetrics: {
      marketCap: formatMoney(metrics.marketCap),
      revenue: formatMoney(metrics.revenue),
      netIncome: formatMoney(metrics.netIncome),
      operatingIncome: formatMoney(metrics.operatingIncome),
      ebitda: formatMoney(metrics.ebitda),
      freeCashFlow: formatMoney(metrics.freeCashFlow),
    },
  };
}
