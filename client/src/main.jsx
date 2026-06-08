// Eval update: FMP 6000 stock ticker search page.
// Eval update: static Top 1000 ticker search page.
// Eval update: native-style dropdown menu.
// Eval update: mobile dropdown always front with reliable click-away.
// Eval update: expanded FAQ library with at least 20 per category.
// Eval update: FAQs dropdown tab with live search.
// Eval update: compare 2-5 stocks and clickable radar legends.
// Eval update: AI assistant expanded as support agent.
// Eval update: AI assistant gradient response and limited prompt text.
// Eval update: metric bars pure green and white score numbers.
// Eval update: industry radar real category scores and matching bars.
// Eval update: SVG score rings replace CSS pie charts.
// Eval update: industry radar uses category data and sits below Top 5.
// Eval update: final clean universal score rings.
// Eval update: industry top 5 radar and rank numbers.
// Eval update: desktop dropdown removes watchlist via separate menus.
// Eval update: mobile dropdown contact visible, terms full label, desktop watchlist hidden.
// Eval update: dropdown forced front and Terms & Conditions label.
// Eval update: clean global rings and dropdown front fix.
// Eval update: bigger compare radar chart.
// Eval update: compare selection page with 2-3 watchlist stocks.
// Eval update: Clerk profile popup front layer.
// Eval update: mobile dropdown replaces old AI button position.
// Eval update: support email corrected.
// Eval update: dropdown click-away, mobile homepage, mobile searchbar, footer icon cleanup.
// Eval update: clean text dropdown with click-away close.
// Eval update: dropdown menu front layer and button rows fixed.
// Eval update: compact searchbar dropdown menu.
// Eval update: compare page bottom industry note.
// Eval update: mobile homepage scroll fixed and desktop layout preserved.
// Eval update: homepage flow bubbles and orbit removed.
// Eval update: insane animated homepage visual revamp.
// Eval update: logo home link, remove top add, animated homepage revamp.
// Eval update: radar labels in front, tighter chart space, mobile same layout.
// Eval update: radar labels clear, remove breakdown rows, match score rings.
// Eval update: clearer compare radar legend and outside metric labels.
// Eval update: compare score rings and radar chart.
// Eval update: clean compare page rebuild.
// Eval update: reverted homepage/profile, kept mobile-tablet watchlist fixes.
// Eval update: popup spacing, shorter AI copy, tablet mobile layout, portrait lock overlay.
// Eval update: deep AI assistant rules page and iPad mobile-matching layout.
// Eval update: all metric popups have top-right close buttons.
// Eval update: force Clerk resend countdown to 60 seconds.
// Eval update: AI explanation moved to assistant page and tablet uses mobile layout.
// Eval update: AI page rules, popup close buttons, mobile watchlist/metrics polish.
// Eval update: mobile score ring actually enlarged with clean spacing.
// Eval update: mobile score ring bigger and price/risk backgrounds identical.
// Eval update: mobile report bubble taller with more vertical spacing.
// Eval update: mobile price/risk bubbles match desktop exactly.
// Eval update: transparent price risk bubbles and desktop AI left search layout.
// Eval update: global copyright footer.
// Eval update: remove SoFi everywhere and move AI button to former desktop SoFi position.
// Eval update: remove SoFi button from mobile and desktop.
// Eval update: stack score buttons and match mobile searchbar layout.
// Eval update: desktop report uses mobile-style stack with Metrics scroll button.
// Eval safe fix: search bubble fit-content without forced grid.
// Eval rebuild: clean dashboard layout, compact search bar, stable hero report.
// Eval update: ticker symbol is now a company website link.
// Eval update: restored original rings/bars, safer taller report layout.
// Eval update: removed earnings quality/efficiency, ticker links to site, add button moved.
// Eval update: Earnings Quality popup includes Cash Ratio and Accrual Ratio.
// Eval exact calc fix: risk help removed and ticker input empty.
// Eval sleep fix: no AAPL input preload; risk help centered.
// Eval main.jsx update: add Efficiency score card and metrics.
// Eval main.jsx update: ticker bar starts empty, no default AAPL prefill.
// Eval fix: earningsQualityScore defined and ticker input starts empty.
// Eval update: earnings quality category + risk UI cleanup.
// Eval mobile actual classes fix: company-panel, score-panel, snapshot-grid mobile order.
// Eval mobile report layout: centered company, centered score, bottom price/risk.
// Eval UI update: company icon removed, mobile score layout adjusted, price/risk theme synced.
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
  Newspaper,
  HelpCircle,
  Menu,
} from "lucide-react";
import "./styles.css";

/* Force Clerk resend verification cooldown to 60 seconds.
   Clerk's built-in widget displays a 60s resend timer by default; this DOM guard
   keeps the UI locked and visibly counting down from 60 without rebuilding auth. */
function installClerkResend60Guard() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__evalClerkResend60GuardInstalled) return;
  window.__evalClerkResend60GuardInstalled = true;

  const COOLDOWN_SECONDS = 60;
  let cooldownStartedAt = Date.now();
  let lastFactorTwoPath = "";

  const isAuthVerificationPage = () => {
    const text = document.body?.innerText || "";
    const url = window.location.href || "";
    return (
      url.includes("factor-two") ||
      text.includes("Check your phone") ||
      text.includes("Check your email") ||
      text.includes("verification code") ||
      text.includes("Didn't receive a code")
    );
  };

  const findResendNodes = () => {
    const nodes = Array.from(document.querySelectorAll("button, a, span, p, div"));
    return nodes.filter((node) => {
      const text = (node.textContent || "").trim();
      return /didn.?t receive a code\??\s*resend/i.test(text) || /^resend(?:\s*\(\d+\))?$/i.test(text);
    });
  };

  const lockNode = (node, secondsLeft) => {
    const text = (node.textContent || "").trim();

    if (/didn.?t receive a code/i.test(text)) {
      node.textContent = `Didn't receive a code? Resend (${secondsLeft})`;
    } else if (/^resend/i.test(text)) {
      node.textContent = `Resend (${secondsLeft})`;
    }

    node.setAttribute("aria-disabled", "true");
    node.setAttribute("data-eval-resend-locked", "true");
    node.style.pointerEvents = "none";
    node.style.opacity = "0.72";
    node.style.cursor = "not-allowed";
  };

  const unlockNode = (node) => {
    const text = (node.textContent || "").trim();

    if (/didn.?t receive a code/i.test(text)) {
      node.textContent = "Didn't receive a code? Resend";
    } else if (/^resend/i.test(text)) {
      node.textContent = "Resend";
    }

    node.removeAttribute("aria-disabled");
    node.removeAttribute("data-eval-resend-locked");
    node.style.pointerEvents = "";
    node.style.opacity = "";
    node.style.cursor = "";
  };

  const update = () => {
    if (!isAuthVerificationPage()) {
      cooldownStartedAt = Date.now();
      lastFactorTwoPath = window.location.href;
      return;
    }

    if (lastFactorTwoPath !== window.location.href) {
      lastFactorTwoPath = window.location.href;
      cooldownStartedAt = Date.now();
    }

    const elapsed = Math.floor((Date.now() - cooldownStartedAt) / 1000);
    const secondsLeft = Math.max(0, COOLDOWN_SECONDS - elapsed);
    const nodes = findResendNodes();

    nodes.forEach((node) => {
      if (secondsLeft > 0) lockNode(node, secondsLeft);
      else unlockNode(node);
    });
  };

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target?.closest?.("button, a, span, p, div");
      if (!target) return;
      const text = (target.textContent || "").trim();
      if (!/resend/i.test(text)) return;

      const elapsed = Math.floor((Date.now() - cooldownStartedAt) / 1000);
      if (isAuthVerificationPage() && elapsed < COOLDOWN_SECONDS) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        update();
      }
    },
    true
  );

  const observer = new MutationObserver(update);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  window.addEventListener("hashchange", () => {
    cooldownStartedAt = Date.now();
    setTimeout(update, 50);
  });

  window.addEventListener("popstate", () => {
    cooldownStartedAt = Date.now();
    setTimeout(update, 50);
  });

  setInterval(update, 250);
  setTimeout(update, 50);
  setTimeout(update, 500);
  setTimeout(update, 1200);
}

installClerkResend60Guard();

/*
  HARD-CODED RENDER BACKEND URL
  This avoids Vercel environment variable problems.
*/
const API = "https://edge-1-6dtw.onrender.com";
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const STORAGE_KEY = "edge-watchlist-v8";
const TERMS_VERSION = "2026-05-30";
const MAX_WATCHLIST_ITEMS = 15;

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

function scoreDegrees(v) {
  const n = score10(v);
  if (n === null) return 0;
  return Math.max(0, Math.min(360, n * 36));
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

function dailyChangeClass(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "neutral";
  if (num > 0) return "up";
  if (num < 0) return "down";
  return "neutral";
}

function signedPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "N/A";
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toFixed(2)}%`;
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

const DEFAULT_WATCHLIST = ["NVDA", "GOOGL", "AAPL", "MSFT", "AMZN"];

function readWatchlist() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return DEFAULT_WATCHLIST.map((symbol) => ({ symbol, score: null }));
  } catch {
    return DEFAULT_WATCHLIST.map((symbol) => ({ symbol, score: null }));
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
      newsSentiment: "News Sentiment",
    }[key] || key
  );
}

function getScoreInsight(score) {
  const n = score10(score);

  if (n === null) {
    return {
      label: "Unavailable Evaluation",
      text: "There is not enough reliable company data available to explain this score yet.",
    };
  }

  if (n <= 5) {
    return {
      label: "Red Evaluation",
      text: "Red means the company currently shows a weaker overall business profile. This can point to a business that is struggling to prove durable growth, protect margins, maintain balance-sheet strength, or justify its market value compared with stronger companies. It does not mean the company cannot improve, but it means the available data is not showing a high-quality company profile right now.",
    };
  }

  if (n <= 7) {
    return {
      label: "Yellow Evaluation",
      text: "Yellow means the company has a mixed overall business profile. There may be real strengths in the business, but the full picture is not consistently strong yet. The company may be performing well in some areas while still showing questions around durability, efficiency, stability, valuation, or execution quality.",
    };
  }

  return {
    label: "Green Evaluation",
    text: "Green means the company currently shows a strong overall business profile. The available data points to a higher-quality company with stronger execution, healthier financial performance, better consistency, and a more durable business position compared with weaker-scoring companies. This is a company-quality evaluation, not a buy or sell signal.",
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

  const firstName =
    user?.firstName ||
    user?.fullName?.split(" ")?.[0] ||
    user?.primaryEmailAddress?.emailAddress?.split("@")?.[0] ||
    "there";

  return (
    <div className="profile-welcome-wrap">
      <div className="profile-welcome-text">
        <span>Welcome,</span>
        <strong>{firstName}</strong>
      </div>

      <div
        className="topbar-user"
        style={{ "--profile-accent": accent }}
        title="Account settings"
      >
        <UserButton />
      </div>
    </div>
  );
}

function App() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [symbol, setSymbol] = useState("");
  const [data, setData] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("landing");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [industryPage, setIndustryPage] = useState(null);
  const [industryLoading, setIndustryLoading] = useState(false);
  const [industryError, setIndustryError] = useState("");
  const [compareLeft, setCompareLeft] = useState("");
  const [compareRight, setCompareRight] = useState("");
  const [compareData, setCompareData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState("");
  const [compareSelected, setCompareSelected] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  function goMenu(nextView) {
    setMenuOpen(false);
    setView(nextView);
  }

  async function analyze(e, overrideSymbol, options = {}) {
    e?.preventDefault();

    const clean = (overrideSymbol || symbol).trim().toUpperCase();
    if (!clean) return null;

    const silent = Boolean(options?.silent);
    const skipState = Boolean(options?.skipState);

    if (!skipState) {
      setSymbol(clean);
    }

    if (!silent) {
      setLoading(true);
      setError("");
    }

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

      if (!skipState) {
        setData(json);
      }
      return json;
    } catch (err) {
      if (!silent) {
        setError(
          err.message ||
            "Failed to fetch from Render. Check Render logs and browser console."
        );
      }
      return null;
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  function buildStockListItem(analyzed, fallbackSymbol) {
    const clean = String(analyzed?.symbol || fallbackSymbol || "").trim().toUpperCase();
    const cats = analyzed?.grades?.categories || {};
    const orderedCats = Object.entries(cats)
      .filter(([, value]) => value !== null && value !== undefined && Number.isFinite(Number(score10(value))))
      .sort((a, b) => Number(score10(b[1])) - Number(score10(a[1])));

    const strongest = orderedCats[0];
    const weakest = orderedCats[orderedCats.length - 1];

    return {
      symbol: clean,
      name: analyzed?.profile?.name || clean,
      score: score10(analyzed?.grades?.edgeScore),
      rawScore: analyzed?.grades?.edgeScore ?? null,
      grade: gradeFrom10(analyzed?.grades?.edgeScore),
      risk: analyzed?.grades?.riskLabel || "N/A",
      price: analyzed?.quote?.c ?? null,
      strongest: strongest ? `${categoryLabel(strongest[0])} ${scoreText(strongest[1])}` : "N/A",
      weakest: weakest ? `${categoryLabel(weakest[0])} ${scoreText(weakest[1])}` : "N/A",
      updatedAt: new Date().toISOString(),
    };
  }

  async function addTicker(ticker = symbol) {
    const clean = ticker.trim().toUpperCase();
    if (!clean) return;

    const alreadySaved = watchlist.some((item) => item.symbol === clean);
    if (!alreadySaved && watchlist.length >= MAX_WATCHLIST_ITEMS) {
      setError(`Watchlist limit reached. Remove a stock before adding another. Max ${MAX_WATCHLIST_ITEMS} stocks.`);
      return;
    }

    const analyzed = data?.symbol === clean ? data : await analyze(null, clean);
    if (!analyzed) return;

    const item = buildStockListItem(analyzed, clean);

    const next = [item, ...watchlist.filter((x) => x.symbol !== clean)].sort(
      (a, b) => (b.score || 0) - (a.score || 0)
    );

    setWatchlist(next);
    saveWatchlist(next);
  }

  function openComparePage() {
    setCompareError("");
    setCompareData(null);
    setCompareSelected((prev) => {
      const saved = watchlist.map((item) => item.symbol);
      const valid = prev.filter((ticker) => saved.includes(ticker));
      return valid.length ? valid.slice(0, 3) : saved.slice(0, Math.min(2, saved.length));
    });
    setView("compareSelect");
  }

  function toggleCompareSelection(ticker) {
    setCompareError("");
    setCompareSelected((prev) => {
      if (prev.includes(ticker)) {
        return prev.filter((item) => item !== ticker);
      }

      if (prev.length >= 5) {
        setCompareError("You can compare up to 5 stocks at once.");
        return prev;
      }

      return [...prev, ticker];
    });
  }

  async function loadSelectedComparison(selected = compareSelected) {
    const tickers = selected.map((ticker) => String(ticker || "").trim().toUpperCase()).filter(Boolean);

    if (tickers.length < 2) {
      setCompareError("Select at least 2 stocks to compare.");
      return;
    }

    if (tickers.length > 5) {
      setCompareError("You can compare up to 5 stocks at once.");
      return;
    }

    const savedSymbols = watchlist.map((item) => item.symbol);
    const missing = tickers.filter((ticker) => !savedSymbols.includes(ticker));

    if (missing.length) {
      setCompareError(`${missing.join(" and ")} must be saved in your watchlist before comparing.`);
      return;
    }

    setCompareLoading(true);
    setCompareError("");

    try {
      const reports = await Promise.all(
        tickers.map((ticker) => (data?.symbol === ticker ? Promise.resolve(data) : analyze(null, ticker)))
      );

      if (reports.some((report) => !report)) {
        throw new Error("Could not load every selected stock report.");
      }

      setCompareData({ reports });
      setCompareLeft(tickers[0] || "");
      setCompareRight(tickers[1] || "");
      setView("compare");
    } catch (err) {
      setCompareError(err?.message || "Comparison failed. Try again.");
    } finally {
      setCompareLoading(false);
    }
  }

  async function openIndustryPage(industry, sourceSymbol = data?.symbol || symbol) {
    const cleanIndustry = String(industry || "").trim();
    if (!cleanIndustry || cleanIndustry === "Public company") return;

    setIndustryPage({ industry: cleanIndustry, leaders: [], sourceSymbol });
    setIndustryLoading(true);
    setIndustryError("");
    setView("industry");

    try {
      const res = await fetch(
        `${API}/api/industry-top/${encodeURIComponent(cleanIndustry)}?symbol=${encodeURIComponent(sourceSymbol || "")}`,
        {
          method: "GET",
          mode: "cors",
          headers: { Accept: "application/json" },
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Could not load industry leaders.");
      }

      const rawLeaders = Array.isArray(json?.leaders) ? json.leaders.slice(0, 5) : [];

      const enrichedLeaders = await Promise.all(
        rawLeaders.map(async (leader) => {
          try {
            const report = await analyze(null, leader.symbol, { silent: true, skipState: true });
            return {
              ...leader,
              score: Number(report?.grades?.edgeScore ?? leader.score),
              categories: report?.grades?.categories || leader.categories || {},
              riskLabel: report?.grades?.riskLabel || leader.riskLabel || "",
              name: report?.profile?.name || leader.name || leader.symbol,
              industry: report?.profile?.finnhubIndustry || leader.industry || cleanIndustry,
            };
          } catch {
            return leader;
          }
        })
      );

      setIndustryPage({
        industry: json?.industry || cleanIndustry,
        leaders: enrichedLeaders,
        sourceSymbol,
        cachedForHours: json?.cachedForHours || 24,
      });
    } catch (err) {
      setIndustryError(err?.message || "Could not load industry leaders.");
      setIndustryPage({ industry: cleanIndustry, leaders: [], sourceSymbol });
    } finally {
      setIndustryLoading(false);
    }
  }

  async function analyzeFromIndustry(ticker) {
    await analyze(null, ticker);
    setView("dashboard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function removeTicker(ticker) {
    const next = watchlist.filter((x) => x.symbol !== ticker);
    setWatchlist(next);
    saveWatchlist(next);
  }

  async function refreshWatchlistItems(items) {
    if (!items.length) return;

    setWatchLoading(true);

    const refreshed = [];

    for (const item of items) {
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
          refreshed.push({ ...item, ...buildStockListItem(json, item.symbol) });
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

  async function refreshWatchlist() {
    return refreshWatchlistItems(watchlist);
  }

  useEffect(() => {
    const saved = readWatchlist().sort(
      (a, b) => (b.score || 0) - (a.score || 0)
    );

    setWatchlist(saved);
    // Default stock preload removed; ticker input starts empty.
    refreshWatchlistItems(saved);
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) {
      setTermsAccepted(false);
      return;
    }

    const key = `eval-terms-accepted-${TERMS_VERSION}-${user.id}`;
    setTermsAccepted(localStorage.getItem(key) === "true");
  }, [isLoaded, isSignedIn, user?.id]);

  useEffect(() => {
    if (!isLoaded) return;

    const publicViews = ["landing", "account"];
    if (!isSignedIn && !publicViews.includes(view)) {
      setView("account");
      return;
    }

    if (isSignedIn && !termsAccepted && ![...publicViews, "terms"].includes(view)) {
      setView("terms");
    }
  }, [isLoaded, isSignedIn, termsAccepted, view]);

  function acceptTerms() {
    if (user?.id) {
      const key = `eval-terms-accepted-${TERMS_VERSION}-${user.id}`;
      localStorage.setItem(key, "true");
    }

    setTermsAccepted(true);
    setView("dashboard");
  }

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  if (view === "landing") {
    return <LandingPage onContinue={() => setView(isSignedIn ? "dashboard" : "account")} />;
  }

  if (view === "account") {
    return (
      <ClerkAccessPage
        onBack={() => setView("landing")}
        onSuccess={() => setView(termsAccepted ? "dashboard" : "terms")}
      />
    );
  }

  if (view === "terms") {
    return (
      <TermsPage
        onAgree={acceptTerms}
        onBack={() => setView("dashboard")}
        requireAgreement={!termsAccepted}
      />
    );
  }

  if (view === "support") {
    return (
      <SupportContactPage
        onBack={() => setView("dashboard")}
        onHome={() => setView("landing")}
        onTerms={() => setView("terms")}
      />
    );
  }

  if (view === "faqs") {
    return (
      <FaqPage
        onBack={() => setView("dashboard")}
        onHome={() => setView("landing")}
        onTerms={() => setView("terms")}
        onSupport={() => setView("support")}
      />
    );
  }

  return (
    <main className="app-shell">

      <div className="portrait-lock-overlay" aria-hidden="true">
        <div className="portrait-lock-card">
          <div className="portrait-lock-icon">↻</div>
          <h2>Rotate your device</h2>
          <p>Eval is designed for portrait mode on mobile and tablet.</p>
        </div>
      </div>

      <header className="topbar">
        <button
          type="button"
          className="brand brand-home-btn"
          onClick={() => setView("landing")}
          aria-label="Go to homepage"
          title="Go to homepage"
        >
          <img src="/stock-edge-ai-logo.png" alt="Eval AI logo" />
          <div>
            <h1>Eval</h1>
          </div>
        </button>

        <div className="topbar-actions-stack">
          <SignedIn>
            <div className="profile-bubble" aria-label="Profile">
              <ProfileButton />
            </div>
          </SignedIn>
        </div>
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
      ) : view === "plans" ? (
        <PlansPage onBack={() => setView("dashboard")} />
      ) : view === "industry" ? (
        <IndustryPage
          industryPage={industryPage}
          loading={industryLoading}
          error={industryError}
          onBack={() => setView("dashboard")}
          onAnalyze={analyzeFromIndustry}
        />
      ) : view === "compareSelect" ? (
        <CompareSelectPage
          watchlist={watchlist}
          selected={compareSelected}
          error={compareError}
          loading={compareLoading}
          onToggle={toggleCompareSelection}
          onSave={() => loadSelectedComparison(compareSelected)}
          onBack={() => setView("dashboard")}
        />
      ) : view === "compare" ? (
        <ComparePage
          data={compareData}
          error={compareError}
          onBack={() => setView("compareSelect")}
        />
      ) : view === "watchlist" ? (
        <main className="watchlist-page mobile-watchlist-clean">
          <button type="button" className="back-btn watchlist-page-back" onClick={() => setView("dashboard")}>
            <ArrowLeft size={18} /> Back to dashboard
          </button>

          <Watchlist
            items={watchlist}
            symbol={symbol}
            onAdd={addTicker}
            onRemove={removeTicker}
            onAnalyze={(ticker) => {
              analyze(null, ticker);
              setView("dashboard");
            }}
            onRefresh={refreshWatchlist}
            loading={watchLoading}
            pageMode
          />
        </main>
      ) : (
        <section className="layout">
          <div className="content">
            <form onSubmit={analyze} className="searchbar compact-searchbar score-searchbar eval-responsive-searchbar eval-menu-searchbar">
              <div className="menu-wrap" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className={`menu-trigger ${menuOpen ? "open" : ""}`}
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Open navigation menu"
                  title="Menu"
                >
                  <Menu size={22} />
                </button>

                {menuOpen && (
                  <>
                    <button
                      type="button"
                      className="dropdown-click-away"
                      onPointerDown={() => setMenuOpen(false)}
                      onMouseDown={() => setMenuOpen(false)}
                      onTouchStart={() => setMenuOpen(false)}
                      onClick={() => setMenuOpen(false)}
                      aria-label="Close menu"
                    />

                    <div className="dashboard-dropdown-menu dashboard-dropdown-desktop eval-select-menu" role="menu">
                      <button type="button" role="menuitem" onClick={() => goMenu("assistant")}>
                        AI Assistant
                      </button>
                      <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); openComparePage(); }}>
                        Compare
                      </button>

                      <div className="dropdown-divider" />

                      <button type="button" role="menuitem" onClick={() => goMenu("landing")}>
                        Homepage
                      </button>
                      <button type="button" role="menuitem" onClick={() => goMenu("terms")}>
                        Terms & Conditions
                      </button>
                      <button type="button" role="menuitem" onClick={() => goMenu("faqs")}>
                        FAQs
                      </button>
                      <button type="button" role="menuitem" onClick={() => goMenu("support")}>
                        Contact
                      </button>
                    </div>

                    <div className="dashboard-dropdown-menu dashboard-dropdown-mobile eval-select-menu" role="menu">
                      <button type="button" role="menuitem" onClick={() => goMenu("assistant")}>
                        AI Assistant
                      </button>
                      <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); openComparePage(); }}>
                        Compare
                      </button>
                      <button type="button" role="menuitem" onClick={() => goMenu("watchlist")}>
                        Watchlist
                      </button>

                      <div className="dropdown-divider" />

                      <button type="button" role="menuitem" onClick={() => goMenu("landing")}>
                        Homepage
                      </button>
                      <button type="button" role="menuitem" onClick={() => goMenu("terms")}>
                        Terms & Conditions
                      </button>
                      <button type="button" role="menuitem" onClick={() => goMenu("faqs")}>
                        FAQs
                      </button>
                      <button type="button" role="menuitem" onClick={() => goMenu("support")}>
                        Contact
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="ticker-field eval-safe-ticker-field">
                <input
                  className="eval-clean-ticker-input"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="Add ticker"
                  maxLength={8}
                />
              </div>

              <button disabled={loading} aria-label="Search stock" title="Search stock">
                {loading ? <RefreshCw className="spin" size={18} /> : <Search size={18} />}
              </button>
            </form>

            {data ? (
              <>
                <Report data={data} onAdd={() => addTicker(data.symbol)} onOpenIndustry={openIndustryPage} />
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
  );
}

function ScoreRingSvg({ value, className = "", label = null }) {
  const score = Math.max(0, Math.min(10, Number(score10(value)) || 0));
  const tone = scoreTone(score);
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 10) * circumference;

  return (
    <div className={`svg-score-ring ${tone} ${className}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
        <defs>
          <filter id="svgRingGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle className="svg-ring-track" cx="60" cy="60" r={radius} />
        <circle
          className="svg-ring-progress"
          cx="60"
          cy="60"
          r={radius}
          pathLength={circumference}
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
        <circle className="svg-ring-inner" cx="60" cy="60" r="35" />
      </svg>

      <strong>{label || scoreText(score)}</strong>
    </div>
  );
}

