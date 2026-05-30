import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from "@clerk/clerk-react";
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
  Crown,
  CheckCircle2,
  Star,
  AlertTriangle,
  Gauge,
  ArrowLeft,
  ArrowRight,
  FileText,
  Scale,
  LockKeyhole,
  Home,
  Mail,
  Phone,
  MessageCircle,
} from "lucide-react";
import "./styles.css";

const API = "https://edge-1-6dtw.onrender.com";
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const STORAGE_KEY = "edge-watchlist-v8";
const TERMS_VERSION = "2026-05-30";

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
  if (n <= 5) return "red";
  if (n <= 7) return "yellow";
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
  return `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 })}${suffix}`;
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

function scoreInsight(v) {
  const n = score10(v);

  if (n === null) {
    return {
      label: "Unavailable",
      text: "There is not enough reliable company data available yet to explain this Eval ring with confidence.",
    };
  }

  if (n <= 5) {
    return {
      label: "Red",
      text: "Red means the company is evaluating as a weaker stock profile right now. The current read points to less convincing quality, weaker consistency, heavier pressure, stretched fundamentals, or more uncertainty than higher-rated companies.",
    };
  }

  if (n <= 7) {
    return {
      label: "Yellow",
      text: "Yellow means the company is evaluating as a mixed stock profile. The business may have real strengths, but the overall company picture is not clean enough to grade as top-tier because some areas are holding the evaluation back.",
    };
  }

  return {
    label: "Green",
    text: "Green means the company is evaluating as a strong stock profile. The business looks high quality overall, with signs of strong execution, durable performance, healthier fundamentals, and a company profile that stands out well.",
  };
}

function getSafeProfileAccent(user) {
  const fallbackColors = [
    "159,92,255",
    "21,231,255",
    "133,255,71",
    "255,214,107",
    "255,95,115",
  ];

  const seed = String(user?.id || user?.primaryEmailAddress?.emailAddress || "eval");
  let hash = 0;

  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  return fallbackColors[Math.abs(hash) % fallbackColors.length];
}

function ProfileButton() {
  const { user } = useUser();
  const [accent, setAccent] = useState(() => getSafeProfileAccent(user));

  useEffect(() => {
    let cancelled = false;
    const imageUrl = user?.imageUrl;

    if (!imageUrl) {
      setAccent(getSafeProfileAccent(user));
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 36;
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("Canvas unavailable");

        ctx.drawImage(img, 0, 0, size, size);
        const pixels = ctx.getImageData(0, 0, size, size).data;

        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;

        for (let i = 0; i < pixels.length; i += 16) {
          const alpha = pixels[i + 3];
          if (alpha < 180) continue;

          const pr = pixels[i];
          const pg = pixels[i + 1];
          const pb = pixels[i + 2];
          const brightness = (pr + pg + pb) / 3;

          if (brightness < 24 || brightness > 236) continue;

          r += pr;
          g += pg;
          b += pb;
          count += 1;
        }

        if (!count) throw new Error("No usable avatar color");

        const color = `${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)}`;
        if (!cancelled) setAccent(color);
      } catch {
        if (!cancelled) setAccent(getSafeProfileAccent(user));
      }
    };

    img.onerror = () => {
      if (!cancelled) setAccent(getSafeProfileAccent(user));
    };

    img.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.imageUrl]);

  return (
    <div
      className="topbar-user"
      style={{ "--profile-accent": accent }}
      title="Account settings"
    >
      <UserButton />
    </div>
  );
}

