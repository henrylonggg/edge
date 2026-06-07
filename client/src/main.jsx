// Eval update: FMP 6000 stock ticker lookup page.
// Eval update: static Top 1000 ticker lookup page.
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

  if (view === "lookup") {
    return (
      <TickerLookupPage
        onBack={() => setView("dashboard")}
        onFaqs={() => setView("faqs")}
        onAnalyze={async (ticker) => {
          setView("dashboard");
          await analyze(null, ticker);
        }}
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
                      <button type="button" role="menuitem" onClick={() => goMenu("lookup")}>
                        Ticker Lookup
                      </button>
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
                      <button type="button" role="menuitem" onClick={() => goMenu("lookup")}>
                        Ticker Lookup
                      </button>
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
      title: "One score that makes the stock readable",
      text: "Eval compresses fundamentals, valuation, risk, momentum, pullback, and news into one clean 0–10 Power Score.",
    },
    {
      icon: <Newspaper size={22} />,
      title: "AI-powered news sentiment",
      text: "Recent headlines are summarized, rated, weighted by impact, and turned into an easy bullish, neutral, or bearish read.",
    },
    {
      icon: <Star size={22} />,
      title: "Ranked watchlist",
      text: "Save up to 15 tickers and instantly rank them by score with glowing rings and fast delete/refresh controls.",
    },
    {
      icon: <Scale size={22} />,
      title: "Radar comparisons",
      text: "Compare two watchlist stocks across seven categories with a tech-style radar chart and side-by-side score rings.",
    },
    {
      icon: <BrainCircuit size={22} />,
      title: "Eval AI Assistant",
      text: "Ask questions about the dashboard, metric popups, news sentiment, watchlist stocks, and how to use the interface.",
    },
    {
      icon: <ShieldCheck size={22} />,
      title: "Risk without the headache",
      text: "Eval converts volatility, debt, financial stability, and valuation pressure into a fast Low, Medium, or High risk label.",
    },
  ];
return (
    <main className="landing-page landing-page-pro landing-page-extreme">
      <div className="landing-orb landing-orb-one" />
      <div className="landing-orb landing-orb-two" />
      <div className="landing-orb landing-orb-three" />
      <div className="landing-grid-glow" />
      <div className="landing-scanline" />
      <div className="landing-noise" />

      <section className="landing-shell landing-shell-pro landing-shell-extreme">
        <header className="landing-brand-row landing-brand-row-pro">
          <button type="button" className="landing-brand-home" aria-label="Eval homepage">
            <img src="/stock-edge-ai-logo.png" alt="Eval logo" />
            <h1>Eval</h1>
          </button>

          <div className="landing-status-pill landing-status-live">
            <span /> Live-style stock evaluation engine
          </div>
        </header>

        <section className="landing-hero landing-hero-pro landing-hero-extreme">
          <div className="landing-copy landing-copy-pro">
            <div className="landing-kicker landing-kicker-glow">
              <Sparkles size={16} /> AI-powered stock reports in plain English
            </div>

            <h2>
              The fastest way to understand a stock before you waste time digging.
            </h2>

            <p>
              Eval turns ticker data into a cinematic stock dashboard: Power Score, category
              ratings, risk, AI news sentiment, watchlist rankings, comparisons, and an assistant
              that explains the whole report without finance jargon.
            </p>

            <div className="landing-actions landing-actions-pro">
              <button type="button" className="landing-continue-btn landing-continue-mega" onClick={onContinue}>
                Launch Dashboard <ArrowRight size={20} />
              </button>
              <span>Search. Score. Rank. Compare. Ask AI.</span>
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
                <span><i /> Watchlist rank: #1</span>
                <span><i /> Risk: medium</span>
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
              <strong>Ask anything</strong>
              <p>About the report</p>
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
            <h2>Built to feel like a premium Bloomberg-style dashboard, but simple enough for anyone.</h2>
          </div>

          <div className="landing-story-grid landing-story-grid-extreme">
            <div><b>01</b><span>Power Score</span><p>A clean 0.0–10.0 rating users can understand immediately.</p></div>
            <div><b>02</b><span>Metric Cards</span><p>Growth, profitability, health, valuation, momentum, pullback, and news.</p></div>
            <div><b>03</b><span>News Sentiment</span><p>Top articles are summarized, linked, scored, and weighted by impact.</p></div>
            <div><b>04</b><span>Compare Page</span><p>Two stocks, two rings, one radar chart, seven categories.</p></div>
          </div>
        </section>

        <div className="landing-bottom-strip landing-bottom-strip-pro">
          <span>Eval Score</span>
          <span>AI News</span>
          <span>Risk</span>
          <span>Watchlist</span>
          <span>Compare</span>
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



function TickerLookupPage({ onBack, onAnalyze, onFaqs }) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState([]);
  const [totalAvailable, setTotalAvailable] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

  const normalized = query.trim();

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLookupLoading(true);
      setLookupError("");

      try {
        const params = new URLSearchParams({
          q: normalized,
          limit: "160",
        });

        const response = await fetch(`${API}/api/ticker-lookup?${params.toString()}`, {
          signal: controller.signal,
        });

        const json = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(json?.error || "Ticker lookup failed.");
        }

        setMatches(Array.isArray(json?.results) ? json.results : []);
        setTotalAvailable(Number(json?.totalAvailable) || null);
      } catch (error) {
        if (error?.name !== "AbortError") {
          setLookupError(error?.message || "Ticker lookup failed.");
          setMatches([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLookupLoading(false);
        }
      }
    }, normalized ? 180 : 0);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [normalized]);

  return (
    <main className="lookup-page">
      <section className="lookup-shell">
        <div className="lookup-topbar">
          <button className="back-btn" type="button" onClick={onBack}>
            <ArrowLeft size={18} /> Dashboard
          </button>

          <button className="lookup-help-btn" type="button" onClick={onFaqs}>
            <HelpCircle size={16} /> FAQs
          </button>
        </div>

        <div className="lookup-hero">
          <div className="section-title">
            <Search size={17} /> Ticker Lookup
          </div>
          <h1>Find a ticker by company name.</h1>
          <p>
            Start typing a company name and Eval filters FMP’s stock list. Click the ticker on the right to load that company on the Analyze dashboard.
          </p>
        </div>

        <div className="lookup-search-card">
          <Search size={20} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type Apple, Nvidia, JPMorgan, Tesla..."
            autoComplete="off"
            autoFocus
          />
          <span>
            {lookupLoading ? "Searching..." : `${matches.length} shown${totalAvailable ? ` / ${totalAvailable}+` : ""}`}
          </span>
        </div>

        {lookupError && (
          <div className="lookup-error">
            {lookupError}
          </div>
        )}

        <div className="lookup-results lookup-results-table">
          {matches.map((item) => (
            <button
              type="button"
              className="lookup-result-row"
              key={item.symbol}
              onClick={() => onAnalyze(item.symbol)}
            >
              <strong>{item.name}</strong>
              <span>{item.symbol}</span>
            </button>
          ))}
        </div>

        {!lookupLoading && !matches.length && !lookupError && (
          <div className="lookup-empty">
            <Search size={30} />
            <h3>No FMP match found</h3>
            <p>Try a shorter company name or search directly by ticker symbol.</p>
          </div>
        )}
      </section>
    </main>
  );
}