function CompareRadar({ categories, stocks }) {
  const [hiddenSymbols, setHiddenSymbols] = useState([]);

  const center = 180;
  const maxRadius = 125;
  const levels = [0.25, 0.5, 0.75, 1];
  const toneClasses = ["radar-left", "radar-right", "radar-third", "radar-fourth", "radar-fifth"];
  const dotClasses = ["radar-left-dot", "radar-right-dot", "radar-third-dot", "radar-fourth-dot", "radar-fifth-dot"];

  const visibleStocks = stocks.filter((stock) => !hiddenSymbols.includes(stock.symbol));

  function toggleSymbol(symbol) {
    setHiddenSymbols((prev) => {
      if (prev.includes(symbol)) return prev.filter((item) => item !== symbol);
      if (stocks.length - prev.length <= 1) return prev;
      return [...prev, symbol];
    });
  }

  const pointFor = (index, value = 10) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / categories.length;
    const radius = (Math.max(0, Math.min(10, Number(value) || 0)) / 10) * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  const polygonPoints = (source) =>
    categories
      .map((key, index) => {
        const score = score10(source?.[key]) || 0;
        const point = pointFor(index, score);
        return `${point.x},${point.y}`;
      })
      .join(" ");

  const gridPoints = (level) =>
    categories
      .map((_, index) => {
        const point = pointFor(index, level * 10);
        return `${point.x},${point.y}`;
      })
      .join(" ");

  return (
    <div className="compare-radar-card">
      <div className="compare-radar-legend clickable-radar-legend">
        {stocks.map((stock, index) => {
          const hidden = hiddenSymbols.includes(stock.symbol);
          return (
            <button
              type="button"
              className={`legend-${index + 1} ${hidden ? "radar-hidden" : ""}`}
              key={stock.symbol}
              onClick={() => toggleSymbol(stock.symbol)}
              title={hidden ? `Show ${stock.symbol}` : `Hide ${stock.symbol}`}
            >
              <i aria-hidden="true" /> {stock.symbol}
            </button>
          );
        })}
      </div>

      <svg className="compare-radar-svg" viewBox="0 0 360 360" role="img" aria-label="Radar chart comparing stock category scores">
        {levels.map((level) => (
          <polygon key={level} points={gridPoints(level)} className="radar-grid" />
        ))}

        {categories.map((key, index) => {
          const edge = pointFor(index, 10);
          return (
            <line
              key={`${key}-axis`}
              x1={center}
              y1={center}
              x2={edge.x}
              y2={edge.y}
              className="radar-axis"
            />
          );
        })}

        {visibleStocks.map((stock) => {
          const originalIndex = stocks.findIndex((item) => item.symbol === stock.symbol);
          return (
            <polygon
              key={`${stock.symbol}-poly`}
              points={polygonPoints(stock.categories)}
              className={`radar-poly ${toneClasses[originalIndex] || "radar-fifth"}`}
            />
          );
        })}

        {categories.map((key, index) => (
          <g key={`${key}-dots`}>
            {visibleStocks.map((stock) => {
              const originalIndex = stocks.findIndex((item) => item.symbol === stock.symbol);
              const point = pointFor(index, score10(stock.categories?.[key]) || 0);
              return (
                <circle
                  key={`${stock.symbol}-${key}-dot`}
                  cx={point.x}
                  cy={point.y}
                  r="4.2"
                  className={`radar-dot ${dotClasses[originalIndex] || "radar-fifth-dot"}`}
                />
              );
            })}
          </g>
        ))}

        {categories.map((key, index) => {
          const label = pointFor(index, 12.85);
          return (
            <text
              key={`${key}-label`}
              x={label.x}
              y={label.y}
              textAnchor={label.x < center - 10 ? "end" : label.x > center + 10 ? "start" : "middle"}
              dominantBaseline="middle"
              className="radar-label radar-label-front"
            >
              {categoryLabel(key)}
            </text>
          );
        })}
      </svg>

      <p className="radar-toggle-note">Click a ticker label to hide or show it on the radar.</p>
    </div>
  );
}

