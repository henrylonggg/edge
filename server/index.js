import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { buildStockAnalysis } from "./score.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

/*
  EMERGENCY CORS FIX:
  This allows your Vercel site, Render site, localhost, and preview links.
  Once everything works, you can lock it down later.
*/
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept", "Authorization"],
    credentials: false,
  })
);

app.options("*", cors());

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
    message: "Edge Render backend is running.",
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
    service: "edge-backend",
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

    /*
      This route will work even without OpenAI.
      If OPENAI_API_KEY exists, it uses AI.
      If not, it returns a basic fallback answer instead of breaking your app.
    */

    if (!process.env.OPENAI_API_KEY) {
      const symbol = current?.symbol || "the selected stock";
      const score = current?.grades?.edgeScore ?? "N/A";
      const risk = current?.grades?.riskLabel || "N/A";

      return res.status(200).json({
        answer: `For ${symbol}, the current Edge Score is ${score} and the risk label is ${risk}. Your question was: "${question}". The assistant AI key is not connected on the backend yet, but the stock analysis route is working.`,
      });
    }

    const prompt = `
You are Edge Assistant, a simple stock-analysis helper.
Do not give licensed financial advice.
Explain clearly and briefly.

User question:
${question}

Current stock data:
${JSON.stringify(current || {}, null, 2)}

Watchlist:
${JSON.stringify(watchlist || [], null, 2)}
`;

    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
    });

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
  console.log(`Edge server running on port ${PORT}`);
});
