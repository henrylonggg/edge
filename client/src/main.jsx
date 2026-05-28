import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Search,
  RefreshCw,
  Plus,
  Trash2,
  Send,
  Sparkles,
  Activity,
  Building2,
  ShieldCheck,
  Target,
  TrendingUp,
  BarChart3,
  LineChart,
  Zap,
  BrainCircuit,
  Star,
  AlertTriangle,
  Info,
  Gauge,
  ArrowLeft,
} from "lucide-react";
import "./styles.css";

/*
  HARD-CODED RENDER BACKEND URL
  This avoids Vercel environment variable problems.
*/
const API = "https://edge-1-6dtw.onrender.com";

const STORAGE_KEY = "edge-watchlist-v8";

function rawScore(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return null;
  const n = Number(v);
  return n <= 10 ? n : n / 10;
}

function score10(v) {
  const n = rawScore(v);
  return n === null ? null : Number(n.toFixed(1));
}

function scoreText(v) {
  const n = score10(v);
  return n === null ? "N/A" : n.toFixed(1);
}

function scoreTone(v) {
  const n = score10(v);
  if (n === null) return "neutral";
  if (n < 5.5) return "red";
  if (n < 7.5) return "yellow";
  return "green";
}

function gradeFrom10(v) {
  const n = score10(v);
  if (n === null) return "N/A";
  if (n >= 9.3) return "A";
  if (n >= 8.5) return "B+";
  if (n >= 7.5) return "B";
  if (n >= 6.5) return "C+";
  if (n >= 5.5) return "C";
  if (n >= 4.5) return "D";
  return "F";
}

function fmt(v, suffix = "") {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "N/A";
  return `${Number(v).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  })}${suffix}`;
}

function money(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "N/A";
  return Number(v).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function compactMoney(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "N/A";
  const n = Number(v);

  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}T`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}B`;
  return `$${n.toFixed(0)}M`;
}