const EVAL_FAQS = [
  {
    "category": "Getting started",
    "question": "What is Eval?",
    "answer": "Eval is a stock-evaluation dashboard that turns company data, price movement, risk, news sentiment, and category metrics into one easy-to-read Eval Score."
  },
  {
    "category": "Getting started",
    "question": "How do I search for a stock?",
    "answer": "Type a ticker into the search bar, then click the search icon. Eval loads the company report, price card, risk card, news sentiment, category metrics, and available industry data."
  },
  {
    "category": "Getting started",
    "question": "Why does the dashboard say no stock report loaded yet?",
    "answer": "That means no ticker is currently selected. Search a ticker in the top bar to generate the first Eval report."
  },
  {
    "category": "Getting started",
    "question": "Can I click the Eval logo?",
    "answer": "Yes. Clicking the Eval logo or Eval wordmark takes you back to the homepage."
  },
  {
    "category": "Getting started",
    "question": "What should I do first after signing in?",
    "answer": "Start by searching a ticker you know, then review the Eval Score, category bars, news sentiment, and watchlist options."
  },
  {
    "category": "Getting started",
    "question": "Do I need finance knowledge to use Eval?",
    "answer": "No. Eval is designed to simplify stock data into readable scores, summaries, and visual cards."
  },
  {
    "category": "Getting started",
    "question": "What is the main dashboard for?",
    "answer": "The dashboard is where you search stocks, view Eval reports, manage your watchlist, open Compare, and access support pages."
  },
  {
    "category": "Getting started",
    "question": "What is the fastest way to understand a stock?",
    "answer": "Look at the Eval Score first, then check the strongest and weakest metric categories, news sentiment, price change, and risk label."
  },
  {
    "category": "Getting started",
    "question": "What ticker format should I type?",
    "answer": "Use the stock ticker symbol, like AAPL, NVDA, MSFT, TSLA, or JPM. Keep it short and avoid full company names in the ticker input."
  },
  {
    "category": "Getting started",
    "question": "Why does Eval use ticker symbols?",
    "answer": "Ticker symbols are the cleanest way to identify stocks and retrieve the correct market data."
  },
  {
    "category": "Getting started",
    "question": "What does the plus button do?",
    "answer": "The plus button adds the currently loaded stock to your watchlist when that option is available."
  },
  {
    "category": "Getting started",
    "question": "What does the search icon do?",
    "answer": "The search icon runs the stock lookup for the ticker currently typed in the search bar."
  },
  {
    "category": "Getting started",
    "question": "What does the dropdown button do?",
    "answer": "The dropdown button opens navigation options like AI Assistant, Compare, FAQs, Homepage, Terms & Conditions, and Contact."
  },
  {
    "category": "Getting started",
    "question": "Can I use Eval on mobile?",
    "answer": "Yes. The mobile layout is designed for portrait mode and includes dropdown navigation for pages that are always visible on desktop."
  },
  {
    "category": "Getting started",
    "question": "Why does Eval prefer portrait mode on phones?",
    "answer": "Portrait mode keeps the score rings, watchlist, metrics, and chart sections readable without horizontal layout issues."
  },
  {
    "category": "Getting started",
    "question": "Does Eval replace financial research?",
    "answer": "No. Eval helps organize and explain stock information, but users should still do their own research before making decisions."
  },
  {
    "category": "Getting started",
    "question": "What does the homepage explain?",
    "answer": "The homepage gives a visual introduction to Eval, showing how the app turns ticker data into scores, rankings, comparisons, and AI explanations."
  },
  {
    "category": "Getting started",
    "question": "How often should I refresh a stock?",
    "answer": "Refresh when you want the latest available score, watchlist ranking, or report data. Some data may also be cached to reduce API calls."
  },
  {
    "category": "Getting started",
    "question": "Why do some stocks load better than others?",
    "answer": "Some companies have more complete financial, price, and news data available than others."
  },
  {
    "category": "Getting started",
    "question": "What is the best way to learn the app?",
    "answer": "Use the FAQ page, ask Eval AI navigation questions, and open the metric popups to see what each section means."
  },
  {
    "category": "Navigation",
    "question": "What is inside the dropdown menu?",
    "answer": "The dropdown menu opens key pages like AI Assistant, Compare, FAQs, Homepage, Terms & Conditions, and Contact. On mobile and tablet, it also includes Watchlist."
  },
  {
    "category": "Navigation",
    "question": "Why is Watchlist not in the desktop dropdown?",
    "answer": "On desktop, the Watchlist is already visible on the dashboard, so the dropdown keeps it removed to avoid duplicate navigation. On mobile and tablet, Watchlist appears in the dropdown."
  },
  {
    "category": "Navigation",
    "question": "How do I contact support?",
    "answer": "Open the dropdown menu and click Contact. The support page shows the Eval support contact information."
  },
  {
    "category": "Navigation",
    "question": "Where are Terms & Conditions?",
    "answer": "Open the dropdown menu and click Terms & Conditions. That page explains the app terms, limitations, and user agreement."
  },
  {
    "category": "Navigation",
    "question": "How do I get back to the dashboard?",
    "answer": "Use the Dashboard or Back to dashboard button shown on pages like Compare, FAQs, Contact, and AI Assistant."
  },
  {
    "category": "Navigation",
    "question": "How do I go to the homepage?",
    "answer": "Click the Eval logo or open the dropdown menu and select Homepage."
  },
  {
    "category": "Navigation",
    "question": "How do I open Compare?",
    "answer": "Open the dropdown menu and click Compare. You will be taken to the compare-selection page."
  },
  {
    "category": "Navigation",
    "question": "How do I open FAQs?",
    "answer": "Open the dropdown menu and click FAQs. The FAQ page includes search and category filters."
  },
  {
    "category": "Navigation",
    "question": "How do I open AI Assistant?",
    "answer": "Open the dropdown menu and click AI Assistant. The assistant page answers app support and watchlist-stock questions."
  },
  {
    "category": "Navigation",
    "question": "How do I open Watchlist on mobile?",
    "answer": "Open the dropdown menu and tap Watchlist. The mobile layout uses dropdown navigation because the watchlist is not always shown beside the dashboard."
  },
  {
    "category": "Navigation",
    "question": "Why does mobile navigation look different?",
    "answer": "Mobile has less horizontal room, so navigation moves into the dropdown while keeping the dashboard focused on the report."
  },
  {
    "category": "Navigation",
    "question": "What does the Contact tab do?",
    "answer": "The Contact tab opens the support page where users can find the Eval support email."
  },
  {
    "category": "Navigation",
    "question": "What does the Homepage tab do?",
    "answer": "The Homepage tab returns to the landing page that explains what Eval does."
  },
  {
    "category": "Navigation",
    "question": "What does the Terms & Conditions tab do?",
    "answer": "It opens the legal and usage terms page for the app."
  },
  {
    "category": "Navigation",
    "question": "Can I use the browser back button?",
    "answer": "Yes, but the app\u2019s own navigation buttons are safer because they keep the dashboard state organized."
  },
  {
    "category": "Navigation",
    "question": "Why is the menu button on the left of the search bar?",
    "answer": "It keeps navigation close to the ticker search flow and works cleanly on both desktop and mobile."
  },
  {
    "category": "Navigation",
    "question": "What happens if I click outside the dropdown?",
    "answer": "The dropdown should close when you click outside of it."
  },
  {
    "category": "Navigation",
    "question": "How do I move from an industry page back to the dashboard?",
    "answer": "Click the Dashboard button at the top of the industry ranking page."
  },
  {
    "category": "Navigation",
    "question": "How do I move from Compare back to selected stocks?",
    "answer": "Use the Change selected stocks button at the top of the Compare results page."
  },
  {
    "category": "Navigation",
    "question": "Where do I find help inside the app?",
    "answer": "Use the FAQs page or Eval AI Assistant. FAQs are searchable, and Eval AI can answer navigation questions directly."
  },
  {
    "category": "Eval Score",
    "question": "What is the Eval Score?",
    "answer": "The Eval Score is a 0.0 to 10.0 rating that summarizes the company\u2019s overall dashboard strength based on categories like growth, profitability, financial health, valuation, momentum, pullback, and news sentiment."
  },
  {
    "category": "Eval Score",
    "question": "Is the Eval Score a buy or sell rating?",
    "answer": "No. The Eval Score is an educational company-evaluation score, not a buy, sell, or hold recommendation."
  },
  {
    "category": "Eval Score",
    "question": "What do the score colors mean?",
    "answer": "Green means stronger, yellow means mixed or average, and red means weaker. The colors help users quickly understand whether a score looks strong, moderate, or low."
  },
  {
    "category": "Eval Score",
    "question": "Why does a stock have a high Eval Score?",
    "answer": "A high score usually means the company has stronger category ratings across several areas such as growth, profitability, momentum, financial health, and news sentiment."
  },
  {
    "category": "Eval Score",
    "question": "Why does a stock have a low Eval Score?",
    "answer": "A lower score usually means the company has weaker category ratings, valuation pressure, risk issues, poor momentum, weak profitability, or negative news sentiment."
  },
  {
    "category": "Eval Score",
    "question": "What does 10.0 mean?",
    "answer": "A 10.0 means the stock currently scores extremely well in the Eval system. It does not mean the stock is guaranteed to rise."
  },
  {
    "category": "Eval Score",
    "question": "What does 5.0 mean?",
    "answer": "A 5.0 is a middle-area score that suggests mixed signals. Some categories may be solid while others may be weak."
  },
  {
    "category": "Eval Score",
    "question": "What does a red score mean?",
    "answer": "A red score means the stock is currently showing weaker signals in the Eval framework."
  },
  {
    "category": "Eval Score",
    "question": "What does a yellow score mean?",
    "answer": "A yellow score means the stock looks mixed, moderate, or uncertain across the Eval categories."
  },
  {
    "category": "Eval Score",
    "question": "What does a green score mean?",
    "answer": "A green score means the stock currently looks stronger across the Eval category system."
  },
  {
    "category": "Eval Score",
    "question": "Can the Eval Score change?",
    "answer": "Yes. It can change as price, financial data, news sentiment, and category scores update."
  },
  {
    "category": "Eval Score",
    "question": "Why did a score change after refresh?",
    "answer": "Refreshing may pull newer data or updated cached calculations, which can change one or more category scores."
  },
  {
    "category": "Eval Score",
    "question": "Does Eval compare stocks fairly across industries?",
    "answer": "Eval is most useful when comparing stocks inside the same or similar industry because different industries naturally behave differently."
  },
  {
    "category": "Eval Score",
    "question": "Why might a strong company have a mediocre score?",
    "answer": "A company can be strong but still look expensive, have weak momentum, carry higher risk, or face negative news sentiment."
  },
  {
    "category": "Eval Score",
    "question": "Why might a risky stock still score well?",
    "answer": "A stock can have strong growth, momentum, or profitability while still carrying risk from volatility, debt, or valuation."
  },
  {
    "category": "Eval Score",
    "question": "Is the Eval Score based only on news?",
    "answer": "No. News Sentiment is one category, but the total score also considers growth, profitability, financial health, valuation, momentum, and pullback."
  },
  {
    "category": "Eval Score",
    "question": "Is the Eval Score based only on price?",
    "answer": "No. Price movement affects some parts, but the score also uses company fundamentals and recent news."
  },
  {
    "category": "Eval Score",
    "question": "Should I only buy green stocks?",
    "answer": "No. Green means stronger in the Eval framework, but it is not financial advice or a buy recommendation."
  },
  {
    "category": "Eval Score",
    "question": "Can a low score become high later?",
    "answer": "Yes. Scores can improve if company fundamentals, momentum, valuation, or sentiment improve."
  },
  {
    "category": "Eval Score",
    "question": "Can a high score become low later?",
    "answer": "Yes. Scores can fall if fundamentals weaken, valuation worsens, momentum fades, risk rises, or news sentiment turns negative."
  },
  {
    "category": "Metric cards",
    "question": "What does Growth mean?",
    "answer": "Growth shows how quickly the company is expanding sales and earnings. Higher growth scores usually mean the business is increasing revenue or earnings more strongly."
  },
  {
    "category": "Metric cards",
    "question": "What does Profitability mean?",
    "answer": "Profitability shows how efficiently the company turns revenue into profit. Strong margins and return metrics usually improve this score."
  },
  {
    "category": "Metric cards",
    "question": "What does Financial Health mean?",
    "answer": "Financial Health shows balance-sheet strength, debt risk, and stability. Higher scores usually mean the company looks easier to handle financially."
  },
  {
    "category": "Metric cards",
    "question": "What does Valuation mean?",
    "answer": "Valuation shows whether the stock price looks reasonable compared with company fundamentals. A higher score generally means valuation looks more attractive."
  },
  {
    "category": "Metric cards",
    "question": "What does Momentum mean?",
    "answer": "Momentum shows recent stock strength and trend direction. Higher scores usually mean the market has been rewarding the stock lately."
  },
  {
    "category": "Metric cards",
    "question": "What does Pullback mean?",
    "answer": "Pullback shows whether the stock has cooled off enough to look more attractive from a recent-price perspective. It is not a buy signal by itself."
  },
  {
    "category": "Metric cards",
    "question": "What does News Sentiment mean?",
    "answer": "News Sentiment summarizes recent headlines and article impact into a score. A higher number means the recent news looks more positive for the stock."
  },
  {
    "category": "Metric cards",
    "question": "What are the bar charts?",
    "answer": "The bar charts show each category score from 0 to 10. Longer bars mean stronger category scores."
  },
  {
    "category": "Metric cards",
    "question": "Why are the score numbers white?",
    "answer": "The numbers are kept white for readability. The bar color and ring color show the strength range instead."
  },
  {
    "category": "Metric cards",
    "question": "Why are there seven category metrics?",
    "answer": "The seven categories give a wider view of the company instead of relying on only one number or one data point."
  },
  {
    "category": "Metric cards",
    "question": "Which metric matters most?",
    "answer": "No single metric always matters most. Growth, profitability, financial health, valuation, momentum, pullback, and news sentiment each show a different angle."
  },
  {
    "category": "Metric cards",
    "question": "Why can Growth be high but Valuation low?",
    "answer": "A company may be growing quickly but also trading at an expensive price compared with fundamentals."
  },
  {
    "category": "Metric cards",
    "question": "Why can Valuation be high but Momentum low?",
    "answer": "A stock may look attractively priced but still have weak recent price movement."
  },
  {
    "category": "Metric cards",
    "question": "Why can News Sentiment be high but the total score lower?",
    "answer": "Good news can help, but weak valuation, risk, or financial metrics can still drag down the total score."
  },
  {
    "category": "Metric cards",
    "question": "Why can Financial Health be low?",
    "answer": "Financial Health may be lower when debt, balance-sheet risk, liquidity, or stability looks weaker."
  },
  {
    "category": "Metric cards",
    "question": "Why can Profitability be low?",
    "answer": "Profitability may be low if margins, earnings quality, or returns are weak or negative."
  },
  {
    "category": "Metric cards",
    "question": "Why can Pullback be high?",
    "answer": "Pullback can be high when the stock has cooled from recent levels in a way that looks more attractive inside the model."
  },
  {
    "category": "Metric cards",
    "question": "Why can Pullback be low?",
    "answer": "Pullback can be low when the stock has not cooled enough or recent price action looks less attractive."
  },
  {
    "category": "Metric cards",
    "question": "Why do some bars show N/A?",
    "answer": "A bar can show N/A if the required data is missing or unavailable for that stock."
  },
  {
    "category": "Metric cards",
    "question": "How should I read the metric cards?",
    "answer": "Start with the highest and lowest bars. The strongest bars show what is helping the Eval Score, and the weakest bars show what is dragging it down."
  },
  {
    "category": "Metric popups",
    "question": "What does the question mark button do?",
    "answer": "The question mark button opens a popup explaining what data or calculations were used for that score."
  },
  {
    "category": "Metric popups",
    "question": "How do I close a metric popup?",
    "answer": "Click the small X button in the popup or click the question mark again if that popup supports toggling."
  },
  {
    "category": "Metric popups",
    "question": "Why are metric popups useful?",
    "answer": "They show what went into the category score so users can understand the number instead of just seeing a rating."
  },
  {
    "category": "Metric popups",
    "question": "What does Metrics button under the main ring do?",
    "answer": "The Metrics button scrolls down to the category metric cards so users can jump straight to the bar charts."
  },
  {
    "category": "Metric popups",
    "question": "What does the Eval Score question mark explain?",
    "answer": "It explains the main score system and what the score range means."
  },
  {
    "category": "Metric popups",
    "question": "Can metric popups show data sources?",
    "answer": "Yes. Popups can show which data points or calculations helped form the category score."
  },
  {
    "category": "Metric popups",
    "question": "Why does a popup list multiple items?",
    "answer": "Many scores are built from several inputs, so the popup breaks down the pieces that affected the rating."
  },
  {
    "category": "Metric popups",
    "question": "Why does a popup sometimes show N/A?",
    "answer": "N/A appears when the app could not retrieve or calculate that specific input."
  },
  {
    "category": "Metric popups",
    "question": "Are popup metrics the exact full formula?",
    "answer": "They are meant to explain the major inputs in a simple way, not expose every backend detail."
  },
  {
    "category": "Metric popups",
    "question": "Can I use popups for learning?",
    "answer": "Yes. Popups are built to help users understand what financial terms and score inputs mean."
  },
  {
    "category": "Metric popups",
    "question": "Why is the popup text short?",
    "answer": "The app keeps popups short so users can quickly understand the score without reading a long report."
  },
  {
    "category": "Metric popups",
    "question": "Do popups work on mobile?",
    "answer": "Yes. Mobile popups should appear above the dashboard content and include a close button."
  },
  {
    "category": "Metric popups",
    "question": "What if a popup overlaps content?",
    "answer": "Use the X button to close it. The popup is designed to appear above the dashboard interface."
  },
  {
    "category": "Metric popups",
    "question": "Can multiple popups be open at once?",
    "answer": "The app is designed so users can focus on one explanation at a time."
  },
  {
    "category": "Metric popups",
    "question": "Do popups affect the Eval Score?",
    "answer": "No. Popups only explain the score; they do not change any calculation."
  },
  {
    "category": "Metric popups",
    "question": "Why does the risk popup matter?",
    "answer": "Risk explanations help users see why a stock may be labeled Low, Medium, or High risk."
  },
  {
    "category": "Metric popups",
    "question": "Why does the news popup matter?",
    "answer": "News explanations show how recent headlines are affecting the sentiment score."
  },
  {
    "category": "Metric popups",
    "question": "Can I ask Eval AI about a popup?",
    "answer": "Yes. Eval AI can explain what popups mean and how to interpret them."
  },
  {
    "category": "Metric popups",
    "question": "Do popups update after refresh?",
    "answer": "Yes. If the underlying report updates, the popup explanations can update too."
  },
  {
    "category": "Metric popups",
    "question": "Should I read every popup?",
    "answer": "You do not have to, but reading the weakest category popup is a good way to understand what is hurting the score."
  },
  {
    "category": "Price and risk",
    "question": "What does the Price card show?",
    "answer": "The Price card shows the latest available stock price and the daily percent change when available."
  },
  {
    "category": "Price and risk",
    "question": "What does the Risk card mean?",
    "answer": "Risk summarizes balance-sheet and market-risk signals into a simple Low, Medium, or High label."
  },
  {
    "category": "Price and risk",
    "question": "Why can risk be high even if the Eval Score is good?",
    "answer": "A company can have strong growth or momentum but still carry risk from volatility, leverage, valuation, or financial-stability concerns."
  },
  {
    "category": "Price and risk",
    "question": "What does daily change percent mean?",
    "answer": "Daily change percent shows how much the stock price moved during the latest available trading period."
  },
  {
    "category": "Price and risk",
    "question": "Why is the price sometimes delayed?",
    "answer": "Market data can be delayed depending on the data provider and plan being used."
  },
  {
    "category": "Price and risk",
    "question": "What does Low risk mean?",
    "answer": "Low risk means the app currently sees fewer risk signals in the available data."
  },
  {
    "category": "Price and risk",
    "question": "What does Medium risk mean?",
    "answer": "Medium risk means the app sees some risk signals but not enough to classify the stock as high risk."
  },
  {
    "category": "Price and risk",
    "question": "What does High risk mean?",
    "answer": "High risk means the app sees stronger risk signals such as volatility, leverage, valuation pressure, or weaker stability."
  },
  {
    "category": "Price and risk",
    "question": "Is High risk always bad?",
    "answer": "Not always. High-risk stocks can still have strong upside potential, but they may be more volatile or uncertain."
  },
  {
    "category": "Price and risk",
    "question": "Can Risk change over time?",
    "answer": "Yes. Risk can change as market volatility, balance-sheet data, and company conditions change."
  },
  {
    "category": "Price and risk",
    "question": "Why does the Risk card not give a number?",
    "answer": "The Risk card is simplified into a label so users can quickly understand the current risk profile."
  },
  {
    "category": "Price and risk",
    "question": "Can price change affect risk?",
    "answer": "Yes. Large or volatile price movement can affect risk signals."
  },
  {
    "category": "Price and risk",
    "question": "Can financial health affect risk?",
    "answer": "Yes. Debt, liquidity, and balance-sheet stability can influence the risk label."
  },
  {
    "category": "Price and risk",
    "question": "Does risk mean bankruptcy risk?",
    "answer": "Not necessarily. Risk is broader and can include volatility, financial leverage, uncertainty, and valuation pressure."
  },
  {
    "category": "Price and risk",
    "question": "Should I avoid all high-risk stocks?",
    "answer": "Eval does not provide buy or sell advice. High risk simply means users should understand the risk before making decisions."
  },
  {
    "category": "Price and risk",
    "question": "Why can a stable company still have risk?",
    "answer": "Even stable companies can face valuation risk, market volatility, weak momentum, or industry pressure."
  },
  {
    "category": "Price and risk",
    "question": "Where do I see price on mobile?",
    "answer": "The price card appears inside the stock report layout beneath the score and company title area."
  },
  {
    "category": "Price and risk",
    "question": "Where do I see risk on mobile?",
    "answer": "The risk card appears near the price card inside the mobile stock report layout."
  },
  {
    "category": "Price and risk",
    "question": "Why does price say N/A?",
    "answer": "Price can show N/A if the data provider does not return a valid current quote."
  },
  {
    "category": "Price and risk",
    "question": "Can Eval AI explain risk?",
    "answer": "Yes. Ask Eval AI to explain the risk card or why a loaded/watchlist stock has a specific risk label."
  },
  {
    "category": "Watchlist",
    "question": "How do I add a stock to my watchlist?",
    "answer": "Search a ticker, then click the plus button on the report card or add the ticker directly from the Watchlist panel."
  },
  {
    "category": "Watchlist",
    "question": "How many stocks can I save in the watchlist?",
    "answer": "The dashboard watchlist currently supports up to 15 stocks."
  },
  {
    "category": "Watchlist",
    "question": "What does the watchlist ranking mean?",
    "answer": "The watchlist sorts saved stocks by Eval Score so users can quickly see which saved companies currently rank higher."
  },
  {
    "category": "Watchlist",
    "question": "How do I remove a stock from the watchlist?",
    "answer": "Click the trash/delete button next to the ticker in the Watchlist panel."
  },
  {
    "category": "Watchlist",
    "question": "What does the refresh button do on the watchlist?",
    "answer": "The refresh button reloads the saved watchlist stocks and updates their scores when new data is available."
  },
  {
    "category": "Watchlist",
    "question": "Why should I use the watchlist?",
    "answer": "The watchlist lets you track stocks you care about and makes Compare and Eval AI stock questions work better."
  },
  {
    "category": "Watchlist",
    "question": "Can I compare stocks without saving them?",
    "answer": "No. Stocks need to be in your watchlist before they can be selected on the Compare page."
  },
  {
    "category": "Watchlist",
    "question": "Why does Eval AI need watchlist stocks?",
    "answer": "Eval AI uses the watchlist context to answer stock-specific questions with the right data."
  },
  {
    "category": "Watchlist",
    "question": "How is the watchlist sorted?",
    "answer": "The watchlist is generally ranked by Eval Score from strongest to weakest."
  },
  {
    "category": "Watchlist",
    "question": "Why does my watchlist score change?",
    "answer": "Scores can update when data, news sentiment, or cached reports refresh."
  },
  {
    "category": "Watchlist",
    "question": "Can I add the same ticker twice?",
    "answer": "No. The app should avoid duplicate watchlist tickers."
  },
  {
    "category": "Watchlist",
    "question": "What happens when the watchlist is full?",
    "answer": "You need to remove a ticker before adding another one if the list reaches its limit."
  },
  {
    "category": "Watchlist",
    "question": "Why do some watchlist rows show yellow or red rings?",
    "answer": "The ring color reflects that stock\u2019s current Eval Score range."
  },
  {
    "category": "Watchlist",
    "question": "What does the trash icon do?",
    "answer": "The trash icon removes that stock from your watchlist."
  },
  {
    "category": "Watchlist",
    "question": "Can I open a stock from the watchlist?",
    "answer": "Yes. Clicking or selecting a watchlist stock can open its full dashboard report depending on the current layout."
  },
  {
    "category": "Watchlist",
    "question": "Why is Watchlist visible on desktop?",
    "answer": "Desktop has enough space to keep Watchlist beside the main dashboard for quick access."
  },
  {
    "category": "Watchlist",
    "question": "Why is Watchlist in the dropdown on mobile?",
    "answer": "Mobile has less screen width, so Watchlist is moved into the dropdown for cleaner layout."
  },
  {
    "category": "Watchlist",
    "question": "Can watchlist stocks be used in radar charts?",
    "answer": "Yes. Watchlist stocks can be selected for Compare, which includes radar charts."
  },
  {
    "category": "Watchlist",
    "question": "Can I ask Eval AI about my watchlist?",
    "answer": "Yes. Eval AI can explain saved watchlist stocks and help compare their strengths and weaknesses."
  },
  {
    "category": "Watchlist",
    "question": "What if the watchlist does not update?",
    "answer": "Try refreshing the watchlist or reloading the page. Data may also be cached briefly to reduce API usage."
  },
  {
    "category": "Compare",
    "question": "What does Compare do?",
    "answer": "Compare lets users choose 2 to 5 watchlist stocks and view their Eval Scores and category ratings side by side."
  },
  {
    "category": "Compare",
    "question": "How many stocks can I compare?",
    "answer": "You can compare a minimum of 2 stocks and a maximum of 5 stocks at a time."
  },
  {
    "category": "Compare",
    "question": "Why do stocks need to be in my watchlist before comparing?",
    "answer": "Compare uses saved dashboard data, so tickers must be in the watchlist before Eval can compare them."
  },
  {
    "category": "Compare",
    "question": "What does the Compare radar chart show?",
    "answer": "The radar chart shows the selected stocks across the seven Eval categories. Wider shapes generally mean stronger scores across more areas."
  },
  {
    "category": "Compare",
    "question": "Can I hide a stock on the radar chart?",
    "answer": "Yes. Click a ticker label above the radar chart to hide that stock. Click it again to show it."
  },
  {
    "category": "Compare",
    "question": "How do I select stocks to compare?",
    "answer": "Open Compare from the dropdown, check 2 to 5 watchlist stocks, then save the selected stocks."
  },
  {
    "category": "Compare",
    "question": "Why can I not select more than 5 stocks?",
    "answer": "The radar chart becomes hard to read with too many overlays, so Compare is limited to 5 stocks."
  },
  {
    "category": "Compare",
    "question": "Why is the minimum 2 stocks?",
    "answer": "Compare needs at least two stocks to show a meaningful side-by-side comparison."
  },
  {
    "category": "Compare",
    "question": "What are the score rings at the top of Compare?",
    "answer": "They show each selected stock\u2019s overall Eval Score before the radar chart shows category-level differences."
  },
  {
    "category": "Compare",
    "question": "What does a wider radar shape mean?",
    "answer": "A wider shape usually means the stock has stronger category scores across more areas."
  },
  {
    "category": "Compare",
    "question": "What does a narrow radar shape mean?",
    "answer": "A narrow shape usually means weaker category scores or more uneven performance."
  },
  {
    "category": "Compare",
    "question": "Why do two stocks overlap on the radar?",
    "answer": "They may have similar category scores, causing their shapes to land near each other."
  },
  {
    "category": "Compare",
    "question": "Can I compare stocks in the same industry?",
    "answer": "Yes. Comparing within the same industry is often more useful because the companies face similar business conditions."
  },
  {
    "category": "Compare",
    "question": "Can I compare different industries?",
    "answer": "Yes, but the comparison may be less direct because industries naturally have different financial profiles."
  },
  {
    "category": "Compare",
    "question": "How do I change selected stocks?",
    "answer": "Click Change selected stocks at the top of the Compare results page."
  },
  {
    "category": "Compare",
    "question": "What if a stock is missing category data?",
    "answer": "The chart may skip missing points or show a loading state until the report data is available."
  },
  {
    "category": "Compare",
    "question": "Can Eval AI explain a comparison?",
    "answer": "Yes. Ask Eval AI about Compare, the radar chart, or differences between watchlist stocks."
  },
  {
    "category": "Compare",
    "question": "Does Compare choose the better stock for me?",
    "answer": "No. Compare visualizes the data, but it does not make a buy or sell decision."
  },
  {
    "category": "Compare",
    "question": "Why are there different colors in the radar chart?",
    "answer": "Each selected stock receives a different radar color so users can tell the shapes apart."
  },
  {
    "category": "Compare",
    "question": "What should I look at first in Compare?",
    "answer": "Look at the Eval Score rings, then check which stock has the strongest and weakest radar areas."
  },
  {
    "category": "Industry rankings",
    "question": "What is an industry ranking page?",
    "answer": "The industry ranking page compares stocks inside a similar industry group and shows the highest-scoring companies Eval found for that industry."
  },
  {
    "category": "Industry rankings",
    "question": "How do I open an industry page?",
    "answer": "Click the industry name under the company ticker inside the main stock report card."
  },
  {
    "category": "Industry rankings",
    "question": "What does the industry Top 5 mean?",
    "answer": "The Top 5 are the highest-ranked stocks Eval found in that industry based on current Eval Score calculations."
  },
  {
    "category": "Industry rankings",
    "question": "What does the industry radar chart show?",
    "answer": "The industry radar chart plots the Top 5 stocks across the seven Eval categories so users can compare strengths and weaknesses visually."
  },
  {
    "category": "Industry rankings",
    "question": "Can I hide a stock on the industry radar chart?",
    "answer": "Yes. Click the ticker label above the radar chart to hide or show that company."
  },
  {
    "category": "Industry rankings",
    "question": "Why compare stocks by industry?",
    "answer": "Industry comparisons are useful because companies in the same industry often face similar risks, margins, growth patterns, and investor expectations."
  },
  {
    "category": "Industry rankings",
    "question": "What does the rank badge mean?",
    "answer": "The rank badge shows the stock\u2019s position in the industry list, such as 1, 2, 3, 4, or 5."
  },
  {
    "category": "Industry rankings",
    "question": "Why might a famous stock not be number one?",
    "answer": "A well-known company may still rank lower if its current Eval Score is weaker than peers in that industry."
  },
  {
    "category": "Industry rankings",
    "question": "Can industry rankings change?",
    "answer": "Yes. Rankings can change when scores, data, market conditions, or news sentiment update."
  },
  {
    "category": "Industry rankings",
    "question": "Why does the industry page have a description?",
    "answer": "The description helps explain what the industry is and what usually matters for companies in that group."
  },
  {
    "category": "Industry rankings",
    "question": "Why does the industry radar chart use five stocks?",
    "answer": "The chart uses the Top 5 to give a broader peer comparison without becoming unreadable."
  },
  {
    "category": "Industry rankings",
    "question": "Can I click a company on the industry page?",
    "answer": "Yes. Industry cards can open the full dashboard overview for that company."
  },
  {
    "category": "Industry rankings",
    "question": "What if the industry is wrong?",
    "answer": "Industry classification depends on provider data and app mapping. Some companies may need custom classification fixes."
  },
  {
    "category": "Industry rankings",
    "question": "Why does one industry have stronger scores than another?",
    "answer": "Different industries have different growth, profitability, risk, and valuation profiles, so score patterns can vary."
  },
  {
    "category": "Industry rankings",
    "question": "What does a strong industry radar shape mean?",
    "answer": "It means the stock scores well across multiple category areas compared with peers."
  },
  {
    "category": "Industry rankings",
    "question": "What if the radar chart says loading?",
    "answer": "That means category data for the Top 5 stocks is still being fetched or cached."
  },
  {
    "category": "Industry rankings",
    "question": "Can I use industry rankings to find peers?",
    "answer": "Yes. Industry rankings help identify stocks that may be useful for comparison."
  },
  {
    "category": "Industry rankings",
    "question": "Are industry rankings investment advice?",
    "answer": "No. They are educational rankings based on Eval scoring data."
  },
  {
    "category": "Industry rankings",
    "question": "Why are only some stocks shown?",
    "answer": "The page focuses on a limited Top 5 so the ranking and radar chart remain readable."
  },
  {
    "category": "Industry rankings",
    "question": "Can Eval AI explain industry rankings?",
    "answer": "Yes. Ask Eval AI how industry pages work or what the ranking/radar chart means."
  },
  {
    "category": "News sentiment",
    "question": "What is News Sentiment?",
    "answer": "News Sentiment uses recent stock-related articles to estimate whether the latest news appears positive, neutral, or negative for the company."
  },
  {
    "category": "News sentiment",
    "question": "What do the news cards show?",
    "answer": "News cards show recent article topics, impact weighting, sentiment score, and a short explanation of why the article matters."
  },
  {
    "category": "News sentiment",
    "question": "What does Read article do?",
    "answer": "Read article opens the original article source when a valid article link is available."
  },
  {
    "category": "News sentiment",
    "question": "Why can news sentiment change?",
    "answer": "News sentiment can change when newer headlines replace older ones or when the latest articles are more positive or negative."
  },
  {
    "category": "News sentiment",
    "question": "How many articles does Eval use?",
    "answer": "Eval focuses on recent relevant articles and summarizes the most important news signals when available."
  },
  {
    "category": "News sentiment",
    "question": "What does bullish mean?",
    "answer": "Bullish means the recent news appears more positive for the stock."
  },
  {
    "category": "News sentiment",
    "question": "What does bearish mean?",
    "answer": "Bearish means the recent news appears more negative for the stock."
  },
  {
    "category": "News sentiment",
    "question": "What does neutral mean?",
    "answer": "Neutral means the news is mixed or not clearly positive or negative."
  },
  {
    "category": "News sentiment",
    "question": "Why can a news article score low?",
    "answer": "An article may score low if it highlights risk, weakness, uncertainty, poor performance, or negative market reaction."
  },
  {
    "category": "News sentiment",
    "question": "Why can a news article score high?",
    "answer": "An article may score high if it highlights growth, strong demand, positive earnings, partnerships, or favorable business developments."
  },
  {
    "category": "News sentiment",
    "question": "What is impact weight?",
    "answer": "Impact weight estimates how much a specific news item matters relative to the other recent articles."
  },
  {
    "category": "News sentiment",
    "question": "Can unrelated articles affect sentiment?",
    "answer": "The app tries to focus on relevant articles, but some news sources may still return broader market or sector stories."
  },
  {
    "category": "News sentiment",
    "question": "Why is a competitor mentioned in news sentiment?",
    "answer": "Sometimes articles mention competitors or the broader sector. Eval attempts to judge how relevant that is to the selected stock."
  },
  {
    "category": "News sentiment",
    "question": "Can news sentiment move the total Eval Score?",
    "answer": "Yes. News Sentiment is one category and can affect the overall score, but it is not the only factor."
  },
  {
    "category": "News sentiment",
    "question": "Why does news sentiment not match price movement?",
    "answer": "News and price can disagree. The market may react to other factors, or price may have already reflected the news."
  },
  {
    "category": "News sentiment",
    "question": "Can I use news sentiment alone?",
    "answer": "It is better to use it alongside growth, profitability, valuation, financial health, momentum, and risk."
  },
  {
    "category": "News sentiment",
    "question": "Does Eval write the news articles?",
    "answer": "No. Eval summarizes and scores articles from external news sources when links are available."
  },
  {
    "category": "News sentiment",
    "question": "Why do some stocks have no news sentiment?",
    "answer": "Some tickers may have limited recent news or missing article data from the provider."
  },
  {
    "category": "News sentiment",
    "question": "Can Eval AI explain news sentiment?",
    "answer": "Yes. Eval AI can explain the News Sentiment section for a loaded or watchlist stock."
  },
  {
    "category": "News sentiment",
    "question": "How should I read the news section?",
    "answer": "Start with the overall sentiment score, then scan the individual article cards and impact weights."
  },
  {
    "category": "Eval AI",
    "question": "What can Eval AI answer?",
    "answer": "Eval AI can answer support questions about the app, navigation, dashboard features, metrics, compare, watchlist, industry pages, news sentiment, and loaded or watchlist-saved stocks."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI answer anything?",
    "answer": "No. Eval AI is limited to Eval app support and stock questions tied to the current dashboard or the user\u2019s watchlist."
  },
  {
    "category": "Eval AI",
    "question": "Why will Eval AI not answer a specific stock question?",
    "answer": "Specific stock questions require that ticker to be loaded on the dashboard or saved in the watchlist first."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI help users navigate?",
    "answer": "Yes. Eval AI is meant to act like a support agent and explain where features are, what buttons do, and how to use the app."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI explain the dashboard?",
    "answer": "Yes. Ask it what each dashboard section means or how to use the ticker search, score card, news section, or watchlist."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI explain metrics?",
    "answer": "Yes. It can explain Growth, Profitability, Financial Health, Valuation, Momentum, Pullback, and News Sentiment."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI explain Compare?",
    "answer": "Yes. It can explain how to select stocks, read score rings, and interpret the radar chart."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI explain Watchlist?",
    "answer": "Yes. It can explain how to add, remove, refresh, rank, and use watchlist stocks."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI explain industry pages?",
    "answer": "Yes. It can explain industry rankings, Top 5 cards, and the industry radar chart."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI answer support questions?",
    "answer": "Yes. It should behave like a support agent for the Eval web app."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI give financial advice?",
    "answer": "No. Eval AI can explain data and app features, but it should not give buy, sell, or hold commands."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI answer coding questions?",
    "answer": "No. It is limited to Eval app support and Eval stock dashboard questions."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI explain why a stock has a score?",
    "answer": "Yes, if the stock is loaded on the dashboard or saved in the watchlist."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI compare two watchlist stocks?",
    "answer": "Yes. It can explain differences using watchlist context, but the Compare page is better for visual analysis."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI answer questions about a stock not in my watchlist?",
    "answer": "Only if that stock is currently loaded on the dashboard. Otherwise, add it to the watchlist first."
  },
  {
    "category": "Eval AI",
    "question": "Why is Eval AI short with answers?",
    "answer": "It is designed to give quick, clear answers inside the dashboard instead of long essays."
  },
  {
    "category": "Eval AI",
    "question": "What should I ask Eval AI first?",
    "answer": "Try asking: \u201cHow do I use Compare?\u201d or \u201cWhy is this stock\u2019s valuation score low?\u201d"
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI explain colors?",
    "answer": "Yes. It can explain what green, yellow, and red mean across score rings and metric bars."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI help with FAQs?",
    "answer": "Yes. It can answer similar support questions, while the FAQs page provides searchable prewritten answers."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI open pages for me?",
    "answer": "It can explain where to click, but users still need to click the app navigation buttons themselves."
  },
  {
    "category": "Account",
    "question": "Why do I need to sign in?",
    "answer": "Signing in protects user access and allows features like profile, watchlist, and saved dashboard experience to work properly."
  },
  {
    "category": "Account",
    "question": "Who handles sign-in?",
    "answer": "Eval uses Clerk for secure sign-in, verification, session handling, and account access."
  },
  {
    "category": "Account",
    "question": "What if the verification code does not arrive?",
    "answer": "Wait for the resend timer, then request another code. Also check that the email or phone method shown by Clerk is correct."
  },
  {
    "category": "Account",
    "question": "What is Clerk?",
    "answer": "Clerk is the authentication system used to manage secure sign-in and account sessions."
  },
  {
    "category": "Account",
    "question": "Why is there a verification code?",
    "answer": "Verification helps confirm that the account belongs to the user and protects access."
  },
  {
    "category": "Account",
    "question": "Why is there a resend timer?",
    "answer": "The resend timer prevents repeated code requests too quickly and helps protect account security."
  },
  {
    "category": "Account",
    "question": "Can I change my profile picture?",
    "answer": "Profile options are handled through the Clerk profile popup when available."
  },
  {
    "category": "Account",
    "question": "Why does the profile popup appear?",
    "answer": "The profile popup lets users view or manage account-related information through Clerk."
  },
  {
    "category": "Account",
    "question": "What happens if I sign out?",
    "answer": "You will need to sign back in before using protected dashboard features again."
  },
  {
    "category": "Account",
    "question": "Does Eval store my password?",
    "answer": "Authentication is handled by Clerk, so Eval does not directly manage user passwords in the app interface."
  },
  {
    "category": "Account",
    "question": "Why does Eval have Terms & Conditions?",
    "answer": "Terms explain the rules, limitations, and educational nature of the app."
  },
  {
    "category": "Account",
    "question": "Do I need to accept terms?",
    "answer": "The app can require terms acceptance before allowing full dashboard access."
  },
  {
    "category": "Account",
    "question": "Why does the dashboard show my name?",
    "answer": "The dashboard uses account information from the signed-in user profile."
  },
  {
    "category": "Account",
    "question": "Can I use Eval without signing in?",
    "answer": "Some public pages may be viewable, but dashboard functionality generally requires signing in."
  },
  {
    "category": "Account",
    "question": "What if sign-in fails?",
    "answer": "Check your code, internet connection, and Clerk prompts. Then try again or use the Contact page if issues continue."
  },
  {
    "category": "Account",
    "question": "What if I forgot my password?",
    "answer": "Use Clerk\u2019s recovery or reset flow if it is available on the sign-in screen."
  },
  {
    "category": "Account",
    "question": "Why does the profile glow appear?",
    "answer": "The profile display is part of the app\u2019s visual design around the user account area."
  },
  {
    "category": "Account",
    "question": "Is my watchlist tied to my account?",
    "answer": "The app is designed so watchlist and user-specific dashboard behavior can be connected to the signed-in user."
  },
  {
    "category": "Account",
    "question": "Can multiple users have different watchlists?",
    "answer": "Yes. Each signed-in user can have their own dashboard state and saved tickers when connected properly."
  },
  {
    "category": "Account",
    "question": "Where do I find account support?",
    "answer": "Use the Contact page or ask Eval AI where account and support options are located."
  },
  {
    "category": "Troubleshooting",
    "question": "Why is a metric N/A?",
    "answer": "A metric can show N/A when the required data is missing, unavailable, delayed, or not returned by the data provider for that ticker."
  },
  {
    "category": "Troubleshooting",
    "question": "Why does a stock take time to load?",
    "answer": "Eval may be pulling market data, company data, news, rankings, and AI summaries. Some requests can take longer depending on the provider."
  },
  {
    "category": "Troubleshooting",
    "question": "Why does the radar chart say data is loading?",
    "answer": "That usually means the full category data for the selected stocks has not finished loading or caching yet."
  },
  {
    "category": "Troubleshooting",
    "question": "Why is the app educational only?",
    "answer": "Eval explains company data and scores, but it does not provide licensed financial advice or guaranteed investment recommendations."
  },
  {
    "category": "Troubleshooting",
    "question": "Why did the app not find my ticker?",
    "answer": "The ticker may be invalid, unsupported, delisted, misspelled, or unavailable from the data provider."
  },
  {
    "category": "Troubleshooting",
    "question": "Why does the page look different on mobile?",
    "answer": "The mobile layout is optimized for portrait screens, so some sections stack vertically or move into the dropdown."
  },
  {
    "category": "Troubleshooting",
    "question": "Why can I not scroll enough on mobile?",
    "answer": "If a section feels cut off, refresh the page and keep the device in portrait mode. The layout is built for vertical scrolling."
  },
  {
    "category": "Troubleshooting",
    "question": "Why are scores different after refresh?",
    "answer": "Refreshing can pull updated data or use a newer cached report."
  },
  {
    "category": "Troubleshooting",
    "question": "Why is news sentiment missing?",
    "answer": "News sentiment may be missing if no recent relevant articles are returned for that ticker."
  },
  {
    "category": "Troubleshooting",
    "question": "Why is industry ranking missing?",
    "answer": "Industry ranking may be unavailable if the app cannot classify the ticker or load enough peer companies."
  },
  {
    "category": "Troubleshooting",
    "question": "Why does the chart look empty?",
    "answer": "A chart can look empty when the underlying category scores are not loaded yet."
  },
  {
    "category": "Troubleshooting",
    "question": "Why does Compare not let me save?",
    "answer": "You need to select at least 2 and no more than 5 watchlist stocks."
  },
  {
    "category": "Troubleshooting",
    "question": "Why is Contact hidden on mobile?",
    "answer": "The dropdown is designed to appear above dashboard content. If it still hides, refresh after applying the latest styles."
  },
  {
    "category": "Troubleshooting",
    "question": "Why does the website cache scores?",
    "answer": "Caching reduces API calls, improves speed, and helps prevent provider rate-limit issues."
  },
  {
    "category": "Troubleshooting",
    "question": "Why might Finnhub data be limited?",
    "answer": "Free or lower-tier data plans can have limits, delays, missing fields, or rate limits."
  },
  {
    "category": "Troubleshooting",
    "question": "What should I do if the app is blank?",
    "answer": "Refresh the page, check deployment status, and make sure the latest frontend and backend files were uploaded."
  },
  {
    "category": "Troubleshooting",
    "question": "Why does AI not answer?",
    "answer": "Eval AI may need the OpenAI key connected, or the question may be outside the allowed Eval support/watchlist scope."
  },
  {
    "category": "Troubleshooting",
    "question": "Why does a button do nothing?",
    "answer": "The feature may need data first. For example, Compare needs watchlist stocks before it can compare."
  },
  {
    "category": "Troubleshooting",
    "question": "Why is the score ring color wrong?",
    "answer": "Score colors come from the app\u2019s thresholds and CSS. Refresh after deploying updated style files."
  },
  {
    "category": "Troubleshooting",
    "question": "What should I report to support?",
    "answer": "Send the page, ticker, what you clicked, what you expected, and what actually happened."
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

  const shownFaqs = normalized ? filteredFaqs : filteredFaqs.slice(0, 24);

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
            Search common questions about the dashboard, score rings, metrics, watchlist, compare,
            industry rankings, news sentiment, Eval AI, and account basics.
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
            Type in the search box to instantly search all {EVAL_FAQS.length} FAQs.
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
        "If you submit questions, ticker lists, feedback, suggestions, messages, or other content, you represent that you have the right to submit it and that it does not violate law or third-party rights. You grant Eval a license to use that content to operate, improve, secure, and support the service.",
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
        "Ask for help using Eval: navigation, dashboard, metrics, news sentiment, compare, watchlist, or saved-watchlist stock questions.",
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
            <h2>Ask about this Eval report.</h2>
            <p>
              Compare stocks, understand metrics, ask about risk, or get a
              beginner-friendly breakdown before making a decision.
            </p>

        <section className="ai-rules-card ai-rules-card-full">
          <div className="ai-rules-eyebrow">What Eval AI can answer</div>
          <h3>Ask Eval AI for app support, navigation help, and watchlist-stock explanations.</h3>

          <div className="ai-rules-grid ai-rules-grid-brief">
            <div>
              <strong>Watchlist stock questions</strong>
              <p>Specific stock questions work when the ticker is loaded on your dashboard or saved in your watchlist.</p>
            </div>

            <div>
              <strong>Score and metric help</strong>
              <p>Ask why a score is high or low, what a category means, or how to read the metric popups and news sentiment.</p>
            </div>

            <div>
              <strong>Using Eval</strong>
              <p>Ask how to navigate pages, use the dropdown, search tickers, add/remove stocks, refresh the watchlist, compare stocks, open industry rankings, or understand each dashboard section.</p>
            </div>
          </div>

          <p className="ai-rules-note">Eval AI stays focused on the Eval website and stock-evaluation workflow. It will not answer unrelated questions.</p>
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
              placeholder="Ask for Eval support: navigation, dashboard, metrics, news sentiment, compare, watchlist, or a stock saved in your watchlist."
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
