<div align="center">

# ⚡ Eval — Stock Analytics Platform
### **Data & Analytics Engine | Full-Stack JavaScript Architecture**

<br/>

[![Eval Platform](https://img.shields.io/badge/EVAL_PLATFORM-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://getstockeval.com)
[![Node.js](https://img.shields.io/badge/NODE.JS-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/POSTGRESQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Render Backend](https://img.shields.io/badge/RENDER-46E3B7?style=for-the-badge&logo=render&logoColor=black)](https://render.com)

</div>

---

## 📌 Application Overview

**Eval** ([getstockeval.com](https://getstockeval.com)) is an all-in-one financial analytics platform featuring a **0–99 Stock Health Scoring Engine**, a **batch CSV portfolio analyzer**, and an **AI-powered assistant ("Ask Eval")** for instant, data-driven market insights. 

Powered by market data ingested from **Massive.com**, the platform utilizes an automated overnight caching pipeline—processing **1 stock per minute over a 10-hour window (600 stocks/night)**—to cache unchanged fundamental metrics and guarantee a minimum weekly refresh for all assets. By shifting raw API requests to an internal database layer, **Eval** bypasses vendor rate limits and eliminates per-user API costs, scaling system throughput seamlessly from **5 concurrent users to thousands of simultaneous sessions**.

> ⚠️ **Disclaimer:** *Eval is strictly an informational tool designed to give investors a quick data-driven snapshot based on financial statements and raw market metrics. It is not financial advice.*

---

## ⚙️ Key System Capabilities

* **0–99 Stock Health Score:** Evaluates 40 distinct financial indicators across 5 core categories (Profitability, Leverage, Liquidity, Operating Efficiency, and Market Momentum) to normalize complex 10-K disclosures into an intuitive metric.
* **Overnight Batching & Smart Delta Caching:** Ingests raw data from **Massive.com** on an automated cron schedule, preserving unchanged historical metrics while updating shifting valuation ratios to maximize database throughput.
* **"Ask Eval" Conversational AI:** Integrates OpenAI API models directly with cached SQL relational tables to deliver context-aware, on-demand financial analysis without LLM hallucinations.
* **CSV Portfolio Engine:** Ingests raw brokerage trade execution logs to calculate tax-lot accounting (realized/unrealized P&L) alongside an overall capital-weighted portfolio health score.
* **News Sentiment Weighting:** Ingests current news feeds per equity, evaluating tone across recent coverage to factor sentiment dynamics into market context.

---

## 🛠️ Stack & Codebase Architecture

| Architectural Layer | Core Technology | Source File | Responsibility & Execution |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | JavaScript (JSX), HTML5, CSS3 | `main.jsx` | Dynamic dashboard state, real-time ticker debouncing, search autocompletion. |
| **Styling & Layout** | CSS3 Modern Flex/Grid | `styles.css` | Custom theme styling, responsive layouts, score badge dynamic color mappings. |
| **API Gateway** | Node.js, Express | `server.js` | REST endpoint routing, request payloads, CORS management, and security headers. |
| **Backend Core** | Node.js Runtime | `index.js` | Microservice entry point, initialization sequence, and database connection pools. |
| **Real-Time Streaming** | WebSockets | `websock.js` | Full-duplex client socket streaming for continuous live metrics. |
| **Quantitative Engine** | JavaScript Algorithm | `score.js` | Algorithmic scoring logic converting raw fundamental inputs into normalized 0–99 ratings. |
| **Data & Caching Engine** | SQL (PostgreSQL Architecture) | Internal DB Layer | Manages relational storage schema for cached **Massive.com** data feeds and overnight batching queues. |
| **Environment Config** | Node Environment | `package.json`<br/>`.env` | Project dependency manifests, runtime execution scripts, and secret key configurations. |

---

## 🗄️ Caching Pipeline & Throughput Architecture

Connecting client requests directly to third-party data providers severely limits scaling due to strict API rate limits. **Eval** solves this bottleneck with an offline relational caching architecture:

```text
               [ MASSIVE.COM DATA API ]
                          │
                          ▼ (Automated 10-Hour Overnight Batch Ingestion Engine)
                          │ Pulls 1 stock / minute (600 stocks / night)
                          │
            ┌─────────────┴─────────────┐
            │  SQL DATABASE CACHE LAYER │
            └─────────────┬─────────────┘
                          │
                          ├─► Unchanged Metrics: Retained in SQL Cache
                          ├─► Delta Metrics: Overwritten & Refreshed
                          └─► Catalog Freshness: 100% Refreshed Min. 1x / Week
                          │
                          ▼ (Serves thousands of concurrent sessions instantly)
                   [ CLIENTS & UI ]
