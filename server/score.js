// Eval update: removed Earnings Quality and Efficiency categories.
// Eval score.js momentum-return fix: Finnhub price-return fields are already percentages. Do not multiply them by 100.
const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const NEWS_SENTIMENT_MODEL = process.env.OPENAI_NEWS_MODEL || "gpt-4.1-nano";

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstNumber(...values) {
  for (const value of values) {
    const number = safeNumber(value);
    if (number !== null) return number;
  }
  return null;
}

function clamp(value, min = 0, max = 10) {
  const number = safeNumber(value);
  if (number === null) return null;
  return Math.max(min, Math.min(max, number));
}

function metric(value, suffix = "", source = "Finnhub", formula = "") {
  const number = safeNumber(value);
  return {
    value: number,
    suffix,
    source,
    formula,
  };
}

function divide(a, b) {
  const x = safeNumber(a);
  const y = safeNumber(b);
  if (x === null || y === null || y === 0) return null;
  return x / y;
}

function toMillions(value) {
  const n = safeNumber(value);
  return n === null ? null : n / 1_000_000;
}

function percentFromDecimal(value) {
  const n = scoreInputNumber(value);
  if (n === null) return null;
  return Math.abs(n) <= 1.5 ? n * 100 : n;
}

function scoreText(value) {
  const n = safeNumber(value);
  return n === null ? "N/A" : n.toFixed(1);
}