function readWatchlist() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveWatchlist(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function categoryLabel(key) {
  return (
    {
      growth: "Growth",
      profitability: "Profitability",
      financialHealth: "Financial Health",
      valuation: "Valuation",
      momentum: "Momentum",
      reversal: "Pullback",
    }[key] || key
  );
}

function App() {
  const [symbol, setSymbol] = useState("AAPL");
  const [data, setData] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("dashboard");

  async function analyze(e, overrideSymbol) {
    e?.preventDefault();

    const clean = (overrideSymbol || symbol).trim().toUpperCase();
    if (!clean) return null;

    setSymbol(clean);
    setLoading(true);
    setError("");

    try {
      const url = `${API}/api/analyze/${encodeURIComponent(clean)}`;

      const res = await fetch(url, {
        method: "GET",
        mode: "cors",
        headers: {
          Accept: "application/json",
        },
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          json?.error ||
            json?.message ||
            `Could not analyze ${clean}. Backend returned ${res.status}.`
        );
      }

      setData(json);
      return json;
    } catch (err) {
      setError(
        err.message ||
          "Failed to fetch from Render. Check Render logs and browser console."
      );
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function addTicker(ticker = symbol) {
    const clean = ticker.trim().toUpperCase();
    if (!clean) return;

    const analyzed = data?.symbol === clean ? data : await analyze(null, clean);
    if (!analyzed) return;

    const item = {
      symbol: clean,
      name: analyzed.profile?.name || clean,
      score: score10(analyzed.grades?.edgeScore),
      rawScore: analyzed.grades?.edgeScore ?? null,
      grade: gradeFrom10(analyzed.grades?.edgeScore),
      risk: analyzed.grades?.riskLabel || "N/A",
      price: analyzed.quote?.c ?? null,
      updatedAt: new Date().toISOString(),
    };

    const next = [item, ...watchlist.filter((x) => x.symbol !== clean)].sort(
      (a, b) => (b.score || 0) - (a.score || 0)
    );

    setWatchlist(next);
    saveWatchlist(next);
  }

  function removeTicker(ticker) {
    const next = watchlist.filter((x) => x.symbol !== ticker);
    setWatchlist(next);
    saveWatchlist(next);
  }

  async function refreshWatchlist() {
    if (!watchlist.length) return;

    setWatchLoading(true);

    const refreshed = [];

    for (const item of watchlist) {
      try {
        const res = await fetch(`${API}/api/analyze/${encodeURIComponent(item.symbol)}`, {
          method: "GET",
          mode: "cors",
          headers: {
            Accept: "application/json",
          },
        });

        const json = await res.json().catch(() => null);

        if (res.ok && json) {
          refreshed.push({
            ...item,
            name: json.profile?.name || item.name,
            score: score10(json.grades?.edgeScore),
            rawScore: json.grades?.edgeScore ?? null,
            grade: gradeFrom10(json.grades?.edgeScore),
            risk: json.grades?.riskLabel || item.risk,
            price: json.quote?.c ?? item.price,
            updatedAt: new Date().toISOString(),
          });
        } else {
          refreshed.push(item);
        }
      } catch {
        refreshed.push(item);
      }
    }

    const next = refreshed.sort((a, b) => (b.score || 0) - (a.score || 0));

    setWatchlist(next);
    saveWatchlist(next);
    setWatchLoading(false);
  }

  useEffect(() => {
    const saved = readWatchlist().sort(
      (a, b) => (b.score || 0) - (a.score || 0)
    );

    setWatchlist(saved);
    analyze(null, "AAPL");
  }, []);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/stock-edge-ai-logo.png" alt="StockEdgeAI logo" />
          <div>
            <h1>Eval AI</h1>
          </div>
        </div>

        <form onSubmit={analyze} className="searchbar">
          <button
            type="button"
            className="ai-nav-btn"
            onClick={() => setView("assistant")}
            title="Eval AI Assistant"
          >
            <BrainCircuit size={23} />
          </button>

          <div>
            <label>Stock Ticker</label>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="AAPL"
            />
          </div>

          <button disabled={loading}>
            {loading ? <RefreshCw className="spin" size={18} /> : <Search size={18} />}
            Analyze
          </button>

          <button
            type="button"
            className="ghost-btn"
            onClick={() => addTicker(symbol)}
          >
            <Plus size={18} /> Add
          </button>
        </form>
      </header>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {view === "assistant" ? (
        <AssistantPage
          current={data}
          watchlist={watchlist}
          onBack={() => setView("dashboard")}
        />
      ) : (
        <section className="layout">
          <div className="content">
            {data ? (
              <Report data={data} onAdd={() => addTicker(data.symbol)} />
            ) : (
              <EmptyReport />
            )}
          </div>

          <Watchlist
            items={watchlist}
            symbol={symbol}
            onAdd={addTicker}
            onRemove={removeTicker}
            onAnalyze={(ticker) => analyze(null, ticker)}
            onRefresh={refreshWatchlist}
            loading={watchLoading}
          />
        </section>
      )}
    </main>
  );
}

function EmptyReport() {
  return (
    <section className="empty-report">
      Type a ticker like AAPL, MSFT, or NVDA & click Analyze.
    </section>
  );
}

function Watchlist({
  items,
  symbol,
  onAdd,
  onRemove,
  onAnalyze,
  onRefresh,
  loading,
}) {
  const [manual, setManual] = useState("");

  return (
    <aside className="watch-panel">
      <div className="panel-head">
        <div>
          <h2>
            <Star size={18} /> Watchlist
          </h2>
          <p>Saved in this browser · best score first</p>
        </div>

        <button
          className="icon-btn"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh scores"
        >
          <RefreshCw size={16} className={loading ? "spin" : ""} />
        </button>
      </div>

      <form
        className="watch-add"
        onSubmit={(e) => {
          e.preventDefault();
          onAdd(manual || symbol);
          setManual("");
        }}
      >
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value.toUpperCase())}
          placeholder="Add ticker"
        />
        <button>
          <Plus size={16} />
        </button>
      </form>

      <div className="watch-list">
        {items.length === 0 ? (
          <div className="watch-empty">
            Add stocks here to compare their 0.0–10.0 Edge Scores.
          </div>
        ) : (
          items.map((item) => (
            <div className="watch-row" key={item.symbol}>
              <button className="watch-info" onClick={() => onAnalyze(item.symbol)}>
                <strong>{item.symbol}</strong>
              </button>

              <div
                className={`watch-score-ring ${scoreTone(item.score)}`}
                style={{
                  "--watch-score-angle": `${Number(score10(item.score) || 0) * 36}deg`,
                }}
              >
                <strong>{scoreText(item.score)}</strong>
              </div>

              <button className="delete-btn" onClick={() => onRemove(item.symbol)}>
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function AssistantPage({ current, watchlist, onBack }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Ask me anything stock-related — comparisons, metrics, valuation, risk, or beginner investing questions. I’ll keep it simple and practical.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function ask(e) {
    e.preventDefault();

    const clean = question.trim();
    if (!clean) return;

    const userMessage = { role: "user", content: clean };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/assistant`, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          question: clean,
          current,
          watchlist,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          json?.error ||
            json?.message ||
            `Assistant error. Backend returned ${res.status}.`
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: json?.answer || "I could not create a response.",
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err.message ||
            "Could not connect to the Render assistant endpoint.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="assistant-page">
      <div className="assistant-shell">
        <div className="assistant-page-head">
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={18} /> Dashboard
          </button>

          <div>
            <div className="assistant-kicker">
              <BrainCircuit size={16} /> Edge Assistant
            </div>
            <h2>Ask stock questions in plain English.</h2>
            <p>
              Compare stocks, understand metrics, ask about risk, or get a
              beginner-friendly breakdown before making a decision.
            </p>
          </div>
        </div>

        <div className="chat-panel">
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div className={`chat-bubble ${msg.role}`} key={`${msg.role}-${index}`}>
                <span>{msg.role === "user" ? "You" : "Edge AI"}</span>
                <p>{msg.content}</p>
              </div>
            ))}

            {loading && (
              <div className="chat-bubble assistant">
                <span>Edge AI</span>
                <p>Thinking through that question...</p>
              </div>
            )}
          </div>

          <form className="chat-input" onSubmit={ask}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Example: Is AAPL a better buy than NVDA if NVDA has the higher Edge Score?"
              rows="3"
            />
            <button disabled={loading}>
              {loading ? <RefreshCw className="spin" size={17} /> : <Send size={17} />}
              Ask
            </button>
          </form>
        </div>

        <p className="fineprint center">
          Educational only. Edge Assistant helps explain investing ideas, but it
          is not a licensed financial advisor.
        </p>
      </div>
    </section>
  );
}

function Report({ data, onAdd }) {
  const cats = data?.grades?.categories || {};
  const metrics = data?.metrics || {};
  const edge = score10(data.grades?.edgeScore);
  const tone = scoreTone(edge);

  const strongest = useMemo(
    () =>
      Object.entries(cats)
        .filter(([, v]) => v != null)
        .sort((a, b) => score10(b[1]) - score10(a[1]))[0],
    [cats]
  );

  const weakest = useMemo(
    () =>
      Object.entries(cats)
        .filter(([, v]) => v != null)
        .sort((a, b) => score10(a[1]) - score10(b[1]))[0],
    [cats]
  );

  const rows = [
    [
      "P/E Ratio",
      metrics.peRatio,
      "Price compared to earnings. Lower can mean cheaper, but growth stocks often look expensive.",
    ],
    [
      "ROE",
      metrics.roe,
      "How well the company turns shareholder money into profit.",
    ],
    [
      "Debt-to-Equity",
      metrics.debtToEquity,
      "How much debt the company has compared with owner value.",
    ],
    ["Net Margin", metrics.netMargin, "How much sales money becomes profit."],
    [
      "Revenue Growth",
      metrics.revenueGrowth,
      "Whether the company is selling more over time.",
    ],
    [
      "Beta",
      metrics.beta,
      "How jumpy the stock usually is compared with the market.",
    ],
  ];

  return (
    <>
      <section className="hero-card">
        <div className="score-panel">
          <div
            className={`score-ring ${tone}`}
            style={{ "--score-angle": `${(edge || 0) * 36}deg` }}
          >
            <div className="score-core">
              <span>EDGE SCORE</span>
              <strong>{scoreText(edge)}</strong>
            </div>
          </div>
        </div>

        <div className="company-panel">
          <div className="eyebrow">
            <Sparkles size={15} /> Current stock report
          </div>

          <h2>{data.profile?.name || data.symbol}</h2>
          <p className="subline">
            {data.symbol} · {data.profile?.finnhubIndustry || "Public company"}
          </p>

          <div className="hero-actions">
            <button onClick={onAdd}>
              <Plus size={17} /> Add to Watchlist
            </button>

            {data.profile?.weburl && (
              <a href={data.profile.weburl} target="_blank" rel="noreferrer">
                Company site
              </a>
            )}
          </div>
        </div>

        <div className="snapshot-grid">
          <MiniStat icon={<Activity size={17} />} label="Price" value={money(data.quote?.c)} />
          <MiniStat icon={<ShieldCheck size={17} />} label="Risk" value={data.grades.riskLabel} />
          <MiniStat
            icon={<Building2 size={17} />}
            label="Market Cap"
            value={compactMoney(data.grades.context?.marketCapM)}
          />
        </div>
      </section>

      <section className="summary-grid">
        <div className="story-card big">
          <div className="section-title">
            <Building2 size={17} /> What this company does
          </div>
          <p>{data.companyDescription}</p>
        </div>

        <div className="story-card">
          <div className="section-title">
            <Target size={17} /> Fast read
          </div>
          <p>
            <b>Strongest:</b>{" "}
            {strongest
              ? `${categoryLabel(strongest[0])} (${scoreText(strongest[1])})`
              : "N/A"}
          </p>
          <p>
            <b>Weakest:</b>{" "}
            {weakest
              ? `${categoryLabel(weakest[0])} (${scoreText(weakest[1])})`
              : "N/A"}
          </p>
          <p>
            <b>Grade:</b> {gradeFrom10(edge)}
          </p>
        </div>
      </section>

      <section className="summary-card">
        <div className="section-title">
          <Info size={17} /> Simple evaluation
        </div>
        <p>{data.evaluationSummary}</p>
      </section>

      <section className="grade-grid">
        <Grade name="Growth" value={cats.growth} icon={<TrendingUp size={18} />} />
        <Grade name="Profitability" value={cats.profitability} icon={<BarChart3 size={18} />} />
        <Grade
          name="Financial Health"
          value={cats.financialHealth}
          icon={<ShieldCheck size={18} />}
        />
        <Grade name="Valuation" value={cats.valuation} icon={<Target size={18} />} />
        <Grade name="Momentum" value={cats.momentum} icon={<LineChart size={18} />} />
        <Grade name="Pullback" value={cats.reversal} icon={<Zap size={18} />} />
      </section>

      <section className="metrics-card">
        <div className="section-title">
          <Gauge size={17} /> Key metrics
        </div>

        <div className="metric-grid">
          {rows.map(([label, item, help]) => (
            <Metric key={label} label={label} item={item} help={help} />
          ))}
        </div>
      </section>
    </>
  );
}

function MiniStat({ icon, label, value }) {
  return (
    <div className="mini-stat">
      <span>
        {icon}
        {label}
      </span>
      <b>{value}</b>
    </div>
  );
}

function Grade({ name, value, icon }) {
  const s = score10(value);
  const tone = scoreTone(s);

  return (
    <div className="grade-card">
      <div className="grade-head">
        <span>{icon}</span>
        <h3>{name}</h3>
      </div>

      <div className="grade-line">
        <span className={tone} style={{ width: `${(s || 0) * 10}%` }} />
      </div>

      <strong className={tone}>{scoreText(s)}</strong>
    </div>
  );
}

function Metric({ label, item, help }) {
  return (
    <div className="metric-tile">
      <div>
        <h3>{label}</h3>
        <span>{item?.source || "Unavailable"}</span>
      </div>

      <strong>{fmt(item?.value, item?.suffix || "")}</strong>
      <p>{help}</p>

      {item?.formula && <small>{item.formula}</small>}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
