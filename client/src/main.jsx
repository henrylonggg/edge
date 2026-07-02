import React, { useEffect, useMemo, useRef, useState } from "react";
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
  PieChart,
  LineChart,
  Zap,
  BrainCircuit,
  Crown,
  CheckCircle2,
  Star,
  AlertTriangle,
  Gauge,
  Settings as SettingsIcon,
  Coffee,
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
  X,
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

// Disabled because the custom DOM observer can freeze Clerk verification screens.
// installClerkResend60Guard();

/*
  HARD-CODED RENDER BACKEND URL
  This avoids Vercel environment variable problems.
*/
const API = "https://edge-1-6dtw.onrender.com";
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const STORAGE_KEY = "edge-watchlist-v8";
const TERMS_VERSION = "2026-05-30";
const MAX_WATCHLIST_ITEMS = 10;
const DASHBOARD_START_STORAGE_KEY = "eval-dashboard-start-tab-v1";
const PIE_THEME_STORAGE_KEY = "eval-main-pie-theme-v1";
const MOBILE_NAV_LEFT_STORAGE_KEY = "eval-mobile-nav-left-v1";
const MOBILE_NAV_RIGHT_STORAGE_KEY = "eval-mobile-nav-right-v1";
const MOBILE_NAV_SECOND_LEFT_STORAGE_KEY = "eval-mobile-nav-second-left-v1";
const MOBILE_NAV_SECOND_RIGHT_STORAGE_KEY = "eval-mobile-nav-second-right-v1";
const MOBILE_NAV_ARROW_COLOR_STORAGE_KEY = "eval-mobile-nav-arrow-color-v1";
const MOBILE_SEARCH_TARGET_STORAGE_KEY = "eval-mobile-search-target-v1";
const MOBILE_HOME_TARGET_STORAGE_KEY = "eval-mobile-home-target-v1";
const LANDING_LOGO_COLOR_STORAGE_KEY = "eval-landing-logo-color-v1";
const ANALYSIS_LOCAL_CACHE_PREFIX = "eval-analysis-cache-v1:";
const ANALYSIS_LOCAL_CACHE_MS = 24 * 60 * 60 * 1000;

function analysisCacheKey(symbol) {
  return `${ANALYSIS_LOCAL_CACHE_PREFIX}${String(symbol || "").trim().toUpperCase()}`;
}

function readLocalAnalysis(symbol) {
  try {
    const raw = localStorage.getItem(analysisCacheKey(symbol));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data || !parsed?.savedAt) return null;
    if (Date.now() - Number(parsed.savedAt) > ANALYSIS_LOCAL_CACHE_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function saveLocalAnalysis(symbol, data) {
  try {
    if (!symbol || !data) return;
    localStorage.setItem(analysisCacheKey(symbol), JSON.stringify({ savedAt: Date.now(), data }));
  } catch {}
}


const DASHBOARD_START_OPTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "portfolio", label: "Portfolio" },
  { key: "morningBrew", label: "The Morning Mug" },
  { key: "watchlist", label: "Watchlist" },
];

const MAIN_PIE_THEME_OPTIONS = [
  { key: "pulse", label: "Pulse Ring" },
];

const MOBILE_NAV_SHORTCUT_OPTIONS = [
  { key: "watchlist", label: "Watchlist" },
  { key: "settings", label: "Settings" },
  { key: "search", label: "Search" },
  { key: "assistant", label: "Eval AI" },
  { key: "portfolio", label: "Portfolio" },
  { key: "morningBrew", label: "The Morning Mug" },
  { key: "tickerLookup", label: "Ticker Lookup" },
];

const NAV_HOME_GRADIENT_PRESETS = [
  { key: "greenblue", label: "Green / Blue", gradient: "linear-gradient(135deg, #7CFF6B 0%, #19E6FF 100%)", icon: "#19E6FF" },
  { key: "yelloworange", label: "Yellow / Orange", gradient: "linear-gradient(135deg, #FFE66D 0%, #FF9F1C 100%)", icon: "#FFB21C" },
  { key: "redorange", label: "Red / Orange", gradient: "linear-gradient(135deg, #FF4D6D 0%, #FF9F1C 100%)", icon: "#FF6A3D" },
];

function normalizeNavHomeColor(value) {
  const raw = String(value || "").trim();
  if (NAV_HOME_GRADIENT_PRESETS.some((preset) => preset.key === raw)) return raw;
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;
  return "greenblue";
}

function getNavHomeGradient(value) {
  const preset = NAV_HOME_GRADIENT_PRESETS.find((item) => item.key === value);
  return preset?.gradient || value || NAV_HOME_GRADIENT_PRESETS[0].gradient;
}

function getNavIconColor(value) {
  const preset = NAV_HOME_GRADIENT_PRESETS.find((item) => item.key === value);
  return preset?.icon || value || "#19E6FF";
}

const LOGO_COLOR_PRESETS = [
  "#9f5cff", "#7d4dff", "#6d28d9", "#8b5cf6", "#a855f7", "#b56cff",
  "#c084fc", "#d946ef", "#ff2bd6", "#ec4899", "#f43f5e", "#ff5f73",
  "#ef4444", "#dc2626", "#b91c1c", "#fb7185", "#f97316", "#ea580c",
  "#ff9f1c", "#f59e0b", "#fbbf24", "#ffd66b", "#eab308", "#ca8a04",
  "#85d713", "#a3e635", "#65a30d", "#22c55e", "#16a34a", "#32ff7e",
  "#10b981", "#059669", "#14b8a6", "#0d9488", "#4dffdf", "#15e7ff",
  "#06b6d4", "#0891b2", "#38bdf8", "#00b7ff", "#3b82f6", "#2563eb",
  "#1d4ed8", "#60a5fa", "#6366f1", "#4f46e5", "#818cf8", "#c7d2fe",
  "#f8fafc", "#ffffff", "#e5e7eb", "#cbd5e1", "#94a3b8", "#64748b",
  "#334155", "#111827", "#020617", "#000000"
];

function rawScore(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return null;
  const n = Number(v);
  return n <= 10 ? n : n / 10;
}

function score10(v) {
  const n = rawScore(v);
  return n === null ? null : Number(n.toFixed(1));
}

function scoreDisplay99(v) {
  const n = score10(v);
  if (n === null) return null;
  return Math.max(0, Math.min(99, Math.round(n * 10)));
}

function scoreText(v) {
  const n = scoreDisplay99(v);
  return n === null ? "N/A" : String(n);
}

function signedMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "N/A";
  const abs = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n >= 0 ? "+" : "-"}$${abs}`;
}

function signedPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "N/A";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function holdingCostBasisValue(holding) {
  const explicit = Number(holding?.costBasisDollars);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const shares = Number(holding?.shares);
  const averageCost = Number(holding?.averageCost ?? holding?.avgCost);
  if (Number.isFinite(shares) && shares > 0 && Number.isFinite(averageCost) && averageCost > 0) return shares * averageCost;
  return null;
}

function holdingCurrentValue(holding) {
  const explicit = Number(holding?.holdingDollars ?? holding?.currentValue);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const shares = Number(holding?.shares);
  const price = Number(holding?.price ?? holding?.currentPrice);
  if (Number.isFinite(shares) && shares > 0 && Number.isFinite(price) && price > 0) return shares * price;
  return null;
}

function holdingDollarChangeValue(holding) {
  const explicit = Number(holding?.dollarChange ?? holding?.returnDollars);
  const current = holdingCurrentValue(holding);
  const cost = holdingCostBasisValue(holding);
  const calculated = Number.isFinite(current) && Number.isFinite(cost) && cost > 0 ? current - cost : null;
  if (Number.isFinite(calculated) && Math.abs(calculated) > 0.004) return calculated;
  if (Number.isFinite(explicit) && Math.abs(explicit) > 0.004) return explicit;
  if (Number.isFinite(calculated)) return calculated;
  return Number.isFinite(explicit) ? explicit : null;
}

function holdingReturnPercentValue(holding) {
  const explicit = Number(holding?.returnPercent);
  const change = holdingDollarChangeValue(holding);
  const cost = holdingCostBasisValue(holding);
  const calculated = Number.isFinite(change) && Number.isFinite(cost) && cost > 0 ? (change / cost) * 100 : null;
  if (Number.isFinite(calculated) && Math.abs(calculated) > 0.004) return calculated;
  if (Number.isFinite(explicit) && Math.abs(explicit) > 0.004) return explicit;
  return Number.isFinite(calculated) ? calculated : (Number.isFinite(explicit) ? explicit : null);
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

function isLiveWebSocketSymbol(symbol) {
  // Dashboard websocket now follows exactly one actively loaded ticker.
  // The watchlist does not subscribe to websockets, which keeps usage low.
  return Boolean(String(symbol || "").trim());
}

function websocketUrlForSymbols(symbols = []) {
  const clean = [...new Set((Array.isArray(symbols) ? symbols : [symbols]).map((s) => String(s || "").trim().toUpperCase()).filter(Boolean))];
  if (!clean.length) return null;
  try {
    const url = new URL(API);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws/quotes";
    url.search = `?symbols=${encodeURIComponent(clean.join(","))}`;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeLivePacket(packet = {}, fallbackSymbol = "") {
  const symbol = String(packet.symbol || fallbackSymbol || "").trim().toUpperCase();
  const price = Number(packet.price ?? packet.current ?? packet.c);
  const previousClose = Number(packet.previousClose ?? packet.pc ?? packet.previous_close ?? packet.previous_close_price);
  const rawChange = Number(packet.change ?? packet.d ?? packet.day_change ?? packet.change_price);
  const change = Number.isFinite(price) && Number.isFinite(previousClose) ? price - previousClose : NaN;
  const changePercent = Number.isFinite(change) && Number.isFinite(previousClose) && previousClose > 0 ? (change / previousClose) * 100 : NaN;
  return {
    symbol,
    current: Number.isFinite(price) ? price : null,
    previousClose: Number.isFinite(previousClose) ? previousClose : null,
    change: Number.isFinite(change) ? change : null,
    changePercent: Number.isFinite(changePercent) ? changePercent : null,
    timestamp: packet.timestamp || Date.now(),
    source: packet.source || "Twelve Data WebSocket",
  };
}
const CLIENT_CHART_CACHE = new Map();
const CLIENT_LIVE_QUOTE_CACHE = new Map();
const CLIENT_SPARKLINE_CACHE = new Map();
const CLIENT_CHART_TTL_MS = 10 * 60 * 1000;
const CLIENT_LIVE_QUOTE_TTL_MS = 15 * 60 * 1000;
const CLIENT_SPARKLINE_TTL_MS = 10 * 60 * 1000;

function readClientTimedCache(map, key) {
  const hit = map.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  if (hit) map.delete(key);
  return undefined;
}

function writeClientTimedCache(map, key, value, ttl) {
  map.set(key, { value, expiresAt: Date.now() + ttl });
  if (map.size > 250) map.delete(map.keys().next().value);
  return value;
}

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

const EVAL_CATEGORY_KEYS = ["growth", "profitability", "financialHealth", "valuation", "momentum", "pullback"];
const EVAL_CATEGORY_KEY_SET = new Set(EVAL_CATEGORY_KEYS);

function categoryLabel(key) {
  return (
    {
      growth: "Growth",
      profitability: "Profitability",
      financialHealth: "Financial Health",
      valuation: "Valuation",
      momentum: "Momentum",
      pullback: "Pullback",
    }[key] || key
  );
}

function cleanEvalCategories(categories = {}) {
  return EVAL_CATEGORY_KEYS.reduce((acc, key) => {
    if (categories?.[key] !== undefined) acc[key] = categories[key];
    return acc;
  }, {});
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


function safeStorageGet(key, fallback = "") {
  try {
    if (typeof window === "undefined" || !window.localStorage) return fallback;
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function safeStorageSet(key, value) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  } catch {}
}

function App() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [symbol, setSymbol] = useState("");
  const [data, setData] = useState(null);
  const [portfolioDetailData, setPortfolioDetailData] = useState(null);
  const [portfolioDetailLoading, setPortfolioDetailLoading] = useState(false);
  const [portfolioDetailError, setPortfolioDetailError] = useState("");
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tickerInputLocked, setTickerInputLocked] = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("landing");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [sectorPage, setIndustryPage] = useState(null);
  const [sectorLoading, setIndustryLoading] = useState(false);
  const [sectorError, setIndustryError] = useState("");
  const [compareLeft, setCompareLeft] = useState("");
  const [compareRight, setCompareRight] = useState("");
  const [compareData, setCompareData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState("");
  const [compareSelected, setCompareSelected] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [otherMenuOpen, setOtherMenuOpen] = useState(false);
  const [tickerLookupOpen, setTickerLookupOpen] = useState(false);
  const [tickerLookupQuery, setTickerLookupQuery] = useState("");
  const [tickerLookupResults, setTickerLookupResults] = useState([]);
  const [tickerLookupLoading, setTickerLookupLoading] = useState(false);
  const [tickerLookupError, setTickerLookupError] = useState("");
  const [syncStatus, setSyncStatus] = useState("idle");
  const [showMorningMug, setShowMorningMug] = useState(() => isTheMorningMugWindow());
  const [preferredDashboardStart, setPreferredDashboardStart] = useState(() => {
    const saved = safeStorageGet(DASHBOARD_START_STORAGE_KEY, "dashboard");
    return DASHBOARD_START_OPTIONS.some((option) => option.key === saved) ? saved : "dashboard";
  });
  const [mainPieTheme, setMainPieTheme] = useState(() => {
    const saved = safeStorageGet(PIE_THEME_STORAGE_KEY, "pulse");
    return MAIN_PIE_THEME_OPTIONS.some((option) => option.key === saved) ? saved : "pulse";
  });
  const [mobileNavLeft, setMobileNavLeft] = useState(() => {
    const saved = safeStorageGet(MOBILE_NAV_LEFT_STORAGE_KEY, "watchlist");
    return MOBILE_NAV_SHORTCUT_OPTIONS.some((option) => option.key === saved) ? saved : "watchlist";
  });
  const [mobileNavRight, setMobileNavRight] = useState(() => {
    const saved = safeStorageGet(MOBILE_NAV_RIGHT_STORAGE_KEY, "assistant");
    return MOBILE_NAV_SHORTCUT_OPTIONS.some((option) => option.key === saved) ? saved : "assistant";
  });
  const [mobileNavSecondLeft, setMobileNavSecondLeft] = useState(() => {
    const saved = safeStorageGet(MOBILE_NAV_SECOND_LEFT_STORAGE_KEY, "settings");
    return MOBILE_NAV_SHORTCUT_OPTIONS.some((option) => option.key === saved) ? saved : "settings";
  });
  const [mobileNavSecondRight, setMobileNavSecondRight] = useState(() => {
    const saved = safeStorageGet(MOBILE_NAV_SECOND_RIGHT_STORAGE_KEY, "portfolio");
    return MOBILE_NAV_SHORTCUT_OPTIONS.some((option) => option.key === saved) ? saved : "portfolio";
  });
  const [mobileNavArrowColor, setMobileNavArrowColor] = useState(() => {
    const saved = safeStorageGet(MOBILE_NAV_ARROW_COLOR_STORAGE_KEY, "#151826");
    return /^#[0-9a-f]{6}$/i.test(saved) ? saved : "#151826";
  });
  const mobileSearchTarget = "dashboard";
  const [mobileHomeTarget, setMobileHomeTarget] = useState(() => {
    const saved = safeStorageGet(MOBILE_HOME_TARGET_STORAGE_KEY, "dashboard");
    return DASHBOARD_START_OPTIONS.some((option) => option.key === saved) ? saved : "dashboard";
  });
  const [landingLogoColor, setLandingLogoColor] = useState(() => {
    const saved = safeStorageGet(LANDING_LOGO_COLOR_STORAGE_KEY, "greenblue");
    return normalizeNavHomeColor(saved);
  });
  const viewHistoryRef = useRef([]);
  const forwardHistoryRef = useRef([]);
  const autoAnalyzeLastRef = useRef("");

  useEffect(() => {
    const update = () => setShowMorningMug(isTheMorningMugWindow());
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, []);

  function getSyncUserKey() {
    const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";
    return String(email || user?.id || "").trim().toLowerCase();
  }

  function readJsonStorage(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function getLocalPortfolioSyncRecord() {
    const key = portfolioStorageKeyFor(user);
    const saved = readJsonStorage(key, null);
    return saved && typeof saved === "object" ? saved : null;
  }

  function applyPortfolioSyncRecord(record) {
    const key = portfolioStorageKeyFor(user);
    try {
      if (record && typeof record === "object") {
        localStorage.setItem(key, JSON.stringify(record));
      }
    } catch {
      // Account sync should never break the dashboard if storage is blocked.
    }
    window.dispatchEvent(new CustomEvent("eval-portfolio-sync-imported", { detail: { storageKey: key } }));
  }

  function portfolioRecordTime(record) {
    if (!record || typeof record !== "object") return 0;
    return Math.max(
      Date.parse(record.savedAt || "") || 0,
      Date.parse(record.updatedAt || "") || 0,
      Date.parse(record.display?.savedAt || "") || 0
    );
  }

  function getLocalPortfolioRecordTime() {
    return portfolioRecordTime(getLocalPortfolioSyncRecord());
  }


  function getLocalSyncPayload() {
    return {
      version: 4,
      syncScope: "account",
      watchlist: readWatchlist(),
      alertsSeen: safeStorageGet("eval-morning-mugs-alerts-seen", ""),
      settings: {
        dashboardStart: safeStorageGet(DASHBOARD_START_STORAGE_KEY, "dashboard"),
        mobileNavLeft: safeStorageGet(MOBILE_NAV_LEFT_STORAGE_KEY, "watchlist"),
        mobileNavRight: safeStorageGet(MOBILE_NAV_RIGHT_STORAGE_KEY, "assistant"),
        mobileNavSecondLeft: safeStorageGet(MOBILE_NAV_SECOND_LEFT_STORAGE_KEY, "settings"),
        mobileNavSecondRight: safeStorageGet(MOBILE_NAV_SECOND_RIGHT_STORAGE_KEY, "portfolio"),
        mobileNavArrowColor: safeStorageGet(MOBILE_NAV_ARROW_COLOR_STORAGE_KEY, "#151826"),
        mobileHomeTarget: safeStorageGet(MOBILE_HOME_TARGET_STORAGE_KEY, "dashboard"),
        navHomeColor: safeStorageGet(LANDING_LOGO_COLOR_STORAGE_KEY, "#9f5cff"),
      },
      portfolio: getLocalPortfolioSyncRecord(),
      syncedAt: new Date().toISOString(),
    };
  }

  function applyRemoteSyncData(remote) {
    if (!remote || typeof remote !== "object") return false;
    let changed = false;

    if (Array.isArray(remote.watchlist)) {
      const cleanWatchlist = remote.watchlist
        .map((item) => ({ ...item, symbol: String(item?.symbol || item?.ticker || "").toUpperCase() }))
        .filter((item) => item.symbol)
        .slice(0, MAX_WATCHLIST_ITEMS);
      saveWatchlist(cleanWatchlist);
      setWatchlist(cleanWatchlist);
      changed = true;
    }

    if (remote.alertsSeen) {
      safeStorageSet("eval-morning-mugs-alerts-seen", remote.alertsSeen);
      changed = true;
    }

    const settings = remote.settings && typeof remote.settings === "object" ? remote.settings : {};
    if (settings.dashboardStart && DASHBOARD_START_OPTIONS.some((option) => option.key === settings.dashboardStart)) {
      setPreferredDashboardStart(settings.dashboardStart);
      safeStorageSet(DASHBOARD_START_STORAGE_KEY, settings.dashboardStart);
      changed = true;
    }
    if (settings.mobileNavLeft && MOBILE_NAV_SHORTCUT_OPTIONS.some((option) => option.key === settings.mobileNavLeft)) {
      setMobileNavLeft(settings.mobileNavLeft);
      safeStorageSet(MOBILE_NAV_LEFT_STORAGE_KEY, settings.mobileNavLeft);
      changed = true;
    }
    if (settings.mobileNavRight && MOBILE_NAV_SHORTCUT_OPTIONS.some((option) => option.key === settings.mobileNavRight)) {
      setMobileNavRight(settings.mobileNavRight);
      safeStorageSet(MOBILE_NAV_RIGHT_STORAGE_KEY, settings.mobileNavRight);
      changed = true;
    }
    if (settings.mobileNavSecondLeft && MOBILE_NAV_SHORTCUT_OPTIONS.some((option) => option.key === settings.mobileNavSecondLeft)) {
      setMobileNavSecondLeft(settings.mobileNavSecondLeft);
      safeStorageSet(MOBILE_NAV_SECOND_LEFT_STORAGE_KEY, settings.mobileNavSecondLeft);
      changed = true;
    }
    if (settings.mobileNavSecondRight && MOBILE_NAV_SHORTCUT_OPTIONS.some((option) => option.key === settings.mobileNavSecondRight)) {
      setMobileNavSecondRight(settings.mobileNavSecondRight);
      safeStorageSet(MOBILE_NAV_SECOND_RIGHT_STORAGE_KEY, settings.mobileNavSecondRight);
      changed = true;
    }
    if (settings.mobileNavArrowColor && /^#[0-9a-f]{6}$/i.test(String(settings.mobileNavArrowColor))) {
      setMobileNavArrowColor(String(settings.mobileNavArrowColor));
      safeStorageSet(MOBILE_NAV_ARROW_COLOR_STORAGE_KEY, String(settings.mobileNavArrowColor));
      changed = true;
    }
    if (settings.mobileHomeTarget && DASHBOARD_START_OPTIONS.some((option) => option.key === settings.mobileHomeTarget)) {
      setMobileHomeTarget(settings.mobileHomeTarget);
      safeStorageSet(MOBILE_HOME_TARGET_STORAGE_KEY, settings.mobileHomeTarget);
      changed = true;
    }
    if (settings.navHomeColor && /^#[0-9a-f]{6}$/i.test(String(settings.navHomeColor))) {
      setLandingLogoColor(String(settings.navHomeColor));
      safeStorageSet(LANDING_LOGO_COLOR_STORAGE_KEY, String(settings.navHomeColor));
      changed = true;
    }

    if (remote.portfolio && typeof remote.portfolio === "object") {
      applyPortfolioSyncRecord(remote.portfolio);
      changed = true;
    }

    return changed;
  }

  async function fetchRemoteSyncData(userKey) {
    const response = await fetch(`${API}/api/user-sync/${encodeURIComponent(userKey)}`, {
      method: "GET",
      mode: "cors",
      headers: { Accept: "application/json" },
    });
    const json = await response.json().catch(() => null);
    return json?.data || null;
  }

  async function pushLocalSyncData(userKey, payload = getLocalSyncPayload()) {
    const response = await fetch(`${API}/api/user-sync`, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ userKey, data: payload }),
    });
    if (!response.ok) throw new Error("Sync failed");
    const json = await response.json().catch(() => null);
    return json?.data || null;
  }

  async function importRemoteAccountData({ silent = false, force = false } = {}) {
    const userKey = getSyncUserKey();
    if (!userKey) return false;
    try {
      const remote = await fetchRemoteSyncData(userKey);
      if (!remote) return false;
      const remoteTime = Date.parse(remote.syncedAt || remote.updatedAt || "") || 0;
      const lastLocalSync = Number(safeStorageGet(`eval-sync-last:${userKey}`, "0")) || 0;
      const remotePortfolioTime = portfolioRecordTime(remote.portfolio);
      const localPortfolioTime = getLocalPortfolioRecordTime();
      if (!force && lastLocalSync && remoteTime && remoteTime <= lastLocalSync && remotePortfolioTime <= localPortfolioTime) return false;
      if (!force && remotePortfolioTime && localPortfolioTime && remotePortfolioTime < localPortfolioTime && remoteTime <= lastLocalSync) return false;
      applyRemoteSyncData(remote);
      safeStorageSet(`eval-sync-last:${userKey}`, String(Math.max(remoteTime || 0, remotePortfolioTime || 0, Date.now())));
      safeStorageSet(`eval-sync-enabled:${userKey}`, "true");
      if (!silent) {
        setSyncStatus("synced");
        setTimeout(() => setSyncStatus("idle"), 2500);
      }
      return true;
    } catch {
      return false;
    }
  }

  async function handleSyncAccountData() {
    if (!user) {
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 1800);
      return;
    }
    const userKey = getSyncUserKey();
    if (!userKey) {
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 1800);
      return;
    }

    setSyncStatus("syncing");
    try {
      const payload = getLocalSyncPayload();
      const pushed = await pushLocalSyncData(userKey, payload);
      const syncedAt = Math.max(
        Date.parse(pushed?.syncedAt || payload.syncedAt || "") || 0,
        portfolioRecordTime(pushed?.portfolio || payload.portfolio) || 0,
        Date.now()
      );
      safeStorageSet(`eval-sync-last:${userKey}`, String(syncedAt));
      safeStorageSet(`eval-sync-enabled:${userKey}`, "true");
      setSyncStatus("synced");
      setTimeout(() => setSyncStatus("idle"), 2500);
    } catch {
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 2200);
    }
  }

  useEffect(() => {
    const userKey = getSyncUserKey();
    if (!userKey) return undefined;

    let alive = true;
    importRemoteAccountData({ silent: true });

    const interval = window.setInterval(() => {
      if (!alive) return;
      importRemoteAccountData({ silent: true });
    }, 90_000);

    const onLocalSyncChange = () => {
      if (!alive) return;
      pushLocalSyncData(userKey).catch(() => {});
    };

    const onAccountFocus = () => {
      if (!alive) return;
      importRemoteAccountData({ silent: true });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") onAccountFocus();
    };

    window.addEventListener("eval-account-sync-changed", onLocalSyncChange);
    window.addEventListener("focus", onAccountFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      alive = false;
      window.clearInterval(interval);
      window.removeEventListener("eval-account-sync-changed", onLocalSyncChange);
      window.removeEventListener("focus", onAccountFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [user]);

  function navigateView(next, options = {}) {
    const clean = next || "dashboard";
    if (clean === view) return;
    setMenuOpen(false);
    setOtherMenuOpen(false);
    if (!options.replace) {
      viewHistoryRef.current = [...viewHistoryRef.current.slice(-24), view];
      forwardHistoryRef.current = [];
    }
    setView(clean);
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  }

  function goBackInApp() {
    const previous = viewHistoryRef.current.pop();
    if (!previous) return;
    forwardHistoryRef.current = [...forwardHistoryRef.current.slice(-24), view];
    setView(previous);
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  }

  function goForwardInApp() {
    const next = forwardHistoryRef.current.pop();
    if (!next) return;
    viewHistoryRef.current = [...viewHistoryRef.current.slice(-24), view];
    setView(next);
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  }

  function updatePreferredDashboardStart(next) {
    const clean = DASHBOARD_START_OPTIONS.some((option) => option.key === next) ? next : "dashboard";
    setPreferredDashboardStart(clean);
    safeStorageSet(DASHBOARD_START_STORAGE_KEY, clean);
    window.dispatchEvent(new Event("eval-account-sync-changed"));
  }

  function updateMainPieTheme(next) {
    const clean = MAIN_PIE_THEME_OPTIONS.some((option) => option.key === next) ? next : "pulse";
    setMainPieTheme(clean);
    safeStorageSet(PIE_THEME_STORAGE_KEY, clean);
  }

  function updateMobileNavLeft(next) {
    const clean = MOBILE_NAV_SHORTCUT_OPTIONS.some((option) => option.key === next) ? next : "watchlist";
    setMobileNavLeft(clean);
    safeStorageSet(MOBILE_NAV_LEFT_STORAGE_KEY, clean);
    window.dispatchEvent(new Event("eval-account-sync-changed"));
  }

  function updateMobileNavRight(next) {
    const clean = MOBILE_NAV_SHORTCUT_OPTIONS.some((option) => option.key === next) ? next : "assistant";
    setMobileNavRight(clean);
    safeStorageSet(MOBILE_NAV_RIGHT_STORAGE_KEY, clean);
    window.dispatchEvent(new Event("eval-account-sync-changed"));
  }

  function updateMobileNavSecondLeft(next) {
    const clean = MOBILE_NAV_SHORTCUT_OPTIONS.some((option) => option.key === next) ? next : "settings";
    setMobileNavSecondLeft(clean);
    safeStorageSet(MOBILE_NAV_SECOND_LEFT_STORAGE_KEY, clean);
    window.dispatchEvent(new Event("eval-account-sync-changed"));
  }

  function updateMobileNavSecondRight(next) {
    const clean = MOBILE_NAV_SHORTCUT_OPTIONS.some((option) => option.key === next) ? next : "portfolio";
    setMobileNavSecondRight(clean);
    safeStorageSet(MOBILE_NAV_SECOND_RIGHT_STORAGE_KEY, clean);
    window.dispatchEvent(new Event("eval-account-sync-changed"));
  }

  function updateMobileNavArrowColor(next) {
    const clean = /^#[0-9a-f]{6}$/i.test(String(next || "")) ? String(next) : "#151826";
    setMobileNavArrowColor(clean);
    safeStorageSet(MOBILE_NAV_ARROW_COLOR_STORAGE_KEY, clean);
    window.dispatchEvent(new Event("eval-account-sync-changed"));
  }

  function updateMobileHomeTarget(next) {
    const clean = DASHBOARD_START_OPTIONS.some((option) => option.key === next) ? next : "dashboard";
    setMobileHomeTarget(clean);
    safeStorageSet(MOBILE_HOME_TARGET_STORAGE_KEY, clean);
    window.dispatchEvent(new Event("eval-account-sync-changed"));
  }

  function updateLandingLogoColor(next) {
    const clean = normalizeNavHomeColor(next);
    setLandingLogoColor(clean);
    safeStorageSet(LANDING_LOGO_COLOR_STORAGE_KEY, clean);
    window.dispatchEvent(new Event("eval-account-sync-changed"));
  }

  function goMobileNav(target) {
    const clean = target === "search" ? "dashboard" : target;
    navigateView(clean || "dashboard");
  }

  function goMenu(nextView) {
    navigateView(nextView);
  }

  const resolvedAppHomeView = DASHBOARD_START_OPTIONS.some((option) => option.key === preferredDashboardStart)
    ? preferredDashboardStart
    : "dashboard";
  const resolvedAppHomeLabel = DASHBOARD_START_OPTIONS.find((option) => option.key === resolvedAppHomeView)?.label || "Dashboard";
  const backHomeText = `Back to ${resolvedAppHomeLabel}`;

  function goAppHome() {
    navigateView(resolvedAppHomeView);
  }

  const analyzeInFlightRef = useRef(new Map());

  async function analyze(e, overrideSymbol, options = {}) {
    e?.preventDefault();

    const clean = (overrideSymbol || symbol).trim().toUpperCase();
    if (!clean) return null;

    const silent = Boolean(options?.silent);
    const skipState = Boolean(options?.skipState);
    const forceRefresh = Boolean(options?.forceRefresh);

    if (!forceRefresh && analyzeInFlightRef.current.has(clean)) {
      return analyzeInFlightRef.current.get(clean);
    }

    if (!skipState) {
      setSymbol(clean);
    }

    if (!silent) {
      setLoading(true);
      setError("");
    }

    const analysisPromise = (async () => {
      try {
        const url = `${API}/api/analyze/${encodeURIComponent(clean)}?manual=1`;

        const res = await fetch(url, {
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

        if (!skipState) setData(json);
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
        analyzeInFlightRef.current.delete(clean);
        if (!silent) setLoading(false);
      }
    })();

    if (!forceRefresh) analyzeInFlightRef.current.set(clean, analysisPromise);
    return analysisPromise;
  }
  // Dashboard searches only when the user clicks the Search button or presses Enter.

  function buildStockListItem(analyzed, fallbackSymbol) {
    const clean = String(analyzed?.symbol || fallbackSymbol || "").trim().toUpperCase();
    const cats = cleanEvalCategories(analyzed?.grades?.categories || {});
    const orderedCats = Object.entries(cats)
      .filter(([key, value]) => EVAL_CATEGORY_KEY_SET.has(key) && value !== null && value !== undefined && Number.isFinite(Number(score10(value))))
      .sort((a, b) => Number(score10(b[1])) - Number(score10(a[1])));

    const strongest = orderedCats[0];
    const weakest = orderedCats[orderedCats.length - 1];

    const domain = getCompanyDomainFromReport(analyzed);
    const companyName = getCompanyNameFromReport(analyzed, clean);
    return {
      symbol: clean,
      name: companyName || clean,
      domain,
      website: domain,
      logo: allInvestViewLogoUrl(domain, clean),
      score: score10(analyzed?.grades?.edgeScore),
      rawScore: analyzed?.grades?.edgeScore ?? null,
      grade: gradeFrom10(analyzed?.grades?.edgeScore),
      risk: "N/A",
      price: null,
      change: null,
      changePercent: null,
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

  async function openPortfolioStockDetail(ticker) {
    const clean = String(ticker || "").trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "").slice(0, 8);
    if (!clean) return;
    setPortfolioDetailError("");
    setPortfolioDetailLoading(true);
    setPortfolioDetailData(null);
    navigateView("portfolioStockDetail");
    try {
      const analyzed = await analyze(null, clean, { forceRefresh: true, silent: true, skipState: true });
      if (analyzed) setPortfolioDetailData(analyzed);
      else setPortfolioDetailError(`Could not load ${clean}.`);
    } catch (error) {
      setPortfolioDetailError(error?.message || `Could not load ${clean}.`);
    } finally {
      setPortfolioDetailLoading(false);
    }
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

  async function openIndustryPage(sector, sourceSymbol = data?.symbol || symbol) {
    const cleanIndustry = String(sector || "").trim();
    if (!cleanIndustry || cleanIndustry === "Public company") return;

    setIndustryPage({ sector: cleanIndustry, leaders: [], sourceSymbol });
    setIndustryLoading(true);
    setIndustryError("");
    setView("sector");

    try {
      const res = await fetch(
        `${API}/api/sector-top/${encodeURIComponent(cleanIndustry)}?symbol=${encodeURIComponent(sourceSymbol || "")}`,
        {
          method: "GET",
          mode: "cors",
          headers: { Accept: "application/json" },
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Could not load sector leaders.");
      }

      const leaders = Array.isArray(json?.leaders) ? json.leaders.slice(0, 5) : [];

      // Do not re-analyze every sector leader on the frontend.
      // The backend already ranks and caches leaders, so this avoids duplicate provider calls.
      setIndustryPage({
        sector: json?.sector || cleanIndustry,
        leaders,
        sourceSymbol,
        cachedForHours: json?.cachedForHours || 24,
      });
    } catch (err) {
      setIndustryError(err?.message || "Could not load sector leaders.");
      setIndustryPage({ sector: cleanIndustry, leaders: [], sourceSymbol });
    } finally {
      setIndustryLoading(false);
    }
  }

  async function analyzeFromIndustry(ticker) {
    await analyze(null, ticker);
    navigateView("dashboard");
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
        const res = await fetch(`${API}/api/analyze/${encodeURIComponent(item.symbol)}?summary=0&source=watchlist-refresh`, {
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
    // Watchlist scores now stay exactly as saved on load.
    // They only update when the user presses the Watchlist refresh button.
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

  useEffect(() => {
    const q = tickerLookupQuery.trim();
    if (view !== "tickerLookup" || q.length < 1) {
      setTickerLookupResults([]);
      setTickerLookupError("");
      setTickerLookupLoading(false);
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setTickerLookupLoading(true);
        setTickerLookupError("");
        const res = await fetch(`${API}/api/ticker-lookup?q=${encodeURIComponent(q)}&limit=25`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Ticker lookup failed.");
        if (!cancelled) setTickerLookupResults(Array.isArray(json.results) ? json.results.slice(0, 25) : []);
      } catch {
        if (!cancelled) {
          setTickerLookupResults([]);
          setTickerLookupError("Could not load ticker lookup.");
        }
      } finally {
        if (!cancelled) setTickerLookupLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [view, tickerLookupQuery]);

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

  function openDashboardFromLanding() {
    const nextView = isSignedIn ? preferredDashboardStart : "account";
    navigateView(nextView);

    if (["dashboard", "portfolio", "morningBrew", "watchlist"].includes(nextView)) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });
    }
  }

  if (view === "landing") {
    return <LandingPage onContinue={openDashboardFromLanding} startTarget={isSignedIn ? preferredDashboardStart : "dashboard"} />;
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
        onBack={goAppHome}
        backLabel={backHomeText}
        requireAgreement={!termsAccepted}
      />
    );
  }

  if (view === "support") {
    return (
      <SupportContactPage
        onBack={goAppHome}
        backLabel={backHomeText}
        onHome={() => navigateView("landing")}
        onTerms={() => navigateView("terms")}
      />
    );
  }


  if (view === "mobileMenu") {
    return (
      <>
        <MobileMenuPage
          syncStatus={syncStatus}
          onSync={handleSyncAccountData}
          onNavigate={navigateView}
          onBack={goAppHome}
          backLabel={backHomeText}
        />
        <MobileBottomNav
          homeView={mobileHomeTarget}
          homeButtonColor={landingLogoColor}
          leftShortcut={mobileNavLeft}
          rightShortcut={mobileNavRight}
          secondLeftShortcut={mobileNavSecondLeft}
          secondRightShortcut={mobileNavSecondRight}
          arrowButtonColor={mobileNavArrowColor}
          searchTarget={mobileSearchTarget}
          onNavigate={goMobileNav}
          onBack={goBackInApp}
          onForward={goForwardInApp}
        />
      </>
    );
  }


  if (view === "tickerLookup") {
    return (
      <>
        <TickerLookupPage
          query={tickerLookupQuery}
          results={tickerLookupResults}
          loading={tickerLookupLoading}
          error={tickerLookupError}
          onQueryChange={setTickerLookupQuery}
          onBack={goAppHome}
          backLabel={backHomeText}
        />
        <MobileBottomNav
          homeView={mobileHomeTarget}
          homeButtonColor={landingLogoColor}
          leftShortcut={mobileNavLeft}
          rightShortcut={mobileNavRight}
          secondLeftShortcut={mobileNavSecondLeft}
          secondRightShortcut={mobileNavSecondRight}
          arrowButtonColor={mobileNavArrowColor}
          searchTarget={mobileSearchTarget}
          onNavigate={goMobileNav}
          onBack={goBackInApp}
          onForward={goForwardInApp}
        />
      </>
    );
  }

  if (view === "faqs") {
    return (
      <FaqPage
        onBack={goAppHome}
        backLabel={backHomeText}
        onHome={() => navigateView("landing")}
        onTerms={() => navigateView("terms")}
        onSupport={() => navigateView("support")}
      />
    );
  }

  if (view === "settings") {
    return (
      <>
        <SettingsPage
          dashboardStart={preferredDashboardStart}
          mobileNavLeft={mobileNavLeft}
          mobileNavRight={mobileNavRight}
          mobileNavSecondLeft={mobileNavSecondLeft}
          mobileNavSecondRight={mobileNavSecondRight}
          mobileNavArrowColor={mobileNavArrowColor}
          mobileSearchTarget={mobileSearchTarget}
          mobileHomeTarget={mobileHomeTarget}
          landingLogoColor={landingLogoColor}
          onDashboardStartChange={updatePreferredDashboardStart}
          onMobileNavLeftChange={updateMobileNavLeft}
          onMobileNavRightChange={updateMobileNavRight}
          onMobileNavSecondLeftChange={updateMobileNavSecondLeft}
          onMobileNavSecondRightChange={updateMobileNavSecondRight}
          onMobileNavArrowColorChange={updateMobileNavArrowColor}
          onMobileHomeTargetChange={updateMobileHomeTarget}
          onLandingLogoColorChange={updateLandingLogoColor}
          onBack={goAppHome}
          backLabel={backHomeText}
        />
        <MobileBottomNav
          homeView={mobileHomeTarget}
          homeButtonColor={landingLogoColor}
          leftShortcut={mobileNavLeft}
          rightShortcut={mobileNavRight}
          secondLeftShortcut={mobileNavSecondLeft}
          secondRightShortcut={mobileNavSecondRight}
          arrowButtonColor={mobileNavArrowColor}
          searchTarget={mobileSearchTarget}
          onNavigate={goMobileNav}
          onBack={goBackInApp}
          onForward={goForwardInApp}
        />
      </>
    );
  }

  if (view === "morningBrew") {
    return (
      <>
        <MorningMugsDashboard onBack={goAppHome} backLabel={backHomeText} />
        <MobileBottomNav
          homeView={mobileHomeTarget}
          homeButtonColor={landingLogoColor}
          leftShortcut={mobileNavLeft}
          rightShortcut={mobileNavRight}
          secondLeftShortcut={mobileNavSecondLeft}
          secondRightShortcut={mobileNavSecondRight}
          arrowButtonColor={mobileNavArrowColor}
          searchTarget={mobileSearchTarget}
          onNavigate={goMobileNav}
          onBack={goBackInApp}
          onForward={goForwardInApp}
        />
      </>
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
          onClick={() => navigateView("landing")}
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

      {view === "portfolioStockDetail" ? (
        <section className="portfolio-stock-detail-page">
          <button type="button" className="back-btn portfolio-stock-detail-back" onClick={() => navigateView("portfolio")}>
            <ArrowLeft size={18} /> Portfolio
          </button>
          {portfolioDetailLoading ? (
            <div className="portfolio-loading-card compact"><RefreshCw className="spin" size={24}/><h3>Loading stock detail</h3><p>Loading chart, live quote, and Eval metrics.</p></div>
          ) : portfolioDetailError ? (
            <div className="error-banner"><AlertTriangle size={18}/>{portfolioDetailError}</div>
          ) : portfolioDetailData ? (
            <Report data={portfolioDetailData} onAdd={null} onOpenIndustry={openIndustryPage} pieTheme={mainPieTheme} />
          ) : (
            <EmptyReport />
          )}
        </section>
      ) : view === "portfolio" ? (
        <PortfolioPage onBack={goAppHome} backLabel={backHomeText} onMorning={() => navigateView("morningBrew")} onAnalyze={openPortfolioStockDetail} />
      ) : view === "assistant" ? (
        <AssistantPage
          current={data}
          watchlist={watchlist}
          onBack={goAppHome}
          backLabel={backHomeText}
        />
      ) : view === "plans" ? (
        <PlansPage onBack={goAppHome} backLabel={backHomeText} />
      ) : view === "sector" ? (
        <IndustryPage
          sectorPage={sectorPage}
          loading={sectorLoading}
          error={sectorError}
          onBack={goAppHome}
          backLabel={backHomeText}
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
          onBack={goAppHome}
          backLabel={backHomeText}
        />
      ) : view === "compare" ? (
        <ComparePage
          data={compareData}
          error={compareError}
          onBack={() => navigateView("compareSelect")}
        />
      ) : view === "watchlist" ? (
        <main className="watchlist-page mobile-watchlist-clean">
          <button type="button" className="back-btn watchlist-page-back" onClick={goAppHome}>
            <ArrowLeft size={18} /> {backHomeText}
          </button>

          <Watchlist
            items={watchlist}
            symbol={symbol}
            onAdd={addTicker}
            onRemove={removeTicker}
            onAnalyze={(ticker) => {
              analyze(null, ticker);
              navigateView("dashboard");
            }}
            onRefresh={refreshWatchlist}
            loading={watchLoading}
            pageMode
          />
        </main>
      ) : (
        <section className="layout">
          <div className="content">
            <form onSubmit={analyze} className="searchbar compact-searchbar score-searchbar eval-responsive-searchbar eval-menu-searchbar dashboard-searchbar-no-menu">
              <div className="ticker-field eval-safe-ticker-field">
                <input
                  className="eval-clean-ticker-input"
                  value={symbol}
                  onChange={(e) => { if (!tickerInputLocked) setSymbol(e.target.value.toUpperCase()); }}
                  placeholder="Add ticker"
                  maxLength={8}
                  disabled={tickerInputLocked || loading}
                />
              </div>

              <button disabled={loading || tickerInputLocked} aria-label="Search stock" title="Search stock">
                {loading ? <RefreshCw className="spin" size={18} /> : <Search size={18} />}
              </button>

              <button
                type="button"
                className="searchbar-desktop-add-btn"
                aria-label="Add ticker"
                title="Add ticker"
                disabled={loading || tickerInputLocked}
                onClick={() => addTicker(symbol)}
              >
                <Plus size={18} />
              </button>

              <button
                type="button"
                className="searchbar-watchlist-add-btn mobile-search-watchlist-btn"
                aria-label="Open Watchlist"
                title="Watchlist"
                onClick={() => navigateView("watchlist")}
              >
                <Star size={18} />
              </button>
            </form>

            {data ? (
              <>
                <Report data={data} onAdd={() => addTicker(data.symbol)} onOpenIndustry={openIndustryPage} pieTheme={mainPieTheme} />
                <DashboardLinkRow
                  onHome={() => navigateView("landing")}
                  onTerms={() => navigateView("terms")}
                  onSupport={() => navigateView("support")}
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
      <MobileBottomNav
        homeView={mobileHomeTarget}
        homeButtonColor={landingLogoColor}
        leftShortcut={mobileNavLeft}
        rightShortcut={mobileNavRight}
        secondLeftShortcut={mobileNavSecondLeft}
        secondRightShortcut={mobileNavSecondRight}
        arrowButtonColor={mobileNavArrowColor}
        searchTarget={mobileSearchTarget}
        onNavigate={goMobileNav}
        onBack={goBackInApp}
        onForward={goForwardInApp}
      />
    </main>
  );
}


function MobileMenuPage({ syncStatus, onSync, onNavigate, onBack, backLabel = "Back" }) {
  const primaryTabs = [
    { label: "Dashboard", view: "dashboard" },
    { label: "Portfolio", view: "portfolio" },
    { label: "The Morning Mug", view: "morningBrew" },
    { label: "Watchlist", view: "watchlist" },
    { label: "Ticker Lookup", view: "tickerLookup" },
    { label: "Eval AI", view: "assistant" },
  ];

  const otherTabs = [
    { label: syncStatus === "syncing" ? "Syncing Account..." : syncStatus === "synced" ? "✓ Synced Account" : "Sync Account", action: onSync, synced: syncStatus === "synced" },
    { label: "Settings", view: "settings" },
    { label: "Homepage", view: "landing" },
    { label: "FAQs", view: "faqs" },
    { label: "Terms & Conditions", view: "terms" },
    { label: "Contact", view: "support" },
  ];

  const go = (item) => {
    if (item.action) {
      item.action();
      return;
    }
    onNavigate(item.view);
  };

  return (
    <main className="app-shell mobile-menu-page-shell">
      <section className="mobile-menu-page-card">
        <div className="mobile-menu-page-head">
          <button type="button" className="mobile-menu-page-back" onClick={onBack} aria-label={backLabel}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <span className="section-title"><Menu size={17}/> Menu</span>
            <h2>All Eval tabs</h2>
          </div>
        </div>

        <div className="mobile-menu-link-grid">
          {primaryTabs.map((item) => (
            <button key={item.label} type="button" className="mobile-menu-text-link" onClick={() => go(item)}>
              {item.label}
            </button>
          ))}
        </div>

        <div className="mobile-menu-other-block">
          <h3>Other</h3>
          <div className="mobile-menu-link-grid other-open">
            {otherTabs.map((item) => (
              <button key={item.label} type="button" className={`mobile-menu-text-link ${item.synced ? "synced" : ""}`} onClick={() => go(item)} disabled={item.action && syncStatus === "syncing"}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function SettingsPage({
  dashboardStart,
  mobileNavLeft,
  mobileNavRight,
  mobileNavSecondLeft,
  mobileNavSecondRight,
  mobileNavArrowColor,
  mobileSearchTarget,
  mobileHomeTarget,
  landingLogoColor,
  onDashboardStartChange,
  onMobileNavLeftChange,
  onMobileNavRightChange,
  onMobileNavSecondLeftChange,
  onMobileNavSecondRightChange,
  onMobileNavArrowColorChange,
  onMobileHomeTargetChange,
  onLandingLogoColorChange,
  onBack,
  backLabel = "Back",
}) {
  return (
    <main className="app-shell settings-page-shell">
      <section className="settings-page-card">
        <div className="settings-page-head">
          <button type="button" className="back-btn settings-back-btn" onClick={onBack} aria-label={backLabel}>
            <ArrowLeft size={18} /> {backLabel}
          </button>
          <div>
            <span className="section-title"><Gauge size={17}/> Settings</span>
            <h2>Dashboard setup</h2>
            <p>Choose where Open Dashboard goes and customize the mobile bottom menu.</p>
          </div>
        </div>

        <div className="settings-option-grid">
          <article className="settings-option-card">
            <h3>Open Dashboard to</h3>
            <div className="settings-choice-row">
              {DASHBOARD_START_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={dashboardStart === option.key ? "active" : ""}
                  onClick={() => onDashboardStartChange(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </article>

          <article className="settings-option-card settings-logo-color-card">
            <h3>Home button color</h3>
            <div className="settings-gradient-choice-row">
              {NAV_HOME_GRADIENT_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  className={landingLogoColor === preset.key ? "active" : ""}
                  onClick={() => onLandingLogoColorChange(preset.key)}
                  style={{ "--preset-gradient": preset.gradient }}
                  aria-label={`Use ${preset.label} navigation theme`}
                />
              ))}
            </div>
          </article>

          <article className="settings-option-card settings-mobile-nav-card">
            <h3>Mobile bottom menu</h3>
            <div className="settings-field-stack">
              <label>Home button opens</label>
              <select value={mobileHomeTarget} onChange={(e) => onMobileHomeTargetChange(e.target.value)}>
                {DASHBOARD_START_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>
              <label>Left outer shortcut</label>
              <div className="settings-fixed-menu-slot"><Menu size={15} /> Menu — fixed</div>
              <label>Left inner shortcut</label>
              <select value={mobileNavSecondLeft} onChange={(e) => onMobileNavSecondLeftChange(e.target.value)}>
                {MOBILE_NAV_SHORTCUT_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>
              <label>Right inner shortcut</label>
              <select value={mobileNavRight} onChange={(e) => onMobileNavRightChange(e.target.value)}>
                {MOBILE_NAV_SHORTCUT_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>
              <label>Right outer shortcut</label>
              <select value={mobileNavSecondRight} onChange={(e) => onMobileNavSecondRightChange(e.target.value)}>
                {MOBILE_NAV_SHORTCUT_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>

            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

function MobileBottomNav({ homeView, leftShortcut, secondLeftShortcut, rightShortcut, secondRightShortcut, searchTarget, homeButtonColor = "#9f5cff", arrowButtonColor = "#151826", onNavigate, onBack, onForward }) {
  const shortcutMap = {
    menu: { label: "Menu", icon: <Menu size={20} /> },
    watchlist: { label: "Watchlist", icon: <Star size={18} /> },
    settings: { label: "Settings", icon: <SettingsIcon size={18} /> },
    search: { label: "Search", icon: <Search size={18} /> },
    assistant: { label: "Eval AI", icon: <BrainCircuit size={18} /> },
    portfolio: { label: "Portfolio", icon: <PieChart size={18} /> },
    morningBrew: { label: "Morning Mug", icon: <Coffee size={19} className="mobile-mug-icon" /> },
    tickerLookup: { label: "Ticker Lookup", icon: <Search size={18} /> },
  };

  const runShortcut = (key) => {
    const target = key === "search" ? searchTarget : key === "menu" ? "mobileMenu" : key;
    onNavigate(target || "dashboard");
  };

  const resolvedSecondLeftShortcut = secondLeftShortcut || safeStorageGet(MOBILE_NAV_SECOND_LEFT_STORAGE_KEY, "settings");
  const resolvedSecondRightShortcut = secondRightShortcut || safeStorageGet(MOBILE_NAV_SECOND_RIGHT_STORAGE_KEY, "portfolio");
  const left = shortcutMap.menu;
  const secondLeft = shortcutMap[resolvedSecondLeftShortcut] || shortcutMap.settings;
  const right = shortcutMap[rightShortcut] || shortcutMap.assistant;
  const secondRight = shortcutMap[resolvedSecondRightShortcut] || shortcutMap.portfolio;

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation" style={{ "--mobile-home-button-color": getNavHomeGradient(homeButtonColor), "--mobile-nav-icon-color": getNavIconColor(homeButtonColor) }}>
      <button type="button" className="mobile-bottom-nav-btn nav-arrow nav-back-arrow" onClick={onBack} aria-label="Back">
        <ArrowLeft size={15} />
      </button>

      <button type="button" className="mobile-bottom-nav-btn nav-shortcut nav-left-shortcut nav-menu-shortcut" onClick={() => runShortcut("menu")} aria-label={left.label}>
        {left.icon}
      </button>

      <button type="button" className="mobile-bottom-nav-btn nav-shortcut nav-second-left-shortcut" onClick={() => runShortcut(resolvedSecondLeftShortcut)} aria-label={secondLeft.label}>
        {secondLeft.icon}
      </button>

      <button type="button" className="mobile-bottom-nav-btn nav-home" onClick={() => onNavigate(homeView || "dashboard")} aria-label="Home">
        <Home size={22} />
      </button>

      <button type="button" className="mobile-bottom-nav-btn nav-shortcut nav-right-shortcut" onClick={() => runShortcut(rightShortcut)} aria-label={right.label}>
        {right.icon}
      </button>

      <button type="button" className="mobile-bottom-nav-btn nav-shortcut nav-second-right-shortcut" onClick={() => runShortcut(resolvedSecondRightShortcut)} aria-label={secondRight.label}>
        {secondRight.icon}
      </button>

      <button type="button" className="mobile-bottom-nav-btn nav-arrow nav-forward-arrow" onClick={onForward} aria-label="Forward">
        <ArrowRight size={15} />
      </button>
    </nav>
  );
}


function ScoreRingSvg({ value, className = "", label = null }) {
  const raw = score10(value);
  const hasScore = raw !== null;
  const score = hasScore ? Math.max(0, Math.min(10, Number(raw))) : 0;
  const tone = hasScore ? scoreTone(score) : "neutral";
  const percent = hasScore ? Math.max(0, Math.min(100, score * 10)) : 0;

  return (
    <div className={`svg-score-ring ${tone} ${className}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
        <circle className="svg-ring-track" cx="60" cy="60" r="46" pathLength="100" />
        <circle
          className="svg-ring-progress"
          cx="60"
          cy="60"
          r="46"
          pathLength="100"
          strokeDasharray={`${percent} ${100 - percent}`}
        />
        <circle className="svg-ring-inner" cx="60" cy="60" r="35" />
      </svg>
      <strong className="score-ovr-stack"><span>{label || (hasScore ? scoreText(score) : "N/A")}</span><small>OVR</small></strong>
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
  backLabel = "Back to dashboard",
}) {
  const activeStocks = [...watchlist].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <section className="compare-page compare-select-page">
      <div className="compare-page-shell">
        <button type="button" className="back-btn" onClick={onBack}>
          <ArrowLeft size={18} /> {backLabel}
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
          <span>Compare stocks within an sector or use sector rankings to find strong peers.</span>
        </div>
      </div>
    </section>
  );
}