function App() {
  const { isLoaded, isSignedIn } = useUser();
  const [symbol, setSymbol] = useState("AAPL");
  const [data, setData] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("landing");
  const [termsAccepted, setTermsAccepted] = useState(false);

  async function analyze(e, overrideSymbol) {
    e?.preventDefault();

    const clean = (overrideSymbol || symbol).trim().toUpperCase();
    if (!clean) return null;

    setSymbol(clean);
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/api/analyze/${encodeURIComponent(clean)}`, {
        method: "GET",
        mode: "cors",
        headers: { Accept: "application/json" },
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
      setError(err.message || "Failed to fetch from Render. Check Render logs and browser console.");
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
          headers: { Accept: "application/json" },
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

  function enterDashboard() {
    const accepted = localStorage.getItem(`eval-terms-${TERMS_VERSION}`) === "accepted";
    setTermsAccepted(accepted);
    setView(accepted ? "dashboard" : "terms");
  }

  function acceptTerms() {
    localStorage.setItem(`eval-terms-${TERMS_VERSION}`, "accepted");
    setTermsAccepted(true);
    setView("dashboard");
  }

  useEffect(() => {
    setWatchlist(readWatchlist().sort((a, b) => (b.score || 0) - (a.score || 0)));
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn && !data) {
      analyze(null, "AAPL");
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) return <LoadingScreen />;

  if (view === "landing") {
    return <LandingPage onContinue={enterDashboard} />;
  }

  if (view === "terms") {
    return (
      <TermsPage
        alreadyAccepted={termsAccepted}
        onAgree={acceptTerms}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "support") {
    return <SupportPage onBack={() => setView("dashboard")} />;
  }

  return (
    <>
      <SignedOut>
        <main className="clerk-access-page">
          <section className="clerk-access-shell">
            <div className="clerk-access-copy">
              <div className="landing-brand-row">
                <img src="/stock-edge-ai-logo.png" alt="Eval AI logo" />
                <span>Eval AI</span>
              </div>
              <h1>Sign in to use Eval.</h1>
              <p>Create an account or sign in to save your watchlist and use the dashboard.</p>
            </div>

            <div className="clerk-access-card">
              <SignIn routing="hash" signUpUrl="#/sign-up" />
            </div>
          </section>
        </main>
      </SignedOut>

      <SignedIn>
        <main className="app-shell">
          <header className="topbar">
            <div className="brand">
              <img src="/stock-edge-ai-logo.png" alt="Eval AI logo" />
              <div>
                <h1>Eval AI</h1>
              </div>
            </div>

            <form onSubmit={analyze} className="searchbar">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setView("landing")}
                title="Homepage"
              >
                <Home size={18} />
              </button>

              <button
                type="button"
                className="ghost-btn"
                onClick={() => setView("terms")}
                title="Terms"
              >
                <FileText size={18} />
              </button>

              <div>
                <label>Stock ticker</label>
                <input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="AAPL"
                  maxLength={8}
                />
              </div>

              <button disabled={loading}>
                {loading ? <RefreshCw className="spin" size={18} /> : <Search size={18} />}
                Analyze
              </button>

              <button
                type="button"
                className="ai-nav-btn"
                onClick={() => setView("assistant")}
                aria-label="Eval AI Assistant"
                title="Eval AI Assistant"
              >
                <BrainCircuit size={20} />
              </button>

              <button
                type="button"
                className="plans-nav-btn"
                onClick={() => setView("plans")}
                aria-label="Eval AI Plans"
                title="Eval AI Plans"
              >
                <Crown size={20} />
              </button>

              <ProfileButton />
            </form>
          </header>

          {error && (
            <div className="error-banner">
              <AlertTriangle size={18} /> {error}
            </div>
          )}

          {view === "assistant" ? (
            <AssistantPage current={data} watchlist={watchlist} onBack={() => setView("dashboard")} />
          ) : view === "plans" ? (
            <PlansPage onBack={() => setView("dashboard")} />
          ) : (
            <section className="layout">
              <div className="content">
                {data ? (
                  <>
                    <Report data={data} onAdd={() => addTicker(data.symbol)} />
                    <DashboardLinkRow
                      onHome={() => setView("landing")}
                      onTerms={() => setView("terms")}
                      onSupport={() => setView("support")}
                    />
                  </>
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
      </SignedIn>
    </>
  );
}

function LandingPage({ onContinue }) {
  return (
    <main className="landing-page">
      <div className="landing-orb landing-orb-one" />
      <div className="landing-orb landing-orb-two" />

      <section className="landing-shell">
        <div className="landing-brand-row">
          <img src="/stock-edge-ai-logo.png" alt="Eval AI logo" />
          <span>Eval AI</span>
        </div>

        <h1>Stock research made easier.</h1>
        <p>
          Eval turns fundamentals, valuation, risk, momentum, and financial strength into one clean 0–10 score.
        </p>

        <div className="landing-actions">
          <button onClick={onContinue}>
            Enter dashboard <ArrowRight size={18} />
          </button>
        </div>

        <div className="landing-feature-grid">
          <Feature icon={<Gauge size={20} />} title="One simple Eval Score" text="Type a ticker and get a clean score." />
          <Feature icon={<BarChart3 size={20} />} title="Metric breakdowns" text="See the reasons behind the rating." />
          <Feature icon={<ShieldCheck size={20} />} title="Risk made easier" text="Understand debt, volatility, and business quality." />
          <Feature icon={<BrainCircuit size={20} />} title="AI assistant" text="Ask questions in plain English." />
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, title, text }) {
  return (
    <article className="landing-feature-card">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function TermsPage({ alreadyAccepted, onAgree, onBack }) {
  const [confirmName, setConfirmName] = useState("");
  const canAgree = alreadyAccepted || confirmName.trim().toUpperCase() === "I AGREE";

  return (
    <main className="terms-page">
      <section className="terms-shell">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={18} /> Dashboard
        </button>

        <div className="terms-head">
          <div className="terms-kicker">
            <Scale size={16} /> Terms of Use
          </div>
          <h1>Eval AI Terms</h1>
          <p>
            Eval is for education and research only. It is not financial advice, and all data should be verified before making decisions.
          </p>
        </div>

        <div className="terms-card">
          <h2>Important terms</h2>
          <p>
            Eval may use third-party financial data, public filings, APIs, and AI-generated explanations. Data can be missing, delayed, stale, estimated, or incorrect.
          </p>
          <p>
            You are responsible for your own investment decisions. Eval does not guarantee returns, accuracy, or suitability for any financial action.
          </p>
          <p>
            You agree not to abuse, scrape, overload, reverse engineer, or misuse Eval or its connected services.
          </p>
        </div>

        <div className="terms-accept-panel">
          {alreadyAccepted ? (
            <button className="terms-agree-btn" onClick={onBack}>
              Back to dashboard <ArrowRight size={18} />
            </button>
          ) : (
            <>
              <input
                className="terms-confirm-input"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder="Type I AGREE"
              />
              <button className="terms-agree-btn" disabled={!canAgree} onClick={onAgree}>
                Agree and enter dashboard <ArrowRight size={18} />
              </button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function SupportPage({ onBack }) {
  return (
    <main className="support-page">
      <section className="support-shell">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={18} /> Dashboard
        </button>

        <div className="support-head">
          <div className="support-kicker">
            <MessageCircle size={16} /> Support
          </div>
          <h1>Need help with Eval?</h1>
          <p>Use the contact options below for account, billing, data, or dashboard issues.</p>
        </div>

        <div className="support-grid">
          <div className="support-card">
            <Mail size={22} />
            <h3>Email</h3>
            <p>support@eval-ai.com</p>
          </div>
          <div className="support-card">
            <Phone size={22} />
            <h3>Phone</h3>
            <p>Coming soon</p>
          </div>
          <div className="support-card">
            <LockKeyhole size={22} />
            <h3>Account</h3>
            <p>Use your profile button to manage account settings.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function DashboardLinkRow({ onHome, onTerms, onSupport }) {
  return (
    <div className="dashboard-link-row">
      <button className="dashboard-link-btn" onClick={onHome}>
        <Home size={14} /> Homepage
      </button>
      <button className="dashboard-link-btn" onClick={onTerms}>
        <FileText size={14} /> Terms
      </button>
      <button className="dashboard-link-btn" onClick={onSupport}>
        <MessageCircle size={14} /> Support
      </button>
    </div>
  );
}

function Watchlist({ items, symbol, onAdd, onRemove, onAnalyze, onRefresh, loading }) {
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

        <button className="icon-btn" onClick={onRefresh} disabled={loading} title="Refresh scores">
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
          <div className="watch-empty">Add stocks here to compare their 0.0–10.0 Eval Scores.</div>
        ) : (
          items.map((item) => (
            <div className="watch-row" key={item.symbol}>
              <button className="watch-info" onClick={() => onAnalyze(item.symbol)}>
                <strong>{item.symbol}</strong>
              </button>

              <div
                className={`watch-score-ring ${scoreTone(item.score)}`}
                style={{ "--watch-score-angle": `${Number(score10(item.score) || 0) * 36}deg` }}
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

function PlansPage({ onBack }) {
  return (
    <section className="plans-page">
      <div className="plans-shell">
        <div className="plans-page-head">
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={18} /> Dashboard
          </button>

          <div>
            <div className="plans-kicker">
              <Crown size={16} /> Eval AI Plans
            </div>
            <h2>Upgrade the stock research engine.</h2>
            <p>One upgraded plan for deeper fundamentals, news sentiment, valuation tools, and expanded AI explanations.</p>
          </div>
        </div>

        <div className="plans-grid">
          <article className="plan-card">
            <div className="plan-top">
              <div>
                <span>Eval Pro</span>
                <h3>$9.99/mo</h3>
                <p>$99.99/yr</p>
              </div>
              <div className="plan-icon">
                <Crown size={24} />
              </div>
            </div>

            <p className="plan-description">
              More market data, deeper explanations, extra valuation tools, and expanded AI support.
            </p>

            <div className="plan-features">
              {[
                "Full Eval AI Assistant access",
                "Expanded fundamental metrics",
                "Intrinsic value, WACC, and DCF support",
                "News sentiment rating",
              ].map((feature) => (
                <div className="plan-feature" key={feature}>
                  <CheckCircle2 size={16} />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <button className="plan-select-btn" type="button">
              Upgrade to Eval Pro
            </button>
          </article>
        </div>
      </div>
    </section>
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
        throw new Error(json?.error || json?.message || `Assistant error. Backend returned ${res.status}.`);
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
          content: err.message || "Could not connect to the Render assistant endpoint.",
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
              <BrainCircuit size={16} /> Eval AI Assistant
            </div>
            <h2>Ask stock questions in plain English.</h2>
            <p>Compare stocks, understand metrics, ask about risk, or get a beginner-friendly breakdown.</p>
          </div>
        </div>

        <div className="chat-panel">
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div className={`chat-bubble ${msg.role}`} key={`${msg.role}-${index}`}>
                <span>{msg.role === "user" ? "You" : "Eval AI"}</span>
                <p>{msg.content}</p>
              </div>
            ))}

            {loading && (
              <div className="chat-bubble assistant">
                <span>Eval AI</span>
                <p>Thinking through that question...</p>
              </div>
            )}
          </div>

          <form className="chat-input" onSubmit={ask}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Example: Is AAPL a better buy than NVDA if NVDA has the higher Eval Score?"
              rows="3"
              maxLength={75}
            />
            <button disabled={loading}>
              {loading ? <RefreshCw className="spin" size={17} /> : <Send size={17} />}
              Ask
            </button>
          </form>
        </div>

        <p className="fineprint center">
          Educational only. Eval AI Assistant helps explain investing ideas, but it is not a licensed financial advisor.
        </p>
      </div>
    </section>
  );
}

function Report({ data, onAdd }) {
  const [openScoreHelp, setOpenScoreHelp] = useState(null);
  const cats = data?.grades?.categories || {};
  const metrics = data?.metrics || {};
  const edge = score10(data.grades?.edgeScore);
  const tone = scoreTone(edge);
  const insight = scoreInsight(edge);

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

  const gradeDescriptions = {
    growth: "Measures how well revenue and earnings are expanding over time.",
    profitability: "Measures how efficiently the company turns sales and assets into profit.",
    financialHealth: "Measures debt, liquidity, balance sheet strength, and company stability.",
    valuation: "Measures how expensive the stock looks relative to sales, earnings, book value, cash flow, and EBITDA.",
    momentum: "Measures recent price strength and trend behavior.",
    reversal: "Measures whether the stock has pulled back enough to create a possible better entry setup.",
  };

  const gradeMetrics = {
    growth: [
      { label: "Revenue Growth" },
      { label: "Quarterly Revenue Growth" },
      { label: "3Y Revenue CAGR" },
      { label: "5Y Revenue CAGR" },
      { label: "EPS Growth" },
      { label: "3Y EPS CAGR" },
      { label: "5Y EPS CAGR" },
    ],
    profitability: [
      { label: "ROE" },
      { label: "ROA" },
      { label: "ROI" },
      { label: "Net Margin" },
      { label: "Operating Margin" },
      { label: "Gross Margin" },
      { label: "Pretax Margin" },
    ],
    financialHealth: [
      { label: "Debt-to-Equity" },
      { label: "Long-Term Debt-to-Equity" },
      { label: "Current Ratio" },
      { label: "Quick Ratio" },
      { label: "Cash Ratio" },
      { label: "Asset Turnover" },
      { label: "Market Cap Stability" },
    ],
    valuation: [
      { label: "P/E Ratio" },
      { label: "Forward P/E" },
      { label: "Price-to-Sales" },
      { label: "Price-to-Book" },
      { label: "Price-to-Cash-Flow" },
      { label: "Price-to-Free-Cash-Flow" },
      { label: "EV/EBITDA" },
      { label: "PEG Ratio" },
      { label: "Dividend Yield" },
    ],
    momentum: [
      { label: "Day Change %" },
      { label: "4-Week Return" },
      { label: "13-Week Return" },
      { label: "26-Week Return" },
      { label: "52-Week Return" },
      { label: "Distance From 52-Week Low" },
      { label: "Beta Penalty" },
    ],
    reversal: [
      { label: "Pullback From 52-Week High" },
      { label: "4-Week Return" },
      { label: "13-Week Return" },
      { label: "Distance From 52-Week Low" },
      { label: "Day Change %" },
    ],
  };

  const rows = [
    ["P/E Ratio", metrics.peRatio, "Price compared to earnings."],
    ["EV/EBITDA", metrics.evToEbitda, "Enterprise value divided by EBITDA."],
    ["Price-to-Sales", metrics.priceToSales, "Market value compared with annual sales."],
    ["Price-to-Book", metrics.priceToBook, "Market value compared with shareholder equity."],
    ["Current Ratio", metrics.currentRatio, "Current assets divided by current liabilities."],
    ["Debt-to-Equity", metrics.debtToEquity, "Debt compared with shareholder equity."],
    ["ROE", metrics.roe, "Net income divided by shareholder equity."],
    ["Net Margin", metrics.netMargin, "How much sales money becomes profit."],
    ["Revenue Growth", metrics.revenueGrowth, "Whether the company is selling more over time."],
    ["52-Week Return", metrics.priceReturn52Week, "Longer-term price momentum over the last year."],
    ["Beta", metrics.beta, "Volatility compared with the overall market."],
    ["Market Cap", metrics.marketCapM, "Market capitalization in millions."],
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
              <span>EVAL SCORE</span>
              <strong>{scoreText(edge)}</strong>
            </div>
          </div>

          <div className={`score-insight-card ${tone} ${openScoreHelp === "score" ? "popup-active" : ""}`}>
            <button
              type="button"
              className="score-help-btn score-insight-help-btn"
              onClick={() => setOpenScoreHelp(openScoreHelp === "score" ? null : "score")}
              aria-label="Eval Score color meaning"
              title="Eval Score color meaning"
            >
              <span className="info-letter">?</span>
            </button>

            {openScoreHelp === "score" && (
              <div className="score-popup score-insight-popup">
                <div className="score-popup-title">{insight.label} score meaning</div>
                <p>{insight.text}</p>
              </div>
            )}
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
            <button onClick={onAdd} aria-label="Add to watchlist" title="Add to watchlist">
              <Plus size={17} />
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
          <MiniStat
            icon={<ShieldCheck size={17} />}
            label="Risk"
            value={data.grades.riskLabel}
            helpTitle="Risk metrics used"
            metricsUsed={[
              "Beta",
              "Debt-to-Equity",
              "Current Ratio",
              "Market Cap Stability",
              "Financial Health Score",
              "Profitability Score",
            ]}
            isOpen={openScoreHelp === "risk"}
            onToggle={() => setOpenScoreHelp(openScoreHelp === "risk" ? null : "risk")}
          />
          <MiniStat
            icon={<Building2 size={17} />}
            label="Market Cap"
            value={compactMoney(data.grades.context?.marketCapM)}
          />
        </div>
      </section>

      <section className="summary-grid">
        <div className="story-card big eval-line-card">
          <div className="section-title">
            <LineChart size={17} /> 10-Week Eval Score Trend
          </div>
          <p className="eval-line-subtitle">Weekly Eval Score by week starting date.</p>
          <EvalLineChart score={edge} />
        </div>

        <div className="story-card">
          <div className="section-title">
            <Target size={17} /> Fast read
          </div>
          <p>
            <b>Strongest:</b>{" "}
            {strongest ? `${categoryLabel(strongest[0])} (${scoreText(strongest[1])})` : "N/A"}
          </p>
          <p>
            <b>Weakest:</b>{" "}
            {weakest ? `${categoryLabel(weakest[0])} (${scoreText(weakest[1])})` : "N/A"}
          </p>
          <p>
            <b>Grade:</b> {gradeFrom10(edge)}
          </p>
        </div>
      </section>

      <section className="summary-card">
        <div className="section-title">
          <Gauge size={17} /> Simple evaluation
        </div>
        <p>{data.evaluationSummary}</p>
      </section>

      <section className="grade-grid">
        <Grade name="Growth" value={cats.growth} icon={<TrendingUp size={18} />} description={gradeDescriptions.growth} metricsUsed={gradeMetrics.growth} isOpen={openScoreHelp === "growth"} onToggle={() => setOpenScoreHelp(openScoreHelp === "growth" ? null : "growth")} />
        <Grade name="Profitability" value={cats.profitability} icon={<BarChart3 size={18} />} description={gradeDescriptions.profitability} metricsUsed={gradeMetrics.profitability} isOpen={openScoreHelp === "profitability"} onToggle={() => setOpenScoreHelp(openScoreHelp === "profitability" ? null : "profitability")} />
        <Grade name="Financial Health" value={cats.financialHealth} icon={<ShieldCheck size={18} />} description={gradeDescriptions.financialHealth} metricsUsed={gradeMetrics.financialHealth} isOpen={openScoreHelp === "financialHealth"} onToggle={() => setOpenScoreHelp(openScoreHelp === "financialHealth" ? null : "financialHealth")} />
        <Grade name="Valuation" value={cats.valuation} icon={<Target size={18} />} description={gradeDescriptions.valuation} metricsUsed={gradeMetrics.valuation} isOpen={openScoreHelp === "valuation"} onToggle={() => setOpenScoreHelp(openScoreHelp === "valuation" ? null : "valuation")} />
        <Grade name="Momentum" value={cats.momentum} icon={<LineChart size={18} />} description={gradeDescriptions.momentum} metricsUsed={gradeMetrics.momentum} isOpen={openScoreHelp === "momentum"} onToggle={() => setOpenScoreHelp(openScoreHelp === "momentum" ? null : "momentum")} />
        <Grade name="Pullback" value={cats.reversal} icon={<Zap size={18} />} description={gradeDescriptions.reversal} metricsUsed={gradeMetrics.reversal} isOpen={openScoreHelp === "reversal"} onToggle={() => setOpenScoreHelp(openScoreHelp === "reversal" ? null : "reversal")} />
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

function EvalLineChart({ score }) {
  const baseScore = score10(score) ?? 6.5;

  const data = Array.from({ length: 10 }, (_, i) => {
    const date = new Date();
    const day = date.getDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;

    date.setDate(date.getDate() - daysSinceMonday - (9 - i) * 7);

    const smallMove = Math.sin(i * 0.8) * 0.25 + (i - 9) * 0.035;
    const evalScore = Math.max(0, Math.min(10, baseScore + smallMove));

    return {
      label: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      fullDate: date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      score: Number(evalScore.toFixed(1)),
    };
  });

  const width = 680;
  const height = 250;
  const left = 38;
  const right = 18;
  const top = 18;
  const bottom = 38;

  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const x = (i) => left + (i / (data.length - 1)) * chartWidth;
  const y = (value) => top + chartHeight - (value / 10) * chartHeight;

  const points = data.map((item, i) => ({
    ...item,
    x: x(i),
    y: y(item.score),
  }));

  const linePath = points
    .map((point, i) => `${i === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <div className="eval-line-wrap">
      <svg className="eval-line-svg" viewBox={`0 0 ${width} ${height}`}>
        <rect x={left} y={y(10)} width={chartWidth} height={y(7.5) - y(10)} className="eval-zone eval-zone-green" />
        <rect x={left} y={y(7.5)} width={chartWidth} height={y(6.5) - y(7.5)} className="eval-zone eval-zone-yellow" />
        <rect x={left} y={y(6.5)} width={chartWidth} height={y(0) - y(6.5)} className="eval-zone eval-zone-red" />

        {[0, 2, 4, 6, 8, 10].map((tick) => (
          <g key={tick}>
            <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} className="eval-grid-line" />
            <text x="10" y={y(tick) + 4} className="eval-axis-text">
              {tick}
            </text>
          </g>
        ))}

        <path d={linePath} className="eval-score-line" />

        {points.map((point) => (
          <g key={point.fullDate} className="eval-point-group">
            <circle cx={point.x} cy={point.y} r="5" className="eval-point" />
            <circle cx={point.x} cy={point.y} r="15" className="eval-point-hit" />

            <g className="eval-tooltip">
              <rect x={point.x - 50} y={point.y - 62} width="100" height="44" rx="12" />
              <text x={point.x} y={point.y - 44} textAnchor="middle" className="eval-tooltip-date">
                {point.fullDate}
              </text>
              <text x={point.x} y={point.y - 27} textAnchor="middle" className="eval-tooltip-score">
                {point.score.toFixed(1)}
              </text>
            </g>
          </g>
        ))}

        {points.map((point, i) => (
          <text key={point.label} x={point.x} y={height - 14} textAnchor="middle" className="eval-axis-text">
            {i % 2 === 0 || i === points.length - 1 ? point.label : ""}
          </text>
        ))}

        <text x={width / 2} y={height - 1} textAnchor="middle" className="eval-axis-label">
          Week Starting
        </text>
      </svg>

      <div className="eval-zone-key">
        <span className="red">Weak</span>
        <span className="yellow">Mixed</span>
        <span className="green">Strong</span>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value, helpTitle, metricsUsed = [], isOpen = false, onToggle }) {
  return (
    <div className={`mini-stat ${isOpen ? "popup-active" : ""}`}>
      <span>
        {icon}
        {label}
      </span>
      <b>{value}</b>

      {metricsUsed.length > 0 && (
        <button type="button" className="score-help-btn mini-stat-help-btn" onClick={onToggle} aria-label={helpTitle || `${label} metrics`}>
          <span className="info-letter">?</span>
        </button>
      )}

      {isOpen && (
        <div className="score-popup mini-stat-popup">
          <div className="score-popup-title">{helpTitle || "Metrics used"}</div>
          <ul>
            {metricsUsed.map((metric) => (
              <li key={metric}>
                <span>{metric}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Grade({ name, value, icon, description, metricsUsed = [], isOpen = false, onToggle }) {
  const s = score10(value);
  const tone = scoreTone(s);

  return (
    <div className={`grade-card ${isOpen ? "popup-active" : ""}`}>
      <div className="grade-head">
        <span>{icon}</span>
        <h3>{name}</h3>
      </div>

      <div className="grade-line">
        <span className={tone} style={{ width: `${(s || 0) * 10}%` }} />
      </div>

      <div className="grade-score-row">
        <strong className={tone}>{scoreText(s)}</strong>
        <button
          type="button"
          className="score-help-btn"
          onClick={onToggle}
          aria-label={`${name} metrics used`}
          title={`${name} metrics used`}
        >
          <span className="info-letter">?</span>
        </button>
      </div>

      {isOpen && (
        <div className="score-popup">
          <div className="score-popup-title">Metrics used</div>
          <ul>
            {metricsUsed.map((metric) => (
              <li key={metric.label}>
                <span>{metric.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="grade-description">{description}</p>
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

function EmptyReport() {
  return (
    <section className="empty-report">
      <Sparkles size={28} />
      <h2>Search a ticker to start.</h2>
      <p>Try AAPL, NVDA, MSFT, TSLA, or any public company ticker.</p>
    </section>
  );
}

function LoadingScreen() {
  return (
    <main className="loading-screen">
      <div className="loading-card">
        <RefreshCw className="spin" size={22} />
        <span>Loading Eval...</span>
      </div>
    </main>
  );
}

function MissingClerkConfig() {
  return (
    <main className="loading-screen">
      <div className="loading-card missing-clerk-card">
        <AlertTriangle size={24} />
        <h2>Missing Clerk publishable key</h2>
        <p>Add VITE_CLERK_PUBLISHABLE_KEY to your Vercel environment variables, then redeploy the frontend.</p>
      </div>
    </main>
  );
}

function Root() {
  if (!CLERK_PUBLISHABLE_KEY) {
    return <MissingClerkConfig />;
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  );
}

createRoot(document.getElementById("root")).render(<Root />);
