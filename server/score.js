
/*
  SCORE.JS PATCH

  1) Paste this whole helper block directly ABOVE:
     export async function buildStockAnalysis(symbol) {

  2) Then inside buildStockAnalysis, after:
     const riskLabel = getRiskLabel(extracted, healthScore, profitabilityScore);

     add:
     const historicalPowerTrend = await buildHistoricalPowerTrend(cleanSymbol, extracted);

  3) Then inside the returned object, directly after quote, add:
     historicalPowerTrend,
*/

function toUnixSeconds(date) {
  return Math.floor(date.getTime() / 1000);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatWeekStarting(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function getLastMondays(count = 10) {
  const now = new Date();
  now.setUTCHours(13, 0, 0, 0); // about 9 AM ET during daylight savings

  const day = now.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  const latestMonday = new Date(now);
  latestMonday.setUTCDate(now.getUTCDate() - daysSinceMonday);
  latestMonday.setUTCHours(13, 0, 0, 0);

  return Array.from({ length: count }, (_, index) => {
    const d = new Date(latestMonday);
    d.setUTCDate(latestMonday.getUTCDate() - (count - 1 - index) * 7);
    d.setUTCHours(13, 0, 0, 0);
    return d;
  });
}

function percentChange(current, previous) {
  const c = safeNumber(current);
  const p = safeNumber(previous);
  if (c === null || p === null || p === 0) return null;
  return ((c - p) / Math.abs(p)) * 100;
}

function normalizeDailyPrices(raw) {
  if (!raw || raw.s !== "ok" || !Array.isArray(raw.t)) return [];

  return raw.t
    .map((time, index) => ({
      time,
      date: new Date(time * 1000),
      open: safeNumber(raw.o?.[index]),
      high: safeNumber(raw.h?.[index]),
      low: safeNumber(raw.l?.[index]),
      close: safeNumber(raw.c?.[index]),
      volume: safeNumber(raw.v?.[index]),
    }))
    .filter((item) => item.close !== null)
    .sort((a, b) => a.time - b.time);
}

function findPriceIndexOnOrBefore(prices, targetDate) {
  const targetSeconds = toUnixSeconds(targetDate);
  let found = -1;

  for (let i = 0; i < prices.length; i += 1) {
    if (prices[i].time <= targetSeconds) found = i;
    else break;
  }

  return found;
}

function scoreHistoricalWeek(baseExtracted, prices, mondayDate) {
  const index = findPriceIndexOnOrBefore(prices, mondayDate);
  if (index < 1) return null;

  const current = prices[index];
  const previous = prices[index - 1];

  const lookbackClose = (tradingDays) =>
    index - tradingDays >= 0 ? prices[index - tradingDays].close : null;

  const trailingYear = prices.slice(Math.max(0, index - 252), index + 1);

  const highs = trailingYear
    .map((item) => item.high ?? item.close)
    .filter((value) => Number.isFinite(Number(value)));

  const lows = trailingYear
    .map((item) => item.low ?? item.close)
    .filter((value) => Number.isFinite(Number(value)));

  const weekHigh = highs.length ? Math.max(...highs) : null;
  const weekLow = lows.length ? Math.min(...lows) : null;

  const close = current.close;

  const historicalExtracted = {
    ...baseExtracted,

    dayChangePercent: percentChange(close, previous.close),
    priceReturn4Week: percentChange(close, lookbackClose(20)),
    priceReturn13Week: percentChange(close, lookbackClose(65)),
    priceReturn26Week: percentChange(close, lookbackClose(130)),
    priceReturn52Week: percentChange(close, lookbackClose(252)),

    weekHigh,
    weekLow,

    pullbackFromHigh:
      close !== null && weekHigh !== null && weekHigh !== 0
        ? ((close - weekHigh) / weekHigh) * 100
        : null,

    distanceFrom52WeekLow:
      close !== null && weekLow !== null && weekLow !== 0
        ? ((close - weekLow) / weekLow) * 100
        : null,
  };

  const growthScore = scoreGrowth(historicalExtracted);
  const profitabilityScore = scoreProfitability(historicalExtracted);
  const healthScore = scoreFinancialHealth(historicalExtracted);
  const valuationScore = scoreValuation(
    historicalExtracted,
    growthScore,
    profitabilityScore
  );
  const momentumScore = scoreMomentum(historicalExtracted);
  const reversalScore = scorePullback(historicalExtracted);

  const score = availableWeightedAverage(
    [
      { score: growthScore, weight: 0.235 },
      { score: profitabilityScore, weight: 0.225 },
      { score: healthScore, weight: 0.195 },
      { score: valuationScore, weight: 0.145 },
      { score: momentumScore, weight: 0.115 },
      { score: reversalScore, weight: 0.085 },
    ],
    null
  );

  if (score === null) return null;

  return {
    date: isoDate(mondayDate),
    label: formatWeekStarting(mondayDate),
    score: Number(score.toFixed(1)),
    price: close,
  };
}

async function buildHistoricalPowerTrend(symbol, baseExtracted) {
  try {
    const mondays = getLastMondays(10);

    const from = new Date(mondays[0]);
    from.setUTCDate(from.getUTCDate() - 430);

    const to = new Date();
    to.setUTCDate(to.getUTCDate() + 1);

    const rawPrices = await fetchFinnhubOptional("/stock/candle", {
      symbol,
      resolution: "D",
      from: toUnixSeconds(from),
      to: toUnixSeconds(to),
    });

    const prices = normalizeDailyPrices(rawPrices);

    if (!prices.length) {
      return {
        title: "10-Week Eval Score Trend",
        xAxisLabel: "Week Starting",
        yAxisLabel: "Eval Score",
        points: [],
      };
    }

    return {
      title: "10-Week Eval Score Trend",
      xAxisLabel: "Week Starting",
      yAxisLabel: "Eval Score",
      points: mondays
        .map((monday) => scoreHistoricalWeek(baseExtracted, prices, monday))
        .filter(Boolean),
    };
  } catch (error) {
    console.warn("Historical Eval Score trend failed:", error?.message || error);

    return {
      title: "10-Week Eval Score Trend",
      xAxisLabel: "Week Starting",
      yAxisLabel: "Eval Score",
      points: [],
    };
  }
}
