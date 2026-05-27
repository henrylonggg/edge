const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

function clamp(value, min = 0, max = 10) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function clamp100(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function avg(values, fallback = 6) {
  const nums = values.map(safeNumber).filter((v) => v !== null);
  if (!nums.length) return fallback;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function metric(value, suffix = "", source = "Finnhub", formula = "") {
  return {
    value: safeNumber(value),
    suffix,
    source,
    formula,
  };
}

function getDateYearsAgo(years) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
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

async function fetchFinnhubSafe(path, params = {}, fallback = null) {
  try {
    return await fetchFinnhub(path, params);
  } catch (err) {
    console.warn(`Optional Finnhub endpoint failed: ${path}`, err.message);
    return fallback;
  }
}

/* ---------------------------
   SCORING HELPERS
---------------------------- */

function scoreGrowth(value) {
  const g = safeNumber(value);
  if (g === null) return null;

  if (g >= 50) return 10;
  if (g >= 40) return 9.5;
  if (g >= 30) return 9;
  if (g >= 22) return 8.5;
  if (g >= 15) return 8;
  if (g >= 10) return 7.5;
  if (g >= 6) return 7;
  if (g >= 3) return 6.5;
  if (g >= 0) return 6;
  if (g >= -3) return 5;
  if (g >= -7) return 4;
  if (g >= -12) return 3;
  return 2;
}

function scoreMargin(value) {
  const m = safeNumber(value);
  if (m === null) return null;

  if (m >= 40) return 10;
  if (m >= 32) return 9.5;
  if (m >= 25) return 9;
  if (m >= 20) return 8.5;
  if (m >= 15) return 7.5;
  if (m >= 10) return 7;
  if (m >= 6) return 6.5;
  if (m >= 3) return 6;
  if (m >= 0) return 5;
  if (m >= -3) return 4;
  if (m >= -8) return 3;
  return 2;
}

function scoreReturn(value) {
  const r = safeNumber(value);
  if (r === null) return null;

  if (r >= 50) return 10;
  if (r >= 40) return 9.5;
  if (r >= 30) return 9;
  if (r >= 24) return 8.5;
  if (r >= 18) return 8;
  if (r >= 12) return 7.5;
  if (r >= 8) return 7;
  if (r >= 5) return 6.5;
  if (r >= 2) return 6;
  if (r >= 0) return 5;
  if (r >= -5) return 3.5;
  return 2;
}

function scoreValuationMultiple(value, type = "pe") {
  const v = safeNumber(value);
  if (v === null || v <= 0) return null;

  if (type === "ps") {
    if (v <= 1) return 10;
    if (v <= 2) return 9;
    if (v <= 3) return 8;
    if (v <= 4.5) return 7.5;
    if (v <= 6) return 6.8;
    if (v <= 8) return 6;
    if (v <= 11) return 5;
    if (v <= 15) return 4;
    return 3;
  }

  if (type === "pb") {
    if (v <= 1) return 10;
    if (v <= 1.8) return 9;
    if (v <= 2.8) return 8;
    if (v <= 4) return 7;
    if (v <= 6) return 6;
    if (v <= 9) return 5;
    if (v <= 13) return 4;
    return 3;
  }

  if (type === "peg") {
    if (v <= 0.7) return 10;
    if (v <= 1) return 9;
    if (v <= 1.3) return 8;
    if (v <= 1.7) return 7;
    if (v <= 2.2) return 6;
    if (v <= 3) return 5;
    if (v <= 4) return 4;
    return 3;
  }

  if (type === "evEbitda") {
    if (v <= 7) return 10;
    if (v <= 10) return 9;
    if (v <= 13) return 8;
    if (v <= 16) return 7;
    if (v <= 20) return 6;
    if (v <= 26) return 5;
    if (v <= 35) return 4;
    return 3;
  }

  // Default = P/E or Forward P/E
  if (v <= 10) return 10;
  if (v <= 14) return 9;
  if (v <= 18) return 8.2;
  if (v <= 22) return 7.5;
  if (v <= 28) return 6.8;
  if (v <= 35) return 6;
  if (v <= 45) return 5.2;
  if (v <= 60) return 4.5;
  if (v <= 80) return 3.8;
  if (v <= 100) return 3.2;
  return 2.8;
}

function scoreDebtToEquity(value) {
  const d = safeNumber(value);
  if (d === null) return null;

  if (d <= 0.15) return 10;
  if (d <= 0.35) return 9.5;
  if (d <= 0.6) return 9;
  if (d <= 0.9) return 8;
  if (d <= 1.2) return 7.2;
  if (d <= 1.7) return 6.3;
  if (d <= 2.3) return 5.2;
  if (d <= 3) return 4;
  if (d <= 4) return 3;
  return 2;
}

function scoreLiquidity(value) {
  const r = safeNumber(value);
  if (r === null) return null;

  if (r >= 3) return 9.5;
  if (r >= 2.4) return 9;
  if (r >= 2) return 8.5;
  if (r >= 1.6) return 8;
  if (r >= 1.3) return 7.2;
  if (r >= 1.1) return 6.5;
  if (r >= 1) return 6;
  if (r >= 0.85) return 5;
  if (r >= 0.7) return 4;
  return 3;
}

function scoreBeta(value) {
  const b = safeNumber(value);
  if (b === null) return null;

  if (b >= 0.85 && b <= 1.15) return 9;
  if (b >= 0.7 && b < 0.85) return 8;
  if (b > 1.15 && b <= 1.35) return 8;
  if (b > 1.35 && b <= 1.55) return 7;
  if (b > 1.55 && b <= 1.8) return 6;
  if (b > 1.8 && b <= 2.1) return 5;
  if (b > 2.1) return 4;
  return 6.5;
}

function scoreMarketCap(marketCapM) {
  const cap = safeNumber(marketCapM);
  if (cap === null) return null;

  if (cap >= 1000000) return 9.5;
  if (cap >= 500000) return 9;
  if (cap >= 250000) return 8.5;
  if (cap >= 100000) return 8;
  if (cap >= 50000) return 7.5;
  if (cap >= 10000) return 7;
  if (cap >= 3000) return 6;
  if (cap >= 1000) return 5;
  return 4;
}

function scoreDayMomentum(dayChangePercent) {
  const dp = safeNumber(dayChangePercent);
  if (dp === null) return null;

  if (dp >= 7) return 6.5;
  if (dp >= 5) return 7;
  if (dp >= 3) return 8;
  if (dp >= 1.5) return 7.5;
  if (dp >= 0.5) return 7;
  if (dp >= -0.5) return 6.5;
  if (dp >= -1.5) return 6;
  if (dp >= -3) return 5.2;
  if (dp >= -5) return 4.5;
  return 3.5;
}

function scorePullback(dayChangePercent) {
  const dp = safeNumber(dayChangePercent);
  if (dp === null) return null;

  if (dp <= -10) return 8.5;
  if (dp <= -7) return 8.2;
  if (dp <= -5) return 8;
  if (dp <= -3) return 7.5;
  if (dp <= -1.5) return 7;
  if (dp <= 0) return 6.5;
  if (dp <= 2) return 6;
  if (dp <= 4) return 5.5;
  return 5;
}

function scoreWeek52Position(currentPrice, low52, high52) {
  const price = safeNumber(currentPrice);
  const low = safeNumber(low52);
  const high = safeNumber(high52);

  if (price === null || low === null || high === null || high <= low) return null;

  const position = ((price - low) / (high - low)) * 100;

  if (position >= 50 && position <= 82) return 8.5;
  if (position > 82 && position <= 92) return 7.5;
  if (position > 92 && position <= 98) return 6.5;
  if (position > 98) return 5.7;
  if (position >= 35 && position < 50) return 7.5;
  if (position >= 20 && position < 35) return 6.8;
  return 5.8;
}

function scoreAnalystRecommendations(recommendations) {
  if (!Array.isArray(recommendations) || !recommendations.length) return null;

  const latest = recommendations[0];

  const strongBuy = safeNumber(latest.strongBuy) || 0;
  const buy = safeNumber(latest.buy) || 0;
  const hold = safeNumber(latest.hold) || 0;
  const sell = safeNumber(latest.sell) || 0;
  const strongSell = safeNumber(latest.strongSell) || 0;

  const total = strongBuy + buy + hold + sell + strongSell;
  if (!total) return null;

  const weighted =
    strongBuy * 10 +
    buy * 8.5 +
    hold * 6 +
    sell * 3.5 +
    strongSell * 2;

  return Number(clamp(weighted / total).toFixed(1));
}

function scoreEarningsSurprise(earnings) {
  if (!Array.isArray(earnings) || !earnings.length) return null;

  const recent = earnings.slice(0, 4);

  const scores = recent.map((item) => {
    const surprise = safeNumber(item.surprisePercent);

    if (surprise === null) return null;
    if (surprise >= 25) return 10;
    if (surprise >= 15) return 9;
    if (surprise >= 8) return 8;
    if (surprise >= 3) return 7;
    if (surprise >= 0) return 6;
    if (surprise >= -5) return 4.8;
    if (surprise >= -15) return 3.5;
    return 2.5;
  });

  return Number(avg(scores, 6).toFixed(1));
}

function scoreInsiderSentiment(insiderSentiment) {
  if (!Array.isArray(insiderSentiment) || !insiderSentiment.length) return null;

  const recent = insiderSentiment.slice(-6);

  const scores = recent.map((item) => {
    const mspr = safeNumber(item.mspr);
    const change = safeNumber(item.change);

    if (mspr === null && change === null) return null;

    let score = 6;

    if (mspr !== null) {
      if (mspr >= 80) score += 2;
      else if (mspr >= 40) score += 1.2;
      else if (mspr >= 10) score += 0.5;
      else if (mspr <= -80) score -= 2;
      else if (mspr <= -40) score -= 1.2;
      else if (mspr <= -10) score -= 0.5;
    }

    if (change !== null) {
      if (change > 0) score += 0.4;
      else if (change < 0) score -= 0.4;
    }

    return clamp(score);
  });

  return Number(avg(scores, 6).toFixed(1));
}

function scoreSocialSentiment(socialSentiment) {
  const reddit = socialSentiment?.reddit || [];
  const twitter = socialSentiment?.twitter || [];

  const combined = [...reddit, ...twitter].slice(-20);
  if (!combined.length) return null;

  const scores = combined.map((item) => {
    const positive = safeNumber(item.positiveMention);
    const negative = safeNumber(item.negativeMention);

    if (positive === null && negative === null) return null;

    const pos = positive || 0;
    const neg = negative || 0;
    const total = pos + neg;

    if (!total) return 6;

    const ratio = pos / total;

    if (ratio >= 0.85) return 9;
    if (ratio >= 0.75) return 8;
    if (ratio >= 0.65) return 7;
    if (ratio >= 0.55) return 6.5;
    if (ratio >= 0.45) return 6;
    if (ratio >= 0.35) return 5;
    return 4;
  });

  return Number(avg(scores, 6).toFixed(1));
}

function scorePriceTarget(currentPrice, targetData) {
  const price = safeNumber(currentPrice);
  const target = safeNumber(targetData?.targetMean);

  if (price === null || target === null || price <= 0) return null;

  const upside = ((target - price) / price) * 100;

  if (upside >= 40) return 10;
  if (upside >= 28) return 9;
  if (upside >= 18) return 8;
  if (upside >= 10) return 7;
  if (upside >= 3) return 6.2;
  if (upside >= -5) return 5.2;
  if (upside >= -15) return 4;
  return 3;
}

function calculateDataConfidence(values) {
  const total = values.length;
  const present = values.filter((v) => safeNumber(v) !== null).length;

  if (!total) return 70;

  const confidence = (present / total) * 100;
  return Number(clamp100(confidence, 35, 100).toFixed(0));
}

function getRiskLabel(beta, debtToEquity, currentRatio, quickRatio) {
  const b = safeNumber(beta) ?? 1;
  const d = safeNumber(debtToEquity) ?? 0;
  const c = safeNumber(currentRatio) ?? 1.5;
  const q = safeNumber(quickRatio) ?? 1.2;

  if (b >= 1.9 || d >= 3.5 || c < 0.8 || q < 0.6) return "High";
  if (b >= 1.35 || d >= 1.75 || c < 1.05 || q < 0.9) return "Medium";
  return "Low";
}

function getRatingLabel(score) {
  if (score >= 90) return "Elite";
  if (score >= 82) return "Strong Buy";
  if (score >= 74) return "Buy";
  if (score >= 64) return "Hold";
  if (score >= 52) return "Weak Hold";
  return "Avoid";
}

/* ---------------------------
   MAIN ANALYSIS
---------------------------- */

export async function buildStockAnalysis(symbol) {
  const cleanSymbol = String(symbol || "").trim().toUpperCase();

  if (!cleanSymbol) {
    throw new Error("Missing ticker symbol.");
  }

  const fromDate = getDateYearsAgo(1);
  const toDate = getTodayDate();

  const [
    profile,
    quote,
    metricsRaw,
    recommendations,
    earnings,
    priceTarget,
    insiderSentiment,
    socialSentiment,
  ] = await Promise.all([
    fetchFinnhub("/stock/profile2", { symbol: cleanSymbol }),
    fetchFinnhub("/quote", { symbol: cleanSymbol }),
    fetchFinnhub("/stock/metric", { symbol: cleanSymbol, metric: "all" }),

    fetchFinnhubSafe("/stock/recommendation", { symbol: cleanSymbol }, []),
    fetchFinnhubSafe("/stock/earnings", { symbol: cleanSymbol }, []),
    fetchFinnhubSafe("/stock/price-target", { symbol: cleanSymbol }, null),
    fetchFinnhubSafe(
      "/stock/insider-sentiment",
      { symbol: cleanSymbol, from: fromDate, to: toDate },
      { data: [] }
    ),
    fetchFinnhubSafe(
      "/stock/social-sentiment",
      { symbol: cleanSymbol, from: fromDate },
      { reddit: [], twitter: [] }
    ),
  ]);

  if (!profile || !profile.ticker) {
    throw new Error(`No company profile found for ${cleanSymbol}.`);
  }

  const m = metricsRaw?.metric || {};

  const currentPrice = safeNumber(quote.c);
  const previousClose = safeNumber(quote.pc);
  const dayChangePercent = safeNumber(quote.dp);

  const marketCapM = safeNumber(profile.marketCapitalization);

  const peRatio = safeNumber(
    m.peNormalizedAnnual ||
      m.peTTM ||
      m.peBasicExclExtraTTM ||
      m.peInclExtraTTM
  );

  const forwardPe = safeNumber(
    m.forwardPE ||
      m.peForwardAnnual
  );

  const psRatio = safeNumber(
    m.psTTM ||
      m.psAnnual ||
      m.priceToSalesRatioTTM
  );

  const pbRatio = safeNumber(
    m.pbAnnual ||
      m.pbQuarterly ||
      m.priceToBookAnnual
  );

  const pegRatio = safeNumber(
    m.pegRatio ||
      m.pegAnnual ||
      m.pegTTM
  );

  const evToEbitda = safeNumber(
    m.evToEbitdaTTM ||
      m.evToEbitdaAnnual ||
      m.enterpriseValueOverEBITDA
  );

  const roe = safeNumber(m.roeTTM || m.roeRfy);
  const roa = safeNumber(m.roaTTM || m.roaRfy);
  const roi = safeNumber(m.roiTTM || m.roiAnnual);

  const grossMargin = safeNumber(
    m.grossMarginTTM ||
      m.grossMarginAnnual
  );

  const operatingMargin = safeNumber(
    m.operatingMarginTTM ||
      m.operatingMarginAnnual
  );

  const netMargin = safeNumber(
    m.netProfitMarginTTM ||
      m.netProfitMarginAnnual
  );

  const pretaxMargin = safeNumber(
    m.pretaxMarginTTM ||
      m.pretaxMarginAnnual
  );

  const revenueGrowth = safeNumber(
    m.revenueGrowthTTMYoy ||
      m.revenueGrowthQuarterlyYoy ||
      m.revenueGrowth3Y ||
      m.revenueGrowth5Y
  );

  const epsGrowth = safeNumber(
    m.epsGrowthTTMYoy ||
      m.epsGrowthQuarterlyYoy ||
      m.epsGrowth3Y ||
      m.epsGrowth5Y
  );

  const ebitdaGrowth = safeNumber(
    m.ebitdaCagr5Y ||
      m.ebitdaGrowth5Y ||
      m.ebitdaGrowthTTMYoy
  );

  const operatingIncomeGrowth = safeNumber(
    m.operatingIncomeGrowthTTMYoy ||
      m.operatingIncomeGrowth5Y
  );

  const netIncomeGrowth = safeNumber(
    m.netIncomeGrowthTTMYoy ||
      m.netIncomeGrowth5Y
  );

  const debtToEquity = safeNumber(
    m["totalDebt/totalEquityAnnual"] ||
      m["totalDebt/totalEquityQuarterly"]
  );

  const currentRatio = safeNumber(
    m.currentRatioAnnual ||
      m.currentRatioQuarterly
  );

  const quickRatio = safeNumber(
    m.quickRatioAnnual ||
      m.quickRatioQuarterly
  );

  const cashRatio = safeNumber(
    m.cashRatioAnnual ||
      m.cashRatioQuarterly
  );

  const beta = safeNumber(m.beta);

  const week52High = safeNumber(
    m["52WeekHigh"] ||
      m.high52Week
  );

  const week52Low = safeNumber(
    m["52WeekLow"] ||
      m.low52Week
  );

  const dividendYield = safeNumber(
    m.dividendYieldIndicatedAnnual ||
      m.currentDividendYieldTTM
  );

  const payoutRatio = safeNumber(
    m.payoutRatioAnnual ||
      m.payoutRatioTTM
  );

  const revenuePerShare = safeNumber(m.revenuePerShareTTM);
  const bookValuePerShare = safeNumber(m.bookValuePerShareAnnual);
  const cashFlowPerShare = safeNumber(m.cashFlowPerShareTTM);
  const freeCashFlowPerShare = safeNumber(m.freeCashFlowPerShareTTM);

  /* ---------------------------
     CATEGORY SCORES
  ---------------------------- */

  const growthScore = Number(
    avg(
      [
        scoreGrowth(revenueGrowth),
        scoreGrowth(epsGrowth),
        scoreGrowth(ebitdaGrowth),
        scoreGrowth(operatingIncomeGrowth),
        scoreGrowth(netIncomeGrowth),
      ],
      6
    ).toFixed(1)
  );

  const profitabilityScore = Number(
    avg(
      [
        scoreReturn(roe),
        scoreReturn(roa),
        scoreReturn(roi),
        scoreMargin(grossMargin),
        scoreMargin(operatingMargin),
        scoreMargin(netMargin),
        scoreMargin(pretaxMargin),
      ],
      6
    ).toFixed(1)
  );

  let valuationScore = Number(
    avg(
      [
        scoreValuationMultiple(peRatio, "pe"),
        scoreValuationMultiple(forwardPe, "pe"),
        scoreValuationMultiple(psRatio, "ps"),
        scoreValuationMultiple(pbRatio, "pb"),
        scoreValuationMultiple(pegRatio, "peg"),
        scoreValuationMultiple(evToEbitda, "evEbitda"),
      ],
      6
    ).toFixed(1)
  );

  // Quality-growth cushion: strong companies should not be destroyed only because valuation is expensive.
  if (growthScore >= 8.5 && profitabilityScore >= 8.5) {
    valuationScore += 0.7;
  } else if (growthScore >= 8 && profitabilityScore >= 8) {
    valuationScore += 0.4;
  }

  valuationScore = Number(clamp(valuationScore, 2.5, 10).toFixed(1));

  const balanceSheetScore = Number(
    avg(
      [
        scoreDebtToEquity(debtToEquity),
        scoreLiquidity(currentRatio),
        scoreLiquidity(quickRatio),
        scoreLiquidity(cashRatio),
        scoreMarketCap(marketCapM),
      ],
      6
    ).toFixed(1)
  );

  const momentumScore = Number(
    avg(
      [
        scoreDayMomentum(dayChangePercent),
        scoreBeta(beta),
        scoreWeek52Position(currentPrice, week52Low, week52High),
      ],
      6
    ).toFixed(1)
  );

  const analystScore = scoreAnalystRecommendations(recommendations);
  const earningsScore = scoreEarningsSurprise(earnings);
  const insiderScore = scoreInsiderSentiment(insiderSentiment?.data);
  const socialScore = scoreSocialSentiment(socialSentiment);
  const targetScore = scorePriceTarget(currentPrice, priceTarget);

  const sentimentScore = Number(
    avg(
      [
        analystScore,
        earningsScore,
        insiderScore,
        socialScore,
        targetScore,
      ],
      6
    ).toFixed(1)
  );

  const reversalScore = Number(
    avg(
      [
        scorePullback(dayChangePercent),
        scoreWeek52Position(currentPrice, week52Low, week52High),
      ],
      6
    ).toFixed(1)
  );

  const dividendScore = Number(
    avg(
      [
        dividendYield !== null
          ? dividendYield >= 5
            ? 8
            : dividendYield >= 3
            ? 7.5
            : dividendYield >= 1.5
            ? 7
            : dividendYield > 0
            ? 6.5
            : 6
          : null,
        payoutRatio !== null
          ? payoutRatio <= 35
            ? 8
            : payoutRatio <= 55
            ? 7
            : payoutRatio <= 75
            ? 6
            : 4.5
          : null,
      ],
      6
    ).toFixed(1)
  );

  const dataConfidence = calculateDataConfidence([
    peRatio,
    forwardPe,
    psRatio,
    pbRatio,
    pegRatio,
    evToEbitda,
    roe,
    roa,
    roi,
    grossMargin,
    operatingMargin,
    netMargin,
    pretaxMargin,
    revenueGrowth,
    epsGrowth,
    ebitdaGrowth,
    operatingIncomeGrowth,
    netIncomeGrowth,
    debtToEquity,
    currentRatio,
    quickRatio,
    cashRatio,
    beta,
    marketCapM,
    dayChangePercent,
    currentPrice,
    previousClose,
    week52High,
    week52Low,
    revenuePerShare,
    bookValuePerShare,
    cashFlowPerShare,
    freeCashFlowPerShare,
  ]);

  /*
    Final Edge Power Score:

    Growth: 18%
    Profitability / Quality: 20%
    Valuation: 15%
    Balance Sheet: 15%
    Momentum: 10%
    Sentiment / Analyst / Earnings: 12%
    Pullback Opportunity: 5%
    Dividend / Shareholder Yield: 5%

    This makes the score more complete and prevents one metric from controlling everything.
  */

  let edgeScore =
    growthScore * 0.18 +
    profitabilityScore * 0.2 +
    valuationScore * 0.15 +
    balanceSheetScore * 0.15 +
    momentumScore * 0.1 +
    sentimentScore * 0.12 +
    reversalScore * 0.05 +
    dividendScore * 0.05;

  // Pull toward neutral when Finnhub returns weak/incomplete data.
  const confidenceWeight = dataConfidence / 100;
  edgeScore = edgeScore * confidenceWeight + 6 * (1 - confidenceWeight);

  const powerScore = Number((edgeScore * 10).toFixed(0));
  const riskLabel = getRiskLabel(beta, debtToEquity, currentRatio, quickRatio);
  const ratingLabel = getRatingLabel(powerScore);

  return {
    symbol: cleanSymbol,
    profile,
    quote,

    companyDescription: `${profile.name || cleanSymbol} is a publicly traded company in the ${
      profile.finnhubIndustry || "market"
    } industry.`,

    evaluationSummary: `${cleanSymbol} has an Edge Power Score of ${powerScore}/100. This score uses growth, profitability, valuation, balance sheet strength, momentum, analyst recommendations, earnings surprises, insider sentiment, social sentiment, price target upside, dividends, pullback opportunity, and data confidence.`,

    metrics: {
      currentPrice: metric(currentPrice, "$", "Finnhub", "Latest stock price"),
      previousClose: metric(previousClose, "$", "Finnhub", "Previous close"),
      dayChangePercent: metric(dayChangePercent, "%", "Finnhub", "Daily percentage change"),

      peRatio: metric(peRatio, "", "Finnhub", "Price / Earnings"),
      forwardPe: metric(forwardPe, "", "Finnhub", "Forward Price / Earnings"),
      psRatio: metric(psRatio, "", "Finnhub", "Price / Sales"),
      pbRatio: metric(pbRatio, "", "Finnhub", "Price / Book"),
      pegRatio: metric(pegRatio, "", "Finnhub", "P/E adjusted for growth"),
      evToEbitda: metric(evToEbitda, "", "Finnhub", "Enterprise Value / EBITDA"),

      roe: metric(roe, "%", "Finnhub", "Net Income / Shareholder Equity"),
      roa: metric(roa, "%", "Finnhub", "Net Income / Total Assets"),
      roi: metric(roi, "%", "Finnhub", "Return on Investment"),

      grossMargin: metric(grossMargin, "%", "Finnhub", "Gross Profit / Revenue"),
      operatingMargin: metric(operatingMargin, "%", "Finnhub", "Operating Income / Revenue"),
      netMargin: metric(netMargin, "%", "Finnhub", "Net Income / Revenue"),
      pretaxMargin: metric(pretaxMargin, "%", "Finnhub", "Pretax Income / Revenue"),

      revenueGrowth: metric(revenueGrowth, "%", "Finnhub", "Revenue growth"),
      epsGrowth: metric(epsGrowth, "%", "Finnhub", "EPS growth"),
      ebitdaGrowth: metric(ebitdaGrowth, "%", "Finnhub", "EBITDA growth"),
      operatingIncomeGrowth: metric(operatingIncomeGrowth, "%", "Finnhub", "Operating income growth"),
      netIncomeGrowth: metric(netIncomeGrowth, "%", "Finnhub", "Net income growth"),

      debtToEquity: metric(debtToEquity, "", "Finnhub", "Total Debt / Total Equity"),
      currentRatio: metric(currentRatio, "", "Finnhub", "Current Assets / Current Liabilities"),
      quickRatio: metric(quickRatio, "", "Finnhub", "Liquid Assets / Current Liabilities"),
      cashRatio: metric(cashRatio, "", "Finnhub", "Cash / Current Liabilities"),

      beta: metric(beta, "", "Finnhub", "Volatility compared with market"),
      week52High: metric(week52High, "$", "Finnhub", "52-week high"),
      week52Low: metric(week52Low, "$", "Finnhub", "52-week low"),

      dividendYield: metric(dividendYield, "%", "Finnhub", "Dividend yield"),
      payoutRatio: metric(payoutRatio, "%", "Finnhub", "Dividend payout ratio"),

      marketCapM: metric(marketCapM, "M", "Finnhub", "Market capitalization in millions"),
      revenuePerShare: metric(revenuePerShare, "$", "Finnhub", "Revenue per share"),
      bookValuePerShare: metric(bookValuePerShare, "$", "Finnhub", "Book value per share"),
      cashFlowPerShare: metric(cashFlowPerShare, "$", "Finnhub", "Cash flow per share"),
      freeCashFlowPerShare: metric(freeCashFlowPerShare, "$", "Finnhub", "Free cash flow per share"),
    },

    grades: {
      edgeScore: Number(edgeScore.toFixed(1)),
      powerScore,
      ratingLabel,
      riskLabel,
      dataConfidence,

      categories: {
        growth: growthScore,
        profitability: profitabilityScore,
        valuation: valuationScore,
        balanceSheet: balanceSheetScore,
        momentum: momentumScore,
        sentiment: sentimentScore,
        reversal: reversalScore,
        dividend: dividendScore,
      },

      categoryDetails: {
        growthMetricsUsed: [
          "Revenue growth",
          "EPS growth",
          "EBITDA growth",
          "Operating income growth",
          "Net income growth",
        ],
        profitabilityMetricsUsed: [
          "ROE",
          "ROA",
          "ROI",
          "Gross margin",
          "Operating margin",
          "Net margin",
          "Pretax margin",
        ],
        valuationMetricsUsed: [
          "P/E",
          "Forward P/E",
          "Price/Sales",
          "Price/Book",
          "PEG",
          "EV/EBITDA",
        ],
        balanceSheetMetricsUsed: [
          "Debt/equity",
          "Current ratio",
          "Quick ratio",
          "Cash ratio",
          "Market cap stability",
        ],
        momentumMetricsUsed: [
          "Daily change",
          "Beta",
          "52-week price position",
        ],
        sentimentMetricsUsed: [
          "Analyst recommendations",
          "Earnings surprises",
          "Insider sentiment",
          "Social sentiment",
          "Analyst price target upside",
        ],
      },

      weights: {
        growth: 18,
        profitability: 20,
        valuation: 15,
        balanceSheet: 15,
        momentum: 10,
        sentiment: 12,
        reversal: 5,
        dividend: 5,
      },

      context: {
        marketCapM,
        analystRecommendationsAvailable:
          Array.isArray(recommendations) && recommendations.length > 0,
        earningsHistoryAvailable:
          Array.isArray(earnings) && earnings.length > 0,
        insiderSentimentAvailable:
          Array.isArray(insiderSentiment?.data) && insiderSentiment.data.length > 0,
        socialSentimentAvailable:
          Boolean(
            socialSentiment &&
              ((Array.isArray(socialSentiment.reddit) && socialSentiment.reddit.length > 0) ||
                (Array.isArray(socialSentiment.twitter) && socialSentiment.twitter.length > 0))
          ),
        priceTargetAvailable: Boolean(priceTarget?.targetMean),
      },
    },

    raw: {
      recommendations,
      earnings: Array.isArray(earnings) ? earnings.slice(0, 4) : [],
      priceTarget,
      insiderSentiment: insiderSentiment?.data || [],
      socialSentiment,
    },
  };
}