function ComparePage({
  data,
  error,
  onBack,
  backLabel = "Back",
}) {
  const categories = [
    "growth",
    "profitability",
    "financialHealth",
    "valuation",
    "momentum",
    "pullback",
  ];

  const reports = data?.reports || [];
  const stocks = reports.map((report) => ({
    symbol: report?.symbol || "Stock",
    score: score10(report?.grades?.edgeScore),
    categories: cleanEvalCategories(report?.grades?.categories || {}),
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
            Your selected watchlist stocks are preloaded below. Eval compares their Power Scores and all six category ratings side by side.
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
              <strong>Six-category radar comparison</strong>
              <p>The radar chart shows each selected stock across the same six Eval categories. A wider shape means stronger scores across more areas.</p>
            </div>

            <CompareRadar
              categories={categories}
              stocks={stocks}
            />

            <p className="compare-explain">
              This comparison is based on Eval's current scoring data. You can compare stocks within the same sector, compare up to 5 stocks at once, and use sector rankings to see which companies lead their category. This is educational and is not a buy or sell recommendation.
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

function sectorDescription(sector = "") {
  const text = String(sector || "").toLowerCase();

  if (text.includes("technology") || text.includes("software") || text.includes("semiconductor")) {
    return "This sector is built around software, devices, chips, cloud platforms, and digital infrastructure. Strong companies here usually score well when they grow revenue, protect margins, and keep demand strong.";
  }

  if (text.includes("health") || text.includes("pharma") || text.includes("biotech") || text.includes("medical")) {
    return "This sector focuses on medicine, treatments, health services, and medical technology. Strong companies here usually have steady demand, strong profitability, and durable products or services.";
  }

  if (text.includes("financial") || text.includes("bank") || text.includes("insurance")) {
    return "This sector includes banks, payment networks, lenders, asset managers, and insurers. Strong companies usually score well when they have stable earnings, strong balance sheets, and controlled risk.";
  }

  if (text.includes("energy") || text.includes("oil") || text.includes("gas")) {
    return "This sector is tied to oil, natural gas, energy production, and energy services. Scores can move with commodity prices, cash flow strength, debt levels, and profitability.";
  }

  if (text.includes("consumer")) {
    return "This sector depends on consumer spending. Strong companies usually have recognizable brands, steady demand, pricing power, and healthy margins.";
  }

  if (text.includes("industrial")) {
    return "This sector includes machinery, transportation, aerospace, defense, and manufacturing. Strong companies usually benefit from stable demand, efficient operations, and solid balance sheets.";
  }

  return "This sector groups companies with similar business models. Comparing Eval Scores inside the same sector can make the ranking more useful because the stocks face similar risks and opportunities.";
}

function IndustryRadar({ leaders }) {
  const [hiddenSymbols, setHiddenSymbols] = useState([]);

  const categories = [
    "growth",
    "profitability",
    "financialHealth",
    "valuation",
    "momentum",
    "pullback",
  ];

  const categoryValues = (item) => {
    const raw = cleanEvalCategories(item.categories || item.grades?.categories || item.categoryScores || {});

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
    <section className="sector-radar-card">
      <div className="sector-radar-head">
        <div>
          <strong>Top 5 radar comparison</strong>
          <p>Each point uses that stock's real score for the matching Eval category.</p>
        </div>

        <div className="sector-radar-legend clickable-radar-legend">
          {stocks.map((stock, index) => {
            const hidden = hiddenSymbols.includes(stock.symbol);
            return (
              <button
                type="button"
                className={`sector-radar-legend-${index + 1} ${hidden ? "radar-hidden" : ""}`}
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
        <div className="sector-radar-empty">
          Category data is still loading. Refresh this industry page after the Top 5 reports finish caching.
        </div>
      ) : (
        <>
          <svg className="sector-radar-svg" viewBox="0 0 360 360" role="img" aria-label="Top five sector stock radar chart">
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
                  className={`sector-radar-poly sector-radar-poly-${originalIndex + 1}`}
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
                      className={`sector-radar-dot sector-radar-dot-${originalIndex + 1}`}
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

function IndustryPage({ sectorPage, loading, error, onBack, onAnalyze, backLabel = "Back to dashboard" }) {
  const sector = sectorPage?.sector || "Industry";
  const leaders = Array.isArray(sectorPage?.leaders) ? sectorPage.leaders : [];

  return (
    <section className="sector-page">
      <div className="sector-page-shell">
        <div className="sector-page-head">
          <button type="button" className="back-btn" onClick={onBack}>
            <ArrowLeft size={17} /> {backLabel}
          </button>

          <div>
            <div className="section-title">
              <BarChart3 size={17} /> Industry ranking
            </div>
            <h2>{sector}</h2>
            <p>{sectorDescription(sector)}</p>
          </div>
        </div>

        <div className="sector-explain-card">
          <strong>How to use this page</strong>
          <p>
            Use this to compare stocks against similar companies. The top names have the highest Eval Scores in this industry group. A higher score means the company currently looks stronger across valuation, financial health, growth, momentum, profitability, and pullback.
          </p>
        </div>

        {loading ? (
          <div className="sector-loading-page">
            <RefreshCw className="spin" size={22} /> Ranking sector stocks from cached Eval data...
          </div>
        ) : error ? (
          <div className="sector-error-page">{error}</div>
        ) : leaders.length ? (
          <>
            <div className="sector-leader-grid">
              {leaders.slice(0, 5).map((item, index) => {
              const score = score10(item.score);
              const tone = scoreTone(score);
              const rankClass = "standard";

              return (
                <button
                  type="button"
                  className={`sector-leader-card ${rankClass}`}
                  key={item.symbol}
                  onClick={() => onAnalyze(item.symbol)}
                  title={`Open full Eval report for ${item.symbol}`}
                >
                  <div className="sector-medal">{index + 1}</div>
                  <ScoreRingSvg
                    value={score}
                    className="sector-score-pie"
                  />
                  <div className="sector-leader-copy">
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
          <div className="sector-error-page">No same-sector rankings are available yet.</div>
        )}
      </div>
    </section>
  );
}



function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let quote = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quote && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quote = !quote;
      }
    } else if (char === "," && !quote) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}


function parseHoldingNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const cleaned = String(raw).replace(/[$,%]/g, "").replace(/,/g, "").trim();
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function parseHoldingPercent(raw) {
  const value = parseHoldingNumber(raw);
  if (value === null) return null;
  return value <= 1 ? value * 100 : value;
}

function parseHoldingDollars(raw) {
  const value = parseHoldingNumber(raw);
  if (value === null) return null;
  return value;
}

function portfolioTemplateCsv(firstName = "Your") {
  return [
    "Symbol,Quantity,Purchase Price",
    "AAPL,8,175",
    "MSFT,5,390",
    "NVDA,12,105",
    "META,4,485",
    "JPM,7,195",
    "XOM,6,113",
    "WMT,10,62",
    "TSLA,3,210",
  ].join("\n");
}

function downloadPortfolioTemplate(firstName = "Your") {
  const safeName = String(firstName || "Your").replace(/[^a-z0-9 _-]/gi, "").trim() || "Your";
  const blob = new Blob([portfolioTemplateCsv(safeName)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName} Portfolio.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function normalizeCsvHeader(cell) {
  return String(cell || "").toLowerCase().replace(/^\uFEFF/, "").replace(/[^a-z0-9%$]/g, "");
}

function parsePortfolioCsv(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) throw new Error("The CSV file is empty.");

  let headerLineIndex = lines.findIndex((line) => {
    const headers = splitCsvLine(line).map(normalizeCsvHeader);
    const hasTicker = headers.some((h) => ["ticker", "symbol", "stocksymbol", "stock"].includes(h));
    const hasSizing = headers.some((h) => ["shares", "share", "quantity", "qty", "averagecost", "avgcost", "costbasis", "costper", "purchaseprice", "purchasecost", "buyprice", "holding", "holdings", "holding%", "holding$", "weight", "weight%", "portfolio", "portfolio%", "allocation", "amount", "value", "marketvalue", "percent", "percentage"].includes(h));
    return hasTicker && hasSizing;
  });

  if (headerLineIndex < 0) headerLineIndex = 0;

  const headers = splitCsvLine(lines[headerLineIndex]).map(normalizeCsvHeader);
  const dataLines = lines.slice(headerLineIndex + 1);

  const tickerIndex = Math.max(headers.findIndex((h) => ["ticker", "symbol", "stocksymbol", "stock"].includes(h)), 0);
  const sharesIndex = headers.findIndex((h) => ["shares", "share", "quantity", "qty"].includes(h));
  const avgCostIndex = headers.findIndex((h) => ["averagecost", "avgcost", "costbasis", "costper", "costpershare", "averageprice", "avgprice", "purchaseprice", "purchasecost", "purchase", "buyprice", "buycost"].includes(h));
  const percentIndex = headers.findIndex((h) => ["holding%", "weight%", "portfolio%", "percent", "percentage"].includes(h));
  const dollarIndex = headers.findIndex((h) => ["holding$", "holding", "holdings", "amount", "value", "marketvalue", "allocation", "portfolio"].includes(h));

  if (sharesIndex < 0 && percentIndex < 0 && dollarIndex < 0) {
    throw new Error("Could not find a sizing column. Use Shares, Holding ($), or Holding %.");
  }

  const merged = new Map();
  for (const line of dataLines) {
    const cells = splitCsvLine(line);
    const rawTicker = String(cells[tickerIndex] || "").trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "");
    const ticker = rawTicker.replace("-", ".");
    const shares = sharesIndex >= 0 ? parseHoldingDollars(cells[sharesIndex]) : null;
    const averageCost = avgCostIndex >= 0 ? parseHoldingDollars(cells[avgCostIndex]) : null;
    const weightPercent = percentIndex >= 0 ? parseHoldingPercent(cells[percentIndex]) : null;
    const holdingDollars = dollarIndex >= 0 ? parseHoldingDollars(cells[dollarIndex]) : null;
    if (!ticker || !/^[A-Z][A-Z0-9.]{0,7}$/.test(ticker)) continue;
    if (shares === null && weightPercent === null && holdingDollars === null) continue;
    const previous = merged.get(ticker) || { symbol: ticker, weightPercent: 0, holdingDollars: 0, shares: 0, averageCostTotal: 0 };
    const nextShares = previous.shares + (shares || 0);
    const nextCostTotal = previous.averageCostTotal + ((shares || 0) * (averageCost || 0));
    merged.set(ticker, {
      symbol: ticker,
      weightPercent: previous.weightPercent + (weightPercent || 0),
      holdingDollars: previous.holdingDollars + (holdingDollars || 0),
      shares: nextShares,
      averageCostTotal: nextCostTotal,
    });
  }

  const rows = [...merged.values()]
    .map((row) => ({
      symbol: row.symbol,
      shares: row.shares > 0 ? Number(row.shares.toFixed(6)) : null,
      averageCost: row.shares > 0 && row.averageCostTotal > 0 ? Number((row.averageCostTotal / row.shares).toFixed(4)) : null,
      weightPercent: row.weightPercent > 0 ? Number(row.weightPercent.toFixed(4)) : null,
      holdingDollars: row.holdingDollars > 0 ? Number(row.holdingDollars.toFixed(2)) : null,
    }))
    .filter((row) => row.shares !== null || row.weightPercent !== null || row.holdingDollars !== null);

  if (!rows.length) throw new Error("No valid ticker and holding rows were found.");
  return rows;
}

function portfolioMetricSummary(key, value) {
  const label = categoryLabel(key);
  const n = score10(value);
  if (n === null) return `${label} is not included in this portfolio score yet.`;

  const strength = n >= 7.5 ? "a strong contributor" : n >= 6.5 ? "a mixed contributor" : "a weaker contributor";
  const descriptions = {
    profitability: "Shows whether larger holdings are backed by companies that convert sales into earnings efficiently.",
    financialHealth: "Shows whether the portfolio is tilted toward stronger balance sheets and lower financial stress.",
    valuation: "Shows whether the portfolio is weighted toward holdings that look reasonably priced against fundamentals.",
    momentum: "Shows whether larger positions have stronger recent price action.",
  };

  return `${descriptions[key] || `${label} summarizes this part of the portfolio.`} At ${n.toFixed(1)}, it is ${strength} in the overall Portfolio Score.`;
}

function blankManualHolding(mode = "buy") {
  return { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, mode, symbol: "", shares: "", averageCost: "" };
}

function holdingsToManualRows(holdings = []) {
  const rows = (Array.isArray(holdings) ? holdings : [])
    .map((holding) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      mode: "current",
      symbol: String(holding?.symbol || holding?.ticker || "").toUpperCase(),
      shares: Number(holding?.shares || 0) ? String(holding.shares) : "",
      averageCost: Number(holding?.averageCost ?? holding?.avgCost ?? holding?.purchasePrice ?? 0) ? String(holding.averageCost ?? holding.avgCost ?? holding.purchasePrice) : "",
    }))
    .filter((row) => row.symbol);
  return rows.length ? rows : [blankManualHolding()];
}

function holdingAnchorId(symbol) {
  return `portfolio-holding-${String(symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "")}`;
}

const PORTFOLIO_UPLOAD_STORAGE_KEY = "eval-portfolio-upload-v8";

function portfolioStorageKeyFor(user) {
  const id = user?.id || user?.primaryEmailAddress?.emailAddress || "local";
  return `${PORTFOLIO_UPLOAD_STORAGE_KEY}:${id}`;
}

function easternDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function easternTimeParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

function isTheMorningMugWindow(now = new Date()) {
  const lookup = easternTimeParts(now);
  const hour = Number(lookup.hour || 0);
  const minute = Number(lookup.minute || 0);
  const current = hour * 60 + minute;
  return current >= 8 * 60 && current <= 10 * 60 + 30;
}

function isAfterEtTime(hour = 5, minute = 0, now = new Date()) {
  const lookup = easternTimeParts(now);
  const isWeekday = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(lookup.weekday);
  const minutes = Number(lookup.hour || 0) * 60 + Number(lookup.minute || 0);
  return isWeekday && minutes >= hour * 60 + minute;
}

function minutesUntilNextEtTime(hour = 5, minute = 0, now = new Date()) {
  const lookup = easternTimeParts(now);
  const weekday = lookup.weekday;
  const currentMinutes = Number(lookup.hour || 0) * 60 + Number(lookup.minute || 0);
  const targetMinutes = hour * 60 + minute;
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  if (weekdays.includes(weekday) && currentMinutes < targetMinutes) {
    return (targetMinutes - currentMinutes) * 60 * 1000;
  }
  const allDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let idx = allDays.indexOf(weekday);
  let days = 1;
  while (days < 8) {
    const next = allDays[(idx + days) % 7];
    if (weekdays.includes(next)) break;
    days += 1;
  }
  return ((days * 24 * 60) - currentMinutes + targetMinutes) * 60 * 1000;
}

function buildPortfolioHistory(previous = [], analysis) {
  const totalValue = Number(analysis?.summary?.totalHoldingDollars);
  if (!Number.isFinite(totalValue) || totalValue <= 0) return previous || [];
  const today = easternDateKey();
  const nextPoint = { date: today, value: Number(totalValue.toFixed(2)) };
  const filtered = (Array.isArray(previous) ? previous : []).filter((point) => point?.date !== today);
  return [...filtered, nextPoint].slice(-260);
}

function buildPortfolioEvalHistory(previous = [], analysis) {
  const evalScore = Number(analysis?.summary?.portfolioEvalScore);
  if (!Number.isFinite(evalScore) || evalScore <= 0) return previous || [];
  const today = easternDateKey();
  const nextPoint = { date: today, value: Number(evalScore.toFixed(1)) };
  const filtered = (Array.isArray(previous) ? previous : []).filter((point) => point?.date !== today);
  return [...filtered, nextPoint].slice(-260);
}

function MiniScoreRing({ value, small = false, sector = false }) {
  const tone = scoreTone(value);
  return (
    <div className={`portfolio-score-text-badge score-ovr-stack ${small ? "small" : "main"} ${sector ? "sector" : "stock"} ${tone}`}>
      <strong>{scoreText(value)}</strong>
      <small>OVR</small>
    </div>
  );
}


const PORTFOLIO_SECTOR_ORDER = [
  "Information Technology",
  "Financials",
  "Health Care",
  "Consumer Discretionary",
  "Consumer Staples",
  "Industrials",
  "Energy",
  "Communication Services",
  "Materials",
  "Utilities",
  "Real Estate",
];

function portfolioSectorFromIndustry(industry = "") {
  const text = String(industry || "").toLowerCase();
  if (/semiconductor|software|technology|information technology|hardware|computer|cloud|it service|electronic|internet software|application software|systems software/.test(text)) return "Information Technology";
  if (/bank|financial|insurance|capital market|asset management|broker|credit|payment|consumer finance|mortgage|fintech/.test(text)) return "Financials";
  if (/health|pharma|biotech|medical|life science|drug|diagnostic|hospital|care|therapeutic/.test(text)) return "Health Care";
  if (/discretionary|auto|automobile|retail|restaurant|hotel|leisure|apparel|luxury|consumer cyclical|e-commerce|home improvement|specialty retail/.test(text)) return "Consumer Discretionary";
  if (/staple|food|beverage|tobacco|household|personal product|grocery|consumer defensive/.test(text)) return "Consumer Staples";
  if (/industrial|aerospace|defense|machinery|transport|airline|rail|freight|construction|building product|electrical equipment|manufacturing|logistics/.test(text)) return "Industrials";
  if (/energy|oil|gas|drilling|exploration|production|pipeline|refining|coal|renewable/.test(text)) return "Energy";
  if (/communication|telecom|media|entertainment|broadcast|interactive media|advertising|publishing|streaming/.test(text)) return "Communication Services";
  if (/material|chemical|mining|metal|steel|gold|copper|paper|packaging|forest|agricultural input/.test(text)) return "Materials";
  if (/utilit|electric|water|multi-utilities|regulated gas|independent power/.test(text)) return "Utilities";
  if (/real estate|reit|property|mortgage reit|equity reit/.test(text)) return "Real Estate";
  return "Information Technology";
}

function buildPortfolioSectorAllocations(industryGroups = []) {
  const buckets = new Map();
  const ensure = (sector) => {
    if (!buckets.has(sector)) {
      buckets.set(sector, { sector, totalWeightPercent: 0, scoreWeight: 0, weightedScoreSum: 0, holdings: [], industries: new Set() });
    }
    return buckets.get(sector);
  };

  (Array.isArray(industryGroups) ? industryGroups : []).forEach((group) => {
    const industryName = group?.industry || group?.sector || "Other";
    const sector = portfolioSectorFromIndustry(industryName);
    const bucket = ensure(sector);
    bucket.industries.add(industryName);

    const holdings = Array.isArray(group?.holdings) ? group.holdings : [];
    holdings.forEach((holding) => {
      const weight = Number(holding?.weightPercent ?? holding?.portfolioWeightPercent ?? 0);
      const fallbackWeight = Number(holding?.holdingDollars) > 0 && Number(group?.totalHoldingDollars) > 0 && Number(group?.totalWeightPercent) > 0
        ? (Number(holding.holdingDollars) / Number(group.totalHoldingDollars)) * Number(group.totalWeightPercent)
        : 0;
      const finalWeight = Number.isFinite(weight) && weight > 0 ? weight : fallbackWeight;
      const score = score10(holding?.edgeScore ?? holding?.score ?? holding?.evalScore);
      bucket.holdings.push({ ...holding, industry: industryName, sector });
      if (Number.isFinite(finalWeight) && finalWeight > 0) {
        bucket.totalWeightPercent += finalWeight;
        if (score !== null) {
          bucket.scoreWeight += finalWeight;
          bucket.weightedScoreSum += score * finalWeight;
        }
      }
    });
  });

  return PORTFOLIO_SECTOR_ORDER.map((sector) => ensure(sector))
    .map((bucket) => ({
      ...bucket,
      industryCount: bucket.industries.size,
      stockCount: bucket.holdings.length,
      weightedEvalScore: bucket.scoreWeight > 0 ? Number((bucket.weightedScoreSum / bucket.scoreWeight).toFixed(1)) : null,
      industries: Array.from(bucket.industries).sort(),
    }))
    .filter((bucket) => Number(bucket.totalWeightPercent) > 0)
    .sort((a, b) => Number(b.totalWeightPercent || 0) - Number(a.totalWeightPercent || 0));
}

function SectorAllocationSummary({ sectors = [] }) {
  const rows = (Array.isArray(sectors) ? sectors : [])
    .filter((sector) => Number(sector?.totalWeightPercent) > 0)
    .sort((a, b) => Number(b.weightedEvalScore ?? -1) - Number(a.weightedEvalScore ?? -1));

  if (!rows.length) return null;

  return (
    <article className="portfolio-sector-allocation-card portfolio-sector-summary-card no-donut">
      <div className="portfolio-sector-allocation-head">
        <span className="section-title"><BarChart3 size={17}/> Sector weights</span>
        <h3>Sector weight & Eval Score</h3>
      </div>
      <div className="portfolio-sector-allocation-list portfolio-sector-summary-list">
        {rows.map((sector) => (
          <div className={`portfolio-sector-summary-row ${scoreTone(sector.weightedEvalScore)}`} key={sector.sector}>
            <span>{sector.sector}</span>
            <b>{Number(sector.totalWeightPercent || 0).toFixed(1)}%</b>
            <em>{sector.weightedEvalScore !== null ? scoreText(sector.weightedEvalScore) : "N/A"}</em>
          </div>
        ))}
      </div>
    </article>
  );
}


function IndustryDiversityDonut({ groups = [], activeIndustry, onActiveIndustry }) {
  const palette = ["#85ff47", "#15e7ff", "#9f5cff", "#ffe45f", "#ff7a18", "#ff4f67", "#23f0c7", "#f472b6", "#a3e635", "#60a5fa"];
  const total = groups.reduce((sum, group) => sum + (Number(group.totalWeightPercent) || 0), 0);
  let running = 0;
  const enriched = groups.map((group, index) => {
    const value = total > 0 ? ((Number(group.totalWeightPercent) || 0) / total) * 100 : 0;
    const start = running;
    running += value;
    return { ...group, color: palette[index % palette.length], donutStart: start, donutEnd: running, normalizedWeight: value };
  });
  const gradient = enriched.map((group) => `${group.color} ${group.donutStart.toFixed(2)}% ${group.donutEnd.toFixed(2)}%`).join(", ");
  const active = enriched.find((g) => g.sector === activeIndustry) || enriched[0];
  return (
    <div className="portfolio-donut-card portfolio-donut-card-interactive">
      <div className="portfolio-donut-copy">
        <span className="section-title"><PieChart size={17}/> Industry diversity</span>
        <h3>Portfolio mix</h3>
        <p>Hover or tap an industry to see its portfolio weight and industry-weighted Eval Score.</p>
      </div>
      <div
        className="portfolio-sector-donut interactive"
        style={{ background: `conic-gradient(${gradient || "rgba(255,255,255,.12) 0% 100%"})` }}
      >
        <div className="portfolio-donut-core">
          <span>{active?.sector || "Industries"}</span>
          <strong>{active ? `${Number(active.totalWeightPercent || 0).toFixed(1)}%` : "N/A"}</strong>
          <small>{active ? `Eval ${scoreText(active.sectorEvalScore)}` : ""}</small>
        </div>
      </div>
      <div className="portfolio-donut-list">
        {enriched.map((group) => (
          <button
            type="button"
            key={group.sector}
            className={group.sector === active?.sector ? "active" : ""}
            onMouseEnter={() => onActiveIndustry?.(group.sector)}
            onFocus={() => onActiveIndustry?.(group.sector)}
            onClick={() => onActiveIndustry?.(group.sector)}
          >
            <i style={{ background: group.color }} />
            <span>{group.sector}</span>
            <b>{Number(group.totalWeightPercent || 0).toFixed(1)}%</b>
          </button>
        ))}
      </div>
    </div>
  );
}


function IndustryBars({ groups = [], onSelectIndustry }) {
  const safeGroups = (Array.isArray(groups) ? groups.filter(Boolean) : []).sort((a, b) => Number(b?.sectorEvalScore ?? b?.industryEvalScore ?? b?.score ?? -1) - Number(a?.sectorEvalScore ?? a?.industryEvalScore ?? a?.score ?? -1));

  return (
    <div className="portfolio-industry-bars-card portfolio-industry-bars-clickable-card">
      <div className="portfolio-card-title-row">
        <span className="section-title"><BarChart3 size={17}/> Industry scores</span>
        <small>Tap an industry for weighted metrics</small>
      </div>
      <div className="portfolio-industry-bars">
        {safeGroups.map((group) => {
          const label = group?.sector || group?.industry || "Other";
          const rawScoreValue = group?.sectorEvalScore ?? group?.industryEvalScore ?? group?.score;
          const score = score10(rawScoreValue) ?? 0;
          const width = `${Math.max(0, Math.min(100, score * 10))}%`;
          const tone = scoreTone(score);

          return (
            <button type="button" className={`portfolio-industry-bar-row ${tone}`} key={label} onClick={() => onSelectIndustry?.(group)}>
              <div><b>{label}</b><span>{Number(group?.totalWeightPercent || 0).toFixed(1)}% of portfolio</span></div>
              <div className="portfolio-industry-bar-track"><span className={tone} style={{ width }} /></div>
              <strong className={`score-ovr-stack ${tone}`}><span>{scoreText(score)}</span><small>OVR</small></strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function weightedMetricEntriesFromIndustry(group) {
  const metricKeys = ["growth", "profitability", "financialHealth", "valuation", "momentum", "pullback"];
  const holdings = Array.isArray(group?.holdings) ? group.holdings : [];
  return metricKeys.map((key) => {
    const weighted = holdings.reduce((sum, holding) => {
      const value = Number(holding?.[key]);
      const weight = Number(holding?.sectorWeightPercent ?? holding?.industryWeightPercent ?? holding?.weightPercent);
      if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(weight) || weight <= 0) return sum;
      return sum + value * (weight / 100);
    }, 0);
    return [key, Number(weighted.toFixed(1))];
  }).filter(([, value]) => Number.isFinite(Number(value)) && Number(value) > 0);
}

function PortfolioMetricsModal({ title, subtitle, entries = [], onClose }) {
  if (!entries.length) return null;
  return (
    <div className="portfolio-metric-modal-backdrop" role="presentation" onClick={onClose}>
      <article className="portfolio-metric-modal" role="dialog" aria-modal="true" aria-label={`${title} metrics`} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="portfolio-metric-modal-close" onClick={onClose} aria-label="Close portfolio metrics">×</button>
        <div className="portfolio-metric-modal-head">
          <span className="section-title"><Gauge size={17}/> Weighted metrics</span>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="portfolio-weighted-metric-grid portfolio-metric-bar-grid portfolio-metrics-grid-v3 portfolio-metrics-modal-grid">
          {entries.map(([key, value]) => (
            <article key={key} className={`metric-bubble portfolio-main-metric-bubble ${scoreTone(value)}`}>
              <div className="portfolio-metric-bar-head"><span>{categoryLabel(key)}</span><strong className={`score-ovr-stack ${scoreTone(value)}`}><span>{scoreText(value)}</span><small>OVR</small></strong></div>
              <div className="metric-fill-track"><span className={scoreTone(value)} style={{ width: `${Math.max(0, Math.min(100, (score10(value) || 0) * 10))}%` }} /></div>
              <p>{portfolioMetricSummary(key, value)}</p>
            </article>
          ))}
        </div>
      </article>
    </div>
  );
}

function portfolioValueChangePercent(points = [], currentValue) {
  const clean = (Array.isArray(points) ? points : []).filter((p) => Number.isFinite(Number(p.value)) && Number(p.value) > 0);
  const current = Number(currentValue);
  if (!clean.length || !Number.isFinite(current) || current <= 0) return 0;
  const start = Number(clean[0].value);
  if (!Number.isFinite(start) || start <= 0) return 0;
  return ((current - start) / start) * 100;
}

function portfolioEvalScoreChange(points = [], currentScore) {
  const clean = (Array.isArray(points) ? points : []).filter((p) => Number.isFinite(Number(p.value)) && Number(p.value) > 0);
  const current = Number(currentScore);
  if (!clean.length || !Number.isFinite(current)) return 0;
  const start = Number(clean[0].value);
  if (!Number.isFinite(start)) return 0;
  return current - start;
}

function buildPortfolioProsCons(groups = []) {
  const holdings = (groups || []).flatMap((group) => (group.holdings || []).map((holding) => ({ ...holding, sector: group.sector })));
  const scored = holdings.filter((h) => Number.isFinite(Number(h.edgeScore)));
  const strongStocks = scored
    .filter((h) => Number(h.edgeScore) >= 7.0)
    .sort((a, b) => (Number(b.weightPercent || 0) * Number(b.edgeScore || 0)) - (Number(a.weightPercent || 0) * Number(a.edgeScore || 0)))
    .slice(0, 6);
  const weakStocks = scored
    .filter((h) => Number(h.edgeScore) < 6.8)
    .sort((a, b) => (Number(b.weightPercent || 0) * (10 - Number(b.edgeScore || 0))) - (Number(a.weightPercent || 0) * (10 - Number(a.edgeScore || 0))))
    .slice(0, 6);
  const topIndustries = [...(groups || [])].sort((a, b) => Number(b.totalWeightPercent || 0) - Number(a.totalWeightPercent || 0)).slice(0, 3);
  const bestIndustries = [...(groups || [])].filter((g) => Number.isFinite(Number(g.sectorEvalScore))).sort((a, b) => Number(b.sectorEvalScore || 0) - Number(a.sectorEvalScore || 0)).slice(0, 3);
  const weakestIndustries = [...(groups || [])].filter((g) => Number.isFinite(Number(g.sectorEvalScore))).sort((a, b) => Number(a.sectorEvalScore || 0) - Number(b.sectorEvalScore || 0)).slice(0, 3);

  const pros = strongStocks.length
    ? `The portfolio gets its strongest support from ${strongStocks.map((h) => `${h.symbol} (${scoreText(h.edgeScore)}, ${Number(h.weightPercent || 0).toFixed(1)}%)`).join(", ")}. These positions matter because they are not just high-scoring stocks; they also carry enough weight to move the total Portfolio Eval Score. The strongest industry areas are ${bestIndustries.map((g) => `${g.sector} (${scoreText(g.sectorEvalScore)})`).join(", ")}, which means the portfolio's best quality is concentrated in groups with stronger weighted fundamentals, momentum, valuation, or news backdrop. The largest exposures are ${topIndustries.map((g) => `${g.sector} at ${Number(g.totalWeightPercent || 0).toFixed(1)}%`).join(", ")}, so those areas explain most of the portfolio's upside in the Eval model.`
    : `The portfolio has exposure across ${groups.length || 0} industries, which helps keep the overall score from depending on one single stock. Its strongest holdings and highest-scoring industries will appear here after more holdings score above the stronger Eval threshold.`;

  const cons = weakStocks.length
    ? `The biggest drag comes from ${weakStocks.map((h) => `${h.symbol} (${scoreText(h.edgeScore)}, ${Number(h.weightPercent || 0).toFixed(1)}%)`).join(", ")}. These holdings hurt more when their scores are lower and their portfolio weights are meaningful, because the total Portfolio Eval Score is weighted by position size. The weakest industry areas are ${weakestIndustries.map((g) => `${g.sector} (${scoreText(g.sectorEvalScore)})`).join(", ")}, so those sections deserve the closest review. If a lower-scoring stock or industry grows into a larger position, it can pull down the portfolio even if the rest of the holdings look stronger.`
    : `The current report does not show many clearly weak holdings. The main weakness to monitor is concentration: even a strong stock can make the portfolio less balanced if it becomes too large, and one oversized industry can dominate the score's movement over time.`;

  return { pros, cons };
}

function PortfolioValueChart({ points = [] }) {
  const width = 900;
  const height = 260;
  const pad = 28;
  if (!points.length) {
    return <div className="portfolio-chart-empty">Portfolio value history starts after the first saved refresh after market open.</div>;
  }
  const values = points.map((p) => Number(p.value)).filter(Number.isFinite);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(1, max - min);
  const coords = points.map((point, index) => {
    const x = pad + (index / Math.max(1, points.length - 1)) * (width - pad * 2);
    const y = height - pad - ((Number(point.value) - min) / spread) * (height - pad * 2);
    return { x, y };
  });
  const path = coords.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${path} L${coords[coords.length - 1].x.toFixed(1)},${height-pad} L${coords[0].x.toFixed(1)},${height-pad} Z`;
  const start = points[0];
  const end = points[points.length - 1];
  const change = Number(end.value) - Number(start.value);
  const pct = Number(start.value) > 0 ? (change / Number(start.value)) * 100 : null;
  return (
    <div className="portfolio-chart-wrap premium-line-chart-card">
      <div className="portfolio-chart-labels">
        <span>{new Date(`${start.date}T12:00:00`).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span>
        <strong>{money(end.value)} <small>{Number.isFinite(pct) ? signedPercent(pct) : ""}</small></strong>
        <span>{new Date(`${end.date}T12:00:00`).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span>
      </div>
      <svg className="portfolio-value-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily portfolio value">
        <defs>
          <linearGradient id="portfolioArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity=".30" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <filter id="portfolioGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <path className="portfolio-chart-area" d={area} fill="url(#portfolioArea)" />
        <path className="portfolio-chart-line" d={path} filter="url(#portfolioGlow)" />
      </svg>
    </div>
  );
}

function PortfolioEvalScoreChart({ points = [] }) {
  const width = 900;
  const height = 260;
  const pad = 28;
  if (!points.length) {
    return <div className="portfolio-chart-empty">Portfolio Eval Score history starts after the first saved 5:15 AM ET refresh.</div>;
  }
  const cleanPoints = points.filter((p) => Number.isFinite(Number(p.value)));
  if (!cleanPoints.length) return <div className="portfolio-chart-empty">Portfolio Eval Score history starts after the first saved 5:15 AM ET refresh.</div>;
  const min = Math.max(0, Math.min(...cleanPoints.map((p) => Number(p.value))) - 0.5);
  const max = Math.min(10, Math.max(...cleanPoints.map((p) => Number(p.value))) + 0.5);
  const spread = Math.max(1, max - min);
  const coords = cleanPoints.map((point, index) => {
    const x = pad + (index / Math.max(1, cleanPoints.length - 1)) * (width - pad * 2);
    const y = height - pad - ((Number(point.value) - min) / spread) * (height - pad * 2);
    return { x, y };
  });
  const path = coords.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const start = cleanPoints[0];
  const end = cleanPoints[cleanPoints.length - 1];
  const change = Number(end.value) - Number(start.value);
  return (
    <div className="portfolio-chart-wrap premium-line-chart-card eval-score-history-card">
      <div className="portfolio-chart-labels">
        <span>{new Date(`${start.date}T12:00:00`).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span>
        <strong>{scoreText(end.value)} <small>{Number.isFinite(change) ? `${change >= 0 ? "+" : ""}${change.toFixed(1)}` : ""}</small></strong>
        <span>{new Date(`${end.date}T12:00:00`).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span>
      </div>
      <svg className="portfolio-value-chart portfolio-eval-score-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily Portfolio Eval Score">
        <defs>
          <filter id="portfolioEvalGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <path className="portfolio-chart-line" d={path} filter="url(#portfolioEvalGlow)" />
      </svg>
    </div>
  );
}

function PortfolioHiddenDataTable({ valueHistory = [], evalHistory = [] }) {
  return (
    <table className="portfolio-hidden-data-table" aria-hidden="true">
      <tbody>
        {valueHistory.map((point) => <tr key={`value-${point.date}`}><td>value</td><td>{point.date}</td><td>{point.value}</td></tr>)}
        {evalHistory.map((point) => <tr key={`eval-${point.date}`}><td>eval</td><td>{point.date}</td><td>{point.value}</td></tr>)}
      </tbody>
    </table>
  );
}



function getSavedMorningPortfolio(user) {
  // Portfolio data is no longer cached to localStorage or account sync.
  // Return an empty live-safe shape instead of reading saved portfolio state.
  return { symbols: [], previousScores: {}, holdings: [], strategyTargets: {}, portfolioName: "Session Portfolio", analysis: null };
}

function formatBrewCurrency(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "N/A";
  const sign = num > 0 ? "+" : num < 0 ? "-" : "";
  return `${sign}$${Math.abs(num).toFixed(2)}`;
}

function formatEarningsRevenue(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "N/A";
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(abs >= 10e12 ? 1 : 2)} trillion`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(abs >= 10e9 ? 1 : 2)} billion`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(abs >= 10e6 ? 0 : 2)} million`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(abs >= 10e3 ? 0 : 1)} thousand`;
  return `${sign}$${abs.toFixed(0)}`;
}

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatBrewPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "N/A";
  const sign = num > 0 ? "+" : num < 0 ? "-" : "";
  return `${sign}${Math.abs(num).toFixed(2)}%`;
}

function brewMoveTone(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || Math.abs(num) < 0.005) return "flat";
  return num > 0 ? "positive" : "negative";
}



function formatEarningsDate(dateText) {
  if (!dateText) return "Date TBD";
  const date = new Date(`${dateText}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(dateText);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" });
}

function earningsEventSummary(event = {}) {
  const parts = [];
  if (event.epsEstimate !== null && event.epsEstimate !== undefined) {
    parts.push(`EPS expectations are ${Number(event.epsEstimate) >= 0 ? "$" : "-$"}${Math.abs(Number(event.epsEstimate)).toFixed(2)}.`);
  }
  if (event.revenueEstimate !== null && event.revenueEstimate !== undefined) {
    parts.push(`Revenue expectations are ${formatEarningsRevenue(event.revenueEstimate)}.`);
  }
  if (!parts.length && event.expectations) parts.push(event.expectations);
  const setup = `${event.symbol || "This holding"} reports earnings on ${formatEarningsDate(event.date)}.`;
  const meaning = "This matters because earnings can quickly change revenue growth, margins, news sentiment, momentum, and the stock's Eval Score.";
  return [setup, ...parts, meaning].filter(Boolean).join(" ");
}

function groupEarningsByDate(events = []) {
  return (Array.isArray(events) ? events : []).reduce((acc, item) => {
    const date = String(item?.date || "").slice(0, 10) || "TBD";
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});
}

function buildEarningsCalendarDays(events = [], days = 14) {
  const byDate = groupEarningsByDate(events);
  const today = new Date();
  const end = new Date(today);
  end.setDate(today.getDate() + Math.max(1, Number(days || 14)) - 1);
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  const finish = new Date(end);
  finish.setDate(end.getDate() + (6 - end.getDay()));
  const output = [];
  for (let d = new Date(start); d <= finish; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const day = d.getDay();
    output.push({
      date: key,
      events: byDate[key] || [],
      isTradingDay: day !== 0 && day !== 6,
      isOutsideWindow: d < today || d > end,
    });
  }
  return output;
}

function EarningsMiniList({ earnings = [], emptyText = "No upcoming portfolio earnings found." }) {
  const grouped = groupEarningsByDate(earnings);
  const dates = Object.keys(grouped).sort();
  if (!dates.length) return <p className="morning-muted">{emptyText}</p>;
  return (
    <div className="earnings-mini-list">
      {dates.map((date) => (
        <div className="earnings-mini-day" key={date}>
          <div className="earnings-mini-date">{formatEarningsDate(date)}</div>
          <div className="earnings-mini-events">
            {grouped[date].map((event, index) => (
              <article className="earnings-mini-event" key={`${event.symbol}-${date}-${index}`}>
                <strong>{event.symbol}</strong>
                <span>{event.expectations || "Expectations unavailable"}</span>
              </article>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PortfolioEarningsCalendar({
  earnings = [],
  loading = false,
  title = "Upcoming portfolio earnings",
  subtitle = "Next two weeks • portfolio holdings only",
  className = "",
  days = 14,
  scoreLookup = {},
}) {
  const [selectedEarning, setSelectedEarning] = useState(null);
  const calendarDays = buildEarningsCalendarDays(earnings, days);
  const todayKey = localDateKey();
  const mobileDays = calendarDays.filter((day) => day.events.length);
  return (
    <section className={`portfolio-earnings-calendar-card ${className}`.trim()}>
      <div className="portfolio-card-title-row">
        <div>
          <span className="section-title"><Activity size={17}/> Earnings calendar</span>
          <h3>{title}</h3>
        </div>
        <small>{subtitle}</small>
      </div>
      {loading ? <div className="portfolio-earnings-loading"><RefreshCw className="spin" size={16}/> Loading earnings dates...</div> : null}
      <div className="portfolio-earnings-calendar-weekdays" aria-hidden="true">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => <span key={label}>{label}</span>)}
      </div>
      <div className="portfolio-earnings-calendar-grid">
        {calendarDays.map((day) => (
          <div className={`portfolio-earnings-day ${day.events.length ? "has-events" : "empty"} ${day.isTradingDay ? "trading-day" : "non-trading-day"} ${day.isOutsideWindow ? "outside-window" : ""} ${day.date === todayKey ? "today" : ""}`} key={day.date}>
            <span>{formatEarningsDate(day.date)}</span>
            <div>
              {!day.isTradingDay ? <small className="market-closed-x">×</small> : day.events.length ? day.events.map((event, index) => (
                <button
                  type="button"
                  className={`portfolio-earnings-ticker ${scoreTone(scoreLookup?.[event.symbol] ?? event.evalScore ?? event.score)}`}
                  key={`${event.symbol}-${index}`}
                  title="View earnings expectations"
                  onClick={() => setSelectedEarning(event)}
                >
                  {event.symbol}
                </button>
              )) : <small>—</small>}
            </div>
          </div>
        ))}
      </div>
      <div className="portfolio-earnings-mobile-list">
        {mobileDays.length ? mobileDays.map((day) => (
          <article className={`portfolio-earnings-mobile-day ${day.date === todayKey ? "today" : ""}`} key={`mobile-${day.date}`}>
            <strong>{formatEarningsDate(day.date)}</strong>
            <div>
              {day.events.map((event, index) => (
                <button
                  type="button"
                  className={`portfolio-earnings-ticker ${scoreTone(scoreLookup?.[event.symbol] ?? event.evalScore ?? event.score)}`}
                  key={`mobile-${event.symbol}-${index}`}
                  onClick={() => setSelectedEarning(event)}
                >
                  {event.symbol}
                </button>
              ))}
            </div>
          </article>
        )) : <div className="portfolio-earnings-mobile-empty">No portfolio earnings in this window.</div>}
      </div>
      {selectedEarning ? (
        <div className={`earnings-detail-popover ${scoreTone(scoreLookup?.[selectedEarning.symbol] ?? selectedEarning.evalScore ?? selectedEarning.score)}`} role="dialog" aria-label="Earnings expectations">
          <button type="button" className="earnings-detail-close" onClick={() => setSelectedEarning(null)}>×</button>
          <div className="earnings-detail-symbol">{selectedEarning.symbol}</div>
          <div className="earnings-detail-date">{formatEarningsDate(selectedEarning.date)}</div>
          <div className="earnings-detail-grid">
            <span>EPS expectation</span>
            <b>{selectedEarning.epsEstimate !== null && selectedEarning.epsEstimate !== undefined ? `${Number(selectedEarning.epsEstimate) >= 0 ? "$" : "-$"}${Math.abs(Number(selectedEarning.epsEstimate)).toFixed(2)}` : "N/A"}</b>
            <span>Revenue expectation</span>
            <b>{selectedEarning.revenueEstimate !== null && selectedEarning.revenueEstimate !== undefined ? formatEarningsRevenue(selectedEarning.revenueEstimate) : "N/A"}</b>
          </div>
          <p>{earningsEventSummary(selectedEarning)}</p>
        </div>
      ) : null}
    </section>
  );
}

function MorningMugsDashboard({ onBack, backLabel = "Back to dashboard" }) {
  const { user } = useUser();
  const [brew, setBrew] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadBrew(forceRefresh = false) {
    setLoading(true);
    setError("");
    try {
      const portfolio = getSavedMorningPortfolio(user) || {};
      const response = await fetch(`${API}/api/morning-brew${forceRefresh ? "?refresh=1" : ""}`, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ symbols: Array.isArray(portfolio.symbols) ? portfolio.symbols : [], previousScores: portfolio.previousScores || {}, holdings: Array.isArray(portfolio.holdings) ? portfolio.holdings : [], strategyTargets: portfolio.strategyTargets || {} }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || "Could not load The Morning Mug.");
      setBrew(json);
    } catch (err) {
      setError(err?.message || "Could not load The Morning Mug.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBrew(false);
  }, [user?.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadBrew(false);
    }, 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, [user?.id]);

  const savedMorningPortfolio = getSavedMorningPortfolio(user);
  const hasSavedPortfolio = Array.isArray(savedMorningPortfolio.symbols) && savedMorningPortfolio.symbols.length > 0;
  const indexes = brew?.market?.indexes || [];
  const movers = hasSavedPortfolio ? (brew?.market?.movers || { gainers: [], losers: [] }) : { gainers: [], losers: [] };
  const articles = brew?.market?.articles || [];
  const morningEarnings = hasSavedPortfolio ? (Array.isArray(brew?.portfolio?.earnings?.events) ? brew.portfolio.earnings.events : []) : [];
  const morningScoreLookup = (Array.isArray(savedMorningPortfolio?.holdings) ? savedMorningPortfolio.holdings : []).reduce((acc, holding) => {
    const symbol = String(holding?.symbol || holding?.ticker || "").toUpperCase();
    const score = score10(holding?.edgeScore ?? holding?.score ?? holding?.evalScore);
    if (symbol && score !== null) acc[symbol] = score;
    return acc;
  }, {});

  return (
    <main className="app-shell morning-brew-page-shell">
      <div className="portrait-lock-overlay" aria-hidden="true">
        <div className="portrait-lock-card">
          <div className="portrait-lock-icon">↻</div>
          <h2>Rotate your device</h2>
          <p>Eval is designed for portrait mode on mobile and tablet.</p>
        </div>
      </div>

      <section className="morning-brew-page">
        <div className="morning-brew-hero morning-brew-hero-clean">
          <div className="morning-brew-top-row">
            <div className="morning-brew-title-wrap morning-brew-title-clean">
              <Coffee className="morning-brew-title-mug-icon" aria-hidden="true" />
              <h2><strong>The Morning Mug</strong></h2>
            </div>
            <button type="button" className="morning-brew-refresh morning-brew-refresh-icon" onClick={() => loadBrew(true)} disabled={loading} aria-label="Refresh Morning Mug">
              {loading ? <RefreshCw className="spin" size={18}/> : <RefreshCw size={18}/>}
            </button>
          </div>
          <div className="morning-brew-back-row">
            <button type="button" className="back-btn morning-brew-back" onClick={onBack}>
              <ArrowLeft size={18} /> {backLabel}
            </button>
          </div>
        </div>

        {error && <div className="morning-brew-error"><AlertTriangle size={16}/> {error}</div>}
        {loading && !brew ? (
          <div className="morning-brew-loading"><RefreshCw className="spin" size={18}/> Loading The Morning Mug...</div>
        ) : (
          <div className="morning-brew-page-grid">
            <section className="morning-brew-card market-card">
              <div className="morning-section-title"><BarChart3 size={17}/> Pre-market indexes</div>
              <div className="morning-index-grid">
                {indexes.length ? indexes.map((item) => {
                  const tone = brewMoveTone(item.changePercent);
                  return (
                    <div className={`morning-index ${tone}`} key={item.name || item.proxy}>
                      <span>{item.name}</span>
                      <strong>{formatBrewPercent(item.changePercent)}</strong>
                    </div>
                  );
                }) : <p className="morning-muted">Index data is unavailable right now.</p>}
              </div>
              {hasSavedPortfolio && ((movers.gainers || []).length || (movers.losers || []).length) ? (
                <div className="morning-portfolio-movers">
                  <div className="morning-movers-column">
                    <span className="morning-movers-label up">Top 3 portfolio gainers</span>
                    {(movers.gainers || []).length ? movers.gainers.map((item) => (
                      <div className="morning-mover-row positive" key={`gain-${item.symbol}`}>
                        <b>{item.symbol}</b>
                        <strong>{formatBrewPercent(item.changePercent)}</strong>
                      </div>
                    )) : <p className="morning-muted compact">No positive movers yet.</p>}
                  </div>
                  <div className="morning-movers-column">
                    <span className="morning-movers-label down">Bottom 3 portfolio losers</span>
                    {(movers.losers || []).length ? movers.losers.map((item) => (
                      <div className="morning-mover-row negative" key={`loss-${item.symbol}`}>
                        <b>{item.symbol}</b>
                        <strong>{formatBrewPercent(item.changePercent)}</strong>
                      </div>
                    )) : <p className="morning-muted compact">No negative movers yet.</p>}
                  </div>
                </div>
              ) : null}
              <p className="morning-footnote">Pre-market movement uses liquid index ETF proxies, displayed as Dow Jones, Nasdaq, and S&amp;P 500.</p>
            </section>

            {hasSavedPortfolio ? (
              <PortfolioEarningsCalendar
                earnings={morningEarnings}
                loading={loading && !brew}
                title="Portfolio earnings: next 2 weeks"
                days={14}
                scoreLookup={morningScoreLookup}
                className="morning-mugs-earnings-calendar"
              />
            ) : null}



            <section className="morning-brew-card news-card wide">
              <div className="morning-section-title"><Newspaper size={17}/> Top pre-market headlines</div>
              {brew?.market?.headliner?.headline ? (
                <div className="morning-headliner-chip">
                  <span>Headliner</span>
                  <b>{brew.market.headliner.headline}</b>
                </div>
              ) : null}
              <div className="morning-news-list morning-news-cards">
                {articles.length ? articles.map((article, index) => {
                  const articleScore = score10(article.score);
                  const tone = scoreTone(articleScore);
                  return (
                    <article className={`morning-news-item news-score-${tone}`} key={`${article.url || article.headline}-${index}`}>
                      {article.image ? (
                        <div className="morning-news-image-wrap">
                          <img src={article.image} alt="" loading="lazy"/>
                          <span>{index + 1}</span>
                        </div>
                      ) : <span>{index + 1}</span>}
                      <div>
                        <div className="morning-news-title-row">
                          <b>{article.headline}</b>
                          {articleScore !== null ? <strong className={`morning-news-score ${tone}`}>{articleScore.toFixed(1)}</strong> : null}
                        </div>
                        <p>{article.summary || "A CNBC pre-market headline to watch before the open."}</p>
                        {article.url ? <a href={article.url} target="_blank" rel="noreferrer">Read full article</a> : null}
                      </div>
                    </article>
                  );
                }) : <p className="morning-muted">No CNBC pre-market headlines returned yet.</p>}
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}


const PORTFOLIO_HOLDING_COLUMNS = [
  { key: "shares", label: "Quantity", shortLabel: "Q" },
  { key: "averageCost", label: "Avg. cost", shortLabel: "Avg" },
  { key: "value", label: "Value", shortLabel: "Value" },
  { key: "return", label: "Return", shortLabel: "Return" },
  { key: "portfolioWeight", label: "Portfolio weight", shortLabel: "Port %" },
  { key: "sectorWeight", label: "Industry weight", shortLabel: "Ind %" },
  { key: "eval", label: "Eval", shortLabel: "Eval" },
];

const DEFAULT_PORTFOLIO_VISIBLE_COLUMNS = PORTFOLIO_HOLDING_COLUMNS.reduce((acc, column) => {
  acc[column.key] = true;
  return acc;
}, {});


const PORTFOLIO_DETAILED_COLUMNS = [
  { key: "symbol", label: "Ticker", type: "text" },
  { key: "eval", label: "Eval", type: "score" },
  { key: "growth", label: "Growth", type: "score" },
  { key: "profitability", label: "Profitability", type: "score" },
  { key: "financialHealth", label: "Financial Health", type: "score" },
  { key: "valuation", label: "Valuation", type: "score" },
  { key: "momentum", label: "Momentum", type: "score" },
  { key: "reversal", label: "Pullback", type: "score" },
  { key: "shares", label: "Quantity", type: "number" },
  { key: "averageCost", label: "Avg. Cost", type: "money" },
  { key: "value", label: "Value", type: "money" },
  { key: "return", label: "Return", type: "return" },
  { key: "portfolioWeight", label: "Portfolio %", type: "percent" },
];

const DEFAULT_PORTFOLIO_DETAILED_COLUMNS = PORTFOLIO_DETAILED_COLUMNS.reduce((acc, column) => {
  acc[column.key] = true;
  return acc;
}, {});

function portfolioColumnStorageKeyFor(user) {
  const id = user?.id || user?.primaryEmailAddress?.emailAddress || "guest";
  return `eval-portfolio-columns-v1-${id}`;
}

function normalizePortfolioVisibleColumns(saved) {
  const next = { ...DEFAULT_PORTFOLIO_VISIBLE_COLUMNS };
  if (saved && typeof saved === "object") {
    PORTFOLIO_HOLDING_COLUMNS.forEach((column) => {
      if (typeof saved[column.key] === "boolean") next[column.key] = saved[column.key];
    });
  }
  if (!Object.values(next).some(Boolean)) next.eval = true;
  return next;
}

function currentHoldingPriceValue(holding) {
  const direct = Number(holding?.currentPrice ?? holding?.price);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const value = holdingCurrentValue(holding);
  const shares = Number(holding?.shares);
  return Number.isFinite(value) && Number.isFinite(shares) && shares > 0 ? value / shares : null;
}



function PortfolioPage({ onBack, onAnalyze, onMorning, backLabel = "Back to dashboard" }) {
  const { user } = useUser();
  const firstName =
    user?.firstName ||
    user?.fullName?.split(" ")?.[0] ||
    user?.primaryEmailAddress?.emailAddress?.split("@")?.[0] ||
    "Your";
  const portfolioTitle = `${firstName}'s Portfolio`;
  const storageKey = portfolioStorageKeyFor(user);
  const columnStorageKey = portfolioColumnStorageKeyFor(user);

  const [csvName, setCsvName] = useState("");
  const [csvAnalysis, setCsvAnalysis] = useState(null);
  const [savedHoldings, setSavedHoldings] = useState([]);
  const [portfolioHistory, setPortfolioHistory] = useState([]);
  const [evalScoreHistory, setEvalScoreHistory] = useState([]);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCurrentListOpen, setManualCurrentListOpen] = useState(false);
  const [portfolioToolsOpen, setPortfolioToolsOpen] = useState(false);
  const [manualRows, setManualRows] = useState([blankManualHolding(), blankManualHolding(), blankManualHolding()]);
  const [manualTransactions, setManualTransactions] = useState([]);
  const [cashHoldings, setCashHoldings] = useState(0);
  const [cashInput, setCashInput] = useState("0");
  const [manualTransactionSearch, setManualTransactionSearch] = useState("");
  const [hideHoldingsValue, setHideHoldingsValue] = useState(true);
  const [activeIndustry, setActiveIndustry] = useState("");
    const [metricsOpen, setMetricsOpen] = useState(false);
  const [openIndustries, setOpenIndustries] = useState({});
  const [sectorScoresOpen, setIndustryScoresOpen] = useState(false);
  const [portfolioInsightModal, setPortfolioInsightModal] = useState(null);
  const [portfolioInsightPage, setPortfolioInsightPage] = useState(null);
  const [holdingSearch, setHoldingSearch] = useState("");
  const [metricModal, setMetricModal] = useState(null);
  const holdingsSectionRef = useRef(null);
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [strategyTargets, setStrategyTargets] = useState({});
  const [strategySavedLabel, setStrategySavedLabel] = useState("");
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleHoldingColumns, setVisibleHoldingColumns] = useState(() => {
    try {
      return normalizePortfolioVisibleColumns(JSON.parse(localStorage.getItem(columnStorageKey) || "null"));
    } catch {
      return normalizePortfolioVisibleColumns(null);
    }
  });

  const [portfolioDetailedPage, setPortfolioDetailedPage] = useState(false);
  const [detailedSort, setDetailedSort] = useState({ key: "eval", direction: "desc" });
  const [detailedColumnsOpen, setDetailedColumnsOpen] = useState(false);
  const [visibleDetailedColumns, setVisibleDetailedColumns] = useState(DEFAULT_PORTFOLIO_DETAILED_COLUMNS);

  // Portfolio display is saved so reopening the Portfolio page does not rescore automatically.
  // A full rescore runs only after CSV upload, manual transaction save, or the Refresh button.
  // Earnings remain cached for 48 hours, and individual stock Eval Scores use the main dashboard cache.

  const loadedSavedUploadRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(columnStorageKey, JSON.stringify(visibleHoldingColumns));
    } catch {
      // Column preferences are optional.
    }
  }, [visibleHoldingColumns, columnStorageKey]);

  useEffect(() => {
    try {
      setVisibleHoldingColumns(normalizePortfolioVisibleColumns(JSON.parse(localStorage.getItem(columnStorageKey) || "null")));
    } catch {
      setVisibleHoldingColumns(normalizePortfolioVisibleColumns(null));
    }
  }, [columnStorageKey]);

  useEffect(() => {
    if (loadedSavedUploadRef.current) return;
    loadedSavedUploadRef.current = true;

    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      const holdings = Array.isArray(saved?.holdings) ? saved.holdings : [];
      const fileName = saved?.csvName || saved?.fileName || `${firstName} Portfolio.csv`;
      const nextManualRows = holdings.length ? holdingsToManualRows(holdings) : [blankManualHolding(), blankManualHolding(), blankManualHolding()];
      const savedDisplay = saved?.display && typeof saved.display === "object" ? saved.display : null;
      const savedAnalysis = savedDisplay?.analysis && typeof savedDisplay.analysis === "object" ? savedDisplay.analysis : null;
      const savedValueHistory = Array.isArray(savedDisplay?.portfolioHistory) ? savedDisplay.portfolioHistory : [];
      const savedEvalHistory = Array.isArray(savedDisplay?.evalScoreHistory) ? savedDisplay.evalScoreHistory : [];
      const savedTransactions = Array.isArray(saved?.manualTransactions) ? saved.manualTransactions : [];
      const savedCash = Number(saved?.cashHoldings || 0);

      if (!holdings.length && !savedTransactions.length && !(Number.isFinite(savedCash) && savedCash > 0)) return;

      setCsvName(fileName);
      setSavedHoldings(holdings);
      setManualRows(nextManualRows);
      setManualTransactions(savedTransactions);
      setCashHoldings(Number.isFinite(savedCash) ? savedCash : 0);
      setCashInput(String(Number.isFinite(savedCash) ? savedCash : 0));
      setPortfolioHistory(savedValueHistory);
      setEvalScoreHistory(savedEvalHistory);

      if (savedAnalysis && holdings.length) {
        setCsvAnalysis({
          ...savedAnalysis,
          history: savedAnalysis?.history || savedValueHistory,
          evalScoreHistory: savedAnalysis?.evalScoreHistory || savedEvalHistory,
        });
      } else {
        analyzeCsvHoldings(holdings, fileName, {
          silent: false,
          recordValueHistory: false,
          recordEvalHistory: false,
          manualRowsOverride: nextManualRows,
          manualTransactionsOverride: savedTransactions,
          skipPersist: false,
        });
      }
    } catch {
      // Saved CSV restoration is optional. A bad local entry should never break the portfolio page.
    }
  }, [storageKey]);

  useEffect(() => {
    const reloadSyncedPortfolio = (event) => {
      if (event?.detail?.storageKey && event.detail.storageKey !== storageKey) return;
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
        const holdings = Array.isArray(saved?.holdings) ? saved.holdings : [];
        const fileName = saved?.csvName || saved?.fileName || `${firstName} Portfolio.csv`;
        const nextManualRows = holdings.length ? holdingsToManualRows(holdings) : [blankManualHolding(), blankManualHolding(), blankManualHolding()];
        const savedDisplay = saved?.display && typeof saved.display === "object" ? saved.display : null;
        const savedAnalysis = savedDisplay?.analysis && typeof savedDisplay.analysis === "object" ? savedDisplay.analysis : null;
        const savedValueHistory = Array.isArray(savedDisplay?.portfolioHistory) ? savedDisplay.portfolioHistory : [];
        const savedEvalHistory = Array.isArray(savedDisplay?.evalScoreHistory) ? savedDisplay.evalScoreHistory : [];
        const savedTransactions = Array.isArray(saved?.manualTransactions) ? saved.manualTransactions : [];
        const savedCash = Number(saved?.cashHoldings || 0);

        setCsvName(fileName);
        setSavedHoldings(holdings);
        setManualRows(nextManualRows);
        setManualTransactions(savedTransactions);
        setCashHoldings(Number.isFinite(savedCash) ? savedCash : 0);
        setCashInput(String(Number.isFinite(savedCash) ? savedCash : 0));
        setPortfolioHistory(savedValueHistory);
        setEvalScoreHistory(savedEvalHistory);
        if (savedAnalysis && holdings.length) {
          setCsvAnalysis({
            ...savedAnalysis,
            history: savedAnalysis?.history || savedValueHistory,
            evalScoreHistory: savedAnalysis?.evalScoreHistory || savedEvalHistory,
          });
        } else if (!holdings.length) {
          setCsvAnalysis(null);
        }
      } catch {
        // Ignore malformed synced portfolio data.
      }
    };

    window.addEventListener("eval-portfolio-sync-imported", reloadSyncedPortfolio);
    return () => window.removeEventListener("eval-portfolio-sync-imported", reloadSyncedPortfolio);
  }, [storageKey, firstName]);

  useEffect(() => {
    const groups = csvAnalysis?.sectorGroups || csvAnalysis?.industryGroups || [];
    if (!groups.length) return;
    setActiveIndustry((current) => current || groups[0]?.sector || groups[0]?.industry || "");
    setOpenIndustries(
      groups.reduce((acc, group) => {
        const name = group?.sector || group?.industry;
        if (name) acc[name] = true;
        return acc;
      }, {})
    );
  }, [csvAnalysis]);

  // Earnings calendar removed from Portfolio and Morning Mug for now.


  // Portfolio strategy targets stay in the current session only.

  function persistPortfolioState(nextHoldings, fileName, display = null, transactions = manualTransactions, cashValue = cashHoldings) {
    try {
      const cleanHoldings = (Array.isArray(nextHoldings) ? nextHoldings : [])
        .map((holding) => ({
          symbol: String(holding?.symbol || holding?.ticker || "").trim().toUpperCase(),
          shares: Number(holding?.shares ?? holding?.quantity ?? 0),
          averageCost: Number(holding?.averageCost ?? holding?.avgCost ?? holding?.purchasePrice ?? 0) || 0,
        }))
        .filter((holding) => holding.symbol && Number.isFinite(holding.shares) && holding.shares > 0);

      const numericCash = Number(cashValue || 0);
      if (!cleanHoldings.length && !(Number.isFinite(numericCash) && numericCash > 0) && !(Array.isArray(transactions) && transactions.length)) {
        localStorage.removeItem(storageKey);
        window.dispatchEvent(new Event("eval-account-sync-changed"));
        return;
      }

      const safeDisplay = display && typeof display === "object"
        ? {
            savedAt: new Date().toISOString(),
            analysis: display.analysis || null,
            portfolioHistory: Array.isArray(display.portfolioHistory) ? display.portfolioHistory.slice(-260) : [],
            evalScoreHistory: Array.isArray(display.evalScoreHistory) ? display.evalScoreHistory.slice(-260) : [],
          }
        : null;

      localStorage.setItem(storageKey, JSON.stringify({
        version: 2,
        csvName: fileName || `${firstName} Portfolio.csv`,
        savedAt: new Date().toISOString(),
        holdings: cleanHoldings,
        manualTransactions: Array.isArray(transactions) ? transactions.slice(0, 250) : [],
        cashHoldings: Number.isFinite(numericCash) ? numericCash : 0,
        display: safeDisplay,
      }));
      window.dispatchEvent(new Event("eval-account-sync-changed"));
    } catch {
      // Uploaded holdings/display persistence is optional and should never block analysis.
    }
  }

  async function analyzeCsvHoldings(holdings, fileName = `${firstName} Portfolio.csv`, { silent = false, recordValueHistory = true, recordEvalHistory = true, manualRowsOverride = null, manualTransactionsOverride = null, cashOverride = null, skipPersist = false } = {}) {
    setCsvLoading(true);
    setCsvError("");
    if (!silent) setCsvAnalysis(null);
    setCsvName(fileName);
    setSavedHoldings(holdings);

    try {
      const response = await fetch(`${API}/api/portfolio-csv`, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ holdings, portfolioName: portfolioTitle }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || "Could not analyze this portfolio.");
      const nextHistory = recordValueHistory ? buildPortfolioHistory(portfolioHistory, json) : portfolioHistory;
      const nextEvalScoreHistory = recordEvalHistory ? buildPortfolioEvalHistory(evalScoreHistory, json) : evalScoreHistory;
      const nextTransactions = Array.isArray(manualTransactionsOverride) ? manualTransactionsOverride : manualTransactions;
      const nextCash = Number.isFinite(Number(cashOverride)) ? Number(cashOverride) : cashHoldings;
      const nextAnalysis = { ...json, history: nextHistory, evalScoreHistory: nextEvalScoreHistory };
      setPortfolioHistory(nextHistory);
      setEvalScoreHistory(nextEvalScoreHistory);
      setCsvAnalysis(nextAnalysis);
      if (Array.isArray(manualTransactionsOverride)) setManualTransactions(manualTransactionsOverride);
      setCashHoldings(nextCash);
      setCashInput(String(nextCash));
      if (!skipPersist) {
        persistPortfolioState(holdings, fileName, {
          analysis: nextAnalysis,
          portfolioHistory: nextHistory,
          evalScoreHistory: nextEvalScoreHistory,
        }, nextTransactions, nextCash);
      }
      setPortfolioToolsOpen(false);
      setManualOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setCsvError(err?.message || "Could not analyze this portfolio.");
    } finally {
      setCsvLoading(false);
    }
  }

  async function handleCsvFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setCsvError("Please upload a CSV file.");
      return;
    }
    try {
      const text = await file.text();
      const holdings = parsePortfolioCsv(text);
      const nextManualRows = holdingsToManualRows(holdings);
      setManualRows(nextManualRows);
      await analyzeCsvHoldings(holdings, file.name, { manualRowsOverride: nextManualRows });
    } catch (err) {
      setCsvAnalysis(null);
      setCsvError(err?.message || "Could not read that CSV file.");
    }
  }

  function refreshSavedPortfolio({ silent = true, recordValueHistory = true, recordEvalHistory = true } = {}) {
    if (!savedHoldings.length) {
      setCsvError("Upload a CSV or enter holdings first, then refresh will rescore the saved portfolio.");
      return;
    }
    analyzeCsvHoldings(savedHoldings, csvName || `${firstName} Portfolio.csv`, { silent, recordValueHistory, recordEvalHistory });
  }

  // Automatic portfolio cache refresh removed. Refresh only runs when the user uploads, edits, or taps Refresh.

  function updateManualRow(id, field, value) {
    setManualRows((rows) => rows.map((row) => row.id === id ? { ...row, [field]: value, __touched: true } : row));
  }

  function addManualRow() {
    setManualRows((rows) => [...rows, blankManualHolding("add")]);
  }

  async function removeManualRow(id) {
    const row = manualRows.find((item) => item.id === id);
    const label = String(row?.symbol || "this entry").trim().toUpperCase() || "this entry";

    if ((row?.mode || "") === "current" && label !== "this entry") {
      if (!window.confirm(`Delete ${label} completely? This removes the holding without adding anything to cash.`)) return;
      const nextHoldings = savedHoldings.filter((holding) => String(holding?.symbol || holding?.ticker || "").toUpperCase() !== label);
      const nextRows = holdingsToManualRows(nextHoldings);
      setManualRows(nextRows);
      setSavedHoldings(nextHoldings);
      if (!nextHoldings.length) {
        setCsvAnalysis(null);
        persistPortfolioState([], csvName || `${firstName} Portfolio.csv`, null, manualTransactions, cashHoldings);
        return;
      }
      await analyzeCsvHoldings(nextHoldings, csvName || `${firstName} Portfolio.csv`, { manualRowsOverride: nextRows, manualTransactionsOverride: manualTransactions, cashOverride: cashHoldings });
      return;
    }

    setManualRows((rows) => {
      if (rows.length <= 1) return rows;
      if (!window.confirm(`Delete ${label} from manual entry?`)) return rows;
      return rows.filter((item) => item.id !== id);
    });
  }

  async function deleteAllManualPortfolio() {
    const confirmed = window.confirm(
      "Delete all portfolio holdings? This completely resets the portfolio, clears cash, transactions, saved display, and removes the uploaded/manual holdings. This does not create sell trades."
    );
    if (!confirmed) return;

    setManualRows([blankManualHolding(), blankManualHolding(), blankManualHolding()]);
    setManualTransactions([]);
    setCashHoldings(0);
    setCashInput("0");
    setSavedHoldings([]);
    setCsvAnalysis(null);
    setPortfolioHistory([]);
    setEvalScoreHistory([]);
    setCsvName("");
    setCsvError("");
    setPortfolioToolsOpen(true);
    setManualOpen(true);
    setManualCurrentListOpen(false);

    try {
      localStorage.removeItem(storageKey);
      window.dispatchEvent(new Event("eval-account-sync-changed"));
    } catch {
      // Reset is local-only and should never break the page.
    }
  }

  function buildManualTransactionEntries(rows) {
    const now = new Date().toISOString();
    const savedBySymbol = new Map((Array.isArray(savedHoldings) ? savedHoldings : []).map((holding) => [
      String(holding?.symbol || holding?.ticker || "").trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").replace("-", "."),
      holding,
    ]));

    return (Array.isArray(rows) ? rows : [])
      .map((row) => {
        const symbol = String(row.symbol || "").trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").replace("-", ".");
        const rawShares = parseHoldingDollars(row.shares);
        const rawPrice = parseHoldingDollars(row.averageCost);
        const mode = row.mode || "buy";
        if (!symbol) return null;
        if (mode === "current" && !row.__touched) return null;

        const current = savedBySymbol.get(symbol) || {};
        const currentShares = Number(current?.shares ?? current?.quantity ?? 0);
        const currentAverageCost = Number(current?.averageCost ?? current?.avgCost ?? current?.purchasePrice ?? 0);
        const isClose = mode === "closed";
        const absShares = isClose ? Math.max(0, currentShares) : Math.abs(Number(rawShares || 0));
        if (!absShares) return null;
        const action = isClose ? "Close position" : mode === "sell" ? "Sell" : mode === "current" ? "Set position" : "Buy";
        const averageCost = Number.isFinite(Number(rawPrice)) && Number(rawPrice) > 0
          ? Number(rawPrice)
          : Number.isFinite(currentAverageCost) && currentAverageCost > 0
            ? currentAverageCost
            : null;
        return {
          id: `${now}-${symbol}-${Math.random().toString(16).slice(2)}`,
          date: now,
          symbol,
          action,
          shares: action === "Sell" || action === "Close position" ? -absShares : absShares,
          averageCost,
        };
      })
      .filter(Boolean);
  }


  function transactionActionClass(action) {
    const text = String(action || "").toLowerCase();
    if (text.includes("sell") || text.includes("closed")) return "sell";
    if (text.includes("buy")) return "buy";
    return "set";
  }

  function formatTransactionDate(value) {
    try {
      return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
    } catch {
      return "Recent";
    }
  }

  function loadSavedHoldingsIntoManualEntry() {
    const source = savedHoldings.length
      ? savedHoldings
      : (csvAnalysis?.sectorGroups || csvAnalysis?.industryGroups || []).flatMap((group) => group.holdings || []);
    if (!source.length) {
      setManualRows((rows) => rows.length ? rows : [blankManualHolding()]);
      return;
    }
    setManualRows(holdingsToManualRows(source));
  }

  function toggleManualEntry() {
    setManualOpen((open) => {
      const next = !open;
      if (next) loadSavedHoldingsIntoManualEntry();
      return next;
    });
  }

  function calculateManualCashDelta(rows) {
    const bySymbol = new Map();
    (Array.isArray(savedHoldings) ? savedHoldings : []).forEach((holding) => {
      const symbol = String(holding?.symbol || holding?.ticker || "").trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").replace("-", ".");
      const shares = Number(holding?.shares ?? holding?.quantity ?? 0);
      const averageCost = Number(holding?.averageCost ?? holding?.avgCost ?? holding?.purchasePrice ?? 0) || 0;
      if (symbol && Number.isFinite(shares) && shares > 0) bySymbol.set(symbol, { shares, averageCost });
    });

    return (Array.isArray(rows) ? rows : []).reduce((cashDelta, row) => {
      const symbol = String(row.symbol || "").trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").replace("-", ".");
      const shares = parseHoldingDollars(row.shares);
      const price = parseHoldingDollars(row.averageCost);
      const mode = row.mode || "buy";
      if (!symbol || mode === "current") return cashDelta;
      const current = bySymbol.get(symbol) || { shares: 0, averageCost: Number(price || 0) };
      const absShares = mode === "closed" ? Math.max(0, Number(current.shares || 0)) : Math.abs(Number(shares || 0));
      if (!absShares) return cashDelta;

      if (mode === "sell" || mode === "closed") {
        const sellShares = Math.min(absShares, Number(current.shares || 0));
        const sellPrice = Number(current.averageCost || price || 0);
        const remainingShares = Number(current.shares || 0) - sellShares;
        if (remainingShares > 0) bySymbol.set(symbol, { shares: remainingShares, averageCost: Number(current.averageCost || sellPrice || 0) });
        else bySymbol.delete(symbol);
        return cashDelta + (sellShares * sellPrice);
      }

      const oldShares = Number(current.shares || 0);
      const buyPrice = Number(price || current.averageCost || 0);
      const nextShares = oldShares + absShares;
      const nextAverageCost = nextShares > 0
        ? ((oldShares * Number(current.averageCost || 0)) + (absShares * buyPrice)) / nextShares
        : buyPrice;
      bySymbol.set(symbol, { shares: nextShares, averageCost: nextAverageCost });
      return cashDelta - (absShares * buyPrice);
    }, 0);
  }


  function aggregateManualPortfolioRows(rows) {
    const bySymbol = new Map();
    const cleanRows = Array.isArray(rows) ? rows : [];

    (Array.isArray(savedHoldings) ? savedHoldings : []).forEach((holding) => {
      const symbol = String(holding?.symbol || holding?.ticker || "").trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").replace("-", ".");
      const shares = Number(holding?.shares ?? holding?.quantity ?? 0);
      const averageCost = Number(holding?.averageCost ?? holding?.avgCost ?? holding?.purchasePrice ?? 0) || 0;
      if (symbol && Number.isFinite(shares) && shares > 0) bySymbol.set(symbol, { symbol, shares, averageCost });
    });

    cleanRows.forEach((row) => {
      const symbol = String(row.symbol || "").trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").replace("-", ".");
      const shares = parseHoldingDollars(row.shares);
      const averageCost = parseHoldingDollars(row.averageCost);
      const mode = row.mode || "buy";
      if (!symbol) return;
      if (mode !== "closed" && shares === null) return;
      if (mode === "current" && !row.__touched && bySymbol.has(symbol)) return;

      const current = bySymbol.get(symbol) || { symbol, shares: 0, averageCost: Number(averageCost || 0) };
      const absShares = mode === "closed" ? Math.max(0, Number(current.shares || 0)) : Math.abs(Number(shares || 0));

      if (mode === "closed") {
        bySymbol.delete(symbol);
        return;
      }

      if (mode === "buy") {
        const oldShares = Number(current.shares || 0);
        const nextShares = oldShares + absShares;
        const oldCost = Number(current.averageCost || 0);
        const tradeCost = Number(averageCost || oldCost || 0);
        const nextCost = nextShares > 0 && tradeCost > 0
          ? ((oldShares * oldCost) + (absShares * tradeCost)) / nextShares
          : oldCost;
        bySymbol.set(symbol, { symbol, shares: nextShares, averageCost: nextCost });
        return;
      }

      if (mode === "sell") {
        const oldShares = Number(current.shares || 0);
        const nextShares = oldShares - absShares;
        if (nextShares <= 0) bySymbol.delete(symbol);
        else bySymbol.set(symbol, { symbol, shares: nextShares, averageCost: Number(current.averageCost || averageCost || 0) });
        return;
      }

      const finalShares = Number(shares || 0);
      if (finalShares <= 0) {
        bySymbol.delete(symbol);
        return;
      }
      bySymbol.set(symbol, { symbol, shares: finalShares, averageCost: Number(averageCost || current.averageCost || 0) });
    });

    return [...bySymbol.values()]
      .filter((holding) => holding.symbol && Number(holding.shares) > 0)
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }


  function saveManualRowsAsCurrentHoldings(holdings) {
    const rows = holdingsToManualRows(holdings);
    setManualRows(rows);
    setManualCurrentListOpen(false);
    return rows;
  }

  function visiblePortfolioColumnsList() {
    const chosen = PORTFOLIO_HOLDING_COLUMNS.filter((column) => visibleHoldingColumns[column.key]);
    return chosen.length ? chosen : PORTFOLIO_HOLDING_COLUMNS.filter((column) => column.key === "eval");
  }

  function holdingsGridTemplate() {
    const columns = visiblePortfolioColumnsList();
    const units = ["minmax(58px, 1.15fr)"];
    columns.forEach((column) => {
      if (column.key === "return") units.push("minmax(62px, .86fr)");
      else if (column.key === "eval") units.push("minmax(34px, .42fr)");
      else if (column.key === "averageCost" || column.key === "value") units.push("minmax(52px, .66fr)");
      else units.push("minmax(42px, .56fr)");
    });
    return units.join(" ");
  }

  function toggleHoldingColumn(key) {
    setVisibleHoldingColumns((current) => {
      const next = { ...current, [key]: !current[key] };
      if (!Object.values(next).some(Boolean)) next[key] = true;
      return next;
    });
  }

  function showAllHoldingColumns() {
    setVisibleHoldingColumns({ ...DEFAULT_PORTFOLIO_VISIBLE_COLUMNS });
  }

  function compactHoldingColumns() {
    setVisibleHoldingColumns({
      shares: false,
      averageCost: false,
      value: true,
      return: true,
      portfolioWeight: true,
      sectorWeight: false,
      eval: true,
    });
  }


  function toggleDetailedColumn(key) {
    setVisibleDetailedColumns((current) => {
      const next = { ...current, [key]: !current[key] };
      if (!Object.values(next).some(Boolean)) next[key] = true;
      return next;
    });
  }

  function showAllDetailedColumns() {
    setVisibleDetailedColumns({ ...DEFAULT_PORTFOLIO_DETAILED_COLUMNS });
  }

  function compactDetailedColumns() {
    setVisibleDetailedColumns({
      symbol: true,
      eval: true,
      growth: true,
      profitability: true,
      financialHealth: true,
      valuation: true,
      momentum: true,
      reversal: false,
      shares: false,
      averageCost: false,
      value: true,
      return: true,
      portfolioWeight: true,
    });
  }

  function detailedMetricValue(holding, key) {
    if (key === "symbol") return String(holding?.symbol || "");
    if (key === "eval") return score10(holding?.edgeScore ?? holding?.score ?? holding?.evalScore);
    if (key === "shares") return Number(holding?.shares || 0);
    if (key === "averageCost") return Number(holding?.averageCost ?? holding?.avgCost ?? 0);
    if (key === "currentPrice") return Number(currentHoldingPriceValue(holding));
    if (key === "value") return Number(holding?.holdingDollars || 0);
    if (key === "return") return Number(holdingDollarChangeValue(holding) || 0);
    if (key === "portfolioWeight") return Number(holding?.weightPercent || 0);
    return score10(holding?.[key]);
  }

  function sortDetailedBy(key) {
    setDetailedSort((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  }

  function renderDetailedCell(holding, column) {
    const key = column.key;
    if (key === "symbol") return <td key={key} className="portfolio-detail-symbol"><button type="button" className="portfolio-symbol-with-logo portfolio-symbol-no-logo" onClick={() => onAnalyze?.(holding.symbol)}><span><b>{holding.symbol}</b><small>{holding.name || "Holding"}</small></span></button></td>;
    if (key === "eval") return <td key={key}><EvalScoreTextBadge value={holding.edgeScore} className="portfolio-detail-eval-score watch-score-plain" /></td>;
    if (["profitability", "financialHealth", "valuation", "momentum"].includes(key)) {
      const value = score10(holding?.[key]);
      return <td key={key}><span className={`portfolio-detail-score-pill ${scoreTone(value)}`}>{value === null ? "N/A" : value.toFixed(1)}</span></td>;
    }
    if (key === "shares") return <td key={key}>{Number(holding.shares || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>;
    if (key === "averageCost") return <td key={key}>{money(holding.averageCost ?? holding.avgCost ?? 0)}</td>;
    if (key === "currentPrice") return <td key={key}>{money(currentHoldingPriceValue(holding))}</td>;
    if (key === "value") return <td key={key}>{money(holding.holdingDollars)}</td>;
    if (key === "return") return <td key={key} className={Number(holdingDollarChangeValue(holding)) >= 0 ? "up" : "down"}><b>{signedMoney(holdingDollarChangeValue(holding))}</b><small>{signedPercent(holdingReturnPercentValue(holding))}</small></td>;
    if (key === "portfolioWeight") return <td key={key}>{Number(holding.weightPercent || 0).toFixed(2)}%</td>;
    return <td key={key}>N/A</td>;
  }

  function toggleIndustry(sector) {
    setOpenIndustries((current) => ({ ...current, [sector]: !current?.[sector] }));
  }

  function updateStrategyTarget(sector, value) {
    const clean = String(value || "").replace(/[^0-9.]/g, "");
    setStrategySavedLabel("");
    setStrategyTargets((current) => ({ ...current, [sector]: clean }));
  }

  function saveStrategyTargets(nextTargets = strategyTargets) {
    setStrategyTargets(nextTargets);
    setStrategySavedLabel("Strategy saved for this session");
  }

  function applyCurrentStrategyWeights() {
    const next = {};
    (csvAnalysis?.sectorGroups || csvAnalysis?.industryGroups || []).forEach((group) => {
      next[group.sector || group.industry] = Number(group.totalWeightPercent || 0).toFixed(1);
    });
    setStrategyTargets(next);
    setStrategySavedLabel("Review and save current weights");
  }

  function normalizeStrategyWeights(rawWeights, groups) {
    const next = {};
    const present = (groups || []).map((group) => group.sector || group.industry).filter(Boolean);
    if (!present.length) return next;

    let total = 0;
    present.forEach((sector) => {
      const exact = rawWeights[sector];
      const fuzzyKey = Object.keys(rawWeights).find((name) => {
        const a = String(name).toLowerCase();
        const b = String(sector).toLowerCase();
        return a === b || a.includes(b) || b.includes(a);
      });
      const value = Number(exact ?? rawWeights[fuzzyKey] ?? 0);
      const cleaned = Number.isFinite(value) ? Math.max(0, value) : 0;
      next[sector] = cleaned;
      total += cleaned;
    });

    if (total <= 0) {
      const equal = 100 / present.length;
      present.forEach((sector) => { next[sector] = equal; });
      total = 100;
    }

    Object.keys(next).forEach((sector) => {
      next[sector] = Number(((next[sector] / total) * 100).toFixed(1));
    });

    const roundedTotal = Object.values(next).reduce((sum, value) => sum + Number(value || 0), 0);
    const diff = Number((100 - roundedTotal).toFixed(1));
    if (Math.abs(diff) >= 0.1) {
      const largest = Object.keys(next).sort((a, b) => Number(next[b] || 0) - Number(next[a] || 0))[0];
      if (largest) next[largest] = Number((Number(next[largest] || 0) + diff).toFixed(1));
    }

    const formatted = {};
    Object.entries(next).forEach(([sector, value]) => {
      formatted[sector] = Number(value).toFixed(1);
    });
    return formatted;
  }

  function applyEvalStrategy() {
    const groups = csvAnalysis?.sectorGroups || csvAnalysis?.industryGroups || [];
    if (!groups.length) return;

    const ranked = [...groups]
      .map((group) => ({
        sector: group.sector || group.industry,
        score: Number(group.sectorEvalScore ?? group.industryEvalScore ?? group.score ?? 0),
        current: Number(group.totalWeightPercent || 0),
      }))
      .sort((a, b) => (b.score - a.score) || (b.current - a.current));

    const rawTargets = {};
    const totalIndustries = ranked.length;
    ranked.forEach((group, index) => {
      let target = 100 / totalIndustries;

      // Eval Strategy is built for diversification first, then a controlled tilt toward the best sleeves.
      if (totalIndustries >= 10) {
        target = index === 0 ? 14 : index === 1 ? 12 : index <= 4 ? 8 : index <= 8 ? 6 : 3.5;
      } else if (totalIndustries >= 7) {
        target = index === 0 ? 16 : index === 1 ? 14 : index <= 3 ? 11 : 7;
      } else if (totalIndustries >= 4) {
        target = index === 0 ? 22 : index === 1 ? 18 : 12;
      } else if (totalIndustries === 3) {
        target = index === 0 ? 42 : index === 1 ? 33 : 25;
      } else if (totalIndustries === 2) {
        target = index === 0 ? 58 : 42;
      } else {
        target = 100;
      }

      if (group.score >= 7.5) target *= 1.08;
      else if (group.score < 5.5) target *= 0.7;
      else if (group.score < 6.3) target *= 0.85;

      rawTargets[group.sector] = target;
    });

    const next = normalizeStrategyWeights(rawTargets, groups);
    setStrategyTargets(next);
    setStrategySavedLabel("Eval Strategy loaded — press Save Strategy to keep it");
  }

  function buildStrategySuggestions() {
    const groups = csvAnalysis?.sectorGroups || csvAnalysis?.industryGroups || [];
    if (!groups.length) return [];
    return groups.map((group) => {
      const actual = Number(group.totalWeightPercent || 0);
      const sectorName = group.sector || group.industry;
      const target = Number(strategyTargets[sectorName]);
      const diff = Number.isFinite(target) ? actual - target : null;
      const score = Number(group.sectorEvalScore ?? group.industryEvalScore ?? 0);
      let action = "Set a target weight to compare this industry.";
      let tone = "neutral";
      if (Number.isFinite(diff)) {
        if (diff >= 8 || (target > 0 && actual / target >= 1.25)) {
          action = score >= 7.5 ? "Above target but high quality; consider trimming only if it keeps stretching past the strategy range." : "Above target by a wide margin; consider trimming or redirecting new cash into underweight industries.";
          tone = "red";
        } else if (diff > 3) {
          action = "Slightly above target; watch the weight before adding more here.";
          tone = "yellow";
        } else if (diff <= -5) {
          action = score >= 7.0 ? "Below target with a solid score; consider adding through the strongest holdings in this industry." : "Below target, but wait for stronger Eval Scores before adding heavily.";
          tone = score >= 7 ? "green" : "yellow";
        } else {
          action = "Close to target; no major rebalance pressure.";
          tone = "green";
        }
      }
      return { sector: sectorName, actual, target: Number.isFinite(target) ? target : null, diff, score, action, tone };
    });
  }


  function manualRowsConfirmationText(rows, label = "Save these transactions?") {
    const transactions = buildManualTransactionEntries(rows);
    if (!transactions.length) return `${label}\n\nNo valid transaction rows were found.`;
    const lines = transactions.slice(0, 12).map((transaction) => {
      const priceText = transaction.averageCost ? ` @ ${money(transaction.averageCost)}` : "";
      return `${transaction.action}: ${transaction.symbol} — ${Number(transaction.shares || 0).toLocaleString()} shares${priceText}`;
    });
    const extra = transactions.length > 12 ? `\n+${transactions.length - 12} more` : "";
    return `${label}\n\n${lines.join("\n")}${extra}`;
  }

  async function saveManualTransactionRows(rowsToSave, { all = false } = {}) {
    const rows = (Array.isArray(rowsToSave) ? rowsToSave : []).filter(Boolean);
    const newTransactions = buildManualTransactionEntries(rows);

    if (!newTransactions.length) {
      setCsvError("Add a valid ticker, action, quantity, and price before saving.");
      return;
    }

    const confirmed = window.confirm(manualRowsConfirmationText(rows, all ? "Save all pending transactions?" : "Save this transaction?"));
    if (!confirmed) return;

    const holdings = aggregateManualPortfolioRows(rows);

    const nextManualTransactions = [...newTransactions, ...manualTransactions].slice(0, 250);
    const enteredCash = Number(parseHoldingDollars(cashInput) ?? cashHoldings ?? 0);
    const nextCashHoldings = Math.max(0, Number((enteredCash + calculateManualCashDelta(rows)).toFixed(2)));
    setManualTransactions(nextManualTransactions);
    setCashHoldings(nextCashHoldings);
    setCashInput(String(nextCashHoldings));
    const nextManualRows = holdings.length ? saveManualRowsAsCurrentHoldings(holdings) : [blankManualHolding(), blankManualHolding(), blankManualHolding()];
    if (!holdings.length) {
      setManualRows(nextManualRows);
      setSavedHoldings([]);
      setCsvAnalysis(null);
      setPortfolioHistory([]);
      setEvalScoreHistory([]);
      persistPortfolioState([], `${firstName} Manual Portfolio`, null, nextManualTransactions, nextCashHoldings);
      return;
    }
    await analyzeCsvHoldings(holdings, `${firstName} Manual Portfolio`, { silent: false, recordValueHistory: true, recordEvalHistory: true, manualRowsOverride: nextManualRows, manualTransactionsOverride: nextManualTransactions, cashOverride: nextCashHoldings });
  }

  async function analyzeManualPortfolio() {
    await saveManualTransactionRows(manualRows, { all: true });
  }

  const currentManualRows = manualRows.filter((row) => String(row.symbol || "").trim() && (row.mode || "current") === "current");
  const manualSearchQuery = String(manualTransactionSearch || "").trim().toUpperCase();
  const editableManualRows = manualRows
    .filter((row) => !String(row.symbol || "").trim() || (row.mode || "current") !== "current" || manualCurrentListOpen)
    .filter((row) => {
      if (!manualSearchQuery || !manualCurrentListOpen) return true;
      const symbol = String(row.symbol || "").toUpperCase();
      return !symbol || symbol.includes(manualSearchQuery);
    });
  const filteredManualTransactions = manualTransactions.filter((transaction) => {
    if (!manualSearchQuery) return true;
    return String(transaction?.symbol || "").toUpperCase().includes(manualSearchQuery);
  });

  const categoryEntries = Object.entries(csvAnalysis?.summary?.weightedCategoryScores || {})
    .filter(([, value]) => Number.isFinite(Number(value)) && Number(value) > 0);

  const sectorGroups = (csvAnalysis?.sectorGroups || csvAnalysis?.industryGroups || []).map((group) => ({
    ...group,
    sector: group?.sector || group?.industry || "Other",
    industry: group?.sector || group?.industry || "Other",
    sectorEvalScore: group?.sectorEvalScore ?? group?.industryEvalScore,
    industryEvalScore: group?.sectorEvalScore ?? group?.industryEvalScore,
  }));
  const sectorAllocations = buildPortfolioSectorAllocations(sectorGroups);
  const portfolioScoreLookup = sectorGroups.reduce((acc, group) => {
    (group?.holdings || []).forEach((holding) => {
      const symbol = String(holding?.symbol || holding?.ticker || "").toUpperCase();
      const score = score10(holding?.edgeScore ?? holding?.score ?? holding?.evalScore);
      if (symbol && score !== null) acc[symbol] = score;
    });
    return acc;
  }, {});
  const historyPoints = csvAnalysis?.history || portfolioHistory || [];
  const evalHistoryPoints = csvAnalysis?.evalScoreHistory || evalScoreHistory || [];
  const stockHoldingsTotal = Number(csvAnalysis?.summary?.totalHoldingDollars || 0);
  const cashTotal = Number(cashHoldings || 0);
  const totalHoldings = stockHoldingsTotal + cashTotal;
  const totalHoldingsDollarChange = Number(csvAnalysis?.summary?.totalDollarChange || 0);
  const totalHoldingsCostBase = Math.max(0.01, stockHoldingsTotal - totalHoldingsDollarChange + cashTotal);
  const totalHoldingsChangePct = Number(((totalHoldingsDollarChange / totalHoldingsCostBase) * 100).toFixed(2));
  const portfolioEvalScore = csvAnalysis?.summary?.portfolioEvalScore;
  const evalScoreChange = portfolioEvalScoreChange(evalHistoryPoints, portfolioEvalScore);
  const prosCons = buildPortfolioProsCons(sectorGroups);
  const allPortfolioHoldings = sectorGroups.flatMap((group) => (group.holdings || []).map((holding) => ({ ...holding, sector: group.sector })));

  useEffect(() => {
    preloadStockLogos(allPortfolioHoldings);
  }, [allPortfolioHoldings.map((holding) => `${holding.symbol || holding.ticker || ""}:${holding.domain || holding.website || holding.companyDomain || ""}`).join("|")]);

  const rankedPortfolioHoldings = [...allPortfolioHoldings]
    .map((holding) => ({ ...holding, evalScoreValue: score10(holding.edgeScore ?? holding.score ?? holding.evalScore) }))
    .filter((holding) => holding.symbol && holding.evalScoreValue !== null)
    .sort((a, b) => b.evalScoreValue - a.evalScoreValue);
  const topPortfolioHoldings = rankedPortfolioHoldings.slice(0, 5);
  const bottomPortfolioHoldings = [...rankedPortfolioHoldings].reverse().slice(0, 5);
  const strategySuggestions = buildStrategySuggestions();
  const holdingColumns = visiblePortfolioColumnsList();
  const holdingsTemplate = holdingsGridTemplate();
  const detailedColumns = PORTFOLIO_DETAILED_COLUMNS.filter((column) => visibleDetailedColumns[column.key]);
  const sortedDetailedHoldings = [...allPortfolioHoldings]
    .sort((a, b) => {
      const av = detailedMetricValue(a, detailedSort.key);
      const bv = detailedMetricValue(b, detailedSort.key);
      if (typeof av === "string" || typeof bv === "string") {
        const result = String(av || "").localeCompare(String(bv || ""));
        return detailedSort.direction === "desc" ? -result : result;
      }
      const result = Number(av ?? -9999) - Number(bv ?? -9999);
      return detailedSort.direction === "desc" ? -result : result;
    });

  function openPortfolioInsightPage(type) {
    setPortfolioInsightPage(type);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function jumpToPortfolioHolding(event) {
    event?.preventDefault?.();
    const query = String(holdingSearch || "").trim().toUpperCase();
    if (!query) return;
    const match = allPortfolioHoldings.find((holding) => String(holding.symbol || "").toUpperCase() === query);
    if (!match) {
      setCsvError(`Ticker ${query} is not in this portfolio.`);
      return;
    }
    setCsvError("");
    const group = sectorGroups.find((item) => (item.holdings || []).some((holding) => String(holding.symbol || "").toUpperCase() === query));
    if (group?.sector) setOpenIndustries((current) => ({ ...current, [group.sector]: true }));
    window.setTimeout(() => {
      const node = document.getElementById(holdingAnchorId(query));
      node?.scrollIntoView({ behavior: "smooth", block: "center" });
      node?.classList.add("portfolio-holding-row-highlight");
      window.setTimeout(() => node?.classList.remove("portfolio-holding-row-highlight"), 1800);
    }, 80);
  }

  if (csvAnalysis && portfolioDetailedPage) {
    return (
      <main className="portfolio-builder-page portfolio-detail-page-full">
        <div className="portfolio-builder-head portfolio-upload-topbar portfolio-dashboard-head-v3 portfolio-top-title-bubble">
          <button type="button" className="back-btn portfolio-back-icon-only" onClick={() => setPortfolioDetailedPage(false)} aria-label="Back to portfolio"><ArrowLeft size={18}/></button>
          <div className="portfolio-title-mainline portfolio-title-mainline-clean"><div><h2>Detailed Holdings</h2></div></div>
        </div>

        <section className="portfolio-detail-table-shell">
          <div className="portfolio-detail-table-head">
            <div>
              <span className="section-title"><BarChart3 size={17}/> Full table</span>
              <h3>All holdings</h3>
              <p>Sorted by Eval Score by default. Click any column heading to sort.</p>
            </div>
            <div className="portfolio-column-control-wrap portfolio-detail-column-control">
              <button type="button" className={`portfolio-column-toggle-btn ${detailedColumnsOpen ? "open" : ""}`} onClick={() => setDetailedColumnsOpen((open) => !open)}>
                Columns
              </button>
              {detailedColumnsOpen && (
                <div className="portfolio-column-menu portfolio-column-menu-front portfolio-detail-column-menu">
                  <div className="portfolio-column-menu-head">
                    <strong>Table Columns</strong>
                    <button type="button" className="portfolio-column-menu-close" onClick={() => setDetailedColumnsOpen(false)} aria-label="Close columns menu">×</button>
                  </div>
                  <div className="portfolio-column-menu-actions">
                    <button type="button" onClick={showAllDetailedColumns}>All</button>
                    <button type="button" onClick={compactDetailedColumns}>Compact</button>
                  </div>
                  {PORTFOLIO_DETAILED_COLUMNS.map((column) => (
                    <label key={column.key} className={visibleDetailedColumns[column.key] ? "active" : ""}>
                      <input type="checkbox" checked={Boolean(visibleDetailedColumns[column.key])} onChange={() => toggleDetailedColumn(column.key)} />
                      <span>{column.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="portfolio-detail-table-scroll">
            <table className="portfolio-detail-table">
              <thead>
                <tr>
                  {detailedColumns.map((column) => (
                    <th key={column.key}>
                      <button type="button" onClick={() => sortDetailedBy(column.key)}>
                        {column.label}
                        {detailedSort.key === column.key && <span>{detailedSort.direction === "desc" ? "↓" : "↑"}</span>}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedDetailedHoldings.map((holding) => (
                  <tr key={holding.symbol}>
                    {detailedColumns.map((column) => renderDetailedCell(holding, column))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    );
  }

  if (csvAnalysis && portfolioInsightPage) {
    const isPros = portfolioInsightPage === "pros";
    const ranked = isPros ? topPortfolioHoldings : bottomPortfolioHoldings;
    return (
      <main className={`portfolio-builder-page portfolio-insight-page-full ${isPros ? "pros" : "cons"}`}>
        <div className="portfolio-builder-head portfolio-upload-topbar portfolio-dashboard-head-v3 portfolio-top-title-bubble">
          <button type="button" className="back-btn portfolio-back-icon-only" onClick={() => setPortfolioInsightPage(null)} aria-label="Back to portfolio"><ArrowLeft size={18}/></button>
          <div className="portfolio-title-mainline portfolio-title-mainline-clean"><div><h2>{isPros ? "Portfolio Pros" : "Portfolio Cons"}</h2></div></div>
        </div>
        <section className={`portfolio-insight-full-card ai-score-long-summary ${isPros ? "ai-score-pros-panel" : "ai-score-cons-panel"}`}>
          <div className="ai-score-panel-kicker"><span className="ai-score-panel-dot" /> {isPros ? "PROS" : "CONS"}</div>
          <h3>{isPros ? `${portfolioTitle} strengths` : `${portfolioTitle} weaknesses`}</h3>
          <p>{isPros ? prosCons.pros : prosCons.cons}</p>
        </section>
        <section className="portfolio-ranked-holdings-section">
          <div className="portfolio-section-head"><h3>{isPros ? "Top 5 Eval Score holdings" : "Bottom 5 Eval Score holdings"}</h3></div>
          <div className="portfolio-ranked-holdings-grid">
            {ranked.map((holding, index) => (
              <button type="button" className={`portfolio-ranked-holding-card ${scoreTone(holding.evalScoreValue)}`} key={`${holding.symbol}-${index}`} onClick={() => onAnalyze?.(holding.symbol)}>
                <MiniScoreRing value={holding.evalScoreValue} small />
                <div className="portfolio-ranked-copy-with-logo portfolio-symbol-no-logo"><span><strong>{holding.symbol}</strong><span>{holding.name || holding.sector || "Holding"}</span></span></div>
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="portfolio-builder-page portfolio-dashboard-v3">
      <div className="portfolio-builder-head portfolio-upload-topbar portfolio-dashboard-head-v3 portfolio-top-title-bubble">
        <button type="button" className="back-btn portfolio-back-icon-only" onClick={onBack} aria-label={backLabel}><ArrowLeft size={18}/></button>
        <div className="portfolio-title-mainline portfolio-title-mainline-clean">
          <div>
            <h2>{portfolioTitle}</h2>
          </div>
          {csvAnalysis && (
            <button
              type="button"
              className={`portfolio-doc-toggle-btn ${portfolioToolsOpen ? "open" : ""}`}
              onClick={() => setPortfolioToolsOpen((open) => !open)}
              aria-label="Open portfolio upload and manual entry tools"
              title="Edit or upload portfolio"
            >
              <FileText size={21}/>
            </button>
          )}
        </div>
      </div>

      {(!csvAnalysis || portfolioToolsOpen) && (
      <section className={`portfolio-input-grid-v3 portfolio-tools-panel ${csvAnalysis ? "portfolio-tools-overlay-open" : "portfolio-tools-first-run"} ${manualOpen ? "manual-open" : "manual-closed"}`}>
        <article
          className={`portfolio-csv-drop portfolio-csv-drop-polished portfolio-input-card-v3 ${dragActive ? "drag-active" : ""}`}
          onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            handleCsvFile(event.dataTransfer?.files?.[0]);
          }}
        >
          <div className="portfolio-csv-icon"><FileText size={30}/></div>
          <div>
            <span className="section-title"><BarChart3 size={17}/> Upload</span>
            <h3>Import portfolio</h3>
            <p>CSV headers accepted: <b>Symbol</b>, <b>Quantity</b>, <b>Purchase Price</b>. Eval calculates value, return, weights, industries, and score.</p>
          </div>
          <div className="portfolio-csv-actions">
            <button type="button" className="portfolio-template-btn" onClick={() => downloadPortfolioTemplate(firstName)}>Template</button>
            <label className="portfolio-csv-upload-btn">
              Upload CSV
              <input type="file" accept=".csv,text/csv" onChange={(event) => handleCsvFile(event.target.files?.[0])} />
            </label>
            <button type="button" className="portfolio-template-btn" onClick={toggleManualEntry}>
              <Plus size={16}/> {manualOpen ? "Hide manual" : "Manual Entry"}
            </button>
            <button type="button" className="portfolio-template-btn portfolio-refresh-saved-btn" onClick={() => refreshSavedPortfolio({ silent: true })} disabled={!savedHoldings.length || csvLoading}>
              <RefreshCw size={16} className={csvLoading ? "spin" : ""}/> Refresh
            </button>
          </div>
        </article>

        {manualOpen && (
          <article className="portfolio-manual-card portfolio-input-card-v3 portfolio-manual-panel-open portfolio-manual-card-clean">
            <div className="portfolio-manual-head portfolio-manual-head-clean">
              <div>
                <span className="section-title"><Plus size={17}/> Transactions</span>
                <h3>Buy or sell shares</h3>
                <p>Choose Buy or Sell, enter the share count, and Eval updates the current position.</p>
              </div>
              <div className="portfolio-manual-head-actions">
                <button type="button" className="portfolio-template-btn" onClick={addManualRow}><Plus size={16}/> Add transaction</button>
                <button type="button" className="portfolio-template-btn portfolio-delete-all-btn" onClick={deleteAllManualPortfolio}><Trash2 size={16}/> Delete all</button>
                {currentManualRows.length > 0 && (
                  <button type="button" className={`portfolio-template-btn portfolio-edit-current-btn ${manualCurrentListOpen ? "open" : ""}`} onClick={() => setManualCurrentListOpen((open) => !open)}>
                    {manualCurrentListOpen ? "Hide holdings" : "Edit/remove holdings"}
                  </button>
                )}
              </div>
            </div>

            {manualCurrentListOpen && (
              <div className="portfolio-manual-search-strip">
                <div>
                  <strong>Find ticker transactions</strong>
                  <span>Search filters editable holdings and transaction history.</span>
                </div>
                <input value={manualTransactionSearch} onChange={(event) => setManualTransactionSearch(event.target.value.toUpperCase())} placeholder="Search ticker" maxLength={8} />
              </div>
            )}

            <div className="portfolio-manual-cash-editor">
              <div><strong>Cash holdings</strong><span>Sells add to cash at average cost.</span></div>
              <input value={cashInput} onChange={(event) => setCashInput(event.target.value)} placeholder="$0" inputMode="decimal" />
            </div>

            <div className="portfolio-manual-table portfolio-manual-table-v3 portfolio-manual-table-stacked portfolio-transaction-entry-list portfolio-transaction-entry-list-clean">
              {editableManualRows.map((row) => {
                const shareNumber = parseHoldingDollars(row.shares);
                const actionText = (row.mode || "buy") === "closed" ? "Close" : (row.mode || "buy") === "sell" ? "Sell" : (row.mode || "buy") === "current" ? "Set" : "Buy";
                return (
                <div className={`portfolio-manual-row portfolio-manual-entry-card portfolio-transaction-entry-card ${String(actionText).toLowerCase()}`} key={row.id}>
                  <div className="portfolio-transaction-entry-topline">
                    <div>
                      <strong>{String(row.symbol || "Ticker").toUpperCase()}</strong>
                      <small>{(row.mode || "buy") === "sell" ? "Sell shares" : (row.mode || "buy") === "current" ? "Current holding" : "Buy shares"}</small>
                    </div>
                    <span>{actionText}</span>
                  </div>
                  <div className="portfolio-manual-fields portfolio-transaction-fields">
                    <label><span>Type</span><select value={row.mode || "buy"} onChange={(event) => updateManualRow(row.id, "mode", event.target.value)}>
                      <option value="buy">Buy</option>
                      <option value="sell">Sell</option>
                      <option value="current">Set current holding</option>
                      <option value="closed">Close position</option>
                    </select></label>
                    <label><span>Ticker</span><input value={row.symbol} onChange={(event) => updateManualRow(row.id, "symbol", event.target.value.toUpperCase())} placeholder="AAPL" maxLength={8} /></label>
                    <label><span>Quantity</span><input value={(row.mode || "buy") === "closed" ? "All" : row.shares} onChange={(event) => updateManualRow(row.id, "shares", event.target.value)} placeholder={(row.mode || "buy") === "closed" ? "All shares" : "10"} inputMode="decimal" disabled={(row.mode || "buy") === "closed"} /></label>
                    <label><span>Trade price</span><input value={row.averageCost} onChange={(event) => updateManualRow(row.id, "averageCost", event.target.value)} placeholder="$175" inputMode="decimal" /></label>
                  </div>
                  <div className="portfolio-manual-entry-actions">
                    <button type="button" className="portfolio-manual-entry-save" onClick={() => saveManualTransactionRows([row])} disabled={csvLoading}>Save</button>
                    <button type="button" className="delete-btn portfolio-manual-entry-trash" onClick={() => removeManualRow(row.id)} aria-label="Remove transaction"><Trash2 size={15}/></button>
                  </div>
                </div>
              );})}
            </div>

            <div className="portfolio-transaction-history-card">
              <div className="portfolio-transaction-history-head">
                <div>
                  <h4>Transaction history</h4>
                  <span>{manualSearchQuery ? `${filteredManualTransactions.length} for ${manualSearchQuery}` : `${filteredManualTransactions.length} shown`}</span>
                </div>
              </div>
              <div className="portfolio-transaction-history-list">
                {filteredManualTransactions.length ? filteredManualTransactions.slice(0, 40).map((transaction) => (
                  <div className={`portfolio-transaction-history-row ${transactionActionClass(transaction.action)}`} key={transaction.id}>
                    <strong>{transaction.symbol}</strong>
                    <span>{transaction.action}</span>
                    <b>{Number(transaction.shares) > 0 ? "+" : ""}{Number(transaction.shares || 0).toLocaleString()}</b>
                    <em>{transaction.averageCost ? money(transaction.averageCost) : "—"}</em>
                    <small>{formatTransactionDate(transaction.date)}</small>
                  </div>
                )) : <p>{manualSearchQuery ? `No transactions found for ${manualSearchQuery}.` : "No transactions yet."}</p>}
              </div>
            </div>

            <button type="button" className="portfolio-manual-analyze-btn" onClick={analyzeManualPortfolio} disabled={csvLoading}>
              <Sparkles size={16}/> Save all
            </button>
          </article>
        )}
      </section>
      )}

      {csvLoading && <div className="portfolio-loading-card compact"><RefreshCw className="spin" size={24}/><h3>Scoring portfolio</h3><p>Eval is recalculating current prices, Eval Scores, industries, and weighted portfolio metrics.</p></div>}
      {csvError && <div className="error-banner"><AlertTriangle size={18}/>{csvError}</div>}

      {csvAnalysis && !csvLoading && (
        <section className="portfolio-report-v3">
          <div className="portfolio-hero-grid-v3">
            <button type="button" className={`portfolio-score-card-v3 portfolio-score-card-clickable ${scoreTone(portfolioEvalScore)}`} onClick={() => setMetricModal({
              title: "Portfolio metrics",
              subtitle: "Weighted category scores for the full uploaded portfolio.",
              entries: categoryEntries,
            })}>
              <div className="portfolio-score-ring-stack portfolio-score-text-stack">
                <EvalScoreTextBadge value={portfolioEvalScore} className="portfolio-main-eval-score watch-score-plain" />
              </div>
            </button>

            <article className="portfolio-total-value-card-v3 portfolio-total-value-card-wide portfolio-total-value-card-no-label">
              <div className="portfolio-total-value-line">
                <strong>{hideHoldingsValue ? "******" : money(totalHoldings)}</strong>
                <button type="button" onClick={() => setHideHoldingsValue((v) => !v)}>{hideHoldingsValue ? "Show" : "Hide"}</button>
              </div>
              <b className={`portfolio-value-change ${Number(totalHoldingsDollarChange) >= 0 ? "up" : "down"}`}>
                {hideHoldingsValue ? "******" : signedMoney(totalHoldingsDollarChange)} ({signedPercent(totalHoldingsChangePct)})
              </b>
            </article>

            <article className="portfolio-count-card-v3 portfolio-count-split-card-v4">
              <div className="portfolio-count-split-item">
                <span>Holdings</span>
                <strong>{csvAnalysis?.summary?.holdingsScored || savedHoldings.length || 0}</strong>
              </div>
              <div className="portfolio-count-split-line" aria-hidden="true" />
              <div className="portfolio-count-split-item">
                <span>Industries</span>
                <strong>{sectorGroups.length}</strong>
              </div>
            </article>

          </div>

          <div className="portfolio-dashboard-action-row portfolio-dashboard-action-row-three">
            <button type="button" className="portfolio-action-tile pros" onClick={() => openPortfolioInsightPage("pros")}>
              <b>PROS</b>
              <small>Click to view</small>
            </button>
            <button type="button" className="portfolio-action-tile cons" onClick={() => openPortfolioInsightPage("cons")}>
              <b>CONS</b>
              <small>Click to view</small>
            </button>
            <button type="button" className={`portfolio-action-tile industries ${sectorScoresOpen ? "open" : ""}`} onClick={() => setIndustryScoresOpen((open) => !open)}>
              <b>Industries</b>
              <small>{sectorScoresOpen ? "Close" : "View"}</small>
            </button>
          </div>

          <div className="portfolio-top-bottom-separator" aria-hidden="true" />

          {sectorScoresOpen && (
            <div className="portfolio-industry-score-panel-wrap portfolio-industry-score-dropdown-wrap">
              <IndustryBars groups={sectorGroups} onSelectIndustry={(group) => setMetricModal({ title: `${group?.sector || group?.industry || "Industry"} metrics`, subtitle: `Weighted metrics inside this industry.`, entries: weightedMetricEntriesFromIndustry(group) })} />
            </div>
          )}


          <div className="portfolio-industry-results portfolio-industry-results-premium portfolio-industries-v3" ref={holdingsSectionRef}>
            <form className="portfolio-holding-search-bar" onSubmit={jumpToPortfolioHolding}>
              <input value={holdingSearch} onChange={(event) => setHoldingSearch(event.target.value.toUpperCase())} placeholder="Search holding ticker" maxLength={8} />
              <button type="submit"><Search size={15}/> Find</button>
            </form>
            <div className="portfolio-section-head portfolio-holdings-control-head">
              <div className="portfolio-industry-open-controls">
                <button type="button" onClick={() => {
                  const next = {};
                  sectorGroups.forEach((group) => { next[group.sector] = true; });
                  setOpenIndustries(next);
                }}>Open all</button>
                <button type="button" onClick={() => {
                  const next = {};
                  sectorGroups.forEach((group) => { next[group.sector] = false; });
                  setOpenIndustries(next);
                }}>Close all</button>
              </div>
              <button type="button" className="portfolio-detail-view-btn" onClick={() => setPortfolioDetailedPage(true)}>
                Detailed view
              </button>
              <div className="portfolio-column-control-wrap">
                <button type="button" className={`portfolio-column-toggle-btn ${columnsOpen ? "open" : ""}`} onClick={() => setColumnsOpen((open) => !open)}>
                  Columns
                </button>
                {columnsOpen && (
                  <div className="portfolio-column-menu portfolio-column-menu-front">
                    <div className="portfolio-column-menu-head">
                      <strong>Columns</strong>
                      <button type="button" className="portfolio-column-menu-close" onClick={() => setColumnsOpen(false)} aria-label="Close columns menu">×</button>
                    </div>
                    <div className="portfolio-column-menu-actions">
                      <button type="button" onClick={showAllHoldingColumns}>All</button>
                      <button type="button" onClick={compactHoldingColumns}>Compact</button>
                    </div>
                    {PORTFOLIO_HOLDING_COLUMNS.map((column) => (
                      <label key={column.key} className={visibleHoldingColumns[column.key] ? "active" : ""}>
                        <input type="checkbox" checked={Boolean(visibleHoldingColumns[column.key])} onChange={() => toggleHoldingColumn(column.key)} />
                        <span>{column.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {sectorGroups.map((group) => {
              const isOpen = openIndustries[group.sector] !== false;
              return (
              <article className={`portfolio-industry-block portfolio-industry-block-v3 portfolio-industry-tab ${scoreTone(group.sectorEvalScore)} ${isOpen ? "open" : "closed"}`} key={group.sector}>
                <button type="button" className="portfolio-industry-head portfolio-industry-head-v3 portfolio-industry-tab-toggle" onClick={() => toggleIndustry(group.sector)}>
                  <div className="portfolio-industry-title-v3">
                    <span>{group.sector}</span>
                    <small>{Number(group.totalWeightPercent || 0).toFixed(2)}% • {money(group.totalHoldingDollars)} • {signedMoney(group.totalDollarChange)} ({signedPercent(group.totalReturnPercent)}) • {isOpen ? "Close" : "Open"}</small>
                  </div>
                  <EvalScoreTextBadge value={group.sectorEvalScore} className="portfolio-holding-eval-score portfolio-industry-eval-score industry-score-as-stock watch-score-plain" />
                </button>
                {isOpen && (
                  <div className="portfolio-holdings-table portfolio-industry-table-v3" style={{ "--holding-grid-template": holdingsTemplate, "--mobile-holding-cols": holdingColumns.length }}>
                    <div className="portfolio-holding-row header" style={{ gridTemplateColumns: holdingsTemplate }}>
                      <span>Stock</span>
                      {holdingColumns.map((column) => <span key={column.key}>{column.shortLabel || column.label}</span>)}
                    </div>
                    {(group.holdings || []).map((holding) => {
                      const holdingCells = {
                        shares: <span key="shares" data-label="Q">{Number(holding.shares || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>,
                        averageCost: <span key="averageCost" data-label="Avg cost">{money(holding.averageCost ?? holding.avgCost ?? 0)}</span>,
                        currentPrice: <span key="currentPrice" data-label="Price">{money(currentHoldingPriceValue(holding))}</span>,
                        value: <span key="value" data-label="Value">{money(holding.holdingDollars)}</span>,
                        return: <span key="return" data-label="Return" className={`portfolio-return-cell ${Number(holdingDollarChangeValue(holding)) >= 0 ? "up" : "down"}`}><b>{signedMoney(holdingDollarChangeValue(holding))}</b><small>{signedPercent(holdingReturnPercentValue(holding))}</small></span>,
                        portfolioWeight: <span key="portfolioWeight" data-label="Weight">{Number(holding.weightPercent || 0).toFixed(2)}%</span>,
                        sectorWeight: <span key="sectorWeight" data-label="Ind %">{Number(holding.sectorWeightPercent ?? holding.industryWeightPercent ?? 0).toFixed(1)}%</span>,
                        eval: <span key="eval" data-label="Eval"><EvalScoreTextBadge value={holding.edgeScore} className="portfolio-holding-eval-score watch-score-plain" /></span>,
                      };
                      return (
                      <button type="button" id={holdingAnchorId(holding.symbol)} className={`portfolio-holding-row ${scoreTone(holding.edgeScore)}`} key={holding.symbol} onClick={() => onAnalyze?.(holding.symbol)} style={{ gridTemplateColumns: holdingsTemplate }}>
                        <span className="portfolio-mobile-stock-main portfolio-mobile-stock-main-logo portfolio-symbol-no-logo" data-label="Stock"><span><b>{holding.symbol}</b><small>{holding.name}</small></span></span>
                        {holdingColumns.map((column) => holdingCells[column.key])}
                      </button>
                    );})}
                  </div>
                )}
              </article>
              );
            })}
          </div>


          <article className="portfolio-cash-folder-card">
            <div>
              <span>Cash</span>
              <strong>{hideHoldingsValue ? "******" : money(cashHoldings)}</strong>
            </div>
            <small>Manual cash holdings and sale proceeds.</small>
          </article>

          <article className="portfolio-history-card-v3 portfolio-history-dual-card-v4 portfolio-history-bottom-v5 portfolio-user-hidden-history">
            <div className="portfolio-card-title-row">
              <div>
                <span className="section-title"><LineChart size={17}/> Daily tracking</span>
                <h3>Portfolio movement</h3>
              </div>
              <small>Saved portfolios refresh once at 5:00 AM ET for holdings value and once at 5:15 AM ET for Eval Score history while this browser is active.</small>
            </div>
            <div className="portfolio-history-chart-grid-v4">
              <div>
                <h4>Holdings value</h4>
                <PortfolioValueChart points={historyPoints} />
              </div>
              <div>
                <h4>Portfolio Eval Score</h4>
                <PortfolioEvalScoreChart points={evalHistoryPoints} />
              </div>
            </div>
            <PortfolioHiddenDataTable valueHistory={historyPoints} evalHistory={evalHistoryPoints} />
          </article>



          {portfolioInsightModal && (
            <div className="portfolio-metric-modal-backdrop" role="presentation" onClick={() => setPortfolioInsightModal(null)}>
              <article className={`portfolio-insight-popup ai-score-long-summary ${portfolioInsightModal.type === "pros" ? "ai-score-pros-panel" : "ai-score-cons-panel"}`} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
                <button type="button" className="portfolio-metric-modal-close" onClick={() => setPortfolioInsightModal(null)} aria-label="Close insight">×</button>
                <div className="ai-score-panel-kicker"><span className="ai-score-panel-dot" /> {portfolioInsightModal.type === "pros" ? "PROS" : "CONS"}</div>
                <h3>{portfolioInsightModal.title}</h3>
                <p>{portfolioInsightModal.text}</p>
              </article>
            </div>
          )}

          {metricModal && (
            <PortfolioMetricsModal
              title={metricModal.title}
              subtitle={metricModal.subtitle}
              entries={metricModal.entries}
              onClose={() => setMetricModal(null)}
            />
          )}

          {!!csvAnalysis.skipped?.length && (
            <div className="portfolio-skipped-note"><b>Voided:</b> {csvAnalysis.skipped.map((item) => item.symbol).join(", ")}</div>
          )}
        </section>
      )}
    </main>
  );
}

function LandingPage({ onContinue, startTarget = "dashboard" }) {
  const startLabel = ({ dashboard: "Open dashboard", portfolio: "Open portfolio", morningBrew: "Open Morning Mug", watchlist: "Open watchlist" }[startTarget] || "Open dashboard");

  const productPillars = [
    {
      icon: <Gauge size={22} />,
      title: "Eval Score",
      text: "Eval turns a stock report into one simple 0.0–10.0 company-quality score. It is not a buy/sell signal. It is a fast way to understand whether the company looks strong, mixed, or weak across the data Eval can read.",
    },
    {
      icon: <BarChart3 size={22} />,
      title: "Category ratings",
      text: "Every stock is broken into Growth, Profitability, Financial Health, Valuation, Momentum, and Pullback so users can see exactly what is helping or hurting the score.",
    },
    {
      icon: <Newspaper size={22} />,
      title: "News sentiment",
      text: "Eval reads recent company headlines, scores each article by impact, and explains whether the current news backdrop looks bullish, neutral, or bearish in plain English.",
    },
    {
      icon: <Star size={22} />,
      title: "Ranked watchlist",
      text: "Users can save stocks, refresh them, and instantly see which names rank highest by Eval Score. The watchlist is meant to make stock research feel organized instead of scattered.",
    },
    {
      icon: <PieChart size={22} />,
      title: "Portfolio scoring",
      text: "Users can upload a CSV or manually enter holdings. Eval calculates current holding value, returns, sector weights, weighted Portfolio Eval Score, and category-level portfolio metrics.",
    },
    {
      icon: <Newspaper size={22} />,
      title: "The Morning Mug",
      text: "The coffee-cup dashboard gives users CNBC pre-market headlines, index proxy movement, article impact scores, and up to five saved-portfolio alerts each morning.",
    },
    {
      icon: <BrainCircuit size={22} />,
      title: "Stronger Eval AI",
      text: "Eval AI answers FAQs, navigation questions, ticker lookup from the embedded U.S. stock universe, watchlist questions, portfolio questions, and loaded-stock explanations in short clear responses.",
    },
  ];

  const breakdownSteps = [
    {
      number: "01",
      title: "Search any ticker",
      text: "Type a stock symbol and Eval loads the company report from your backend. The goal is to get from ticker to useful summary as quickly as possible.",
    },
    {
      number: "02",
      title: "Read the score first",
      text: "The large Eval Score gives the quick read. Green, yellow, and red show the overall company-quality range, while the number gives a more exact rating.",
    },
    {
      number: "03",
      title: "Check the weak spots",
      text: "The category cards show where the company is strong and where it is being penalized. This keeps users from trusting a single number blindly.",
    },
    {
      number: "04",
      title: "Use news and risk context",
      text: "Eval adds recent news, risk, company context so users can understand the current backdrop around the company.",
    },
    {
      number: "05",
      title: "Save and compare",
      text: "Users can add stocks to the watchlist, compare 2–5 names, and use radar charts to see which companies are balanced versus one-dimensional.",
    },
    {
      number: "06",
      title: "Ask Eval AI",
      text: "Eval AI explains the dashboard, metrics, watchlist stocks, portfolio holdings, company basics, ticker lookup questions, and stock-specific questions for loaded or saved companies.",
    },
    {
      number: "07",
      title: "Upload a portfolio",
      text: "Users can upload the CSV template or enter trades manually. Eval calculates current market value, returns, sector weights, and a weighted Portfolio Eval Score.",
    },
    {
      number: "08",
      title: "Open The Morning Mug",
      text: "The coffee button opens a daily market page with CNBC headlines, pre-market index movement, article scores, and saved-portfolio alerts.",
    },
  ];

  return (
    <main className="landing-page-clean landing-page-static">
      <section className="landing-shell landing-shell-static">
        <header className="landing-brand-row landing-brand-row-static">
          <button type="button" className="landing-brand-home" aria-label="Eval homepage">
            <img src="/stock-edge-ai-logo.png" alt="Eval logo" />
            <h1>Eval</h1>
          </button>

          <button type="button" className="landing-continue-top" onClick={onContinue}>
            {startLabel} <ArrowRight size={18} />
          </button>
        </header>

        <section className="landing-hero-static">
          <div className="landing-copy-static">
            <div className="landing-kicker-static">
              <Sparkles size={16} /> No digging. Just the numbers that matter.
            </div>

            <h2>Understand a company before you waste time digging through tabs.</h2>

            <p>
              Eval is a stock evaluation dashboard that turns scattered market data, company fundamentals,
              recent news signals, watchlist rankings, portfolio scoring, The Morning Mug alerts,
              and AI explanations into one clean system. Instead of making users bounce between finance sites,
              charts, headlines, raw ratios, and spreadsheets, Eval gives them a fast company-quality read they can understand in minutes.
            </p>

            <div className="landing-action-row-static landing-action-row-static-copy-only">
              <span>Built for quick research, watchlist ranking, portfolio scoring, The Morning Mug, and easier company comparison.</span>
            </div>

            <div className="mobile-homepage-feature-strip" aria-label="Eval key features">
              <div><b>Eval Score</b><span>0–99 company-quality score</span></div>
              <div><b>Portfolio</b><span>Upload holdings, track weighted scores</span></div>
              <div><b>Morning Mug</b><span>Daily headlines, movers, earnings</span></div>
            </div>
          </div>

          <aside className="landing-preview-static" aria-label="Eval report preview">
            <div className="preview-topline">
              <span>Sample Eval report</span>
              <b>NVDA</b>
            </div>
            <div className="landing-chart-preview-card green">
              <div className="landing-chart-preview-head">
                <span>6M chart</span>
                <strong className="landing-preview-score score-ovr-stack green"><span>84</span><small>OVR</small></strong>
              </div>
              <svg className="landing-preview-chart" viewBox="0 0 360 150" role="img" aria-label="Example Eval chart">
                <defs>
                  <linearGradient id="landingPreviewLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#85ff47" />
                    <stop offset="100%" stopColor="#28d8ff" />
                  </linearGradient>
                </defs>
                <path className="landing-preview-grid-line" d="M18 112 H342" />
                <path className="landing-preview-grid-line" d="M18 76 H342" />
                <path className="landing-preview-grid-line" d="M18 40 H342" />
                <path className="landing-preview-line" d="M18 118 C58 105 67 89 104 93 C141 98 154 66 190 70 C228 74 234 44 270 48 C302 51 315 34 342 28" />
                <text x="22" y="142">Jan-26</text>
                <text x="286" y="142">Jul-26</text>
              </svg>
            </div>
            <div className="preview-mini-grid preview-mini-grid-score-only">
              <div><span>Profitability</span><strong className="score-ovr-stack green"><span>92</span><small>OVR</small></strong></div>
              <div><span>Momentum</span><strong className="score-ovr-stack yellow"><span>74</span><small>OVR</small></strong></div>
              <div><span>Valuation</span><strong className="score-ovr-stack red"><span>58</span><small>OVR</small></strong></div>
            </div>
          </aside>
        </section>

        <section className="landing-product-breakdown">
          <div className="landing-section-head">
            <span>Product breakdown</span>
            <h2>What Eval actually does</h2>
            <p>
              Eval is designed to answer the question: “Is this a strong company right now, and what parts of the report explain that answer?”
              It simplifies the research process without pretending to replace real due diligence.
            </p>
          </div>

          <div className="landing-pillar-grid">
            {productPillars.map((item) => (
              <article className="landing-pillar-card" key={item.title}>
                <div className="landing-pillar-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-workflow-static">
          <div className="landing-section-head">
            <span>Workflow</span>
            <h2>How a user moves through the app</h2>
            <p>
              The dashboard is built so someone can search a ticker, understand the company, save it, and compare it without needing a complicated finance background.
            </p>
          </div>

          <div className="landing-step-grid">
            {breakdownSteps.map((step) => (
              <article className="landing-step-card" key={step.number}>
                <b>{step.number}</b>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-data-note">
          <div>
            <h2>Built to make stock research cleaner</h2>
            <p>
              Eval combines data providers, cached reports, category scoring, article summaries, saved watchlists,
              portfolio uploads, The Morning Mug, strategy targets, and Eval AI support into one interface. The purpose is not to tell users what to buy.
              The purpose is to make a company easier to understand before they decide what to research next.
            </p>
          </div>
          <button type="button" className="landing-continue-btn secondary" onClick={onContinue}>
            {startLabel} <ArrowRight size={18} />
          </button>
        </section>

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
                    forceRedirectUrl="/"
                    fallbackRedirectUrl="/"
                  />
                ) : (
                  <SignUp
                    appearance={clerkAppearance}
                    routing="hash"
                    signInUrl="#sign-in"
                    forceRedirectUrl="/"
                    fallbackRedirectUrl="/"
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


function TickerLookupPage({ query, results, loading, error, onQueryChange, onBack, backLabel = "Back to dashboard" }) {
  const cleanQuery = query.trim();
  return (
    <main className="ticker-lookup-page ticker-lookup-purple-page">
      <section className="ticker-lookup-page-shell ticker-lookup-purple-shell">
        <div className="ticker-lookup-topbar">
          <button type="button" className="back-btn" onClick={onBack}>
            <ArrowLeft size={18} /> {backLabel}
          </button>
        </div>

        <div className="ticker-lookup-hero ticker-lookup-hero-upgraded ticker-lookup-purple-hero">
          <div className="section-title"><Search size={17} /> Ticker Lookup</div>
          <h1>Search the full U.S. stock list.</h1>
          <p>Type a company name or ticker and Eval ranks the best matches instantly from the local CSV.</p>
          <div className="ticker-lookup-stat-strip">
            <span>7,000+ symbols</span>
            <span>Fast local search</span>
            <span>No API calls</span>
          </div>
        </div>

        <div className="ticker-lookup-page-card ticker-lookup-search-card-upgraded">
          <label htmlFor="ticker-lookup-page-input">Company or ticker</label>
          <div className="ticker-lookup-input-shell">
            <Search size={18} />
            <input
              id="ticker-lookup-page-input"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="SOFI, Apple, Nvidia, Palantir, Coinbase..."
              autoComplete="off"
              autoFocus
            />
          </div>
          <div className="ticker-lookup-page-helper">Copy the ticker into Eval search when you want the full score.</div>
        </div>

        <section className="ticker-lookup-results-card ticker-lookup-results-upgraded">
          <div className="ticker-lookup-results-head">
            <span>Matching company</span>
            <span>Symbol</span>
          </div>
          {loading ? <div className="ticker-lookup-page-status">Searching...</div> : null}
          {error ? <div className="ticker-lookup-page-status error">{error}</div> : null}
          {!loading && cleanQuery && !results.length && !error ? (
            <div className="ticker-lookup-page-status">No matches found.</div>
          ) : null}
          {!cleanQuery ? (
            <div className="ticker-lookup-page-status">Start typing to search the expanded local ticker universe.</div>
          ) : null}
          <div className="ticker-lookup-page-results">
            {results.slice(0, 25).map((item) => (
              <div className="ticker-lookup-page-row ticker-lookup-page-row-upgraded" key={`${item.symbol}-${item.name}`}>
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.exchange || "U.S. exchange"}{item.type ? ` • ${item.type}` : ""}</small>
                </div>
                <b>{item.symbol}</b>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function TickerLookupMenuPanel({ open, query, results, loading, error, onToggle, onQueryChange }) {
  return (
    <div className={`dashboard-dropdown-nested ticker-lookup-menu ${open ? "open" : ""}`}>
      <button
        type="button"
        className="dashboard-dropdown-nested-toggle ticker-lookup-toggle"
        onClick={onToggle}
        aria-expanded={open}
      >
        Ticker Lookup <span>{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <div className="ticker-lookup-panel" onClick={(e) => e.stopPropagation()}>
          <label>Company name</label>
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Type Apple, Microsoft, Tesla..."
            autoComplete="off"
          />
          <div className="ticker-lookup-helper">Top 25 results. Tickers are shown only, not clickable.</div>
          {loading ? <div className="ticker-lookup-status">Searching...</div> : null}
          {error ? <div className="ticker-lookup-status error">{error}</div> : null}
          {!loading && query.trim() && !results.length && !error ? (
            <div className="ticker-lookup-status">No matches yet.</div>
          ) : null}
          <div className="ticker-lookup-results">
            {results.slice(0, 25).map((item) => (
              <div className="ticker-lookup-result" key={`${item.symbol}-${item.name}`}>
                <span className="ticker-lookup-name">{item.name}</span>
                <span className="ticker-lookup-symbol">{item.symbol}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
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
  { category: "Ticker Lookup", question: "Where is Ticker Lookup now?", answer: "Open the dashboard menu and click Ticker Lookup. It opens a separate page where users can type a company name and see matching U.S. stock tickers." },
  { category: "Ticker Lookup", question: "Does Ticker Lookup spend stock API calls?", answer: "No. Ticker Lookup uses the uploaded U.S. stock universe and only shows company names and ticker symbols. The results are not clickable to avoid unnecessary analysis calls." },
  { category: "Ticker Lookup", question: "How many ticker lookup results show at once?", answer: "Ticker Lookup shows the top 25 matches at a time so the page stays fast and easy to read." },
  { category: "Morning Mug", question: "Why is today's earnings calendar date blue?", answer: "The blue calendar highlight marks the current day, making it easier to separate today from upcoming earnings dates." },
  {
    "category": "Getting started",
    "question": "What is Eval?",
    "answer": "Eval is a stock-evaluation dashboard that turns market data, fundamentals, news sentiment, and category scores into a simple company report."
  },
  {
    "category": "Getting started",
    "question": "How do I start using Eval?",
    "answer": "Search a ticker or open Ticker search, load a company, then read the Eval Score, company cards, category bars, news sentiment, and watchlist options."
  },
  {
    "category": "Getting started",
    "question": "What should I look at first?",
    "answer": "Start with the Eval Score ring, then check the strongest and weakest categories, company cards, and recent news sentiment."
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
    "answer": "The dropdown menu opens AI Assistant, Portfolio, Ticker Lookup, Watchlist on mobile/tablet, and the Other menu for Homepage, FAQs, Terms, and Contact."
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
    "answer": "The Eval Score is a 0.0 to 10.0 educational rating that blends profitability, financial health, valuation, momentum, and news sentiment."
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
    "question": "What is an sector ranking page?",
    "answer": "It shows top-ranked stocks in a similar sector using Eval\u2019s cached analysis data."
  },
  {
    "category": "Industry rankings",
    "question": "Does sector ranking reuse cached stock data?",
    "answer": "Yes. Industry stocks use the same cached analysis system and category TTL rules as normal reports."
  },
  {
    "category": "Industry rankings",
    "question": "Can I hide stocks on the sector radar?",
    "answer": "Yes. Click the ticker label to hide or show that company on the radar."
  },
  {
    "category": "Industry rankings",
    "question": "How do I open sector page in Eval?",
    "answer": "In Eval, sector page is handled inside the Industry rankings area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Industry rankings",
    "question": "What does sector page mean in Eval?",
    "answer": "sector page is part of the Industry rankings experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Industry rankings",
    "question": "Why is sector page important?",
    "answer": "sector page helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Industry rankings",
    "question": "Can Eval AI explain sector page?",
    "answer": "Yes. Eval AI can explain sector page when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Industry rankings",
    "question": "What should I do if sector page looks wrong?",
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
    "question": "How do I open sector radar in Eval?",
    "answer": "In Eval, sector radar is handled inside the Industry rankings area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Industry rankings",
    "question": "What does sector radar mean in Eval?",
    "answer": "sector radar is part of the Industry rankings experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Industry rankings",
    "question": "Why is sector radar important?",
    "answer": "sector radar helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Industry rankings",
    "question": "Can Eval AI explain sector radar?",
    "answer": "Yes. Eval AI can explain sector radar when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Industry rankings",
    "question": "What should I do if sector radar looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Industry rankings",
    "question": "How do I open sector ranking in Eval?",
    "answer": "In Eval, sector ranking is handled inside the Industry rankings area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Industry rankings",
    "question": "What does sector ranking mean in Eval?",
    "answer": "sector ranking is part of the Industry rankings experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Industry rankings",
    "question": "Why is sector ranking important?",
    "answer": "sector ranking helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Industry rankings",
    "question": "Can Eval AI explain sector ranking?",
    "answer": "Yes. Eval AI can explain sector ranking when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Industry rankings",
    "question": "What should I do if sector ranking looks wrong?",
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
    "question": "How do I open sector ticker in Eval?",
    "answer": "In Eval, sector ticker is handled inside the Industry rankings area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Industry rankings",
    "question": "What does sector ticker mean in Eval?",
    "answer": "sector ticker is part of the Industry rankings experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Industry rankings",
    "question": "Why is sector ticker important?",
    "answer": "sector ticker helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Industry rankings",
    "question": "Can Eval AI explain sector ticker?",
    "answer": "Yes. Eval AI can explain sector ticker when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Industry rankings",
    "question": "What should I do if sector ticker looks wrong?",
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
    "question": "How do I open sector description in Eval?",
    "answer": "In Eval, sector description is handled inside the Industry rankings area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Industry rankings",
    "question": "What does sector description mean in Eval?",
    "answer": "sector description is part of the Industry rankings experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Industry rankings",
    "question": "Why is sector description important?",
    "answer": "sector description helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Industry rankings",
    "question": "Can Eval AI explain sector description?",
    "answer": "Yes. Eval AI can explain sector description when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Industry rankings",
    "question": "What should I do if sector description looks wrong?",
    "answer": "Refresh the relevant page, check whether the ticker is loaded or saved, and remember that Eval uses cached data and provider fallbacks. If it still looks wrong, use Contact support."
  },
  {
    "category": "Industry rankings",
    "question": "How do I open sector cache in Eval?",
    "answer": "In Eval, sector cache is handled inside the Industry rankings area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Industry rankings",
    "question": "What does sector cache mean in Eval?",
    "answer": "sector cache is part of the Industry rankings experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Industry rankings",
    "question": "Why is sector cache important?",
    "answer": "sector cache helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Industry rankings",
    "question": "Can Eval AI explain sector cache?",
    "answer": "Yes. Eval AI can explain sector cache when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Industry rankings",
    "question": "What should I do if sector cache looks wrong?",
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
    "question": "Can users open sector page from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Industry rankings",
    "question": "Does sector page update automatically?",
    "answer": "sector page updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
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
    "question": "Can users compare sector radar from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Industry rankings",
    "question": "Does sector radar update automatically?",
    "answer": "sector radar updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Industry rankings",
    "question": "Can users read sector ranking from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Industry rankings",
    "question": "Does sector ranking update automatically?",
    "answer": "sector ranking updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
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
    "question": "Can users show sector ticker from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Industry rankings",
    "question": "Does sector ticker update automatically?",
    "answer": "sector ticker updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
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
    "question": "Can users review sector description from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Industry rankings",
    "question": "Does sector description update automatically?",
    "answer": "sector description updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
  },
  {
    "category": "Industry rankings",
    "question": "Can users select sector cache from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Industry rankings",
    "question": "Does sector cache update automatically?",
    "answer": "sector cache updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
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
    "question": "How do I answer sector help in Eval?",
    "answer": "In Eval, sector help is handled inside the Eval AI area. Use the dashboard, dropdown, FAQs, and Eval AI to understand or open it. If it relates to a stock, load the ticker or save it to your watchlist first."
  },
  {
    "category": "Eval AI",
    "question": "What does sector help mean in Eval?",
    "answer": "sector help is part of the Eval AI experience. Eval explains it in plain English so users can understand the dashboard without needing to read raw financial data."
  },
  {
    "category": "Eval AI",
    "question": "Why is sector help important?",
    "answer": "sector help helps users understand the stock report, app navigation, or data quality. It should be read together with the Eval Score, category bars, and cached provider data."
  },
  {
    "category": "Eval AI",
    "question": "Can Eval AI explain sector help?",
    "answer": "Yes. Eval AI can explain sector help when the question is about using Eval, understanding the dashboard, or reviewing a loaded/watchlist stock."
  },
  {
    "category": "Eval AI",
    "question": "What should I do if sector help looks wrong?",
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
    "question": "Can users clarify sector help from the dashboard?",
    "answer": "Yes, when the feature is available from the dashboard or dropdown. For stock-specific actions, the ticker must be loaded on the dashboard or saved to the watchlist."
  },
  {
    "category": "Eval AI",
    "question": "Does sector help update automatically?",
    "answer": "sector help updates based on Eval\u2019s cache and provider rules. Some data refreshes daily, some weekly, and fundamental categories can stay cached much longer to reduce API usage."
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


function buildEvalExtraFaqs() {
  const topics = [
    ["Ticker Lookup", "ticker lookup", "Open the dashboard menu, expand Ticker Lookup, type a company name, and Eval shows up to 25 matching U.S. stocks with tickers on the right. The ticker text is not clickable, so lookup does not burn analysis API calls."],
    ["Ticker Lookup", "company search", "Type a company name in Ticker Lookup. Eval filters the saved U.S. stock universe as you type and shows the ticker on the right."],
    ["Ticker Lookup", "ticker results", "Ticker Lookup is only a reference list. Copy the ticker or type it in the main search box when you want to run a full stock analysis."],
    ["Navigation", "Other dropdown", "Open the menu and click Other to reveal Homepage, FAQs, Terms & Conditions, and Contact as an indented list."],
    ["Navigation", "The Morning Mug", "The Morning Mug is the coffee-cup page for pre-market indexes, CNBC headlines, portfolio movers, alerts, insider transactions, and upcoming earnings when a portfolio is loaded."],
    ["Portfolio", "portfolio upload", "Upload the Eval CSV template with ticker, shares, and average cost. Eval fetches current prices, calculates current value, returns, weights, sector scores, and the total Portfolio Eval Score."],
    ["Portfolio", "manual portfolio entry", "Manual Entry lets users add shares, remove shares, mark closed positions, and refresh the saved portfolio without starting over."],
    ["Portfolio", "holdings section", "Holdings are grouped by sector. Each sector divider starts closed and opens when clicked."],
    ["Portfolio", "sector score", "Each sector score is a weighted average of the stocks inside that sector using each stock's weight within that sector."],
    ["Portfolio", "portfolio score", "The Portfolio Eval Score uses each sector score multiplied by that sector's current percentage of the portfolio."],
    ["Portfolio", "Eval Strategy", "Eval Strategy lets users set target sector weights. Eval then compares current weights to targets for educational trim or rebalance ideas."],
    ["Portfolio", "trim ideas", "Trim ideas focus on industries that are meaningfully above target and the holdings driving that overweight position."],
    ["Portfolio", "earnings calendar", "The Portfolio earnings calendar shows upcoming earnings for portfolio stocks over the next four weeks."],
    ["The Morning Mug", "Morning Mug indexes", "The Morning Mug shows S&P 500, Dow Jones, and Nasdaq percent changes using ETF proxies behind the scenes while displaying clean index names."],
    ["The Morning Mug", "Morning Mug news", "The Morning Mug shows CNBC market headlines with brief summaries, links, and a strict 0.0 to 10.0 article score."],
    ["The Morning Mug", "Morning Mug alerts", "Morning Mug alerts use saved portfolio data to highlight movers, score changes, overweight areas, upcoming earnings, and insider transactions."],
    ["The Morning Mug", "Morning Mug earnings", "The Morning Mug earnings calendar shows the next week of portfolio earnings only when a portfolio is loaded."],
    ["The Morning Mug", "portfolio movers", "Portfolio movers show the strongest and weakest pre-market moves from the user's saved portfolio."],
    ["Eval AI", "AI Assistant password", "Eval AI is locked during testing. Enter the testing password before asking questions."],
    ["Eval AI", "watchlist questions", "Eval AI can answer brief questions about saved watchlist stocks, strongest names, saved scores, and ticker lookup."],
    ["Eval AI", "portfolio questions", "Eval AI can answer brief questions about portfolio weights, sector weights, largest holdings, Eval Strategy targets, and trim ideas using saved portfolio data."],
    ["Eval AI", "earnings questions", "Eval AI can answer earnings-date questions when the earnings data is already loaded or saved in portfolio context."],
    ["Eval AI", "unknown answers", "When Eval AI cannot answer cleanly from saved, cached, or loaded Eval data, it should respond with: Please try again."],
  ];
  const verbs = ["How do I use", "What does", "Why is", "Where do I find", "Can Eval AI explain", "How should I read", "What happens when I open", "How does Eval handle", "What should I check in", "How can I understand"];
  const details = ["quickly", "on mobile", "on desktop", "without using extra API calls", "with saved data", "after uploading a portfolio", "inside the dashboard", "from the dropdown", "for a new user", "when troubleshooting", "before market open", "after refreshing data"];
  const out = [];
  for (const [category, topic, answer] of topics) {
    for (const verb of verbs) {
      for (const detail of details) {
        out.push({ category, question: `${verb} ${topic} ${detail}?`, answer });
      }
    }
  }
  return out;
}

function FaqPage({ onBack, onHome, onTerms, onSupport, backLabel = "Back to dashboard" }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const faqList = useMemo(() => [...EVAL_FAQS, ...buildEvalExtraFaqs()], []);
  const categories = ["All", ...Array.from(new Set(faqList.map((item) => item.category)))];

  const normalized = query.trim().toLowerCase();

  const filteredFaqs = faqList.filter((item) => {
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
            <ArrowLeft size={18} /> {backLabel}
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
            Search a larger help library covering dashboard navigation, Ticker Lookup, watchlist, Portfolio, Eval Strategy, The Morning Mug, earnings, alerts, caching, data sources, Eval AI, and account basics.
          </p>
        </div>

        <div className="faq-search-card">
          <label htmlFor="faq-search">Search FAQs</label>
          <input
            id="faq-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Start typing: ticker lookup, portfolio, Morning Mug, alerts..."
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
            <p>Try a shorter word like “score,” “watchlist,” “portfolio,” “ticker lookup,” “Morning Mug,” or “news.”</p>
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

function SupportContactPage({ onBack, onHome, onTerms, backLabel = "Back to dashboard" }) {
  return (
    <main className="support-page">
      <div className="support-orb support-orb-one" />
      <div className="support-orb support-orb-two" />

      <section className="support-shell">
        <div className="support-topbar">
          <button className="back-btn" type="button" onClick={onBack}>
            <ArrowLeft size={18} /> {backLabel}
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

function TermsPage({ onAgree, onBack, backLabel = "Back to dashboard", requireAgreement = true }) {
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
              {backLabel} <ArrowRight size={18} />
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
      {rankedItems.length > 0 && <AllInvestViewAttribution className="watch-logo-attribution" />}
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
  const rankedItems = [...(Array.isArray(items) ? items : [])].sort((a, b) => {
    const bs = score10(b?.score);
    const as = score10(a?.score);
    return (bs ?? -1) - (as ?? -1);
  });

  return (
    <aside className={`watch-panel eval-watchlist-panel ${mobilePage || pageMode ? "mobile-watch-panel watchlist-page-panel" : ""}`}>
      <div className="panel-head">
        <div>
          <h2>
            <Star size={18} /> Watchlist
          </h2>
          <p>Max 10 stocks</p>
        </div>

        <div className="watch-panel-actions">
          <button
            className="icon-btn"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh scores"
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
          </button>
        </div>
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
        {rankedItems.length === 0 ? (
          <div className="watch-empty">
            Your watchlist is empty. Add a ticker above to start building your own list.
          </div>
        ) : (
          rankedItems.map((item) => {
            const ticker = String(item.symbol || "").toUpperCase();
            return (
              <div className="watch-row watch-row-simple watch-row-ranked-format watch-row-with-logo" key={item.symbol}>
                <button className="watch-info watch-info-new watch-info-with-logo" onClick={() => onAnalyze(item.symbol)} title={`Analyze ${ticker}`}>
                  <StockLogo symbol={ticker} domain={item.domain || item.website} name={item.name} className="watch-aiv-logo" />
                  <span className="watch-ticker-copy">
                    <span className="watch-ticker-main">{ticker}</span>
                    <small className="watch-company-subtitle">{item.name && item.name !== ticker ? item.name : "Company"}</small>
                  </span>
                </button>

                <EvalScoreTextBadge value={item.score} className="watch-score-text watch-score-plain" />

                <button className="delete-btn delete-btn-icon-only" onClick={() => onRemove(item.symbol)} aria-label={`Remove ${item.symbol}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

function PlansPage({ onBack, backLabel = "Back to dashboard" }) {
  const plan = {
    name: "Eval Pro",
    price: "$9.99/mo",
    yearly: "$99.99/yr",
    description:
      "One upgraded plan that combines deeper fundamentals, smarter valuation tools, news sentiment, and expanded AI explanations in one simple package.",
    features: [
      "Expanded Eval Score with more fundamentals",
      "EBIT, EBITDA, cash-flow, and balance-sheet metrics",
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
            <ArrowLeft size={18} /> {backLabel}
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

function AssistantPage({ current, watchlist, onBack, backLabel = "Back to dashboard" }) {
  const { user } = useUser();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Ask about Eval, navigation, tickers, watchlist stocks, portfolio holdings, The Morning Mug, or how to use any dashboard feature.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [assistantUnlocked, setAssistantUnlocked] = useState(() => safeStorageGet("eval-ai-assistant-unlocked", "") === "1");
  const [assistantPassword, setAssistantPassword] = useState("");
  const [assistantPasswordError, setAssistantPasswordError] = useState("");

  function unlockAssistant(e) {
    e.preventDefault();
    if (assistantPassword.trim() === "111805") {
      safeStorageSet("eval-ai-assistant-unlocked", "1");
      setAssistantUnlocked(true);
      setAssistantPasswordError("");
      setAssistantPassword("");
    } else {
      setAssistantPasswordError("Incorrect password.");
    }
  }

  async function ask(e) {
    e.preventDefault();

    const clean = question.trim().slice(0, 150);
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
          portfolio: getSavedMorningPortfolio(user),
          assistantPassword: "111805",
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
          content: json?.answer || "Please try again.",
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!assistantUnlocked) {
    return (
      <section className="assistant-page">
        <div className="assistant-shell assistant-lock-shell">
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={18} /> {backLabel}
          </button>
          <div className="assistant-lock-card">
            <div className="assistant-kicker"><BrainCircuit size={16} /> Eval AI Assistant</div>
            <h2>Testing access</h2>
            <p>Enter the testing password to use Eval AI Assistant.</p>
            <form className="assistant-lock-form" onSubmit={unlockAssistant}>
              <input
                type="password"
                value={assistantPassword}
                onChange={(e) => setAssistantPassword(e.target.value)}
                placeholder="Password"
                autoComplete="off"
              />
              <button type="submit">Unlock</button>
            </form>
            {assistantPasswordError ? <p className="assistant-lock-error">{assistantPasswordError}</p> : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="assistant-page">
      <div className="assistant-shell">
        <div className="assistant-page-head">
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={18} /> {backLabel}
          </button>

          <div>
            <div className="assistant-kicker">
              <BrainCircuit size={16} /> Eval AI Assistant
            </div>
            <h2>Ask about Eval, the report, your watchlist, or your portfolio.</h2>
            <p>
              Eval AI is built as a short-answer support agent for navigation, FAQs, ticker lookup,
              watchlist stocks, portfolio stocks, The Morning Mug, score meanings, and company basics.
            </p>

        <section className="ai-rules-card ai-rules-card-full">
          <div className="ai-rules-eyebrow">What Eval AI can answer</div>
          <h3>Ask Eval AI for support, ticker lookup, company intelligence, portfolio help, and watchlist-stock explanations.</h3>

          <div className="ai-rules-grid ai-rules-grid-brief">
            <div>
              <strong>Company intelligence</strong>
              <p>Ask “what is Amazon’s ticker,” “what does Apple sell,” “what does Microsoft do,” or “what products does Nvidia make.”</p>
            </div>

            <div>
              <strong>FAQs and app support</strong>
              <p>Ask how to use Eval, read score rings, understand popups, navigate the dropdown, or manage the watchlist.</p>
            </div>

            <div>
              <strong>Score and metric help</strong>
              <p>Ask what Growth, Profitability, Financial Health, Valuation, Momentum, or Pullback means.</p>
            </div>

            <div>
              <strong>Watchlist and portfolio questions</strong>
              <p>Ask which saved holding has the highest Eval Score, what portfolio alerts mean, or which portfolio stocks are driving the score.</p>
            </div>

            <div>
              <strong>Data and cache questions</strong>
              <p>Ask how Finnhub, Massive, FMP, OpenAI, provider fallbacks, and component caching protect the report.</p>
            </div>

            <div>
              <strong>The Morning Mug and strategy help</strong>
              <p>Ask where The Morning Mug is, how CNBC headlines are scored, or how Portfolio Strategy target weights work.</p>
            </div>
          </div>

          <p className="ai-rules-note">Eval AI stays focused on Eval support, FAQs, ticker/product lookup, portfolio/watchlist analysis, and navigation. It keeps answers brief and clear.</p>
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
              placeholder="Ask about Eval, portfolio, watchlist, The Morning Mug, metrics, tickers, or navigation."
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


function EvalAiScoreSummaryCard({ summary, ticker }) {
  const symbol = String(ticker || summary?.symbol || "This stock").toUpperCase();
  const prosSummary = String(
    summary?.prosSummary ||
    summary?.supportSummary ||
    summary?.supports?.map((item) => item?.explanation || item?.text || item).filter(Boolean).join(" ") ||
    "The strongest parts of this Eval report are being summarized."
  ).trim();
  const consSummary = String(
    summary?.consSummary ||
    summary?.holdbackSummary ||
    summary?.holdsBack?.map((item) => item?.explanation || item?.text || item).filter(Boolean).join(" ") ||
    "The main limits in this Eval report are being summarized."
  ).trim();

  return (
    <section className="ai-score-summary-card ai-score-summary-card-simple ai-score-pros-cons-card">
      <div className="ai-score-glow" />

      <div className="ai-score-two-column-grid ai-score-pros-cons-grid">
        <article className="ai-score-long-summary ai-score-pros-panel">
          <div className="ai-score-panel-kicker">
            <span className="ai-score-panel-dot" />
            PROS
          </div>
          <h3>{symbol} strengths</h3>
          <p>{prosSummary}</p>
        </article>

        <article className="ai-score-long-summary ai-score-cons-panel">
          <div className="ai-score-panel-kicker">
            <span className="ai-score-panel-dot" />
            CONS
          </div>
          <h3>{symbol} limitations</h3>
          <p>{consSummary}</p>
        </article>
      </div>
    </section>
  );
}



function EvalScoreTextBadge({ value, className = "" }) {
  const display = scoreDisplay99(value);
  const tone = scoreTone(value);
  return (
    <span className={`eval-score-text-badge score-ovr-stack unified-score-display ${tone} ${className}`} aria-label={`Eval score ${display === null ? "not available" : display}`}>
      <strong className="score-ovr-number">{display === null ? "N/A" : display}</strong>
      <small className="score-ovr-label">OVR</small>
    </span>
  );
}


function cleanCompanyDomain(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    return url.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return raw
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .split("?")[0]
      .toLowerCase();
  }
}

function getCompanyDomainFromReport(report = {}) {
  return cleanCompanyDomain(
    report?.profile?.website ||
    report?.profile?.weburl ||
    report?.profile?.url ||
    report?.profile?.domain ||
    report?.domain ||
    report?.companyDomain ||
    report?.website ||
    report?.weburl ||
    report?.url
  );
}

function getCompanyNameFromReport(report = {}, fallback = "") {
  return String(
    report?.profile?.name ||
    report?.profile?.companyName ||
    report?.companyName ||
    report?.name ||
    fallback ||
    ""
  ).trim();
}

function allInvestViewLogoUrl(domain, symbol = "") {
  const cleanDomain = cleanCompanyDomain(domain);
  const cleanSymbol = String(symbol || "").trim().toUpperCase();
  const lookup = cleanDomain || cleanSymbol;
  return lookup ? `https://cdn.tickerlogos.com/${encodeURIComponent(lookup)}` : "";
}

function StockLogo({ symbol, domain, name, className = "" }) {
  const cleanSymbol = String(symbol || "").trim().toUpperCase();
  const logo = allInvestViewLogoUrl(domain, cleanSymbol);
  if (!logo) return null;
  return (
    <a
      className={`aiv-logo-link ${className}`.trim()}
      href="https://www.allinvestview.com/tools/ticker-logos/"
      target="_blank"
      rel="noreferrer"
      title="Logos by AllInvestView"
      aria-label="Logos by AllInvestView"
    >
      <img
        src={logo}
        alt={name ? `${name} logo` : cleanSymbol ? `${cleanSymbol} logo` : "Company logo"}
        loading="eager"
        decoding="async"
        onError={(event) => { event.currentTarget.style.display = "none"; }}
      />
    </a>
  );
}

function preloadStockLogos(items = []) {
  if (typeof window === "undefined") return;
  const seen = new Set();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const symbol = String(item?.symbol || item?.ticker || "").trim().toUpperCase();
    const url = allInvestViewLogoUrl(item?.domain || item?.website || item?.companyDomain, symbol);
    if (!url || seen.has(url)) return;
    seen.add(url);
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  });
}

function AllInvestViewAttribution({ className = "" }) {
  return (
    <a className={`aiv-attribution ${className}`.trim()} href="https://www.allinvestview.com/tools/ticker-logos/" target="_blank" rel="noreferrer">
      Logos by AllInvestView
    </a>
  );
}

function WatchMiniSparkline({ symbol, score = null }) {
  const clean = String(symbol || "").trim().toUpperCase();
  const chartTone = scoreTone(score);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!clean) return undefined;
    let cancelled = false;
    const cacheKey = `${clean}:sparkline:6m`;
    const loadRows = async () => {
      const cached = readClientTimedCache(CLIENT_SPARKLINE_CACHE, cacheKey);
      if (cached !== undefined) {
        if (!cancelled) setRows(cached);
        return;
      }
      try {
        const res = await fetch(`${API}/api/twelve-chart/${encodeURIComponent(clean)}?interval=1day&outputsize=180`);
        const json = await res.json();
        const nextRows = Array.isArray(json?.rows) ? json.rows : [];
        if (res.ok) writeClientTimedCache(CLIENT_SPARKLINE_CACHE, cacheKey, nextRows, CLIENT_SPARKLINE_TTL_MS);
        if (!cancelled) setRows(nextRows);
      } catch {
        if (!cancelled) setRows([]);
      }
    };
    loadRows();
    return () => { cancelled = true; };
  }, [clean]);

  const points = rows.map((row, i) => ({ x: i, y: Number(row.close) })).filter((p) => Number.isFinite(p.y));
  if (!points.length) return <div className="watch-sparkline-empty" />;
  const width = 124;
  const height = 34;
  const ys = points.map((p) => p.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const range = max - min || 1;
  const xScale = (x) => 2 + (x / Math.max(1, points.length - 1)) * (width - 4);
  const yScale = (y) => height - 3 - ((y - min) / range) * (height - 6);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${xScale(p.x).toFixed(1)},${yScale(p.y).toFixed(1)}`).join(" ");
  const tone = ["green", "yellow", "red", "neutral"].includes(chartTone) ? chartTone : "neutral";
  return (
    <svg className={`watch-sparkline watch-sparkline-score ${tone}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${clean} 6-month sparkline`}>
      <path d={path} />
    </svg>
  );
}


function formatMonthYearShort(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = String(date.getFullYear()).slice(-2);
  return `${month}-${year}`;
}

function MiniSvgLineChart({ rows = [], projections = [], livePrice = null, tone = "neutral" }) {
  const width = 720;
  const height = 250;
  let sourceRows = Array.isArray(rows) ? [...rows] : [];
  if (Number.isFinite(Number(livePrice)) && sourceRows.length) {
    sourceRows = [...sourceRows.slice(0, -1), { ...sourceRows[sourceRows.length - 1], close: Number(livePrice), live: true }];
  }
  const points = sourceRows.map((row, index) => ({ x: index, y: Number(row.close) })).filter((p) => Number.isFinite(p.y) && p.y > 0);
  const projectionPoints = projections.filter((p) => Number.isFinite(Number(p.targetPrice)) && Number.isFinite(Number(p.startPrice)));
  if (!points.length) return <div className="eval-stock-chart-empty">No historical prices returned yet.</div>;
  const allY = points.map((p) => p.y).concat(projectionPoints.flatMap((p) => [Number(p.startPrice), Number(p.targetPrice)]));
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const range = maxY - minY || 1;
  const xScale = (x) => 28 + (x / Math.max(1, points.length - 1)) * (width - 56);
  const yScale = (y) => 220 - ((y - minY) / range) * 180;
  const path = points.map((pnt, i) => `${i === 0 ? "M" : "L"}${xScale(pnt.x).toFixed(1)},${yScale(pnt.y).toFixed(1)}`).join(" ");
  const highPoint = points.reduce((best, point) => point.y > best.y ? point : best, points[0]);
  const lowPoint = points.reduce((best, point) => point.y < best.y ? point : best, points[0]);
  const highX = xScale(highPoint.x);
  const highY = yScale(highPoint.y);
  const lowX = xScale(lowPoint.x);
  const lowY = yScale(lowPoint.y);
  const highLabelY = Math.max(22, highY - 14);
  const lowLabelY = Math.min(height - 10, lowY + 24);
  const startX = xScale(points.length - 1);
  const startY = yScale(points[points.length - 1].y);
  const labelPoints = points.length > 1 ? [0, Math.floor((points.length - 1) / 2), points.length - 1]
    .map((idx) => ({ idx, row: sourceRows[idx] }))
    .filter((item, index, arr) => item.row && arr.findIndex((other) => other.idx === item.idx) === index) : [];
  const chartTone = ["green", "yellow", "red", "neutral"].includes(tone) ? tone : "neutral";
  return (
    <svg className={`eval-stock-chart-svg ${chartTone}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Stock price chart with high and low markers">
      <defs>
        <linearGradient id="evalChartStrokeGreen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#85ff47" />
          <stop offset="100%" stopColor="#15e7ff" />
        </linearGradient>
        <linearGradient id="evalChartStrokeYellow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffe45f" />
          <stop offset="100%" stopColor="#ff9f1c" />
        </linearGradient>
        <linearGradient id="evalChartStrokeRed" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff4f67" />
          <stop offset="100%" stopColor="#ff9f1c" />
        </linearGradient>
        <linearGradient id="evalChartStrokeNeutral" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#9f5cff" />
          <stop offset="100%" stopColor="#15e7ff" />
        </linearGradient>
        <linearGradient id="evalChartFadeGreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#85ff47" stopOpacity="0.12" />
          <stop offset="45%" stopColor="#15e7ff" stopOpacity="0.035" />
          <stop offset="100%" stopColor="#15e7ff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="evalChartFadeYellow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe45f" stopOpacity="0.11" />
          <stop offset="45%" stopColor="#ff9f1c" stopOpacity="0.035" />
          <stop offset="100%" stopColor="#ff9f1c" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="evalChartFadeRed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff4f67" stopOpacity="0.11" />
          <stop offset="45%" stopColor="#ff9f1c" stopOpacity="0.035" />
          <stop offset="100%" stopColor="#ff9f1c" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="evalChartFadeNeutral" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9f5cff" stopOpacity="0.10" />
          <stop offset="45%" stopColor="#15e7ff" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#15e7ff" stopOpacity="0" />
        </linearGradient>
        <filter id="evalChartGlow"><feGaussianBlur stdDeviation="2.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {[0,1,2,3].map((i) => <line key={i} x1="28" x2={width - 28} y1={42 + i * 50} y2={42 + i * 50} className="eval-chart-gridline" />)}
      <path d={`${path} L ${width - 28} 232 L 28 232 Z`} className="eval-chart-area" fill={`url(#evalChartFade${chartTone[0].toUpperCase()}${chartTone.slice(1)})`} />
      <path d={path} className="eval-chart-line" stroke={`url(#evalChartStroke${chartTone[0].toUpperCase()}${chartTone.slice(1)})`} filter="url(#evalChartGlow)" />
      <g className="eval-chart-extreme eval-chart-high-marker no-dot">
        <line x1={highX} x2={highX} y1={highY} y2={highLabelY + 6} className="eval-chart-extreme-stem" />
        <text className="eval-chart-extreme-label" x={highX} y={highLabelY} textAnchor="middle" dominantBaseline="middle">{money(highPoint.y)}</text>
      </g>
      <g className="eval-chart-extreme eval-chart-low-marker no-dot">
        <line x1={lowX} x2={lowX} y1={lowY} y2={lowLabelY - 14} className="eval-chart-extreme-stem" />
        <text className="eval-chart-extreme-label" x={lowX} y={lowLabelY} textAnchor="middle" dominantBaseline="middle">{money(lowPoint.y)}</text>
      </g>
      {labelPoints.map(({ idx, row }) => (
        <text key={`x-${idx}`} className="eval-chart-x-label" x={xScale(idx)} y="246" textAnchor={idx === 0 ? "start" : idx === points.length - 1 ? "end" : "middle"}>{formatMonthYearShort(row?.datetime || row?.date || row?.timestamp)}</text>
      ))}
      <line x1={startX} x2={startX} y1="34" y2="232" className="eval-chart-current-price-line" />
      {projectionPoints.map((proj) => {
        const endX = width - 28;
        const endY = yScale(Number(proj.targetPrice));
        const cls = proj.scenario === "high" ? "high" : proj.scenario === "low" ? "low" : "average";
        return <line key={proj.scenario} x1={startX} y1={startY} x2={endX} y2={endY} className={`eval-chart-projection ${cls}`} />;
      })}
    </svg>
  );
}

function shouldPlaceIntradayChartPoint(ms = Date.now()) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(ms));
    const weekday = parts.find((part) => part.type === "weekday")?.value || "";
    const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
    const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
    const minutes = hour * 60 + minute;
    return !["Sat", "Sun"].includes(weekday) && minutes >= 570 && minutes <= 960;
  } catch {
    return true;
  }
}

const EVAL_CHART_RANGES = [
  { key: "6M", label: "6M", interval: "1day", outputsize: 180, historicalEod: true },
];

function EvalStockChartPanel({ data, edgeScore = null, onAdd, onMetrics, onScoreBreakdown, scoreBreakdownOpen = false }) {
  const symbol = String(data?.symbol || "").trim().toUpperCase();
  const liveEnabled = isLiveWebSocketSymbol(symbol);
  const [live, setLive] = useState({ current: data?.quote?.c, previousClose: data?.quote?.pc, change: data?.quote?.d, changePercent: data?.quote?.dp, source: "initial" });
  const [chartRows, setChartRows] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartRange, setChartRange] = useState("6M");
  const activeChartRange = EVAL_CHART_RANGES.find((item) => item.key === chartRange) || EVAL_CHART_RANGES[0];

  useEffect(() => {
    if (!symbol) return undefined;
    setLive({ current: data?.quote?.c, previousClose: data?.quote?.pc, change: data?.quote?.d, changePercent: data?.quote?.dp, source: "initial" });
  }, [symbol, data?.quote?.c, data?.quote?.pc, data?.quote?.d, data?.quote?.dp]);

  useEffect(() => {
    if (!symbol) return undefined;
    let cancelled = false;
    const key = String(symbol).toUpperCase();
    const loadLive = async () => {
      if (liveEnabled) return;
      const cached = readClientTimedCache(CLIENT_LIVE_QUOTE_CACHE, key);
      if (cached !== undefined) {
        if (!cancelled) setLive(cached);
        return;
      }
      try {
        const res = await fetch(`${API}/api/live-quote/${encodeURIComponent(symbol)}`);
        const json = await res.json();
        if (res.ok) writeClientTimedCache(CLIENT_LIVE_QUOTE_CACHE, key, json, CLIENT_LIVE_QUOTE_TTL_MS);
        if (!cancelled && res.ok) setLive(json);
      } catch {}
    };
    loadLive();
    const onFocus = () => loadLive();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.removeEventListener("focus", onFocus); };
  }, [symbol, liveEnabled]);

  useEffect(() => {
    if (!symbol) return undefined;
    let cancelled = false;
    const cacheKey = `${symbol}:chart:${activeChartRange.key}`;
    const loadChart = async () => {
      setChartLoading(true);
      const cached = readClientTimedCache(CLIENT_CHART_CACHE, cacheKey);
      if (cached !== undefined) {
        if (!cancelled) setChartRows(cached);
        setChartLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API}/api/twelve-chart/${encodeURIComponent(symbol)}?interval=${encodeURIComponent(activeChartRange.interval)}&outputsize=${encodeURIComponent(activeChartRange.outputsize)}`);
        const json = await res.json();
        const nextRows = Array.isArray(json?.rows) ? json.rows : [];
        if (res.ok) writeClientTimedCache(CLIENT_CHART_CACHE, cacheKey, nextRows, CLIENT_CHART_TTL_MS);
        if (!cancelled && res.ok) setChartRows(nextRows);
      } catch {
        if (!cancelled) setChartRows([]);
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    };
    loadChart();
    return () => { cancelled = true; };
  }, [symbol, activeChartRange.key, activeChartRange.interval, activeChartRange.outputsize]);

  useEffect(() => {
    if (!symbol || !liveEnabled) return undefined;
    const url = websocketUrlForSymbols([symbol]);
    if (!url) return undefined;
    let ws;
    let closed = false;
    let reconnectTimer = null;
    let lastChartUpdate = 0;
    let lastLiveUpdate = 0;

    const connect = () => {
      if (closed) return;
      ws = new WebSocket(url);
      ws.onopen = () => {
        try { ws.send(JSON.stringify({ type: "symbols", symbols: [symbol] })); } catch {}
      };
      ws.onmessage = (event) => {
        let packet = null;
        try { packet = JSON.parse(event.data); } catch { return; }
        const next = normalizeLivePacket(packet, symbol);
        if (next.symbol !== symbol || !Number.isFinite(Number(next.current))) return;
        const now = Date.now();
        if (now - lastLiveUpdate >= 5_000) {
          lastLiveUpdate = now;
          setLive((prev) => {
            const current = next.current ?? prev.current;
            const previousClose = next.previousClose ?? prev.previousClose ?? data?.quote?.pc;
            const change = Number.isFinite(Number(current)) && Number.isFinite(Number(previousClose)) ? Number(current) - Number(previousClose) : prev.change;
            const changePercent = Number.isFinite(Number(change)) && Number.isFinite(Number(previousClose)) && Number(previousClose) > 0 ? (Number(change) / Number(previousClose)) * 100 : prev.changePercent;
            return {
              ...prev,
              current,
              previousClose,
              change,
              changePercent,
              timestamp: next.timestamp,
              source: "Twelve Data WebSocket",
            };
          });
        }
        if (activeChartRange.intraday && shouldPlaceIntradayChartPoint(now) && now - lastChartUpdate >= 15 * 60 * 1000) {
          lastChartUpdate = now;
          setChartRows((currentRows) => {
            const rows = Array.isArray(currentRows) ? [...currentRows] : [];
            rows.push({ datetime: new Date(now).toISOString(), close: next.current, live: true });
            return rows.slice(-120);
          });
        }
      };
      ws.onclose = () => {
        if (!closed) reconnectTimer = window.setTimeout(connect, 3000);
      };
      ws.onerror = () => { try { ws?.close(); } catch {} };
    };

    connect();
    return () => {
      closed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      try { ws?.close(); } catch {}
    };
  }, [symbol, liveEnabled, activeChartRange.intraday, data?.quote?.pc]);

  const companyDomain = getCompanyDomainFromReport(data);
  const companyName = getCompanyNameFromReport(data, symbol);
  const current = Number(live?.current ?? data?.quote?.c);
  const previousCloseForChange = Number(live?.previousClose ?? data?.quote?.pc);
  const tone = "neutral";

  return (
    <section className="eval-stock-chart-shell eval-stock-quote-shell eval-chart-hero-card">
      <div className="eval-stock-chart-top eval-chart-hero-top">
        <div className="eval-stock-company-lockup">
          <StockLogo symbol={symbol} domain={companyDomain} name={companyName} className="eval-stock-logo-link" />
          <div>
            <h3>{companyName || symbol}</h3>
            <span>{symbol}{liveEnabled ? " · LIVE" : ""}</span>
          </div>
        </div>
        <div className="eval-chart-hero-right">
          <div className={`eval-live-price-panel ${tone}`}>
            <strong>{money(current)}</strong>
          </div>
          <div className="eval-chart-score-side no-label">
            <EvalScoreTextBadge value={edgeScore ?? data?.grades?.edgeScore} className="eval-stock-chart-score watch-score-plain" />
          </div>
        </div>
      </div>

      {chartLoading ? <div className="eval-stock-chart-empty">Loading price chart...</div> : <MiniSvgLineChart rows={chartRows} livePrice={null} tone={scoreTone(edgeScore ?? data?.grades?.edgeScore)} />}

    </section>
  );
}

function DcfCalculatorPanel({ data }) {
  const symbol = data?.symbol;
  const [open, setOpen] = useState(false);
  const dcf = data?.dcf || {};
  const available = Boolean(dcf?.available);
  const mos = Number(dcf?.marginOfSafety);
  const mosTone = Number.isFinite(mos) ? (mos >= 10 ? "green" : mos >= 0 ? "yellow" : "red") : "neutral";
  const company = data?.profile?.name || data?.companyName || symbol || "Stock";

  return (
    <section className="eval-dcf-shell eval-dcf-popup-shell" aria-label="DCF calculator section">
      <button type="button" className={`eval-dcf-toggle ${mosTone}`} onClick={() => setOpen((v) => !v)}>
        <span className="eval-dcf-toggle-left"><Target size={18} /> DCF Calculator</span>
        {available && <span className="eval-dcf-toggle-pill">MOS {signedPercent(dcf.marginOfSafety)}</span>}
      </button>
      {open && (
        <div className={`eval-dcf-page eval-dcf-popup-page ${mosTone}`}>
          <div className="eval-dcf-head">
            <div>
              <span>Valuation model</span>
              <h3>{company} DCF</h3>
            </div>
            <button type="button" className="icon-btn eval-dcf-close" onClick={() => setOpen(false)} aria-label="Close DCF calculator">×</button>
          </div>
          {!available ? (
            <div className="eval-dcf-empty-state">
              <strong>DCF currently voided</strong>
              <p>Eval needs usable free cash flow, share count, growth, cash/debt, and latest-close data before it can calculate intrinsic value.</p>
            </div>
          ) : (
            <>
              <div className="eval-dcf-result-grid eval-dcf-valuation-grid">
                <div className="dcf-card"><span>Latest close</span><strong>{money(dcf.latestClose)}</strong></div>
                <div className="dcf-card"><span>Intrinsic value</span><strong>{money(dcf.intrinsicValue)}</strong></div>
                <div className={`dcf-card dcf-margin-highlight ${mosTone}`}><span>Margin of safety</span><strong>{signedPercent(dcf.marginOfSafety)}</strong></div>
              </div>
              <p className="eval-dcf-description">
                A discounted cash flow calculation estimates what a company may be worth by projecting future free cash flow, discounting those cash flows back to today, adding a terminal value, then adjusting for cash, debt, and shares outstanding. Eval compares that intrinsic value with the latest daily close to calculate margin of safety.
              </p>
              <div className="eval-dcf-assumption-grid">
                <div><span>Growth used</span><strong>{Number(dcf?.assumptions?.baseGrowthPercent ?? 0).toFixed(1)}%</strong></div>
                <div><span>Discount rate</span><strong>{Number(dcf?.assumptions?.discountRatePercent ?? 0).toFixed(1)}%</strong></div>
                <div><span>Terminal growth</span><strong>{Number(dcf?.assumptions?.terminalGrowthPercent ?? 0).toFixed(1)}%</strong></div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

unction Report({ data, onAdd, onOpenIndustry, pieTheme = "pulse" }) {
  const cats = cleanEvalCategories(data?.grades?.categories || {});
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
  const [sectorOpen, setIndustryOpen] = useState(false);
  const [sectorLoading, setIndustryLoading] = useState(false);
  const [sectorError, setIndustryError] = useState("");
  const [sectorLeaders, setIndustryLeaders] = useState([]);

  const sectorName = data.profile?.finnhubIndustry || "Public company";
  const newsTopics = [];
  const [scoreBreakdownOpen, setScoreBreakdownOpen] = useState(false);
  const [scoreBreakdownLoading, setScoreBreakdownLoading] = useState(false);
  const [scoreBreakdownError, setScoreBreakdownError] = useState("");
  const [scoreBreakdownSummary, setScoreBreakdownSummary] = useState(null);

  useEffect(() => {
    setScoreBreakdownOpen(false);
    setScoreBreakdownLoading(false);
    setScoreBreakdownError("");
    setScoreBreakdownSummary(null);
  }, [data.symbol]);

  async function openScoreBreakdownDashboard() {
    const nextOpen = !scoreBreakdownOpen;
    setScoreBreakdownOpen(nextOpen);

    if (!nextOpen || scoreBreakdownSummary || scoreBreakdownLoading) return;

    setScoreBreakdownLoading(true);
    setScoreBreakdownError("");

    try {
      const res = await fetch(`${API}/api/score-breakdown/${encodeURIComponent(data.symbol)}`, {
        headers: { Accept: "application/json" },
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || "Could not generate the score breakdown.");
      }

      setScoreBreakdownSummary(payload?.aiScoreSummary || payload?.summary || null);
    } catch (error) {
      setScoreBreakdownError(error?.message || "Could not generate the score breakdown.");
    } finally {
      setScoreBreakdownLoading(false);
    }
  }

  async function openIndustryPopup() {
    if (!sectorName || sectorName === "Public company") return;
    onOpenIndustry?.(sectorName, data.symbol);
  }

  const strongest = useMemo(
    () =>
      Object.entries(cats)
        .filter(([key, v]) => EVAL_CATEGORY_KEY_SET.has(key) && v != null)
        .sort((a, b) => score10(b[1]) - score10(a[1]))[0],
    [cats]
  );

  const weakest = useMemo(
    () =>
      Object.entries(cats)
        .filter(([key, v]) => EVAL_CATEGORY_KEY_SET.has(key) && v != null)
        .sort((a, b) => score10(a[1]) - score10(b[1]))[0],
    [cats]
  );

  const gradeDescriptions = {
    growth: "Shows whether the company is expanding sales, earnings, and market traction. Higher means the business is growing with stronger recent support.",
    profitability: "Shows how efficiently the company turns revenue into profit. Higher means the company keeps more money after costs.",
    financialHealth: "Shows how stable the company looks financially. Higher means debt and balance-sheet risk are easier to handle.",
    valuation: "Shows whether the stock price looks fair compared with company fundamentals. Higher means the stock looks less overpriced.",
    momentum: "Shows recent stock strength and trend direction. Higher means the market has been rewarding the stock lately.",
    pullback: "Shows whether the stock has cooled off from highs without completely breaking down. Higher means the entry setup looks less stretched.",
  };

  const categoryMetrics = {
    growth: usableMetricLines([
      metricLine("Revenue Growth", metrics.revenueGrowth),
      metricLine("3-Year Revenue Growth", metrics.revenueGrowth3Y),
      metricLine("EPS Growth", metrics.epsGrowth),
      metricLine("3-Year EPS Growth", metrics.epsGrowth3Y),
      metricLine("5-Year EPS Growth", metrics.epsGrowth5Y),
      metricLine("Net Income Growth", metrics.netIncomeGrowth),
      metricLine("3-Year Net Income Growth", metrics.netIncomeGrowth3Y),
      metricLine("13-Week Stock Movement", metrics.priceReturn13Week),
      metricLine("26-Week Stock Movement", metrics.priceReturn26Week),
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
      metricLine("DCF Intrinsic Value", metrics.intrinsicValue),
      metricLine("Latest Close", metrics.latestClose),
      metricLine("Margin of Safety", metrics.marginOfSafety),
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
    pullback: usableMetricLines([
      metricLine("Pullback From 52-Week High", metrics.pullbackFromHigh),
      metricLine("4-Week Cooling", metrics.priceReturn4Week),
      metricLine("Distance From 52-Week Low", metrics.distanceFrom52WeekLow),
      metricLine("Daily Dip", metrics.dayChangePercent),
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
      "DCF Margin of Safety",
      metrics.marginOfSafety,
      "Compares Eval's DCF intrinsic value with the latest daily close. Positive values suggest more margin of safety in the valuation model.",
    ],
    [
      "Intrinsic Value",
      metrics.intrinsicValue,
      "Eval's estimated DCF value per share based on free cash flow, growth assumptions, cash, debt, and shares outstanding.",
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
      <EvalStockChartPanel
        data={data}
        edgeScore={edge}
        onAdd={onAdd}
        onMetrics={scrollToScoreMetrics}
        onScoreBreakdown={openScoreBreakdownDashboard}
        scoreBreakdownOpen={scoreBreakdownOpen}
      />
      <DcfCalculatorPanel data={data} />

      {scoreBreakdownOpen && (
        <section className="score-breakdown-dashboard-shell">
          <div className="score-breakdown-dashboard-head">
            <div className="section-title ai-score-title">
              <BrainCircuit size={18} />
              AI Score Breakdown
              <small>Runs only when clicked</small>
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setScoreBreakdownOpen(false)}
              aria-label="Close score breakdown"
              title="Close score breakdown"
            >
              ×
            </button>
          </div>

          {scoreBreakdownLoading && (
            <div className="score-breakdown-loading">
              <RefreshCw className="spin" size={20} />
              <span>Generating a company-specific score breakdown...</span>
            </div>
          )}

          {scoreBreakdownError && (
            <div className="score-breakdown-error">
              <AlertTriangle size={18} />
              <span>{scoreBreakdownError}</span>
            </div>
          )}

          {scoreBreakdownSummary && (
            <EvalAiScoreSummaryCard summary={scoreBreakdownSummary} ticker={data.symbol} />
          )}
        </section>
      )}
<section id="score-metrics" className="grade-grid grade-grid-seven">
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
          id="pullback"
          name="Pullback"
          value={cats.pullback}
          icon={<Activity size={18} />}
          description={gradeDescriptions.pullback}
          metricsUsed={categoryMetrics.pullback}
          isOpen={openScoreHelp === "pullback"}
          onToggle={() =>
            setOpenScoreHelp(openScoreHelp === "pullback" ? null : "pullback")
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
  helpTitle = "",
  metricsUsed = [],
  isOpen = false,
  onToggle = () => {},
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
  id = "",
  name,
  value,
  icon,
  description,
  metricsUsed = [],
  isOpen = false,
  onToggle = () => {},
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
        <strong className={`score-ovr-stack unified-score-display metric-score-stack ${tone}`}><span className="score-ovr-number">{scoreText(s)}</span><small className="score-ovr-label">OVR</small></strong>
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
