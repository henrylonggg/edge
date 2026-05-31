import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildStockAnalysis } from "./score.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

const MAX_ASSISTANT_QUESTION_CHARS = 75;
const MAX_ASSISTANT_ANSWER_CHARS = 150;

function shortAssistantAnswer(text = "") {
  const cleaned = String(text || "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= MAX_ASSISTANT_ANSWER_CHARS) return cleaned;
  return `${cleaned.slice(0, MAX_ASSISTANT_ANSWER_CHARS - 3).trim()}...`;
}



function stripHtml(html = "") {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanAboutText(text = "") {
  const cleaned = stripHtml(text)
    .replace(/\b(skip to main content|cookie policy|privacy policy|terms of use|all rights reserved)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned.length < 60) return null;
  return cleaned.length > 620 ? `${cleaned.slice(0, 620).trim()}...` : cleaned;
}

function getMetaContent(html, names = []) {
  for (const name of names) {
    const patterns = [
      new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["'][^>]*>`, "i"),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return cleanAboutText(match[1]);
    }
  }

  return null;
}

function findAboutUrl(homeUrl, html) {
  const matches = [...String(html).matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const aboutMatch = matches.find((match) => {
    const href = String(match[1] || "");
    const label = stripHtml(match[2] || "").toLowerCase();
    return /\babout\b|company|who we are|our story/.test(label) || /about|company|who-we-are|our-story/i.test(href);
  });

  if (!aboutMatch) return null;

  try {
    return new URL(aboutMatch[1], homeUrl).toString();
  } catch {
    return null;
  }
}

function extractAboutSection(html) {
  const sectionPatterns = [
    /<section[^>]*(?:about|company|who-we-are|our-story)[^>]*>([\s\S]{120,5000}?)<\/section>/i,
    /<div[^>]*(?:about|company|who-we-are|our-story)[^>]*>([\s\S]{120,5000}?)<\/div>/i,
    /<main[^>]*>([\s\S]{120,6000}?)<\/main>/i,
  ];

  for (const pattern of sectionPatterns) {
    const match = html.match(pattern);
    const cleaned = match?.[1] ? cleanAboutText(match[1]) : null;
    if (cleaned) return cleaned;
  }

  return null;
}

async function fetchWebsiteHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 EvalAIAboutFetcher/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchCompanyWebsiteAbout(profile = {}) {
  const home = profile?.weburl || profile?.website || profile?.url;
  if (!home) return null;

  const homeUrl = /^https?:\/\//i.test(home) ? home : `https://${home}`;
  const homeHtml = await fetchWebsiteHtml(homeUrl);
  if (!homeHtml) return null;

  const homeMeta = getMetaContent(homeHtml, ["description", "og:description", "twitter:description"]);
  const aboutUrl = findAboutUrl(homeUrl, homeHtml);

  if (aboutUrl && aboutUrl !== homeUrl) {
    const aboutHtml = await fetchWebsiteHtml(aboutUrl);
    const aboutSection = aboutHtml ? extractAboutSection(aboutHtml) : null;
    const aboutMeta = aboutHtml ? getMetaContent(aboutHtml, ["description", "og:description", "twitter:description"]) : null;
    return aboutSection || aboutMeta || homeMeta;
  }

  return extractAboutSection(homeHtml) || homeMeta;
}

async function fetchFinnhubAbout(symbol) {
  const token = process.env.FINNHUB_API_KEY || process.env.FINNHUB_KEY;
  if (!token) return null;

  try {
    const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${token}`;
    const res = await fetch(url);
    const profile = await res.json().catch(() => null);

    if (!res.ok || !profile || Object.keys(profile).length === 0) {
      return null;
    }

    const about =
      profile.description ||
      profile.businessSummary ||
      profile.businessDescription ||
      profile.summary ||
      profile.about ||
      null;

    if (about && String(about).trim()) {
      return String(about).trim();
    }

    const pieces = [
      profile.name ? `${profile.name} is a publicly traded company` : null,
      profile.finnhubIndustry ? `in the ${profile.finnhubIndustry} industry` : null,
      profile.country ? `based in ${profile.country}` : null,
      profile.exchange ? `and listed on the ${profile.exchange}` : null,
    ].filter(Boolean);

    if (!pieces.length) return null;
    return `${pieces.join(" ")}.`;
  } catch (error) {
    console.error("Finnhub about lookup failed:", error?.message || error);
    return null;
  }
}

/*
  CORS FIX FOR VERCEL → RENDER

  This manually adds the Access-Control-Allow-Origin header.
  Your browser error said this header was missing, so this fixes that directly.
*/
app.use((req, res, next) => {
  const origin = req.headers.origin;

  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://edge-cd9xfrhhk-henrylongggs-projects.vercel.app",
    "https://edge-ez91jd761-henrylongggs-projects.vercel.app",
  ];

  const isAllowedVercelPreview =
    origin && origin.endsWith(".vercel.app");

  if (allowedOrigins.includes(origin) || isAllowedVercelPreview) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    res.header("Access-Control-Allow-Origin", "*");
  }

  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DB_PATH = path.join(__dirname, "auth-data.json");
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

const pendingSignups = new Map();
const pendingResets = new Map();

function readAuthDb() {
  try {
    if (!fs.existsSync(AUTH_DB_PATH)) {
      return { users: [] };
    }
    const parsed = JSON.parse(fs.readFileSync(AUTH_DB_PATH, "utf8"));
    return { users: Array.isArray(parsed.users) ? parsed.users : [] };
  } catch (error) {
    console.error("Could not read auth database:", error?.message || error);
    return { users: [] };
  }
}

function writeAuthDb(db) {
  fs.writeFileSync(AUTH_DB_PATH, JSON.stringify(db, null, 2));
}

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function isValidEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createCode() {
  return String(crypto.randomInt(100000, 999999));
}

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, user) {
  if (!user?.passwordHash || !user?.passwordSalt) return false;
  const hash = crypto.scryptSync(password, user.passwordSalt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.passwordHash, "hex"));
}

function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function verifyCaptcha({ captchaToken, captchaConfirmed }) {
  const secret = process.env.TURNSTILE_SECRET_KEY || process.env.HCAPTCHA_SECRET_KEY || process.env.RECAPTCHA_SECRET_KEY;

  if (!secret) {
    return Boolean(captchaConfirmed);
  }

  if (!captchaToken) return false;

  const providerUrl = process.env.TURNSTILE_SECRET_KEY
    ? "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    : process.env.HCAPTCHA_SECRET_KEY
      ? "https://hcaptcha.com/siteverify"
      : "https://www.google.com/recaptcha/api/siteverify";

  try {
    const body = new URLSearchParams();
    body.append("secret", secret);
    body.append("response", captchaToken);

    const response = await fetch(providerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const json = await response.json().catch(() => null);
    return Boolean(json?.success);
  } catch (error) {
    console.error("Captcha verification failed:", error?.message || error);
    return false;
  }
}

async function sendVerificationEmail(email, code, purpose) {
  const subject = purpose === "reset"
    ? "Your Eval password reset code"
    : "Your Eval verification code";

  const text = purpose === "reset"
    ? `Your Eval password reset code is ${code}. This code expires in 10 minutes.`
    : `Your Eval verification code is ${code}. This code expires in 10 minutes.`;

  if (process.env.SENDGRID_API_KEY && process.env.AUTH_EMAIL_FROM) {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: process.env.AUTH_EMAIL_FROM, name: "Eval" },
        subject,
        content: [{ type: "text/plain", value: text }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("SendGrid failed:", response.status, errorText);
      throw new Error("Could not send verification email.");
    }

    return;
  }

  console.log(`\n[EVAL AUTH CODE] ${purpose.toUpperCase()} for ${email}: ${code}\n`);
}

function getUser(email) {
  const db = readAuthDb();
  return db.users.find((user) => user.email === email) || null;
}

function saveUser(nextUser) {
  const db = readAuthDb();
  const existingIndex = db.users.findIndex((user) => user.email === nextUser.email);

  if (existingIndex >= 0) {
    db.users[existingIndex] = nextUser;
  } else {
    db.users.push(nextUser);
  }

  writeAuthDb(db);
}

app.post("/api/auth/signup/start", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    if (getUser(email)) {
      return res.status(409).json({ error: "An account already exists for this email. Log in instead." });
    }

    const code = createCode();
    pendingSignups.set(email, {
      codeHash: hashCode(code),
      expiresAt: Date.now() + CODE_TTL_MS,
      attempts: 0,
      verified: false,
    });

    await sendVerificationEmail(email, code, "signup");

    return res.status(200).json({ ok: true, message: "Verification code sent." });
  } catch (error) {
    console.error("Signup start failed:", error);
    return res.status(500).json({ error: error?.message || "Could not start signup." });
  }
});

app.post("/api/auth/signup/verify", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code || "").trim();
  const pending = pendingSignups.get(email);

  if (!pending || pending.expiresAt < Date.now()) {
    pendingSignups.delete(email);
    return res.status(400).json({ error: "Verification code expired. Request a new code." });
  }

  if (pending.attempts >= MAX_CODE_ATTEMPTS) {
    pendingSignups.delete(email);
    return res.status(429).json({ error: "Too many incorrect attempts. Request a new code." });
  }

  if (pending.codeHash !== hashCode(code)) {
    pending.attempts += 1;
    return res.status(400).json({ error: "Incorrect verification code." });
  }

  pending.verified = true;
  pendingSignups.set(email, pending);

  return res.status(200).json({ ok: true, message: "Email verified." });
});

app.post("/api/auth/signup/finish", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const confirmPassword = String(req.body?.confirmPassword || "");
    const captchaOk = await verifyCaptcha(req.body || {});
    const pending = pendingSignups.get(email);

    if (!pending?.verified || pending.expiresAt < Date.now()) {
      return res.status(400).json({ error: "Verify your email before creating a password." });
    }

    if (!captchaOk) {
      return res.status(400).json({ error: "Robot check failed. Try again." });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Both passwords must match." });
    }

    if (getUser(email)) {
      return res.status(409).json({ error: "An account already exists for this email." });
    }

    const { salt, hash } = createPasswordHash(password);

    saveUser({
      id: crypto.randomUUID(),
      email,
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    pendingSignups.delete(email);

    return res.status(200).json({ ok: true, message: "Account created. Log in now." });
  } catch (error) {
    console.error("Signup finish failed:", error);
    return res.status(500).json({ error: error?.message || "Could not create account." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const captchaOk = await verifyCaptcha(req.body || {});

    if (!captchaOk) {
      return res.status(400).json({ error: "Robot check failed. Try again." });
    }

    const user = getUser(email);

    if (!user || !verifyPassword(password, user)) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    return res.status(200).json({
      ok: true,
      token: createSessionToken(),
      user: { email: user.email },
      message: "Logged in.",
    });
  } catch (error) {
    console.error("Login failed:", error);
    return res.status(500).json({ error: "Could not log in." });
  }
});

app.post("/api/auth/password/start", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const captchaOk = await verifyCaptcha(req.body || {});

    if (!captchaOk) {
      return res.status(400).json({ error: "Robot check failed. Try again." });
    }

    const user = getUser(email);

    if (user) {
      const code = createCode();
      pendingResets.set(email, {
        codeHash: hashCode(code),
        expiresAt: Date.now() + CODE_TTL_MS,
        attempts: 0,
        verified: false,
      });
      await sendVerificationEmail(email, code, "reset");
    }

    return res.status(200).json({ ok: true, message: "If that email exists, a reset code was sent." });
  } catch (error) {
    console.error("Password reset start failed:", error);
    return res.status(500).json({ error: error?.message || "Could not start password reset." });
  }
});

app.post("/api/auth/password/verify", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code || "").trim();
  const pending = pendingResets.get(email);

  if (!pending || pending.expiresAt < Date.now()) {
    pendingResets.delete(email);
    return res.status(400).json({ error: "Reset code expired. Request a new code." });
  }

  if (pending.attempts >= MAX_CODE_ATTEMPTS) {
    pendingResets.delete(email);
    return res.status(429).json({ error: "Too many incorrect attempts. Request a new code." });
  }

  if (pending.codeHash !== hashCode(code)) {
    pending.attempts += 1;
    return res.status(400).json({ error: "Incorrect reset code." });
  }

  pending.verified = true;
  pendingResets.set(email, pending);

  return res.status(200).json({ ok: true, message: "Reset code verified." });
});

app.post("/api/auth/password/finish", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const confirmPassword = String(req.body?.confirmPassword || "");
    const pending = pendingResets.get(email);
    const user = getUser(email);

    if (!user) {
      return res.status(404).json({ error: "Account not found." });
    }

    if (!pending?.verified || pending.expiresAt < Date.now()) {
      return res.status(400).json({ error: "Verify your reset code before creating a new password." });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Both passwords must match." });
    }

    const { salt, hash } = createPasswordHash(password);

    saveUser({
      ...user,
      passwordSalt: salt,
      passwordHash: hash,
      updatedAt: new Date().toISOString(),
    });

    pendingResets.delete(email);

    return res.status(200).json({ ok: true, message: "Password reset. Log in now." });
  } catch (error) {
    console.error("Password reset finish failed:", error);
    return res.status(500).json({ error: error?.message || "Could not reset password." });
  }
});

app.get("/", (req, res) => {
  res.status(200).json({
    ok: true,
    message: "Eval Render backend is running.",
    routes: {
      health: "/api/health",
      analyzeExample: "/api/analyze/AAPL",
      assistant: "/api/assistant",
    },
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "eval-backend",
    status: "live",
    time: new Date().toISOString(),
  });
});


const ANALYSIS_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const analysisCache = new Map();

function cloneJson(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function getCachedAnalysis(symbol) {
  const key = String(symbol || "").trim().toUpperCase();
  if (!key) return null;

  const cached = analysisCache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.savedAt > ANALYSIS_CACHE_TTL_MS) {
    analysisCache.delete(key);
    return null;
  }

  return cloneJson(cached.analysis);
}

function setCachedAnalysis(symbol, analysis) {
  const key = String(symbol || "").trim().toUpperCase();
  if (!key || !analysis) return;

  analysisCache.set(key, {
    savedAt: Date.now(),
    analysis: cloneJson(analysis),
  });
}

async function buildCachedStockAnalysis(symbol) {
  const key = String(symbol || "").trim().toUpperCase();
  const cached = getCachedAnalysis(key);
  if (cached) {
    return {
      ...cached,
      cache: {
        ...(cached.cache || {}),
        hit: true,
        ttlHours: 2,
      },
    };
  }

  const analysis = await buildStockAnalysis(key);
  setCachedAnalysis(key, {
    ...analysis,
    cache: {
      ...(analysis.cache || {}),
      hit: false,
      ttlHours: 2,
      savedAt: new Date().toISOString(),
    },
  });

  return analysis;
}


const INDUSTRY_UNIVERSES = {
  "technology": ["AAPL", "MSFT", "ORCL", "CRM", "ADBE", "NOW", "INTU", "IBM", "SHOP", "SNOW", "DDOG", "PLTR"],
  "semiconductors": ["NVDA", "AVGO", "AMD", "INTC", "QCOM", "TXN", "MU", "ADI", "MRVL", "NXPI", "MCHP", "ON", "LRCX", "KLAC", "AMAT"],
  "software": ["MSFT", "ORCL", "CRM", "ADBE", "NOW", "INTU", "SNOW", "DDOG", "PLTR", "NET", "TEAM", "MDB"],
  "internet content & information": ["GOOGL", "META", "NFLX", "SPOT", "PINS", "RDDT", "SNAP", "MTCH", "BIDU"],
  "consumer electronics": ["AAPL", "SONY", "DELL", "HPQ", "LOGI", "GRMN"],
  "retail": ["AMZN", "WMT", "COST", "HD", "LOW", "TGT", "TJX", "ROST", "BBY", "ULTA", "DG", "DLTR"],
  "travel services": ["BKNG", "EXPE", "ABNB", "TCOM", "TRIP", "MMYT"],
  "auto manufacturers": ["TSLA", "GM", "F", "RIVN", "LCID", "TM", "HMC", "STLA"],
  "restaurants": ["MCD", "SBUX", "CMG", "YUM", "DRI", "QSR", "DPZ", "WING", "TXRH", "CAKE"],
  "banks": ["JPM", "BAC", "WFC", "C", "GS", "MS", "USB", "PNC", "TFC", "COF"],
  "financial services": ["V", "MA", "AXP", "PYPL", "SQ", "BLK", "SCHW", "SPGI", "MCO", "ICE"],
  "insurance": ["BRK.B", "UNH", "PGR", "CB", "AIG", "MET", "PRU", "AFL", "ALL", "TRV"],
  "healthcare plans": ["UNH", "ELV", "CI", "HUM", "CNC", "MOH"],
  "drug manufacturers": ["LLY", "JNJ", "MRK", "ABBV", "PFE", "BMY", "AMGN", "GILD", "VRTX", "REGN", "BIIB"],
  "medical devices": ["ISRG", "ABT", "SYK", "MDT", "BSX", "EW", "DXCM", "ZBH"],
  "diagnostics & research": ["TMO", "DHR", "A", "ILMN", "IQV", "CRL", "TECH"],
  "oil & gas": ["XOM", "CVX", "COP", "EOG", "OXY", "DVN", "FANG", "MPC", "PSX", "VLO"],
  "aerospace & defense": ["RTX", "LMT", "NOC", "GD", "BA", "TDG", "HWM", "TXT", "LHX"],
  "farm & heavy construction machinery": ["CAT", "DE", "PCAR", "CNH", "AGCO"],
  "specialty industrial machinery": ["ETN", "EMR", "ROK", "ITW", "PH", "DOV", "IR"],
  "railroads": ["UNP", "CSX", "NSC", "CP", "CNI"],
  "integrated freight & logistics": ["UPS", "FDX", "DHLGY", "XPO", "CHRW"],
  "utilities": ["NEE", "DUK", "SO", "AEP", "D", "EXC", "SRE", "XEL", "PEG", "ED"],
  "reit": ["PLD", "AMT", "EQIX", "SPG", "O", "WELL", "DLR", "PSA", "CCI", "VICI"],
  "beverages": ["KO", "PEP", "MNST", "KDP", "CELH", "TAP"],
  "packaged foods": ["MDLZ", "GIS", "K", "CPB", "HSY", "SJM", "CAG"],
  "household & personal products": ["PG", "CL", "KMB", "EL", "CHD", "CLX"],
  "communication services": ["TMUS", "VZ", "T", "CMCSA", "CHTR", "LUMN"],
  "entertainment": ["NFLX", "DIS", "WBD", "PARA", "LYV", "ROKU"],
  "chemicals": ["LIN", "APD", "SHW", "DOW", "DD", "ECL", "ALB", "PPG"],
  "copper": ["FCX", "SCCO", "TECK", "HBM"],
  "gold": ["NEM", "GOLD", "AEM", "KGC", "AU"],
};

function normalizeIndustryName(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function industryMatches(requested = "", actual = "") {
  const req = normalizeIndustryName(requested);
  const act = normalizeIndustryName(actual);

  if (!req || !act) return false;
  if (req === act) return true;

  const aliases = {
    "technology": ["information technology", "consumer electronics", "software", "semiconductors"],
    "semiconductor": ["semiconductors"],
    "semiconductors": ["semiconductor equipment and materials", "semiconductor"],
    "retail": ["specialty retail", "internet retail", "discount stores", "home improvement retail", "apparel retail"],
    "travel": ["travel services", "lodging", "resorts and casinos"],
    "travel services": ["travel"],
    "restaurants": ["restaurant", "restaurants"],
    "oil and gas": ["oil gas", "oil and gas e p", "oil and gas integrated", "oil and gas refining and marketing"],
    "reit": ["real estate investment trusts", "reit"],
    "drug manufacturers": ["drug manufacturers general", "drug manufacturers specialty and generic", "biotechnology"],
  };

  const reqAliases = aliases[req] || [];
  if (reqAliases.some((alias) => act === normalizeIndustryName(alias) || act.includes(normalizeIndustryName(alias)))) {
    return true;
  }

  const actAliases = aliases[act] || [];
  if (actAliases.some((alias) => req === normalizeIndustryName(alias) || req.includes(normalizeIndustryName(alias)))) {
    return true;
  }

  return false;
}

function getIndustryUniverse(industry = "", symbol = "") {
  const cleanIndustry = normalizeIndustryName(industry);
  const current = String(symbol || "").trim().toUpperCase();

  const directKey = Object.keys(INDUSTRY_UNIVERSES).find((key) => {
    const cleanKey = normalizeIndustryName(key);
    return cleanIndustry === cleanKey || cleanIndustry.includes(cleanKey) || cleanKey.includes(cleanIndustry);
  });

  let tickers = directKey ? INDUSTRY_UNIVERSES[directKey] : null;

  if (!tickers) {
    const softerKey = Object.keys(INDUSTRY_UNIVERSES).find((key) => industryMatches(industry, key));
    tickers = softerKey ? INDUSTRY_UNIVERSES[softerKey] : ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "JPM", "LLY", "XOM", "COST"];
  }

  return [...new Set([current, ...tickers].filter(Boolean))].slice(0, 16);
}

app.get("/api/industry-top/:industry", async (req, res) => {
  try {
    const industry = String(req.params.industry || "").trim();
    const symbol = String(req.query.symbol || "").trim().toUpperCase();

    if (!industry) {
      return res.status(400).json({ error: "Missing industry." });
    }

    const candidates = getIndustryUniverse(industry, symbol);
    const results = [];

    for (const ticker of candidates) {
      try {
        const analysis = await getCachedStockAnalysis(ticker);
        const score = analysis?.grades?.edgeScore;
        const actualIndustry = analysis?.profile?.finnhubIndustry || "";

        // Keep the ranking tied to the actual industry label from the app.
        // If the ticker is the current stock, allow it; otherwise skip mismatched industries.
        if (ticker !== symbol && actualIndustry && !industryMatches(industry, actualIndustry)) {
          continue;
        }

        if (score !== null && score !== undefined && Number.isFinite(Number(score))) {
          results.push({
            symbol: ticker,
            name: analysis?.profile?.name || ticker,
            industry: actualIndustry || industry,
            score: Number(score),
            price: analysis?.quote?.c ?? null,
          });
        }
      } catch (error) {
        console.error(`Industry ranking skipped ${ticker}:`, error?.message || error);
      }
    }

    const leaders = results
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
      .slice(0, 5);

    return res.status(200).json({
      industry,
      leaders,
    });
  } catch (error) {
    console.error("Industry top route failed:", error);
    return res.status(500).json({
      error: error?.message || "Could not rank this industry.",
    });
  }
});


app.get("/api/analyze/:symbol", async (req, res) => {
  try {
    const symbol = String(req.params.symbol || "")
      .trim()
      .toUpperCase();

    if (!symbol) {
      return res.status(400).json({
        error: "Missing ticker symbol.",
      });
    }

    const cachedFullAnalysis = getCachedAnalysis(symbol);
    if (cachedFullAnalysis?.cache?.full === true) {
      return res.status(200).json({
        ...cachedFullAnalysis,
        cache: {
          ...(cachedFullAnalysis.cache || {}),
          hit: true,
          full: true,
          ttlHours: 2,
        },
      });
    }

    const analysis = await buildCachedStockAnalysis(symbol);
    const finnhubAbout = await fetchFinnhubAbout(symbol);

    if (finnhubAbout) {
      analysis.companyDescription = finnhubAbout;
      analysis.profile = {
        ...(analysis.profile || {}),
        description: finnhubAbout,
      };
    }

    const websiteAbout = await fetchCompanyWebsiteAbout(analysis.profile || {});

    if (websiteAbout) {
      analysis.websiteAbout = websiteAbout;
      analysis.companyDescription = websiteAbout;
      analysis.profile = {
        ...(analysis.profile || {}),
        description: websiteAbout,
      };
    }

    const finalAnalysis = {
      ...analysis,
      cache: {
        ...(analysis.cache || {}),
        hit: false,
        full: true,
        ttlHours: 2,
        savedAt: new Date().toISOString(),
      },
    };

    setCachedAnalysis(symbol, finalAnalysis);

    return res.status(200).json({
      ...finalAnalysis,
      cache: {
        ...(analysis.cache || {}),
        hit: false,
        full: true,
        ttlHours: 2,
        savedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Analyze route failed:", error);

    return res.status(500).json({
      error:
        error?.message ||
        "Could not analyze this ticker. Check API keys and backend logs.",
    });
  }
});

app.post("/api/assistant", async (req, res) => {
  try {
    const { question, current, watchlist } = req.body || {};
    const cleanQuestion = String(question || "").trim().slice(0, MAX_ASSISTANT_QUESTION_CHARS);

    if (!cleanQuestion) {
      return res.status(400).json({
        error: "Missing assistant question.",
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      const symbol = current?.symbol || "the selected stock";
      const score = current?.grades?.edgeScore ?? "N/A";
      const risk = current?.grades?.riskLabel || "N/A";

      return res.status(200).json({
        answer: shortAssistantAnswer(`${symbol}: Eval Score ${score}, risk ${risk}. AI key is not connected yet.`),
      });
    }

    const prompt = `
You are Eval AI Assistant Only answer questions about stocks already in the user's watchlist when watchlist context is provided. Use recent news context if available, explain how it may slightly impact the stock, and connect it back to the Eval Score. Keep the final answer under 100 characters and easy to understand., a simple stock-analysis helper.
Do not give licensed financial advice.
Use easy words. Answer in 150 characters or fewer.

User question:
${cleanQuestion}

Current stock data:
${JSON.stringify(current || {}, null, 2)}

Watchlist:
${JSON.stringify(watchlist || [], null, 2)}
`;

    const openAiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-nano",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful stock education assistant. Use easy words. Keep every answer to 150 characters or fewer. Do not claim to be a financial advisor.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.4,
          max_tokens: 80,
        }),
      }
    );

    const openAiJson = await openAiResponse.json();

    if (!openAiResponse.ok) {
      console.error("OpenAI error:", openAiJson);

      return res.status(200).json({
        answer: shortAssistantAnswer(
          "Stock data loaded, but the AI reply failed. Check your OPENAI_API_KEY on Render."
        ),
      });
    }

    return res.status(200).json({
      answer: shortAssistantAnswer(
        openAiJson?.choices?.[0]?.message?.content ||
          "I could not create a response."
      ),
    });
  } catch (error) {
    console.error("Assistant route failed:", error);

    return res.status(500).json({
      error: error?.message || "Assistant route failed.",
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found.",
    path: req.originalUrl,
    availableRoutes: ["/", "/api/health", "/api/analyze/AAPL", "/api/assistant"],
  });
});

app.listen(PORT, () => {
  console.log(`Eval server running on port ${PORT}`);
});
