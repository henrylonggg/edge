import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { buildStockAnalysis } from "./score.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;


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

    const analysis = await buildStockAnalysis(symbol);
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

    return res.status(200).json(analysis);
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

    if (!question || !String(question).trim()) {
      return res.status(400).json({
        error: "Missing assistant question.",
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      const symbol = current?.symbol || "the selected stock";
      const score = current?.grades?.edgeScore ?? "N/A";
      const risk = current?.grades?.riskLabel || "N/A";

      return res.status(200).json({
        answer: `For ${symbol}, the current Eval Score is ${score} and the risk label is ${risk}. Your question was: "${question}". The assistant AI key is not connected on the backend yet, but the stock analysis route is working.`,
      });
    }

    const prompt = `
You are Eval AI Assistant, a simple stock-analysis helper.
Do not give licensed financial advice.
Explain clearly and briefly.

User question:
${question}

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
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful stock education assistant. Keep answers simple, practical, and beginner friendly. Do not claim to be a financial advisor.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.4,
          max_tokens: 500,
        }),
      }
    );

    const openAiJson = await openAiResponse.json();

    if (!openAiResponse.ok) {
      console.error("OpenAI error:", openAiJson);

      return res.status(200).json({
        answer:
          "The stock data loaded, but the AI assistant could not respond right now. Check your OPENAI_API_KEY on Render.",
      });
    }

    return res.status(200).json({
      answer:
        openAiJson?.choices?.[0]?.message?.content ||
        "I could not create a response.",
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