async function fetchFinnhub(path, params = {}) {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    throw new Error("Missing FINNHUB_API_KEY in Render environment variables.");
  }

  const url = new URL(`${FINNHUB_BASE_URL}${path}`);
  Object.entries({ ...params, token: apiKey }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Finnhub request failed for ${path}: ${response.status}`);
  }

  if (data?.error) {
    throw new Error(`Finnhub error for ${path}: ${data.error}`);
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

function scoreInputNumber(value) {
  const n = safeNumber(value);
  if (n === null || n === 0) return null;
  return n;
}

function metricScore(value, points) {
  const n = scoreInputNumber(value);
  if (n === null) return null;

  for (const [threshold, score] of points) {
    if (n >= threshold) return score;
  }

  return points.length ? points[points.length - 1][1] : null;
}

function inverseMetricScore(value, points) {
  const n = scoreInputNumber(value);
  if (n === null) return null;

  for (const [threshold, score] of points) {
    if (n <= threshold) return score;
  }

  return points.length ? points[points.length - 1][1] : null;
}

function availableWeightedAverage(items = [], fallback = null) {
  let total = 0;
  let weight = 0;

  for (const item of items) {
    const score = safeNumber(item?.score);
    const w = safeNumber(item?.weight) ?? 1;

    if (score !== null && w > 0) {
      total += score * w;
      weight += w;
    }
  }

  if (!weight) return fallback;
  return Number((total / weight).toFixed(1));
}

function getRiskLabel(metrics = {}, healthScore = null) {
  const beta = safeNumber(metrics.beta);
  const debtToEquity = safeNumber(metrics.debtToEquity);

  if ((beta !== null && beta >= 1.8) || (debtToEquity !== null && debtToEquity >= 3) || (healthScore !== null && healthScore <= 4)) {
    return "High";
  }

  if ((beta !== null && beta >= 1.25) || (debtToEquity !== null && debtToEquity >= 1.5) || (healthScore !== null && healthScore <= 6)) {
    return "Medium";
  }

  return "Low";
}

function gradeFrom10(value) {
  const score = safeNumber(value);
  if (score === null) return "N/A";
  if (score >= 9.3) return "A+";
  if (score >= 9.0) return "A";
  if (score >= 8.7) return "A-";
  if (score >= 8.3) return "B+";
  if (score >= 8.0) return "B";
  if (score >= 7.7) return "B-";
  if (score >= 7.3) return "C+";
  if (score >= 7.0) return "C";
  if (score >= 6.5) return "C-";
  if (score >= 6.0) return "D+";
  if (score >= 5.5) return "D";
  return "F";
}



function cleanConceptKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function reportedLineValue(statement = {}, aliases = []) {
  const rows = [
    ...(Array.isArray(statement?.ic) ? statement.ic : []),
    ...(Array.isArray(statement?.bs) ? statement.bs : []),
    ...(Array.isArray(statement?.cf) ? statement.cf : []),
  ];

  const cleanedAliases = aliases.map(cleanConceptKey);

  // Pass 1: exact concept match.
  for (const alias of cleanedAliases) {
    const row = rows.find((item) => cleanConceptKey(item?.concept) === alias);
    const value = firstNumber(row?.value, row?.amount);
    if (value !== null && value !== 0) return value;
  }

  // Pass 2: exact label/name match.
  for (const alias of cleanedAliases) {
    const row = rows.find((item) => cleanConceptKey(item?.label) === alias || cleanConceptKey(item?.name) === alias);
    const value = firstNumber(row?.value, row?.amount);
    if (value !== null && value !== 0) return value;
  }

  // Pass 3: contains match, only if no exact match exists.
  for (const alias of cleanedAliases) {
    const row = rows.find((item) => {
      const concept = cleanConceptKey(item?.concept);
      const label = cleanConceptKey(item?.label);
      const name = cleanConceptKey(item?.name);
      return concept.includes(alias) || label.includes(alias) || name.includes(alias);
    });
    const value = firstNumber(row?.value, row?.amount);
    if (value !== null && value !== 0) return value;
  }

  return null;
}

function buildExactReportedFinancials(reported = {}) {
  const reports = Array.isArray(reported?.data) ? reported.data : [];
  const annual = reports
    .filter((report) => {
      const form = String(report?.form || "").toUpperCase();
      const freq = String(report?.freq || "").toLowerCase();
      return form.includes("10-K") || freq === "annual" || report?.report;
    })
    .sort((a, b) => String(b?.endDate || b?.filedDate || b?.year || "").localeCompare(String(a?.endDate || a?.filedDate || a?.year || "")))
    .slice(0, 4);

  const rows = annual.map((report) => {
    const r = report?.report || report;

    const revenue = reportedLineValue(r, [
      "us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax",
      "us-gaap:Revenues",
      "us-gaap:SalesRevenueNet",
      "RevenueFromContractWithCustomerExcludingAssessedTax",
      "Revenues",
      "SalesRevenueNet",
    ]);

    const operatingIncome = reportedLineValue(r, [
      "us-gaap:OperatingIncomeLoss",
      "OperatingIncomeLoss",
      "OperatingIncome",
      "IncomeFromOperations",
    ]);

    const netIncome = reportedLineValue(r, [
      "us-gaap:NetIncomeLoss",
      "us-gaap:ProfitLoss",
      "NetIncomeLoss",
      "ProfitLoss",
      "NetIncome",
    ]);

    const operatingCashFlow = reportedLineValue(r, [
      "us-gaap:NetCashProvidedByUsedInOperatingActivities",
      "NetCashProvidedByUsedInOperatingActivities",
      "NetCashProvidedByOperatingActivities",
      "OperatingCashFlow",
    ]);

    const capexRaw = reportedLineValue(r, [
      "us-gaap:PaymentsToAcquirePropertyPlantAndEquipment",
      "PaymentsToAcquirePropertyPlantAndEquipment",
      "PaymentsToAcquireProductiveAssets",
      "CapitalExpenditures",
      "Capex",
    ]);

    const totalDebt = reportedLineValue(r, [
      "us-gaap:LongTermDebtAndFinanceLeaseObligationsCurrent",
      "us-gaap:ShortTermBorrowings",
      "us-gaap:LongTermDebtCurrent",
      "us-gaap:LongTermDebtNoncurrent",
      "LongTermDebtAndFinanceLeaseObligationsCurrent",
      "ShortTermBorrowings",
      "LongTermDebtCurrent",
      "LongTermDebtNoncurrent",
      "TotalDebt",
      "Debt",
    ]);

    const longDebt = reportedLineValue(r, [
      "us-gaap:LongTermDebtNoncurrent",
      "LongTermDebtNoncurrent",
      "LongTermDebt",
    ]);

    const currentDebt = reportedLineValue(r, [
      "us-gaap:LongTermDebtCurrent",
      "us-gaap:ShortTermBorrowings",
      "LongTermDebtCurrent",
      "ShortTermBorrowings",
    ]);

    const shareholderEquity = reportedLineValue(r, [
      "us-gaap:StockholdersEquity",
      "us-gaap:StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
      "StockholdersEquity",
      "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
      "ShareholdersEquity",
      "ShareholderEquity",
      "TotalEquity",
    ]);

    const cashAndEquivalents = reportedLineValue(r, [
      "us-gaap:CashAndCashEquivalentsAtCarryingValue",
      "us-gaap:CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
      "CashAndCashEquivalentsAtCarryingValue",
      "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
      "CashAndCashEquivalents",
      "CashEquivalents",
    ]);

    const totalAssets = reportedLineValue(r, [
      "us-gaap:Assets",
      "Assets",
      "TotalAssets",
    ]);

    const currentLiabilities = reportedLineValue(r, [
      "us-gaap:LiabilitiesCurrent",
      "LiabilitiesCurrent",
      "CurrentLiabilities",
      "TotalCurrentLiabilities",
    ]);

    const eps = reportedLineValue(r, [
      "us-gaap:EarningsPerShareDiluted",
      "EarningsPerShareDiluted",
      "DilutedEarningsPerShare",
      "EPSDiluted",
    ]);

    const combinedDebt =
      totalDebt !== null
        ? totalDebt
        : (safeNumber(longDebt) || 0) + (safeNumber(currentDebt) || 0) || null;

    const capex = capexRaw === null ? null : -Math.abs(capexRaw);
    const freeCashFlow =
      operatingCashFlow !== null && capex !== null
        ? operatingCashFlow - Math.abs(capex)
        : null;

    return {
      year: report?.year || report?.endDate || report?.filedDate || null,
      revenue,
      operatingIncome,
      netIncome,
      operatingCashFlow,
      capex,
      freeCashFlow,
      totalDebt: combinedDebt,
      shareholderEquity,
      cashAndEquivalents,
      totalAssets,
      currentLiabilities,
      eps,
    };
  });

  function pctChange(key) {
    const usable = rows.filter((row) => scoreInputNumber(row?.[key]) !== null);
    if (usable.length < 2) return null;
    const latest = usable[0][key];
    const oldest = usable[Math.min(usable.length - 1, 3)][key];
    if (!oldest) return null;
    return ((latest - oldest) / Math.abs(oldest)) * 100;
  }

  return {
    latest: rows[0] || {},
    revenueGrowth3Y: pctChange("revenue"),
    netIncomeGrowth3Y: pctChange("netIncome"),
    epsGrowth3Y: pctChange("eps"),
  };
}


function statementValue(statement = {}, names = []) {
  const rows = [
    ...(Array.isArray(statement?.ic) ? statement.ic : []),
    ...(Array.isArray(statement?.bs) ? statement.bs : []),
    ...(Array.isArray(statement?.cf) ? statement.cf : []),
  ];

  for (const name of names) {
    const needle = String(name).toLowerCase().replace(/[^a-z0-9]/g, "");
    const row = rows.find((item) => {
      const concept = String(item?.concept || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const label = String(item?.label || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const rowName = String(item?.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return concept.includes(needle) || label.includes(needle) || rowName.includes(needle);
    });

    const value = firstNumber(row?.value, row?.amount);
    if (value !== null && value !== 0) return value;
  }

  return null;
}

function buildReportedFinancials(reported = {}) {
  const reports = Array.isArray(reported?.data) ? reported.data : [];
  const annual = reports
    .filter((report) => {
      const form = String(report?.form || "").toUpperCase();
      const freq = String(report?.freq || "").toLowerCase();
      return form.includes("10-K") || freq === "annual" || report?.report;
    })
    .sort((a, b) => String(b?.endDate || b?.filedDate || b?.year || "").localeCompare(String(a?.endDate || a?.filedDate || a?.year || "")))
    .slice(0, 4);

  const rows = annual.map((report) => {
    const r = report?.report || report;
    const revenue = statementValue(r, ["revenue", "revenues", "salesrevenue", "salesrevenuenet", "sales"]);
    const netIncome = statementValue(r, ["netincome", "netincomeloss", "profitloss"]);
    const operatingIncome = statementValue(r, ["operatingincome", "operatingincomeloss", "incomefromoperations"]);
    const operatingCashFlow = statementValue(r, ["netcashprovidedbyusedinoperatingactivities", "netcashprovidedbyoperatingactivities", "operatingcashflow"]);
    const capexRaw = statementValue(r, ["paymentstoacquirepropertyplantandequipment", "paymentstoacquireproductiveassets", "capitalexpenditures", "capex"]);
    const totalAssets = statementValue(r, ["assets", "totalassets"]);
    const totalDebt = statementValue(r, ["debt", "longtermdebt", "shorttermborrowings", "totaldebt"]);
    const shareholderEquity = statementValue(r, ["stockholdersequity", "shareholdersequity", "stockholdersequityincludingportionattributabletononcontrollinginterest"]);
    const cashAndEquivalents = statementValue(r, ["cashandcashequivalents", "cashandcash equivalents", "cashcashequivalentsrestrictedcashandrestrictedcashequivalents"]);
    const eps = statementValue(r, ["earningspersharediluted", "dilutedearningspershare", "epsdiluted", "earningspershare"]);

    const capex = capexRaw === null ? null : -Math.abs(capexRaw);
    const freeCashFlow =
      operatingCashFlow !== null && capex !== null
        ? operatingCashFlow - Math.abs(capex)
        : null;

    return {
      year: report?.year || report?.endDate || report?.filedDate || null,
      revenue,
      netIncome,
      operatingIncome,
      operatingCashFlow,
      capex,
      freeCashFlow,
      totalAssets,
      totalDebt,
      shareholderEquity,
      cashAndEquivalents,
      eps,
    };
  });

  function pctChange(key) {
    const usable = rows.filter((row) => scoreInputNumber(row?.[key]) !== null);
    if (usable.length < 2) return null;
    const latest = usable[0][key];
    const oldest = usable[Math.min(usable.length - 1, 3)][key];
    if (!oldest) return null;
    return ((latest - oldest) / Math.abs(oldest)) * 100;
  }

  return {
    latest: rows[0] || {},
    revenueGrowth3Y: pctChange("revenue"),
    netIncomeGrowth3Y: pctChange("netIncome"),
    epsGrowth3Y: pctChange("eps"),
  };
}


function buildExtractedMetrics(profile, quote, raw = {}) {
  const currentPrice = safeNumber(quote?.c);
  const marketCapM = safeNumber(profile?.marketCapitalization);

  const weekHigh = firstNumber(raw["52WeekHigh"], raw["52WeekHigh"], raw["52WeekHighDate"]);
  const weekLow = firstNumber(raw["52WeekLow"], raw["52WeekLow"]);

  const pullbackFromHigh =
    currentPrice !== null && weekHigh !== null && weekHigh > 0
      ? ((weekHigh - currentPrice) / weekHigh) * 100
      : null;

  const distanceFrom52WeekLow =
    currentPrice !== null && weekLow !== null && weekLow > 0
      ? ((currentPrice - weekLow) / weekLow) * 100
      : null;

  return {
    currentPrice,
    marketCapM,
    beta: firstNumber(raw.beta, raw.betaAnnual),

    peRatio: firstNumber(raw.peTTM, raw.peNormalizedAnnual, raw.peBasicExclExtraTTM),
    forwardPe: firstNumber(raw.forwardPE),
    pegRatio: firstNumber(raw.pegRatio),
    priceToSales: firstNumber(raw.psTTM, raw.psAnnual),
    priceToBook: firstNumber(raw.pbQuarterly, raw.pbAnnual),
    priceToCashFlow: firstNumber(raw.pcfShareTTM),
    priceToFreeCashFlow: firstNumber(raw.pfcfShareTTM),
    dividendYield: percentFromDecimal(firstNumber(raw.currentDividendYieldTTM, raw.dividendYieldIndicatedAnnual)),

    revenueGrowth: percentFromDecimal(firstNumber(raw.revenueGrowthTTMYoy, raw.revenueGrowthQuarterlyYoy, raw.revenueGrowth5Y)),
    revenueGrowthQuarterly: percentFromDecimal(firstNumber(raw.revenueGrowthQuarterlyYoy)),
    revenueGrowth3Y: percentFromDecimal(firstNumber(raw.revenueGrowth3Y)),
    revenueGrowth5Y: percentFromDecimal(firstNumber(raw.revenueGrowth5Y)),

    epsGrowth: percentFromDecimal(firstNumber(raw.epsGrowthTTMYoy, raw.epsGrowthQuarterlyYoy)),
    epsGrowth3Y: percentFromDecimal(firstNumber(raw.epsGrowth3Y)),
    epsGrowth5Y: percentFromDecimal(firstNumber(raw.epsGrowth5Y)),

    roe: percentFromDecimal(firstNumber(raw.roeTTM, raw.roeRfy)),
    roa: percentFromDecimal(firstNumber(raw.roaTTM, raw.roaRfy)),
    roi: percentFromDecimal(firstNumber(raw.roiTTM, raw.roiAnnual)),
    grossMargin: percentFromDecimal(firstNumber(raw.grossMarginTTM, raw.grossMarginAnnual)),
    operatingMargin: percentFromDecimal(firstNumber(raw.operatingMarginTTM, raw.operatingMarginAnnual)),
    pretaxMargin: percentFromDecimal(firstNumber(raw.pretaxMarginTTM, raw.pretaxMarginAnnual)),
    netMargin: percentFromDecimal(firstNumber(raw.netProfitMarginTTM, raw.netProfitMarginAnnual)),

    debtToEquity: firstNumber(raw.totalDebtToEquityQuarterly, raw.totalDebtToEquityAnnual),
    longTermDebtToEquity: firstNumber(raw.longTermDebtToEquityQuarterly, raw.longTermDebtToEquityAnnual),
    currentRatio: firstNumber(raw.currentRatioQuarterly, raw.currentRatioAnnual),
    quickRatio: firstNumber(raw.quickRatioQuarterly, raw.quickRatioAnnual),
    cashRatio: firstNumber(raw.cashRatioQuarterly, raw.cashRatioAnnual),
    assetTurnover: firstNumber(raw.assetTurnoverTTM, raw.assetTurnoverAnnual),
    operatingIncome: firstNumber(raw.operatingIncomeTTM, raw.operatingIncomeAnnual),
    operatingCashFlow: firstNumber(raw.operatingCashFlowTTM, raw.operatingCashFlowAnnual),
    capex: firstNumber(raw.capexTTM, raw.capexAnnual, raw.capitalExpenditureTTM, raw.capitalExpenditureAnnual),
    freeCashFlow: firstNumber(raw.freeCashFlowTTM, raw.freeCashFlowAnnual),
    netIncome: firstNumber(raw.netIncomeTTM, raw.netIncomeAnnual),
    totalAssets: firstNumber(raw.totalAssetsQuarterly, raw.totalAssetsAnnual),
    currentLiabilities: firstNumber(raw.totalCurrentLiabilitiesQuarterly, raw.totalCurrentLiabilitiesAnnual, raw.currentLiabilitiesQuarterly, raw.currentLiabilitiesAnnual),
    totalDebt: firstNumber(raw.totalDebtQuarterly, raw.totalDebtAnnual),
    shareholderEquity: firstNumber(raw.totalEquityQuarterly, raw.totalEquityAnnual, raw.bookValuePerShareAnnual && raw.sharesOutstanding ? raw.bookValuePerShareAnnual * raw.sharesOutstanding : null),
    cashAndEquivalents: firstNumber(raw.cashAndEquivalentsQuarterly, raw.cashAndEquivalentsAnnual, raw.cashPerShareAnnual && raw.sharesOutstanding ? raw.cashPerShareAnnual * raw.sharesOutstanding : null),
    netIncomeGrowth3Y: percentFromDecimal(firstNumber(raw.netIncomeGrowth3Y, raw.netIncomeGrowth3YAnnual, raw["3YearNetIncomeGrowth"])),
    interestCoverage: firstNumber(raw.interestCoverageTTM, raw.interestCoverageAnnual),
    cashFlowToDebt: firstNumber(raw.cashFlowToDebtTTM, raw.cashFlowToDebtAnnual),
    operatingCashFlowPerShare: firstNumber(raw.operatingCashFlowPerShareTTM, raw.operatingCashFlowPerShareAnnual),
    freeCashFlowPerShare: firstNumber(raw.freeCashFlowPerShareTTM, raw.freeCashFlowPerShareAnnual),
    totalDebtToCapital: firstNumber(raw.totalDebtToCapitalizationQuarterly, raw.totalDebtToCapitalizationAnnual),
    netDebtToEbitda: firstNumber(raw.netDebtToEBITDATTM, raw.netDebtToEBITDAAnnual),

    priceReturn4Week: firstNumber(raw["4WeekPriceReturnDaily"], raw.monthToDatePriceReturnDaily),
    priceReturn13Week: firstNumber(raw["13WeekPriceReturnDaily"], raw["3MonthPriceReturnDaily"]),
    priceReturn26Week: firstNumber(raw["26WeekPriceReturnDaily"], raw["6MonthPriceReturnDaily"]),
    priceReturn52Week: firstNumber(raw["52WeekPriceReturnDaily"], raw.yearToDatePriceReturnDaily),
    weekHigh,
    weekLow,
    pullbackFromHigh,
    distanceFrom52WeekLow,
    dayChangePercent: firstNumber(quote?.dp),
  };
}

function scoreGrowth(m = {}) {
  return availableWeightedAverage(
    [
      { score: metricScore(m.revenueGrowth, [[40, 10], [25, 9], [15, 8], [8, 7], [3, 6], [0, 5], [-5, 4], [-999, 3]]), weight: 0.30 },
      { score: metricScore(m.revenueGrowthQuarterly, [[35, 10], [22, 9], [12, 8], [6, 7], [2, 6], [0, 5], [-5, 4], [-999, 3]]), weight: 0.15 },
      { score: metricScore(m.revenueGrowth3Y, [[25, 10], [18, 9], [12, 8], [7, 7], [3, 6], [0, 5], [-5, 4], [-999, 3]]), weight: 0.15 },
      { score: metricScore(m.revenueGrowth5Y, [[20, 10], [14, 9], [9, 8], [5, 7], [2, 6], [0, 5], [-5, 4], [-999, 3]]), weight: 0.10 },
      { score: metricScore(m.epsGrowth, [[40, 10], [25, 9], [15, 8], [8, 7], [3, 6], [0, 5], [-10, 4], [-999, 3]]), weight: 0.20 },
      { score: metricScore(m.epsGrowth3Y, [[25, 10], [18, 9], [12, 8], [7, 7], [3, 6], [0, 5], [-10, 4], [-999, 3]]), weight: 0.10 },
    ],
    6
  );
}

function scoreProfitability(m = {}) {
  return availableWeightedAverage(
    [
      { score: metricScore(m.roe, [[60, 10], [35, 9], [20, 8], [12, 7], [5, 6], [0, 5], [-999, 3]]), weight: 0.22 },
      { score: metricScore(m.roa, [[18, 10], [12, 9], [8, 8], [5, 7], [2, 6], [0, 5], [-999, 3]]), weight: 0.14 },
      { score: metricScore(m.roi, [[30, 10], [20, 9], [14, 8], [9, 7], [4, 6], [0, 5], [-999, 3]]), weight: 0.14 },
      { score: metricScore(m.grossMargin, [[70, 10], [55, 9], [40, 8], [28, 7], [18, 6], [8, 5], [-999, 3]]), weight: 0.13 },
      { score: metricScore(m.operatingMargin, [[35, 10], [25, 9], [15, 8], [8, 7], [3, 6], [0, 5], [-999, 3]]), weight: 0.20 },
      { score: metricScore(m.netMargin, [[30, 10], [20, 9], [12, 8], [7, 7], [3, 6], [0, 5], [-999, 3]]), weight: 0.17 },
    ],
    6
  );
}

function scoreFinancialHealth(m = {}) {
  const leverageScore = availableWeightedAverage(
    [
      { score: inverseMetricScore(m.debtToEquity, [[0.3, 10], [0.7, 9], [1.2, 8], [2.0, 6.8], [3.0, 5.8], [999, 4.6]]), weight: 0.38 },
      { score: inverseMetricScore(m.longTermDebtToEquity, [[0.3, 10], [0.7, 9], [1.2, 8], [2.0, 6.8], [3.0, 5.8], [999, 4.6]]), weight: 0.25 },
      { score: inverseMetricScore(m.totalDebtToCapital, [[0.25, 10], [0.4, 9], [0.6, 7.8], [0.8, 6.4], [1.0, 5.2], [999, 4.4]]), weight: 0.20 },
      { score: inverseMetricScore(m.netDebtToEbitda, [[0.5, 10], [1.5, 9], [2.5, 8], [4, 6.8], [6, 5.5], [999, 4.4]]), weight: 0.17 },
    ],
    null
  );

  const liquidityScore = availableWeightedAverage(
    [
      { score: metricScore(m.currentRatio, [[3, 9.2], [2, 8.7], [1.5, 8.2], [1, 7.2], [0.75, 6.0], [-999, 5.0]]), weight: 0.45 },
      { score: metricScore(m.quickRatio, [[2, 9], [1.4, 8.5], [1, 7.7], [0.7, 6.2], [-999, 5.0]]), weight: 0.30 },
      { score: metricScore(m.cashRatio, [[1, 9], [0.5, 8.2], [0.25, 7], [0.1, 5.8], [-999, 5.0]]), weight: 0.25 },
    ],
    null
  );

  const coverageScore = availableWeightedAverage(
    [
      { score: metricScore(m.interestCoverage, [[40, 10], [20, 9.3], [10, 8.5], [5, 7.2], [2, 6], [0.5, 4.8], [-999, 4]]), weight: 0.45 },
      { score: metricScore(m.cashFlowToDebt, [[0.7, 10], [0.45, 9], [0.25, 8], [0.12, 6.8], [0.05, 5.5], [-999, 4.5]]), weight: 0.25 },
      { score: metricScore(m.operatingCashFlowPerShare, [[20, 10], [10, 9], [5, 8], [2, 7], [0.5, 5.8], [-999, 4.5]]), weight: 0.15 },
      { score: metricScore(m.freeCashFlowPerShare, [[15, 10], [7.5, 9], [3, 8], [1, 6.8], [0.25, 5.6], [-999, 4.5]]), weight: 0.15 },
    ],
    null
  );

  const profitabilitySupport = availableWeightedAverage(
    [
      { score: metricScore(m.operatingMargin, [[35, 10], [25, 9.2], [15, 8.4], [8, 7.2], [3, 6.2], [0.5, 5], [-999, 4]]), weight: 0.36 },
      { score: metricScore(m.netMargin, [[30, 10], [20, 9.1], [12, 8.3], [7, 7.2], [3, 6.2], [0.5, 5], [-999, 4]]), weight: 0.24 },
      { score: metricScore(m.roe, [[60, 10], [35, 9.2], [20, 8.4], [12, 7.4], [5, 6.2], [0.5, 5], [-999, 4]]), weight: 0.22 },
      { score: metricScore(m.roa, [[18, 10], [12, 9.2], [8, 8.4], [5, 7.4], [2, 6.2], [0.5, 5], [-999, 4]]), weight: 0.18 },
    ],
    null
  );

  const sizeSupport = metricScore(m.marketCapM, [[1_000_000, 9.0], [500_000, 8.6], [100_000, 7.8], [25_000, 7.0], [5_000, 6.0], [-999, 5.0]]);

  const availableHealthInputs = [
    m.debtToEquity,
    m.longTermDebtToEquity,
    m.totalDebtToCapital,
    m.netDebtToEbitda,
    m.currentRatio,
    m.quickRatio,
    m.cashRatio,
    m.interestCoverage,
    m.cashFlowToDebt,
    m.operatingCashFlowPerShare,
    m.freeCashFlowPerShare,
  ].filter((value) => scoreInputNumber(value) !== null).length;

  const coreScore = availableWeightedAverage(
    [
      { score: leverageScore, weight: leverageScore === null ? 0 : 0.34 },
      { score: liquidityScore, weight: liquidityScore === null ? 0 : 0.24 },
      { score: coverageScore, weight: coverageScore === null ? 0 : 0.24 },
      { score: profitabilitySupport, weight: profitabilitySupport === null ? 0 : 0.18 },
    ],
    null
  );

  const supportScore = availableWeightedAverage(
    [
      { score: profitabilitySupport, weight: profitabilitySupport === null ? 0 : 0.68 },
      { score: sizeSupport, weight: sizeSupport === null ? 0 : 0.32 },
    ],
    null
  );

  // If the API only gives 1-2 usable balance-sheet fields, do not let a single weak ratio
  // crush companies with massive scale and strong margins/returns.
  const supportWeight = availableHealthInputs >= 6 ? 0.20 : availableHealthInputs >= 3 ? 0.35 : 0.55;

  const finalScore = availableWeightedAverage(
    [
      { score: coreScore, weight: coreScore === null ? 0 : 1 - supportWeight },
      { score: supportScore, weight: supportScore === null ? 0 : supportWeight },
    ],
    supportScore ?? coreScore ?? 6.5
  );

  return Number(clamp(finalScore, 0, 10).toFixed(1));
}




function scoreValuation(m = {}, growthScore = 6, profitabilityScore = 6) {
  const raw = availableWeightedAverage(
    [
      { score: inverseMetricScore(m.peRatio, [[12, 9.5], [18, 8.5], [25, 7.5], [35, 6.5], [50, 5.5], [75, 4.5], [9999, 3.5]]), weight: 0.25 },
      { score: inverseMetricScore(m.forwardPe, [[14, 9], [20, 8], [28, 7], [40, 6], [60, 5], [9999, 3.5]]), weight: 0.10 },
      { score: inverseMetricScore(m.pegRatio, [[0.8, 9.5], [1.2, 8.5], [1.8, 7.5], [2.5, 6], [4, 4.5], [9999, 3]]), weight: 0.15 },
      { score: inverseMetricScore(m.priceToSales, [[2, 9], [4, 8], [7, 6.5], [12, 5], [20, 3.5], [9999, 2.5]]), weight: 0.18 },
      { score: inverseMetricScore(m.priceToBook, [[2, 9], [4, 8], [7, 6.5], [12, 5], [20, 3.5], [9999, 2.5]]), weight: 0.12 },
      { score: inverseMetricScore(m.priceToFreeCashFlow, [[15, 9], [25, 8], [40, 6.5], [65, 5], [100, 3.5], [9999, 2.5]]), weight: 0.20 },
    ],
    6
  );

  const quality = availableWeightedAverage([{ score: growthScore, weight: 0.215 }, { score: profitabilityScore, weight: 0.205 }], 6);
  return Number(clamp(raw + Math.max(-0.5, Math.min(0.8, (quality - 6) * 0.12))).toFixed(1));
}

function scoreMomentum(m = {}) {
  return availableWeightedAverage(
    [
      { score: metricScore(m.priceReturn4Week, [[15, 10], [8, 9], [3, 8], [0, 7], [-5, 5], [-12, 4], [-999, 3]]), weight: 0.22 },
      { score: metricScore(m.priceReturn13Week, [[25, 10], [15, 9], [8, 8], [2, 7], [-5, 5], [-15, 4], [-999, 3]]), weight: 0.25 },
      { score: metricScore(m.priceReturn26Week, [[40, 10], [25, 9], [12, 8], [3, 7], [-8, 5], [-20, 4], [-999, 3]]), weight: 0.22 },
      { score: metricScore(m.priceReturn52Week, [[70, 10], [40, 9], [20, 8], [5, 7], [-10, 5], [-25, 4], [-999, 3]]), weight: 0.21 },
      { score: metricScore(m.dayChangePercent, [[5, 9], [2, 8], [0, 6.5], [-2, 5], [-5, 4], [-999, 3]]), weight: 0.10 },
    ],
    6
  );
}

function scorePullback(m = {}) {
  return availableWeightedAverage(
    [
      { score: metricScore(m.pullbackFromHigh, [[35, 9], [25, 8], [15, 7], [8, 6], [3, 5], [0, 4], [-999, 3]]), weight: 0.42 },
      { score: inverseMetricScore(m.priceReturn4Week, [[-8, 8.5], [-4, 7.5], [0, 6.5], [5, 5], [12, 4], [999, 3]]), weight: 0.25 },
      { score: metricScore(m.distanceFrom52WeekLow, [[80, 9], [50, 8], [30, 7], [15, 6], [5, 5], [-999, 3]]), weight: 0.18 },
      { score: inverseMetricScore(m.dayChangePercent, [[-5, 8.5], [-2, 7.5], [0, 6.5], [3, 5.5], [8, 4], [999, 3]]), weight: 0.15 },
    ],
    6
  );
}

function strongestWeakest(categories = {}) {
  const entries = Object.entries(categories)
    .filter(([, value]) => safeNumber(value) !== null)
    .sort((a, b) => safeNumber(b[1]) - safeNumber(a[1]));

  const strongest = entries[0];
  const weakest = entries[entries.length - 1];

  return {
    strongest: strongest ? `${labelCategory(strongest[0])} ${scoreText(strongest[1])}` : "N/A",
    weakest: weakest ? `${labelCategory(weakest[0])} ${scoreText(weakest[1])}` : "N/A",
  };
}

function labelCategory(key) {
  const labels = {
    growth: "Growth",
    profitability: "Profitability",
    financialHealth: "Financial Health",
    valuation: "Valuation",
    momentum: "Momentum",
    reversal: "Pullback",
    newsSentiment: "News Sentiment",
  };

  return labels[key] || key;
}


async function fetchRecentNews(symbol) {
  const to = new Date();
  const from = new Date(Date.now() - 1000 * 60 * 60 * 24 * 21);

  const news = await fetchFinnhubOptional("/company-news", {
    symbol,
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  });

  if (!Array.isArray(news)) return [];

  return news
    .filter((item) => item?.headline || item?.title || item?.summary)
    .sort((a, b) => Number(b.datetime || 0) - Number(a.datetime || 0))
    .slice(0, 3)
    .map((item, index) => ({
      n: index + 1,
      title: item.headline || item.title || `News article ${index + 1}`,
      summary: item.summary || "",
      source: item.source || "",
      url: item.url || "",
      datetime: item.datetime || null,
    }));
}

function fallbackNewsSentiment(news = []) {
  return {
    score: 5.0,
    label: "Neutral",
    summary:
      news.length > 0
        ? "AI news scoring is unavailable right now, so this is a neutral placeholder. The articles still appear below when available. Add OPENAI_API_KEY in Render to turn on weighted AI scoring."
        : "No recent company news was available from the data provider. This is a neutral placeholder so the report can still load. News sentiment has limited effect when article data is missing.",
    topics: news.map((item, index) => ({
      title: item.title || `News article ${index + 1}`,
      summary: item.summary || "No summary was available for this article.",
      url: item.url || "",
      source: item.source || "",
      score: 5.0,
      weight: index === 0 ? 45 : index === 1 ? 35 : 20,
      impact: "Neutral impact.",
    })),
    articleCount: news.length,
    source: "Fallback",
  };
}

function normalizeTopicWeights(topics) {
  if (!Array.isArray(topics) || !topics.length) return [];

  const cleaned = topics.slice(0, 3).map((topic, index) => ({
    title: String(topic?.title || `News article ${index + 1}`).trim(),
    summary: String(topic?.summary || "No summary available.").trim(),
    url: String(topic?.url || "").trim(),
    source: String(topic?.source || "").trim(),
    score: Number((clamp(topic?.score, 0, 10) ?? 5).toFixed(1)),
    weight: Math.max(0, Math.min(100, safeNumber(topic?.weight) ?? (index === 0 ? 45 : index === 1 ? 35 : 20))),
    impact: String(topic?.impact || "").trim(),
  }));

  const total = cleaned.reduce((sum, topic) => sum + topic.weight, 0);
  if (total <= 0) return cleaned;

  return cleaned.map((topic) => ({
    ...topic,
    weight: Number(((topic.weight / total) * 100).toFixed(0)),
  }));
}

async function scoreNewsSentiment(symbol, profile, news = []) {
  const openAiKey = process.env.OPENAI_API_KEY;

  if (!openAiKey || !news.length) {
    return fallbackNewsSentiment(news);
  }

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: NEWS_SENTIMENT_MODEL,
        temperature: 0.12,
        max_tokens: 750,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a stock-news sentiment rater. Analyze exactly the latest 3 news articles provided. Return only valid JSON with keys score, label, summary, topics. score must be a 0.0-10.0 number to one decimal where 0.0 is very bad for the stock, 5.0 is neutral, and 10.0 is very good. label must be Bullish, Neutral, or Bearish. summary must be brief and easy to understand, explaining why the overall score got that number. topics must be an array of 3 objects. Each topic must include title, summary, url, source, score, weight, impact. Each topic summary must be exactly 3 short simple sentences. Each topic score must be 0.0-10.0 to one decimal. Weight each topic by importance/stock impact, and weights should total 100. Do not give buy/sell advice.",
          },
          {
            role: "user",
            content: JSON.stringify({
              ticker: symbol,
              company: profile?.name || symbol,
              articles: news,
            }),
          },
        ],
      }),
    });

    const json = await response.json().catch(() => null);
    if (!response.ok) {
      console.warn("OpenAI news sentiment failed:", response.status, json?.error?.message || "");
      return fallbackNewsSentiment(news);
    }

    const parsed = JSON.parse(json?.choices?.[0]?.message?.content || "{}");
    let topics = normalizeTopicWeights(parsed.topics);

    topics = news.map((article, index) => {
      const topic = topics[index] || {};
      return {
        title: topic.title || article.title || `News article ${index + 1}`,
        summary: topic.summary || article.summary || "No summary available.",
        url: topic.url || article.url || "",
        source: topic.source || article.source || "",
        score: Number((clamp(topic.score, 0, 10) ?? 5).toFixed(1)),
        weight: topic.weight ?? (index === 0 ? 45 : index === 1 ? 35 : 20),
        impact: topic.impact || "Neutral impact.",
      };
    });

    topics = normalizeTopicWeights(topics);
    const totalWeight = topics.reduce((sum, topic) => sum + topic.weight, 0) || 100;
    const weightedScore = topics.reduce((sum, topic) => sum + topic.score * (topic.weight / totalWeight), 0);
    const finalScore = Number((clamp(parsed.score, 0, 10) ?? weightedScore).toFixed(1));

    return {
      score: finalScore,
      label: parsed.label || (finalScore >= 7 ? "Bullish" : finalScore <= 4 ? "Bearish" : "Neutral"),
      summary:
        String(parsed.summary || "").trim() ||
        `The latest 3 articles create a ${finalScore.toFixed(1)} out of 10 news sentiment score based on weighted impact.`,
      topics,
      articleCount: topics.length,
      source: "OpenAI weighted top 3 news articles",
      model: NEWS_SENTIMENT_MODEL,
    };
  } catch (error) {
    console.warn("AI news sentiment scoring failed:", error?.message || error);
    return fallbackNewsSentiment(news);
  }
}


export async function buildStockAnalysis(symbol) {
  const cleanSymbol = String(symbol || "").trim().toUpperCase();
  if (!cleanSymbol) throw new Error("Missing ticker symbol.");

  const [profile, quote, metricsRaw] = await Promise.all([
    fetchFinnhub("/stock/profile2", { symbol: cleanSymbol }),
    fetchFinnhub("/quote", { symbol: cleanSymbol }),
    fetchFinnhubOptional("/stock/metric", { symbol: cleanSymbol, metric: "all" }),
  ]);

  if (!profile || (!profile.ticker && !profile.name)) {
    throw new Error(`No company profile found for ${cleanSymbol}.`);
  }

  const financialsReported = await fetchFinnhubOptional("/stock/financials-reported", {
    symbol: cleanSymbol,
    freq: "annual",
  });

  const raw = metricsRaw?.metric || {};
  const extracted = buildExtractedMetrics(profile, quote, raw);

  const reportedFinancials = buildExactReportedFinancials(financialsReported);
  const reportedLatest = reportedFinancials.latest || {};

  // Exact requested inputs from Finnhub metric endpoint first, then reported statements.
  extracted.operatingIncome = firstNumber(extracted.operatingIncome, reportedLatest.operatingIncome);
  extracted.netIncome = firstNumber(extracted.netIncome, reportedLatest.netIncome);
  extracted.totalDebt = firstNumber(extracted.totalDebt, reportedLatest.totalDebt);
  extracted.shareholderEquity = firstNumber(extracted.shareholderEquity, reportedLatest.shareholderEquity);
  extracted.cashAndEquivalents = firstNumber(extracted.cashAndEquivalents, reportedLatest.cashAndEquivalents);
  extracted.totalAssets = firstNumber(extracted.totalAssets, reportedLatest.totalAssets);
  extracted.currentLiabilities = firstNumber(extracted.currentLiabilities, reportedLatest.currentLiabilities);
  extracted.operatingCashFlow = firstNumber(extracted.operatingCashFlow, reportedLatest.operatingCashFlow);
  extracted.capex = firstNumber(extracted.capex, reportedLatest.capex);
  extracted.freeCashFlow = firstNumber(
    extracted.freeCashFlow,
    reportedLatest.freeCashFlow,
    extracted.operatingCashFlow !== null && extracted.capex !== null
      ? extracted.operatingCashFlow - Math.abs(extracted.capex)
      : null
  );

  extracted.revenueGrowth3Y = firstNumber(extracted.revenueGrowth3Y, reportedFinancials.revenueGrowth3Y);
  extracted.netIncomeGrowth3Y = firstNumber(extracted.netIncomeGrowth3Y, reportedFinancials.netIncomeGrowth3Y);
  extracted.epsGrowth3Y = firstNumber(extracted.epsGrowth3Y, reportedFinancials.epsGrowth3Y);

  // Exact requested calculations.
  extracted.nopat =
    scoreInputNumber(extracted.operatingIncome) !== null
      ? extracted.operatingIncome * (1 - 0.21)
      : null;

  extracted.investedCapital =
    scoreInputNumber(extracted.totalDebt) !== null &&
    scoreInputNumber(extracted.shareholderEquity) !== null
      ? extracted.totalDebt + extracted.shareholderEquity - (safeNumber(extracted.cashAndEquivalents) || 0)
      : null;

  extracted.roicCalculated =
    scoreInputNumber(extracted.nopat) !== null && scoreInputNumber(extracted.investedCapital) !== null
      ? (extracted.nopat / extracted.investedCapital) * 100
      : null;

  extracted.cashRatioCalculated =
    scoreInputNumber(extracted.cashAndEquivalents) !== null &&
    scoreInputNumber(extracted.currentLiabilities) !== null
      ? extracted.cashAndEquivalents / extracted.currentLiabilities
      : firstNumber(extracted.cashRatio);

  // Earnings quality calculations.
  extracted.cashConversionRatio =
    scoreInputNumber(extracted.netIncome) !== null && scoreInputNumber(extracted.freeCashFlow) !== null
      ? extracted.freeCashFlow / extracted.netIncome
      : null;

  extracted.accrualRatio =
    scoreInputNumber(extracted.totalAssets) !== null &&
    scoreInputNumber(extracted.netIncome) !== null &&
    scoreInputNumber(extracted.freeCashFlow) !== null
      ? (extracted.netIncome - extracted.freeCashFlow) / extracted.totalAssets
      : null;



  extracted.nopat =
    scoreInputNumber(extracted.operatingIncome) !== null
      ? extracted.operatingIncome * (1 - 0.21)
      : null;

  extracted.investedCapital =
    scoreInputNumber(extracted.totalDebt) !== null &&
    scoreInputNumber(extracted.shareholderEquity) !== null
      ? extracted.totalDebt + extracted.shareholderEquity - (safeNumber(extracted.cashAndEquivalents) || 0)
      : null;

  extracted.roicCalculated =
    scoreInputNumber(extracted.nopat) !== null && scoreInputNumber(extracted.investedCapital) !== null
      ? (extracted.nopat / extracted.investedCapital) * 100
      : null;

  extracted.freeCashFlow = firstNumber(
    extracted.freeCashFlow,
    extracted.operatingCashFlow !== null && extracted.capex !== null
      ? extracted.operatingCashFlow - Math.abs(extracted.capex)
      : null
  );
  extracted.cashConversionRatio =
    scoreInputNumber(extracted.netIncome) !== null && scoreInputNumber(extracted.freeCashFlow) !== null
      ? extracted.freeCashFlow / extracted.netIncome
      : null;
  extracted.accrualRatio =
    scoreInputNumber(extracted.totalAssets) !== null &&
    scoreInputNumber(extracted.netIncome) !== null &&
    scoreInputNumber(extracted.freeCashFlow) !== null
      ? (extracted.netIncome - extracted.freeCashFlow) / extracted.totalAssets
      : null;
  const recentNews = await fetchRecentNews(cleanSymbol);
  const newsSentiment = await scoreNewsSentiment(cleanSymbol, profile, recentNews);

  const growthScore = scoreGrowth(extracted);
  const profitabilityScore = scoreProfitability(extracted);
  const healthScore = scoreFinancialHealth(extracted);
  const valuationScore = scoreValuation(extracted, growthScore, profitabilityScore);
  const momentumScore = scoreMomentum(extracted);
  const reversalScore = scorePullback(extracted);
  const newsSentimentScore = safeNumber(newsSentiment?.score) ?? 5.0;

  const categories = {
    growth: growthScore,
    profitability: profitabilityScore,
    financialHealth: healthScore,
    valuation: valuationScore,
    momentum: momentumScore,
    reversal: reversalScore,
    newsSentiment: newsSentimentScore,
  };

  const edgeScore = availableWeightedAverage(
    [
      { score: growthScore, weight: 0.215 },
      { score: profitabilityScore, weight: 0.205 },
      { score: healthScore, weight: 0.175 },
      { score: valuationScore, weight: 0.150 },
      { score: momentumScore, weight: 0.105 },
      { score: reversalScore, weight: 0.075 },
      { score: newsSentimentScore, weight: 0.075 },
    ],
    6
  );

  const riskLabel = getRiskLabel(extracted, healthScore);
  const sw = strongestWeakest(categories);

  return {
    symbol: cleanSymbol,
    profile: {
      ...profile,
      ticker: profile.ticker || cleanSymbol,
      name: profile.name || cleanSymbol,
      finnhubIndustry: profile.finnhubIndustry || "Public company",
    },
    quote: {
      c: safeNumber(quote?.c),
      d: safeNumber(quote?.d),
      dp: safeNumber(quote?.dp),
      h: safeNumber(quote?.h),
      l: safeNumber(quote?.l),
      o: safeNumber(quote?.o),
      pc: safeNumber(quote?.pc),
    },
    companyDescription: `${profile.name || cleanSymbol} is a publicly traded company in the ${
      profile.finnhubIndustry || "market"
    } industry.`,
    evaluationSummary: `${cleanSymbol} has an Eval Score of ${edgeScore.toFixed(
      1
    )} out of 10. The score blends growth, profitability, financial health, valuation, momentum, pullback, and news sentiment.`,
    strengths: [sw.strongest],
    weaknesses: [sw.weakest],
    grades: {
      edgeScore,
      grade: gradeFrom10(edgeScore),
      riskLabel,
      categories,
      context: {
        marketCapM: extracted.marketCapM,
      },
    },
    metrics: {
      revenueGrowth: metric(extracted.revenueGrowth, "%", "Finnhub", "Revenue growth YoY"),
      revenueGrowthQuarterly: metric(extracted.revenueGrowthQuarterly, "%", "Finnhub", "Quarterly revenue growth YoY"),
      revenueGrowth3Y: metric(extracted.revenueGrowth3Y, "%", "Finnhub", "3-year revenue growth"),
      revenueGrowth5Y: metric(extracted.revenueGrowth5Y, "%", "Finnhub", "5-year revenue growth"),
      epsGrowth: metric(extracted.epsGrowth, "%", "Finnhub", "EPS growth YoY"),
      epsGrowth3Y: metric(extracted.epsGrowth3Y, "%", "Finnhub", "3-year EPS growth"),
      epsGrowth5Y: metric(extracted.epsGrowth5Y, "%", "Finnhub", "5-year EPS growth"),

      roe: metric(extracted.roe, "%", "Finnhub", "Return on equity"),
      roa: metric(extracted.roa, "%", "Finnhub", "Return on assets"),
      roi: metric(extracted.roi, "%", "Finnhub", "Return on investment / capital"),
      grossMargin: metric(extracted.grossMargin, "%", "Finnhub", "Gross profit / revenue"),
      operatingMargin: metric(extracted.operatingMargin, "%", "Finnhub", "Operating income / revenue"),
      pretaxMargin: metric(extracted.pretaxMargin, "%", "Finnhub", "Pretax income / revenue"),
      netMargin: metric(extracted.netMargin, "%", "Finnhub", "Net income / revenue"),

      debtToEquity: metric(extracted.debtToEquity, "", "Finnhub", "Total debt / equity"),
      longTermDebtToEquity: metric(extracted.longTermDebtToEquity, "", "Finnhub", "Long-term debt / equity"),
      currentRatio: metric(extracted.currentRatio, "", "Finnhub", "Current assets / current liabilities"),
      quickRatio: metric(extracted.quickRatio, "", "Finnhub", "Quick assets / current liabilities"),
      cashRatio: metric(extracted.cashRatio, "", "Finnhub", "Cash / current liabilities"),
      assetTurnover: metric(extracted.assetTurnover, "", "Finnhub", "Revenue / assets"),
      interestCoverage: metric(extracted.interestCoverage, "", "Finnhub", "EBIT / interest expense"),
      cashFlowToDebt: metric(extracted.cashFlowToDebt, "", "Finnhub", "Operating cash flow / total debt"),
      operatingCashFlowPerShare: metric(extracted.operatingCashFlowPerShare, "", "Finnhub", "Operating cash flow / share"),
      freeCashFlowPerShare: metric(extracted.freeCashFlowPerShare, "", "Finnhub", "Free cash flow / share"),
      totalDebtToCapital: metric(extracted.totalDebtToCapital, "", "Finnhub", "Debt / total capital"),
      netDebtToEbitda: metric(extracted.netDebtToEbitda, "", "Finnhub", "Net debt / EBITDA"),

      peRatio: metric(extracted.peRatio, "", "Finnhub", "Price / earnings"),
      forwardPe: metric(extracted.forwardPe, "", "Finnhub", "Forward price / earnings"),
      pegRatio: metric(extracted.pegRatio, "", "Finnhub", "P/E / growth"),
      priceToSales: metric(extracted.priceToSales, "", "Finnhub", "Price / sales"),
      priceToBook: metric(extracted.priceToBook, "", "Finnhub", "Price / book value"),
      priceToCashFlow: metric(extracted.priceToCashFlow, "", "Finnhub", "Price / cash flow"),
      priceToFreeCashFlow: metric(extracted.priceToFreeCashFlow, "", "Finnhub", "Price / free cash flow"),
      dividendYield: metric(extracted.dividendYield, "%", "Finnhub", "Annual dividend yield"),

      beta: metric(extracted.beta, "", "Finnhub", "Volatility compared with market"),
      dayChangePercent: metric(extracted.dayChangePercent, "%", "Finnhub", "Current daily price change"),
      priceReturn4Week: metric(extracted.priceReturn4Week, "%", "Finnhub", "4-week price return"),
      priceReturn13Week: metric(extracted.priceReturn13Week, "%", "Finnhub", "13-week price return"),
      priceReturn26Week: metric(extracted.priceReturn26Week, "%", "Finnhub", "26-week price return"),
      priceReturn52Week: metric(extracted.priceReturn52Week, "%", "Finnhub", "52-week price return"),
      distanceFrom52WeekLow: metric(extracted.distanceFrom52WeekLow, "%", "Calculated", "(Current price - 52-week low) / 52-week low"),
      pullbackFromHigh: metric(extracted.pullbackFromHigh, "%", "Calculated", "(52-week high - current price) / 52-week high"),

      marketCapM: metric(extracted.marketCapM, "M", "Finnhub", "Market capitalization in millions"),
      enterpriseValue: metric(null, "M", "Unavailable", "Disabled in backend reset"),
      ebitda: metric(null, "M", "Unavailable", "Disabled in backend reset"),
      evToEbitda: metric(null, "", "Unavailable", "Disabled in backend reset"),

      wacc: metric(null, "%", "Unavailable", "Will be rebuilt cleanly with FMP"),
      costOfEquity: metric(null, "%", "Unavailable", "Will be rebuilt cleanly with FMP"),
      afterTaxCostOfDebt: metric(null, "%", "Unavailable", "Will be rebuilt cleanly with FMP"),
      taxRate: metric(null, "%", "Unavailable", "Will be rebuilt cleanly with FMP"),
      dcfEnterpriseValue: metric(null, "M", "Unavailable", "Will be rebuilt cleanly with FMP"),
      intrinsicValue: metric(null, "", "Unavailable", "Will be rebuilt cleanly with FMP"),
      intrinsicValueGap: metric(null, "%", "Unavailable", "Will be rebuilt cleanly with FMP"),
      dcfGrowthRate: metric(null, "%", "Unavailable", "Will be rebuilt cleanly with FMP"),

      newsSentiment: metric(newsSentimentScore, "", newsSentiment?.source || "OpenAI + Finnhub news", "Weighted AI score from the latest 3 stock news articles"),
    },
    newsSentiment,
  };
}
