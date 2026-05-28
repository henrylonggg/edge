// client/src/main.jsx

import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5050";

function formatNumber(value, decimals = 2) {
  const num = Number(value);

  if (!Number.isFinite(num)) return "N/A";

  return num.toLocaleString(undefined, {
    maximumFractionDigits: decimals,
  });
}

function formatMoney(value) {
  const num = Number(value);

  if (!Number.isFinite(num)) return "N/A";

  if (Math.abs(num) >= 1_000_000_000_000) {
    return `$${(num / 1_000_000_000_000).toFixed(2)}T`;
  }

  if (Math.abs(num) >= 1_000_000_000) {
    return `$${(num / 1_000_000_000).toFixed(2)}B`;
  }

  if (Math.abs(num) >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(2)}M`;
  }

  return `$${num.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

function MetricCard({ label, value, suffix = "" }) {
  return (
    <div className="metric-card">
      <p>{label}</p>
      <strong>
        {value === null || value === undefined || value === "N/A"
          ? "N/A"
          : `${value}${suffix}`}
      </strong>
    </div>
  );
}

function ScoreBreakdown({ title, data }) {
  if (!data) return null;

  const score = data.score;

  return (
    <div className="breakdown-card">
      <div className="breakdown-top">
        <span>{title}</span>
        <strong>{score === null ? "N/A" : `${(score / 10).toFixed(1)}`}</strong>
      </div>

      <div className="score-bar">
        <div
          className="score-fill"
          style={{
            width: `${score === null ? 0 : Math.max(0, Math.min(100, score))}%`,
          }}
        />
      </div>

      <div className="used-skipped">
        <p>
          <b>Used:</b>{" "}
          {data.used?.length ? data.used.join(", ") : "No valid metrics"}
        </p>

        {data.skipped?.length > 0 && (
          <p>
            <b>Skipped:</b> {data.skipped.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}

function App() {
  const [ticker, setTicker] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [error, setError] = useState("");

  const cleanTicker = useMemo(() => {
    return ticker.trim().toUpperCase().replace(/[^A-Z.-]/g, "").slice(0, 12);
  }, [ticker]);

  async function analyzeStock() {
    if (!cleanTicker) {
      setError("Enter a ticker first.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis(null);
    setRecommendation(null);

    try {
      const response = await fetch(`${API_BASE}/api/analyze/${cleanTicker}`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Stock analysis failed.");
      }

      setAnalysis(data);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function calculateRecommendation() {
    if (!cleanTicker) {
      setError("Analyze a ticker first.");
      return;
    }

    if (!investmentAmount || Number(investmentAmount) <= 0) {
      setError("Enter a valid investment amount.");
      return;
    }

    setRecommendLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/api/recommend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticker: cleanTicker,
          amount: Number(investmentAmount),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Recommendation failed.");
      }

      setRecommendation(data.recommendation);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setRecommendLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="brand-row">
          <div className="logo-mark">SE</div>
          <div>
            <h1>StockEdgeAI</h1>
            <p>Advanced stock scoring using quality metrics only when valid data exists.</p>
          </div>
        </div>

        <div className="search-card">
          <input
            value={ticker}
            maxLength={12}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="Enter ticker"
          />

          <button onClick={analyzeStock} disabled={loading}>
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}
      </header>

      {analysis && (
        <main className="dashboard">
          <section className="score-section">
            <div className="company-card">
              <div className="company-top">
                {analysis.logo && (
                  <img src={analysis.logo} alt="" className="company-logo" />
                )}

                <div>
                  <h2>{analysis.companyName}</h2>
                  <p>
                    {analysis.ticker} · {analysis.exchange} · {analysis.industry}
                  </p>
                </div>
              </div>

              <p className="company-description">{analysis.description}</p>

              <div className="price-row">
                <span>Current Price</span>
                <strong>{formatMoney(analysis.currentPrice)}</strong>
              </div>
            </div>

            <div className="power-card">
              <p className="small-label">Power Score</p>

              <div className="power-score">
                {analysis.score?.powerScore ?? "N/A"}
              </div>

              <div className="rating-pill">
                {analysis.score?.rating || "N/A"}
              </div>

              <p className="risk-text">
                Risk Level: <b>{analysis.score?.riskLabel || "N/A"}</b>
              </p>

              <div className="invest-box">
                <h3>Investment Amount Recommendation</h3>
                <p>
                  Enter how much money you are considering investing. The model will suggest how much to invest right now based on Power Score, risk, valuation, profitability, growth, and financial strength.
                </p>

                <div className="invest-input-row">
                  <input
                    type="number"
                    min="0"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(e.target.value)}
                    placeholder="Example: 1000"
                  />

                  <button onClick={calculateRecommendation} disabled={recommendLoading}>
                    {recommendLoading ? "Calculating..." : "Calculate"}
                  </button>
                </div>

                {recommendation && (
                  <div className="recommend-result">
                    {recommendation.available ? (
                      <>
                        <div>
                          <span>Recommended Amount</span>
                          <strong>
                            {formatMoney(recommendation.recommendedDollarAmount)}
                          </strong>
                        </div>

                        <div>
                          <span>Suggested Allocation</span>
                          <strong>{recommendation.recommendedPercent}%</strong>
                        </div>

                        <p>{recommendation.explanation}</p>

                        {recommendation.skippedMetrics?.length > 0 && (
                          <p className="tiny-note">
                            Missing metrics skipped:{" "}
                            {recommendation.skippedMetrics.join(", ")}
                          </p>
                        )}
                      </>
                    ) : (
                      <p>{recommendation.explanation}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="metrics-section">
            <h2>Key Metrics</h2>

            <div className="metric-grid">
              <MetricCard label="Market Cap" value={analysis.displayMetrics?.marketCap} />
              <MetricCard label="Revenue" value={analysis.displayMetrics?.revenue} />
              <MetricCard label="Net Income" value={analysis.displayMetrics?.netIncome} />
              <MetricCard label="Operating Income" value={analysis.displayMetrics?.operatingIncome} />
              <MetricCard label="EBITDA" value={analysis.displayMetrics?.ebitda} />
              <MetricCard label="Free Cash Flow" value={analysis.displayMetrics?.freeCashFlow} />

              <MetricCard label="P/E" value={formatNumber(analysis.metrics?.peTTM)} />
              <MetricCard label="P/S" value={formatNumber(analysis.metrics?.psTTM)} />
              <MetricCard label="P/B" value={formatNumber(analysis.metrics?.pbAnnual)} />
              <MetricCard label="EV/EBITDA" value={formatNumber(analysis.metrics?.evToEbitda)} />

              <MetricCard label="Gross Margin" value={formatNumber(analysis.metrics?.grossMargin)} suffix="%" />
              <MetricCard label="Operating Margin" value={formatNumber(analysis.metrics?.operatingMargin)} suffix="%" />
              <MetricCard label="Net Margin" value={formatNumber(analysis.metrics?.netMargin)} suffix="%" />
              <MetricCard label="ROE" value={formatNumber(analysis.metrics?.roe)} suffix="%" />
              <MetricCard label="ROA" value={formatNumber(analysis.metrics?.roa)} suffix="%" />

              <MetricCard label="Revenue Growth" value={formatNumber(analysis.metrics?.revenueGrowth)} suffix="%" />
              <MetricCard label="EPS Growth" value={formatNumber(analysis.metrics?.epsGrowth)} suffix="%" />
              <MetricCard label="EBITDA CAGR 5Y" value={formatNumber(analysis.metrics?.ebitdaCagr5Y)} suffix="%" />

              <MetricCard label="Current Ratio" value={formatNumber(analysis.metrics?.currentRatio)} />
              <MetricCard label="Quick Ratio" value={formatNumber(analysis.metrics?.quickRatio)} />
              <MetricCard label="Debt/Equity" value={formatNumber(analysis.metrics?.debtToEquity)} />
              <MetricCard label="Beta" value={formatNumber(analysis.metrics?.beta)} />

              <MetricCard label="1Y Momentum" value={formatNumber(analysis.metrics?.priceMomentum1Y)} suffix="%" />
              <MetricCard label="Volatility" value={formatNumber(analysis.metrics?.volatility)} suffix="%" />
              <MetricCard label="Max Drawdown" value={formatNumber(analysis.metrics?.maxDrawdown)} suffix="%" />
              <MetricCard label="Trend Strength" value={formatNumber(analysis.metrics?.trendStrength)} suffix="%" />
            </div>
          </section>

          <section className="breakdown-section">
            <h2>Score Breakdown</h2>

            <div className="breakdown-grid">
              <ScoreBreakdown
                title="Valuation"
                data={analysis.score?.categories?.valuation}
              />

              <ScoreBreakdown
                title="Profitability"
                data={analysis.score?.categories?.profitability}
              />

              <ScoreBreakdown
                title="Growth"
                data={analysis.score?.categories?.growth}
              />

              <ScoreBreakdown
                title="Financial Strength"
                data={analysis.score?.categories?.financialStrength}
              />

              <ScoreBreakdown
                title="Momentum"
                data={analysis.score?.categories?.momentum}
              />

              <ScoreBreakdown
                title="Risk Control"
                data={analysis.score?.categories?.risk}
              />
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