function CompareSelectPage({
  watchlist,
  selected,
  error,
  loading,
  onToggle,
  onSave,
  onBack,
}) {
  const activeStocks = [...watchlist].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <section className="compare-page compare-select-page">
      <div className="compare-page-shell">
        <button type="button" className="back-btn" onClick={onBack}>
          <ArrowLeft size={18} /> Back to dashboard
        </button>

        <div className="compare-page-head">
          <div className="section-title">
            <Scale size={17} /> Compare
          </div>
          <h2>Select stocks to compare</h2>
          <p>
            Choose 2–5 active watchlist stocks. After saving, Eval loads the comparison radar with your selected tickers preloaded.
          </p>
        </div>

        <div className="compare-select-count">
          <strong>{selected.length}/5 selected</strong>
          <span>Minimum 2 stocks, maximum 5 stocks.</span>
        </div>

        {error && <div className="compare-error">{error}</div>}

        {activeStocks.length ? (
          <div className="compare-select-grid">
            {activeStocks.map((item, index) => {
              const checked = selected.includes(item.symbol);
              return (
                <label className={`compare-select-card ${checked ? "selected" : ""}`} key={item.symbol}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(item.symbol)}
                  />
                  <span className="compare-select-rank">{index + 1}</span>
                  <div className="compare-select-copy">
                    <strong>{item.symbol}</strong>
                    <small>{item.name || item.symbol}</small>
                  </div>
                  <div className={`compare-select-score ${scoreTone(item.score)}`}>
                    {scoreText(item.score)}
                  </div>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="compare-empty">
            <Scale size={28} />
            <h3>No watchlist stocks yet</h3>
            <p>Add at least two stocks to your watchlist before comparing.</p>
          </div>
        )}

        <div className="compare-select-actions">
          <button
            type="button"
            className="compare-save-btn"
            onClick={onSave}
            disabled={loading || selected.length < 2 || selected.length > 5}
          >
            {loading ? <RefreshCw className="spin" size={17} /> : <CheckCircle2 size={17} />}
            Save selected
          </button>
          <span>Compare stocks within an industry or use industry rankings to find strong peers.</span>
        </div>
      </div>
    </section>
  );
}

function ComparePage({
  data,
  error,
  onBack,
}) {
  const categories = [
    "growth",
    "profitability",
    "financialHealth",
    "valuation",
    "momentum",
    "reversal",
    "newsSentiment",
  ];

  const reports = data?.reports || [];
  const stocks = reports.map((report) => ({
    symbol: report?.symbol || "Stock",
    score: score10(report?.grades?.edgeScore),
    categories: report?.grades?.categories || {},
  }));

  return (
    <section className="compare-page">
      <div className="compare-page-shell">
        <button type="button" className="back-btn" onClick={onBack}>
          <ArrowLeft size={18} /> Change selected stocks
        </button>

        <div className="compare-page-head">
          <div className="section-title">
            <Scale size={17} /> Compare
          </div>
          <h2>Compare watchlist stocks</h2>
          <p>
            Your selected watchlist stocks are preloaded below. Eval compares their Power Scores and all seven category ratings side by side.
          </p>
        </div>

        {error && <div className="compare-error">{error}</div>}

        {stocks.length >= 2 ? (
          <div className="compare-results">
            <div className={`compare-score-row compare-score-count-${stocks.length}`}>
              {stocks.map((stock, index) => (
                <div className={`compare-score-card ${scoreTone(stock.score)}`} key={stock.symbol}>
                  <span>{stock.symbol}</span>
                  <ScoreRingSvg
                    value={stock.score}
                    className="compare-score-ring"
                  />
                </div>
              ))}
            </div>

            <div className="compare-chart-intro">
              <strong>Seven-metric radar comparison</strong>
              <p>The radar chart shows each selected stock across the same seven Eval categories. A wider shape means stronger scores across more areas.</p>
            </div>

            <CompareRadar
              categories={categories}
              stocks={stocks}
            />

            <p className="compare-explain">
              This comparison is based on Eval's current scoring data. You can compare stocks within the same industry, compare up to 5 stocks at once, and use industry rankings to see which companies lead their category. This is educational and is not a buy or sell recommendation.
            </p>
          </div>
        ) : (
          <div className="compare-empty">
            <Scale size={28} />
            <h3>No comparison loaded yet</h3>
            <p>Go back and select 2–5 watchlist stocks to compare.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function industryDescription(industry = "") {
  const text = String(industry || "").toLowerCase();

  if (text.includes("technology") || text.includes("software") || text.includes("semiconductor")) {
    return "This industry is built around software, devices, chips, cloud platforms, and digital infrastructure. Strong companies here usually score well when they grow revenue, protect margins, and keep demand strong.";
  }

  if (text.includes("health") || text.includes("pharma") || text.includes("biotech") || text.includes("medical")) {
    return "This industry focuses on medicine, treatments, health services, and medical technology. Strong companies here usually have steady demand, strong profitability, and durable products or services.";
  }

  if (text.includes("financial") || text.includes("bank") || text.includes("insurance")) {
    return "This industry includes banks, payment networks, lenders, asset managers, and insurers. Strong companies usually score well when they have stable earnings, strong balance sheets, and controlled risk.";
  }

  if (text.includes("energy") || text.includes("oil") || text.includes("gas")) {
    return "This industry is tied to oil, natural gas, energy production, and energy services. Scores can move with commodity prices, cash flow strength, debt levels, and profitability.";
  }

  if (text.includes("consumer")) {
    return "This industry depends on consumer spending. Strong companies usually have recognizable brands, steady demand, pricing power, and healthy margins.";
  }

  if (text.includes("industrial")) {
    return "This industry includes machinery, transportation, aerospace, defense, and manufacturing. Strong companies usually benefit from stable demand, efficient operations, and solid balance sheets.";
  }

  return "This industry groups companies with similar business models. Comparing Eval Scores inside the same industry can make the ranking more useful because the stocks face similar risks and opportunities.";
}

function IndustryRadar({ leaders }) {
  const [hiddenSymbols, setHiddenSymbols] = useState([]);

  const categories = [
    "growth",
    "profitability",
    "financialHealth",
    "valuation",
    "momentum",
    "reversal",
    "newsSentiment",
  ];

  const categoryValues = (item) => {
    const raw = item.categories || item.grades?.categories || item.categoryScores || {};

    return categories.reduce((acc, key) => {
      const n = score10(raw?.[key]);
      acc[key] = Number.isFinite(n) ? n : null;
      return acc;
    }, {});
  };

  const stocks = leaders.slice(0, 5).map((item) => ({
    symbol: item.symbol,
    categories: categoryValues(item),
  }));

  const visibleStocks = stocks.filter((stock) => !hiddenSymbols.includes(stock.symbol));

  function toggleSymbol(symbol) {
    setHiddenSymbols((prev) => {
      if (prev.includes(symbol)) return prev.filter((item) => item !== symbol);
      if (stocks.length - prev.length <= 1) return prev;
      return [...prev, symbol];
    });
  }

  const hasRealCategoryData = stocks.some((stock) =>
    categories.some((key) => Number.isFinite(stock.categories?.[key]))
  );

  const center = 180;
  const maxRadius = 122;
  const levels = [0.25, 0.5, 0.75, 1];

  const pointFor = (index, value = 10) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / categories.length;
    const radius = (Math.max(0, Math.min(10, Number(value) || 0)) / 10) * maxRadius;

    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  const gridPoints = (level) =>
    categories
      .map((_, index) => {
        const point = pointFor(index, level * 10);
        return `${point.x},${point.y}`;
      })
      .join(" ");

  const polygonPoints = (source) =>
    categories
      .map((key, index) => {
        const score = Number.isFinite(source?.[key]) ? source[key] : 0;
        const point = pointFor(index, score);
        return `${point.x},${point.y}`;
      })
      .join(" ");

  return (
    <section className="industry-radar-card">
      <div className="industry-radar-head">
        <div>
          <strong>Top 5 radar comparison</strong>
          <p>Each point uses that stock's real score for the matching Eval category.</p>
        </div>

        <div className="industry-radar-legend clickable-radar-legend">
          {stocks.map((stock, index) => {
            const hidden = hiddenSymbols.includes(stock.symbol);
            return (
              <button
                type="button"
                className={`industry-radar-legend-${index + 1} ${hidden ? "radar-hidden" : ""}`}
                key={stock.symbol}
                onClick={() => toggleSymbol(stock.symbol)}
                title={hidden ? `Show ${stock.symbol}` : `Hide ${stock.symbol}`}
              >
                <i aria-hidden="true" /> {stock.symbol}
              </button>
            );
          })}
        </div>
      </div>

      {!hasRealCategoryData ? (
        <div className="industry-radar-empty">
          Category data is still loading. Refresh this industry page after the Top 5 reports finish caching.
        </div>
      ) : (
        <>
          <svg className="industry-radar-svg" viewBox="0 0 360 360" role="img" aria-label="Top five industry stock radar chart">
            {levels.map((level) => (
              <polygon key={level} points={gridPoints(level)} className="radar-grid" />
            ))}

            {categories.map((key, index) => {
              const edge = pointFor(index, 10);
              return (
                <line
                  key={`${key}-axis`}
                  x1={center}
                  y1={center}
                  x2={edge.x}
                  y2={edge.y}
                  className="radar-axis"
                />
              );
            })}

            {visibleStocks.map((stock) => {
              const originalIndex = stocks.findIndex((item) => item.symbol === stock.symbol);
              return (
                <polygon
                  key={`${stock.symbol}-poly`}
                  points={polygonPoints(stock.categories)}
                  className={`industry-radar-poly industry-radar-poly-${originalIndex + 1}`}
                />
              );
            })}

            {categories.map((key, index) => (
              <g key={`${key}-dots`}>
                {visibleStocks.map((stock) => {
                  const originalIndex = stocks.findIndex((item) => item.symbol === stock.symbol);
                  const score = stock.categories?.[key];
                  if (!Number.isFinite(score)) return null;
                  const point = pointFor(index, score);
                  return (
                    <circle
                      key={`${stock.symbol}-${key}-dot`}
                      cx={point.x}
                      cy={point.y}
                      r="4.2"
                      className={`industry-radar-dot industry-radar-dot-${originalIndex + 1}`}
                    />
                  );
                })}
              </g>
            ))}

            {categories.map((key, index) => {
              const label = pointFor(index, 12.75);
              return (
                <text
                  key={`${key}-label`}
                  x={label.x}
                  y={label.y}
                  textAnchor={label.x < center - 10 ? "end" : label.x > center + 10 ? "start" : "middle"}
                  dominantBaseline="middle"
                  className="radar-label radar-label-front"
                >
                  {categoryLabel(key)}
                </text>
              );
            })}
          </svg>

          <p className="radar-toggle-note">Click a ticker label to hide or show it on the radar.</p>
        </>
      )}
    </section>
  );
}

function IndustryPage({ industryPage, loading, error, onBack, onAnalyze }) {
  const industry = industryPage?.industry || "Industry";
  const leaders = Array.isArray(industryPage?.leaders) ? industryPage.leaders : [];

  return (
    <section className="industry-page">
      <div className="industry-page-shell">
        <div className="industry-page-head">
          <button type="button" className="back-btn" onClick={onBack}>
            <ArrowLeft size={17} /> Dashboard
          </button>

          <div>
            <div className="section-title">
              <BarChart3 size={17} /> Industry ranking
            </div>
            <h2>{industry}</h2>
            <p>{industryDescription(industry)}</p>
          </div>
        </div>

        <div className="industry-explain-card">
          <strong>How to use this page</strong>
          <p>
            Use this to compare stocks against similar companies. The top names have the highest Eval Scores in this industry group. A higher score means the company currently looks stronger across quality, valuation, risk, growth, and momentum.
          </p>
        </div>

        {loading ? (
          <div className="industry-loading-page">
            <RefreshCw className="spin" size={22} /> Ranking industry stocks from cached Eval data...
          </div>
        ) : error ? (
          <div className="industry-error-page">{error}</div>
        ) : leaders.length ? (
          <>
            <div className="industry-leader-grid">
              {leaders.slice(0, 5).map((item, index) => {
              const score = score10(item.score);
              const tone = scoreTone(score);
              const rankClass = index === 0 ? "gold" : index === 1 ? "silver" : index === 2 ? "bronze" : "standard";

              return (
                <button
                  type="button"
                  className={`industry-leader-card ${rankClass}`}
                  key={item.symbol}
                  onClick={() => onAnalyze(item.symbol)}
                  title={`Open full Eval report for ${item.symbol}`}
                >
                  <div className="industry-medal">{index + 1}</div>
                  <ScoreRingSvg
                    value={score}
                    className="industry-score-pie"
                  />
                  <div className="industry-leader-copy">
                    <h3>{item.symbol}</h3>
                    <p>{item.name || item.symbol}</p>
                    <span>Tap to open full dashboard overview</span>
                  </div>
                </button>
              );
            })}
            </div>

            <IndustryRadar leaders={leaders} />
          </>
        ) : (
          <div className="industry-error-page">No same-industry rankings are available yet.</div>
        )}
      </div>
    </section>
  );
}

function LandingPage({ onContinue }) {
  const featureCards = [
    {
      icon: <Gauge size={22} />,
      title: "One clean Eval Score",
      text: "A 0.0–10.0 score blends growth, profitability, financial health, valuation, momentum, pullback, risk, and news sentiment.",
    },
    {
      icon: <BrainCircuit size={22} />,
      title: "Smarter Eval AI",
      text: "Ask about FAQs, navigation, metrics, watchlist stocks, company tickers, key products, and what companies actually do.",
    },
    {
      icon: <Search size={22} />,
      title: "5,200-company knowledge base",
      text: "Eval AI can answer company-to-ticker, ticker-to-company, company description, and product questions from the embedded CSV universe.",
    },
    {
      icon: <ShieldCheck size={22} />,
      title: "Provider fallback engine",
      text: "Finnhub, Massive, FMP, OpenAI, and cached last-valid reports work together so missing data is not treated like zero.",
    },
    {
      icon: <Star size={22} />,
      title: "Ranked watchlist",
      text: "Save up to 15 tickers and rank them by Eval Score with clean rings, refresh controls, and direct compare support.",
    },
    {
      icon: <Scale size={22} />,
      title: "2–5 stock radar compare",
      text: "Select watchlist stocks and compare all seven categories with clickable radar labels and side-by-side score rings.",
    },
    {
      icon: <Newspaper size={22} />,
      title: "AI news sentiment",
      text: "Recent articles are summarized, scored, and turned into a fast positive, neutral, or negative company read.",
    },
    {
      icon: <LineChart size={22} />,
      title: "Smarter caching",
      text: "Fundamentals can stay cached for months, valuation for one month, news/risk for seven days, and market data for one day.",
    },
  ];
return (
    <main className="landing-page-clean">

      <section className="landing-shell landing-shell-pro landing-shell-extreme">
        <header className="landing-brand-row landing-brand-row-pro">
          <button type="button" className="landing-brand-home" aria-label="Eval homepage">
            <img src="/stock-edge-ai-logo.png" alt="Eval logo" />
            <h1>Eval</h1>
          </button>

          <div className="landing-status-pill landing-status-live">
            <span /> AI stock evaluation + company intelligence engine
          </div>
        </header>

        <section className="landing-hero landing-hero-pro landing-hero-extreme">
          <div className="landing-copy landing-copy-pro">
            <div className="landing-kicker landing-kicker-glow">
              <Sparkles size={16} /> Eval Score, AI support, company intelligence, and clean stock comparisons
            </div>

            <h2>
              The fastest way to understand a stock before you waste time digging.
            </h2>

            <p>
              Eval turns stock data into a cinematic dashboard: Eval Score, seven category ratings,
              risk, AI news sentiment, watchlist rankings, 2–5 stock radar comparisons, and an
              assistant that now understands FAQs, company tickers, key products, and what companies do.
            </p>

            <div className="landing-actions landing-actions-pro">
              <button type="button" className="landing-continue-btn landing-continue-mega" onClick={onContinue}>
                Launch Dashboard <ArrowRight size={20} />
              </button>
              <span>Score. Rank. Compare. Ask AI. Understand the company.</span>
            </div>

          </div>

          <div className="landing-product-stage landing-product-stage-extreme" aria-label="Eval product preview">

            <div className="landing-product-card main landing-main-terminal">
              <div className="preview-topline">
                <span>Eval stock report</span>
                <b>NVDA</b>
              </div>

              <ScoreRingSvg
                value={8}
                label="8.0"
                className="preview-score-ring preview-score-ring-pro preview-score-ring-extreme"
              />

              <div className="preview-mini-grid">
                <div>
                  <span>Growth</span>
                  <strong>10.0</strong>
                </div>
                <div>
                  <span>Momentum</span>
                  <strong>8.1</strong>
                </div>
                <div>
                  <span>News</span>
                  <strong>7.2</strong>
                </div>
              </div>

              <div className="landing-terminal-lines">
                <span><i /> News sentiment: bullish</span>
                <span><i /> Company products: AI chips</span>
                <span><i /> Cache + fallback protected</span>
              </div>
            </div>

            <div className="landing-product-card floating watch landing-float-card-one">
              <span>Watchlist</span>
              <strong>#1 NVDA</strong>
              <p>Score-ranked instantly</p>
            </div>

            <div className="landing-product-card floating radar landing-float-card-two">
              <span>Compare</span>
              <strong>Radar chart</strong>
              <p>7-metric matchup</p>
            </div>

            <div className="landing-product-card floating ai landing-float-card-three">
              <span>Eval AI</span>
              <strong>FAQs + tickers</strong>
              <p>Products, scores, support</p>
            </div>
          </div>
        </section>

        <section className="landing-feature-strip landing-feature-strip-extreme">
          {featureCards.map((item) => (
            <article className="landing-feature-card landing-feature-card-extreme" key={item.title}>
              <div className="landing-feature-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </section>

        <section className="landing-scroll-story landing-scroll-story-extreme">
          <div className="landing-story-copy">
            <div className="landing-kicker">
              <LineChart size={16} /> What users get
            </div>
            <h2>Built to feel like a premium Bloomberg-style dashboard, with AI that explains the app, the company, and the report.</h2>
          </div>

          <div className="landing-story-grid landing-story-grid-extreme">
            <div><b>01</b><span>Eval Score</span><p>A clean 0.0–10.0 rating backed by seven major scoring categories.</p></div>
            <div><b>02</b><span>Company Intelligence</span><p>Ask Eval AI for tickers, products, descriptions, and what a company sells or does.</p></div>
            <div><b>03</b><span>Protected Data Engine</span><p>Provider fallbacks and component caching help avoid fake broken scores from missing data.</p></div>
            <div><b>04</b><span>Compare + Industry</span><p>Compare 2–5 watchlist stocks and review industry leaders with radar charts.</p></div>
          </div>
        </section>

        <div className="landing-bottom-strip landing-bottom-strip-pro">
          <span>Eval Score</span>
          <span>5,200 Companies</span>
          <span>AI FAQs</span>
          <span>Provider Fallbacks</span>
          <span>Watchlist</span>
          <span>Radar Compare</span>
          <span>Eval AI</span>
</div>

        <p className="landing-footnote">
          Eval is for educational stock evaluation only and is not financial advice.
        </p>
      </section>
    </main>
  );
}

function ClerkAccessPage({ onBack, onSuccess }) {
  const [mode, setMode] = useState("signIn");

  useEffect(() => {
    function syncModeFromHash() {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes("sign-up") || hash.includes("signup")) {
        setMode("signUp");
      } else if (hash.includes("sign-in") || hash.includes("signin")) {
        setMode("signIn");
      }
    }

    syncModeFromHash();
    window.addEventListener("hashchange", syncModeFromHash);
    return () => window.removeEventListener("hashchange", syncModeFromHash);
  }, []);

  function switchMode(nextMode) {
    setMode(nextMode);
    window.location.hash = nextMode === "signUp" ? "sign-up" : "sign-in";
  }

  const clerkAppearance = {
    variables: {
      fontFamily: "Oxanium, sans-serif",
      colorPrimary: "#85d713",
      colorText: "#f8fbff",
      colorTextSecondary: "rgba(248,251,255,.66)",
      colorBackground: "rgba(1,7,16,.88)",
      colorInputBackground: "rgba(0,0,0,.28)",
      colorInputText: "#f8fbff",
      borderRadius: "18px",
    },
    elements: {
      rootBox: "clerk-root-box",
      card: "clerk-card-shell",
      headerTitle: "clerk-title",
      headerSubtitle: "clerk-subtitle",
      socialButtonsBlock: "clerk-social-hidden",
      socialButtonsBlockButton: "clerk-social-btn",
      dividerRow: "clerk-auth-divider-hidden",
      formButtonPrimary: "clerk-primary-btn",
      footerActionLink: "clerk-link",
    },
  };

  return (
    <main className="clerk-access-page">
      <div className="clerk-access-orb clerk-access-orb-one" />
      <div className="clerk-access-orb clerk-access-orb-two" />
      <div className="clerk-access-grid-glow" />

      <section className="clerk-access-shell">
        <div className="clerk-access-head">
          <button type="button" className="back-btn clerk-access-back" onClick={onBack}>
            <ArrowLeft size={18} /> Cover page
          </button>

          <div className="clerk-access-brand">
            <img src="/stock-edge-ai-logo.png" alt="Eval logo" />
            <div>
              <h1>Eval</h1>
              <p>Secure account access</p>
            </div>
          </div>
        </div>

        <div className="clerk-access-layout">
          <aside className="clerk-access-copy">
            <div className="clerk-access-kicker">
              <ShieldCheck size={16} /> Protected by Clerk
            </div>
            <h2>Sign in before entering the dashboard.</h2>
            <p>
              Clerk handles email verification, secure passwords, forgot-password recovery,
              active sessions, and bot sign-up protection from your Clerk dashboard.
            </p>

            <div className="clerk-access-list">
              <span><CheckCircle2 size={16} /> Real sign-up and sign-in</span>
              <span><CheckCircle2 size={16} /> Email verification and password reset</span>
              <span><CheckCircle2 size={16} /> Bot protection enabled through Clerk</span>
            </div>
          </aside>

          <section className="clerk-access-card">
            <SignedOut>
              <div className="clerk-access-topline">
                <span>{mode === "signIn" ? "Welcome back" : "Create your Eval account"}</span>
                <h3>{mode === "signIn" ? "Sign in to continue." : "Sign up to get started."}</h3>
              </div>

              <div className="clerk-access-tabs">
                <button
                  type="button"
                  className={mode === "signIn" ? "active" : ""}
                  onClick={() => switchMode("signIn")}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={mode === "signUp" ? "active" : ""}
                  onClick={() => switchMode("signUp")}
                >
                  Sign up
                </button>
              </div>

              <div className="clerk-access-panel">
                {mode === "signIn" ? (
                  <SignIn
                    appearance={clerkAppearance}
                    routing="hash"
                    signUpUrl="#sign-up"
                  />
                ) : (
                  <SignUp
                    appearance={clerkAppearance}
                    routing="hash"
                    signInUrl="#sign-in"
                  />
                )}
              </div>
            </SignedOut>

            <SignedIn>
              <div className="clerk-access-ready">
                <div className="clerk-access-user">
                  <UserButton />
                </div>
                <span>Signed in</span>
                <h3>Your account is ready.</h3>
                <p>Continue to Eval and start analyzing stocks.</p>
                <button type="button" className="auth-submit-btn" onClick={onSuccess}>
                  Continue to dashboard <ArrowRight size={18} />
                </button>
              </div>
            </SignedIn>
          </section>
        </div>
      </section>
    </main>
  );
}

function DashboardLinkRow({ onHome, onTerms, onSupport }) {
  return (
    <nav className="dashboard-link-row" aria-label="Dashboard navigation">
      <button type="button" className="dashboard-link-btn" onClick={onHome}> Homepage
      </button>
      <button type="button" className="dashboard-link-btn" onClick={onTerms}>
        <Scale size={16} /> Terms & Conditions
      </button>
      <button type="button" className="dashboard-link-btn highlight" onClick={onSupport}> Support & Contact
      </button>
    </nav>
  );
}

const EVAL_FAQS = [
  {
    "category": "Getting started",
    "question": "What is Eval?",
    "answer": "Eval is a stock-evaluation dashboard that turns market data, fundamentals, news sentiment, and category scores into a simple company report."
  },
  {
    "category": "Getting started",
    "question": "How do I start using Eval?",
    "answer": "Search a ticker or open Ticker search, load a company, then read the Eval Score, price/risk cards, category bars, news sentiment, and watchlist options."
  },
  {
    "category": "Getting started",
    "question": "What should I look at first?",
    "answer": "Start with the Eval Score ring, then check the strongest and weakest categories, price/risk cards, and recent news sentiment."
  },
  {
    "category": "Getting started",
    "question": "How do I use Eval in Eval?",
    "answer": "In Eval, Eval is handled inside the Getting started area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Getting started",
    "question": "What does Eval mean in Eval?",
    "answer": "Eval is part of the Getting started experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Getting started",
    "question": "Why is Eval important?",
    "answer": "Eval helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Getting started",
    "question": "Can Eval AI explain Eval?",
    "answer": "Yes. Eval AI can explain Eval when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Getting started",
    "question": "What should I do if Eval looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Getting started",
    "question": "How do I use dashboard in Eval?",
    "answer": "In Eval, dashboard is handled inside the Getting started area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Getting started",
    "question": "What does dashboard mean in Eval?",
    "answer": "dashboard is part of the Getting started experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Getting started",
    "question": "Why is dashboard important?",
    "answer": "dashboard helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Getting started",
    "question": "Can Eval AI explain dashboard?",
    "answer": "Yes. Eval AI can explain dashboard when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Getting started",
    "question": "What should I do if dashboard looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Getting started",
    "question": "How do I use ticker search in Eval?",
    "answer": "In Eval, ticker search is handled inside the Getting started area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Getting started",
    "question": "What does ticker search mean in Eval?",
    "answer": "ticker search is part of the Getting started experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Getting started",
    "question": "Why is ticker search important?",
    "answer": "ticker search helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Getting started",
    "question": "Can Eval AI explain ticker search?",
    "answer": "Yes. Eval AI can explain ticker search when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Getting started",
    "question": "What should I do if ticker search looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Getting started",
    "question": "How do I use first report in Eval?",
    "answer": "In Eval, first report is handled inside the Getting started area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Getting started",
    "question": "What does first report mean in Eval?",
    "answer": "first report is part of the Getting started experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Getting started",
    "question": "Why is first report important?",
    "answer": "first report helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Getting started",
    "question": "Can Eval AI explain first report?",
    "answer": "Yes. Eval AI can explain first report when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Getting started",
    "question": "What should I do if first report looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Getting started",
    "question": "How do I use homepage in Eval?",
    "answer": "In Eval, homepage is handled inside the Getting started area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Getting started",
    "question": "What does homepage mean in Eval?",
    "answer": "homepage is part of the Getting started experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Getting started",
    "question": "Why is homepage important?",
    "answer": "homepage helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Getting started",
    "question": "Can Eval AI explain homepage?",
    "answer": "Yes. Eval AI can explain homepage when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Getting started",
    "question": "What should I do if homepage looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Getting started",
    "question": "How do I use score ring in Eval?",
    "answer": "In Eval, score ring is handled inside the Getting started area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Getting started",
    "question": "What does score ring mean in Eval?",
    "answer": "score ring is part of the Getting started experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Getting started",
    "question": "Why is score ring important?",
    "answer": "score ring helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Getting started",
    "question": "Can Eval AI explain score ring?",
    "answer": "Yes. Eval AI can explain score ring when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Getting started",
    "question": "What should I do if score ring looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Getting started",
    "question": "How do I use company report in Eval?",
    "answer": "In Eval, company report is handled inside the Getting started area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Getting started",
    "question": "What does company report mean in Eval?",
    "answer": "company report is part of the Getting started experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Getting started",
    "question": "Why is company report important?",
    "answer": "company report helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Getting started",
    "question": "Can Eval AI explain company report?",
    "answer": "Yes. Eval AI can explain company report when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Getting started",
    "question": "What should I do if company report looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Getting started",
    "question": "How do I use stock lookup in Eval?",
    "answer": "In Eval, stock lookup is handled inside the Getting started area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Getting started",
    "question": "What does stock lookup mean in Eval?",
    "answer": "stock lookup is part of the Getting started experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Getting started",
    "question": "Why is stock lookup important?",
    "answer": "stock lookup helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Getting started",
    "question": "Can Eval AI explain stock lookup?",
    "answer": "Yes. Eval AI can explain stock lookup when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Getting started",
    "question": "What should I do if stock lookup looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Getting started",
    "question": "How do I use mobile app in Eval?",
    "answer": "In Eval, mobile app is handled inside the Getting started area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Getting started",
    "question": "What does mobile app mean in Eval?",
    "answer": "mobile app is part of the Getting started experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Getting started",
    "question": "Why is mobile app important?",
    "answer": "mobile app helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Getting started",
    "question": "Can Eval AI explain mobile app?",
    "answer": "Yes. Eval AI can explain mobile app when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Getting started",
    "question": "What should I do if mobile app looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Getting started",
    "question": "How do I use desktop layout in Eval?",
    "answer": "In Eval, desktop layout is handled inside the Getting started area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Getting started",
    "question": "What does desktop layout mean in Eval?",
    "answer": "desktop layout is part of the Getting started experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Getting started",
    "question": "Why is desktop layout important?",
    "answer": "desktop layout helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Getting started",
    "question": "Can Eval AI explain desktop layout?",
    "answer": "Yes. Eval AI can explain desktop layout when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Getting started",
    "question": "What should I do if desktop layout looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Getting started",
    "question": "Can users use Eval from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Getting started",
    "question": "Does Eval update automatically?",
    "answer": "Eval updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Getting started",
    "question": "Can users start dashboard from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Getting started",
    "question": "Does dashboard update automatically?",
    "answer": "dashboard updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Getting started",
    "question": "Can users understand ticker search from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Getting started",
    "question": "Does ticker search update automatically?",
    "answer": "ticker search updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Getting started",
    "question": "Can users open first report from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Getting started",
    "question": "Does first report update automatically?",
    "answer": "first report updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Getting started",
    "question": "Can users read homepage from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Getting started",
    "question": "Does homepage update automatically?",
    "answer": "homepage updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Getting started",
    "question": "Can users load score ring from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Getting started",
    "question": "Does score ring update automatically?",
    "answer": "score ring updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Getting started",
    "question": "Can users refresh company report from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Getting started",
    "question": "Does company report update automatically?",
    "answer": "company report updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Getting started",
    "question": "Can users navigate stock lookup from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Getting started",
    "question": "Does stock lookup update automatically?",
    "answer": "stock lookup updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Getting started",
    "question": "Can users search mobile app from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Getting started",
    "question": "Does mobile app update automatically?",
    "answer": "mobile app updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Getting started",
    "question": "Can users review desktop layout from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Getting started",
    "question": "Does desktop layout update automatically?",
    "answer": "desktop layout updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Navigation",
    "question": "What is in the dropdown menu?",
    "answer": "The dropdown menu opens Ticker search, AI Assistant, Compare, FAQs, Homepage, Terms & Conditions, Contact, and Watchlist on mobile/tablet."
  },
  {
    "category": "Navigation",
    "question": "How do I close the dropdown?",
    "answer": "Tap or click outside the dropdown, or choose one of the menu options."
  },
  {
    "category": "Navigation",
    "question": "How do I get back to the homepage?",
    "answer": "Click the Eval logo/wordmark or select Homepage from the dropdown menu."
  },
  {
    "category": "Navigation",
    "question": "How do I open dropdown in Eval?",
    "answer": "In Eval, dropdown is handled inside the Navigation area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Navigation",
    "question": "What does dropdown mean in Eval?",
    "answer": "dropdown is part of the Navigation experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Navigation",
    "question": "Why is dropdown important?",
    "answer": "dropdown helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Navigation",
    "question": "Can Eval AI explain dropdown?",
    "answer": "Yes. Eval AI can explain dropdown when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Navigation",
    "question": "What should I do if dropdown looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Navigation",
    "question": "How do I open homepage in Eval?",
    "answer": "In Eval, homepage is handled inside the Navigation area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Navigation",
    "question": "What does homepage mean in Eval?",
    "answer": "homepage is part of the Navigation experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Navigation",
    "question": "Why is homepage important?",
    "answer": "homepage helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Navigation",
    "question": "Can Eval AI explain homepage?",
    "answer": "Yes. Eval AI can explain homepage when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Navigation",
    "question": "What should I do if homepage looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Navigation",
    "question": "How do I open dashboard in Eval?",
    "answer": "In Eval, dashboard is handled inside the Navigation area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Navigation",
    "question": "What does dashboard mean in Eval?",
    "answer": "dashboard is part of the Navigation experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Navigation",
    "question": "Why is dashboard important?",
    "answer": "dashboard helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Navigation",
    "question": "Can Eval AI explain dashboard?",
    "answer": "Yes. Eval AI can explain dashboard when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Navigation",
    "question": "What should I do if dashboard looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Navigation",
    "question": "How do I open Terms & Conditions in Eval?",
    "answer": "In Eval, Terms & Conditions is handled inside the Navigation area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Navigation",
    "question": "What does Terms & Conditions mean in Eval?",
    "answer": "Terms & Conditions is part of the Navigation experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Navigation",
    "question": "Why is Terms & Conditions important?",
    "answer": "Terms & Conditions helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Navigation",
    "question": "Can Eval AI explain Terms & Conditions?",
    "answer": "Yes. Eval AI can explain Terms & Conditions when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Navigation",
    "question": "What should I do if Terms & Conditions looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Navigation",
    "question": "How do I open Contact in Eval?",
    "answer": "In Eval, Contact is handled inside the Navigation area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Navigation",
    "question": "What does Contact mean in Eval?",
    "answer": "Contact is part of the Navigation experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Navigation",
    "question": "Why is Contact important?",
    "answer": "Contact helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Navigation",
    "question": "Can Eval AI explain Contact?",
    "answer": "Yes. Eval AI can explain Contact when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Navigation",
    "question": "What should I do if Contact looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Navigation",
    "question": "How do I open FAQs in Eval?",
    "answer": "In Eval, FAQs is handled inside the Navigation area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Navigation",
    "question": "What does FAQs mean in Eval?",
    "answer": "FAQs is part of the Navigation experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Navigation",
    "question": "Why is FAQs important?",
    "answer": "FAQs helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Navigation",
    "question": "Can Eval AI explain FAQs?",
    "answer": "Yes. Eval AI can explain FAQs when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Navigation",
    "question": "What should I do if FAQs looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Navigation",
    "question": "How do I open Ticker search in Eval?",
    "answer": "In Eval, Ticker search is handled inside the Navigation area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Navigation",
    "question": "What does Ticker search mean in Eval?",
    "answer": "Ticker search is part of the Navigation experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Navigation",
    "question": "Why is Ticker search important?",
    "answer": "Ticker search helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Navigation",
    "question": "Can Eval AI explain Ticker search?",
    "answer": "Yes. Eval AI can explain Ticker search when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Navigation",
    "question": "What should I do if Ticker search looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Navigation",
    "question": "How do I open AI Assistant in Eval?",
    "answer": "In Eval, AI Assistant is handled inside the Navigation area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Navigation",
    "question": "What does AI Assistant mean in Eval?",
    "answer": "AI Assistant is part of the Navigation experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Navigation",
    "question": "Why is AI Assistant important?",
    "answer": "AI Assistant helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Navigation",
    "question": "Can Eval AI explain AI Assistant?",
    "answer": "Yes. Eval AI can explain AI Assistant when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Navigation",
    "question": "What should I do if AI Assistant looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Navigation",
    "question": "How do I open Compare in Eval?",
    "answer": "In Eval, Compare is handled inside the Navigation area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Navigation",
    "question": "What does Compare mean in Eval?",
    "answer": "Compare is part of the Navigation experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Navigation",
    "question": "Why is Compare important?",
    "answer": "Compare helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Navigation",
    "question": "Can Eval AI explain Compare?",
    "answer": "Yes. Eval AI can explain Compare when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Navigation",
    "question": "What should I do if Compare looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Navigation",
    "question": "How do I open Watchlist in Eval?",
    "answer": "In Eval, Watchlist is handled inside the Navigation area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Navigation",
    "question": "What does Watchlist mean in Eval?",
    "answer": "Watchlist is part of the Navigation experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Navigation",
    "question": "Why is Watchlist important?",
    "answer": "Watchlist helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Navigation",
    "question": "Can Eval AI explain Watchlist?",
    "answer": "Yes. Eval AI can explain Watchlist when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Navigation",
    "question": "What should I do if Watchlist looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Navigation",
    "question": "Can users open dropdown from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Navigation",
    "question": "Does dropdown update automatically?",
    "answer": "dropdown updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Navigation",
    "question": "Can users find homepage from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Navigation",
    "question": "Does homepage update automatically?",
    "answer": "homepage updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Navigation",
    "question": "Can users close dashboard from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Navigation",
    "question": "Does dashboard update automatically?",
    "answer": "dashboard updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Navigation",
    "question": "Can users navigate Terms & Conditions from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Navigation",
    "question": "Does Terms & Conditions update automatically?",
    "answer": "Terms & Conditions updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Navigation",
    "question": "Can users click Contact from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Navigation",
    "question": "Does Contact update automatically?",
    "answer": "Contact updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Navigation",
    "question": "Can users return to FAQs from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Navigation",
    "question": "Does FAQs update automatically?",
    "answer": "FAQs updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Navigation",
    "question": "Can users switch to Ticker search from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Navigation",
    "question": "Does Ticker search update automatically?",
    "answer": "Ticker search updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Navigation",
    "question": "Can users access AI Assistant from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Navigation",
    "question": "Does AI Assistant update automatically?",
    "answer": "AI Assistant updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Navigation",
    "question": "Can users use Compare from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Navigation",
    "question": "Does Compare update automatically?",
    "answer": "Compare updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Navigation",
    "question": "Can users move between Watchlist from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Navigation",
    "question": "Does Watchlist update automatically?",
    "answer": "Watchlist updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Ticker search",
    "question": "What is Ticker search?",
    "answer": "Ticker search lets users type a company name and find the matching ticker from the cached built-in ticker universe."
  },
  {
    "category": "Ticker search",
    "question": "Does Ticker search use FMP?",
    "answer": "No. Ticker search uses the built-in ticker universe cached by the backend, so it does not burn FMP calls while users type."
  },
  {
    "category": "Ticker search",
    "question": "What happens when I click a ticker?",
    "answer": "Clicking the ticker sends you back to the dashboard and loads that ticker\u2019s Analyze report."
  },
  {
    "category": "Ticker search",
    "question": "How do I search company name search in Eval?",
    "answer": "In Eval, company name search is handled inside the Ticker search area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Ticker search",
    "question": "What does company name search mean in Eval?",
    "answer": "company name search is part of the Ticker search experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Ticker search",
    "question": "Why is company name search important?",
    "answer": "company name search helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Ticker search",
    "question": "Can Eval AI explain company name search?",
    "answer": "Yes. Eval AI can explain company name search when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Ticker search",
    "question": "What should I do if company name search looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Ticker search",
    "question": "How do I search ticker in Eval?",
    "answer": "In Eval, ticker is handled inside the Ticker search area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Ticker search",
    "question": "What does ticker mean in Eval?",
    "answer": "ticker is part of the Ticker search experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Ticker search",
    "question": "Why is ticker important?",
    "answer": "ticker helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Ticker search",
    "question": "Can Eval AI explain ticker?",
    "answer": "Yes. Eval AI can explain ticker when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Ticker search",
    "question": "What should I do if ticker looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Ticker search",
    "question": "How do I search the ticker universe table in Eval?",
    "answer": "In Eval, the ticker universe table is handled inside the Ticker search area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Ticker search",
    "question": "What does the ticker universe table mean in Eval?",
    "answer": "the ticker universe table is part of the Ticker search experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Ticker search",
    "question": "Why is the ticker universe table important?",
    "answer": "the ticker universe table helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Ticker search",
    "question": "Can Eval AI explain the ticker universe table?",
    "answer": "Yes. Eval AI can explain the ticker universe table when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Ticker search",
    "question": "What should I do if the ticker universe table looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Ticker search",
    "question": "How do I search lookup results in Eval?",
    "answer": "In Eval, lookup results is handled inside the Ticker search area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Ticker search",
    "question": "What does lookup results mean in Eval?",
    "answer": "lookup results is part of the Ticker search experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Ticker search",
    "question": "Why is lookup results important?",
    "answer": "lookup results helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Ticker search",
    "question": "Can Eval AI explain lookup results?",
    "answer": "Yes. Eval AI can explain lookup results when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Ticker search",
    "question": "What should I do if lookup results looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Ticker search",
    "question": "How do I search clickable ticker in Eval?",
    "answer": "In Eval, clickable ticker is handled inside the Ticker search area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Ticker search",
    "question": "What does clickable ticker mean in Eval?",
    "answer": "clickable ticker is part of the Ticker search experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Ticker search",
    "question": "Why is clickable ticker important?",
    "answer": "clickable ticker helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Ticker search",
    "question": "Can Eval AI explain clickable ticker?",
    "answer": "Yes. Eval AI can explain clickable ticker when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Ticker search",
    "question": "What should I do if clickable ticker looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Ticker search",
    "question": "How do I search search box in Eval?",
    "answer": "In Eval, search box is handled inside the Ticker search area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Ticker search",
    "question": "What does search box mean in Eval?",
    "answer": "search box is part of the Ticker search experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Ticker search",
    "question": "Why is search box important?",
    "answer": "search box helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Ticker search",
    "question": "Can Eval AI explain search box?",
    "answer": "Yes. Eval AI can explain search box when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Ticker search",
    "question": "What should I do if search box looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Ticker search",
    "question": "How do I search company list in Eval?",
    "answer": "In Eval, company list is handled inside the Ticker search area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Ticker search",
    "question": "What does company list mean in Eval?",
    "answer": "company list is part of the Ticker search experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Ticker search",
    "question": "Why is company list important?",
    "answer": "company list helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Ticker search",
    "question": "Can Eval AI explain company list?",
    "answer": "Yes. Eval AI can explain company list when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Ticker search",
    "question": "What should I do if company list looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Ticker search",
    "question": "How do I search stock table in Eval?",
    "answer": "In Eval, stock table is handled inside the Ticker search area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Ticker search",
    "question": "What does stock table mean in Eval?",
    "answer": "stock table is part of the Ticker search experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Ticker search",
    "question": "Why is stock table important?",
    "answer": "stock table helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Ticker search",
    "question": "Can Eval AI explain stock table?",
    "answer": "Yes. Eval AI can explain stock table when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Ticker search",
    "question": "What should I do if stock table looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Ticker search",
    "question": "How do I search filtering in Eval?",
    "answer": "In Eval, filtering is handled inside the Ticker search area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Ticker search",
    "question": "What does filtering mean in Eval?",
    "answer": "filtering is part of the Ticker search experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Ticker search",
    "question": "Why is filtering important?",
    "answer": "filtering helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Ticker search",
    "question": "Can Eval AI explain filtering?",
    "answer": "Yes. Eval AI can explain filtering when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Ticker search",
    "question": "What should I do if filtering looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Ticker search",
    "question": "How do I search analyze page in Eval?",
    "answer": "In Eval, analyze page is handled inside the Ticker search area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Ticker search",
    "question": "What does analyze page mean in Eval?",
    "answer": "analyze page is part of the Ticker search experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Ticker search",
    "question": "Why is analyze page important?",
    "answer": "analyze page helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Ticker search",
    "question": "Can Eval AI explain analyze page?",
    "answer": "Yes. Eval AI can explain analyze page when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Ticker search",
    "question": "What should I do if analyze page looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Ticker search",
    "question": "Can users search company name search from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Ticker search",
    "question": "Does company name search update automatically?",
    "answer": "company name search updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Ticker search",
    "question": "Can users filter ticker from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Ticker search",
    "question": "Does ticker update automatically?",
    "answer": "ticker updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Ticker search",
    "question": "Can users click the ticker universe table from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Ticker search",
    "question": "Does the ticker universe table update automatically?",
    "answer": "the ticker universe table updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Ticker search",
    "question": "Can users load lookup results from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Ticker search",
    "question": "Does lookup results update automatically?",
    "answer": "lookup results updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Ticker search",
    "question": "Can users find clickable ticker from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Ticker search",
    "question": "Does clickable ticker update automatically?",
    "answer": "clickable ticker updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Ticker search",
    "question": "Can users select search box from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Ticker search",
    "question": "Does search box update automatically?",
    "answer": "search box updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Ticker search",
    "question": "Can users type company list from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Ticker search",
    "question": "Does company list update automatically?",
    "answer": "company list updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Ticker search",
    "question": "Can users open stock table from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Ticker search",
    "question": "Does stock table update automatically?",
    "answer": "stock table updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Ticker search",
    "question": "Can users use filtering from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Ticker search",
    "question": "Does filtering update automatically?",
    "answer": "filtering updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Ticker search",
    "question": "Can users match analyze page from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Ticker search",
    "question": "Does analyze page update automatically?",
    "answer": "analyze page updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Eval Score",
    "question": "What is the Eval Score?",
    "answer": "The Eval Score is a 0.0 to 10.0 educational rating that blends growth, profitability, financial health, valuation, momentum, pullback, and news sentiment."
  },
  {
    "category": "Eval Score",
    "question": "Is the Eval Score financial advice?",
    "answer": "No. It is an educational company-evaluation score, not a buy, sell, or hold recommendation."
  },
  {
    "category": "Eval Score",
    "question": "Why can a score change?",
    "answer": "Scores can change when market data, valuation, category inputs, risk, or news sentiment refresh according to their cache schedule."
  },
  {
    "category": "Eval Score",
    "question": "How do I understand Eval Score in Eval?",
    "answer": "In Eval, Eval Score is handled inside the Eval Score area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Eval Score",
    "question": "What does Eval Score mean in Eval?",
    "answer": "Eval Score is part of the Eval Score experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Eval Score",
    "question": "Why is Eval Score important?",
    "answer": "Eval Score helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Eval Score",
    "question": "Can Eval AI explain Eval Score?",
    "answer": "Yes. Eval AI can explain Eval Score when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Eval Score",
    "question": "What should I do if Eval Score looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Eval Score",
    "question": "How do I understand score ring in Eval?",
    "answer": "In Eval, score ring is handled inside the Eval Score area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Eval Score",
    "question": "What does score ring mean in Eval?",
    "answer": "score ring is part of the Eval Score experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Eval Score",
    "question": "Why is score ring important?",
    "answer": "score ring helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Eval Score",
    "question": "Can Eval AI explain score ring?",
    "answer": "Yes. Eval AI can explain score ring when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Eval Score",
    "question": "What should I do if score ring looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Eval Score",
    "question": "How do I understand green score in Eval?",
    "answer": "In Eval, green score is handled inside the Eval Score area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Eval Score",
    "question": "What does green score mean in Eval?",
    "answer": "green score is part of the Eval Score experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Eval Score",
    "question": "Why is green score important?",
    "answer": "green score helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Eval Score",
    "question": "Can Eval AI explain green score?",
    "answer": "Yes. Eval AI can explain green score when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Eval Score",
    "question": "What should I do if green score looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Eval Score",
    "question": "How do I understand yellow score in Eval?",
    "answer": "In Eval, yellow score is handled inside the Eval Score area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Eval Score",
    "question": "What does yellow score mean in Eval?",
    "answer": "yellow score is part of the Eval Score experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Eval Score",
    "question": "Why is yellow score important?",
    "answer": "yellow score helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Eval Score",
    "question": "Can Eval AI explain yellow score?",
    "answer": "Yes. Eval AI can explain yellow score when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Eval Score",
    "question": "What should I do if yellow score looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Eval Score",
    "question": "How do I understand red score in Eval?",
    "answer": "In Eval, red score is handled inside the Eval Score area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Eval Score",
    "question": "What does red score mean in Eval?",
    "answer": "red score is part of the Eval Score experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Eval Score",
    "question": "Why is red score important?",
    "answer": "red score helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Eval Score",
    "question": "Can Eval AI explain red score?",
    "answer": "Yes. Eval AI can explain red score when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Eval Score",
    "question": "What should I do if red score looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Eval Score",
    "question": "How do I understand overall rating in Eval?",
    "answer": "In Eval, overall rating is handled inside the Eval Score area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Eval Score",
    "question": "What does overall rating mean in Eval?",
    "answer": "overall rating is part of the Eval Score experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Eval Score",
    "question": "Why is overall rating important?",
    "answer": "overall rating helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Eval Score",
    "question": "Can Eval AI explain overall rating?",
    "answer": "Yes. Eval AI can explain overall rating when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Eval Score",
    "question": "What should I do if overall rating looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Eval Score",
    "question": "How do I understand category blend in Eval?",
    "answer": "In Eval, category blend is handled inside the Eval Score area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Eval Score",
    "question": "What does category blend mean in Eval?",
    "answer": "category blend is part of the Eval Score experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Eval Score",
    "question": "Why is category blend important?",
    "answer": "category blend helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Eval Score",
    "question": "Can Eval AI explain category blend?",
    "answer": "Yes. Eval AI can explain category blend when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Eval Score",
    "question": "What should I do if category blend looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Eval Score",
    "question": "How do I understand score update in Eval?",
    "answer": "In Eval, score update is handled inside the Eval Score area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Eval Score",
    "question": "What does score update mean in Eval?",
    "answer": "score update is part of the Eval Score experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Eval Score",
    "question": "Why is score update important?",
    "answer": "score update helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Eval Score",
    "question": "Can Eval AI explain score update?",
    "answer": "Yes. Eval AI can explain score update when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Eval Score",
    "question": "What should I do if score update looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Eval Score",
    "question": "How do I understand score meaning in Eval?",
    "answer": "In Eval, score meaning is handled inside the Eval Score area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Eval Score",
    "question": "What does score meaning mean in Eval?",
    "answer": "score meaning is part of the Eval Score experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Eval Score",
    "question": "Why is score meaning important?",
    "answer": "score meaning helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Eval Score",
    "question": "Can Eval AI explain score meaning?",
    "answer": "Yes. Eval AI can explain score meaning when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Eval Score",
    "question": "What should I do if score meaning looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Eval Score",
    "question": "How do I understand company strength in Eval?",
    "answer": "In Eval, company strength is handled inside the Eval Score area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Eval Score",
    "question": "What does company strength mean in Eval?",
    "answer": "company strength is part of the Eval Score experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Eval Score",
    "question": "Why is company strength important?",
    "answer": "company strength helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Eval Score",
    "question": "Can Eval AI explain company strength?",
    "answer": "Yes. Eval AI can explain company strength when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Eval Score",
    "question": "What should I do if company strength looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Eval Score",
    "question": "Can users understand Eval Score from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Eval Score",
    "question": "Does Eval Score update automatically?",
    "answer": "Eval Score updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Eval Score",
    "question": "Can users interpret score ring from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Eval Score",
    "question": "Does score ring update automatically?",
    "answer": "score ring updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Eval Score",
    "question": "Can users read green score from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Eval Score",
    "question": "Does green score update automatically?",
    "answer": "green score updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Eval Score",
    "question": "Can users compare yellow score from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Eval Score",
    "question": "Does yellow score update automatically?",
    "answer": "yellow score updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Eval Score",
    "question": "Can users explain red score from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Eval Score",
    "question": "Does red score update automatically?",
    "answer": "red score updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Eval Score",
    "question": "Can users trust overall rating from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Eval Score",
    "question": "Does overall rating update automatically?",
    "answer": "overall rating updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Eval Score",
    "question": "Can users refresh category blend from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Eval Score",
    "question": "Does category blend update automatically?",
    "answer": "category blend updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Eval Score",
    "question": "Can users calculate score update from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Eval Score",
    "question": "Does score update update automatically?",
    "answer": "score update updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Eval Score",
    "question": "Can users judge score meaning from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Eval Score",
    "question": "Does score meaning update automatically?",
    "answer": "score meaning updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Eval Score",
    "question": "Can users review company strength from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Eval Score",
    "question": "Does company strength update automatically?",
    "answer": "company strength updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Metric cards",
    "question": "What do the metric cards show?",
    "answer": "Metric cards show each major category score from 0 to 10 with a bar chart and short explanation."
  },
  {
    "category": "Metric cards",
    "question": "Why are metric numbers white?",
    "answer": "The numbers are white for readability while the bar color shows the score range."
  },
  {
    "category": "Metric cards",
    "question": "What does a longer bar mean?",
    "answer": "A longer bar means that category is scoring stronger within the Eval system."
  },
  {
    "category": "Metric cards",
    "question": "How do I read growth in Eval?",
    "answer": "In Eval, growth is handled inside the Metric cards area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Metric cards",
    "question": "What does growth mean in Eval?",
    "answer": "growth is part of the Metric cards experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Metric cards",
    "question": "Why is growth important?",
    "answer": "growth helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Metric cards",
    "question": "Can Eval AI explain growth?",
    "answer": "Yes. Eval AI can explain growth when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Metric cards",
    "question": "What should I do if growth looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Metric cards",
    "question": "How do I read profitability in Eval?",
    "answer": "In Eval, profitability is handled inside the Metric cards area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Metric cards",
    "question": "What does profitability mean in Eval?",
    "answer": "profitability is part of the Metric cards experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Metric cards",
    "question": "Why is profitability important?",
    "answer": "profitability helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Metric cards",
    "question": "Can Eval AI explain profitability?",
    "answer": "Yes. Eval AI can explain profitability when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Metric cards",
    "question": "What should I do if profitability looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Metric cards",
    "question": "How do I read financial health in Eval?",
    "answer": "In Eval, financial health is handled inside the Metric cards area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Metric cards",
    "question": "What does financial health mean in Eval?",
    "answer": "financial health is part of the Metric cards experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Metric cards",
    "question": "Why is financial health important?",
    "answer": "financial health helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Metric cards",
    "question": "Can Eval AI explain financial health?",
    "answer": "Yes. Eval AI can explain financial health when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Metric cards",
    "question": "What should I do if financial health looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Metric cards",
    "question": "How do I read valuation in Eval?",
    "answer": "In Eval, valuation is handled inside the Metric cards area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Metric cards",
    "question": "What does valuation mean in Eval?",
    "answer": "valuation is part of the Metric cards experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Metric cards",
    "question": "Why is valuation important?",
    "answer": "valuation helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Metric cards",
    "question": "Can Eval AI explain valuation?",
    "answer": "Yes. Eval AI can explain valuation when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Metric cards",
    "question": "What should I do if valuation looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Metric cards",
    "question": "How do I read momentum in Eval?",
    "answer": "In Eval, momentum is handled inside the Metric cards area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Metric cards",
    "question": "What does momentum mean in Eval?",
    "answer": "momentum is part of the Metric cards experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Metric cards",
    "question": "Why is momentum important?",
    "answer": "momentum helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Metric cards",
    "question": "Can Eval AI explain momentum?",
    "answer": "Yes. Eval AI can explain momentum when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Metric cards",
    "question": "What should I do if momentum looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Metric cards",
    "question": "How do I read pullback in Eval?",
    "answer": "In Eval, pullback is handled inside the Metric cards area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Metric cards",
    "question": "What does pullback mean in Eval?",
    "answer": "pullback is part of the Metric cards experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Metric cards",
    "question": "Why is pullback important?",
    "answer": "pullback helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Metric cards",
    "question": "Can Eval AI explain pullback?",
    "answer": "Yes. Eval AI can explain pullback when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Metric cards",
    "question": "What should I do if pullback looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Metric cards",
    "question": "How do I read news sentiment in Eval?",
    "answer": "In Eval, news sentiment is handled inside the Metric cards area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Metric cards",
    "question": "What does news sentiment mean in Eval?",
    "answer": "news sentiment is part of the Metric cards experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Metric cards",
    "question": "Why is news sentiment important?",
    "answer": "news sentiment helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Metric cards",
    "question": "Can Eval AI explain news sentiment?",
    "answer": "Yes. Eval AI can explain news sentiment when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Metric cards",
    "question": "What should I do if news sentiment looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Metric cards",
    "question": "How do I read bar chart in Eval?",
    "answer": "In Eval, bar chart is handled inside the Metric cards area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Metric cards",
    "question": "What does bar chart mean in Eval?",
    "answer": "bar chart is part of the Metric cards experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Metric cards",
    "question": "Why is bar chart important?",
    "answer": "bar chart helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Metric cards",
    "question": "Can Eval AI explain bar chart?",
    "answer": "Yes. Eval AI can explain bar chart when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Metric cards",
    "question": "What should I do if bar chart looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Metric cards",
    "question": "How do I read category score in Eval?",
    "answer": "In Eval, category score is handled inside the Metric cards area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Metric cards",
    "question": "What does category score mean in Eval?",
    "answer": "category score is part of the Metric cards experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Metric cards",
    "question": "Why is category score important?",
    "answer": "category score helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Metric cards",
    "question": "Can Eval AI explain category score?",
    "answer": "Yes. Eval AI can explain category score when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Metric cards",
    "question": "What should I do if category score looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Metric cards",
    "question": "How do I read metric description in Eval?",
    "answer": "In Eval, metric description is handled inside the Metric cards area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Metric cards",
    "question": "What does metric description mean in Eval?",
    "answer": "metric description is part of the Metric cards experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Metric cards",
    "question": "Why is metric description important?",
    "answer": "metric description helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Metric cards",
    "question": "Can Eval AI explain metric description?",
    "answer": "Yes. Eval AI can explain metric description when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Metric cards",
    "question": "What should I do if metric description looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Metric cards",
    "question": "Can users read growth from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Metric cards",
    "question": "Does growth update automatically?",
    "answer": "growth updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Metric cards",
    "question": "Can users compare profitability from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Metric cards",
    "question": "Does profitability update automatically?",
    "answer": "profitability updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Metric cards",
    "question": "Can users understand financial health from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Metric cards",
    "question": "Does financial health update automatically?",
    "answer": "financial health updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Metric cards",
    "question": "Can users explain valuation from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Metric cards",
    "question": "Does valuation update automatically?",
    "answer": "valuation updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Metric cards",
    "question": "Can users rank momentum from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Metric cards",
    "question": "Does momentum update automatically?",
    "answer": "momentum updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Metric cards",
    "question": "Can users interpret pullback from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Metric cards",
    "question": "Does pullback update automatically?",
    "answer": "pullback updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Metric cards",
    "question": "Can users evaluate news sentiment from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Metric cards",
    "question": "Does news sentiment update automatically?",
    "answer": "news sentiment updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Metric cards",
    "question": "Can users review bar chart from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Metric cards",
    "question": "Does bar chart update automatically?",
    "answer": "bar chart updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Metric cards",
    "question": "Can users open category score from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Metric cards",
    "question": "Does category score update automatically?",
    "answer": "category score updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Metric cards",
    "question": "Can users use metric description from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Metric cards",
    "question": "Does metric description update automatically?",
    "answer": "metric description updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Metric popups",
    "question": "What does the question mark button do?",
    "answer": "It opens a small popup explaining what the score or section means."
  },
  {
    "category": "Metric popups",
    "question": "How do I close a popup?",
    "answer": "Click the X button in the popup or tap outside if the layout supports it."
  },
  {
    "category": "Metric popups",
    "question": "Why do popups matter?",
    "answer": "Popups help users understand the data behind each score without reading a long report."
  },
  {
    "category": "Metric popups",
    "question": "How do I open question mark button in Eval?",
    "answer": "In Eval, question mark button is handled inside the Metric popups area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Metric popups",
    "question": "What does question mark button mean in Eval?",
    "answer": "question mark button is part of the Metric popups experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Metric popups",
    "question": "Why is question mark button important?",
    "answer": "question mark button helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Metric popups",
    "question": "Can Eval AI explain question mark button?",
    "answer": "Yes. Eval AI can explain question mark button when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Metric popups",
    "question": "What should I do if question mark button looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Metric popups",
    "question": "How do I open popup in Eval?",
    "answer": "In Eval, popup is handled inside the Metric popups area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Metric popups",
    "question": "What does popup mean in Eval?",
    "answer": "popup is part of the Metric popups experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Metric popups",
    "question": "Why is popup important?",
    "answer": "popup helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Metric popups",
    "question": "Can Eval AI explain popup?",
    "answer": "Yes. Eval AI can explain popup when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Metric popups",
    "question": "What should I do if popup looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Metric popups",
    "question": "How do I open X close button in Eval?",
    "answer": "In Eval, X close button is handled inside the Metric popups area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Metric popups",
    "question": "What does X close button mean in Eval?",
    "answer": "X close button is part of the Metric popups experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Metric popups",
    "question": "Why is X close button important?",
    "answer": "X close button helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Metric popups",
    "question": "Can Eval AI explain X close button?",
    "answer": "Yes. Eval AI can explain X close button when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Metric popups",
    "question": "What should I do if X close button looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Metric popups",
    "question": "How do I open metric explanation in Eval?",
    "answer": "In Eval, metric explanation is handled inside the Metric popups area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Metric popups",
    "question": "What does metric explanation mean in Eval?",
    "answer": "metric explanation is part of the Metric popups experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Metric popups",
    "question": "Why is metric explanation important?",
    "answer": "metric explanation helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Metric popups",
    "question": "Can Eval AI explain metric explanation?",
    "answer": "Yes. Eval AI can explain metric explanation when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Metric popups",
    "question": "What should I do if metric explanation looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Metric popups",
    "question": "How do I open score inputs in Eval?",
    "answer": "In Eval, score inputs is handled inside the Metric popups area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Metric popups",
    "question": "What does score inputs mean in Eval?",
    "answer": "score inputs is part of the Metric popups experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Metric popups",
    "question": "Why is score inputs important?",
    "answer": "score inputs helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Metric popups",
    "question": "Can Eval AI explain score inputs?",
    "answer": "Yes. Eval AI can explain score inputs when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Metric popups",
    "question": "What should I do if score inputs looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Metric popups",
    "question": "How do I open data source in Eval?",
    "answer": "In Eval, data source is handled inside the Metric popups area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Metric popups",
    "question": "What does data source mean in Eval?",
    "answer": "data source is part of the Metric popups experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Metric popups",
    "question": "Why is data source important?",
    "answer": "data source helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Metric popups",
    "question": "Can Eval AI explain data source?",
    "answer": "Yes. Eval AI can explain data source when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Metric popups",
    "question": "What should I do if data source looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Metric popups",
    "question": "How do I open formula in Eval?",
    "answer": "In Eval, formula is handled inside the Metric popups area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Metric popups",
    "question": "What does formula mean in Eval?",
    "answer": "formula is part of the Metric popups experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Metric popups",
    "question": "Why is formula important?",
    "answer": "formula helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Metric popups",
    "question": "Can Eval AI explain formula?",
    "answer": "Yes. Eval AI can explain formula when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Metric popups",
    "question": "What should I do if formula looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Metric popups",
    "question": "How do I open hover card in Eval?",
    "answer": "In Eval, hover card is handled inside the Metric popups area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Metric popups",
    "question": "What does hover card mean in Eval?",
    "answer": "hover card is part of the Metric popups experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Metric popups",
    "question": "Why is hover card important?",
    "answer": "hover card helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Metric popups",
    "question": "Can Eval AI explain hover card?",
    "answer": "Yes. Eval AI can explain hover card when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Metric popups",
    "question": "What should I do if hover card looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Metric popups",
    "question": "How do I open help text in Eval?",
    "answer": "In Eval, help text is handled inside the Metric popups area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Metric popups",
    "question": "What does help text mean in Eval?",
    "answer": "help text is part of the Metric popups experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Metric popups",
    "question": "Why is help text important?",
    "answer": "help text helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Metric popups",
    "question": "Can Eval AI explain help text?",
    "answer": "Yes. Eval AI can explain help text when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Metric popups",
    "question": "What should I do if help text looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Metric popups",
    "question": "How do I open category popup in Eval?",
    "answer": "In Eval, category popup is handled inside the Metric popups area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Metric popups",
    "question": "What does category popup mean in Eval?",
    "answer": "category popup is part of the Metric popups experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Metric popups",
    "question": "Why is category popup important?",
    "answer": "category popup helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Metric popups",
    "question": "Can Eval AI explain category popup?",
    "answer": "Yes. Eval AI can explain category popup when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Metric popups",
    "question": "What should I do if category popup looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Metric popups",
    "question": "Can users open question mark button from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Metric popups",
    "question": "Does question mark button update automatically?",
    "answer": "question mark button updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Metric popups",
    "question": "Can users close popup from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Metric popups",
    "question": "Does popup update automatically?",
    "answer": "popup updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Metric popups",
    "question": "Can users read X close button from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Metric popups",
    "question": "Does X close button update automatically?",
    "answer": "X close button updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Metric popups",
    "question": "Can users understand metric explanation from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Metric popups",
    "question": "Does metric explanation update automatically?",
    "answer": "metric explanation updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Metric popups",
    "question": "Can users explain score inputs from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Metric popups",
    "question": "Does score inputs update automatically?",
    "answer": "score inputs updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Metric popups",
    "question": "Can users inspect data source from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Metric popups",
    "question": "Does data source update automatically?",
    "answer": "data source updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Metric popups",
    "question": "Can users use formula from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Metric popups",
    "question": "Does formula update automatically?",
    "answer": "formula updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Metric popups",
    "question": "Can users review hover card from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Metric popups",
    "question": "Does hover card update automatically?",
    "answer": "hover card updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Metric popups",
    "question": "Can users dismiss help text from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Metric popups",
    "question": "Does help text update automatically?",
    "answer": "help text updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Metric popups",
    "question": "Can users learn category popup from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Metric popups",
    "question": "Does category popup update automatically?",
    "answer": "category popup updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Price and risk",
    "question": "What does the Price card show?",
    "answer": "The Price card shows the latest cached/available price and daily percent movement when available."
  },
  {
    "category": "Price and risk",
    "question": "What does the Risk card show?",
    "answer": "The Risk card turns market and financial risk signals into a simple Low, Medium, or High label."
  },
  {
    "category": "Price and risk",
    "question": "How long is price cached?",
    "answer": "Price, momentum, and pullback are cached for about 1 day."
  },
  {
    "category": "Price and risk",
    "question": "How do I read price card in Eval?",
    "answer": "In Eval, price card is handled inside the Price and risk area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Price and risk",
    "question": "What does price card mean in Eval?",
    "answer": "price card is part of the Price and risk experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Price and risk",
    "question": "Why is price card important?",
    "answer": "price card helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Price and risk",
    "question": "Can Eval AI explain price card?",
    "answer": "Yes. Eval AI can explain price card when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Price and risk",
    "question": "What should I do if price card looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Price and risk",
    "question": "How do I read daily change in Eval?",
    "answer": "In Eval, daily change is handled inside the Price and risk area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Price and risk",
    "question": "What does daily change mean in Eval?",
    "answer": "daily change is part of the Price and risk experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Price and risk",
    "question": "Why is daily change important?",
    "answer": "daily change helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Price and risk",
    "question": "Can Eval AI explain daily change?",
    "answer": "Yes. Eval AI can explain daily change when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Price and risk",
    "question": "What should I do if daily change looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Price and risk",
    "question": "How do I read risk card in Eval?",
    "answer": "In Eval, risk card is handled inside the Price and risk area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Price and risk",
    "question": "What does risk card mean in Eval?",
    "answer": "risk card is part of the Price and risk experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Price and risk",
    "question": "Why is risk card important?",
    "answer": "risk card helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Price and risk",
    "question": "Can Eval AI explain risk card?",
    "answer": "Yes. Eval AI can explain risk card when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Price and risk",
    "question": "What should I do if risk card looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Price and risk",
    "question": "How do I read risk label in Eval?",
    "answer": "In Eval, risk label is handled inside the Price and risk area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Price and risk",
    "question": "What does risk label mean in Eval?",
    "answer": "risk label is part of the Price and risk experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Price and risk",
    "question": "Why is risk label important?",
    "answer": "risk label helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Price and risk",
    "question": "Can Eval AI explain risk label?",
    "answer": "Yes. Eval AI can explain risk label when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Price and risk",
    "question": "What should I do if risk label looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Price and risk",
    "question": "How do I read Low risk in Eval?",
    "answer": "In Eval, Low risk is handled inside the Price and risk area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Price and risk",
    "question": "What does Low risk mean in Eval?",
    "answer": "Low risk is part of the Price and risk experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Price and risk",
    "question": "Why is Low risk important?",
    "answer": "Low risk helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Price and risk",
    "question": "Can Eval AI explain Low risk?",
    "answer": "Yes. Eval AI can explain Low risk when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Price and risk",
    "question": "What should I do if Low risk looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Price and risk",
    "question": "How do I read Medium risk in Eval?",
    "answer": "In Eval, Medium risk is handled inside the Price and risk area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Price and risk",
    "question": "What does Medium risk mean in Eval?",
    "answer": "Medium risk is part of the Price and risk experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Price and risk",
    "question": "Why is Medium risk important?",
    "answer": "Medium risk helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Price and risk",
    "question": "Can Eval AI explain Medium risk?",
    "answer": "Yes. Eval AI can explain Medium risk when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Price and risk",
    "question": "What should I do if Medium risk looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Price and risk",
    "question": "How do I read High risk in Eval?",
    "answer": "In Eval, High risk is handled inside the Price and risk area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Price and risk",
    "question": "What does High risk mean in Eval?",
    "answer": "High risk is part of the Price and risk experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Price and risk",
    "question": "Why is High risk important?",
    "answer": "High risk helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Price and risk",
    "question": "Can Eval AI explain High risk?",
    "answer": "Yes. Eval AI can explain High risk when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Price and risk",
    "question": "What should I do if High risk looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Price and risk",
    "question": "How do I read market data in Eval?",
    "answer": "In Eval, market data is handled inside the Price and risk area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Price and risk",
    "question": "What does market data mean in Eval?",
    "answer": "market data is part of the Price and risk experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Price and risk",
    "question": "Why is market data important?",
    "answer": "market data helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Price and risk",
    "question": "Can Eval AI explain market data?",
    "answer": "Yes. Eval AI can explain market data when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Price and risk",
    "question": "What should I do if market data looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Price and risk",
    "question": "How do I read price cache in Eval?",
    "answer": "In Eval, price cache is handled inside the Price and risk area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Price and risk",
    "question": "What does price cache mean in Eval?",
    "answer": "price cache is part of the Price and risk experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Price and risk",
    "question": "Why is price cache important?",
    "answer": "price cache helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Price and risk",
    "question": "Can Eval AI explain price cache?",
    "answer": "Yes. Eval AI can explain price cache when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Price and risk",
    "question": "What should I do if price cache looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Price and risk",
    "question": "How do I read risk cache in Eval?",
    "answer": "In Eval, risk cache is handled inside the Price and risk area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Price and risk",
    "question": "What does risk cache mean in Eval?",
    "answer": "risk cache is part of the Price and risk experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Price and risk",
    "question": "Why is risk cache important?",
    "answer": "risk cache helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Price and risk",
    "question": "Can Eval AI explain risk cache?",
    "answer": "Yes. Eval AI can explain risk cache when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Price and risk",
    "question": "What should I do if risk cache looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Price and risk",
    "question": "Can users read price card from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Price and risk",
    "question": "Does price card update automatically?",
    "answer": "price card updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Price and risk",
    "question": "Can users refresh daily change from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Price and risk",
    "question": "Does daily change update automatically?",
    "answer": "daily change updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Price and risk",
    "question": "Can users understand risk card from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Price and risk",
    "question": "Does risk card update automatically?",
    "answer": "risk card updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Price and risk",
    "question": "Can users explain risk label from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Price and risk",
    "question": "Does risk label update automatically?",
    "answer": "risk label updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Price and risk",
    "question": "Can users compare Low risk from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Price and risk",
    "question": "Does Low risk update automatically?",
    "answer": "Low risk updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Price and risk",
    "question": "Can users interpret Medium risk from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Price and risk",
    "question": "Does Medium risk update automatically?",
    "answer": "Medium risk updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Price and risk",
    "question": "Can users use High risk from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Price and risk",
    "question": "Does High risk update automatically?",
    "answer": "High risk updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Price and risk",
    "question": "Can users review market data from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Price and risk",
    "question": "Does market data update automatically?",
    "answer": "market data updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Price and risk",
    "question": "Can users check price cache from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Price and risk",
    "question": "Does price cache update automatically?",
    "answer": "price cache updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Price and risk",
    "question": "Can users watch risk cache from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Price and risk",
    "question": "Does risk cache update automatically?",
    "answer": "risk cache updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Watchlist",
    "question": "What is the Watchlist?",
    "answer": "The Watchlist stores tickers users want to track and ranks them by Eval Score."
  },
  {
    "category": "Watchlist",
    "question": "Why does Compare require watchlist stocks?",
    "answer": "Compare uses saved watchlist reports so users can select 2 to 5 tracked stocks for comparison."
  },
  {
    "category": "Watchlist",
    "question": "Can Eval AI answer watchlist questions?",
    "answer": "Yes. Eval AI can answer specific stock questions when the ticker is loaded or saved in the user\u2019s watchlist."
  },
  {
    "category": "Watchlist",
    "question": "How do I add add stock in Eval?",
    "answer": "In Eval, add stock is handled inside the Watchlist area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Watchlist",
    "question": "What does add stock mean in Eval?",
    "answer": "add stock is part of the Watchlist experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Watchlist",
    "question": "Why is add stock important?",
    "answer": "add stock helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Watchlist",
    "question": "Can Eval AI explain add stock?",
    "answer": "Yes. Eval AI can explain add stock when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Watchlist",
    "question": "What should I do if add stock looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Watchlist",
    "question": "How do I add remove stock in Eval?",
    "answer": "In Eval, remove stock is handled inside the Watchlist area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Watchlist",
    "question": "What does remove stock mean in Eval?",
    "answer": "remove stock is part of the Watchlist experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Watchlist",
    "question": "Why is remove stock important?",
    "answer": "remove stock helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Watchlist",
    "question": "Can Eval AI explain remove stock?",
    "answer": "Yes. Eval AI can explain remove stock when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Watchlist",
    "question": "What should I do if remove stock looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Watchlist",
    "question": "How do I add refresh watchlist in Eval?",
    "answer": "In Eval, refresh watchlist is handled inside the Watchlist area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Watchlist",
    "question": "What does refresh watchlist mean in Eval?",
    "answer": "refresh watchlist is part of the Watchlist experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Watchlist",
    "question": "Why is refresh watchlist important?",
    "answer": "refresh watchlist helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Watchlist",
    "question": "Can Eval AI explain refresh watchlist?",
    "answer": "Yes. Eval AI can explain refresh watchlist when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Watchlist",
    "question": "What should I do if refresh watchlist looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Watchlist",
    "question": "How do I add watchlist ranking in Eval?",
    "answer": "In Eval, watchlist ranking is handled inside the Watchlist area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Watchlist",
    "question": "What does watchlist ranking mean in Eval?",
    "answer": "watchlist ranking is part of the Watchlist experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Watchlist",
    "question": "Why is watchlist ranking important?",
    "answer": "watchlist ranking helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Watchlist",
    "question": "Can Eval AI explain watchlist ranking?",
    "answer": "Yes. Eval AI can explain watchlist ranking when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Watchlist",
    "question": "What should I do if watchlist ranking looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Watchlist",
    "question": "How do I add saved ticker in Eval?",
    "answer": "In Eval, saved ticker is handled inside the Watchlist area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Watchlist",
    "question": "What does saved ticker mean in Eval?",
    "answer": "saved ticker is part of the Watchlist experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Watchlist",
    "question": "Why is saved ticker important?",
    "answer": "saved ticker helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Watchlist",
    "question": "Can Eval AI explain saved ticker?",
    "answer": "Yes. Eval AI can explain saved ticker when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Watchlist",
    "question": "What should I do if saved ticker looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Watchlist",
    "question": "How do I add trash icon in Eval?",
    "answer": "In Eval, trash icon is handled inside the Watchlist area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Watchlist",
    "question": "What does trash icon mean in Eval?",
    "answer": "trash icon is part of the Watchlist experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Watchlist",
    "question": "Why is trash icon important?",
    "answer": "trash icon helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Watchlist",
    "question": "Can Eval AI explain trash icon?",
    "answer": "Yes. Eval AI can explain trash icon when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Watchlist",
    "question": "What should I do if trash icon looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Watchlist",
    "question": "How do I add watchlist score in Eval?",
    "answer": "In Eval, watchlist score is handled inside the Watchlist area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Watchlist",
    "question": "What does watchlist score mean in Eval?",
    "answer": "watchlist score is part of the Watchlist experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Watchlist",
    "question": "Why is watchlist score important?",
    "answer": "watchlist score helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Watchlist",
    "question": "Can Eval AI explain watchlist score?",
    "answer": "Yes. Eval AI can explain watchlist score when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Watchlist",
    "question": "What should I do if watchlist score looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Watchlist",
    "question": "How do I add mobile watchlist in Eval?",
    "answer": "In Eval, mobile watchlist is handled inside the Watchlist area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Watchlist",
    "question": "What does mobile watchlist mean in Eval?",
    "answer": "mobile watchlist is part of the Watchlist experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Watchlist",
    "question": "Why is mobile watchlist important?",
    "answer": "mobile watchlist helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Watchlist",
    "question": "Can Eval AI explain mobile watchlist?",
    "answer": "Yes. Eval AI can explain mobile watchlist when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Watchlist",
    "question": "What should I do if mobile watchlist looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Watchlist",
    "question": "How do I add desktop watchlist in Eval?",
    "answer": "In Eval, desktop watchlist is handled inside the Watchlist area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Watchlist",
    "question": "What does desktop watchlist mean in Eval?",
    "answer": "desktop watchlist is part of the Watchlist experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Watchlist",
    "question": "Why is desktop watchlist important?",
    "answer": "desktop watchlist helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Watchlist",
    "question": "Can Eval AI explain desktop watchlist?",
    "answer": "Yes. Eval AI can explain desktop watchlist when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Watchlist",
    "question": "What should I do if desktop watchlist looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Watchlist",
    "question": "How do I add watchlist limit in Eval?",
    "answer": "In Eval, watchlist limit is handled inside the Watchlist area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Watchlist",
    "question": "What does watchlist limit mean in Eval?",
    "answer": "watchlist limit is part of the Watchlist experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Watchlist",
    "question": "Why is watchlist limit important?",
    "answer": "watchlist limit helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Watchlist",
    "question": "Can Eval AI explain watchlist limit?",
    "answer": "Yes. Eval AI can explain watchlist limit when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Watchlist",
    "question": "What should I do if watchlist limit looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Watchlist",
    "question": "Can users add add stock from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Watchlist",
    "question": "Does add stock update automatically?",
    "answer": "add stock updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Watchlist",
    "question": "Can users remove remove stock from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Watchlist",
    "question": "Does remove stock update automatically?",
    "answer": "remove stock updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Watchlist",
    "question": "Can users rank refresh watchlist from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Watchlist",
    "question": "Does refresh watchlist update automatically?",
    "answer": "refresh watchlist updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Watchlist",
    "question": "Can users refresh watchlist ranking from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Watchlist",
    "question": "Does watchlist ranking update automatically?",
    "answer": "watchlist ranking updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Watchlist",
    "question": "Can users open saved ticker from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Watchlist",
    "question": "Does saved ticker update automatically?",
    "answer": "saved ticker updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Watchlist",
    "question": "Can users compare trash icon from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Watchlist",
    "question": "Does trash icon update automatically?",
    "answer": "trash icon updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Watchlist",
    "question": "Can users track watchlist score from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Watchlist",
    "question": "Does watchlist score update automatically?",
    "answer": "watchlist score updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Watchlist",
    "question": "Can users use mobile watchlist from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Watchlist",
    "question": "Does mobile watchlist update automatically?",
    "answer": "mobile watchlist updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Watchlist",
    "question": "Can users save desktop watchlist from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Watchlist",
    "question": "Does desktop watchlist update automatically?",
    "answer": "desktop watchlist updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Watchlist",
    "question": "Can users delete watchlist limit from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Watchlist",
    "question": "Does watchlist limit update automatically?",
    "answer": "watchlist limit updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Compare",
    "question": "What does Compare do?",
    "answer": "Compare lets users select 2 to 5 watchlist stocks and compare their Eval Scores and category radar charts."
  },
  {
    "category": "Compare",
    "question": "Can I hide stocks on the radar chart?",
    "answer": "Yes. Click a ticker label to hide or show that stock on the radar chart."
  },
  {
    "category": "Compare",
    "question": "Why use Compare?",
    "answer": "Compare makes it easier to see which stock is stronger by category instead of only looking at the overall score."
  },
  {
    "category": "Compare",
    "question": "How do I compare compare page in Eval?",
    "answer": "In Eval, compare page is handled inside the Compare area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Compare",
    "question": "What does compare page mean in Eval?",
    "answer": "compare page is part of the Compare experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Compare",
    "question": "Why is compare page important?",
    "answer": "compare page helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Compare",
    "question": "Can Eval AI explain compare page?",
    "answer": "Yes. Eval AI can explain compare page when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Compare",
    "question": "What should I do if compare page looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Compare",
    "question": "How do I compare radar chart in Eval?",
    "answer": "In Eval, radar chart is handled inside the Compare area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Compare",
    "question": "What does radar chart mean in Eval?",
    "answer": "radar chart is part of the Compare experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Compare",
    "question": "Why is radar chart important?",
    "answer": "radar chart helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Compare",
    "question": "Can Eval AI explain radar chart?",
    "answer": "Yes. Eval AI can explain radar chart when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Compare",
    "question": "What should I do if radar chart looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Compare",
    "question": "How do I compare 2 to 5 stocks in Eval?",
    "answer": "In Eval, 2 to 5 stocks is handled inside the Compare area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Compare",
    "question": "What does 2 to 5 stocks mean in Eval?",
    "answer": "2 to 5 stocks is part of the Compare experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Compare",
    "question": "Why is 2 to 5 stocks important?",
    "answer": "2 to 5 stocks helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Compare",
    "question": "Can Eval AI explain 2 to 5 stocks?",
    "answer": "Yes. Eval AI can explain 2 to 5 stocks when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Compare",
    "question": "What should I do if 2 to 5 stocks looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Compare",
    "question": "How do I compare selected stocks in Eval?",
    "answer": "In Eval, selected stocks is handled inside the Compare area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Compare",
    "question": "What does selected stocks mean in Eval?",
    "answer": "selected stocks is part of the Compare experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Compare",
    "question": "Why is selected stocks important?",
    "answer": "selected stocks helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Compare",
    "question": "Can Eval AI explain selected stocks?",
    "answer": "Yes. Eval AI can explain selected stocks when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Compare",
    "question": "What should I do if selected stocks looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Compare",
    "question": "How do I compare ticker labels in Eval?",
    "answer": "In Eval, ticker labels is handled inside the Compare area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Compare",
    "question": "What does ticker labels mean in Eval?",
    "answer": "ticker labels is part of the Compare experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Compare",
    "question": "Why is ticker labels important?",
    "answer": "ticker labels helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Compare",
    "question": "Can Eval AI explain ticker labels?",
    "answer": "Yes. Eval AI can explain ticker labels when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Compare",
    "question": "What should I do if ticker labels looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Compare",
    "question": "How do I compare hide a stock in Eval?",
    "answer": "In Eval, hide a stock is handled inside the Compare area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Compare",
    "question": "What does hide a stock mean in Eval?",
    "answer": "hide a stock is part of the Compare experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Compare",
    "question": "Why is hide a stock important?",
    "answer": "hide a stock helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Compare",
    "question": "Can Eval AI explain hide a stock?",
    "answer": "Yes. Eval AI can explain hide a stock when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Compare",
    "question": "What should I do if hide a stock looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Compare",
    "question": "How do I compare show a stock in Eval?",
    "answer": "In Eval, show a stock is handled inside the Compare area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Compare",
    "question": "What does show a stock mean in Eval?",
    "answer": "show a stock is part of the Compare experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Compare",
    "question": "Why is show a stock important?",
    "answer": "show a stock helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Compare",
    "question": "Can Eval AI explain show a stock?",
    "answer": "Yes. Eval AI can explain show a stock when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Compare",
    "question": "What should I do if show a stock looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Compare",
    "question": "How do I compare score cards in Eval?",
    "answer": "In Eval, score cards is handled inside the Compare area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Compare",
    "question": "What does score cards mean in Eval?",
    "answer": "score cards is part of the Compare experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Compare",
    "question": "Why is score cards important?",
    "answer": "score cards helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Compare",
    "question": "Can Eval AI explain score cards?",
    "answer": "Yes. Eval AI can explain score cards when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Compare",
    "question": "What should I do if score cards looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Compare",
    "question": "How do I compare category comparison in Eval?",
    "answer": "In Eval, category comparison is handled inside the Compare area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Compare",
    "question": "What does category comparison mean in Eval?",
    "answer": "category comparison is part of the Compare experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Compare",
    "question": "Why is category comparison important?",
    "answer": "category comparison helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Compare",
    "question": "Can Eval AI explain category comparison?",
    "answer": "Yes. Eval AI can explain category comparison when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Compare",
    "question": "What should I do if category comparison looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Compare",
    "question": "How do I compare head-to-head in Eval?",
    "answer": "In Eval, head-to-head is handled inside the Compare area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Compare",
    "question": "What does head-to-head mean in Eval?",
    "answer": "head-to-head is part of the Compare experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Compare",
    "question": "Why is head-to-head important?",
    "answer": "head-to-head helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Compare",
    "question": "Can Eval AI explain head-to-head?",
    "answer": "Yes. Eval AI can explain head-to-head when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Compare",
    "question": "What should I do if head-to-head looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Compare",
    "question": "Can users compare compare page from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Compare",
    "question": "Does compare page update automatically?",
    "answer": "compare page updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Compare",
    "question": "Can users select radar chart from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Compare",
    "question": "Does radar chart update automatically?",
    "answer": "radar chart updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Compare",
    "question": "Can users hide 2 to 5 stocks from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Compare",
    "question": "Does 2 to 5 stocks update automatically?",
    "answer": "2 to 5 stocks updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Compare",
    "question": "Can users show selected stocks from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Compare",
    "question": "Does selected stocks update automatically?",
    "answer": "selected stocks updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Compare",
    "question": "Can users read ticker labels from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Compare",
    "question": "Does ticker labels update automatically?",
    "answer": "ticker labels updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Compare",
    "question": "Can users interpret hide a stock from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Compare",
    "question": "Does hide a stock update automatically?",
    "answer": "hide a stock updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Compare",
    "question": "Can users open show a stock from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Compare",
    "question": "Does show a stock update automatically?",
    "answer": "show a stock updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Compare",
    "question": "Can users change score cards from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Compare",
    "question": "Does score cards update automatically?",
    "answer": "score cards updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Compare",
    "question": "Can users save category comparison from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Compare",
    "question": "Does category comparison update automatically?",
    "answer": "category comparison updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Compare",
    "question": "Can users review head-to-head from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Compare",
    "question": "Does head-to-head update automatically?",
    "answer": "head-to-head updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Industry rankings",
    "question": "What is an industry ranking page?",
    "answer": "It shows top-ranked stocks in a similar industry using Eval\u2019s cached analysis data."
  },
  {
    "category": "Industry rankings",
    "question": "Does industry ranking reuse cached stock data?",
    "answer": "Yes. Industry stocks use the same cached analysis system and category TTL rules as normal reports."
  },
  {
    "category": "Industry rankings",
    "question": "Can I hide stocks on the industry radar?",
    "answer": "Yes. Click the ticker label to hide or show that company on the radar."
  },
  {
    "category": "Industry rankings",
    "question": "How do I open industry page in Eval?",
    "answer": "In Eval, industry page is handled inside the Industry rankings area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Industry rankings",
    "question": "What does industry page mean in Eval?",
    "answer": "industry page is part of the Industry rankings experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Industry rankings",
    "question": "Why is industry page important?",
    "answer": "industry page helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Industry rankings",
    "question": "Can Eval AI explain industry page?",
    "answer": "Yes. Eval AI can explain industry page when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Industry rankings",
    "question": "What should I do if industry page looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Industry rankings",
    "question": "How do I open Top 5 stocks in Eval?",
    "answer": "In Eval, Top 5 stocks is handled inside the Industry rankings area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Industry rankings",
    "question": "What does Top 5 stocks mean in Eval?",
    "answer": "Top 5 stocks is part of the Industry rankings experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Industry rankings",
    "question": "Why is Top 5 stocks important?",
    "answer": "Top 5 stocks helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Industry rankings",
    "question": "Can Eval AI explain Top 5 stocks?",
    "answer": "Yes. Eval AI can explain Top 5 stocks when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Industry rankings",
    "question": "What should I do if Top 5 stocks looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Industry rankings",
    "question": "How do I open industry radar in Eval?",
    "answer": "In Eval, industry radar is handled inside the Industry rankings area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Industry rankings",
    "question": "What does industry radar mean in Eval?",
    "answer": "industry radar is part of the Industry rankings experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Industry rankings",
    "question": "Why is industry radar important?",
    "answer": "industry radar helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Industry rankings",
    "question": "Can Eval AI explain industry radar?",
    "answer": "Yes. Eval AI can explain industry radar when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Industry rankings",
    "question": "What should I do if industry radar looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Industry rankings",
    "question": "How do I open industry ranking in Eval?",
    "answer": "In Eval, industry ranking is handled inside the Industry rankings area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Industry rankings",
    "question": "What does industry ranking mean in Eval?",
    "answer": "industry ranking is part of the Industry rankings experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Industry rankings",
    "question": "Why is industry ranking important?",
    "answer": "industry ranking helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Industry rankings",
    "question": "Can Eval AI explain industry ranking?",
    "answer": "Yes. Eval AI can explain industry ranking when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Industry rankings",
    "question": "What should I do if industry ranking looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Industry rankings",
    "question": "How do I open peer comparison in Eval?",
    "answer": "In Eval, peer comparison is handled inside the Industry rankings area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Industry rankings",
    "question": "What does peer comparison mean in Eval?",
    "answer": "peer comparison is part of the Industry rankings experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Industry rankings",
    "question": "Why is peer comparison important?",
    "answer": "peer comparison helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Industry rankings",
    "question": "Can Eval AI explain peer comparison?",
    "answer": "Yes. Eval AI can explain peer comparison when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Industry rankings",
    "question": "What should I do if peer comparison looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Industry rankings",
    "question": "How do I open industry ticker in Eval?",
    "answer": "In Eval, industry ticker is handled inside the Industry rankings area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Industry rankings",
    "question": "What does industry ticker mean in Eval?",
    "answer": "industry ticker is part of the Industry rankings experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Industry rankings",
    "question": "Why is industry ticker important?",
    "answer": "industry ticker helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Industry rankings",
    "question": "Can Eval AI explain industry ticker?",
    "answer": "Yes. Eval AI can explain industry ticker when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Industry rankings",
    "question": "What should I do if industry ticker looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Industry rankings",
    "question": "How do I open rank badge in Eval?",
    "answer": "In Eval, rank badge is handled inside the Industry rankings area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Industry rankings",
    "question": "What does rank badge mean in Eval?",
    "answer": "rank badge is part of the Industry rankings experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Industry rankings",
    "question": "Why is rank badge important?",
    "answer": "rank badge helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Industry rankings",
    "question": "Can Eval AI explain rank badge?",
    "answer": "Yes. Eval AI can explain rank badge when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Industry rankings",
    "question": "What should I do if rank badge looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Industry rankings",
    "question": "How do I open industry description in Eval?",
    "answer": "In Eval, industry description is handled inside the Industry rankings area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Industry rankings",
    "question": "What does industry description mean in Eval?",
    "answer": "industry description is part of the Industry rankings experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Industry rankings",
    "question": "Why is industry description important?",
    "answer": "industry description helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Industry rankings",
    "question": "Can Eval AI explain industry description?",
    "answer": "Yes. Eval AI can explain industry description when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Industry rankings",
    "question": "What should I do if industry description looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Industry rankings",
    "question": "How do I open industry cache in Eval?",
    "answer": "In Eval, industry cache is handled inside the Industry rankings area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Industry rankings",
    "question": "What does industry cache mean in Eval?",
    "answer": "industry cache is part of the Industry rankings experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Industry rankings",
    "question": "Why is industry cache important?",
    "answer": "industry cache helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Industry rankings",
    "question": "Can Eval AI explain industry cache?",
    "answer": "Yes. Eval AI can explain industry cache when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Industry rankings",
    "question": "What should I do if industry cache looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Industry rankings",
    "question": "How do I open leaders in Eval?",
    "answer": "In Eval, leaders is handled inside the Industry rankings area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Industry rankings",
    "question": "What does leaders mean in Eval?",
    "answer": "leaders is part of the Industry rankings experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Industry rankings",
    "question": "Why is leaders important?",
    "answer": "leaders helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Industry rankings",
    "question": "Can Eval AI explain leaders?",
    "answer": "Yes. Eval AI can explain leaders when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Industry rankings",
    "question": "What should I do if leaders looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Industry rankings",
    "question": "Can users open industry page from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Industry rankings",
    "question": "Does industry page update automatically?",
    "answer": "industry page updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Industry rankings",
    "question": "Can users rank Top 5 stocks from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Industry rankings",
    "question": "Does Top 5 stocks update automatically?",
    "answer": "Top 5 stocks updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Industry rankings",
    "question": "Can users compare industry radar from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Industry rankings",
    "question": "Does industry radar update automatically?",
    "answer": "industry radar updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Industry rankings",
    "question": "Can users read industry ranking from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Industry rankings",
    "question": "Does industry ranking update automatically?",
    "answer": "industry ranking updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Industry rankings",
    "question": "Can users hide peer comparison from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Industry rankings",
    "question": "Does peer comparison update automatically?",
    "answer": "peer comparison updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Industry rankings",
    "question": "Can users show industry ticker from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Industry rankings",
    "question": "Does industry ticker update automatically?",
    "answer": "industry ticker updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Industry rankings",
    "question": "Can users analyze rank badge from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Industry rankings",
    "question": "Does rank badge update automatically?",
    "answer": "rank badge updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Industry rankings",
    "question": "Can users review industry description from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Industry rankings",
    "question": "Does industry description update automatically?",
    "answer": "industry description updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Industry rankings",
    "question": "Can users select industry cache from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Industry rankings",
    "question": "Does industry cache update automatically?",
    "answer": "industry cache updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Industry rankings",
    "question": "Can users interpret leaders from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Industry rankings",
    "question": "Does leaders update automatically?",
    "answer": "leaders updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "News sentiment",
    "question": "What is News Sentiment?",
    "answer": "News Sentiment scores and summarizes recent company news so users can see whether recent headlines look positive, neutral, or negative."
  },
  {
    "category": "News sentiment",
    "question": "How long is news sentiment cached?",
    "answer": "News Sentiment is cached for about 7 days."
  },
  {
    "category": "News sentiment",
    "question": "Does news sentiment decide the whole Eval Score?",
    "answer": "No. It is one category inside the overall score, not the entire rating."
  },
  {
    "category": "News sentiment",
    "question": "How do I read news sentiment in Eval?",
    "answer": "In Eval, news sentiment is handled inside the News sentiment area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "News sentiment",
    "question": "What does news sentiment mean in Eval?",
    "answer": "news sentiment is part of the News sentiment experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "News sentiment",
    "question": "Why is news sentiment important?",
    "answer": "news sentiment helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "News sentiment",
    "question": "Can Eval AI explain news sentiment?",
    "answer": "Yes. Eval AI can explain news sentiment when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "News sentiment",
    "question": "What should I do if news sentiment looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "News sentiment",
    "question": "How do I read article cards in Eval?",
    "answer": "In Eval, article cards is handled inside the News sentiment area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "News sentiment",
    "question": "What does article cards mean in Eval?",
    "answer": "article cards is part of the News sentiment experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "News sentiment",
    "question": "Why is article cards important?",
    "answer": "article cards helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "News sentiment",
    "question": "Can Eval AI explain article cards?",
    "answer": "Yes. Eval AI can explain article cards when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "News sentiment",
    "question": "What should I do if article cards looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "News sentiment",
    "question": "How do I read headline scoring in Eval?",
    "answer": "In Eval, headline scoring is handled inside the News sentiment area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "News sentiment",
    "question": "What does headline scoring mean in Eval?",
    "answer": "headline scoring is part of the News sentiment experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "News sentiment",
    "question": "Why is headline scoring important?",
    "answer": "headline scoring helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "News sentiment",
    "question": "Can Eval AI explain headline scoring?",
    "answer": "Yes. Eval AI can explain headline scoring when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "News sentiment",
    "question": "What should I do if headline scoring looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "News sentiment",
    "question": "How do I read OpenAI summary in Eval?",
    "answer": "In Eval, OpenAI summary is handled inside the News sentiment area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "News sentiment",
    "question": "What does OpenAI summary mean in Eval?",
    "answer": "OpenAI summary is part of the News sentiment experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "News sentiment",
    "question": "Why is OpenAI summary important?",
    "answer": "OpenAI summary helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "News sentiment",
    "question": "Can Eval AI explain OpenAI summary?",
    "answer": "Yes. Eval AI can explain OpenAI summary when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "News sentiment",
    "question": "What should I do if OpenAI summary looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "News sentiment",
    "question": "How do I read Finnhub news in Eval?",
    "answer": "In Eval, Finnhub news is handled inside the News sentiment area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "News sentiment",
    "question": "What does Finnhub news mean in Eval?",
    "answer": "Finnhub news is part of the News sentiment experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "News sentiment",
    "question": "Why is Finnhub news important?",
    "answer": "Finnhub news helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "News sentiment",
    "question": "Can Eval AI explain Finnhub news?",
    "answer": "Yes. Eval AI can explain Finnhub news when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "News sentiment",
    "question": "What should I do if Finnhub news looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "News sentiment",
    "question": "How do I read sentiment cache in Eval?",
    "answer": "In Eval, sentiment cache is handled inside the News sentiment area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "News sentiment",
    "question": "What does sentiment cache mean in Eval?",
    "answer": "sentiment cache is part of the News sentiment experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "News sentiment",
    "question": "Why is sentiment cache important?",
    "answer": "sentiment cache helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "News sentiment",
    "question": "Can Eval AI explain sentiment cache?",
    "answer": "Yes. Eval AI can explain sentiment cache when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "News sentiment",
    "question": "What should I do if sentiment cache looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "News sentiment",
    "question": "How do I read news topics in Eval?",
    "answer": "In Eval, news topics is handled inside the News sentiment area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "News sentiment",
    "question": "What does news topics mean in Eval?",
    "answer": "news topics is part of the News sentiment experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "News sentiment",
    "question": "Why is news topics important?",
    "answer": "news topics helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "News sentiment",
    "question": "Can Eval AI explain news topics?",
    "answer": "Yes. Eval AI can explain news topics when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "News sentiment",
    "question": "What should I do if news topics looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "News sentiment",
    "question": "How do I read impact weight in Eval?",
    "answer": "In Eval, impact weight is handled inside the News sentiment area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "News sentiment",
    "question": "What does impact weight mean in Eval?",
    "answer": "impact weight is part of the News sentiment experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "News sentiment",
    "question": "Why is impact weight important?",
    "answer": "impact weight helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "News sentiment",
    "question": "Can Eval AI explain impact weight?",
    "answer": "Yes. Eval AI can explain impact weight when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "News sentiment",
    "question": "What should I do if impact weight looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "News sentiment",
    "question": "How do I read positive news in Eval?",
    "answer": "In Eval, positive news is handled inside the News sentiment area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "News sentiment",
    "question": "What does positive news mean in Eval?",
    "answer": "positive news is part of the News sentiment experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "News sentiment",
    "question": "Why is positive news important?",
    "answer": "positive news helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "News sentiment",
    "question": "Can Eval AI explain positive news?",
    "answer": "Yes. Eval AI can explain positive news when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "News sentiment",
    "question": "What should I do if positive news looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "News sentiment",
    "question": "How do I read negative news in Eval?",
    "answer": "In Eval, negative news is handled inside the News sentiment area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "News sentiment",
    "question": "What does negative news mean in Eval?",
    "answer": "negative news is part of the News sentiment experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "News sentiment",
    "question": "Why is negative news important?",
    "answer": "negative news helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "News sentiment",
    "question": "Can Eval AI explain negative news?",
    "answer": "Yes. Eval AI can explain negative news when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "News sentiment",
    "question": "What should I do if negative news looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "News sentiment",
    "question": "Can users read news sentiment from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "News sentiment",
    "question": "Does news sentiment update automatically?",
    "answer": "news sentiment updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "News sentiment",
    "question": "Can users score article cards from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "News sentiment",
    "question": "Does article cards update automatically?",
    "answer": "article cards updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "News sentiment",
    "question": "Can users summarize headline scoring from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "News sentiment",
    "question": "Does headline scoring update automatically?",
    "answer": "headline scoring updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "News sentiment",
    "question": "Can users explain OpenAI summary from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "News sentiment",
    "question": "Does OpenAI summary update automatically?",
    "answer": "OpenAI summary updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "News sentiment",
    "question": "Can users refresh Finnhub news from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "News sentiment",
    "question": "Does Finnhub news update automatically?",
    "answer": "Finnhub news updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "News sentiment",
    "question": "Can users interpret sentiment cache from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "News sentiment",
    "question": "Does sentiment cache update automatically?",
    "answer": "sentiment cache updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "News sentiment",
    "question": "Can users open news topics from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "News sentiment",
    "question": "Does news topics update automatically?",
    "answer": "news topics updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "News sentiment",
    "question": "Can users compare impact weight from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "News sentiment",
    "question": "Does impact weight update automatically?",
    "answer": "impact weight updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "News sentiment",
    "question": "Can users review positive news from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "News sentiment",
    "question": "Does positive news update automatically?",
    "answer": "positive news updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "News sentiment",
    "question": "Can users understand negative news from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "News sentiment",
    "question": "Does negative news update automatically?",
    "answer": "negative news updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Eval AI",
    "question": "What can Eval AI answer?",
    "answer": "Eval AI can answer app support questions, FAQ-style questions, navigation help, metric explanations, and stock questions tied to the current dashboard or watchlist."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI answer anything?",
    "answer": "No. It is focused on Eval app support and loaded/watchlist stock information."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI understand FAQs?",
    "answer": "Yes. Eval AI is instructed with the FAQ knowledge base topics so it can answer FAQ-style support questions directly."
  },
  {
    "category": "Eval AI",
    "question": "How do I answer support agent in Eval?",
    "answer": "In Eval, support agent is handled inside the Eval AI area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Eval AI",
    "question": "What does support agent mean in Eval?",
    "answer": "support agent is part of the Eval AI experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Eval AI",
    "question": "Why is support agent important?",
    "answer": "support agent helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI explain support agent?",
    "answer": "Yes. Eval AI can explain support agent when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Eval AI",
    "question": "What should I do if support agent looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Eval AI",
    "question": "How do I answer navigation help in Eval?",
    "answer": "In Eval, navigation help is handled inside the Eval AI area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Eval AI",
    "question": "What does navigation help mean in Eval?",
    "answer": "navigation help is part of the Eval AI experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Eval AI",
    "question": "Why is navigation help important?",
    "answer": "navigation help helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI explain navigation help?",
    "answer": "Yes. Eval AI can explain navigation help when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Eval AI",
    "question": "What should I do if navigation help looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Eval AI",
    "question": "How do I answer FAQ answers in Eval?",
    "answer": "In Eval, FAQ answers is handled inside the Eval AI area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Eval AI",
    "question": "What does FAQ answers mean in Eval?",
    "answer": "FAQ answers is part of the Eval AI experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Eval AI",
    "question": "Why is FAQ answers important?",
    "answer": "FAQ answers helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI explain FAQ answers?",
    "answer": "Yes. Eval AI can explain FAQ answers when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Eval AI",
    "question": "What should I do if FAQ answers looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Eval AI",
    "question": "How do I answer dashboard help in Eval?",
    "answer": "In Eval, dashboard help is handled inside the Eval AI area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Eval AI",
    "question": "What does dashboard help mean in Eval?",
    "answer": "dashboard help is part of the Eval AI experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Eval AI",
    "question": "Why is dashboard help important?",
    "answer": "dashboard help helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI explain dashboard help?",
    "answer": "Yes. Eval AI can explain dashboard help when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Eval AI",
    "question": "What should I do if dashboard help looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Eval AI",
    "question": "How do I answer watchlist stock in Eval?",
    "answer": "In Eval, watchlist stock is handled inside the Eval AI area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Eval AI",
    "question": "What does watchlist stock mean in Eval?",
    "answer": "watchlist stock is part of the Eval AI experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Eval AI",
    "question": "Why is watchlist stock important?",
    "answer": "watchlist stock helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI explain watchlist stock?",
    "answer": "Yes. Eval AI can explain watchlist stock when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Eval AI",
    "question": "What should I do if watchlist stock looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Eval AI",
    "question": "How do I answer specific ticker in Eval?",
    "answer": "In Eval, specific ticker is handled inside the Eval AI area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Eval AI",
    "question": "What does specific ticker mean in Eval?",
    "answer": "specific ticker is part of the Eval AI experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Eval AI",
    "question": "Why is specific ticker important?",
    "answer": "specific ticker helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI explain specific ticker?",
    "answer": "Yes. Eval AI can explain specific ticker when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Eval AI",
    "question": "What should I do if specific ticker looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Eval AI",
    "question": "How do I answer app support in Eval?",
    "answer": "In Eval, app support is handled inside the Eval AI area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Eval AI",
    "question": "What does app support mean in Eval?",
    "answer": "app support is part of the Eval AI experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Eval AI",
    "question": "Why is app support important?",
    "answer": "app support helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI explain app support?",
    "answer": "Yes. Eval AI can explain app support when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Eval AI",
    "question": "What should I do if app support looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Eval AI",
    "question": "How do I answer metrics explanation in Eval?",
    "answer": "In Eval, metrics explanation is handled inside the Eval AI area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Eval AI",
    "question": "What does metrics explanation mean in Eval?",
    "answer": "metrics explanation is part of the Eval AI experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Eval AI",
    "question": "Why is metrics explanation important?",
    "answer": "metrics explanation helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI explain metrics explanation?",
    "answer": "Yes. Eval AI can explain metrics explanation when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Eval AI",
    "question": "What should I do if metrics explanation looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Eval AI",
    "question": "How do I answer compare help in Eval?",
    "answer": "In Eval, compare help is handled inside the Eval AI area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Eval AI",
    "question": "What does compare help mean in Eval?",
    "answer": "compare help is part of the Eval AI experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Eval AI",
    "question": "Why is compare help important?",
    "answer": "compare help helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI explain compare help?",
    "answer": "Yes. Eval AI can explain compare help when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Eval AI",
    "question": "What should I do if compare help looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Eval AI",
    "question": "How do I answer industry help in Eval?",
    "answer": "In Eval, industry help is handled inside the Eval AI area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Eval AI",
    "question": "What does industry help mean in Eval?",
    "answer": "industry help is part of the Eval AI experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Eval AI",
    "question": "Why is industry help important?",
    "answer": "industry help helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI explain industry help?",
    "answer": "Yes. Eval AI can explain industry help when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Eval AI",
    "question": "What should I do if industry help looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Eval AI",
    "question": "Can users answer support agent from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Eval AI",
    "question": "Does support agent update automatically?",
    "answer": "support agent updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Eval AI",
    "question": "Can users explain navigation help from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Eval AI",
    "question": "Does navigation help update automatically?",
    "answer": "navigation help updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Eval AI",
    "question": "Can users support FAQ answers from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Eval AI",
    "question": "Does FAQ answers update automatically?",
    "answer": "FAQ answers updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Eval AI",
    "question": "Can users guide dashboard help from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Eval AI",
    "question": "Does dashboard help update automatically?",
    "answer": "dashboard help updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Eval AI",
    "question": "Can users understand watchlist stock from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Eval AI",
    "question": "Does watchlist stock update automatically?",
    "answer": "watchlist stock updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Eval AI",
    "question": "Can users use specific ticker from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Eval AI",
    "question": "Does specific ticker update automatically?",
    "answer": "specific ticker updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Eval AI",
    "question": "Can users navigate app support from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Eval AI",
    "question": "Does app support update automatically?",
    "answer": "app support updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Eval AI",
    "question": "Can users teach metrics explanation from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Eval AI",
    "question": "Does metrics explanation update automatically?",
    "answer": "metrics explanation updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Eval AI",
    "question": "Can users summarize compare help from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Eval AI",
    "question": "Does compare help update automatically?",
    "answer": "compare help updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Eval AI",
    "question": "Can users clarify industry help from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Eval AI",
    "question": "Does industry help update automatically?",
    "answer": "industry help updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Account",
    "question": "Why do I need to sign in?",
    "answer": "Signing in protects dashboard access and lets user-specific features like watchlist/profile behavior work properly."
  },
  {
    "category": "Account",
    "question": "What handles sign-in?",
    "answer": "Eval uses Clerk for sign-in, verification, account sessions, and profile popups."
  },
  {
    "category": "Account",
    "question": "Where do I find account help?",
    "answer": "Use the Contact page, FAQs, or Eval AI Assistant for app support guidance."
  },
  {
    "category": "Account",
    "question": "How do I sign in sign in in Eval?",
    "answer": "In Eval, sign in is handled inside the Account area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Account",
    "question": "What does sign in mean in Eval?",
    "answer": "sign in is part of the Account experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Account",
    "question": "Why is sign in important?",
    "answer": "sign in helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Account",
    "question": "Can Eval AI explain sign in?",
    "answer": "Yes. Eval AI can explain sign in when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Account",
    "question": "What should I do if sign in looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Account",
    "question": "How do I sign in Clerk in Eval?",
    "answer": "In Eval, Clerk is handled inside the Account area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Account",
    "question": "What does Clerk mean in Eval?",
    "answer": "Clerk is part of the Account experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Account",
    "question": "Why is Clerk important?",
    "answer": "Clerk helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Account",
    "question": "Can Eval AI explain Clerk?",
    "answer": "Yes. Eval AI can explain Clerk when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Account",
    "question": "What should I do if Clerk looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Account",
    "question": "How do I sign in profile in Eval?",
    "answer": "In Eval, profile is handled inside the Account area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Account",
    "question": "What does profile mean in Eval?",
    "answer": "profile is part of the Account experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Account",
    "question": "Why is profile important?",
    "answer": "profile helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Account",
    "question": "Can Eval AI explain profile?",
    "answer": "Yes. Eval AI can explain profile when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Account",
    "question": "What should I do if profile looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Account",
    "question": "How do I sign in verification code in Eval?",
    "answer": "In Eval, verification code is handled inside the Account area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Account",
    "question": "What does verification code mean in Eval?",
    "answer": "verification code is part of the Account experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Account",
    "question": "Why is verification code important?",
    "answer": "verification code helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Account",
    "question": "Can Eval AI explain verification code?",
    "answer": "Yes. Eval AI can explain verification code when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Account",
    "question": "What should I do if verification code looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Account",
    "question": "How do I sign in terms acceptance in Eval?",
    "answer": "In Eval, terms acceptance is handled inside the Account area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Account",
    "question": "What does terms acceptance mean in Eval?",
    "answer": "terms acceptance is part of the Account experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Account",
    "question": "Why is terms acceptance important?",
    "answer": "terms acceptance helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Account",
    "question": "Can Eval AI explain terms acceptance?",
    "answer": "Yes. Eval AI can explain terms acceptance when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Account",
    "question": "What should I do if terms acceptance looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Account",
    "question": "How do I sign in user account in Eval?",
    "answer": "In Eval, user account is handled inside the Account area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Account",
    "question": "What does user account mean in Eval?",
    "answer": "user account is part of the Account experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Account",
    "question": "Why is user account important?",
    "answer": "user account helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Account",
    "question": "Can Eval AI explain user account?",
    "answer": "Yes. Eval AI can explain user account when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Account",
    "question": "What should I do if user account looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Account",
    "question": "How do I sign in session in Eval?",
    "answer": "In Eval, session is handled inside the Account area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Account",
    "question": "What does session mean in Eval?",
    "answer": "session is part of the Account experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Account",
    "question": "Why is session important?",
    "answer": "session helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Account",
    "question": "Can Eval AI explain session?",
    "answer": "Yes. Eval AI can explain session when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Account",
    "question": "What should I do if session looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Account",
    "question": "How do I sign in profile popup in Eval?",
    "answer": "In Eval, profile popup is handled inside the Account area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Account",
    "question": "What does profile popup mean in Eval?",
    "answer": "profile popup is part of the Account experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Account",
    "question": "Why is profile popup important?",
    "answer": "profile popup helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Account",
    "question": "Can Eval AI explain profile popup?",
    "answer": "Yes. Eval AI can explain profile popup when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Account",
    "question": "What should I do if profile popup looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Account",
    "question": "How do I sign in logout in Eval?",
    "answer": "In Eval, logout is handled inside the Account area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Account",
    "question": "What does logout mean in Eval?",
    "answer": "logout is part of the Account experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Account",
    "question": "Why is logout important?",
    "answer": "logout helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Account",
    "question": "Can Eval AI explain logout?",
    "answer": "Yes. Eval AI can explain logout when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Account",
    "question": "What should I do if logout looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Account",
    "question": "How do I sign in account support in Eval?",
    "answer": "In Eval, account support is handled inside the Account area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Account",
    "question": "What does account support mean in Eval?",
    "answer": "account support is part of the Account experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Account",
    "question": "Why is account support important?",
    "answer": "account support helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Account",
    "question": "Can Eval AI explain account support?",
    "answer": "Yes. Eval AI can explain account support when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Account",
    "question": "What should I do if account support looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Account",
    "question": "Can users sign in sign in from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Account",
    "question": "Does sign in update automatically?",
    "answer": "sign in updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Account",
    "question": "Can users verify Clerk from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Account",
    "question": "Does Clerk update automatically?",
    "answer": "Clerk updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Account",
    "question": "Can users open profile from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Account",
    "question": "Does profile update automatically?",
    "answer": "profile updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Account",
    "question": "Can users manage verification code from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Account",
    "question": "Does verification code update automatically?",
    "answer": "verification code updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Account",
    "question": "Can users accept terms acceptance from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Account",
    "question": "Does terms acceptance update automatically?",
    "answer": "terms acceptance updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Account",
    "question": "Can users close user account from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Account",
    "question": "Does user account update automatically?",
    "answer": "user account updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Account",
    "question": "Can users reset session from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Account",
    "question": "Does session update automatically?",
    "answer": "session updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Account",
    "question": "Can users use profile popup from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Account",
    "question": "Does profile popup update automatically?",
    "answer": "profile popup updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Account",
    "question": "Can users access logout from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Account",
    "question": "Does logout update automatically?",
    "answer": "logout updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Account",
    "question": "Can users protect account support from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Account",
    "question": "Does account support update automatically?",
    "answer": "account support updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Troubleshooting",
    "question": "Why does a metric show N/A?",
    "answer": "A metric shows N/A when the required data is missing, unavailable, or skipped instead of being incorrectly scored as zero."
  },
  {
    "category": "Troubleshooting",
    "question": "What happens if an API fails?",
    "answer": "Eval tries provider fallbacks, cached category data, and the last valid report instead of creating a fake bad score."
  },
  {
    "category": "Troubleshooting",
    "question": "Why does a chart say data is loading?",
    "answer": "The chart may still be waiting for category data or cached analysis to become available."
  },
  {
    "category": "Troubleshooting",
    "question": "How do I fix N/A metric in Eval?",
    "answer": "In Eval, N/A metric is handled inside the Troubleshooting area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Troubleshooting",
    "question": "What does N/A metric mean in Eval?",
    "answer": "N/A metric is part of the Troubleshooting experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Troubleshooting",
    "question": "Why is N/A metric important?",
    "answer": "N/A metric helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Troubleshooting",
    "question": "Can Eval AI explain N/A metric?",
    "answer": "Yes. Eval AI can explain N/A metric when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Troubleshooting",
    "question": "What should I do if N/A metric looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Troubleshooting",
    "question": "How do I fix rate limit in Eval?",
    "answer": "In Eval, rate limit is handled inside the Troubleshooting area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Troubleshooting",
    "question": "What does rate limit mean in Eval?",
    "answer": "rate limit is part of the Troubleshooting experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Troubleshooting",
    "question": "Why is rate limit important?",
    "answer": "rate limit helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Troubleshooting",
    "question": "Can Eval AI explain rate limit?",
    "answer": "Yes. Eval AI can explain rate limit when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Troubleshooting",
    "question": "What should I do if rate limit looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Troubleshooting",
    "question": "How do I fix cached report in Eval?",
    "answer": "In Eval, cached report is handled inside the Troubleshooting area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Troubleshooting",
    "question": "What does cached report mean in Eval?",
    "answer": "cached report is part of the Troubleshooting experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Troubleshooting",
    "question": "Why is cached report important?",
    "answer": "cached report helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Troubleshooting",
    "question": "Can Eval AI explain cached report?",
    "answer": "Yes. Eval AI can explain cached report when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Troubleshooting",
    "question": "What should I do if cached report looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Troubleshooting",
    "question": "How do I fix last valid report in Eval?",
    "answer": "In Eval, last valid report is handled inside the Troubleshooting area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Troubleshooting",
    "question": "What does last valid report mean in Eval?",
    "answer": "last valid report is part of the Troubleshooting experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Troubleshooting",
    "question": "Why is last valid report important?",
    "answer": "last valid report helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Troubleshooting",
    "question": "Can Eval AI explain last valid report?",
    "answer": "Yes. Eval AI can explain last valid report when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Troubleshooting",
    "question": "What should I do if last valid report looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Troubleshooting",
    "question": "How do I fix blank chart in Eval?",
    "answer": "In Eval, blank chart is handled inside the Troubleshooting area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Troubleshooting",
    "question": "What does blank chart mean in Eval?",
    "answer": "blank chart is part of the Troubleshooting experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Troubleshooting",
    "question": "Why is blank chart important?",
    "answer": "blank chart helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Troubleshooting",
    "question": "Can Eval AI explain blank chart?",
    "answer": "Yes. Eval AI can explain blank chart when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Troubleshooting",
    "question": "What should I do if blank chart looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Troubleshooting",
    "question": "How do I fix ticker not found in Eval?",
    "answer": "In Eval, ticker not found is handled inside the Troubleshooting area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Troubleshooting",
    "question": "What does ticker not found mean in Eval?",
    "answer": "ticker not found is part of the Troubleshooting experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Troubleshooting",
    "question": "Why is ticker not found important?",
    "answer": "ticker not found helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Troubleshooting",
    "question": "Can Eval AI explain ticker not found?",
    "answer": "Yes. Eval AI can explain ticker not found when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Troubleshooting",
    "question": "What should I do if ticker not found looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Troubleshooting",
    "question": "How do I fix provider failure in Eval?",
    "answer": "In Eval, provider failure is handled inside the Troubleshooting area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Troubleshooting",
    "question": "What does provider failure mean in Eval?",
    "answer": "provider failure is part of the Troubleshooting experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Troubleshooting",
    "question": "Why is provider failure important?",
    "answer": "provider failure helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Troubleshooting",
    "question": "Can Eval AI explain provider failure?",
    "answer": "Yes. Eval AI can explain provider failure when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Troubleshooting",
    "question": "What should I do if provider failure looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Troubleshooting",
    "question": "How do I fix partial data in Eval?",
    "answer": "In Eval, partial data is handled inside the Troubleshooting area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Troubleshooting",
    "question": "What does partial data mean in Eval?",
    "answer": "partial data is part of the Troubleshooting experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Troubleshooting",
    "question": "Why is partial data important?",
    "answer": "partial data helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Troubleshooting",
    "question": "Can Eval AI explain partial data?",
    "answer": "Yes. Eval AI can explain partial data when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Troubleshooting",
    "question": "What should I do if partial data looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Troubleshooting",
    "question": "How do I fix Render restart in Eval?",
    "answer": "In Eval, Render restart is handled inside the Troubleshooting area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Troubleshooting",
    "question": "What does Render restart mean in Eval?",
    "answer": "Render restart is part of the Troubleshooting experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Troubleshooting",
    "question": "Why is Render restart important?",
    "answer": "Render restart helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Troubleshooting",
    "question": "Can Eval AI explain Render restart?",
    "answer": "Yes. Eval AI can explain Render restart when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Troubleshooting",
    "question": "What should I do if Render restart looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Troubleshooting",
    "question": "How do I fix API key in Eval?",
    "answer": "In Eval, API key is handled inside the Troubleshooting area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Troubleshooting",
    "question": "What does API key mean in Eval?",
    "answer": "API key is part of the Troubleshooting experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Troubleshooting",
    "question": "Why is API key important?",
    "answer": "API key helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Troubleshooting",
    "question": "Can Eval AI explain API key?",
    "answer": "Yes. Eval AI can explain API key when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Troubleshooting",
    "question": "What should I do if API key looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Troubleshooting",
    "question": "Can users fix N/A metric from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Troubleshooting",
    "question": "Does N/A metric update automatically?",
    "answer": "N/A metric updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Troubleshooting",
    "question": "Can users understand rate limit from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Troubleshooting",
    "question": "Does rate limit update automatically?",
    "answer": "rate limit updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Troubleshooting",
    "question": "Can users check cached report from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Troubleshooting",
    "question": "Does cached report update automatically?",
    "answer": "cached report updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Troubleshooting",
    "question": "Can users reload last valid report from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Troubleshooting",
    "question": "Does last valid report update automatically?",
    "answer": "last valid report updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Troubleshooting",
    "question": "Can users refresh blank chart from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Troubleshooting",
    "question": "Does blank chart update automatically?",
    "answer": "blank chart updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Troubleshooting",
    "question": "Can users explain ticker not found from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Troubleshooting",
    "question": "Does ticker not found update automatically?",
    "answer": "ticker not found updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Troubleshooting",
    "question": "Can users recover provider failure from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Troubleshooting",
    "question": "Does provider failure update automatically?",
    "answer": "provider failure updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Troubleshooting",
    "question": "Can users troubleshoot partial data from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Troubleshooting",
    "question": "Does partial data update automatically?",
    "answer": "partial data updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Troubleshooting",
    "question": "Can users diagnose Render restart from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Troubleshooting",
    "question": "Does Render restart update automatically?",
    "answer": "Render restart updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Troubleshooting",
    "question": "Can users report API key from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Troubleshooting",
    "question": "Does API key update automatically?",
    "answer": "API key updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Caching and data sources",
    "question": "How is data cached?",
    "answer": "Eval caches different data sections on different schedules so it avoids unnecessary API calls and keeps scores stable."
  },
  {
    "category": "Caching and data sources",
    "question": "What uses Massive?",
    "answer": "Massive is used for price, historical returns, momentum, pullback, and 52-week market data."
  },
  {
    "category": "Caching and data sources",
    "question": "What uses FMP?",
    "answer": "FMP is used lightly for key financial metrics, ratios, growth, profitability, financial health, and valuation inputs."
  },
  {
    "category": "Caching and data sources",
    "question": "What uses Finnhub?",
    "answer": "Finnhub is used for profile/news and fallback metrics when another source is missing."
  },
  {
    "category": "Caching and data sources",
    "question": "What uses the ticker universe?",
    "answer": "Ticker search uses the built-in ticker universe so it does not use FMP just to search company names."
  },
  {
    "category": "Caching and data sources",
    "question": "How do I cache component cache in Eval?",
    "answer": "In Eval, component cache is handled inside the Caching and data sources area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Caching and data sources",
    "question": "What does component cache mean in Eval?",
    "answer": "component cache is part of the Caching and data sources experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Caching and data sources",
    "question": "Why is component cache important?",
    "answer": "component cache helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Caching and data sources",
    "question": "Can Eval AI explain component cache?",
    "answer": "Yes. Eval AI can explain component cache when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Caching and data sources",
    "question": "What should I do if component cache looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Caching and data sources",
    "question": "How do I cache FMP in Eval?",
    "answer": "In Eval, FMP is handled inside the Caching and data sources area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Caching and data sources",
    "question": "What does FMP mean in Eval?",
    "answer": "FMP is part of the Caching and data sources experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Caching and data sources",
    "question": "Why is FMP important?",
    "answer": "FMP helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Caching and data sources",
    "question": "Can Eval AI explain FMP?",
    "answer": "Yes. Eval AI can explain FMP when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Caching and data sources",
    "question": "What should I do if FMP looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Caching and data sources",
    "question": "How do I cache Massive in Eval?",
    "answer": "In Eval, Massive is handled inside the Caching and data sources area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Caching and data sources",
    "question": "What does Massive mean in Eval?",
    "answer": "Massive is part of the Caching and data sources experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Caching and data sources",
    "question": "Why is Massive important?",
    "answer": "Massive helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Caching and data sources",
    "question": "Can Eval AI explain Massive?",
    "answer": "Yes. Eval AI can explain Massive when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Caching and data sources",
    "question": "What should I do if Massive looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Caching and data sources",
    "question": "How do I cache Finnhub in Eval?",
    "answer": "In Eval, Finnhub is handled inside the Caching and data sources area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Caching and data sources",
    "question": "What does Finnhub mean in Eval?",
    "answer": "Finnhub is part of the Caching and data sources experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Caching and data sources",
    "question": "Why is Finnhub important?",
    "answer": "Finnhub helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Caching and data sources",
    "question": "Can Eval AI explain Finnhub?",
    "answer": "Yes. Eval AI can explain Finnhub when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Caching and data sources",
    "question": "What should I do if Finnhub looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Caching and data sources",
    "question": "How do I cache StockAnalysis lookup in Eval?",
    "answer": "In Eval, StockAnalysis lookup is handled inside the Caching and data sources area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Caching and data sources",
    "question": "What does StockAnalysis lookup mean in Eval?",
    "answer": "StockAnalysis lookup is part of the Caching and data sources experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Caching and data sources",
    "question": "Why is StockAnalysis lookup important?",
    "answer": "StockAnalysis lookup helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  }
];

function FaqPage({ onBack, onHome, onTerms, onSupport }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", ...Array.from(new Set(EVAL_FAQS.map((item) => item.category)))];

  const normalized = query.trim().toLowerCase();

  const filteredFaqs = EVAL_FAQS.filter((item) => {
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    const haystack = `${item.category} ${item.question} ${item.answer}`.toLowerCase();
    const matchesQuery = !normalized || haystack.includes(normalized);
    return matchesCategory && matchesQuery;
  });

  const shownFaqs = normalized ? filteredFaqs : filteredFaqs.slice(0, 36);

  return (
    <main className="faq-page">
      <section className="faq-shell">
        <div className="faq-topbar">
          <button className="back-btn" type="button" onClick={onBack}>
            <ArrowLeft size={18} /> Dashboard
          </button>

          <div className="faq-mini-nav">
            <button type="button" onClick={onHome}>
              Homepage
            </button>
            <button type="button" onClick={onTerms}>
              Terms & Conditions
            </button>
            <button type="button" onClick={onSupport}>
              Contact
            </button>
          </div>
        </div>

        <div className="faq-hero">
          <div className="section-title">
            <HelpCircle size={17} /> FAQs
          </div>
          <h1>Eval help center</h1>
          <p>
            Search roughly 1,000 support questions about the dashboard, score rings, metrics, watchlist, compare,
            industry rankings, news sentiment, ticker search, caching, data sources, Eval AI, and account basics.
          </p>
        </div>

        <div className="faq-search-card">
          <label htmlFor="faq-search">Search FAQs</label>
          <input
            id="faq-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Start typing: watchlist, compare, risk, news sentiment..."
            autoComplete="off"
          />
          <span>{filteredFaqs.length} result{filteredFaqs.length === 1 ? "" : "s"}</span>
        </div>

        <div className="faq-category-row">
          {categories.map((category) => (
            <button
              type="button"
              key={category}
              className={activeCategory === category ? "active" : ""}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {shownFaqs.length ? (
          <div className="faq-grid">
            {shownFaqs.map((item) => (
              <details className="faq-card" key={`${item.category}-${item.question}`}>
                <summary>
                  <span>{item.category}</span>
                  <strong>{item.question}</strong>
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        ) : (
          <div className="faq-empty">
            <HelpCircle size={30} />
            <h3>No FAQ matches that search yet</h3>
            <p>Try a shorter word like “score,” “watchlist,” “compare,” “risk,” or “news.”</p>
          </div>
        )}

        {!normalized && filteredFaqs.length > shownFaqs.length && (
          <p className="faq-search-hint">
            Type in the search box to instantly search the full FAQ library.
          </p>
        )}
      </section>
    </main>
  );
}

function SupportContactPage({ onBack, onHome, onTerms }) {
  return (
    <main className="support-page">
      <div className="support-orb support-orb-one" />
      <div className="support-orb support-orb-two" />

      <section className="support-shell">
        <div className="support-topbar">
          <button className="back-btn" type="button" onClick={onBack}>
            <ArrowLeft size={18} /> Dashboard
          </button>

          <div className="support-mini-nav">
            <button type="button" onClick={onHome}>
              <Home size={15} /> Homepage
            </button>
            <button type="button" onClick={onTerms}>
              <Scale size={15} /> Terms & Conditions
            </button>
          </div>
        </div>

        <div className="support-hero">
          <div>
            <div className="support-kicker">
              <MessageCircle size={16} /> Support & Contact
            </div>
            <h1>Need help with Eval?</h1>
            <p>
              Reach out with account questions, login issues, dashboard problems, billing
              questions, feature requests, or general feedback. Emails and direct messages are
              the fastest way to get a response because they are easier to track and answer clearly.
            </p>
          </div>

          <div className="support-contact-card">
            <span>Primary contact</span>
            <h2>Eval Support Team</h2>
            <a href="mailto:getstockeval@gmail.com">
              <Mail size={18} /> getstockeval@gmail.com
            </a>
          </div>
        </div>

        <div className="support-grid">
          <article className="support-card">
            <Mail size={22} />
            <h3>Best option: email</h3>
            <p>
              Email is the best way to explain what happened, include screenshots, and get a
              direct answer. Include your account email, ticker if relevant, and a short
              description of the issue.
            </p>
          </article>

          <article className="support-card">
            <MessageCircle size={22} />
            <h3>Direct messages are fastest</h3>
            <p>
              Direct messages are usually the quickest route for simple questions or urgent
              issues. If the problem needs more detail, you may be asked to follow up by email.
            </p>
          </article>

          <article className="support-card">
            <ShieldCheck size={22} />
            <h3>What to include</h3>
            <p>
              Send the email used for your Eval account, what page you were on, what button or
              ticker caused the issue, and any error message you saw. Do not send passwords.
            </p>
          </article>
        </div>

        <div className="support-note">
          Eval is an educational stock-analysis tool. Support can help with product access,
          account issues, and app problems, but cannot provide personalized financial advice.
        </div>
      </section>
    </main>
  );
}

function TermsPage({ onAgree, onBack, requireAgreement = true }) {
  const [checked, setChecked] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const canAgree = checked && confirmName.trim().toUpperCase() === "I AGREE";

  const sections = [
    {
      title: "1. Acceptance of these Terms",
      text: [
        "These Terms and Conditions govern your access to and use of Eval, including the website, dashboard, Eval Score, risk rating, watchlist, AI assistant, company summaries, key metrics, charts, explanations, paid plan pages, and any related content or features. By creating an account, signing in, clicking I Agree, or using Eval, you agree to these Terms.",
        "If you do not agree, do not use Eval. If you use Eval on behalf of a company, club, organization, partnership, or other entity, you represent that you have authority to bind that entity to these Terms."
      ],
    },
    {
      title: "2. Educational information only — no investment advice",
      text: [
        "Eval is an educational stock research and data-organization tool. Eval is not a registered investment adviser, financial adviser, broker-dealer, securities dealer, tax adviser, legal adviser, accountant, investment bank, portfolio manager, fiduciary, or trading platform.",
        "Nothing on Eval is personalized investment advice, financial advice, trading advice, tax advice, legal advice, accounting advice, a recommendation, an offer, a solicitation, or a promise to buy, sell, hold, short, trade, or otherwise transact in any security, ETF, option, cryptocurrency, futures contract, index, fund, financial product, or investment strategy.",
        "Eval does not consider your investment objectives, net worth, risk tolerance, income, debts, taxes, time horizon, portfolio, personal circumstances, or suitability. You are solely responsible for your own investment decisions and should consult a qualified licensed professional before making financial decisions."
      ],
    },
    {
      title: "3. No guarantees, no reliance, and market risk",
      text: [
        "Investing and trading involve risk, including loss of principal. Securities and markets can move quickly and unpredictably. Past performance, historical data, backtests, analyst opinions, valuation models, ratings, grades, metrics, scores, or AI-generated explanations do not guarantee future results.",
        "Eval Scores, risk ratings, grades, company summaries, pullback readings, momentum readings, valuation readings, and AI answers are simplified educational outputs. They may be incomplete, delayed, inaccurate, misinterpreted, unavailable, or inappropriate for your situation. Do not rely on Eval as the only basis for an investment decision.",
        "You agree that your use of Eval is at your own risk and that you are responsible for independently verifying all information before acting on it."
      ],
    },
    {
      title: "4. Data sources, calculations, and third-party information",
      text: [
        "Eval may use market data, company data, financial statements, ratios, profile information, news information, AI responses, and other data from third-party providers, public sources, APIs, company websites, and user inputs. Eval does not guarantee that data is accurate, complete, current, uninterrupted, or error-free.",
        "Financial metrics may be missing, stale, restated, estimated, calculated differently by different providers, or affected by stock splits, corporate actions, accounting methods, API limits, provider outages, caching, formatting issues, or data-entry errors.",
        "Eval may modify, remove, reorder, or change metrics, score weights, formulas, plans, features, explanations, provider integrations, or availability at any time without notice."
      ],
    },
    {
      title: "5. AI assistant and automated explanations",
      text: [
        "Eval may include AI-generated summaries, explanations, comparisons, interpretations, and answers. AI can be wrong, outdated, incomplete, overly confident, or misleading. AI responses are for educational use only and are not professional advice.",
        "You agree not to treat any AI output as a command, recommendation, guarantee, or substitute for your own research or a licensed professional. You should verify AI output with reliable independent sources before using it."
      ],
    },
    {
      title: "6. Accounts, security, and acceptable use",
      text: [
        "You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to provide accurate account information and to keep it updated.",
        "You may not scrape, copy, resell, overload, attack, reverse engineer, bypass authentication, bypass rate limits, interfere with security, use bots, create fake accounts, share accounts to avoid payment, or use Eval for unlawful, abusive, fraudulent, or harmful purposes.",
        "Eval may suspend, restrict, or terminate access at any time if misuse, suspicious activity, payment issues, legal risk, security risk, API abuse, or violation of these Terms is suspected."
      ],
    },
    {
      title: "7. Subscriptions, payments, and plan changes",
      text: [
        "Paid plans, pricing, features, limits, trials, and billing terms may change over time. Unless otherwise stated at checkout, subscription fees are billed in advance and may be recurring. You are responsible for reviewing the price, renewal period, and cancellation terms before purchasing.",
        "Eval may add, remove, or modify features included in free or paid plans. A feature described on a plan page may depend on third-party APIs, market data providers, AI providers, payment providers, or backend availability."
      ],
    },
    {
      title: "8. Intellectual property and license",
      text: [
        "Eval, including its design, interface, branding, scoring structure, explanations, code, layout, text, graphics, and features, is owned by Eval or its licensors and is protected by intellectual-property laws. You receive a limited, revocable, non-exclusive, non-transferable license to use Eval for personal, non-commercial educational research unless a separate written agreement says otherwise.",
        "You may not copy, modify, distribute, sell, sublicense, frame, mirror, or create derivative works from Eval without written permission."
      ],
    },
    {
      title: "9. User content and feedback",
      text: [
        "If you submit questions, ticker universes, feedback, suggestions, messages, or other content, you represent that you have the right to submit it and that it does not violate law or third-party rights. You grant Eval a license to use that content to operate, improve, secure, and support the service.",
        "Do not submit confidential, regulated, illegal, harmful, or sensitive information that you do not want processed by the service."
      ],
    },
    {
      title: "10. Privacy and communications",
      text: [
        "Eval may process account information, usage information, device information, authentication information, and submitted content to operate the service, improve features, prevent abuse, communicate with users, and comply with legal obligations. Third-party services such as authentication, hosting, analytics, payment, email, AI, market-data, and security providers may process information as needed to provide the service.",
        "By using Eval, you consent to receiving service-related emails such as account verification, password reset, security notices, plan notices, legal notices, and important product updates."
      ],
    },
    {
      title: "11. Third-party services and links",
      text: [
        "Eval may link to or integrate with third-party websites, APIs, data providers, payment providers, authentication providers, AI providers, company websites, brokers, or news sources. Eval does not control third-party services and is not responsible for their content, availability, accuracy, policies, fees, outages, or actions.",
        "Your use of third-party services may be governed by their own terms and privacy policies."
      ],
    },
    {
      title: "12. Disclaimers of warranties",
      text: [
        "Eval is provided on an AS IS and AS AVAILABLE basis. To the maximum extent permitted by law, Eval disclaims all warranties, express, implied, statutory, or otherwise, including warranties of accuracy, completeness, timeliness, merchantability, fitness for a particular purpose, title, non-infringement, availability, security, and uninterrupted operation.",
        "Eval does not warrant that the service will be error-free, secure, uninterrupted, profitable, accurate, compatible with your needs, or free from harmful components."
      ],
    },
    {
      title: "13. Limitation of liability",
      text: [
        "To the maximum extent permitted by law, Eval and its owners, operators, affiliates, contractors, providers, and licensors will not be liable for indirect, incidental, consequential, special, exemplary, punitive, lost-profit, lost-revenue, lost-data, trading-loss, investment-loss, business-interruption, reputational, or reliance damages, even if advised of the possibility of such damages.",
        "To the maximum extent permitted by law, Eval’s total liability for any claim arising out of or relating to the service or these Terms will not exceed the greater of the amount you paid to Eval for the service during the three months before the claim arose or one hundred U.S. dollars. Some jurisdictions do not allow certain limitations, so some limitations may not apply to you."
      ],
    },
    {
      title: "14. Indemnification",
      text: [
        "You agree to defend, indemnify, and hold harmless Eval and its owners, operators, affiliates, contractors, providers, and licensors from and against claims, damages, losses, liabilities, costs, and expenses, including reasonable attorneys’ fees, arising out of or related to your use of Eval, your investment decisions, your violation of these Terms, your violation of law, your user content, your misuse of data, or your infringement of rights."
      ],
    },
    {
      title: "15. Arbitration agreement and class-action waiver",
      text: [
        "PLEASE READ THIS SECTION CAREFULLY. To the maximum extent permitted by law, you and Eval agree that any dispute, claim, or controversy arising out of or relating to these Terms, Eval, your account, your subscription, your use of the service, data, scores, AI outputs, or any relationship between you and Eval will be resolved by binding individual arbitration rather than in court, except that either party may bring an individual claim in small-claims court if eligible.",
        "The arbitration will be conducted on an individual basis. You and Eval waive the right to a jury trial and waive the right to participate in a class action, class arbitration, consolidated action, representative action, private attorney general action, or any proceeding brought on behalf of other users or the general public. The arbitrator may award relief only to the individual party seeking relief and only to the extent necessary to resolve that individual party’s claim.",
        "Before starting arbitration, the party seeking relief must send written notice describing the dispute and requested relief. The parties will try in good faith to resolve the dispute informally for at least 30 days. If the dispute is not resolved, either party may start arbitration under the rules of a recognized arbitration provider selected by Eval unless applicable law requires otherwise.",
        "If any part of this arbitration or class-action waiver section is found unenforceable, the unenforceable part will be severed to the extent permitted by law, and the remaining terms will continue in effect. If the class-action waiver is found unenforceable for a claim, that claim must proceed in court and not in arbitration."
      ],
      important: true,
    },
    {
      title: "16. Governing law and venue",
      text: [
        "These Terms are governed by the laws of the State of Delaware, without regard to conflict-of-law principles, except to the extent federal law or mandatory local law applies. Subject to the arbitration section, any permitted court proceeding will be brought in state or federal courts located in Delaware, and you consent to personal jurisdiction and venue there."
      ],
    },
    {
      title: "17. Changes to Eval and these Terms",
      text: [
        "Eval may update these Terms from time to time. Material changes may be shown in the app, emailed, or posted on the website. Continued use of Eval after changes become effective means you accept the updated Terms. If you do not agree to the updated Terms, stop using Eval."
      ],
    },
    {
      title: "18. Contact and legal notices",
      text: [
        "Questions, support requests, or legal notices should be sent through the contact method provided by Eval. If no separate contact method is available, use the account email or support channel associated with the service."
      ],
    },
  ];

  return (
    <main className="terms-page">
      <div className="terms-orb terms-orb-one" />
      <div className="terms-orb terms-orb-two" />

      <section className="terms-shell">
        <div className="terms-hero">
          <div>
            <div className="terms-kicker">
              <Scale size={16} /> Required before entering Eval
            </div>
            <h1>Terms and Conditions</h1>
            <p>
              {requireAgreement
                ? "Review and accept these terms before using the dashboard. This page is designed for a stock-analysis education product, with extra focus on market-risk disclaimers, no-advice language, liability limits, and arbitration."
                : "Review the current Eval Terms and Conditions at any time from your dashboard."}
            </p>
          </div>

          <div className="terms-mini-card">
            <FileText size={23} />
            <span>Version</span>
            <strong>{TERMS_VERSION}</strong>
            <small>Educational use only. Not financial advice.</small>
          </div>
        </div>

        <div className="terms-alert">
          <AlertTriangle size={18} />
          <p>
            This template is not legal advice. Have an attorney review it before launch,
            especially the arbitration, privacy, subscription, and liability sections.
          </p>
        </div>

        <div className="terms-body">
          {sections.map((section) => (
            <article className={section.important ? "terms-section important" : "terms-section"} key={section.title}>
              <h2>{section.title}</h2>
              {section.text.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </article>
          ))}
        </div>

        {requireAgreement ? (
          <div className="terms-accept-panel">
            <div>
              <div className="terms-accept-title">
                <LockKeyhole size={17} /> Agreement required
              </div>
              <p>
                Check the box and type <b>I AGREE</b> to unlock the dashboard for this account.
                After this account accepts the current version, this step will not appear again
                unless the terms version changes or the browser data is cleared.
              </p>
            </div>

            <label className="terms-check-row">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              <span>
                I have read and agree to the Eval Terms and Conditions, including the
                no-investment-advice disclaimer, limitation of liability, arbitration agreement,
                and class-action waiver.
              </span>
            </label>

            <input
              className="terms-confirm-input"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Type I AGREE"
            />

            <button type="button" className="terms-agree-btn" disabled={!canAgree} onClick={onAgree}>
              Agree and enter dashboard <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <div className="terms-accept-panel terms-read-panel">
            <div>
              <div className="terms-accept-title">
                <CheckCircle2 size={17} /> Terms already accepted
              </div>
              <p>
                This account has already accepted the current terms version. You can review the
                terms here anytime and return to the dashboard when finished.
              </p>
            </div>

            <button type="button" className="terms-agree-btn" onClick={onBack}>
              Back to dashboard <ArrowRight size={18} />
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function Mag7DashboardPanel({ items, loading, onRefresh, onAnalyze }) {
  const ranked = [...items].sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  const leader = ranked[0];

  return (
    <aside className="mag7-panel">
      <div className="panel-head">
        <div>
          <h2>
            <Sparkles size={18} /> Mag 7
            <button
              type="button"
              className="mag7-help-btn"
              title="Mag 7 info"
              aria-label="Mag 7 info"
            >
              <HelpCircle size={14} />
              <span className="mag7-help-pop">
                The Mag 7 are Apple, Microsoft, Alphabet, Amazon, Nvidia, Meta, and Tesla. They are large mega-cap tech leaders and this panel ranks them by current Eval Score.
              </span>
            </button>
          </h2>
          <p>Magnificent 7 prebuilt Eval Score list</p>
        </div>

        <button
          className="icon-btn"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh Mag 7 scores"
        >
          <RefreshCw size={16} className={loading ? "spin" : ""} />
        </button>
      </div>

      <div className="mag7-list">
        {ranked.map((item, index) => (
          <button
            className={`mag7-row rank-$`}
            key={item.symbol}
            type="button"
            onClick={() => onAnalyze(item.symbol)}
          >
            <span className="mag7-rank"></span>
            <div className="mag7-main">
              <strong>{item.symbol}</strong>
              <div className="row-sw">
                <span>Strong: {item.strongest || "N/A"}</span>
                <span>Weak: {item.weakest || "N/A"}</span>
              </div>
            </div>

            <ScoreRingSvg
              value={item.score}
              className="watch-score-ring"
            />
          </button>
        ))}
      </div>

      <div className="mag7-summary">
        <span>Top stock read</span>
        <div>
          <b>Strongest</b>
          <strong>{leader?.strongest || "Refresh to load"}</strong>
        </div>
        <div>
          <b>Weakest</b>
          <strong>{leader?.weakest || "Refresh to load"}</strong>
        </div>
      </div>
    </aside>
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
  mobilePage = false,
  pageMode = false,
}) {
  const [manual, setManual] = useState("");

  return (
    <aside className={`watch-panel eval-watchlist-panel ${mobilePage || pageMode ? "mobile-watch-panel watchlist-page-panel" : ""}`}>
      <div className="panel-head">
        <div>
          <h2>
            <Star size={18} /> Watchlist
          </h2>
          <p>Max 15 stocks</p>
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
        <button
          disabled={items.length >= MAX_WATCHLIST_ITEMS && !items.some((item) => item.symbol === (manual || symbol).trim().toUpperCase())}
          title={items.length >= MAX_WATCHLIST_ITEMS ? "Watchlist limit reached" : "Add to watchlist"}
        >
          <Plus size={16} />
        </button>
      </form>

      <div className="watch-list">
        {items.length === 0 ? (
          <div className="watch-empty">
            Your watchlist is empty. Add a ticker above to start building your own list.
          </div>
        ) : (
          items.map((item) => (
            <div className="watch-row" key={item.symbol}>
              <span className="watch-rank-number" aria-hidden="true" />
              <button className="watch-info" onClick={() => onAnalyze(item.symbol)}>
                <strong>{item.symbol}</strong>
                <div className="row-sw watch-row-sw">
                  <span>Strong: {item.strongest || "N/A"}</span>
                  <span>Weak: {item.weakest || "N/A"}</span>
                </div>
              </button>

              <ScoreRingSvg
              value={item.score}
              className="watch-score-ring"
            />

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
  const plan = {
    name: "Eval Pro",
    price: "$9.99/mo",
    yearly: "$99.99/yr",
    description:
      "One upgraded plan that combines deeper fundamentals, smarter valuation tools, news sentiment, and expanded AI explanations in one simple package.",
    features: [
      "Expanded Eval Score with more quality fundamentals",
      "EBIT, EBITDA, cash-flow, and balance-sheet metrics",
      "Intrinsic value, WACC, and DCF-style valuation support",
      "Margin of safety and percent difference from intrinsic value",
      "News sentiment score from recent company headlines",
      "AI summaries that explain what the news means",
      "More detailed metric explanations in plain English",
      "Expanded Eval AI Assistant access for stock questions",
    ],
  };

  return (
    <section className="plans-page">
      <div className="plans-shell pro-only-shell">
        <div className="plans-page-head">
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={18} /> Dashboard
          </button>

          <div>
            <div className="plans-kicker">
              <Crown size={16} /> Eval Pro
            </div>
            <h2>One plan. Deeper stock research.</h2>
            <p>
              Eval Pro keeps the upgrade simple: stronger scoring, more company
              metrics, valuation tools, news sentiment, and cleaner AI-powered
              explanations for one price.
            </p>
          </div>
        </div>

        <div className="plans-grid pro-only-grid">
          <article className="plan-card pro pro-only-card">
            <div className="plan-glow" />

            <div className="plan-top pro-only-top">
              <div>
                <span>{plan.name}</span>
                <h3>{plan.price}</h3>
                <p>{plan.yearly}</p>
              </div>

              <div className="plan-icon">
                <Crown size={28} />
              </div>
            </div>

            <p className="plan-description">{plan.description}</p>

            <div className="plan-features pro-only-features">
              {plan.features.map((feature) => (
                <div className="plan-feature" key={feature}>
                  <CheckCircle2 size={16} />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="plan-select-btn"
              onClick={() => {}}
              title="Eval Pro website coming soon"
            >
              Upgrade to Eval Pro
            </button>
          </article>
        </div>

        <p className="fineprint center">
          Plan button is a placeholder for now. Connect it later to the live Pro
          checkout page when it is ready.
        </p>
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
        "Ask about Eval, FAQs, navigation, metrics, watchlist stocks, company tickers, key products, or what a company does.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function ask(e) {
    e.preventDefault();

    const clean = question.trim().slice(0, 75);
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
              <BrainCircuit size={16} /> Eval AI Assistant
            </div>
            <h2>Ask about Eval, the report, or the company.</h2>
            <p>
              Use Eval AI as a support agent and company explainer. Ask about app navigation,
              metrics, FAQs, watchlist stocks, tickers, products, news sentiment, or what a company does.
            </p>

        <section className="ai-rules-card ai-rules-card-full">
          <div className="ai-rules-eyebrow">What Eval AI can answer</div>
          <h3>Ask Eval AI for support, company intelligence, FAQ help, and watchlist-stock explanations.</h3>

          <div className="ai-rules-grid ai-rules-grid-brief">
            <div>
              <strong>Company intelligence</strong>
              <p>Ask “what is Amazon’s ticker,” “what does Apple sell,” “what does Microsoft do,” or “what products does Nvidia make.”</p>
            </div>

            <div>
              <strong>FAQs and app support</strong>
              <p>Ask how to use Eval, read score rings, understand popups, navigate the dropdown, compare stocks, or manage the watchlist.</p>
            </div>

            <div>
              <strong>Score and metric help</strong>
              <p>Ask what Growth, Profitability, Financial Health, Valuation, Momentum, Pullback, Risk, or News Sentiment means.</p>
            </div>

            <div>
              <strong>Watchlist stock questions</strong>
              <p>Specific stock analysis works when the ticker is loaded on your dashboard or saved in your watchlist.</p>
            </div>

            <div>
              <strong>Data and cache questions</strong>
              <p>Ask how Finnhub, Massive, FMP, OpenAI, provider fallbacks, and component caching protect the report.</p>
            </div>

            <div>
              <strong>Compare and industry help</strong>
              <p>Ask how to compare 2–5 watchlist stocks, read radar charts, or understand industry leader rankings.</p>
            </div>
          </div>

          <p className="ai-rules-note">Eval AI stays focused on Eval support, FAQs, company/ticker/product lookup, and loaded or watchlist stock analysis. It will not answer unrelated questions.</p>
        </section>

</div>
        </div>

        <div
className="chat-panel">
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
              onChange={(e) => setQuestion(e.target.value.slice(0, 150))}
              maxLength={150}
              placeholder="Ask about Eval, FAQs, metrics, watchlist stocks, tickers, products, or what a company does."
              rows="3"
            />
            <button disabled={loading}>
              {loading ? <RefreshCw className="spin" size={17} /> : <Send size={17} />}
              Ask
            </button>
          </form>
        </div>

        <p className="fineprint center">
          Educational only. Eval AI Assistant helps explain investing ideas, but it
          is not a licensed financial advisor.
        </p>
      </div>
    </section>
  );
}

function Report({ data, onAdd, onOpenIndustry }) {
  const cats = data?.grades?.categories || {};
  const metrics = data?.metrics || {};
  const edge = score10(data.grades?.edgeScore);
  const tone = scoreTone(edge);
  const scoreInsight = getScoreInsight(edge);
  const [openScoreHelp, setOpenScoreHelp] = useState(null);

  const scrollToScoreMetrics = () => {
    const target = document.getElementById("score-metrics");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const [industryOpen, setIndustryOpen] = useState(false);
  const [industryLoading, setIndustryLoading] = useState(false);
  const [industryError, setIndustryError] = useState("");
  const [industryLeaders, setIndustryLeaders] = useState([]);

  const industryName = data.profile?.finnhubIndustry || "Public company";
  const newsTopics = Array.isArray(data.newsSentiment?.topics)
    ? data.newsSentiment.topics.slice(0, 3)
    : [];

  async function openIndustryPopup() {
    if (!industryName || industryName === "Public company") return;
    onOpenIndustry?.(industryName, data.symbol);
  }

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
    growth: "Shows how fast the company is expanding sales and earnings. Higher means the business is growing stronger over time.",
    profitability: "Shows how efficiently the company turns revenue into profit. Higher means the company keeps more money after costs.",
    financialHealth: "Shows how stable the company looks financially. Higher means debt and balance-sheet risk are easier to handle.",
    valuation: "Shows whether the stock price looks fair compared with company fundamentals. Higher means the stock looks less overpriced.",
    momentum: "Shows recent stock strength and trend direction. Higher means the market has been rewarding the stock lately.",
    reversal: "Shows whether the stock has pulled back enough to create a better entry setup. Higher means the pullback looks more attractive.",
    newsSentiment: "Shows the weighted impact of the top 3 recent news topics. Higher means recent news looks more positive for the stock.",
  };

  const categoryMetrics = {
    growth: usableMetricLines([
      metricLine("Revenue Growth", metrics.revenueGrowth),
      metricLine("Quarterly Revenue Growth", metrics.revenueGrowthQuarterly),
      metricLine("3-Year Revenue Growth", metrics.revenueGrowth3Y),
      metricLine("5-Year Revenue Growth", metrics.revenueGrowth5Y),
      metricLine("EPS Growth", metrics.epsGrowth),
      metricLine("3-Year EPS Growth", metrics.epsGrowth3Y),
      metricLine("5-Year EPS Growth", metrics.epsGrowth5Y),
    ]),
    profitability: usableMetricLines([
      metricLine("ROE", metrics.roe),
      metricLine("ROA", metrics.roa),
      metricLine("ROI / ROIC", metrics.roi),
      metricLine("Gross Margin", metrics.grossMargin),
      metricLine("Operating Margin", metrics.operatingMargin),
      metricLine("Pretax Margin", metrics.pretaxMargin),
      metricLine("Net Margin", metrics.netMargin),
    ]),
    financialHealth: usableMetricLines([
      metricLine("Debt-to-Equity", metrics.debtToEquity),
      metricLine("Long-Term Debt-to-Equity", metrics.longTermDebtToEquity),
      metricLine("Current Ratio", metrics.currentRatio),
      metricLine("Quick Ratio", metrics.quickRatio),
      metricLine("Cash Ratio", metrics.cashRatio),
      metricLine("Asset Turnover", metrics.assetTurnover),
      metricLine("Market Cap Stability", metrics.marketCapM),
    ]),
    valuation: usableMetricLines([
      metricLine("P/E Ratio", metrics.peRatio),
      metricLine("Forward P/E", metrics.forwardPe),
      metricLine("PEG Ratio", metrics.pegRatio),
      metricLine("Price-to-Sales", metrics.priceToSales),
      metricLine("Price-to-Book", metrics.priceToBook),
      metricLine("Price-to-Cash-Flow", metrics.priceToCashFlow),
      metricLine("Price-to-Free-Cash-Flow", metrics.priceToFreeCashFlow),
      metricLine("Enterprise Value", metrics.enterpriseValue),
      metricLine("EBITDA", metrics.ebitda),
      metricLine("EV/EBITDA", metrics.evToEbitda),
      metricLine("WACC", metrics.wacc),
      metricLine("Cost of Equity", metrics.costOfEquity),
      metricLine("After-Tax Cost of Debt", metrics.afterTaxCostOfDebt),
      metricLine("Tax Rate", metrics.taxRate),
      metricLine("DCF Enterprise Value", metrics.dcfEnterpriseValue),
      metricLine("Intrinsic Value", metrics.intrinsicValue),
      metricLine("Intrinsic Value Gap", metrics.intrinsicValueGap),
      metricLine("News Sentiment", metrics.newsSentiment),
      metricLine("Dividend Yield", metrics.dividendYield),
    ]),
    momentum: usableMetricLines([
      metricLine("Beta", metrics.beta),
      metricLine("Day Change", metrics.dayChangePercent),
      metricLine("4-Week Return", metrics.priceReturn4Week),
      metricLine("13-Week Return", metrics.priceReturn13Week),
      metricLine("26-Week Return", metrics.priceReturn26Week),
      metricLine("52-Week Return", metrics.priceReturn52Week),
      metricLine("Distance From 52-Week Low", metrics.distanceFrom52WeekLow),
    ]),
    reversal: usableMetricLines([
      metricLine("Pullback From 52-Week High", metrics.pullbackFromHigh),
      metricLine("4-Week Return", metrics.priceReturn4Week),
      metricLine("13-Week Return", metrics.priceReturn13Week),
      metricLine("Distance From 52-Week Low", metrics.distanceFrom52WeekLow),
      metricLine("Day Change", metrics.dayChangePercent),
    ]),
    newsSentiment: usableMetricLines([
      metricLine("Weighted News Score", metrics.newsSentiment),
    ]),
  };

  const rows = [
    [
      "Market Cap",
      metrics.marketCapM || {
        value: data.grades?.context?.marketCapM,
        suffix: "M",
        source: "Finnhub / calculated",
      },
      "Shows the total market value of the company. Bigger companies are usually more established, while smaller companies may have more growth potential but higher risk.",
    ],
    [
      "P/E Ratio",
      metrics.peRatio,
      "Price compared to earnings. Lower can mean cheaper, but strong growth companies often trade richer.",
    ],
    [
      "Revenue Growth",
      metrics.revenueGrowth,
      "Shows whether the company is increasing sales over time.",
    ],
    [
      "EPS Growth",
      metrics.epsGrowth,
      "Tracks whether earnings per share are improving.",
    ],
    [
      "ROE",
      metrics.roe,
      "Shows how efficiently the company turns shareholder equity into profit.",
    ],
    ["Net Margin", metrics.netMargin, "Shows how much revenue becomes profit after costs."],
    [
      "Operating Margin",
      metrics.operatingMargin,
      "Shows how profitable the core business is before interest and taxes.",
    ],
    [
      "Debt-to-Equity",
      metrics.debtToEquity,
      "Compares company debt with shareholder equity.",
    ],
    [
      "Current Ratio",
      metrics.currentRatio,
      "Measures short-term balance-sheet strength.",
    ],
    [
      "Price-to-Sales",
      metrics.priceToSales,
      "Compares market value with annual sales.",
    ],
    [
      "Enterprise Value",
      metrics.enterpriseValue,
      "Company value estimate calculated as market cap plus total debt minus cash.",
    ],
    [
      "WACC",
      metrics.wacc,
      "Estimated discount rate from cost of equity and after-tax cost of debt.",
    ],
    [
      "Intrinsic Value",
      metrics.intrinsicValue,
      "DCF equity value per share using projected free cash flow.",
    ],
    [
      "Intrinsic Value Gap",
      metrics.intrinsicValueGap,
      "Percent difference between intrinsic value and current stock price.",
    ],
    [
      "News Sentiment",
      metrics.newsSentiment,
      data.newsSentiment?.summary || "AI score from recent company news.",
    ],
    [
      "EBITDA",
      metrics.ebitda,
      "Operating earnings estimate before interest, taxes, depreciation, and amortization.",
    ],
    [
      "EV/EBITDA",
      metrics.evToEbitda,
      "Compares enterprise value with EBITDA. Lower can point to a more reasonable valuation, but quality and growth still matter.",
    ],
    [
      "52-Week Return",
      metrics.priceReturn52Week,
      "Shows longer-term price momentum over the last year.",
    ],
    [
      "Beta",
      metrics.beta,
      "Shows how volatile the stock is compared with the overall market.",
    ],
  ];

  return (
    <>
      <section className={`hero-card eval-stack-report ${openScoreHelp === "score" ? "score-popup-active" : ""}`}>
        <div className="score-panel">
          <ScoreRingSvg
            value={edge}
            className="score-ring"
          />

          <div className={`score-insight-wrap score-button-stack ${openScoreHelp === "score" ? "popup-active" : ""}`}>
            <button
              type="button"
              className="score-help-btn score-main-help-btn"
              onClick={() => setOpenScoreHelp(openScoreHelp === "score" ? null : "score")}
              aria-label="Explain Eval Score color"
              title="Explain Eval Score color"
            >
              <span className="info-letter">?</span>
            </button>

            {openScoreHelp === "score" && (
              <div className={`score-popup score-insight-popup ${tone}`}>
                <button type="button" className="popup-close-btn" onClick={() => setOpenScoreHelp(null)} aria-label="Close popup" title="Close">×</button>
                <div className="score-popup-title">{scoreInsight.label}</div>
                <p>{scoreInsight.text}</p>
              </div>
            )}

            <button
              type="button"
              className="score-metrics-jump-btn"
              onClick={scrollToScoreMetrics}
              title="Jump to score metrics"
              aria-label="Jump to score metrics"
            >
              Metrics
            </button>
          </div>
        </div>

        <div className="company-panel">
<h2>{data.profile?.name || data.symbol}</h2>
          <p className="subline">
            {(data.profile?.weburl || data.profile?.website || data.profile?.site) ? (
              <a
                href={data.profile?.weburl || data.profile?.website || data.profile?.site}
                target="_blank"
                rel="noreferrer"
                className="ticker-company-link"
                title={`Open ${data.symbol} company website`}
              >
                {data.symbol}
              </a>
            ) : (
              <span className="ticker-company-link is-disabled">{data.symbol}</span>
            )}
            <span> · </span>
            <button
              type="button"
              className="industry-link"
              onClick={openIndustryPopup}
              disabled={!industryName || industryName === "Public company"}
              title={`View top Eval stocks in ${industryName}`}
            >
              {industryName}
            </button>
          </p>

          <div className="hero-actions">
            <button className="eval-hero-add-btn hero-add-corner-btn" onClick={onAdd} aria-label="Add to watchlist" title="Add to watchlist">
              <Plus size={17} />
            </button>
          </div>
        </div>

        <div className="snapshot-grid snapshot-grid-refined">
          <MiniStat
            icon={<Activity size={17} />}
            label="Price"
            value={money(data.quote?.c)}
            className="price-mini-stat"
            extra={
              <span className={`daily-change-chip ${dailyChangeClass(data.quote?.dp)}`}>
                {signedPercent(data.quote?.dp)}
              </span>
            }
          />
          <MiniStat
            icon={<ShieldCheck size={17} />}
            label="Risk"
            value={data.grades.riskLabel}
          />
        </div>

      </section>

      {newsTopics.length > 0 && (
        <section className="news-sentiment-card">
          <div className="section-title news-section-title">
            <Newspaper size={17} />
            News Sentiment
            <span className={`news-score-pill ${scoreTone(data.newsSentiment?.score)}`}>
              {scoreText(data.newsSentiment?.score)}
            </span>
            <small>{data.newsSentiment?.label || "Recent news"}</small>
          </div>

          {data.newsSentiment?.summary && (
            <p className="news-overall-summary">{data.newsSentiment.summary}</p>
          )}

          <div className="news-topic-list">
            {newsTopics.map((topic, index) => (
              <article className="news-topic-card" key={`${topic.title}-${index}`}>
                <div className="news-topic-head">
                  <div>
                    <span>Topic  · {Number(topic.weight || 0).toFixed(0)}% impact weight</span>
                    <h3>{topic.title}</h3>
                  </div>
                  <b className={scoreTone(topic.score)}>{scoreText(topic.score)}</b>
                </div>

                <p>{topic.summary}</p>

                {topic.url && (
                  <a href={topic.url} target="_blank" rel="noreferrer">
                    Read article
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
<section id="score-metrics" className="grade-grid">
        <Grade
          id="growth"
          name="Growth"
          value={cats.growth}
          icon={<TrendingUp size={18} />}
          description={gradeDescriptions.growth}
          metricsUsed={categoryMetrics.growth}
          isOpen={openScoreHelp === "growth"}
          onToggle={() =>
            setOpenScoreHelp(openScoreHelp === "growth" ? null : "growth")
          }
        />
        <Grade
          id="profitability"
          name="Profitability"
          value={cats.profitability}
          icon={<BarChart3 size={18} />}
          description={gradeDescriptions.profitability}
          metricsUsed={categoryMetrics.profitability}
          isOpen={openScoreHelp === "profitability"}
          onToggle={() =>
            setOpenScoreHelp(
              openScoreHelp === "profitability" ? null : "profitability"
            )
          }
        />
        <Grade
          id="financialHealth"
          name="Financial Health"
          value={cats.financialHealth}
          icon={<ShieldCheck size={18} />}
          description={gradeDescriptions.financialHealth}
          metricsUsed={categoryMetrics.financialHealth}
          isOpen={openScoreHelp === "financialHealth"}
          onToggle={() =>
            setOpenScoreHelp(
              openScoreHelp === "financialHealth" ? null : "financialHealth"
            )
          }
        />
        <Grade
          id="valuation"
          name="Valuation"
          value={cats.valuation}
          icon={<Target size={18} />}
          description={gradeDescriptions.valuation}
          metricsUsed={categoryMetrics.valuation}
          isOpen={openScoreHelp === "valuation"}
          onToggle={() =>
            setOpenScoreHelp(openScoreHelp === "valuation" ? null : "valuation")
          }
        />
        <Grade
          id="momentum"
          name="Momentum"
          value={cats.momentum}
          icon={<LineChart size={18} />}
          description={gradeDescriptions.momentum}
          metricsUsed={categoryMetrics.momentum}
          isOpen={openScoreHelp === "momentum"}
          onToggle={() =>
            setOpenScoreHelp(openScoreHelp === "momentum" ? null : "momentum")
          }
        />
        <Grade
          id="reversal"
          name="Pullback"
          value={cats.reversal}
          icon={<Zap size={18} />}
          description={gradeDescriptions.reversal}
          metricsUsed={categoryMetrics.reversal}
          isOpen={openScoreHelp === "reversal"}
          onToggle={() =>
            setOpenScoreHelp(openScoreHelp === "reversal" ? null : "reversal")
          }
        />

        <Grade
          id="newsSentiment"
          name="News Sentiment"
          value={cats.newsSentiment}
          icon={<Newspaper size={18} />}
          description={gradeDescriptions.newsSentiment}
          metricsUsed={categoryMetrics.newsSentiment}
          isOpen={openScoreHelp === "newsSentiment"}
          onToggle={() =>
            setOpenScoreHelp(
              openScoreHelp === "newsSentiment" ? null : "newsSentiment"
            )
          }
        />
      </section>

    </>
  );
}

function metricLine(label, item) {
  if (!item) return null;

  if (typeof item === "object" && "value" in item) {
    const value = Number(item.value);
    if (!Number.isFinite(value) || value === 0) return null;

    return {
      label,
      value: fmt(item.value, item.suffix || ""),
      source: item.formula ? `${item.source || "Score model"} · ${item.formula}` : item.source || "Score model",
    };
  }

  if (item === null || item === undefined || item === "N/A" || item === 0 || item === "0") return null;

  return {
    label,
    value: String(item),
    source: "Score model",
  };
}

function usableMetricLines(lines = []) {
  return lines.filter((line) => {
    if (!line) return false;
    const value = String(line.value ?? "").trim();
    return value && value !== "0" && value !== "0.0" && value !== "N/A";
  });
}

function MiniStat({
  icon,
  label,
  value,
  helpTitle,
  metricsUsed = [],
  isOpen = false,
  onToggle,
  extra = null,
  className = "",
}) {
  return (
    <div className={`mini-stat ${className} ${isOpen ? "popup-active" : ""}`}>
      <span>
        {icon}
        {label}
      </span>

      <div className="mini-stat-value-row">
        <b>{value}</b>
        {metricsUsed.length > 0 && (
          <button
            type="button"
            className="score-help-btn mini-risk-help-btn"
            onClick={onToggle}
            aria-label={helpTitle || `${label} metrics used`}
            title={helpTitle || `${label} metrics used`}
          >
            <span className="info-letter">?</span>
          </button>
        )}
      </div>

      {extra}

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

function Grade({
  name,
  value,
  icon,
  description,
  metricsUsed = [],
  isOpen = false,
  onToggle,
}) {
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
          <button type="button" className="popup-close-btn" onClick={onToggle} aria-label="Close popup" title="Close">×</button>
        <div className="score-popup-title">Metrics used</div>
          <ul>
            {metricsUsed.length ? (
              metricsUsed.map((metric) => (
                <li key={metric.label}>
                  <span>{metric.label}: {metric.value}</span>
                  {metric.source && <small>{metric.source}</small>}
                </li>
              ))
            ) : (
              <li>
                <span>No usable metrics available yet.</span>
              </li>
            )}
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
    <div className="empty-report">
      <div className="center">
        <Activity size={26} />
        <h2>No stock report loaded yet</h2>
        <p>Search a ticker above to generate an Eval report.</p>
      </div>
    </div>
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
        <p>
          Add VITE_CLERK_PUBLISHABLE_KEY to your Vercel environment variables,
          then redeploy the frontend.
        </p>
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
