// Eval update: FMP 6000 stock ticker lookup route.
// Eval update: AI assistant expanded as support agent.
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { buildStockAnalysis } from "./score.js";

dotenv.config();

const EVAL_FAQ_KNOWLEDGE = "Eval FAQ knowledge base summary:\n- Eval is a stock-evaluation dashboard, not financial advice.\n- Users search tickers, use Ticker Lookup, save Watchlist stocks, compare 2-5 watchlist stocks, read industry rankings, and ask Eval AI support questions.\n- Ticker Lookup uses the CSV ticker list cached by the backend. It lets users type company names, see tickers on the right, and click a ticker to load the Analyze dashboard.\n- Eval Score is 0.0-10.0 and blends Growth, Profitability, Financial Health, Valuation, Momentum, Pullback, and News Sentiment.\n- Green/yellow/red indicate stronger/mixed/weaker score ranges. Score numbers are educational and not buy/sell/hold recommendations.\n- Metric cards are bar charts from 0-10. Popups/question marks explain category inputs and can be closed with the X button.\n- Price, Momentum, and Pullback use Massive and cache about 1 day.\n- Growth, Profitability, and Financial Health use light FMP/Finnhub fallback and cache about 4 months.\n- Valuation caches about 1 month.\n- Risk and News Sentiment cache about 7 days.\n- Finnhub is used for profile/news and fallback metrics. FMP is used lightly for fundamentals. Massive is used for market data. the uploaded CSV ticker list is used for ticker lookup. OpenAI summarizes/explains support and news.\n- If providers fail, Eval should use fallback providers, cached categories, or the last valid report instead of scoring missing metrics as zero.\n- Watchlist stores saved tickers and powers Compare and stock-specific Eval AI questions.\n- Compare requires 2-5 watchlist stocks and includes clickable radar labels to hide/show tickers.\n- Industry pages show Top 5 peers and use the same cached analysis for each stock. Industry radar labels are clickable.\n- Eval AI should answer all FAQ-style questions about app navigation, dashboard sections, dropdown menu, ticker lookup, score rings, metrics, caching, data sources, watchlist, compare, industry rankings, news sentiment, troubleshooting, profile/sign-in basics, terms/contact/support, and loaded/watchlist stocks.\n- Eval AI should not answer unrelated questions outside Eval. Stock-specific questions require the ticker to be loaded on dashboard or saved in watchlist.";

const app = express();
const PORT = process.env.PORT || 5050;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://getstockeval.com",
  "https://www.getstockeval.com",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Allow Vercel preview deployments.
      if (/^https:\/\/.*\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      return callback(null, true);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const DAY_MS = 24 * 60 * 60 * 1000;
const COMPONENT_TTLS_MS = {
  fundamentals: 120 * DAY_MS, // growth, profitability, financial health: about 4 months
  valuation: 30 * DAY_MS, // valuation: about 1 month
  market: 1 * DAY_MS, // price, momentum, pullback: 1 day
  news: 7 * DAY_MS, // news sentiment: 7 days
  risk: 7 * DAY_MS, // risk label: 7 days
  profile: 120 * DAY_MS,
};
const REPORT_CACHE_TTL_MS = Math.min(
  COMPONENT_TTLS_MS.fundamentals,
  COMPONENT_TTLS_MS.valuation,
  COMPONENT_TTLS_MS.market,
  COMPONENT_TTLS_MS.news,
  COMPONENT_TTLS_MS.risk
);
const analysisCache = new Map();
const lastValidAnalysisCache = new Map();
const industryCache = new Map();
const tickerLookupCache = { savedAt: 0, data: [] };
const TICKER_LOOKUP_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for CSV ticker list

const INDUSTRY_UNIVERSES = {
  Technology: ["AAPL", "MSFT", "ORCL", "CRM", "ADBE", "NOW", "INTU", "IBM", "SHOP", "SNOW", "DDOG", "PLTR"],
  Software: ["MSFT", "ORCL", "CRM", "ADBE", "NOW", "INTU", "SNOW", "DDOG", "PLTR", "TEAM", "MDB", "NET"],
  Semiconductors: ["NVDA", "AVGO", "AMD", "INTC", "QCOM", "TXN", "MU", "ADI", "MRVL", "NXPI", "MCHP", "ON", "LRCX", "KLAC", "AMAT"],
  "Consumer Electronics": ["AAPL", "SONY", "DELL", "HPQ", "LOGI", "GRMN"],
  "Internet Content & Information": ["GOOGL", "META", "NFLX", "SPOT", "PINS", "RDDT", "SNAP", "MTCH", "BIDU"],
  "Communication Services": ["TMUS", "VZ", "T", "CMCSA", "CHTR", "LUMN"],
  Entertainment: ["NFLX", "DIS", "WBD", "PARA", "LYV", "ROKU"],
  Retail: ["AMZN", "WMT", "COST", "HD", "LOW", "TGT", "TJX", "ROST", "BBY", "ULTA", "DG", "DLTR"],
  "Travel Services": ["BKNG", "EXPE", "ABNB", "TCOM", "TRIP", "MMYT"],
  Restaurants: ["MCD", "SBUX", "CMG", "YUM", "DRI", "QSR", "DPZ", "WING", "TXRH", "CAKE"],
  "Auto Manufacturers": ["TSLA", "GM", "F", "RIVN", "LCID", "TM", "HMC", "STLA"],
  Banks: ["JPM", "BAC", "WFC", "C", "GS", "MS", "USB", "PNC", "TFC", "COF"],
  "Financial Services": ["V", "MA", "AXP", "PYPL", "SQ", "BLK", "SCHW", "SPGI", "MCO", "ICE"],
  Insurance: ["BRK.B", "PGR", "CB", "AIG", "MET", "PRU", "AFL", "ALL", "TRV"],
  "Healthcare Plans": ["UNH", "ELV", "CI", "HUM", "CNC", "MOH"],
  "Drug Manufacturers": ["LLY", "JNJ", "MRK", "ABBV", "PFE", "BMY", "AMGN", "GILD", "VRTX", "REGN", "BIIB"],
  "Medical Devices": ["ISRG", "ABT", "SYK", "MDT", "BSX", "EW", "DXCM", "ZBH"],
  "Oil & Gas": ["XOM", "CVX", "COP", "EOG", "OXY", "DVN", "FANG", "MPC", "PSX", "VLO"],
  "Aerospace & Defense": ["RTX", "LMT", "NOC", "GD", "BA", "TDG", "HWM", "TXT", "LHX"],
  Utilities: ["NEE", "DUK", "SO", "AEP", "D", "EXC", "SRE", "XEL", "PEG", "ED"],
  "Real Estate": ["PLD", "AMT", "EQIX", "SPG", "O", "WELL", "DLR", "PSA", "CCI", "VICI", "AVB", "EQR"],
  Beverages: ["KO", "PEP", "MNST", "KDP", "CELH", "TAP"],
  "Packaged Foods": ["MDLZ", "GIS", "K", "CPB", "HSY", "SJM", "CAG"],
  "Household & Personal Products": ["PG", "CL", "KMB", "EL", "CHD", "CLX"],
};

const INDUSTRY_ALIASES = [
  ["Semiconductors", ["semiconductor", "semiconductors", "chip", "chips"]],
  ["Software", ["software", "application software", "infrastructure software", "saas"]],
  ["Consumer Electronics", ["consumer electronics", "computer hardware", "electronic components"]],
  ["Internet Content & Information", ["internet content", "internet information", "interactive media", "media"]],
  ["Communication Services", ["telecom", "telecommunication", "communication services", "wireless"]],
  ["Entertainment", ["entertainment", "streaming"]],
  ["Travel Services", ["travel", "lodging", "hotels", "booking", "resorts"]],
  ["Restaurants", ["restaurant", "restaurants", "coffee", "dining"]],
  ["Auto Manufacturers", ["auto manufacturers", "automobiles", "auto", "vehicles", "ev"]],
  ["Retail", ["retail", "discount stores", "home improvement retail", "apparel retail"]],
  ["Banks", ["bank", "banks", "banking", "regional banks"]],
  ["Financial Services", ["financial services", "credit services", "asset management", "capital markets", "payments"]],
  ["Insurance", ["insurance"]],
  ["Healthcare Plans", ["healthcare plans", "managed healthcare"]],
  ["Drug Manufacturers", ["drug manufacturer", "biotechnology", "pharmaceutical", "pharma"]],
  ["Medical Devices", ["medical devices", "medical instruments", "medical equipment"]],
  ["Oil & Gas", ["oil", "gas", "energy", "refining", "exploration"]],
  ["Aerospace & Defense", ["aerospace", "defense"]],
  ["Utilities", ["utility", "utilities", "regulated electric"]],
  ["Real Estate", ["real estate", "reit", "reits"]],
  ["Technology", ["technology", "information technology", "tech"]],
];

function cleanTicker(symbol) {
  return String(symbol || "").trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "");
}


const CSV_TICKER_LOOKUP = [{"symbol":"AA","name":"Alpha Analytics","source":"CSV ticker list"},{"symbol":"AAC","name":"Alpha Automation Corp","source":"CSV ticker list"},{"symbol":"AAG","name":"Aether Aerospace Group","source":"CSV ticker list"},{"symbol":"AAH","name":"Alpha Apparel Holdings","source":"CSV ticker list"},{"symbol":"AAI","name":"Apex Apparel Inc","source":"CSV ticker list"},{"symbol":"AAL","name":"Alpha Automotive Ltd","source":"CSV ticker list"},{"symbol":"AAPL","name":"Apple Inc.","source":"CSV ticker list"},{"symbol":"ABAC","name":"Cyber Global Software","source":"CSV ticker list"},{"symbol":"ABC","name":"Alpha Brands Corp","source":"CSV ticker list"},{"symbol":"ABG","name":"Aether Bio Group","source":"CSV ticker list"},{"symbol":"ABH","name":"Alpha Brands Holdings","source":"CSV ticker list"},{"symbol":"ABI","name":"Alpha Bank Inc","source":"CSV ticker list"},{"symbol":"ABL","name":"Aether Beverages Ltd","source":"CSV ticker list"},{"symbol":"ABNE","name":"Matrix Inc","source":"CSV ticker list"},{"symbol":"AC","name":"Aether Corp","source":"CSV ticker list"},{"symbol":"ACA","name":"Apex Core Analytics","source":"CSV ticker list"},{"symbol":"ACC","name":"Aether Chemicals Corp","source":"CSV ticker list"},{"symbol":"ACD","name":"Apex Core Digital","source":"CSV ticker list"},{"symbol":"ACG","name":"Aether CleanTech Group","source":"CSV ticker list"},{"symbol":"ACH","name":"Aether CleanTech Holdings","source":"CSV ticker list"},{"symbol":"ACI","name":"Apex Core Inc","source":"CSV ticker list"},{"symbol":"ACL","name":"Apex Chemicals Ltd","source":"CSV ticker list"},{"symbol":"ACN","name":"Accenture plc","source":"CSV ticker list"},{"symbol":"ACS","name":"Alpha Core Systems","source":"CSV ticker list"},{"symbol":"ACT","name":"Alpha Core Technologies","source":"CSV ticker list"},{"symbol":"AD","name":"Apex Digital","source":"CSV ticker list"},{"symbol":"ADBE","name":"Adobe Inc.","source":"CSV ticker list"},{"symbol":"ADG","name":"Alpha Distributors Group","source":"CSV ticker list"},{"symbol":"ADH","name":"Aether Distributors Holdings","source":"CSV ticker list"},{"symbol":"ADI","name":"Aether Development Inc","source":"CSV ticker list"},{"symbol":"ADTH","name":"Nova Automation Holdings","source":"CSV ticker list"},{"symbol":"AEC","name":"Apex Electric Corp","source":"CSV ticker list"},{"symbol":"AECM","name":"Cyber Global Digital","source":"CSV ticker list"},{"symbol":"AEG","name":"Alpha Electric Group","source":"CSV ticker list"},{"symbol":"AEH","name":"Aether Electric Holdings","source":"CSV ticker list"},{"symbol":"AEI","name":"Aether Entertainment Inc","source":"CSV ticker list"},{"symbol":"AEL","name":"Apex Electric Ltd","source":"CSV ticker list"},{"symbol":"AEOP","name":"Nova Properties Holdings","source":"CSV ticker list"},{"symbol":"AEQR","name":"Zephyr Steel Ltd","source":"CSV ticker list"},{"symbol":"AET","name":"Aether Distributors Inc","source":"CSV ticker list"},{"symbol":"AETH","name":"Aether Systems","source":"CSV ticker list"},{"symbol":"AETX","name":"Aether Quantum Digital","source":"CSV ticker list"},{"symbol":"AEZR","name":"Beta Core Inc","source":"CSV ticker list"},{"symbol":"AFC","name":"Aether Financial Corp","source":"CSV ticker list"},{"symbol":"AFFQ","name":"Beta Inc","source":"CSV ticker list"},{"symbol":"AFG","name":"Aether Financial Group","source":"CSV ticker list"},{"symbol":"AFH","name":"Apex Foods Holdings","source":"CSV ticker list"},{"symbol":"AFI","name":"Aether Foods Inc","source":"CSV ticker list"},{"symbol":"AFL","name":"Aether Financial Ltd","source":"CSV ticker list"},{"symbol":"AG","name":"Apex Global","source":"CSV ticker list"},{"symbol":"AGC","name":"Aether Gas Corp","source":"CSV ticker list"},{"symbol":"AGFW","name":"Cyber Quantum Solutions","source":"CSV ticker list"},{"symbol":"AGG","name":"Aether Gas Group","source":"CSV ticker list"},{"symbol":"AGH","name":"Apex Global Holdings","source":"CSV ticker list"},{"symbol":"AGI","name":"Apex Global Inc","source":"CSV ticker list"},{"symbol":"AGL","name":"Alpha Gold Ltd","source":"CSV ticker list"},{"symbol":"AGN","name":"Alpha Global Networks","source":"CSV ticker list"},{"symbol":"AGS","name":"Apex Global Software","source":"CSV ticker list"},{"symbol":"AGT","name":"Alpha Global Technologies","source":"CSV ticker list"},{"symbol":"AH","name":"Aether Holdings","source":"CSV ticker list"},{"symbol":"AHCL","name":"Synapse Automotive Inc","source":"CSV ticker list"},{"symbol":"AHG","name":"Aether Health Group","source":"CSV ticker list"},{"symbol":"AHZR","name":"Vertex Realty Group","source":"CSV ticker list"},{"symbol":"AI","name":"Alpha Intelligence","source":"CSV ticker list"},{"symbol":"AIBH","name":"Nexus Beverages Inc","source":"CSV ticker list"},{"symbol":"AIC","name":"Alpha Insurance Corp","source":"CSV ticker list"},{"symbol":"AIG","name":"Apex Industries Group","source":"CSV ticker list"},{"symbol":"AIH","name":"Apex Insurance Holdings","source":"CSV ticker list"},{"symbol":"AII","name":"Apex Infrastructure Inc","source":"CSV ticker list"},{"symbol":"AIL","name":"Aether Infrastructure Ltd","source":"CSV ticker list"},{"symbol":"AIST","name":"Horizon Global Labs","source":"CSV ticker list"},{"symbol":"AIYP","name":"Matrix Aerospace Group","source":"CSV ticker list"},{"symbol":"AKCS","name":"Nexus Realty Inc","source":"CSV ticker list"},{"symbol":"AL","name":"Apex Labs","source":"CSV ticker list"},{"symbol":"ALG","name":"Alpha Logistics Group","source":"CSV ticker list"},{"symbol":"ALH","name":"Alpha Lifesciences Holdings","source":"CSV ticker list"},{"symbol":"ALHC","name":"Catalyst Inc","source":"CSV ticker list"},{"symbol":"ALI","name":"Aether Logistics Inc","source":"CSV ticker list"},{"symbol":"ALL","name":"Apex Lifesciences Ltd","source":"CSV ticker list"},{"symbol":"ALP","name":"Alpha Labs","source":"CSV ticker list"},{"symbol":"ALPH","name":"Alpha Systems","source":"CSV ticker list"},{"symbol":"ALPX","name":"Alpha Financial Corp","source":"CSV ticker list"},{"symbol":"ALVD","name":"Stratus Analytics","source":"CSV ticker list"},{"symbol":"ALWG","name":"Vertex Next Inc","source":"CSV ticker list"},{"symbol":"AMC","name":"Alpha Medical Corp","source":"CSV ticker list"},{"symbol":"AMD","name":"Advanced Micro Devices Inc.","source":"CSV ticker list"},{"symbol":"AMG","name":"Aether Materials Group","source":"CSV ticker list"},{"symbol":"AMH","name":"Apex Medical Holdings","source":"CSV ticker list"},{"symbol":"AMI","name":"Alpha Mining Inc","source":"CSV ticker list"},{"symbol":"AML","name":"Aether Motors Ltd","source":"CSV ticker list"},{"symbol":"AMZN","name":"Amazon.com Inc.","source":"CSV ticker list"},{"symbol":"AN","name":"Apex Networks","source":"CSV ticker list"},{"symbol":"ANA","name":"Apex Next Analytics","source":"CSV ticker list"},{"symbol":"AND","name":"Aether Next Dynamics","source":"CSV ticker list"},{"symbol":"ANG","name":"Aether Next Global","source":"CSV ticker list"},{"symbol":"ANH","name":"Alpha Next Holdings","source":"CSV ticker list"},{"symbol":"ANI","name":"Aether Next Innovation","source":"CSV ticker list"},{"symbol":"ANN","name":"Apex Next Networks","source":"CSV ticker list"},{"symbol":"ANS","name":"Aether Next Systems","source":"CSV ticker list"},{"symbol":"ANT","name":"Aether Next Technologies","source":"CSV ticker list"},{"symbol":"APC","name":"Aether Power Corp","source":"CSV ticker list"},{"symbol":"APE","name":"Apex Solutions","source":"CSV ticker list"},{"symbol":"APEX","name":"Apex Core Innovation","source":"CSV ticker list"},{"symbol":"APG","name":"Alpha Pharma Group","source":"CSV ticker list"},{"symbol":"APH","name":"Apex Pharma Holdings","source":"CSV ticker list"},{"symbol":"API","name":"Aether Partners Inc","source":"CSV ticker list"},{"symbol":"APL","name":"Alpha Partners Ltd","source":"CSV ticker list"},{"symbol":"APNY","name":"Alpha Networks","source":"CSV ticker list"},{"symbol":"AQA","name":"Aether Quantum Analytics","source":"CSV ticker list"},{"symbol":"AQC","name":"Apex Quantum Corp","source":"CSV ticker list"},{"symbol":"AQD","name":"Apex Quantum Digital","source":"CSV ticker list"},{"symbol":"AQG","name":"Alpha Quantum Global","source":"CSV ticker list"},{"symbol":"AQH","name":"Aether Quantum Holdings","source":"CSV ticker list"},{"symbol":"AQI","name":"Alpha Quantum Innovation","source":"CSV ticker list"},{"symbol":"AQL","name":"Apex Quantum Labs","source":"CSV ticker list"},{"symbol":"AQN","name":"Apex Quantum Networks","source":"CSV ticker list"},{"symbol":"AQS","name":"Aether Quantum Solutions","source":"CSV ticker list"},{"symbol":"AQT","name":"Aether Quantum Technologies","source":"CSV ticker list"},{"symbol":"ARC","name":"Aether Resources Corp","source":"CSV ticker list"},{"symbol":"ARG","name":"Alpha Realty Group","source":"CSV ticker list"},{"symbol":"ARH","name":"Alpha Realty Holdings","source":"CSV ticker list"},{"symbol":"ARI","name":"Apex Resources Inc","source":"CSV ticker list"},{"symbol":"ARL","name":"Aether Realty Ltd","source":"CSV ticker list"},{"symbol":"ARLW","name":"Summit Bio Corp","source":"CSV ticker list"},{"symbol":"AS","name":"Aether Solutions","source":"CSV ticker list"},{"symbol":"ASC","name":"Aether Steel Corp","source":"CSV ticker list"},{"symbol":"ASG","name":"Apex Steel Group","source":"CSV ticker list"},{"symbol":"ASH","name":"Aether Solar Holdings","source":"CSV ticker list"},{"symbol":"ASI","name":"Apex Solar Inc","source":"CSV ticker list"},{"symbol":"ASL","name":"Alpha Solar Ltd","source":"CSV ticker list"},{"symbol":"AT","name":"Alpha Technologies","source":"CSV ticker list"},{"symbol":"ATC","name":"Aether Trust Corp","source":"CSV ticker list"},{"symbol":"ATG","name":"Alpha Trust Group","source":"CSV ticker list"},{"symbol":"ATH","name":"Aether Trust Holdings","source":"CSV ticker list"},{"symbol":"ATI","name":"Apex Therapeutics Inc","source":"CSV ticker list"},{"symbol":"ATL","name":"Aether Trust Ltd","source":"CSV ticker list"},{"symbol":"ATNW","name":"Matrix Petroleum Group","source":"CSV ticker list"},{"symbol":"AUG","name":"Aether Utilities Group","source":"CSV ticker list"},{"symbol":"AUI","name":"Apex Utilities Inc","source":"CSV ticker list"},{"symbol":"AUKW","name":"Synapse Global Software","source":"CSV ticker list"},{"symbol":"AUL","name":"Apex Utilities Ltd","source":"CSV ticker list"},{"symbol":"AUZQ","name":"Stratus Global Group","source":"CSV ticker list"},{"symbol":"AVGO","name":"Broadcom Inc.","source":"CSV ticker list"},{"symbol":"AWC","name":"Apex Wealth Corp","source":"CSV ticker list"},{"symbol":"AWG","name":"Apex Wealth Group","source":"CSV ticker list"},{"symbol":"AWHG","name":"Nova Realty Inc","source":"CSV ticker list"},{"symbol":"AZGW","name":"Synapse Products Group","source":"CSV ticker list"},{"symbol":"AZWE","name":"Alpha Inc","source":"CSV ticker list"},{"symbol":"BA","name":"Beta Analytics","source":"CSV ticker list"},{"symbol":"BAC","name":"Beta Asset Corp","source":"CSV ticker list"},{"symbol":"BAG","name":"Beta Automotive Group","source":"CSV ticker list"},{"symbol":"BAH","name":"Beta Automotive Holdings","source":"CSV ticker list"},{"symbol":"BAL","name":"Beta Asset Ltd","source":"CSV ticker list"},{"symbol":"BAQR","name":"Nova Analytics","source":"CSV ticker list"},{"symbol":"BBC","name":"Beta Beverages Corp","source":"CSV ticker list"},{"symbol":"BBG","name":"Beta Beverages Group","source":"CSV ticker list"},{"symbol":"BBI","name":"Beta Brands Inc","source":"CSV ticker list"},{"symbol":"BBL","name":"Beta Brands Ltd","source":"CSV ticker list"},{"symbol":"BBVT","name":"Stratus Quantum Group","source":"CSV ticker list"},{"symbol":"BC","name":"Beta Corp","source":"CSV ticker list"},{"symbol":"BCC","name":"Beta Chemicals Corp","source":"CSV ticker list"},{"symbol":"BCD","name":"Beta Core Dynamics","source":"CSV ticker list"},{"symbol":"BCG","name":"Beta Chemicals Group","source":"CSV ticker list"},{"symbol":"BCH","name":"Beta Capital Holdings","source":"CSV ticker list"},{"symbol":"BCI","name":"Beta Core Intelligence","source":"CSV ticker list"},{"symbol":"BCN","name":"Beta Core Networks","source":"CSV ticker list"},{"symbol":"BCS","name":"Beta Core Software","source":"CSV ticker list"},{"symbol":"BCT","name":"Beta Core Technologies","source":"CSV ticker list"},{"symbol":"BCXD","name":"Stratus Capital Group","source":"CSV ticker list"},{"symbol":"BD","name":"Beta Dynamics","source":"CSV ticker list"},{"symbol":"BDFA","name":"Apex Estate Group","source":"CSV ticker list"},{"symbol":"BDG","name":"Beta Development Group","source":"CSV ticker list"},{"symbol":"BDL","name":"Beta Distributors Ltd","source":"CSV ticker list"},{"symbol":"BEC","name":"Beta Electric Corp","source":"CSV ticker list"},{"symbol":"BEH","name":"Beta Entertainment Holdings","source":"CSV ticker list"},{"symbol":"BEI","name":"Beta Energy Inc","source":"CSV ticker list"},{"symbol":"BEIG","name":"Zephyr Gas Inc","source":"CSV ticker list"},{"symbol":"BET","name":"Beta Digital","source":"CSV ticker list"},{"symbol":"BETA","name":"Beta Software","source":"CSV ticker list"},{"symbol":"BETX","name":"Beta Solutions","source":"CSV ticker list"},{"symbol":"BFC","name":"Beta Financial Corp","source":"CSV ticker list"},{"symbol":"BFI","name":"Beta Foods Inc","source":"CSV ticker list"},{"symbol":"BFSE","name":"Vertex Next Solutions","source":"CSV ticker list"},{"symbol":"BFSY","name":"Aether Partners Corp","source":"CSV ticker list"},{"symbol":"BG","name":"Beta Group","source":"CSV ticker list"},{"symbol":"BGA","name":"Beta Global Analytics","source":"CSV ticker list"},{"symbol":"BGC","name":"Beta Gold Corp","source":"CSV ticker list"},{"symbol":"BGD","name":"Beta Global Dynamics","source":"CSV ticker list"},{"symbol":"BGG","name":"Beta Gold Group","source":"CSV ticker list"},{"symbol":"BGH","name":"Beta Gas Holdings","source":"CSV ticker list"},{"symbol":"BGI","name":"Beta Global Innovation","source":"CSV ticker list"},{"symbol":"BGL","name":"Beta Gold Ltd","source":"CSV ticker list"},{"symbol":"BGN","name":"Beta Global Networks","source":"CSV ticker list"},{"symbol":"BGT","name":"Beta Global Technologies","source":"CSV ticker list"},{"symbol":"BH","name":"Beta Holdings","source":"CSV ticker list"},{"symbol":"BHCJ","name":"Summit Networks","source":"CSV ticker list"},{"symbol":"BI","name":"Beta Innovation","source":"CSV ticker list"},{"symbol":"BIL","name":"Beta Infrastructure Ltd","source":"CSV ticker list"},{"symbol":"BKAU","name":"Stratus Automation Holdings","source":"CSV ticker list"},{"symbol":"BKEO","name":"Infinitum Rail Holdings","source":"CSV ticker list"},{"symbol":"BKFU","name":"Orion Estate Holdings","source":"CSV ticker list"},{"symbol":"BL","name":"Beta Labs","source":"CSV ticker list"},{"symbol":"BLAC","name":"Catalyst Properties Inc","source":"CSV ticker list"},{"symbol":"BLH","name":"Beta Logistics Holdings","source":"CSV ticker list"},{"symbol":"BLHF","name":"Cyber CleanTech Ltd","source":"CSV ticker list"},{"symbol":"BLI","name":"Beta Logistics Inc","source":"CSV ticker list"},{"symbol":"BMBP","name":"Zephyr Media Ltd","source":"CSV ticker list"},{"symbol":"BMG","name":"Beta Motors Group","source":"CSV ticker list"},{"symbol":"BMH","name":"Beta Mining Holdings","source":"CSV ticker list"},{"symbol":"BMI","name":"Beta Materials Inc","source":"CSV ticker list"},{"symbol":"BMXM","name":"Aether Quantum Inc","source":"CSV ticker list"},{"symbol":"BN","name":"Beta Networks","source":"CSV ticker list"},{"symbol":"BNC","name":"Beta Next Corp","source":"CSV ticker list"},{"symbol":"BNI","name":"Beta Next Intelligence","source":"CSV ticker list"},{"symbol":"BNL","name":"Beta Next Labs","source":"CSV ticker list"},{"symbol":"BNS","name":"Beta Next Solutions","source":"CSV ticker list"},{"symbol":"BPC","name":"Beta Properties Corp","source":"CSV ticker list"},{"symbol":"BPG","name":"Beta Petroleum Group","source":"CSV ticker list"},{"symbol":"BPI","name":"Beta Power Inc","source":"CSV ticker list"},{"symbol":"BPL","name":"Beta Properties Ltd","source":"CSV ticker list"},{"symbol":"BQA","name":"Beta Quantum Analytics","source":"CSV ticker list"},{"symbol":"BQC","name":"Beta Quantum Corp","source":"CSV ticker list"},{"symbol":"BQG","name":"Beta Quantum Group","source":"CSV ticker list"},{"symbol":"BQI","name":"Beta Quantum Inc","source":"CSV ticker list"},{"symbol":"BQS","name":"Beta Quantum Systems","source":"CSV ticker list"},{"symbol":"BRC","name":"Beta Realty Corp","source":"CSV ticker list"},{"symbol":"BRG","name":"Beta Renewables Group","source":"CSV ticker list"},{"symbol":"BRH","name":"Beta Rail Holdings","source":"CSV ticker list"},{"symbol":"BRI","name":"Beta Realty Inc","source":"CSV ticker list"},{"symbol":"BRK.A","name":"Berkshire Hathaway Inc.","source":"CSV ticker list"},{"symbol":"BRLS","name":"Catalyst Distributors Corp","source":"CSV ticker list"},{"symbol":"BROR","name":"Catalyst Apparel Inc","source":"CSV ticker list"},{"symbol":"BRWJ","name":"Vertex Energy Corp","source":"CSV ticker list"},{"symbol":"BS","name":"Beta Systems","source":"CSV ticker list"},{"symbol":"BSC","name":"Beta Solar Corp","source":"CSV ticker list"},{"symbol":"BSG","name":"Beta Solar Group","source":"CSV ticker list"},{"symbol":"BSI","name":"Beta Supermarkets Inc","source":"CSV ticker list"},{"symbol":"BSKU","name":"Synapse CleanTech Inc","source":"CSV ticker list"},{"symbol":"BSL","name":"Beta Supermarkets Ltd","source":"CSV ticker list"},{"symbol":"BT","name":"Beta Technologies","source":"CSV ticker list"},{"symbol":"BTC","name":"Beta Trust Corp","source":"CSV ticker list"},{"symbol":"BTI","name":"Beta Trust Inc","source":"CSV ticker list"},{"symbol":"BTL","name":"Beta Trust Ltd","source":"CSV ticker list"},{"symbol":"BUL","name":"Beta Utilities Ltd","source":"CSV ticker list"},{"symbol":"BVQI","name":"Synapse Global Corp","source":"CSV ticker list"},{"symbol":"BWC","name":"Beta Water Corp","source":"CSV ticker list"},{"symbol":"BWI","name":"Beta Water Inc","source":"CSV ticker list"},{"symbol":"BWKJ","name":"Nexus Mining Ltd","source":"CSV ticker list"},{"symbol":"BWL","name":"Beta Water Ltd","source":"CSV ticker list"},{"symbol":"BXLZ","name":"Vertex Analytics","source":"CSV ticker list"},{"symbol":"BZNT","name":"Alpha Rail Holdings","source":"CSV ticker list"},{"symbol":"BZPT","name":"Infinitum Bio Group","source":"CSV ticker list"},{"symbol":"BZYP","name":"Matrix Global Labs","source":"CSV ticker list"},{"symbol":"CA","name":"Catalyst Analytics","source":"CSV ticker list"},{"symbol":"CAAU","name":"Matrix Core Digital","source":"CSV ticker list"},{"symbol":"CAC","name":"Cyber Apparel Corp","source":"CSV ticker list"},{"symbol":"CAG","name":"Catalyst Asset Group","source":"CSV ticker list"},{"symbol":"CAH","name":"Cyber Aerospace Holdings","source":"CSV ticker list"},{"symbol":"CAI","name":"Catalyst Automation Inc","source":"CSV ticker list"},{"symbol":"CAL","name":"Cyber Asset Ltd","source":"CSV ticker list"},{"symbol":"CAT","name":"Catalyst Systems","source":"CSV ticker list"},{"symbol":"CATA","name":"Catalyst Corp","source":"CSV ticker list"},{"symbol":"CATX","name":"Catalyst Core Solutions","source":"CSV ticker list"},{"symbol":"CBC","name":"Catalyst Brands Corp","source":"CSV ticker list"},{"symbol":"CBG","name":"Catalyst Bio Group","source":"CSV ticker list"},{"symbol":"CBI","name":"Cyber Bio Inc","source":"CSV ticker list"},{"symbol":"CBL","name":"Catalyst Bio Ltd","source":"CSV ticker list"},{"symbol":"CC","name":"Cyber Corp","source":"CSV ticker list"},{"symbol":"CCAA","name":"Cyber Core Dynamics","source":"CSV ticker list"},{"symbol":"CCC","name":"Cyber Capital Corp","source":"CSV ticker list"},{"symbol":"CCD","name":"Catalyst Core Dynamics","source":"CSV ticker list"},{"symbol":"CCG","name":"Catalyst Capital Group","source":"CSV ticker list"},{"symbol":"CCH","name":"Catalyst CleanTech Holdings","source":"CSV ticker list"},{"symbol":"CCI","name":"Catalyst Care Inc","source":"CSV ticker list"},{"symbol":"CCL","name":"Cyber Core Labs","source":"CSV ticker list"},{"symbol":"CCOM","name":"Summit Technologies","source":"CSV ticker list"},{"symbol":"CCS","name":"Cyber Core Solutions","source":"CSV ticker list"},{"symbol":"CCZE","name":"Catalyst Dynamics","source":"CSV ticker list"},{"symbol":"CD","name":"Cyber Dynamics","source":"CSV ticker list"},{"symbol":"CDC","name":"Cyber Development Corp","source":"CSV ticker list"},{"symbol":"CDH","name":"Catalyst Development Holdings","source":"CSV ticker list"},{"symbol":"CDI","name":"Cyber Development Inc","source":"CSV ticker list"},{"symbol":"CDL","name":"Cyber Development Ltd","source":"CSV ticker list"},{"symbol":"CEC","name":"Catalyst Estate Corp","source":"CSV ticker list"},{"symbol":"CEG","name":"Catalyst Electric Group","source":"CSV ticker list"},{"symbol":"CEH","name":"Cyber Entertainment Holdings","source":"CSV ticker list"},{"symbol":"CEI","name":"Catalyst Estate Inc","source":"CSV ticker list"},{"symbol":"CEL","name":"Catalyst Electric Ltd","source":"CSV ticker list"},{"symbol":"CEUO","name":"Matrix Systems","source":"CSV ticker list"},{"symbol":"CFC","name":"Cyber Financial Corp","source":"CSV ticker list"},{"symbol":"CFG","name":"Catalyst Foods Group","source":"CSV ticker list"},{"symbol":"CFH","name":"Cyber Foods Holdings","source":"CSV ticker list"},{"symbol":"CFL","name":"Cyber Foods Ltd","source":"CSV ticker list"},{"symbol":"CFPN","name":"Orion Group","source":"CSV ticker list"},{"symbol":"CG","name":"Catalyst Global","source":"CSV ticker list"},{"symbol":"CGA","name":"Catalyst Global Analytics","source":"CSV ticker list"},{"symbol":"CGC","name":"Cyber Global Corp","source":"CSV ticker list"},{"symbol":"CGD","name":"Catalyst Global Dynamics","source":"CSV ticker list"},{"symbol":"CGG","name":"Cyber Global Global","source":"CSV ticker list"},{"symbol":"CGH","name":"Catalyst Global Holdings","source":"CSV ticker list"},{"symbol":"CGI","name":"Catalyst Global Intelligence","source":"CSV ticker list"},{"symbol":"CGL","name":"Catalyst Gas Ltd","source":"CSV ticker list"},{"symbol":"CGS","name":"Catalyst Global Software","source":"CSV ticker list"},{"symbol":"CGWD","name":"Nexus Partners Ltd","source":"CSV ticker list"},{"symbol":"CGWP","name":"Cyber Digital","source":"CSV ticker list"},{"symbol":"CH","name":"Cyber Holdings","source":"CSV ticker list"},{"symbol":"CHC","name":"Cyber Health Corp","source":"CSV ticker list"},{"symbol":"CHCV","name":"Vertex Products Holdings","source":"CSV ticker list"},{"symbol":"CHDK","name":"Alpha Chemicals Inc","source":"CSV ticker list"},{"symbol":"CHH","name":"Cyber Health Holdings","source":"CSV ticker list"},{"symbol":"CI","name":"Catalyst Innovation","source":"CSV ticker list"},{"symbol":"CIC","name":"Catalyst Infrastructure Corp","source":"CSV ticker list"},{"symbol":"CIG","name":"Cyber Insurance Group","source":"CSV ticker list"},{"symbol":"CIH","name":"Cyber Insurance Holdings","source":"CSV ticker list"},{"symbol":"CIL","name":"Catalyst Industries Ltd","source":"CSV ticker list"},{"symbol":"CJEW","name":"Vanguard Products Ltd","source":"CSV ticker list"},{"symbol":"CJUI","name":"Stratus Labs","source":"CSV ticker list"},{"symbol":"CKZI","name":"Aether Industries Inc","source":"CSV ticker list"},{"symbol":"CL","name":"Catalyst Labs","source":"CSV ticker list"},{"symbol":"CLAV","name":"Catalyst Global Corp","source":"CSV ticker list"},{"symbol":"CLG","name":"Cyber Lifesciences Group","source":"CSV ticker list"},{"symbol":"CLL","name":"Cyber Logistics Ltd","source":"CSV ticker list"},{"symbol":"CLVE","name":"Infinitum Care Holdings","source":"CSV ticker list"},{"symbol":"CMC","name":"Cyber Media Corp","source":"CSV ticker list"},{"symbol":"CMG","name":"Catalyst Medical Group","source":"CSV ticker list"},{"symbol":"CMH","name":"Cyber Materials Holdings","source":"CSV ticker list"},{"symbol":"CMI","name":"Catalyst Materials Inc","source":"CSV ticker list"},{"symbol":"CML","name":"Catalyst Materials Ltd","source":"CSV ticker list"},{"symbol":"CMXD","name":"Alpha Renewables Group","source":"CSV ticker list"},{"symbol":"CN","name":"Cyber Networks","source":"CSV ticker list"},{"symbol":"CNG","name":"Catalyst Next Global","source":"CSV ticker list"},{"symbol":"CNH","name":"Catalyst Next Holdings","source":"CSV ticker list"},{"symbol":"CNI","name":"Catalyst Next Intelligence","source":"CSV ticker list"},{"symbol":"CNN","name":"Cyber Next Networks","source":"CSV ticker list"},{"symbol":"CNQS","name":"Alpha Dynamics","source":"CSV ticker list"},{"symbol":"CNS","name":"Catalyst Next Systems","source":"CSV ticker list"},{"symbol":"CNT","name":"Catalyst Next Technologies","source":"CSV ticker list"},{"symbol":"COAR","name":"Prism Realty Inc","source":"CSV ticker list"},{"symbol":"CONE","name":"Summit Wealth Inc","source":"CSV ticker list"},{"symbol":"COST","name":"Costco Wholesale Corp.","source":"CSV ticker list"},{"symbol":"COTU","name":"Orion Entertainment Corp","source":"CSV ticker list"},{"symbol":"CPC","name":"Cyber Pharma Corp","source":"CSV ticker list"},{"symbol":"CPG","name":"Cyber Petroleum Group","source":"CSV ticker list"},{"symbol":"CPH","name":"Cyber Pharma Holdings","source":"CSV ticker list"},{"symbol":"CPI","name":"Cyber Properties Inc","source":"CSV ticker list"},{"symbol":"CPL","name":"Cyber Partners Ltd","source":"CSV ticker list"},{"symbol":"CPVA","name":"Matrix Motors Holdings","source":"CSV ticker list"},{"symbol":"CQD","name":"Catalyst Quantum Digital","source":"CSV ticker list"},{"symbol":"CQHR","name":"Vertex Motors Inc","source":"CSV ticker list"},{"symbol":"CQI","name":"Catalyst Quantum Innovation","source":"CSV ticker list"},{"symbol":"CQL","name":"Catalyst Quantum Labs","source":"CSV ticker list"},{"symbol":"CQN","name":"Catalyst Quantum Networks","source":"CSV ticker list"},{"symbol":"CQS","name":"Catalyst Quantum Software","source":"CSV ticker list"},{"symbol":"CQT","name":"Cyber Quantum Technologies","source":"CSV ticker list"},{"symbol":"CRC","name":"Cyber Rail Corp","source":"CSV ticker list"},{"symbol":"CRG","name":"Catalyst Rail Group","source":"CSV ticker list"},{"symbol":"CRI","name":"Catalyst Realty Inc","source":"CSV ticker list"},{"symbol":"CRL","name":"Catalyst Realty Ltd","source":"CSV ticker list"},{"symbol":"CRM","name":"Salesforce Inc.","source":"CSV ticker list"},{"symbol":"CROG","name":"Synapse Asset Group","source":"CSV ticker list"},{"symbol":"CS","name":"Cyber Software","source":"CSV ticker list"},{"symbol":"CSCO","name":"Cisco Systems Inc.","source":"CSV ticker list"},{"symbol":"CSG","name":"Cyber Supermarkets Group","source":"CSV ticker list"},{"symbol":"CSH","name":"Catalyst Solar Holdings","source":"CSV ticker list"},{"symbol":"CSI","name":"Catalyst Steel Inc","source":"CSV ticker list"},{"symbol":"CSLM","name":"Apex Rail Corp","source":"CSV ticker list"},{"symbol":"CSPY","name":"Horizon Automotive Inc","source":"CSV ticker list"},{"symbol":"CSYE","name":"Cyber Next Solutions","source":"CSV ticker list"},{"symbol":"CT","name":"Catalyst Technologies","source":"CSV ticker list"},{"symbol":"CTC","name":"Cyber Trust Corp","source":"CSV ticker list"},{"symbol":"CTFD","name":"Infinitum Energy Group","source":"CSV ticker list"},{"symbol":"CTG","name":"Cyber Trust Group","source":"CSV ticker list"},{"symbol":"CTH","name":"Catalyst Trust Holdings","source":"CSV ticker list"},{"symbol":"CTI","name":"Cyber Trust Inc","source":"CSV ticker list"},{"symbol":"CUH","name":"Cyber Utilities Holdings","source":"CSV ticker list"},{"symbol":"CUNB","name":"Stratus Realty Inc","source":"CSV ticker list"},{"symbol":"CUNQ","name":"Synapse Digital","source":"CSV ticker list"},{"symbol":"CVLE","name":"Synapse Global","source":"CSV ticker list"},{"symbol":"CVWT","name":"Zephyr Energy Ltd","source":"CSV ticker list"},{"symbol":"CVX","name":"Chevron Corporation","source":"CSV ticker list"},{"symbol":"CWG","name":"Catalyst Water Group","source":"CSV ticker list"},{"symbol":"CXCM","name":"Matrix Infrastructure Ltd","source":"CSV ticker list"},{"symbol":"CXFI","name":"Zephyr Global Global","source":"CSV ticker list"},{"symbol":"CXZS","name":"Zephyr Core Innovation","source":"CSV ticker list"},{"symbol":"CYB","name":"Cyber Systems","source":"CSV ticker list"},{"symbol":"CYBE","name":"Cyber Global","source":"CSV ticker list"},{"symbol":"CYBX","name":"Cyber Logistics Group","source":"CSV ticker list"},{"symbol":"CYSP","name":"Cyber Solutions","source":"CSV ticker list"},{"symbol":"CZGC","name":"Nova Bank Holdings","source":"CSV ticker list"},{"symbol":"CZKE","name":"Vertex Quantum Analytics","source":"CSV ticker list"},{"symbol":"CZOH","name":"Synapse Intelligence","source":"CSV ticker list"},{"symbol":"CZQA","name":"Horizon Entertainment Group","source":"CSV ticker list"},{"symbol":"DAMJ","name":"Nova Software","source":"CSV ticker list"},{"symbol":"DBGP","name":"Vanguard Core Inc","source":"CSV ticker list"},{"symbol":"DBVF","name":"Catalyst Products Ltd","source":"CSV ticker list"},{"symbol":"DCNT","name":"Alpha Global Intelligence","source":"CSV ticker list"},{"symbol":"DCRU","name":"Summit Dynamics","source":"CSV ticker list"},{"symbol":"DDKZ","name":"Apex Water Corp","source":"CSV ticker list"},{"symbol":"DDQX","name":"Apex Core Holdings","source":"CSV ticker list"},{"symbol":"DDXF","name":"Orion Energy Ltd","source":"CSV ticker list"},{"symbol":"DEDW","name":"Nova Materials Inc","source":"CSV ticker list"},{"symbol":"DEOR","name":"Synapse Core Innovation","source":"CSV ticker list"},{"symbol":"DFMT","name":"Apex Estate Ltd","source":"CSV ticker list"},{"symbol":"DFQG","name":"Prism Digital","source":"CSV ticker list"},{"symbol":"DGBG","name":"Vanguard Realty Holdings","source":"CSV ticker list"},{"symbol":"DHSU","name":"Catalyst Mining Ltd","source":"CSV ticker list"},{"symbol":"DHZO","name":"Cyber Quantum Inc","source":"CSV ticker list"},{"symbol":"DIJT","name":"Vertex Software","source":"CSV ticker list"},{"symbol":"DITS","name":"Stratus Beverages Corp","source":"CSV ticker list"},{"symbol":"DIYP","name":"Infinitum Materials Corp","source":"CSV ticker list"},{"symbol":"DIYZ","name":"Prism Core Labs","source":"CSV ticker list"},{"symbol":"DJKZ","name":"Stratus Medical Ltd","source":"CSV ticker list"},{"symbol":"DJZJ","name":"Stratus Health Corp","source":"CSV ticker list"},{"symbol":"DKIT","name":"Summit Care Corp","source":"CSV ticker list"},{"symbol":"DKTK","name":"Horizon Steel Corp","source":"CSV ticker list"},{"symbol":"DLCJ","name":"Summit Development Inc","source":"CSV ticker list"},{"symbol":"DNYG","name":"Cyber Core Systems","source":"CSV ticker list"},{"symbol":"DOIF","name":"Infinitum Media Inc","source":"CSV ticker list"},{"symbol":"DPXN","name":"Orion Brands Inc","source":"CSV ticker list"},{"symbol":"DQZB","name":"Vertex Insurance Inc","source":"CSV ticker list"},{"symbol":"DRHV","name":"Catalyst Digital","source":"CSV ticker list"},{"symbol":"DSEW","name":"Stratus Infrastructure Group","source":"CSV ticker list"},{"symbol":"DSHA","name":"Nova Utilities Corp","source":"CSV ticker list"},{"symbol":"DTGZ","name":"Vanguard Manufacturing Group","source":"CSV ticker list"},{"symbol":"DVFA","name":"Alpha Medical Group","source":"CSV ticker list"},{"symbol":"DWSV","name":"Nexus Power Ltd","source":"CSV ticker list"},{"symbol":"DXGY","name":"Prism Group","source":"CSV ticker list"},{"symbol":"DXUP","name":"Alpha Holdings","source":"CSV ticker list"},{"symbol":"DYAV","name":"Aether Networks","source":"CSV ticker list"},{"symbol":"EASR","name":"Vanguard Corp","source":"CSV ticker list"},{"symbol":"ECYO","name":"Orion Software","source":"CSV ticker list"},{"symbol":"EDRO","name":"Aether Group","source":"CSV ticker list"},{"symbol":"EDWV","name":"Nova Pharma Group","source":"CSV ticker list"},{"symbol":"EDZJ","name":"Beta Pharma Group","source":"CSV ticker list"},{"symbol":"EEUJ","name":"Zephyr Entertainment Group","source":"CSV ticker list"},{"symbol":"EFAR","name":"Stratus Care Inc","source":"CSV ticker list"},{"symbol":"EFHD","name":"Nova Realty Corp","source":"CSV ticker list"},{"symbol":"EGSJ","name":"Vanguard Automation Group","source":"CSV ticker list"},{"symbol":"EHEW","name":"Catalyst Estate Ltd","source":"CSV ticker list"},{"symbol":"EHLZ","name":"Nexus Rail Group","source":"CSV ticker list"},{"symbol":"EJHH","name":"Catalyst Networks","source":"CSV ticker list"},{"symbol":"EKHI","name":"Zephyr Next Inc","source":"CSV ticker list"},{"symbol":"EKIE","name":"Stratus Software","source":"CSV ticker list"},{"symbol":"EKKR","name":"Cyber Labs","source":"CSV ticker list"},{"symbol":"EKPG","name":"Nova Chemicals Group","source":"CSV ticker list"},{"symbol":"ELBH","name":"Summit Energy Group","source":"CSV ticker list"},{"symbol":"ELSK","name":"Nova Quantum Group","source":"CSV ticker list"},{"symbol":"EMKN","name":"Apex Software","source":"CSV ticker list"},{"symbol":"ENPA","name":"Orion Therapeutics Ltd","source":"CSV ticker list"},{"symbol":"EOXR","name":"Vertex Next Global","source":"CSV ticker list"},{"symbol":"EQFC","name":"Summit Distributors Corp","source":"CSV ticker list"},{"symbol":"EQKQ","name":"Cyber Bank Ltd","source":"CSV ticker list"},{"symbol":"ERAH","name":"Nexus Apparel Group","source":"CSV ticker list"},{"symbol":"ERNH","name":"Quantum Energy Group","source":"CSV ticker list"},{"symbol":"ERZV","name":"Aether Motors Group","source":"CSV ticker list"},{"symbol":"ESEQ","name":"Apex Materials Inc","source":"CSV ticker list"},{"symbol":"ESMI","name":"Vertex Development Inc","source":"CSV ticker list"},{"symbol":"ESYP","name":"Matrix Software","source":"CSV ticker list"},{"symbol":"EVOR","name":"Cyber Therapeutics Corp","source":"CSV ticker list"},{"symbol":"EVZQ","name":"Aether Medical Ltd","source":"CSV ticker list"},{"symbol":"EWJH","name":"Beta Care Holdings","source":"CSV ticker list"},{"symbol":"EWKA","name":"Orion Quantum Dynamics","source":"CSV ticker list"},{"symbol":"EWYY","name":"Apex Pharma Inc","source":"CSV ticker list"},{"symbol":"EXGM","name":"Synapse CleanTech Ltd","source":"CSV ticker list"},{"symbol":"EXJX","name":"Summit Steel Corp","source":"CSV ticker list"},{"symbol":"EXMU","name":"Stratus Beverages Holdings","source":"CSV ticker list"},{"symbol":"EXQA","name":"Nexus Development Group","source":"CSV ticker list"},{"symbol":"EXQI","name":"Prism Infrastructure Holdings","source":"CSV ticker list"},{"symbol":"EXZY","name":"Nova Quantum Networks","source":"CSV ticker list"},{"symbol":"EYJU","name":"Stratus Next Group","source":"CSV ticker list"},{"symbol":"EYOO","name":"Nexus Properties Holdings","source":"CSV ticker list"},{"symbol":"EYRU","name":"Horizon Financial Holdings","source":"CSV ticker list"},{"symbol":"EZGH","name":"Summit Automation Group","source":"CSV ticker list"},{"symbol":"FAAV","name":"Vanguard Rail Holdings","source":"CSV ticker list"},{"symbol":"FAGF","name":"Catalyst Motors Group","source":"CSV ticker list"},{"symbol":"FAMH","name":"Apex Medical Inc","source":"CSV ticker list"},{"symbol":"FAMI","name":"Vanguard Core Analytics","source":"CSV ticker list"},{"symbol":"FATK","name":"Stratus Inc","source":"CSV ticker list"},{"symbol":"FAXE","name":"Infinitum Pharma Corp","source":"CSV ticker list"},{"symbol":"FAYP","name":"Vertex Retail Group","source":"CSV ticker list"},{"symbol":"FBYH","name":"Aether Petroleum Ltd","source":"CSV ticker list"},{"symbol":"FERY","name":"Catalyst Group","source":"CSV ticker list"},{"symbol":"FEVP","name":"Aether Asset Inc","source":"CSV ticker list"},{"symbol":"FEXS","name":"Aether Core Solutions","source":"CSV ticker list"},{"symbol":"FFQA","name":"Summit Intelligence","source":"CSV ticker list"},{"symbol":"FGRZ","name":"Prism Motors Group","source":"CSV ticker list"},{"symbol":"FHSF","name":"Prism Resources Ltd","source":"CSV ticker list"},{"symbol":"FIMN","name":"Nexus Global Intelligence","source":"CSV ticker list"},{"symbol":"FKLI","name":"Quantum Electric Group","source":"CSV ticker list"},{"symbol":"FKLT","name":"Summit Power Inc","source":"CSV ticker list"},{"symbol":"FKWO","name":"Cyber Power Group","source":"CSV ticker list"},{"symbol":"FLAM","name":"Stratus Corp","source":"CSV ticker list"},{"symbol":"FLCO","name":"Infinitum Energy Corp","source":"CSV ticker list"},{"symbol":"FLEJ","name":"Horizon Development Inc","source":"CSV ticker list"},{"symbol":"FLGZ","name":"Summit Estate Group","source":"CSV ticker list"},{"symbol":"FLJJ","name":"Horizon Software","source":"CSV ticker list"},{"symbol":"FLPM","name":"Zephyr Entertainment Holdings","source":"CSV ticker list"},{"symbol":"FLVR","name":"Summit Therapeutics Group","source":"CSV ticker list"},{"symbol":"FNIK","name":"Vertex Gold Group","source":"CSV ticker list"},{"symbol":"FNXG","name":"Stratus Realty Holdings","source":"CSV ticker list"},{"symbol":"FPIF","name":"Prism Software","source":"CSV ticker list"},{"symbol":"FPII","name":"Synapse Group","source":"CSV ticker list"},{"symbol":"FSAX","name":"Cyber Analytics","source":"CSV ticker list"},{"symbol":"FSHG","name":"Nova Brands Corp","source":"CSV ticker list"},{"symbol":"FSKQ","name":"Alpha Core Holdings","source":"CSV ticker list"},{"symbol":"FSVS","name":"Summit Motors Group","source":"CSV ticker list"},{"symbol":"FUUA","name":"Cyber Global Labs","source":"CSV ticker list"},{"symbol":"FWZJ","name":"Alpha Care Ltd","source":"CSV ticker list"},{"symbol":"GAQB","name":"Aether Properties Holdings","source":"CSV ticker list"},{"symbol":"GBEJ","name":"Nova Manufacturing Inc","source":"CSV ticker list"},{"symbol":"GBMM","name":"Beta Care Corp","source":"CSV ticker list"},{"symbol":"GBTE","name":"Vertex Care Corp","source":"CSV ticker list"},{"symbol":"GCTH","name":"Horizon Next Digital","source":"CSV ticker list"},{"symbol":"GFTR","name":"Nexus Inc","source":"CSV ticker list"},{"symbol":"GGBZ","name":"Cyber Capital Group","source":"CSV ticker list"},{"symbol":"GHNR","name":"Horizon Mining Ltd","source":"CSV ticker list"},{"symbol":"GIHM","name":"Summit Labs","source":"CSV ticker list"},{"symbol":"GIRC","name":"Quantum Intelligence","source":"CSV ticker list"},{"symbol":"GJNY","name":"Catalyst Entertainment Ltd","source":"CSV ticker list"},{"symbol":"GLRO","name":"Synapse Innovation","source":"CSV ticker list"},{"symbol":"GLWB","name":"Stratus Global Inc","source":"CSV ticker list"},{"symbol":"GMQD","name":"Apex Corp","source":"CSV ticker list"},{"symbol":"GMRY","name":"Horizon Innovation","source":"CSV ticker list"},{"symbol":"GMTU","name":"Beta Intelligence","source":"CSV ticker list"},{"symbol":"GNBY","name":"Alpha Chemicals Corp","source":"CSV ticker list"},{"symbol":"GNYU","name":"Synapse Brands Inc","source":"CSV ticker list"},{"symbol":"GOOGL","name":"Alphabet Inc.","source":"CSV ticker list"},{"symbol":"GPTE","name":"Synapse Core Holdings","source":"CSV ticker list"},{"symbol":"GQAQ","name":"Cyber Gas Corp","source":"CSV ticker list"},{"symbol":"GQBX","name":"Summit Inc","source":"CSV ticker list"},{"symbol":"GSQR","name":"Nexus Quantum Intelligence","source":"CSV ticker list"},{"symbol":"GUIN","name":"Horizon Apparel Inc","source":"CSV ticker list"},{"symbol":"GUPQ","name":"Nova Quantum Software","source":"CSV ticker list"},{"symbol":"GVLJ","name":"Aether Renewables Ltd","source":"CSV ticker list"},{"symbol":"GWBC","name":"Synapse Next Intelligence","source":"CSV ticker list"},{"symbol":"GWPA","name":"Vanguard Entertainment Inc","source":"CSV ticker list"},{"symbol":"GXIF","name":"Summit Core Intelligence","source":"CSV ticker list"},{"symbol":"GZTW","name":"Stratus Motors Group","source":"CSV ticker list"},{"symbol":"HA","name":"Horizon Analytics","source":"CSV ticker list"},{"symbol":"HAC","name":"Horizon Asset Corp","source":"CSV ticker list"},{"symbol":"HAH","name":"Horizon Automation Holdings","source":"CSV ticker list"},{"symbol":"HAI","name":"Horizon Asset Inc","source":"CSV ticker list"},{"symbol":"HAL","name":"Horizon Automotive Ltd","source":"CSV ticker list"},{"symbol":"HAQR","name":"Cyber Mining Inc","source":"CSV ticker list"},{"symbol":"HAYG","name":"Stratus Engineering Corp","source":"CSV ticker list"},{"symbol":"HBC","name":"Horizon Bio Corp","source":"CSV ticker list"},{"symbol":"HBG","name":"Horizon Beverages Group","source":"CSV ticker list"},{"symbol":"HBH","name":"Horizon Bank Holdings","source":"CSV ticker list"},{"symbol":"HBI","name":"Horizon Beverages Inc","source":"CSV ticker list"},{"symbol":"HBIM","name":"Synapse Motors Group","source":"CSV ticker list"},{"symbol":"HBL","name":"Horizon Bio Ltd","source":"CSV ticker list"},{"symbol":"HC","name":"Horizon Corp","source":"CSV ticker list"},{"symbol":"HCC","name":"Horizon Core Corp","source":"CSV ticker list"},{"symbol":"HCD","name":"Horizon Core Dynamics","source":"CSV ticker list"},{"symbol":"HCG","name":"Horizon Chemicals Group","source":"CSV ticker list"},{"symbol":"HCH","name":"Horizon Core Holdings","source":"CSV ticker list"},{"symbol":"HCI","name":"Horizon Core Inc","source":"CSV ticker list"},{"symbol":"HCL","name":"Horizon Capital Ltd","source":"CSV ticker list"},{"symbol":"HCS","name":"Horizon Core Solutions","source":"CSV ticker list"},{"symbol":"HCZF","name":"Apex Brands Inc","source":"CSV ticker list"},{"symbol":"HD","name":"Home Depot Inc.","source":"CSV ticker list"},{"symbol":"HDI","name":"Horizon Distributors Inc","source":"CSV ticker list"},{"symbol":"HEC","name":"Horizon Engineering Corp","source":"CSV ticker list"},{"symbol":"HEG","name":"Horizon Electric Group","source":"CSV ticker list"},{"symbol":"HEL","name":"Horizon Energy Ltd","source":"CSV ticker list"},{"symbol":"HERO","name":"Synapse Health Ltd","source":"CSV ticker list"},{"symbol":"HFG","name":"Horizon Foods Group","source":"CSV ticker list"},{"symbol":"HFH","name":"Horizon Foods Holdings","source":"CSV ticker list"},{"symbol":"HFL","name":"Horizon Financial Ltd","source":"CSV ticker list"},{"symbol":"HFUJ","name":"Vertex Resources Holdings","source":"CSV ticker list"},{"symbol":"HG","name":"Horizon Global","source":"CSV ticker list"},{"symbol":"HGD","name":"Horizon Global Dynamics","source":"CSV ticker list"},{"symbol":"HGG","name":"Horizon Global Group","source":"CSV ticker list"},{"symbol":"HGH","name":"Horizon Gold Holdings","source":"CSV ticker list"},{"symbol":"HGL","name":"Horizon Gas Ltd","source":"CSV ticker list"},{"symbol":"HGLL","name":"Apex Core Labs","source":"CSV ticker list"},{"symbol":"HGN","name":"Horizon Global Networks","source":"CSV ticker list"},{"symbol":"HH","name":"Horizon Holdings","source":"CSV ticker list"},{"symbol":"HHC","name":"Horizon Health Corp","source":"CSV ticker list"},{"symbol":"HHG","name":"Horizon Health Group","source":"CSV ticker list"},{"symbol":"HHHJ","name":"Synapse Holdings","source":"CSV ticker list"},{"symbol":"HI","name":"Horizon Intelligence","source":"CSV ticker list"},{"symbol":"HIH","name":"Horizon Infrastructure Holdings","source":"CSV ticker list"},{"symbol":"HIL","name":"Horizon Infrastructure Ltd","source":"CSV ticker list"},{"symbol":"HIRA","name":"Synapse Logistics Holdings","source":"CSV ticker list"},{"symbol":"HJVC","name":"Alpha Next Inc","source":"CSV ticker list"},{"symbol":"HKDC","name":"Vanguard Systems","source":"CSV ticker list"},{"symbol":"HL","name":"Horizon Labs","source":"CSV ticker list"},{"symbol":"HLAT","name":"Alpha Gas Ltd","source":"CSV ticker list"},{"symbol":"HLG","name":"Horizon Logistics Group","source":"CSV ticker list"},{"symbol":"HLGP","name":"Apex Entertainment Inc","source":"CSV ticker list"},{"symbol":"HMC","name":"Horizon Mining Corp","source":"CSV ticker list"},{"symbol":"HMG","name":"Horizon Mining Group","source":"CSV ticker list"},{"symbol":"HMH","name":"Horizon Medical Holdings","source":"CSV ticker list"},{"symbol":"HMI","name":"Horizon Medical Inc","source":"CSV ticker list"},{"symbol":"HML","name":"Horizon Manufacturing Ltd","source":"CSV ticker list"},{"symbol":"HN","name":"Horizon Networks","source":"CSV ticker list"},{"symbol":"HNA","name":"Horizon Next Analytics","source":"CSV ticker list"},{"symbol":"HND","name":"Horizon Next Dynamics","source":"CSV ticker list"},{"symbol":"HNG","name":"Horizon Next Global","source":"CSV ticker list"},{"symbol":"HNH","name":"Horizon Next Holdings","source":"CSV ticker list"},{"symbol":"HNL","name":"Horizon Next Labs","source":"CSV ticker list"},{"symbol":"HNN","name":"Horizon Next Networks","source":"CSV ticker list"},{"symbol":"HNT","name":"Horizon Next Technologies","source":"CSV ticker list"},{"symbol":"HOGU","name":"Beta Foods Corp","source":"CSV ticker list"},{"symbol":"HOR","name":"Horizon Media Ltd","source":"CSV ticker list"},{"symbol":"HORI","name":"Horizon Digital","source":"CSV ticker list"},{"symbol":"HORX","name":"Horizon Dynamics","source":"CSV ticker list"},{"symbol":"HOZZ","name":"Stratus Power Ltd","source":"CSV ticker list"},{"symbol":"HPH","name":"Horizon Pharma Holdings","source":"CSV ticker list"},{"symbol":"HPI","name":"Horizon Power Inc","source":"CSV ticker list"},{"symbol":"HPL","name":"Horizon Partners Ltd","source":"CSV ticker list"},{"symbol":"HPLG","name":"Vertex Brands Group","source":"CSV ticker list"},{"symbol":"HQA","name":"Horizon Quantum Analytics","source":"CSV ticker list"},{"symbol":"HQD","name":"Horizon Quantum Dynamics","source":"CSV ticker list"},{"symbol":"HQDE","name":"Orion Systems","source":"CSV ticker list"},{"symbol":"HQGI","name":"Horizon Petroleum Ltd","source":"CSV ticker list"},{"symbol":"HQH","name":"Horizon Quantum Holdings","source":"CSV ticker list"},{"symbol":"HQI","name":"Horizon Quantum Intelligence","source":"CSV ticker list"},{"symbol":"HQJD","name":"Horizon Quantum Systems","source":"CSV ticker list"},{"symbol":"HQS","name":"Horizon Quantum Software","source":"CSV ticker list"},{"symbol":"HQVB","name":"Alpha Next Digital","source":"CSV ticker list"},{"symbol":"HRG","name":"Horizon Renewables Group","source":"CSV ticker list"},{"symbol":"HRH","name":"Horizon Renewables Holdings","source":"CSV ticker list"},{"symbol":"HS","name":"Horizon Solutions","source":"CSV ticker list"},{"symbol":"HSC","name":"Horizon Supermarkets Corp","source":"CSV ticker list"},{"symbol":"HSG","name":"Horizon Steel Group","source":"CSV ticker list"},{"symbol":"HSH","name":"Horizon Steel Holdings","source":"CSV ticker list"},{"symbol":"HSL","name":"Horizon Steel Ltd","source":"CSV ticker list"},{"symbol":"HSOH","name":"Vanguard Brands Holdings","source":"CSV ticker list"},{"symbol":"HT","name":"Horizon Technologies","source":"CSV ticker list"},{"symbol":"HTAM","name":"Nova Solutions","source":"CSV ticker list"},{"symbol":"HTC","name":"Horizon Trust Corp","source":"CSV ticker list"},{"symbol":"HUC","name":"Horizon Utilities Corp","source":"CSV ticker list"},{"symbol":"HUG","name":"Horizon Utilities Group","source":"CSV ticker list"},{"symbol":"HWG","name":"Horizon Water Group","source":"CSV ticker list"},{"symbol":"HWH","name":"Horizon Water Holdings","source":"CSV ticker list"},{"symbol":"HWZN","name":"Vertex Care Inc","source":"CSV ticker list"},{"symbol":"HZMS","name":"Synapse Global Networks","source":"CSV ticker list"},{"symbol":"IA","name":"Infinitum Analytics","source":"CSV ticker list"},{"symbol":"IAC","name":"Infinitum Apparel Corp","source":"CSV ticker list"},{"symbol":"IAI","name":"Infinitum Automation Inc","source":"CSV ticker list"},{"symbol":"IAL","name":"Infinitum Automotive Ltd","source":"CSV ticker list"},{"symbol":"IALX","name":"Nova Networks","source":"CSV ticker list"},{"symbol":"IBDN","name":"Aether Global Networks","source":"CSV ticker list"},{"symbol":"IBG","name":"Infinitum Brands Group","source":"CSV ticker list"},{"symbol":"IBH","name":"Infinitum Bank Holdings","source":"CSV ticker list"},{"symbol":"IBKA","name":"Aether Automation Ltd","source":"CSV ticker list"},{"symbol":"IBL","name":"Infinitum Beverages Ltd","source":"CSV ticker list"},{"symbol":"IBVY","name":"Prism Global Group","source":"CSV ticker list"},{"symbol":"IC","name":"Infinitum Corp","source":"CSV ticker list"},{"symbol":"ICC","name":"Infinitum Capital Corp","source":"CSV ticker list"},{"symbol":"ICD","name":"Infinitum Core Dynamics","source":"CSV ticker list"},{"symbol":"ICG","name":"Infinitum Core Group","source":"CSV ticker list"},{"symbol":"ICH","name":"Infinitum Core Holdings","source":"CSV ticker list"},{"symbol":"ICI","name":"Infinitum Core Intelligence","source":"CSV ticker list"},{"symbol":"ICL","name":"Infinitum Core Labs","source":"CSV ticker list"},{"symbol":"ICS","name":"Infinitum Core Software","source":"CSV ticker list"},{"symbol":"ID","name":"Infinitum Dynamics","source":"CSV ticker list"},{"symbol":"IDG","name":"Infinitum Distributors Group","source":"CSV ticker list"},{"symbol":"IDI","name":"Infinitum Distributors Inc","source":"CSV ticker list"},{"symbol":"IEC","name":"Infinitum Electric Corp","source":"CSV ticker list"},{"symbol":"IECR","name":"Infinitum Engineering Corp","source":"CSV ticker list"},{"symbol":"IEDM","name":"Orion Logistics Inc","source":"CSV ticker list"},{"symbol":"IEG","name":"Infinitum Engineering Group","source":"CSV ticker list"},{"symbol":"IEH","name":"Infinitum Energy Holdings","source":"CSV ticker list"},{"symbol":"IEL","name":"Infinitum Electric Ltd","source":"CSV ticker list"},{"symbol":"IFG","name":"Infinitum Financial Group","source":"CSV ticker list"},{"symbol":"IFQR","name":"Nexus Medical Corp","source":"CSV ticker list"},{"symbol":"IG","name":"Infinitum Global","source":"CSV ticker list"},{"symbol":"IGC","name":"Infinitum Gold Corp","source":"CSV ticker list"},{"symbol":"IGD","name":"Infinitum Global Digital","source":"CSV ticker list"},{"symbol":"IGEC","name":"Horizon Materials Corp","source":"CSV ticker list"},{"symbol":"IGH","name":"Infinitum Global Holdings","source":"CSV ticker list"},{"symbol":"IGIT","name":"Cyber Global Holdings","source":"CSV ticker list"},{"symbol":"IGS","name":"Infinitum Global Software","source":"CSV ticker list"},{"symbol":"IGT","name":"Infinitum Global Technologies","source":"CSV ticker list"},{"symbol":"IH","name":"Infinitum Holdings","source":"CSV ticker list"},{"symbol":"IHBY","name":"Alpha Global Solutions","source":"CSV ticker list"},{"symbol":"IHGF","name":"Apex Core Solutions","source":"CSV ticker list"},{"symbol":"IHL","name":"Infinitum Health Ltd","source":"CSV ticker list"},{"symbol":"IHUO","name":"Synapse Power Corp","source":"CSV ticker list"},{"symbol":"II","name":"Infinitum Innovation","source":"CSV ticker list"},{"symbol":"IIC","name":"Infinitum Infrastructure Corp","source":"CSV ticker list"},{"symbol":"IIG","name":"Infinitum Infrastructure Group","source":"CSV ticker list"},{"symbol":"IIGM","name":"Apex Systems","source":"CSV ticker list"},{"symbol":"IIH","name":"Infinitum Infrastructure Holdings","source":"CSV ticker list"},{"symbol":"IIVD","name":"Cyber Gold Corp","source":"CSV ticker list"},{"symbol":"IJTL","name":"Aether Retail Holdings","source":"CSV ticker list"},{"symbol":"IJWM","name":"Apex Supermarkets Ltd","source":"CSV ticker list"},{"symbol":"IKOV","name":"Alpha Gas Corp","source":"CSV ticker list"},{"symbol":"IL","name":"Infinitum Labs","source":"CSV ticker list"},{"symbol":"ILL","name":"Infinitum Lifesciences Ltd","source":"CSV ticker list"},{"symbol":"IMC","name":"Infinitum Medical Corp","source":"CSV ticker list"},{"symbol":"IMH","name":"Infinitum Motors Holdings","source":"CSV ticker list"},{"symbol":"IMI","name":"Infinitum Manufacturing Inc","source":"CSV ticker list"},{"symbol":"IML","name":"Infinitum Media Ltd","source":"CSV ticker list"},{"symbol":"IN","name":"Infinitum Networks","source":"CSV ticker list"},{"symbol":"INA","name":"Infinitum Next Analytics","source":"CSV ticker list"},{"symbol":"INF","name":"Infinitum Systems","source":"CSV ticker list"},{"symbol":"INFI","name":"Infinitum Intelligence","source":"CSV ticker list"},{"symbol":"INFX","name":"Infinitum Digital","source":"CSV ticker list"},{"symbol":"ING","name":"Infinitum Next Global","source":"CSV ticker list"},{"symbol":"INI","name":"Infinitum Next Innovation","source":"CSV ticker list"},{"symbol":"INL","name":"Infinitum Next Labs","source":"CSV ticker list"},{"symbol":"INS","name":"Infinitum Next Software","source":"CSV ticker list"},{"symbol":"INTI","name":"Cyber Bank Inc","source":"CSV ticker list"},{"symbol":"IPC","name":"Infinitum Products Corp","source":"CSV ticker list"},{"symbol":"IPG","name":"Infinitum Pharma Group","source":"CSV ticker list"},{"symbol":"IPH","name":"Infinitum Petroleum Holdings","source":"CSV ticker list"},{"symbol":"IPI","name":"Infinitum Products Inc","source":"CSV ticker list"},{"symbol":"IPL","name":"Infinitum Petroleum Ltd","source":"CSV ticker list"},{"symbol":"IPRC","name":"Vanguard Core Innovation","source":"CSV ticker list"},{"symbol":"IQA","name":"Infinitum Quantum Analytics","source":"CSV ticker list"},{"symbol":"IQCX","name":"Nova Petroleum Group","source":"CSV ticker list"},{"symbol":"IQD","name":"Infinitum Quantum Dynamics","source":"CSV ticker list"},{"symbol":"IQG","name":"Infinitum Quantum Global","source":"CSV ticker list"},{"symbol":"IQH","name":"Infinitum Quantum Holdings","source":"CSV ticker list"},{"symbol":"IQMS","name":"Alpha Innovation","source":"CSV ticker list"},{"symbol":"IQN","name":"Infinitum Quantum Networks","source":"CSV ticker list"},{"symbol":"IQPA","name":"Aether Chemicals Ltd","source":"CSV ticker list"},{"symbol":"IQTV","name":"Cyber Care Corp","source":"CSV ticker list"},{"symbol":"IRC","name":"Infinitum Renewables Corp","source":"CSV ticker list"},{"symbol":"IRG","name":"Infinitum Resources Group","source":"CSV ticker list"},{"symbol":"IRH","name":"Infinitum Realty Holdings","source":"CSV ticker list"},{"symbol":"IRSZ","name":"Vertex Rail Corp","source":"CSV ticker list"},{"symbol":"IRVF","name":"Prism Quantum Software","source":"CSV ticker list"},{"symbol":"IRXU","name":"Nova Labs","source":"CSV ticker list"},{"symbol":"IS","name":"Infinitum Solutions","source":"CSV ticker list"},{"symbol":"ISI","name":"Infinitum Steel Inc","source":"CSV ticker list"},{"symbol":"IT","name":"Infinitum Technologies","source":"CSV ticker list"},{"symbol":"ITC","name":"Infinitum Trust Corp","source":"CSV ticker list"},{"symbol":"ITL","name":"Infinitum Trust Ltd","source":"CSV ticker list"},{"symbol":"ITNA","name":"Summit Global Global","source":"CSV ticker list"},{"symbol":"ITXJ","name":"Synapse Trust Holdings","source":"CSV ticker list"},{"symbol":"ITZH","name":"Vanguard Retail Corp","source":"CSV ticker list"},{"symbol":"IUC","name":"Infinitum Utilities Corp","source":"CSV ticker list"},{"symbol":"IUDV","name":"Aether Entertainment Corp","source":"CSV ticker list"},{"symbol":"IUI","name":"Infinitum Utilities Inc","source":"CSV ticker list"},{"symbol":"IUL","name":"Infinitum Utilities Ltd","source":"CSV ticker list"},{"symbol":"IUYK","name":"Stratus Products Group","source":"CSV ticker list"},{"symbol":"IVPT","name":"Summit Bio Holdings","source":"CSV ticker list"},{"symbol":"IWCI","name":"Nexus Global Group","source":"CSV ticker list"},{"symbol":"IWH","name":"Infinitum Wealth Holdings","source":"CSV ticker list"},{"symbol":"IWI","name":"Infinitum Wealth Inc","source":"CSV ticker list"},{"symbol":"IXUD","name":"Synapse Resources Holdings","source":"CSV ticker list"},{"symbol":"IYGR","name":"Quantum Properties Ltd","source":"CSV ticker list"},{"symbol":"IYNX","name":"Vertex Systems","source":"CSV ticker list"},{"symbol":"IZMS","name":"Vertex Group","source":"CSV ticker list"},{"symbol":"JAPE","name":"Aether Utilities Inc","source":"CSV ticker list"},{"symbol":"JAUD","name":"Horizon Bio Inc","source":"CSV ticker list"},{"symbol":"JBQD","name":"Aether Analytics","source":"CSV ticker list"},{"symbol":"JBVN","name":"Synapse Inc","source":"CSV ticker list"},{"symbol":"JCNM","name":"Vanguard Core Corp","source":"CSV ticker list"},{"symbol":"JDLN","name":"Aether Automation Inc","source":"CSV ticker list"},{"symbol":"JGGP","name":"Prism Gold Group","source":"CSV ticker list"},{"symbol":"JGVE","name":"Quantum Electric Inc","source":"CSV ticker list"},{"symbol":"JGZA","name":"Stratus Energy Inc","source":"CSV ticker list"},{"symbol":"JHCW","name":"Aether Core Corp","source":"CSV ticker list"},{"symbol":"JINY","name":"Alpha Quantum Dynamics","source":"CSV ticker list"},{"symbol":"JIRH","name":"Cyber Innovation","source":"CSV ticker list"},{"symbol":"JKPN","name":"Nova Quantum Systems","source":"CSV ticker list"},{"symbol":"JKPV","name":"Beta Engineering Inc","source":"CSV ticker list"},{"symbol":"JLRF","name":"Beta Energy Holdings","source":"CSV ticker list"},{"symbol":"JMOJ","name":"Quantum Inc","source":"CSV ticker list"},{"symbol":"JNJ","name":"Johnson & Johnson","source":"CSV ticker list"},{"symbol":"JOFQ","name":"Catalyst Properties Corp","source":"CSV ticker list"},{"symbol":"JPGL","name":"Beta Supermarkets Corp","source":"CSV ticker list"},{"symbol":"JPLY","name":"Alpha Quantum Software","source":"CSV ticker list"},{"symbol":"JPM","name":"JPMorgan Chase & Co.","source":"CSV ticker list"},{"symbol":"JPNE","name":"Apex Holdings","source":"CSV ticker list"},{"symbol":"JPPN","name":"Nexus Global Corp","source":"CSV ticker list"},{"symbol":"JRMN","name":"Summit Automation Corp","source":"CSV ticker list"},{"symbol":"JSTS","name":"Nexus Bio Corp","source":"CSV ticker list"},{"symbol":"JTNP","name":"Aether Mining Ltd","source":"CSV ticker list"},{"symbol":"JUWO","name":"Aether Global Holdings","source":"CSV ticker list"},{"symbol":"JVKC","name":"Vanguard Properties Holdings","source":"CSV ticker list"},{"symbol":"JWEY","name":"Vertex Water Group","source":"CSV ticker list"},{"symbol":"JXJA","name":"Vanguard Power Holdings","source":"CSV ticker list"},{"symbol":"JZCY","name":"Apex Gas Corp","source":"CSV ticker list"},{"symbol":"JZSY","name":"Infinitum Apparel Inc","source":"CSV ticker list"},{"symbol":"JZYQ","name":"Vertex Realty Ltd","source":"CSV ticker list"},{"symbol":"KAKD","name":"Nova Dynamics","source":"CSV ticker list"},{"symbol":"KBMP","name":"Zephyr Energy Holdings","source":"CSV ticker list"},{"symbol":"KDOB","name":"Aether Software","source":"CSV ticker list"},{"symbol":"KEWE","name":"Alpha Estate Ltd","source":"CSV ticker list"},{"symbol":"KEZW","name":"Infinitum Asset Corp","source":"CSV ticker list"},{"symbol":"KFDY","name":"Nexus Pharma Group","source":"CSV ticker list"},{"symbol":"KFQJ","name":"Nova Retail Group","source":"CSV ticker list"},{"symbol":"KFVB","name":"Summit Quantum Group","source":"CSV ticker list"},{"symbol":"KGAQ","name":"Nova Quantum Dynamics","source":"CSV ticker list"},{"symbol":"KGRD","name":"Synapse Automation Corp","source":"CSV ticker list"},{"symbol":"KIQI","name":"Synapse Automation Holdings","source":"CSV ticker list"},{"symbol":"KIYK","name":"Orion Global Innovation","source":"CSV ticker list"},{"symbol":"KJHX","name":"Alpha Industries Group","source":"CSV ticker list"},{"symbol":"KLGL","name":"Nexus Rail Holdings","source":"CSV ticker list"},{"symbol":"KLLJ","name":"Summit Distributors Ltd","source":"CSV ticker list"},{"symbol":"KO","name":"Coca-Cola Company","source":"CSV ticker list"},{"symbol":"KOFL","name":"Stratus Capital Corp","source":"CSV ticker list"},{"symbol":"KPGH","name":"Vanguard Medical Inc","source":"CSV ticker list"},{"symbol":"KPMY","name":"Vanguard Solar Ltd","source":"CSV ticker list"},{"symbol":"KPNM","name":"Vertex Chemicals Inc","source":"CSV ticker list"},{"symbol":"KQYC","name":"Aether Intelligence","source":"CSV ticker list"},{"symbol":"KSUM","name":"Apex Bio Inc","source":"CSV ticker list"},{"symbol":"KTHG","name":"Vanguard CleanTech Holdings","source":"CSV ticker list"},{"symbol":"KTTS","name":"Beta Quantum Innovation","source":"CSV ticker list"},{"symbol":"KTVA","name":"Summit Next Solutions","source":"CSV ticker list"},{"symbol":"KUQS","name":"Matrix Properties Inc","source":"CSV ticker list"},{"symbol":"KUUZ","name":"Vanguard Next Intelligence","source":"CSV ticker list"},{"symbol":"KVLD","name":"Catalyst Quantum Technologies","source":"CSV ticker list"},{"symbol":"KWRT","name":"Nova Gas Corp","source":"CSV ticker list"},{"symbol":"KXJC","name":"Vanguard Beverages Corp","source":"CSV ticker list"},{"symbol":"KXSW","name":"Apex Next Solutions","source":"CSV ticker list"},{"symbol":"KYQB","name":"Orion Bio Ltd","source":"CSV ticker list"},{"symbol":"LABT","name":"Horizon Petroleum Inc","source":"CSV ticker list"},{"symbol":"LBQN","name":"Nova Core Labs","source":"CSV ticker list"},{"symbol":"LFRN","name":"Summit Next Innovation","source":"CSV ticker list"},{"symbol":"LGOZ","name":"Infinitum Group","source":"CSV ticker list"},{"symbol":"LGPM","name":"Nova Partners Holdings","source":"CSV ticker list"},{"symbol":"LGUB","name":"Cyber Resources Ltd","source":"CSV ticker list"},{"symbol":"LHWI","name":"Beta Care Inc","source":"CSV ticker list"},{"symbol":"LJRS","name":"Nexus Next Inc","source":"CSV ticker list"},{"symbol":"LJSA","name":"Catalyst Medical Corp","source":"CSV ticker list"},{"symbol":"LJVE","name":"Vanguard Global Group","source":"CSV ticker list"},{"symbol":"LKDS","name":"Apex Steel Ltd","source":"CSV ticker list"},{"symbol":"LLY","name":"Eli Lilly and Company","source":"CSV ticker list"},{"symbol":"LMEF","name":"Vertex Innovation","source":"CSV ticker list"},{"symbol":"LMIL","name":"Aether Supermarkets Ltd","source":"CSV ticker list"},{"symbol":"LMOZ","name":"Summit Medical Group","source":"CSV ticker list"},{"symbol":"LMPS","name":"Synapse Partners Corp","source":"CSV ticker list"},{"symbol":"LMRK","name":"Nexus Motors Inc","source":"CSV ticker list"},{"symbol":"LNVV","name":"Beta Petroleum Ltd","source":"CSV ticker list"},{"symbol":"LORX","name":"Zephyr Bio Group","source":"CSV ticker list"},{"symbol":"LOZF","name":"Stratus Rail Inc","source":"CSV ticker list"},{"symbol":"LPBJ","name":"Nexus Group","source":"CSV ticker list"},{"symbol":"LQPS","name":"Infinitum Properties Corp","source":"CSV ticker list"},{"symbol":"LSEO","name":"Nova Partners Inc","source":"CSV ticker list"},{"symbol":"LTRB","name":"Synapse Bio Holdings","source":"CSV ticker list"},{"symbol":"LVQX","name":"Vertex Power Ltd","source":"CSV ticker list"},{"symbol":"LVYB","name":"Infinitum Bio Ltd","source":"CSV ticker list"},{"symbol":"LWAF","name":"Orion Renewables Corp","source":"CSV ticker list"},{"symbol":"LXCQ","name":"Vertex Bio Group","source":"CSV ticker list"},{"symbol":"LXDE","name":"Synapse Global Group","source":"CSV ticker list"},{"symbol":"LXPG","name":"Summit Renewables Inc","source":"CSV ticker list"},{"symbol":"LXPQ","name":"Alpha Software","source":"CSV ticker list"},{"symbol":"LZKB","name":"Zephyr Petroleum Corp","source":"CSV ticker list"},{"symbol":"MA","name":"Mastercard Incorporated","source":"CSV ticker list"},{"symbol":"MAC","name":"Matrix Aerospace Corp","source":"CSV ticker list"},{"symbol":"MAG","name":"Matrix Automation Group","source":"CSV ticker list"},{"symbol":"MAH","name":"Matrix Automotive Holdings","source":"CSV ticker list"},{"symbol":"MAJV","name":"Vanguard Automotive Corp","source":"CSV ticker list"},{"symbol":"MAPL","name":"Zephyr Properties Ltd","source":"CSV ticker list"},{"symbol":"MAT","name":"Matrix Dynamics","source":"CSV ticker list"},{"symbol":"MATR","name":"Matrix Pharma Corp","source":"CSV ticker list"},{"symbol":"MATX","name":"Matrix Innovation","source":"CSV ticker list"},{"symbol":"MBG","name":"Matrix Brands Group","source":"CSV ticker list"},{"symbol":"MBH","name":"Matrix Beverages Holdings","source":"CSV ticker list"},{"symbol":"MBHD","name":"Vertex Labs","source":"CSV ticker list"},{"symbol":"MBI","name":"Matrix Bank Inc","source":"CSV ticker list"},{"symbol":"MBL","name":"Matrix Brands Ltd","source":"CSV ticker list"},{"symbol":"MBPI","name":"Infinitum Core Solutions","source":"CSV ticker list"},{"symbol":"MC","name":"Matrix Corp","source":"CSV ticker list"},{"symbol":"MCA","name":"Matrix Core Analytics","source":"CSV ticker list"},{"symbol":"MCC","name":"Matrix Capital Corp","source":"CSV ticker list"},{"symbol":"MCD","name":"Matrix Core Dynamics","source":"CSV ticker list"},{"symbol":"MCG","name":"Matrix Capital Group","source":"CSV ticker list"},{"symbol":"MCH","name":"Matrix CleanTech Holdings","source":"CSV ticker list"},{"symbol":"MCI","name":"Matrix Care Inc","source":"CSV ticker list"},{"symbol":"MCL","name":"Matrix Core Labs","source":"CSV ticker list"},{"symbol":"MCN","name":"Matrix Core Networks","source":"CSV ticker list"},{"symbol":"MCS","name":"Matrix Core Software","source":"CSV ticker list"},{"symbol":"MD","name":"Matrix Digital","source":"CSV ticker list"},{"symbol":"MEC","name":"Matrix Energy Corp","source":"CSV ticker list"},{"symbol":"MEH","name":"Matrix Electric Holdings","source":"CSV ticker list"},{"symbol":"MENN","name":"Alpha Next Analytics","source":"CSV ticker list"},{"symbol":"META","name":"Meta Platforms Inc.","source":"CSV ticker list"},{"symbol":"MFH","name":"Matrix Foods Holdings","source":"CSV ticker list"},{"symbol":"MFRL","name":"Cyber Technologies","source":"CSV ticker list"},{"symbol":"MG","name":"Matrix Global","source":"CSV ticker list"},{"symbol":"MGA","name":"Matrix Global Analytics","source":"CSV ticker list"},{"symbol":"MGC","name":"Matrix Global Corp","source":"CSV ticker list"},{"symbol":"MGCV","name":"Alpha Global Global","source":"CSV ticker list"},{"symbol":"MGG","name":"Matrix Global Group","source":"CSV ticker list"},{"symbol":"MGH","name":"Matrix Gold Holdings","source":"CSV ticker list"},{"symbol":"MGKT","name":"Apex Bank Inc","source":"CSV ticker list"},{"symbol":"MGL","name":"Matrix Gas Ltd","source":"CSV ticker list"},{"symbol":"MGN","name":"Matrix Global Networks","source":"CSV ticker list"},{"symbol":"MGS","name":"Matrix Global Software","source":"CSV ticker list"},{"symbol":"MH","name":"Matrix Holdings","source":"CSV ticker list"},{"symbol":"MHC","name":"Matrix Health Corp","source":"CSV ticker list"},{"symbol":"MI","name":"Matrix Intelligence","source":"CSV ticker list"},{"symbol":"MIC","name":"Matrix Infrastructure Corp","source":"CSV ticker list"},{"symbol":"MIG","name":"Matrix Infrastructure Group","source":"CSV ticker list"},{"symbol":"MIH","name":"Matrix Insurance Holdings","source":"CSV ticker list"},{"symbol":"MII","name":"Matrix Infrastructure Inc","source":"CSV ticker list"},{"symbol":"MIL","name":"Matrix Insurance Ltd","source":"CSV ticker list"},{"symbol":"MJCW","name":"Vertex Energy Ltd","source":"CSV ticker list"},{"symbol":"MJOG","name":"Alpha Global Software","source":"CSV ticker list"},{"symbol":"ML","name":"Matrix Labs","source":"CSV ticker list"},{"symbol":"MLC","name":"Matrix Lifesciences Corp","source":"CSV ticker list"},{"symbol":"MLH","name":"Matrix Logistics Holdings","source":"CSV ticker list"},{"symbol":"MLI","name":"Matrix Lifesciences Inc","source":"CSV ticker list"},{"symbol":"MLOR","name":"Aether Next Inc","source":"CSV ticker list"},{"symbol":"MMG","name":"Matrix Mining Group","source":"CSV ticker list"},{"symbol":"MMH","name":"Matrix Materials Holdings","source":"CSV ticker list"},{"symbol":"MMWT","name":"Alpha Quantum Inc","source":"CSV ticker list"},{"symbol":"MMXA","name":"Beta Insurance Ltd","source":"CSV ticker list"},{"symbol":"MN","name":"Matrix Networks","source":"CSV ticker list"},{"symbol":"MNA","name":"Matrix Next Analytics","source":"CSV ticker list"},{"symbol":"MND","name":"Matrix Next Digital","source":"CSV ticker list"},{"symbol":"MNG","name":"Matrix Next Global","source":"CSV ticker list"},{"symbol":"MNH","name":"Matrix Next Holdings","source":"CSV ticker list"},{"symbol":"MNKP","name":"Summit Global Software","source":"CSV ticker list"},{"symbol":"MNXY","name":"Apex Group","source":"CSV ticker list"},{"symbol":"MNZC","name":"Nova Partners Ltd","source":"CSV ticker list"},{"symbol":"MNZO","name":"Synapse Quantum Solutions","source":"CSV ticker list"},{"symbol":"MOBQ","name":"Nexus Core Innovation","source":"CSV ticker list"},{"symbol":"MOKN","name":"Apex CleanTech Corp","source":"CSV ticker list"},{"symbol":"MOOP","name":"Vanguard Estate Group","source":"CSV ticker list"},{"symbol":"MPC","name":"Matrix Properties Corp","source":"CSV ticker list"},{"symbol":"MPG","name":"Matrix Pharma Group","source":"CSV ticker list"},{"symbol":"MPH","name":"Matrix Power Holdings","source":"CSV ticker list"},{"symbol":"MPI","name":"Matrix Pharma Inc","source":"CSV ticker list"},{"symbol":"MPWD","name":"Stratus Media Holdings","source":"CSV ticker list"},{"symbol":"MPXA","name":"Prism Gas Ltd","source":"CSV ticker list"},{"symbol":"MQA","name":"Matrix Quantum Analytics","source":"CSV ticker list"},{"symbol":"MQD","name":"Matrix Quantum Dynamics","source":"CSV ticker list"},{"symbol":"MQI","name":"Matrix Quantum Inc","source":"CSV ticker list"},{"symbol":"MQN","name":"Matrix Quantum Networks","source":"CSV ticker list"},{"symbol":"MQS","name":"Matrix Quantum Systems","source":"CSV ticker list"},{"symbol":"MQT","name":"Matrix Quantum Technologies","source":"CSV ticker list"},{"symbol":"MQWC","name":"Quantum Automation Inc","source":"CSV ticker list"},{"symbol":"MRC","name":"Matrix Retail Corp","source":"CSV ticker list"},{"symbol":"MRK","name":"Merck & Co. Inc.","source":"CSV ticker list"},{"symbol":"MRSO","name":"Alpha Gold Holdings","source":"CSV ticker list"},{"symbol":"MS","name":"Matrix Solutions","source":"CSV ticker list"},{"symbol":"MSAK","name":"Vanguard Next Corp","source":"CSV ticker list"},{"symbol":"MSC","name":"Matrix Steel Corp","source":"CSV ticker list"},{"symbol":"MSFT","name":"Microsoft Corporation","source":"CSV ticker list"},{"symbol":"MSG","name":"Matrix Solar Group","source":"CSV ticker list"},{"symbol":"MSH","name":"Matrix Supermarkets Holdings","source":"CSV ticker list"},{"symbol":"MSI","name":"Matrix Steel Inc","source":"CSV ticker list"},{"symbol":"MSL","name":"Matrix Supermarkets Ltd","source":"CSV ticker list"},{"symbol":"MSXC","name":"Aether Products Corp","source":"CSV ticker list"},{"symbol":"MT","name":"Matrix Technologies","source":"CSV ticker list"},{"symbol":"MTC","name":"Matrix Trust Corp","source":"CSV ticker list"},{"symbol":"MTG","name":"Matrix Trust Group","source":"CSV ticker list"},{"symbol":"MTPW","name":"Cyber Engineering Inc","source":"CSV ticker list"},{"symbol":"MUH","name":"Matrix Utilities Holdings","source":"CSV ticker list"},{"symbol":"MUI","name":"Matrix Utilities Inc","source":"CSV ticker list"},{"symbol":"MVRM","name":"Matrix CleanTech Ltd","source":"CSV ticker list"},{"symbol":"MWH","name":"Matrix Water Holdings","source":"CSV ticker list"},{"symbol":"MWI","name":"Matrix Wealth Inc","source":"CSV ticker list"},{"symbol":"MZYK","name":"Nexus Brands Inc","source":"CSV ticker list"},{"symbol":"NAC","name":"Nova Aerospace Corp","source":"CSV ticker list"},{"symbol":"NAG","name":"Nova Aerospace Group","source":"CSV ticker list"},{"symbol":"NAH","name":"Nexus Aerospace Holdings","source":"CSV ticker list"},{"symbol":"NAJP","name":"Beta Core Innovation","source":"CSV ticker list"},{"symbol":"NAL","name":"Nova Aerospace Ltd","source":"CSV ticker list"},{"symbol":"NAN","name":"Nexus Analytics","source":"CSV ticker list"},{"symbol":"NAUT","name":"Catalyst Entertainment Corp","source":"CSV ticker list"},{"symbol":"NAVR","name":"Catalyst CleanTech Inc","source":"CSV ticker list"},{"symbol":"NBC","name":"Nexus Brands Corp","source":"CSV ticker list"},{"symbol":"NBG","name":"Nova Brands Group","source":"CSV ticker list"},{"symbol":"NBH","name":"Nexus Bio Holdings","source":"CSV ticker list"},{"symbol":"NBI","name":"Nova Bio Inc","source":"CSV ticker list"},{"symbol":"NBVT","name":"Aether Core Digital","source":"CSV ticker list"},{"symbol":"NC","name":"Nexus Corp","source":"CSV ticker list"},{"symbol":"NCA","name":"Nexus Core Analytics","source":"CSV ticker list"},{"symbol":"NCC","name":"Nova Care Corp","source":"CSV ticker list"},{"symbol":"NCD","name":"Nexus Core Digital","source":"CSV ticker list"},{"symbol":"NCG","name":"Nexus CleanTech Group","source":"CSV ticker list"},{"symbol":"NCH","name":"Nova Core Holdings","source":"CSV ticker list"},{"symbol":"NCI","name":"Nexus CleanTech Inc","source":"CSV ticker list"},{"symbol":"NCL","name":"Nexus Core Labs","source":"CSV ticker list"},{"symbol":"NCPI","name":"Orion Quantum Innovation","source":"CSV ticker list"},{"symbol":"NCTQ","name":"Cyber Next Inc","source":"CSV ticker list"},{"symbol":"ND","name":"Nova Digital","source":"CSV ticker list"},{"symbol":"NDC","name":"Nexus Development Corp","source":"CSV ticker list"},{"symbol":"NDG","name":"Nova Distributors Group","source":"CSV ticker list"},{"symbol":"NDH","name":"Nova Development Holdings","source":"CSV ticker list"},{"symbol":"NDI","name":"Nexus Distributors Inc","source":"CSV ticker list"},{"symbol":"NDVQ","name":"Apex Global Group","source":"CSV ticker list"},{"symbol":"NDWC","name":"Infinitum Power Ltd","source":"CSV ticker list"},{"symbol":"NEC","name":"Nova Engineering Corp","source":"CSV ticker list"},{"symbol":"NEG","name":"Nova Entertainment Group","source":"CSV ticker list"},{"symbol":"NEI","name":"Nexus Electric Inc","source":"CSV ticker list"},{"symbol":"NEL","name":"Nova Engineering Ltd","source":"CSV ticker list"},{"symbol":"NEX","name":"Nexus Quantum Solutions","source":"CSV ticker list"},{"symbol":"NEXU","name":"Nexus Dynamics","source":"CSV ticker list"},{"symbol":"NEXX","name":"Nexus Solutions","source":"CSV ticker list"},{"symbol":"NFC","name":"Nexus Foods Corp","source":"CSV ticker list"},{"symbol":"NFCS","name":"Cyber Infrastructure Ltd","source":"CSV ticker list"},{"symbol":"NFDP","name":"Cyber Beverages Group","source":"CSV ticker list"},{"symbol":"NFG","name":"Nexus Foods Group","source":"CSV ticker list"},{"symbol":"NFH","name":"Nexus Foods Holdings","source":"CSV ticker list"},{"symbol":"NFLX","name":"Netflix Inc.","source":"CSV ticker list"},{"symbol":"NG","name":"Nova Global","source":"CSV ticker list"},{"symbol":"NGC","name":"Nova Global Corp","source":"CSV ticker list"},{"symbol":"NGD","name":"Nexus Global Dynamics","source":"CSV ticker list"},{"symbol":"NGG","name":"Nova Gold Group","source":"CSV ticker list"},{"symbol":"NGH","name":"Nexus Global Holdings","source":"CSV ticker list"},{"symbol":"NGI","name":"Nova Global Intelligence","source":"CSV ticker list"},{"symbol":"NGN","name":"Nexus Global Networks","source":"CSV ticker list"},{"symbol":"NGS","name":"Nexus Global Software","source":"CSV ticker list"},{"symbol":"NH","name":"Nexus Holdings","source":"CSV ticker list"},{"symbol":"NHBB","name":"Prism Care Inc","source":"CSV ticker list"},{"symbol":"NHH","name":"Nova Health Holdings","source":"CSV ticker list"},{"symbol":"NHI","name":"Nexus Health Inc","source":"CSV ticker list"},{"symbol":"NHXM","name":"Horizon Supermarkets Holdings","source":"CSV ticker list"},{"symbol":"NI","name":"Nova Innovation","source":"CSV ticker list"},{"symbol":"NIG","name":"Nexus Industries Group","source":"CSV ticker list"},{"symbol":"NII","name":"Nexus Industries Inc","source":"CSV ticker list"},{"symbol":"NIKE","name":"Alpha Solutions","source":"CSV ticker list"},{"symbol":"NIL","name":"Nova Infrastructure Ltd","source":"CSV ticker list"},{"symbol":"NJRZ","name":"Stratus Apparel Group","source":"CSV ticker list"},{"symbol":"NKTI","name":"Horizon Products Inc","source":"CSV ticker list"},{"symbol":"NL","name":"Nexus Labs","source":"CSV ticker list"},{"symbol":"NLH","name":"Nova Logistics Holdings","source":"CSV ticker list"},{"symbol":"NLKJ","name":"Stratus Next Inc","source":"CSV ticker list"},{"symbol":"NLL","name":"Nova Logistics Ltd","source":"CSV ticker list"},{"symbol":"NMC","name":"Nexus Motors Corp","source":"CSV ticker list"},{"symbol":"NMG","name":"Nexus Mining Group","source":"CSV ticker list"},{"symbol":"NMH","name":"Nova Motors Holdings","source":"CSV ticker list"},{"symbol":"NMI","name":"Nexus Mining Inc","source":"CSV ticker list"},{"symbol":"NML","name":"Nexus Materials Ltd","source":"CSV ticker list"},{"symbol":"NN","name":"Nexus Networks","source":"CSV ticker list"},{"symbol":"NNA","name":"Nexus Next Analytics","source":"CSV ticker list"},{"symbol":"NND","name":"Nexus Next Dynamics","source":"CSV ticker list"},{"symbol":"NNI","name":"Nova Next Intelligence","source":"CSV ticker list"},{"symbol":"NNN","name":"Nexus Next Networks","source":"CSV ticker list"},{"symbol":"NNS","name":"Nexus Next Solutions","source":"CSV ticker list"},{"symbol":"NOHA","name":"Alpha Products Corp","source":"CSV ticker list"},{"symbol":"NOV","name":"Nova Corp","source":"CSV ticker list"},{"symbol":"NOVA","name":"Nova Apparel Holdings","source":"CSV ticker list"},{"symbol":"NOVX","name":"Nova Holdings","source":"CSV ticker list"},{"symbol":"NPC","name":"Nexus Properties Corp","source":"CSV ticker list"},{"symbol":"NPG","name":"Nova Partners Group","source":"CSV ticker list"},{"symbol":"NPH","name":"Nexus Petroleum Holdings","source":"CSV ticker list"},{"symbol":"NPI","name":"Nova Properties Inc","source":"CSV ticker list"},{"symbol":"NPL","name":"Nexus Properties Ltd","source":"CSV ticker list"},{"symbol":"NQA","name":"Nexus Quantum Analytics","source":"CSV ticker list"},{"symbol":"NQD","name":"Nexus Quantum Dynamics","source":"CSV ticker list"},{"symbol":"NQFR","name":"Aether Quantum Group","source":"CSV ticker list"},{"symbol":"NQG","name":"Nexus Quantum Global","source":"CSV ticker list"},{"symbol":"NQI","name":"Nova Quantum Intelligence","source":"CSV ticker list"},{"symbol":"NQL","name":"Nova Quantum Labs","source":"CSV ticker list"},{"symbol":"NQN","name":"Nexus Quantum Networks","source":"CSV ticker list"},{"symbol":"NQS","name":"Nova Quantum Solutions","source":"CSV ticker list"},{"symbol":"NQT","name":"Nova Quantum Technologies","source":"CSV ticker list"},{"symbol":"NRC","name":"Nexus Rail Corp","source":"CSV ticker list"},{"symbol":"NRG","name":"Nova Renewables Group","source":"CSV ticker list"},{"symbol":"NRGD","name":"Catalyst CleanTech Ltd","source":"CSV ticker list"},{"symbol":"NRH","name":"Nexus Resources Holdings","source":"CSV ticker list"},{"symbol":"NRI","name":"Nova Renewables Inc","source":"CSV ticker list"},{"symbol":"NRL","name":"Nova Resources Ltd","source":"CSV ticker list"},{"symbol":"NRRO","name":"Stratus Media Corp","source":"CSV ticker list"},{"symbol":"NS","name":"Nova Systems","source":"CSV ticker list"},{"symbol":"NSC","name":"Nova Steel Corp","source":"CSV ticker list"},{"symbol":"NSG","name":"Nexus Steel Group","source":"CSV ticker list"},{"symbol":"NSH","name":"Nova Steel Holdings","source":"CSV ticker list"},{"symbol":"NSI","name":"Nexus Supermarkets Inc","source":"CSV ticker list"},{"symbol":"NSL","name":"Nova Steel Ltd","source":"CSV ticker list"},{"symbol":"NSTB","name":"Vertex Petroleum Corp","source":"CSV ticker list"},{"symbol":"NT","name":"Nova Technologies","source":"CSV ticker list"},{"symbol":"NTH","name":"Nova Therapeutics Holdings","source":"CSV ticker list"},{"symbol":"NTI","name":"Nexus Trust Inc","source":"CSV ticker list"},{"symbol":"NUC","name":"Nexus Utilities Corp","source":"CSV ticker list"},{"symbol":"NUG","name":"Nova Utilities Group","source":"CSV ticker list"},{"symbol":"NUH","name":"Nova Utilities Holdings","source":"CSV ticker list"},{"symbol":"NUPS","name":"Quantum Entertainment Inc","source":"CSV ticker list"},{"symbol":"NUTS","name":"Vertex Aerospace Inc","source":"CSV ticker list"},{"symbol":"NVDA","name":"NVIDIA Corporation","source":"CSV ticker list"},{"symbol":"NVUC","name":"Vertex Intelligence","source":"CSV ticker list"},{"symbol":"NWH","name":"Nexus Water Holdings","source":"CSV ticker list"},{"symbol":"NWI","name":"Nova Water Inc","source":"CSV ticker list"},{"symbol":"NWL","name":"Nova Wealth Ltd","source":"CSV ticker list"},{"symbol":"NWZC","name":"Zephyr Aerospace Group","source":"CSV ticker list"},{"symbol":"NXTH","name":"Nova Group","source":"CSV ticker list"},{"symbol":"NYCS","name":"Horizon Properties Ltd","source":"CSV ticker list"},{"symbol":"NZEH","name":"Apex Products Ltd","source":"CSV ticker list"},{"symbol":"OA","name":"Orion Analytics","source":"CSV ticker list"},{"symbol":"OAG","name":"Orion Automation Group","source":"CSV ticker list"},{"symbol":"OAH","name":"Orion Automation Holdings","source":"CSV ticker list"},{"symbol":"OBG","name":"Orion Bio Group","source":"CSV ticker list"},{"symbol":"OBH","name":"Orion Bio Holdings","source":"CSV ticker list"},{"symbol":"OBI","name":"Orion Bank Inc","source":"CSV ticker list"},{"symbol":"OBL","name":"Orion Brands Ltd","source":"CSV ticker list"},{"symbol":"OC","name":"Orion Corp","source":"CSV ticker list"},{"symbol":"OCC","name":"Orion Chemicals Corp","source":"CSV ticker list"},{"symbol":"OCH","name":"Orion Core Holdings","source":"CSV ticker list"},{"symbol":"OD","name":"Orion Digital","source":"CSV ticker list"},{"symbol":"ODG","name":"Orion Development Group","source":"CSV ticker list"},{"symbol":"ODNQ","name":"Matrix Industries Holdings","source":"CSV ticker list"},{"symbol":"ODZA","name":"Beta Partners Ltd","source":"CSV ticker list"},{"symbol":"OEC","name":"Orion Electric Corp","source":"CSV ticker list"},{"symbol":"OEH","name":"Orion Engineering Holdings","source":"CSV ticker list"},{"symbol":"OEHX","name":"Apex Brands Group","source":"CSV ticker list"},{"symbol":"OEL","name":"Orion Entertainment Ltd","source":"CSV ticker list"},{"symbol":"OFDO","name":"Catalyst Media Group","source":"CSV ticker list"},{"symbol":"OFI","name":"Orion Financial Inc","source":"CSV ticker list"},{"symbol":"OFL","name":"Orion Financial Ltd","source":"CSV ticker list"},{"symbol":"OG","name":"Orion Global","source":"CSV ticker list"},{"symbol":"OGC","name":"Orion Gas Corp","source":"CSV ticker list"},{"symbol":"OGCB","name":"Aether Pharma Inc","source":"CSV ticker list"},{"symbol":"OGH","name":"Orion Global Holdings","source":"CSV ticker list"},{"symbol":"OGI","name":"Orion Global Intelligence","source":"CSV ticker list"},{"symbol":"OGS","name":"Orion Global Systems","source":"CSV ticker list"},{"symbol":"OH","name":"Orion Holdings","source":"CSV ticker list"},{"symbol":"OHQM","name":"Alpha Global","source":"CSV ticker list"},{"symbol":"OI","name":"Orion Innovation","source":"CSV ticker list"},{"symbol":"OIG","name":"Orion Insurance Group","source":"CSV ticker list"},{"symbol":"OIL","name":"Orion Infrastructure Ltd","source":"CSV ticker list"},{"symbol":"OIPZ","name":"Zephyr Next Intelligence","source":"CSV ticker list"},{"symbol":"OIZF","name":"Zephyr Mining Ltd","source":"CSV ticker list"},{"symbol":"OJAJ","name":"Beta Apparel Corp","source":"CSV ticker list"},{"symbol":"OJIS","name":"Nexus Power Holdings","source":"CSV ticker list"},{"symbol":"OKPN","name":"Vanguard Development Inc","source":"CSV ticker list"},{"symbol":"OL","name":"Orion Labs","source":"CSV ticker list"},{"symbol":"OLH","name":"Orion Logistics Holdings","source":"CSV ticker list"},{"symbol":"OLI","name":"Orion Lifesciences Inc","source":"CSV ticker list"},{"symbol":"OMC","name":"Orion Manufacturing Corp","source":"CSV ticker list"},{"symbol":"OMI","name":"Orion Motors Inc","source":"CSV ticker list"},{"symbol":"OML","name":"Orion Mining Ltd","source":"CSV ticker list"},{"symbol":"OMQO","name":"Infinitum Global Systems","source":"CSV ticker list"},{"symbol":"ON","name":"Orion Networks","source":"CSV ticker list"},{"symbol":"ONG","name":"Orion Next Global","source":"CSV ticker list"},{"symbol":"ONS","name":"Orion Next Systems","source":"CSV ticker list"},{"symbol":"ONYL","name":"Alpha Core Solutions","source":"CSV ticker list"},{"symbol":"OONQ","name":"Alpha Estate Inc","source":"CSV ticker list"},{"symbol":"OPC","name":"Orion Properties Corp","source":"CSV ticker list"},{"symbol":"OPGP","name":"Prism Bank Group","source":"CSV ticker list"},{"symbol":"OPH","name":"Orion Products Holdings","source":"CSV ticker list"},{"symbol":"OPHS","name":"Vertex Retail Ltd","source":"CSV ticker list"},{"symbol":"OPI","name":"Orion Pharma Inc","source":"CSV ticker list"},{"symbol":"OPL","name":"Orion Pharma Ltd","source":"CSV ticker list"},{"symbol":"OQC","name":"Orion Quantum Corp","source":"CSV ticker list"},{"symbol":"OQD","name":"Orion Quantum Digital","source":"CSV ticker list"},{"symbol":"OQH","name":"Orion Quantum Holdings","source":"CSV ticker list"},{"symbol":"OQI","name":"Orion Quantum Intelligence","source":"CSV ticker list"},{"symbol":"OQN","name":"Orion Quantum Networks","source":"CSV ticker list"},{"symbol":"OQS","name":"Orion Quantum Software","source":"CSV ticker list"},{"symbol":"OQT","name":"Orion Quantum Technologies","source":"CSV ticker list"},{"symbol":"ORC","name":"Orion Resources Corp","source":"CSV ticker list"},{"symbol":"ORI","name":"Orion Retail Ltd","source":"CSV ticker list"},{"symbol":"ORIO","name":"Orion Dynamics","source":"CSV ticker list"},{"symbol":"ORIX","name":"Orion Intelligence","source":"CSV ticker list"},{"symbol":"ORL","name":"Orion Resources Ltd","source":"CSV ticker list"},{"symbol":"OS","name":"Orion Solutions","source":"CSV ticker list"},{"symbol":"OSC","name":"Orion Supermarkets Corp","source":"CSV ticker list"},{"symbol":"OSH","name":"Orion Solar Holdings","source":"CSV ticker list"},{"symbol":"OSI","name":"Orion Supermarkets Inc","source":"CSV ticker list"},{"symbol":"OSL","name":"Orion Solar Ltd","source":"CSV ticker list"},{"symbol":"OSMB","name":"Infinitum Mining Corp","source":"CSV ticker list"},{"symbol":"OT","name":"Orion Technologies","source":"CSV ticker list"},{"symbol":"OTC","name":"Orion Therapeutics Corp","source":"CSV ticker list"},{"symbol":"OTH","name":"Orion Therapeutics Holdings","source":"CSV ticker list"},{"symbol":"OTL","name":"Orion Trust Ltd","source":"CSV ticker list"},{"symbol":"OTMT","name":"Stratus Water Ltd","source":"CSV ticker list"},{"symbol":"OUFA","name":"Orion Inc","source":"CSV ticker list"},{"symbol":"OUG","name":"Orion Utilities Group","source":"CSV ticker list"},{"symbol":"OUL","name":"Orion Utilities Ltd","source":"CSV ticker list"},{"symbol":"OWI","name":"Orion Water Inc","source":"CSV ticker list"},{"symbol":"OXGS","name":"Beta Products Group","source":"CSV ticker list"},{"symbol":"OXHU","name":"Synapse Corp","source":"CSV ticker list"},{"symbol":"OXQL","name":"Apex Gold Ltd","source":"CSV ticker list"},{"symbol":"OYLF","name":"Catalyst Therapeutics Inc","source":"CSV ticker list"},{"symbol":"OYMS","name":"Vanguard Digital","source":"CSV ticker list"},{"symbol":"OZEE","name":"Catalyst Quantum Inc","source":"CSV ticker list"},{"symbol":"OZUB","name":"Apex Properties Holdings","source":"CSV ticker list"},{"symbol":"PA","name":"Prism Analytics","source":"CSV ticker list"},{"symbol":"PAG","name":"Prism Automation Group","source":"CSV ticker list"},{"symbol":"PANG","name":"Aether Products Ltd","source":"CSV ticker list"},{"symbol":"PBC","name":"Prism Brands Corp","source":"CSV ticker list"},{"symbol":"PBFM","name":"Catalyst Distributors Ltd","source":"CSV ticker list"},{"symbol":"PBG","name":"Prism Bio Group","source":"CSV ticker list"},{"symbol":"PBH","name":"Prism Brands Holdings","source":"CSV ticker list"},{"symbol":"PBL","name":"Prism Bank Ltd","source":"CSV ticker list"},{"symbol":"PC","name":"Prism Corp","source":"CSV ticker list"},{"symbol":"PCA","name":"Prism Core Analytics","source":"CSV ticker list"},{"symbol":"PCAS","name":"Alpha Corp","source":"CSV ticker list"},{"symbol":"PCD","name":"Prism Core Dynamics","source":"CSV ticker list"},{"symbol":"PCFZ","name":"Nexus Intelligence","source":"CSV ticker list"},{"symbol":"PCG","name":"Prism CleanTech Group","source":"CSV ticker list"},{"symbol":"PCI","name":"Prism Core Inc","source":"CSV ticker list"},{"symbol":"PCKJ","name":"Horizon Inc","source":"CSV ticker list"},{"symbol":"PCL","name":"Prism Chemicals Ltd","source":"CSV ticker list"},{"symbol":"PCN","name":"Prism Core Networks","source":"CSV ticker list"},{"symbol":"PCS","name":"Prism Core Solutions","source":"CSV ticker list"},{"symbol":"PCT","name":"Prism Core Technologies","source":"CSV ticker list"},{"symbol":"PD","name":"Prism Dynamics","source":"CSV ticker list"},{"symbol":"PDH","name":"Prism Distributors Holdings","source":"CSV ticker list"},{"symbol":"PDI","name":"Prism Development Inc","source":"CSV ticker list"},{"symbol":"PEC","name":"Prism Engineering Corp","source":"CSV ticker list"},{"symbol":"PEEI","name":"Summit Chemicals Inc","source":"CSV ticker list"},{"symbol":"PEG","name":"Prism Electric Group","source":"CSV ticker list"},{"symbol":"PEI","name":"Prism Entertainment Inc","source":"CSV ticker list"},{"symbol":"PEP","name":"PepsiCo Inc.","source":"CSV ticker list"},{"symbol":"PESW","name":"Horizon Global Digital","source":"CSV ticker list"},{"symbol":"PFC","name":"Prism Financial Corp","source":"CSV ticker list"},{"symbol":"PFG","name":"Prism Financial Group","source":"CSV ticker list"},{"symbol":"PFI","name":"Prism Foods Inc","source":"CSV ticker list"},{"symbol":"PFL","name":"Prism Foods Ltd","source":"CSV ticker list"},{"symbol":"PFPK","name":"Stratus Group","source":"CSV ticker list"},{"symbol":"PG","name":"Procter & Gamble Co.","source":"CSV ticker list"},{"symbol":"PGG","name":"Prism Global Global","source":"CSV ticker list"},{"symbol":"PGL","name":"Prism Global Labs","source":"CSV ticker list"},{"symbol":"PGST","name":"Vanguard Logistics Inc","source":"CSV ticker list"},{"symbol":"PH","name":"Prism Holdings","source":"CSV ticker list"},{"symbol":"PHIC","name":"Stratus Trust Group","source":"CSV ticker list"},{"symbol":"PHOZ","name":"Quantum Resources Group","source":"CSV ticker list"},{"symbol":"PHSG","name":"Aether Labs","source":"CSV ticker list"},{"symbol":"PI","name":"Prism Innovation","source":"CSV ticker list"},{"symbol":"PIC","name":"Prism Insurance Corp","source":"CSV ticker list"},{"symbol":"PIG","name":"Prism Insurance Group","source":"CSV ticker list"},{"symbol":"PIH","name":"Prism Insurance Holdings","source":"CSV ticker list"},{"symbol":"PIL","name":"Prism Insurance Ltd","source":"CSV ticker list"},{"symbol":"PJQD","name":"Matrix Apparel Holdings","source":"CSV ticker list"},{"symbol":"PKAJ","name":"Aether Brands Ltd","source":"CSV ticker list"},{"symbol":"PL","name":"Prism Labs","source":"CSV ticker list"},{"symbol":"PMC","name":"Prism Medical Corp","source":"CSV ticker list"},{"symbol":"PMG","name":"Prism Media Group","source":"CSV ticker list"},{"symbol":"PMH","name":"Prism Media Holdings","source":"CSV ticker list"},{"symbol":"PMKD","name":"Matrix Quantum Solutions","source":"CSV ticker list"},{"symbol":"PML","name":"Prism Materials Ltd","source":"CSV ticker list"},{"symbol":"PN","name":"Prism Networks","source":"CSV ticker list"},{"symbol":"PND","name":"Prism Next Digital","source":"CSV ticker list"},{"symbol":"PNI","name":"Prism Next Innovation","source":"CSV ticker list"},{"symbol":"PNXA","name":"Cyber Motors Corp","source":"CSV ticker list"},{"symbol":"POFK","name":"Catalyst Core Digital","source":"CSV ticker list"},{"symbol":"POJV","name":"Aether Steel Ltd","source":"CSV ticker list"},{"symbol":"POXT","name":"Zephyr Next Global","source":"CSV ticker list"},{"symbol":"PPG","name":"Prism Products Group","source":"CSV ticker list"},{"symbol":"PPI","name":"Prism Power Inc","source":"CSV ticker list"},{"symbol":"PPL","name":"Prism Pharma Ltd","source":"CSV ticker list"},{"symbol":"PQBF","name":"Quantum Software","source":"CSV ticker list"},{"symbol":"PQG","name":"Prism Quantum Global","source":"CSV ticker list"},{"symbol":"PQL","name":"Prism Quantum Labs","source":"CSV ticker list"},{"symbol":"PQS","name":"Prism Quantum Systems","source":"CSV ticker list"},{"symbol":"PQT","name":"Prism Quantum Technologies","source":"CSV ticker list"},{"symbol":"PRG","name":"Prism Realty Group","source":"CSV ticker list"},{"symbol":"PRH","name":"Prism Renewables Holdings","source":"CSV ticker list"},{"symbol":"PRI","name":"Prism Intelligence","source":"CSV ticker list"},{"symbol":"PRIS","name":"Prism Properties Ltd","source":"CSV ticker list"},{"symbol":"PRIX","name":"Prism Solar Inc","source":"CSV ticker list"},{"symbol":"PRL","name":"Prism Realty Ltd","source":"CSV ticker list"},{"symbol":"PS","name":"Prism Systems","source":"CSV ticker list"},{"symbol":"PSC","name":"Prism Solar Corp","source":"CSV ticker list"},{"symbol":"PSG","name":"Prism Solar Group","source":"CSV ticker list"},{"symbol":"PSI","name":"Prism Steel Inc","source":"CSV ticker list"},{"symbol":"PSL","name":"Prism Solar Ltd","source":"CSV ticker list"},{"symbol":"PT","name":"Prism Technologies","source":"CSV ticker list"},{"symbol":"PTDH","name":"Matrix Estate Holdings","source":"CSV ticker list"},{"symbol":"PTOB","name":"Nexus Bank Group","source":"CSV ticker list"},{"symbol":"PTOK","name":"Stratus Solutions","source":"CSV ticker list"},{"symbol":"PUEX","name":"Stratus Capital Inc","source":"CSV ticker list"},{"symbol":"PUG","name":"Prism Utilities Group","source":"CSV ticker list"},{"symbol":"PUUH","name":"Aether Global","source":"CSV ticker list"},{"symbol":"PVVH","name":"Summit CleanTech Group","source":"CSV ticker list"},{"symbol":"PWBG","name":"Aether Motors Inc","source":"CSV ticker list"},{"symbol":"PWC","name":"Prism Water Corp","source":"CSV ticker list"},{"symbol":"PWI","name":"Prism Water Inc","source":"CSV ticker list"},{"symbol":"PXZD","name":"Prism Solutions","source":"CSV ticker list"},{"symbol":"PZLC","name":"Vertex Core Labs","source":"CSV ticker list"},{"symbol":"QA","name":"Quantum Analytics","source":"CSV ticker list"},{"symbol":"QAC","name":"Quantum Aerospace Corp","source":"CSV ticker list"},{"symbol":"QAG","name":"Quantum Asset Group","source":"CSV ticker list"},{"symbol":"QAH","name":"Quantum Asset Holdings","source":"CSV ticker list"},{"symbol":"QAI","name":"Quantum Aerospace Inc","source":"CSV ticker list"},{"symbol":"QBBS","name":"Apex Retail Ltd","source":"CSV ticker list"},{"symbol":"QBC","name":"Quantum Brands Corp","source":"CSV ticker list"},{"symbol":"QBH","name":"Quantum Bank Holdings","source":"CSV ticker list"},{"symbol":"QBI","name":"Quantum Bank Inc","source":"CSV ticker list"},{"symbol":"QBL","name":"Quantum Bank Ltd","source":"CSV ticker list"},{"symbol":"QC","name":"Quantum Corp","source":"CSV ticker list"},{"symbol":"QCA","name":"Quantum Core Analytics","source":"CSV ticker list"},{"symbol":"QCD","name":"Quantum Core Dynamics","source":"CSV ticker list"},{"symbol":"QCG","name":"Quantum Core Group","source":"CSV ticker list"},{"symbol":"QCH","name":"Quantum CleanTech Holdings","source":"CSV ticker list"},{"symbol":"QCI","name":"Quantum Core Innovation","source":"CSV ticker list"},{"symbol":"QCL","name":"Quantum Chemicals Ltd","source":"CSV ticker list"},{"symbol":"QCS","name":"Quantum Core Systems","source":"CSV ticker list"},{"symbol":"QCYF","name":"Alpha Engineering Corp","source":"CSV ticker list"},{"symbol":"QD","name":"Quantum Digital","source":"CSV ticker list"},{"symbol":"QDC","name":"Quantum Development Corp","source":"CSV ticker list"},{"symbol":"QDFC","name":"Quantum Properties Corp","source":"CSV ticker list"},{"symbol":"QDL","name":"Quantum Development Ltd","source":"CSV ticker list"},{"symbol":"QEBY","name":"Aether Materials Holdings","source":"CSV ticker list"},{"symbol":"QEG","name":"Quantum Estate Group","source":"CSV ticker list"},{"symbol":"QEH","name":"Quantum Entertainment Holdings","source":"CSV ticker list"},{"symbol":"QEI","name":"Quantum Engineering Inc","source":"CSV ticker list"},{"symbol":"QFBD","name":"Alpha Brands Group","source":"CSV ticker list"},{"symbol":"QFNV","name":"Catalyst Insurance Holdings","source":"CSV ticker list"},{"symbol":"QG","name":"Quantum Group","source":"CSV ticker list"},{"symbol":"QGC","name":"Quantum Global Corp","source":"CSV ticker list"},{"symbol":"QGD","name":"Quantum Global Dynamics","source":"CSV ticker list"},{"symbol":"QGG","name":"Quantum Global Group","source":"CSV ticker list"},{"symbol":"QGH","name":"Quantum Global Holdings","source":"CSV ticker list"},{"symbol":"QGI","name":"Quantum Global Innovation","source":"CSV ticker list"},{"symbol":"QGL","name":"Quantum Global Labs","source":"CSV ticker list"},{"symbol":"QGLR","name":"Aether Technologies","source":"CSV ticker list"},{"symbol":"QGN","name":"Quantum Global Networks","source":"CSV ticker list"},{"symbol":"QGPD","name":"Cyber Estate Group","source":"CSV ticker list"},{"symbol":"QGS","name":"Quantum Global Solutions","source":"CSV ticker list"},{"symbol":"QH","name":"Quantum Holdings","source":"CSV ticker list"},{"symbol":"QHH","name":"Quantum Health Holdings","source":"CSV ticker list"},{"symbol":"QHOX","name":"Aether Core Dynamics","source":"CSV ticker list"},{"symbol":"QHUV","name":"Horizon Partners Holdings","source":"CSV ticker list"},{"symbol":"QHVU","name":"Cyber Pharma Ltd","source":"CSV ticker list"},{"symbol":"QI","name":"Quantum Innovation","source":"CSV ticker list"},{"symbol":"QIC","name":"Quantum Infrastructure Corp","source":"CSV ticker list"},{"symbol":"QICW","name":"Nova Global Software","source":"CSV ticker list"},{"symbol":"QIJO","name":"Vanguard Holdings","source":"CSV ticker list"},{"symbol":"QINS","name":"Apex Intelligence","source":"CSV ticker list"},{"symbol":"QL","name":"Quantum Labs","source":"CSV ticker list"},{"symbol":"QLC","name":"Quantum Logistics Corp","source":"CSV ticker list"},{"symbol":"QLL","name":"Quantum Logistics Ltd","source":"CSV ticker list"},{"symbol":"QMC","name":"Quantum Motors Corp","source":"CSV ticker list"},{"symbol":"QMH","name":"Quantum Mining Holdings","source":"CSV ticker list"},{"symbol":"QMHB","name":"Vanguard Core Intelligence","source":"CSV ticker list"},{"symbol":"QMI","name":"Quantum Materials Inc","source":"CSV ticker list"},{"symbol":"QML","name":"Quantum Mining Ltd","source":"CSV ticker list"},{"symbol":"QMPZ","name":"Nexus Next Systems","source":"CSV ticker list"},{"symbol":"QN","name":"Quantum Networks","source":"CSV ticker list"},{"symbol":"QNEV","name":"Vertex Global","source":"CSV ticker list"},{"symbol":"QNG","name":"Quantum Next Group","source":"CSV ticker list"},{"symbol":"QNL","name":"Quantum Next Labs","source":"CSV ticker list"},{"symbol":"QOKY","name":"Catalyst Products Holdings","source":"CSV ticker list"},{"symbol":"QOOI","name":"Catalyst Brands Ltd","source":"CSV ticker list"},{"symbol":"QOZZ","name":"Catalyst Manufacturing Corp","source":"CSV ticker list"},{"symbol":"QPC","name":"Quantum Petroleum Corp","source":"CSV ticker list"},{"symbol":"QPG","name":"Quantum Pharma Group","source":"CSV ticker list"},{"symbol":"QPGX","name":"Beta Motors Holdings","source":"CSV ticker list"},{"symbol":"QPH","name":"Quantum Products Holdings","source":"CSV ticker list"},{"symbol":"QPL","name":"Quantum Power Ltd","source":"CSV ticker list"},{"symbol":"QQBT","name":"Catalyst Industries Corp","source":"CSV ticker list"},{"symbol":"QQD","name":"Quantum Quantum Digital","source":"CSV ticker list"},{"symbol":"QQI","name":"Quantum Quantum Intelligence","source":"CSV ticker list"},{"symbol":"QQL","name":"Quantum Quantum Labs","source":"CSV ticker list"},{"symbol":"QQLL","name":"Cyber Mining Group","source":"CSV ticker list"},{"symbol":"QQS","name":"Quantum Quantum Solutions","source":"CSV ticker list"},{"symbol":"QQT","name":"Quantum Quantum Technologies","source":"CSV ticker list"},{"symbol":"QRC","name":"Quantum Realty Corp","source":"CSV ticker list"},{"symbol":"QRG","name":"Quantum Renewables Group","source":"CSV ticker list"},{"symbol":"QRGW","name":"Nova Renewables Corp","source":"CSV ticker list"},{"symbol":"QRH","name":"Quantum Realty Holdings","source":"CSV ticker list"},{"symbol":"QRL","name":"Quantum Realty Ltd","source":"CSV ticker list"},{"symbol":"QRNG","name":"Vanguard Care Group","source":"CSV ticker list"},{"symbol":"QS","name":"Quantum Solutions","source":"CSV ticker list"},{"symbol":"QSG","name":"Quantum Steel Group","source":"CSV ticker list"},{"symbol":"QT","name":"Quantum Technologies","source":"CSV ticker list"},{"symbol":"QTC","name":"Quantum Therapeutics Corp","source":"CSV ticker list"},{"symbol":"QTH","name":"Quantum Trust Holdings","source":"CSV ticker list"},{"symbol":"QUA","name":"Quantum Global","source":"CSV ticker list"},{"symbol":"QUAN","name":"Quantum Chemicals Inc","source":"CSV ticker list"},{"symbol":"QUAX","name":"Quantum Resources Corp","source":"CSV ticker list"},{"symbol":"QUIQ","name":"Nova Capital Ltd","source":"CSV ticker list"},{"symbol":"QVLE","name":"Stratus Materials Group","source":"CSV ticker list"},{"symbol":"QWI","name":"Quantum Water Inc","source":"CSV ticker list"},{"symbol":"QWL","name":"Quantum Water Ltd","source":"CSV ticker list"},{"symbol":"QXIT","name":"Synapse Technologies","source":"CSV ticker list"},{"symbol":"QXKP","name":"Alpha Pharma Corp","source":"CSV ticker list"},{"symbol":"QXRV","name":"Orion Next Solutions","source":"CSV ticker list"},{"symbol":"QYHD","name":"Summit Electric Corp","source":"CSV ticker list"},{"symbol":"RAWA","name":"Vertex Quantum Group","source":"CSV ticker list"},{"symbol":"RBEH","name":"Alpha Group","source":"CSV ticker list"},{"symbol":"RBSE","name":"Apex Quantum Intelligence","source":"CSV ticker list"},{"symbol":"RDFY","name":"Summit Global Innovation","source":"CSV ticker list"},{"symbol":"RDGM","name":"Nova Financial Group","source":"CSV ticker list"},{"symbol":"RDMG","name":"Alpha Core Networks","source":"CSV ticker list"},{"symbol":"REUG","name":"Vanguard CleanTech Group","source":"CSV ticker list"},{"symbol":"RFDO","name":"Zephyr Gold Inc","source":"CSV ticker list"},{"symbol":"RHMV","name":"Summit Gas Inc","source":"CSV ticker list"},{"symbol":"RIDR","name":"Stratus Water Holdings","source":"CSV ticker list"},{"symbol":"RIHC","name":"Apex Infrastructure Group","source":"CSV ticker list"},{"symbol":"RINO","name":"Vanguard Global Software","source":"CSV ticker list"},{"symbol":"RKCI","name":"Alpha Next Innovation","source":"CSV ticker list"},{"symbol":"RKDP","name":"Vertex Global Technologies","source":"CSV ticker list"},{"symbol":"RKRB","name":"Aether Care Ltd","source":"CSV ticker list"},{"symbol":"RKUN","name":"Zephyr Innovation","source":"CSV ticker list"},{"symbol":"RKYC","name":"Prism Beverages Group","source":"CSV ticker list"},{"symbol":"RMIU","name":"Zephyr Global Systems","source":"CSV ticker list"},{"symbol":"ROAV","name":"Aether Core Innovation","source":"CSV ticker list"},{"symbol":"ROGP","name":"Zephyr Petroleum Holdings","source":"CSV ticker list"},{"symbol":"RONE","name":"Vanguard Global Digital","source":"CSV ticker list"},{"symbol":"RRPU","name":"Apex Quantum Innovation","source":"CSV ticker list"},{"symbol":"RRUD","name":"Zephyr Dynamics","source":"CSV ticker list"},{"symbol":"RSMG","name":"Nexus Trust Holdings","source":"CSV ticker list"},{"symbol":"RTEC","name":"Aether Bio Ltd","source":"CSV ticker list"},{"symbol":"RUJS","name":"Quantum Media Holdings","source":"CSV ticker list"},{"symbol":"RVAC","name":"Nova Intelligence","source":"CSV ticker list"},{"symbol":"RVOH","name":"Quantum Pharma Ltd","source":"CSV ticker list"},{"symbol":"RXIC","name":"Aether Supermarkets Group","source":"CSV ticker list"},{"symbol":"RXOA","name":"Infinitum Software","source":"CSV ticker list"},{"symbol":"RXWM","name":"Summit Quantum Intelligence","source":"CSV ticker list"},{"symbol":"RXXE","name":"Vertex Technologies","source":"CSV ticker list"},{"symbol":"RZDD","name":"Apex Renewables Group","source":"CSV ticker list"},{"symbol":"RZDW","name":"Apex Global Solutions","source":"CSV ticker list"},{"symbol":"RZGT","name":"Summit Supermarkets Corp","source":"CSV ticker list"},{"symbol":"RZJL","name":"Aether Insurance Ltd","source":"CSV ticker list"},{"symbol":"SA","name":"Synapse Analytics","source":"CSV ticker list"},{"symbol":"SAC","name":"Summit Automotive Corp","source":"CSV ticker list"},{"symbol":"SACT","name":"Cyber Media Group","source":"CSV ticker list"},{"symbol":"SAG","name":"Summit Apparel Group","source":"CSV ticker list"},{"symbol":"SAH","name":"Summit Automation Holdings","source":"CSV ticker list"},{"symbol":"SAI","name":"Summit Asset Inc","source":"CSV ticker list"},{"symbol":"SAL","name":"Synapse Apparel Ltd","source":"CSV ticker list"},{"symbol":"SAMD","name":"Summit Holdings","source":"CSV ticker list"},{"symbol":"SBC","name":"Summit Bank Corp","source":"CSV ticker list"},{"symbol":"SBG","name":"Synapse Brands Group","source":"CSV ticker list"},{"symbol":"SBH","name":"Stratus Brands Holdings","source":"CSV ticker list"},{"symbol":"SBI","name":"Summit Brands Inc","source":"CSV ticker list"},{"symbol":"SBL","name":"Summit Brands Ltd","source":"CSV ticker list"},{"symbol":"SBNV","name":"Summit Bank Inc","source":"CSV ticker list"},{"symbol":"SC","name":"Summit Corp","source":"CSV ticker list"},{"symbol":"SCA","name":"Summit Core Analytics","source":"CSV ticker list"},{"symbol":"SCC","name":"Synapse Core Corp","source":"CSV ticker list"},{"symbol":"SCD","name":"Stratus Core Dynamics","source":"CSV ticker list"},{"symbol":"SCEA","name":"Summit Brands Holdings","source":"CSV ticker list"},{"symbol":"SCG","name":"Summit Core Group","source":"CSV ticker list"},{"symbol":"SCH","name":"Stratus Chemicals Holdings","source":"CSV ticker list"},{"symbol":"SCI","name":"Synapse Core Intelligence","source":"CSV ticker list"},{"symbol":"SCL","name":"Stratus Core Labs","source":"CSV ticker list"},{"symbol":"SCN","name":"Synapse Core Networks","source":"CSV ticker list"},{"symbol":"SCS","name":"Stratus Core Systems","source":"CSV ticker list"},{"symbol":"SD","name":"Summit Digital","source":"CSV ticker list"},{"symbol":"SDC","name":"Summit Development Corp","source":"CSV ticker list"},{"symbol":"SDG","name":"Synapse Distributors Group","source":"CSV ticker list"},{"symbol":"SDH","name":"Synapse Development Holdings","source":"CSV ticker list"},{"symbol":"SDI","name":"Synapse Development Inc","source":"CSV ticker list"},{"symbol":"SDL","name":"Synapse Development Ltd","source":"CSV ticker list"},{"symbol":"SDMA","name":"Cyber CleanTech Holdings","source":"CSV ticker list"},{"symbol":"SDTV","name":"Alpha Insurance Inc","source":"CSV ticker list"},{"symbol":"SEC","name":"Synapse Estate Corp","source":"CSV ticker list"},{"symbol":"SEG","name":"Synapse Entertainment Group","source":"CSV ticker list"},{"symbol":"SEH","name":"Summit Electric Holdings","source":"CSV ticker list"},{"symbol":"SEI","name":"Synapse Estate Inc","source":"CSV ticker list"},{"symbol":"SEL","name":"Summit Engineering Ltd","source":"CSV ticker list"},{"symbol":"SFBA","name":"Prism Core Group","source":"CSV ticker list"},{"symbol":"SFC","name":"Stratus Foods Corp","source":"CSV ticker list"},{"symbol":"SFG","name":"Stratus Foods Group","source":"CSV ticker list"},{"symbol":"SFH","name":"Stratus Foods Holdings","source":"CSV ticker list"},{"symbol":"SFI","name":"Stratus Foods Inc","source":"CSV ticker list"},{"symbol":"SFL","name":"Synapse Financial Ltd","source":"CSV ticker list"},{"symbol":"SG","name":"Stratus Global","source":"CSV ticker list"},{"symbol":"SGC","name":"Summit Gas Corp","source":"CSV ticker list"},{"symbol":"SGD","name":"Summit Global Dynamics","source":"CSV ticker list"},{"symbol":"SGDM","name":"Apex Motors Group","source":"CSV ticker list"},{"symbol":"SGG","name":"Stratus Global Global","source":"CSV ticker list"},{"symbol":"SGH","name":"Stratus Gold Holdings","source":"CSV ticker list"},{"symbol":"SGI","name":"Summit Global Intelligence","source":"CSV ticker list"},{"symbol":"SGL","name":"Synapse Global Labs","source":"CSV ticker list"},{"symbol":"SGN","name":"Summit Global Networks","source":"CSV ticker list"},{"symbol":"SGQK","name":"Horizon Core Systems","source":"CSV ticker list"},{"symbol":"SGS","name":"Synapse Global Systems","source":"CSV ticker list"},{"symbol":"SGT","name":"Synapse Global Technologies","source":"CSV ticker list"},{"symbol":"SH","name":"Stratus Holdings","source":"CSV ticker list"},{"symbol":"SHC","name":"Summit Health Corp","source":"CSV ticker list"},{"symbol":"SHG","name":"Summit Health Group","source":"CSV ticker list"},{"symbol":"SHL","name":"Stratus Health Ltd","source":"CSV ticker list"},{"symbol":"SHZV","name":"Nova Estate Inc","source":"CSV ticker list"},{"symbol":"SI","name":"Stratus Innovation","source":"CSV ticker list"},{"symbol":"SIC","name":"Stratus Industries Corp","source":"CSV ticker list"},{"symbol":"SIG","name":"Stratus Insurance Group","source":"CSV ticker list"},{"symbol":"SIH","name":"Summit Infrastructure Holdings","source":"CSV ticker list"},{"symbol":"SIL","name":"Synapse Insurance Ltd","source":"CSV ticker list"},{"symbol":"SJDZ","name":"Vanguard Global Intelligence","source":"CSV ticker list"},{"symbol":"SJTH","name":"Stratus Core Digital","source":"CSV ticker list"},{"symbol":"SJUL","name":"Infinitum Water Holdings","source":"CSV ticker list"},{"symbol":"SKMH","name":"Nexus Gas Corp","source":"CSV ticker list"},{"symbol":"SL","name":"Synapse Labs","source":"CSV ticker list"},{"symbol":"SLC","name":"Summit Lifesciences Corp","source":"CSV ticker list"},{"symbol":"SLH","name":"Stratus Logistics Holdings","source":"CSV ticker list"},{"symbol":"SLI","name":"Summit Logistics Inc","source":"CSV ticker list"},{"symbol":"SMC","name":"Synapse Motors Corp","source":"CSV ticker list"},{"symbol":"SMG","name":"Stratus Medical Group","source":"CSV ticker list"},{"symbol":"SMH","name":"Synapse Materials Holdings","source":"CSV ticker list"},{"symbol":"SMI","name":"Stratus Materials Inc","source":"CSV ticker list"},{"symbol":"SML","name":"Synapse Materials Ltd","source":"CSV ticker list"},{"symbol":"SMPS","name":"Quantum Automotive Corp","source":"CSV ticker list"},{"symbol":"SN","name":"Synapse Networks","source":"CSV ticker list"},{"symbol":"SNC","name":"Stratus Next Corp","source":"CSV ticker list"},{"symbol":"SND","name":"Summit Next Dynamics","source":"CSV ticker list"},{"symbol":"SNEN","name":"Synapse Manufacturing Corp","source":"CSV ticker list"},{"symbol":"SNG","name":"Stratus Next Global","source":"CSV ticker list"},{"symbol":"SNH","name":"Summit Next Holdings","source":"CSV ticker list"},{"symbol":"SNI","name":"Synapse Next Inc","source":"CSV ticker list"},{"symbol":"SNL","name":"Summit Next Labs","source":"CSV ticker list"},{"symbol":"SNN","name":"Synapse Next Networks","source":"CSV ticker list"},{"symbol":"SNS","name":"Stratus Next Solutions","source":"CSV ticker list"},{"symbol":"SNWO","name":"Quantum Global Global","source":"CSV ticker list"},{"symbol":"SOEL","name":"Quantum Core Global","source":"CSV ticker list"},{"symbol":"SOPJ","name":"Quantum Systems","source":"CSV ticker list"},{"symbol":"SPC","name":"Synapse Properties Corp","source":"CSV ticker list"},{"symbol":"SPG","name":"Synapse Petroleum Group","source":"CSV ticker list"},{"symbol":"SPH","name":"Stratus Petroleum Holdings","source":"CSV ticker list"},{"symbol":"SPI","name":"Summit Partners Inc","source":"CSV ticker list"},{"symbol":"SPL","name":"Stratus Petroleum Ltd","source":"CSV ticker list"},{"symbol":"SPPH","name":"Summit Gold Corp","source":"CSV ticker list"},{"symbol":"SQA","name":"Stratus Quantum Analytics","source":"CSV ticker list"},{"symbol":"SQG","name":"Synapse Quantum Global","source":"CSV ticker list"},{"symbol":"SQH","name":"Synapse Quantum Holdings","source":"CSV ticker list"},{"symbol":"SQI","name":"Stratus Quantum Intelligence","source":"CSV ticker list"},{"symbol":"SQS","name":"Stratus Quantum Software","source":"CSV ticker list"},{"symbol":"SQT","name":"Summit Quantum Technologies","source":"CSV ticker list"},{"symbol":"SRC","name":"Summit Retail Corp","source":"CSV ticker list"},{"symbol":"SREE","name":"Summit Foods Corp","source":"CSV ticker list"},{"symbol":"SRG","name":"Stratus Realty Group","source":"CSV ticker list"},{"symbol":"SRH","name":"Summit Realty Holdings","source":"CSV ticker list"},{"symbol":"SRI","name":"Summit Resources Inc","source":"CSV ticker list"},{"symbol":"SRL","name":"Stratus Rail Ltd","source":"CSV ticker list"},{"symbol":"SS","name":"Synapse Software","source":"CSV ticker list"},{"symbol":"SSBE","name":"Apex Financial Group","source":"CSV ticker list"},{"symbol":"SSC","name":"Summit Solar Corp","source":"CSV ticker list"},{"symbol":"SSG","name":"Summit Supermarkets Group","source":"CSV ticker list"},{"symbol":"SSH","name":"Summit Supermarkets Holdings","source":"CSV ticker list"},{"symbol":"SSI","name":"Synapse Supermarkets Inc","source":"CSV ticker list"},{"symbol":"SSL","name":"Summit Supermarkets Ltd","source":"CSV ticker list"},{"symbol":"ST","name":"Stratus Technologies","source":"CSV ticker list"},{"symbol":"STG","name":"Synapse Trust Group","source":"CSV ticker list"},{"symbol":"STH","name":"Synapse Therapeutics Holdings","source":"CSV ticker list"},{"symbol":"STI","name":"Synapse Trust Inc","source":"CSV ticker list"},{"symbol":"STL","name":"Summit Therapeutics Ltd","source":"CSV ticker list"},{"symbol":"STR","name":"Stratus Systems","source":"CSV ticker list"},{"symbol":"STRA","name":"Stratus Digital","source":"CSV ticker list"},{"symbol":"STRX","name":"Stratus Next Networks","source":"CSV ticker list"},{"symbol":"SUC","name":"Synapse Utilities Corp","source":"CSV ticker list"},{"symbol":"SUCO","name":"Apex Analytics","source":"CSV ticker list"},{"symbol":"SUG","name":"Summit Utilities Group","source":"CSV ticker list"},{"symbol":"SUH","name":"Stratus Utilities Holdings","source":"CSV ticker list"},{"symbol":"SUI","name":"Summit Utilities Inc","source":"CSV ticker list"},{"symbol":"SUL","name":"Synapse Utilities Ltd","source":"CSV ticker list"},{"symbol":"SUM","name":"Summit Solutions","source":"CSV ticker list"},{"symbol":"SUMM","name":"Summit Analytics","source":"CSV ticker list"},{"symbol":"SUMU","name":"Nexus Brands Group","source":"CSV ticker list"},{"symbol":"SUMX","name":"Summit Innovation","source":"CSV ticker list"},{"symbol":"SVUU","name":"Matrix Gold Corp","source":"CSV ticker list"},{"symbol":"SVYD","name":"Vanguard Products Inc","source":"CSV ticker list"},{"symbol":"SWBC","name":"Quantum Dynamics","source":"CSV ticker list"},{"symbol":"SWC","name":"Summit Water Corp","source":"CSV ticker list"},{"symbol":"SWG","name":"Stratus Water Group","source":"CSV ticker list"},{"symbol":"SWH","name":"Synapse Water Holdings","source":"CSV ticker list"},{"symbol":"SWI","name":"Summit Water Inc","source":"CSV ticker list"},{"symbol":"SWL","name":"Synapse Wealth Ltd","source":"CSV ticker list"},{"symbol":"SWME","name":"Prism Financial Inc","source":"CSV ticker list"},{"symbol":"SXIY","name":"Stratus Motors Ltd","source":"CSV ticker list"},{"symbol":"SYGM","name":"Apex Beverages Corp","source":"CSV ticker list"},{"symbol":"SYN","name":"Synapse Dynamics","source":"CSV ticker list"},{"symbol":"SYNA","name":"Synapse Entertainment Inc","source":"CSV ticker list"},{"symbol":"SYNX","name":"Synapse Core Inc","source":"CSV ticker list"},{"symbol":"SZTJ","name":"Vanguard Development Corp","source":"CSV ticker list"},{"symbol":"TAOA","name":"Vanguard Mining Inc","source":"CSV ticker list"},{"symbol":"TAWL","name":"Nova Next Dynamics","source":"CSV ticker list"},{"symbol":"TBJA","name":"Summit Trust Ltd","source":"CSV ticker list"},{"symbol":"TEXN","name":"Aether Rail Holdings","source":"CSV ticker list"},{"symbol":"TFCG","name":"Infinitum Core Corp","source":"CSV ticker list"},{"symbol":"TFUT","name":"Zephyr Petroleum Inc","source":"CSV ticker list"},{"symbol":"TGXE","name":"Apex Insurance Corp","source":"CSV ticker list"},{"symbol":"THHB","name":"Cyber Inc","source":"CSV ticker list"},{"symbol":"TIZI","name":"Nova Global Inc","source":"CSV ticker list"},{"symbol":"TKFU","name":"Aether Innovation","source":"CSV ticker list"},{"symbol":"TKJN","name":"Apex Logistics Inc","source":"CSV ticker list"},{"symbol":"TKKA","name":"Vanguard Electric Corp","source":"CSV ticker list"},{"symbol":"TLJE","name":"Horizon Entertainment Corp","source":"CSV ticker list"},{"symbol":"TLTR","name":"Catalyst Chemicals Group","source":"CSV ticker list"},{"symbol":"TLVW","name":"Vanguard Solar Holdings","source":"CSV ticker list"},{"symbol":"TMHW","name":"Nexus Care Group","source":"CSV ticker list"},{"symbol":"TMTT","name":"Quantum Global Intelligence","source":"CSV ticker list"},{"symbol":"TMUV","name":"Synapse Capital Corp","source":"CSV ticker list"},{"symbol":"TNAN","name":"Zephyr CleanTech Inc","source":"CSV ticker list"},{"symbol":"TNUE","name":"Matrix Group","source":"CSV ticker list"},{"symbol":"TOBT","name":"Nexus Estate Group","source":"CSV ticker list"},{"symbol":"TPEI","name":"Quantum Core Labs","source":"CSV ticker list"},{"symbol":"TPFI","name":"Orion Resources Inc","source":"CSV ticker list"},{"symbol":"TRNI","name":"Infinitum Entertainment Corp","source":"CSV ticker list"},{"symbol":"TROP","name":"Matrix Brands Inc","source":"CSV ticker list"},{"symbol":"TSLA","name":"Tesla Inc.","source":"CSV ticker list"},{"symbol":"TTIB","name":"Alpha Global Innovation","source":"CSV ticker list"},{"symbol":"TTIR","name":"Quantum Products Group","source":"CSV ticker list"},{"symbol":"TTXP","name":"Stratus Motors Corp","source":"CSV ticker list"},{"symbol":"TUHR","name":"Vertex Trust Holdings","source":"CSV ticker list"},{"symbol":"TUKI","name":"Alpha Next Networks","source":"CSV ticker list"},{"symbol":"TUOL","name":"Orion Electric Ltd","source":"CSV ticker list"},{"symbol":"TUQU","name":"Vanguard Lifesciences Corp","source":"CSV ticker list"},{"symbol":"TVOR","name":"Nova Brands Inc","source":"CSV ticker list"},{"symbol":"TWFF","name":"Catalyst Software","source":"CSV ticker list"},{"symbol":"TWUV","name":"Apex Automation Ltd","source":"CSV ticker list"},{"symbol":"TXRS","name":"Synapse Electric Ltd","source":"CSV ticker list"},{"symbol":"TXVA","name":"Stratus Utilities Ltd","source":"CSV ticker list"},{"symbol":"TYHW","name":"Cyber Care Holdings","source":"CSV ticker list"},{"symbol":"TYLJ","name":"Vertex Therapeutics Ltd","source":"CSV ticker list"},{"symbol":"TYQN","name":"Nexus Estate Corp","source":"CSV ticker list"},{"symbol":"TZWD","name":"Nova Insurance Group","source":"CSV ticker list"},{"symbol":"UAOM","name":"Nexus Bank Corp","source":"CSV ticker list"},{"symbol":"UAWO","name":"Aether Apparel Corp","source":"CSV ticker list"},{"symbol":"UBUB","name":"Horizon Solar Corp","source":"CSV ticker list"},{"symbol":"UCEA","name":"Summit Brands Corp","source":"CSV ticker list"},{"symbol":"UFEA","name":"Vanguard Beverages Inc","source":"CSV ticker list"},{"symbol":"UFIK","name":"Catalyst Asset Inc","source":"CSV ticker list"},{"symbol":"UFTN","name":"Vertex Water Inc","source":"CSV ticker list"},{"symbol":"UFUP","name":"Nexus Resources Group","source":"CSV ticker list"},{"symbol":"UGHH","name":"Quantum CleanTech Inc","source":"CSV ticker list"},{"symbol":"UGIK","name":"Stratus Manufacturing Ltd","source":"CSV ticker list"},{"symbol":"UGJX","name":"Horizon Next Group","source":"CSV ticker list"},{"symbol":"UGMJ","name":"Cyber Capital Inc","source":"CSV ticker list"},{"symbol":"UHEA","name":"Beta Global Global","source":"CSV ticker list"},{"symbol":"UHQN","name":"Summit Next Corp","source":"CSV ticker list"},{"symbol":"UIHJ","name":"Infinitum CleanTech Corp","source":"CSV ticker list"},{"symbol":"UIJW","name":"Synapse Electric Group","source":"CSV ticker list"},{"symbol":"UIMJ","name":"Nexus Pharma Holdings","source":"CSV ticker list"},{"symbol":"UJTR","name":"Synapse Mining Group","source":"CSV ticker list"},{"symbol":"UKEQ","name":"Stratus Mining Ltd","source":"CSV ticker list"},{"symbol":"ULFD","name":"Apex Rail Group","source":"CSV ticker list"},{"symbol":"ULQL","name":"Cyber Global Analytics","source":"CSV ticker list"},{"symbol":"ULWL","name":"Summit Systems","source":"CSV ticker list"},{"symbol":"UMBH","name":"Horizon Foods Ltd","source":"CSV ticker list"},{"symbol":"UMPU","name":"Nexus Software","source":"CSV ticker list"},{"symbol":"UNH","name":"UnitedHealth Group Inc.","source":"CSV ticker list"},{"symbol":"UNOG","name":"Cyber Properties Group","source":"CSV ticker list"},{"symbol":"UOIK","name":"Nova Retail Ltd","source":"CSV ticker list"},{"symbol":"UOPI","name":"Zephyr Automation Group","source":"CSV ticker list"},{"symbol":"UPDZ","name":"Horizon Properties Inc","source":"CSV ticker list"},{"symbol":"UPMH","name":"Prism Media Corp","source":"CSV ticker list"},{"symbol":"UPVK","name":"Synapse Next Corp","source":"CSV ticker list"},{"symbol":"URER","name":"Vertex Gold Inc","source":"CSV ticker list"},{"symbol":"URHF","name":"Synapse Water Group","source":"CSV ticker list"},{"symbol":"URXT","name":"Apex Media Inc","source":"CSV ticker list"},{"symbol":"URZB","name":"Horizon Group","source":"CSV ticker list"},{"symbol":"UUQJ","name":"Apex Logistics Ltd","source":"CSV ticker list"},{"symbol":"UUYZ","name":"Alpha Partners Corp","source":"CSV ticker list"},{"symbol":"UVQX","name":"Stratus Apparel Corp","source":"CSV ticker list"},{"symbol":"UWEK","name":"Matrix Products Group","source":"CSV ticker list"},{"symbol":"UWFY","name":"Stratus Products Holdings","source":"CSV ticker list"},{"symbol":"UXCN","name":"Alpha Core Inc","source":"CSV ticker list"},{"symbol":"UXDJ","name":"Stratus Automation Inc","source":"CSV ticker list"},{"symbol":"UXTY","name":"Cyber Media Holdings","source":"CSV ticker list"},{"symbol":"UYCG","name":"Summit Next Networks","source":"CSV ticker list"},{"symbol":"UYKA","name":"Summit Software","source":"CSV ticker list"},{"symbol":"UYWN","name":"Synapse Global Inc","source":"CSV ticker list"},{"symbol":"UZOX","name":"Orion Solar Inc","source":"CSV ticker list"},{"symbol":"UZTZ","name":"Apex Quantum Software","source":"CSV ticker list"},{"symbol":"V","name":"Visa Inc.","source":"CSV ticker list"},{"symbol":"VA","name":"Vanguard Analytics","source":"CSV ticker list"},{"symbol":"VAC","name":"Vertex Automation Corp","source":"CSV ticker list"},{"symbol":"VAG","name":"Vertex Automotive Group","source":"CSV ticker list"},{"symbol":"VAH","name":"Vanguard Automation Holdings","source":"CSV ticker list"},{"symbol":"VAHP","name":"Horizon Capital Group","source":"CSV ticker list"},{"symbol":"VAI","name":"Vanguard Automotive Inc","source":"CSV ticker list"},{"symbol":"VAL","name":"Vertex Aerospace Ltd","source":"CSV ticker list"},{"symbol":"VAN","name":"Vanguard Dynamics","source":"CSV ticker list"},{"symbol":"VANG","name":"Vanguard Intelligence","source":"CSV ticker list"},{"symbol":"VANX","name":"Vanguard Innovation","source":"CSV ticker list"},{"symbol":"VARF","name":"Cyber Chemicals Corp","source":"CSV ticker list"},{"symbol":"VBC","name":"Vertex Bank Corp","source":"CSV ticker list"},{"symbol":"VBDF","name":"Zephyr Properties Inc","source":"CSV ticker list"},{"symbol":"VBDZ","name":"Stratus Water Inc","source":"CSV ticker list"},{"symbol":"VBG","name":"Vanguard Beverages Group","source":"CSV ticker list"},{"symbol":"VBH","name":"Vertex Brands Holdings","source":"CSV ticker list"},{"symbol":"VBI","name":"Vanguard Bank Inc","source":"CSV ticker list"},{"symbol":"VBL","name":"Vanguard Bank Ltd","source":"CSV ticker list"},{"symbol":"VC","name":"Vertex Corp","source":"CSV ticker list"},{"symbol":"VCA","name":"Vertex Core Analytics","source":"CSV ticker list"},{"symbol":"VCC","name":"Vanguard CleanTech Corp","source":"CSV ticker list"},{"symbol":"VCG","name":"Vanguard Core Group","source":"CSV ticker list"},{"symbol":"VCH","name":"Vanguard Core Holdings","source":"CSV ticker list"},{"symbol":"VCI","name":"Vanguard Care Inc","source":"CSV ticker list"},{"symbol":"VCL","name":"Vertex Care Ltd","source":"CSV ticker list"},{"symbol":"VCN","name":"Vertex Core Networks","source":"CSV ticker list"},{"symbol":"VCS","name":"Vanguard Core Systems","source":"CSV ticker list"},{"symbol":"VCT","name":"Vanguard Core Technologies","source":"CSV ticker list"},{"symbol":"VD","name":"Vertex Dynamics","source":"CSV ticker list"},{"symbol":"VDC","name":"Vertex Development Corp","source":"CSV ticker list"},{"symbol":"VDG","name":"Vertex Distributors Group","source":"CSV ticker list"},{"symbol":"VDH","name":"Vertex Distributors Holdings","source":"CSV ticker list"},{"symbol":"VDI","name":"Vertex Distributors Inc","source":"CSV ticker list"},{"symbol":"VDL","name":"Vertex Distributors Ltd","source":"CSV ticker list"},{"symbol":"VDNF","name":"Synapse Materials Inc","source":"CSV ticker list"},{"symbol":"VDOB","name":"Aether Water Group","source":"CSV ticker list"},{"symbol":"VEC","name":"Vertex Electric Corp","source":"CSV ticker list"},{"symbol":"VEG","name":"Vanguard Energy Group","source":"CSV ticker list"},{"symbol":"VEH","name":"Vanguard Estate Holdings","source":"CSV ticker list"},{"symbol":"VEI","name":"Vanguard Engineering Inc","source":"CSV ticker list"},{"symbol":"VEL","name":"Vanguard Engineering Ltd","source":"CSV ticker list"},{"symbol":"VER","name":"Vertex Networks","source":"CSV ticker list"},{"symbol":"VERT","name":"Vertex Digital","source":"CSV ticker list"},{"symbol":"VERX","name":"Vertex Lifesciences Corp","source":"CSV ticker list"},{"symbol":"VFC","name":"Vertex Financial Corp","source":"CSV ticker list"},{"symbol":"VFFQ","name":"Cyber Distributors Holdings","source":"CSV ticker list"},{"symbol":"VFH","name":"Vertex Foods Holdings","source":"CSV ticker list"},{"symbol":"VFVW","name":"Vertex Partners Group","source":"CSV ticker list"},{"symbol":"VG","name":"Vanguard Group","source":"CSV ticker list"},{"symbol":"VGA","name":"Vertex Global Analytics","source":"CSV ticker list"},{"symbol":"VGC","name":"Vanguard Global Corp","source":"CSV ticker list"},{"symbol":"VGD","name":"Vanguard Global Dynamics","source":"CSV ticker list"},{"symbol":"VGG","name":"Vanguard Global Global","source":"CSV ticker list"},{"symbol":"VGH","name":"Vertex Gold Holdings","source":"CSV ticker list"},{"symbol":"VGHZ","name":"Synapse Core Labs","source":"CSV ticker list"},{"symbol":"VGI","name":"Vertex Global Intelligence","source":"CSV ticker list"},{"symbol":"VGJY","name":"Vertex Development Group","source":"CSV ticker list"},{"symbol":"VGL","name":"Vertex Global Labs","source":"CSV ticker list"},{"symbol":"VGN","name":"Vertex Global Networks","source":"CSV ticker list"},{"symbol":"VGS","name":"Vertex Global Software","source":"CSV ticker list"},{"symbol":"VGT","name":"Vanguard Global Technologies","source":"CSV ticker list"},{"symbol":"VH","name":"Vertex Holdings","source":"CSV ticker list"},{"symbol":"VHI","name":"Vanguard Health Inc","source":"CSV ticker list"},{"symbol":"VHKN","name":"Vanguard Electric Inc","source":"CSV ticker list"},{"symbol":"VHL","name":"Vertex Health Ltd","source":"CSV ticker list"},{"symbol":"VHZY","name":"Zephyr Manufacturing Corp","source":"CSV ticker list"},{"symbol":"VI","name":"Vanguard Inc","source":"CSV ticker list"},{"symbol":"VICP","name":"Cyber Chemicals Holdings","source":"CSV ticker list"},{"symbol":"VIG","name":"Vertex Infrastructure Group","source":"CSV ticker list"},{"symbol":"VII","name":"Vanguard Infrastructure Inc","source":"CSV ticker list"},{"symbol":"VIKL","name":"Stratus Manufacturing Group","source":"CSV ticker list"},{"symbol":"VIL","name":"Vertex Infrastructure Ltd","source":"CSV ticker list"},{"symbol":"VJYK","name":"Infinitum Core Innovation","source":"CSV ticker list"},{"symbol":"VKTF","name":"Nexus Systems","source":"CSV ticker list"},{"symbol":"VL","name":"Vanguard Labs","source":"CSV ticker list"},{"symbol":"VLC","name":"Vanguard Logistics Corp","source":"CSV ticker list"},{"symbol":"VLH","name":"Vanguard Logistics Holdings","source":"CSV ticker list"},{"symbol":"VLI","name":"Vertex Logistics Inc","source":"CSV ticker list"},{"symbol":"VLL","name":"Vertex Logistics Ltd","source":"CSV ticker list"},{"symbol":"VLYM","name":"Alpha Realty Ltd","source":"CSV ticker list"},{"symbol":"VLYX","name":"Aether Dynamics","source":"CSV ticker list"},{"symbol":"VMG","name":"Vanguard Materials Group","source":"CSV ticker list"},{"symbol":"VMI","name":"Vanguard Manufacturing Inc","source":"CSV ticker list"},{"symbol":"VML","name":"Vanguard Materials Ltd","source":"CSV ticker list"},{"symbol":"VN","name":"Vanguard Networks","source":"CSV ticker list"},{"symbol":"VNC","name":"Vertex Next Corp","source":"CSV ticker list"},{"symbol":"VND","name":"Vanguard Next Dynamics","source":"CSV ticker list"},{"symbol":"VNG","name":"Vanguard Next Group","source":"CSV ticker list"},{"symbol":"VNI","name":"Vertex Next Innovation","source":"CSV ticker list"},{"symbol":"VNL","name":"Vertex Next Labs","source":"CSV ticker list"},{"symbol":"VNN","name":"Vertex Next Networks","source":"CSV ticker list"},{"symbol":"VNS","name":"Vanguard Next Solutions","source":"CSV ticker list"},{"symbol":"VOLU","name":"Apex Infrastructure Holdings","source":"CSV ticker list"},{"symbol":"VOZI","name":"Zephyr Core Global","source":"CSV ticker list"},{"symbol":"VPC","name":"Vanguard Properties Corp","source":"CSV ticker list"},{"symbol":"VPG","name":"Vertex Products Group","source":"CSV ticker list"},{"symbol":"VPH","name":"Vertex Properties Holdings","source":"CSV ticker list"},{"symbol":"VPI","name":"Vanguard Petroleum Inc","source":"CSV ticker list"},{"symbol":"VPL","name":"Vertex Products Ltd","source":"CSV ticker list"},{"symbol":"VPRA","name":"Beta Petroleum Corp","source":"CSV ticker list"},{"symbol":"VPUL","name":"Horizon Systems","source":"CSV ticker list"},{"symbol":"VQA","name":"Vanguard Quantum Analytics","source":"CSV ticker list"},{"symbol":"VQC","name":"Vanguard Quantum Corp","source":"CSV ticker list"},{"symbol":"VQG","name":"Vanguard Quantum Group","source":"CSV ticker list"},{"symbol":"VQH","name":"Vertex Quantum Holdings","source":"CSV ticker list"},{"symbol":"VQI","name":"Vertex Quantum Inc","source":"CSV ticker list"},{"symbol":"VQL","name":"Vertex Quantum Labs","source":"CSV ticker list"},{"symbol":"VQN","name":"Vanguard Quantum Networks","source":"CSV ticker list"},{"symbol":"VQS","name":"Vanguard Quantum Software","source":"CSV ticker list"},{"symbol":"VRC","name":"Vertex Realty Corp","source":"CSV ticker list"},{"symbol":"VRG","name":"Vanguard Rail Group","source":"CSV ticker list"},{"symbol":"VRH","name":"Vertex Rail Holdings","source":"CSV ticker list"},{"symbol":"VRI","name":"Vertex Renewables Inc","source":"CSV ticker list"},{"symbol":"VRL","name":"Vertex Resources Ltd","source":"CSV ticker list"},{"symbol":"VS","name":"Vertex Solutions","source":"CSV ticker list"},{"symbol":"VSBQ","name":"Vanguard Retail Inc","source":"CSV ticker list"},{"symbol":"VSC","name":"Vanguard Steel Corp","source":"CSV ticker list"},{"symbol":"VSG","name":"Vanguard Supermarkets Group","source":"CSV ticker list"},{"symbol":"VSH","name":"Vanguard Supermarkets Holdings","source":"CSV ticker list"},{"symbol":"VSI","name":"Vanguard Solar Inc","source":"CSV ticker list"},{"symbol":"VSL","name":"Vanguard Supermarkets Ltd","source":"CSV ticker list"},{"symbol":"VSNJ","name":"Stratus Global Intelligence","source":"CSV ticker list"},{"symbol":"VSYY","name":"Orion Petroleum Inc","source":"CSV ticker list"},{"symbol":"VT","name":"Vanguard Technologies","source":"CSV ticker list"},{"symbol":"VTC","name":"Vertex Therapeutics Corp","source":"CSV ticker list"},{"symbol":"VTH","name":"Vanguard Trust Holdings","source":"CSV ticker list"},{"symbol":"VTI","name":"Vanguard Therapeutics Inc","source":"CSV ticker list"},{"symbol":"VTL","name":"Vertex Trust Ltd","source":"CSV ticker list"},{"symbol":"VUBN","name":"Vertex Quantum Intelligence","source":"CSV ticker list"},{"symbol":"VUC","name":"Vanguard Utilities Corp","source":"CSV ticker list"},{"symbol":"VUI","name":"Vanguard Utilities Inc","source":"CSV ticker list"},{"symbol":"VUL","name":"Vertex Utilities Ltd","source":"CSV ticker list"},{"symbol":"VUMJ","name":"Vanguard Bank Holdings","source":"CSV ticker list"},{"symbol":"VVEA","name":"Orion Industries Group","source":"CSV ticker list"},{"symbol":"VVHO","name":"Prism Inc","source":"CSV ticker list"},{"symbol":"VVYB","name":"Beta CleanTech Holdings","source":"CSV ticker list"},{"symbol":"VWG","name":"Vanguard Wealth Group","source":"CSV ticker list"},{"symbol":"VWH","name":"Vanguard Water Holdings","source":"CSV ticker list"},{"symbol":"VWHE","name":"Horizon Properties Holdings","source":"CSV ticker list"},{"symbol":"VWI","name":"Vanguard Water Inc","source":"CSV ticker list"},{"symbol":"VWIW","name":"Vertex Solar Inc","source":"CSV ticker list"},{"symbol":"VWL","name":"Vertex Wealth Ltd","source":"CSV ticker list"},{"symbol":"VWOC","name":"Summit Group","source":"CSV ticker list"},{"symbol":"VWRX","name":"Aether Next Networks","source":"CSV ticker list"},{"symbol":"VZEE","name":"Aether CleanTech Corp","source":"CSV ticker list"},{"symbol":"VZKQ","name":"Summit Distributors Group","source":"CSV ticker list"},{"symbol":"WAYL","name":"Nexus Global","source":"CSV ticker list"},{"symbol":"WBRW","name":"Horizon Medical Ltd","source":"CSV ticker list"},{"symbol":"WBVS","name":"Apex Bio Corp","source":"CSV ticker list"},{"symbol":"WDEP","name":"Stratus Intelligence","source":"CSV ticker list"},{"symbol":"WDPN","name":"Vanguard Entertainment Holdings","source":"CSV ticker list"},{"symbol":"WDSS","name":"Summit Properties Inc","source":"CSV ticker list"},{"symbol":"WDSZ","name":"Catalyst Solutions","source":"CSV ticker list"},{"symbol":"WFUX","name":"Aether Quantum Labs","source":"CSV ticker list"},{"symbol":"WGBB","name":"Infinitum Global Solutions","source":"CSV ticker list"},{"symbol":"WGWC","name":"Horizon Energy Group","source":"CSV ticker list"},{"symbol":"WHDG","name":"Summit Core Solutions","source":"CSV ticker list"},{"symbol":"WHGD","name":"Orion Electric Holdings","source":"CSV ticker list"},{"symbol":"WHMG","name":"Zephyr Power Corp","source":"CSV ticker list"},{"symbol":"WHSV","name":"Apex Technologies","source":"CSV ticker list"},{"symbol":"WIEV","name":"Synapse Care Group","source":"CSV ticker list"},{"symbol":"WJED","name":"Synapse Engineering Ltd","source":"CSV ticker list"},{"symbol":"WMT","name":"Walmart Inc.","source":"CSV ticker list"},{"symbol":"WNKM","name":"Infinitum Inc","source":"CSV ticker list"},{"symbol":"WOWW","name":"Summit Core Holdings","source":"CSV ticker list"},{"symbol":"WOZU","name":"Nexus Technologies","source":"CSV ticker list"},{"symbol":"WPKT","name":"Stratus Mining Holdings","source":"CSV ticker list"},{"symbol":"WQEO","name":"Catalyst Next Software","source":"CSV ticker list"},{"symbol":"WRBC","name":"Cyber Group","source":"CSV ticker list"},{"symbol":"WRME","name":"Vanguard Quantum Solutions","source":"CSV ticker list"},{"symbol":"WRVQ","name":"Vanguard Quantum Holdings","source":"CSV ticker list"},{"symbol":"WSTT","name":"Nexus Infrastructure Ltd","source":"CSV ticker list"},{"symbol":"WSTW","name":"Nexus Digital","source":"CSV ticker list"},{"symbol":"WSVY","name":"Catalyst Gold Corp","source":"CSV ticker list"},{"symbol":"WSYF","name":"Apex Aerospace Corp","source":"CSV ticker list"},{"symbol":"WTJW","name":"Matrix Infrastructure Holdings","source":"CSV ticker list"},{"symbol":"WTSI","name":"Nova Gold Corp","source":"CSV ticker list"},{"symbol":"WTZZ","name":"Vanguard Wealth Inc","source":"CSV ticker list"},{"symbol":"WXEJ","name":"Vertex Gold Ltd","source":"CSV ticker list"},{"symbol":"WYJY","name":"Nexus Care Ltd","source":"CSV ticker list"},{"symbol":"WYKV","name":"Apex Innovation","source":"CSV ticker list"},{"symbol":"WYRO","name":"Summit Entertainment Ltd","source":"CSV ticker list"},{"symbol":"WZET","name":"Horizon Aerospace Ltd","source":"CSV ticker list"},{"symbol":"XAUO","name":"Beta Global Corp","source":"CSV ticker list"},{"symbol":"XAYI","name":"Cyber Water Group","source":"CSV ticker list"},{"symbol":"XBGH","name":"Alpha Infrastructure Holdings","source":"CSV ticker list"},{"symbol":"XCAT","name":"Matrix Quantum Intelligence","source":"CSV ticker list"},{"symbol":"XCVC","name":"Catalyst Energy Group","source":"CSV ticker list"},{"symbol":"XDTW","name":"Beta Global","source":"CSV ticker list"},{"symbol":"XEFN","name":"Aether Inc","source":"CSV ticker list"},{"symbol":"XGKS","name":"Apex Manufacturing Inc","source":"CSV ticker list"},{"symbol":"XITV","name":"Nova CleanTech Ltd","source":"CSV ticker list"},{"symbol":"XJFQ","name":"Apex Next Intelligence","source":"CSV ticker list"},{"symbol":"XJQC","name":"Alpha Renewables Holdings","source":"CSV ticker list"},{"symbol":"XLGF","name":"Vanguard Solutions","source":"CSV ticker list"},{"symbol":"XLYN","name":"Nexus Chemicals Ltd","source":"CSV ticker list"},{"symbol":"XMEA","name":"Apex CleanTech Ltd","source":"CSV ticker list"},{"symbol":"XNQT","name":"Apex Industries Inc","source":"CSV ticker list"},{"symbol":"XOM","name":"Exxon Mobil Corporation","source":"CSV ticker list"},{"symbol":"XQJX","name":"Horizon Products Ltd","source":"CSV ticker list"},{"symbol":"XRCA","name":"Vanguard Motors Inc","source":"CSV ticker list"},{"symbol":"XSFS","name":"Catalyst Aerospace Ltd","source":"CSV ticker list"},{"symbol":"XSTN","name":"Alpha Digital","source":"CSV ticker list"},{"symbol":"XTFG","name":"Alpha Steel Holdings","source":"CSV ticker list"},{"symbol":"XTOE","name":"Vertex Power Holdings","source":"CSV ticker list"},{"symbol":"XTRK","name":"Stratus Financial Holdings","source":"CSV ticker list"},{"symbol":"XWCH","name":"Aether Petroleum Group","source":"CSV ticker list"},{"symbol":"XWMM","name":"Zephyr Next Dynamics","source":"CSV ticker list"},{"symbol":"XXLX","name":"Apex Dynamics","source":"CSV ticker list"},{"symbol":"XZAU","name":"Vertex Engineering Group","source":"CSV ticker list"},{"symbol":"XZLA","name":"Summit Rail Ltd","source":"CSV ticker list"},{"symbol":"YAPU","name":"Nova Inc","source":"CSV ticker list"},{"symbol":"YBKM","name":"Catalyst Core Group","source":"CSV ticker list"},{"symbol":"YCMX","name":"Beta Therapeutics Ltd","source":"CSV ticker list"},{"symbol":"YCTI","name":"Catalyst Pharma Corp","source":"CSV ticker list"},{"symbol":"YDQL","name":"Matrix Analytics","source":"CSV ticker list"},{"symbol":"YEHI","name":"Vertex Medical Group","source":"CSV ticker list"},{"symbol":"YIEL","name":"Summit Media Group","source":"CSV ticker list"},{"symbol":"YISE","name":"Summit Realty Inc","source":"CSV ticker list"},{"symbol":"YJAR","name":"Vertex Mining Group","source":"CSV ticker list"},{"symbol":"YLVE","name":"Vertex Inc","source":"CSV ticker list"},{"symbol":"YNCQ","name":"Vertex Materials Inc","source":"CSV ticker list"},{"symbol":"YPDT","name":"Catalyst Core Labs","source":"CSV ticker list"},{"symbol":"YPEX","name":"Vanguard Renewables Holdings","source":"CSV ticker list"},{"symbol":"YPTW","name":"Apex Inc","source":"CSV ticker list"},{"symbol":"YPWJ","name":"Quantum Care Inc","source":"CSV ticker list"},{"symbol":"YSAU","name":"Stratus Quantum Solutions","source":"CSV ticker list"},{"symbol":"YSOM","name":"Stratus Core Holdings","source":"CSV ticker list"},{"symbol":"YSUJ","name":"Vertex Engineering Inc","source":"CSV ticker list"},{"symbol":"YTOE","name":"Alpha Entertainment Holdings","source":"CSV ticker list"},{"symbol":"YUGU","name":"Nova Pharma Corp","source":"CSV ticker list"},{"symbol":"YUHA","name":"Cyber Intelligence","source":"CSV ticker list"},{"symbol":"YVBF","name":"Stratus Automation Group","source":"CSV ticker list"},{"symbol":"YVPE","name":"Alpha Utilities Ltd","source":"CSV ticker list"},{"symbol":"YWEO","name":"Nova Materials Group","source":"CSV ticker list"},{"symbol":"YWLV","name":"Beta Financial Inc","source":"CSV ticker list"},{"symbol":"YXMD","name":"Catalyst Resources Ltd","source":"CSV ticker list"},{"symbol":"YXPG","name":"Quantum Quantum Inc","source":"CSV ticker list"},{"symbol":"YXYH","name":"Stratus Dynamics","source":"CSV ticker list"},{"symbol":"YYAR","name":"Summit Industries Holdings","source":"CSV ticker list"},{"symbol":"YYUY","name":"Stratus Resources Group","source":"CSV ticker list"},{"symbol":"YYWV","name":"Nexus Capital Inc","source":"CSV ticker list"},{"symbol":"ZA","name":"Zephyr Analytics","source":"CSV ticker list"},{"symbol":"ZAC","name":"Zephyr Automotive Corp","source":"CSV ticker list"},{"symbol":"ZACD","name":"Zephyr Solutions","source":"CSV ticker list"},{"symbol":"ZAG","name":"Zephyr Asset Group","source":"CSV ticker list"},{"symbol":"ZAH","name":"Zephyr Aerospace Holdings","source":"CSV ticker list"},{"symbol":"ZAIQ","name":"Cyber Chemicals Ltd","source":"CSV ticker list"},{"symbol":"ZAL","name":"Zephyr Apparel Ltd","source":"CSV ticker list"},{"symbol":"ZBC","name":"Zephyr Brands Corp","source":"CSV ticker list"},{"symbol":"ZBG","name":"Zephyr Beverages Group","source":"CSV ticker list"},{"symbol":"ZBH","name":"Zephyr Brands Holdings","source":"CSV ticker list"},{"symbol":"ZBL","name":"Zephyr Bio Ltd","source":"CSV ticker list"},{"symbol":"ZC","name":"Zephyr Corp","source":"CSV ticker list"},{"symbol":"ZCD","name":"Zephyr Core Digital","source":"CSV ticker list"},{"symbol":"ZCEF","name":"Nova Estate Group","source":"CSV ticker list"},{"symbol":"ZCG","name":"Zephyr Capital Group","source":"CSV ticker list"},{"symbol":"ZCH","name":"Zephyr Care Holdings","source":"CSV ticker list"},{"symbol":"ZCI","name":"Zephyr Core Intelligence","source":"CSV ticker list"},{"symbol":"ZCL","name":"Zephyr Capital Ltd","source":"CSV ticker list"},{"symbol":"ZCS","name":"Zephyr Core Software","source":"CSV ticker list"},{"symbol":"ZD","name":"Zephyr Digital","source":"CSV ticker list"},{"symbol":"ZEC","name":"Zephyr Engineering Corp","source":"CSV ticker list"},{"symbol":"ZEG","name":"Zephyr Energy Group","source":"CSV ticker list"},{"symbol":"ZEH","name":"Zephyr Engineering Holdings","source":"CSV ticker list"},{"symbol":"ZEI","name":"Zephyr Estate Inc","source":"CSV ticker list"},{"symbol":"ZEIN","name":"Catalyst CleanTech Corp","source":"CSV ticker list"},{"symbol":"ZEL","name":"Zephyr Estate Ltd","source":"CSV ticker list"},{"symbol":"ZEP","name":"Zephyr Software","source":"CSV ticker list"},{"symbol":"ZEPH","name":"Zephyr Medical Group","source":"CSV ticker list"},{"symbol":"ZEPX","name":"Zephyr Group","source":"CSV ticker list"},{"symbol":"ZEXR","name":"Synapse Quantum Software","source":"CSV ticker list"},{"symbol":"ZFKV","name":"Synapse Wealth Group","source":"CSV ticker list"},{"symbol":"ZFL","name":"Zephyr Financial Ltd","source":"CSV ticker list"},{"symbol":"ZFPG","name":"Zephyr Care Ltd","source":"CSV ticker list"},{"symbol":"ZFRW","name":"Orion Gold Inc","source":"CSV ticker list"},{"symbol":"ZG","name":"Zephyr Global","source":"CSV ticker list"},{"symbol":"ZGA","name":"Zephyr Global Analytics","source":"CSV ticker list"},{"symbol":"ZGG","name":"Zephyr Global Group","source":"CSV ticker list"},{"symbol":"ZGH","name":"Zephyr Global Holdings","source":"CSV ticker list"},{"symbol":"ZGI","name":"Zephyr Global Innovation","source":"CSV ticker list"},{"symbol":"ZGLA","name":"Vertex Core Global","source":"CSV ticker list"},{"symbol":"ZGN","name":"Zephyr Global Networks","source":"CSV ticker list"},{"symbol":"ZGS","name":"Zephyr Global Software","source":"CSV ticker list"},{"symbol":"ZH","name":"Zephyr Holdings","source":"CSV ticker list"},{"symbol":"ZHMC","name":"Quantum Medical Ltd","source":"CSV ticker list"},{"symbol":"ZHWZ","name":"Matrix Care Group","source":"CSV ticker list"},{"symbol":"ZI","name":"Zephyr Inc","source":"CSV ticker list"},{"symbol":"ZIC","name":"Zephyr Insurance Corp","source":"CSV ticker list"},{"symbol":"ZII","name":"Zephyr Infrastructure Inc","source":"CSV ticker list"},{"symbol":"ZIJC","name":"Nexus Products Corp","source":"CSV ticker list"},{"symbol":"ZISN","name":"Orion Realty Corp","source":"CSV ticker list"},{"symbol":"ZISY","name":"Nexus Care Inc","source":"CSV ticker list"},{"symbol":"ZKAX","name":"Vertex Utilities Inc","source":"CSV ticker list"},{"symbol":"ZKFO","name":"Vanguard Global","source":"CSV ticker list"},{"symbol":"ZKJN","name":"Infinitum Power Corp","source":"CSV ticker list"},{"symbol":"ZL","name":"Zephyr Labs","source":"CSV ticker list"},{"symbol":"ZLBG","name":"Vanguard Capital Inc","source":"CSV ticker list"},{"symbol":"ZLC","name":"Zephyr Logistics Corp","source":"CSV ticker list"},{"symbol":"ZLG","name":"Zephyr Lifesciences Group","source":"CSV ticker list"},{"symbol":"ZLH","name":"Zephyr Logistics Holdings","source":"CSV ticker list"},{"symbol":"ZLVH","name":"Nexus Innovation","source":"CSV ticker list"},{"symbol":"ZMC","name":"Zephyr Media Corp","source":"CSV ticker list"},{"symbol":"ZMG","name":"Zephyr Motors Group","source":"CSV ticker list"},{"symbol":"ZMI","name":"Zephyr Medical Inc","source":"CSV ticker list"},{"symbol":"ZML","name":"Zephyr Materials Ltd","source":"CSV ticker list"},{"symbol":"ZMWP","name":"Apex Lifesciences Group","source":"CSV ticker list"},{"symbol":"ZN","name":"Zephyr Networks","source":"CSV ticker list"},{"symbol":"ZNA","name":"Zephyr Next Analytics","source":"CSV ticker list"},{"symbol":"ZND","name":"Zephyr Next Digital","source":"CSV ticker list"},{"symbol":"ZNG","name":"Zephyr Next Group","source":"CSV ticker list"},{"symbol":"ZNI","name":"Zephyr Next Innovation","source":"CSV ticker list"},{"symbol":"ZNS","name":"Zephyr Next Systems","source":"CSV ticker list"},{"symbol":"ZNUX","name":"Cyber Financial Holdings","source":"CSV ticker list"},{"symbol":"ZPC","name":"Zephyr Pharma Corp","source":"CSV ticker list"},{"symbol":"ZPH","name":"Zephyr Properties Holdings","source":"CSV ticker list"},{"symbol":"ZPI","name":"Zephyr Pharma Inc","source":"CSV ticker list"},{"symbol":"ZPL","name":"Zephyr Products Ltd","source":"CSV ticker list"},{"symbol":"ZPLM","name":"Vanguard Asset Ltd","source":"CSV ticker list"},{"symbol":"ZQA","name":"Zephyr Quantum Analytics","source":"CSV ticker list"},{"symbol":"ZQD","name":"Zephyr Quantum Digital","source":"CSV ticker list"},{"symbol":"ZQG","name":"Zephyr Quantum Group","source":"CSV ticker list"},{"symbol":"ZQH","name":"Zephyr Quantum Holdings","source":"CSV ticker list"},{"symbol":"ZQI","name":"Zephyr Quantum Inc","source":"CSV ticker list"},{"symbol":"ZQS","name":"Zephyr Quantum Systems","source":"CSV ticker list"},{"symbol":"ZRG","name":"Zephyr Resources Group","source":"CSV ticker list"},{"symbol":"ZRH","name":"Zephyr Retail Holdings","source":"CSV ticker list"},{"symbol":"ZRI","name":"Zephyr Retail Inc","source":"CSV ticker list"},{"symbol":"ZRL","name":"Zephyr Realty Ltd","source":"CSV ticker list"},{"symbol":"ZRWN","name":"Synapse Solutions","source":"CSV ticker list"},{"symbol":"ZS","name":"Zephyr Systems","source":"CSV ticker list"},{"symbol":"ZSH","name":"Zephyr Supermarkets Holdings","source":"CSV ticker list"},{"symbol":"ZSHB","name":"Cyber Entertainment Corp","source":"CSV ticker list"},{"symbol":"ZSHR","name":"Zephyr Intelligence","source":"CSV ticker list"},{"symbol":"ZSL","name":"Zephyr Solar Ltd","source":"CSV ticker list"},{"symbol":"ZSWU","name":"Beta Properties Inc","source":"CSV ticker list"},{"symbol":"ZSXH","name":"Apex Solar Ltd","source":"CSV ticker list"},{"symbol":"ZT","name":"Zephyr Technologies","source":"CSV ticker list"},{"symbol":"ZTAR","name":"Infinitum Estate Group","source":"CSV ticker list"},{"symbol":"ZTC","name":"Zephyr Trust Corp","source":"CSV ticker list"},{"symbol":"ZTG","name":"Zephyr Trust Group","source":"CSV ticker list"},{"symbol":"ZTH","name":"Zephyr Trust Holdings","source":"CSV ticker list"},{"symbol":"ZTI","name":"Zephyr Trust Inc","source":"CSV ticker list"},{"symbol":"ZTVW","name":"Apex Realty Holdings","source":"CSV ticker list"},{"symbol":"ZUCQ","name":"Stratus Global Dynamics","source":"CSV ticker list"},{"symbol":"ZUUG","name":"Stratus Lifesciences Holdings","source":"CSV ticker list"},{"symbol":"ZUUP","name":"Alpha Electric Inc","source":"CSV ticker list"},{"symbol":"ZVHZ","name":"Stratus Networks","source":"CSV ticker list"},{"symbol":"ZVYR","name":"Zephyr Chemicals Holdings","source":"CSV ticker list"},{"symbol":"ZWG","name":"Zephyr Water Group","source":"CSV ticker list"},{"symbol":"ZWH","name":"Zephyr Wealth Holdings","source":"CSV ticker list"},{"symbol":"ZXHV","name":"Prism Power Ltd","source":"CSV ticker list"},{"symbol":"ZXOL","name":"Aether Petroleum Corp","source":"CSV ticker list"},{"symbol":"ZXWM","name":"Catalyst Intelligence","source":"CSV ticker list"},{"symbol":"ZYBW","name":"Aether Bio Inc","source":"CSV ticker list"},{"symbol":"ZYYI","name":"Vertex Estate Ltd","source":"CSV ticker list"},{"symbol":"ZYYW","name":"Zephyr Electric Ltd","source":"CSV ticker list"},{"symbol":"ZZVO","name":"Vanguard Software","source":"CSV ticker list"}];

function getCsvTickerLookupList() {
  return [...CSV_TICKER_LOOKUP].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

function normalizeLookupText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bcorporation\b/g, "corp")
    .replace(/\bcompany\b/g, "co")
    .replace(/\bincorporated\b/g, "inc")
    .replace(/\blimited\b/g, "ltd")
    .replace(/\bclass\b/g, "class")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactLookupText(value = "") {
  return normalizeLookupText(value).replace(/\s+/g, "");
}

function stripTickerQuestionWords(value = "") {
  return normalizeLookupText(value)
    .replace(/\b(what|whats|what s|is|the|ticker|symbol|for|of|stock|company|please|pls|tell|me|find|lookup|look|up|called|name|give|show|does|do|you|know|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tickerLookupCandidates(query = "") {
  const raw = String(query || "");
  const q = normalizeLookupText(raw);
  const cleaned = stripTickerQuestionWords(raw);
  const compactCleaned = compactLookupText(cleaned);
  const compactRaw = compactLookupText(raw);
  const upperTokens = [...raw.toUpperCase().matchAll(/\b[A-Z]{1,6}(?:\.[A-Z])?\b/g)].map((m) => m[0]);

  return { raw, q, cleaned, compactCleaned, compactRaw, upperTokens };
}

function scoreTickerLookupItem(item, parts) {
  const symbolRaw = String(item.symbol || "");
  const nameRaw = String(item.name || "");
  const symbol = normalizeLookupText(symbolRaw);
  const name = normalizeLookupText(nameRaw);
  const compactName = compactLookupText(nameRaw);
  const compactSymbol = compactLookupText(symbolRaw);
  const aliases = [
    name,
    name.replace(/\bcorp\b/g, "corporation"),
    name.replace(/\bco\b/g, "company"),
    name.replace(/\binc\b/g, "incorporated"),
    name.replace(/\bltd\b/g, "limited"),
  ].map(normalizeLookupText);

  let score = 0;

  if (parts.upperTokens.includes(symbolRaw)) score += 1000;
  if (symbol === parts.cleaned || symbol === parts.q) score += 950;
  if (compactSymbol === parts.compactCleaned || compactSymbol === parts.compactRaw) score += 900;

  for (const alias of aliases) {
    const compactAlias = alias.replace(/\s+/g, "");
    if (alias === parts.cleaned || alias === parts.q) score += 850;
    if (alias.startsWith(parts.cleaned) && parts.cleaned.length >= 2) score += 700;
    if (alias.includes(parts.cleaned) && parts.cleaned.length >= 2) score += 560;
    if (compactAlias === parts.compactCleaned && parts.compactCleaned.length >= 2) score += 820;
    if (compactAlias.includes(parts.compactCleaned) && parts.compactCleaned.length >= 2) score += 520;
  }

  // Word-level fuzzy-ish scoring: useful for "amazon", "salesforce", "toast", etc.
  const queryWords = parts.cleaned.split(" ").filter((word) => word.length >= 2);
  const nameWords = name.split(" ");
  if (queryWords.length) {
    const matched = queryWords.filter((word) =>
      nameWords.some((nameWord) => nameWord.startsWith(word) || nameWord.includes(word))
    ).length;
    score += matched * 120;
    if (matched === queryWords.length) score += 220;
  }

  if (symbol.startsWith(parts.cleaned) && parts.cleaned.length >= 1) score += 420;
  if (symbol.includes(parts.cleaned) && parts.cleaned.length >= 2) score += 260;

  return score;
}

function findTickerLookupMatches(question = "", limit = 5) {
  const parts = tickerLookupCandidates(question);
  if (!parts.q) return [];

  const likelyTickerQuestion =
    /\b(ticker|symbol|stock symbol|stock ticker|what'?s|what is|find|lookup|look up)\b/i.test(question) ||
    parts.upperTokens.length > 0;

  if (!likelyTickerQuestion) return [];

  const matches = getCsvTickerLookupList()
    .map((item) => ({ item, score: scoreTickerLookupItem(item, parts) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map((entry) => entry.item);

  return matches;
}

function findTickerLookupAnswer(question = "") {
  const matches = findTickerLookupMatches(question, 3);
  if (!matches.length) return null;

  if (matches.length === 1) {
    return `${matches[0].symbol} — ${matches[0].name}`;
  }

  return matches.map((match) => `${match.symbol} — ${match.name}`).join("\n");
}



function normalizeIndustryName(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getIndustryKey(industry = "") {
  const clean = normalizeIndustryName(industry);

  for (const [key, terms] of INDUSTRY_ALIASES) {
    if (terms.some((term) => clean.includes(normalizeIndustryName(term)))) {
      return key;
    }
  }

  return Object.keys(INDUSTRY_UNIVERSES).find((key) => normalizeIndustryName(key) === clean) || "Technology";
}

function isValidAnalysisPayload(data) {
  const score = Number(data?.grades?.edgeScore);
  const validCategories = Number(data?.grades?.dataQuality?.validCategoryCount || 0);
  const inputCounts = data?.grades?.dataQuality?.validInputCounts || {};

  const hasEnoughFundamentals =
    Number(inputCounts.growth || 0) >= 2 ||
    Number(inputCounts.profitability || 0) >= 2 ||
    Number(inputCounts.financialHealth || 0) >= 2 ||
    Number(inputCounts.valuation || 0) >= 2;

  const hasMarketData = Number(inputCounts.marketData || 0) >= 2 || Boolean(data?.quote?.c);

  return Number.isFinite(score) && score >= 2 && validCategories >= 5 && hasMarketData && hasEnoughFundamentals;
}

function hoursFromMs(ms) {
  return Number((ms / (60 * 60 * 1000)).toFixed(1));
}

function componentMetaFor(savedAt = {}) {
  return {
    fundamentals: hoursFromMs(COMPONENT_TTLS_MS.fundamentals),
    valuation: hoursFromMs(COMPONENT_TTLS_MS.valuation),
    market: hoursFromMs(COMPONENT_TTLS_MS.market),
    news: hoursFromMs(COMPONENT_TTLS_MS.news),
    risk: hoursFromMs(COMPONENT_TTLS_MS.risk),
    profile: hoursFromMs(COMPONENT_TTLS_MS.profile),
    savedAt,
  };
}

function withCacheInfo(data, cacheInfo, savedAt = {}) {
  return {
    ...data,
    cache: {
      ...(data?.cache || {}),
      ...cacheInfo,
      ttlHours: 24,
      componentTtlsHours: componentMetaFor(savedAt),
    },
  };
}

function isFresh(savedAt, key) {
  const saved = Number(savedAt?.[key] || 0);
  if (!saved) return false;
  return Date.now() - saved < COMPONENT_TTLS_MS[key];
}

function getRefreshPlan(savedAt = {}) {
  return {
    refreshFundamentals: !isFresh(savedAt, "fundamentals"),
    refreshValuation: !isFresh(savedAt, "valuation"),
    refreshMarket: !isFresh(savedAt, "market"),
    refreshNews: !isFresh(savedAt, "news"),
    refreshRisk: !isFresh(savedAt, "risk"),
    refreshProfile: !isFresh(savedAt, "profile"),
  };
}

function allComponentsFresh(plan) {
  return !Object.values(plan).some(Boolean);
}

function scoreToneName(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return "N/A";
  if (n >= 7.5) return "Strong";
  if (n >= 6.5) return "Mixed";
  return "Weak";
}

function scoreText10(score) {
  const n = Number(score);
  return Number.isFinite(n) ? n.toFixed(1) : "N/A";
}

function availableWeightedAverage(values, fallback = null) {
  let total = 0;
  let weight = 0;

  for (const item of values) {
    const score = Number(item?.score);
    const w = Number(item?.weight);
    if (Number.isFinite(score) && Number.isFinite(w) && w > 0) {
      total += score * w;
      weight += w;
    }
  }

  if (weight === 0) return fallback;
  return Math.max(0, Math.min(10, total / weight));
}

function strongestWeakestFromCategories(categories = {}) {
  const entries = Object.entries(categories)
    .map(([key, value]) => [key, Number(value)])
    .filter(([, value]) => Number.isFinite(value));

  const label = (key) =>
    ({
      growth: "Growth",
      profitability: "Profitability",
      financialHealth: "Financial Health",
      valuation: "Valuation",
      momentum: "Momentum",
      reversal: "Pullback",
      newsSentiment: "News Sentiment",
    }[key] || key);

  if (!entries.length) {
    return { strongest: "Not enough category data yet.", weakest: "Not enough category data yet." };
  }

  const strongest = entries.reduce((best, item) => (item[1] > best[1] ? item : best), entries[0]);
  const weakest = entries.reduce((worst, item) => (item[1] < worst[1] ? item : worst), entries[0]);

  return {
    strongest: `${label(strongest[0])} is the strongest category at ${scoreText10(strongest[1])}/10.`,
    weakest: `${label(weakest[0])} is the weakest category at ${scoreText10(weakest[1])}/10.`,
  };
}

const FUNDAMENTAL_CATEGORY_KEYS = ["growth", "profitability", "financialHealth"];
const VALUATION_CATEGORY_KEYS = ["valuation"];
const MARKET_CATEGORY_KEYS = ["momentum", "reversal"];
const NEWS_CATEGORY_KEYS = ["newsSentiment"];

const FUNDAMENTAL_METRIC_KEYS = [
  "revenueGrowth",
  "revenueGrowthQuarterly",
  "revenueGrowth3Y",
  "revenueGrowth5Y",
  "epsGrowth",
  "epsGrowth3Y",
  "epsGrowth5Y",
  "roe",
  "roa",
  "roi",
  "grossMargin",
  "operatingMargin",
  "pretaxMargin",
  "netMargin",
  "debtToEquity",
  "longTermDebtToEquity",
  "currentRatio",
  "quickRatio",
  "cashRatio",
  "assetTurnover",
  "interestCoverage",
  "cashFlowToDebt",
  "operatingCashFlowPerShare",
  "freeCashFlowPerShare",
  "totalDebtToCapital",
  "netDebtToEbitda",
  "marketCapM",
];

const VALUATION_METRIC_KEYS = [
  "peRatio",
  "forwardPe",
  "pegRatio",
  "priceToSales",
  "priceToBook",
  "priceToCashFlow",
  "priceToFreeCashFlow",
  "dividendYield",
  "wacc",
  "costOfEquity",
  "afterTaxCostOfDebt",
  "taxRate",
  "dcfEnterpriseValue",
  "intrinsicValue",
  "intrinsicValueGap",
  "dcfGrowthRate",
];

const MARKET_METRIC_KEYS = [
  "beta",
  "dayChangePercent",
  "priceReturn4Week",
  "priceReturn13Week",
  "priceReturn26Week",
  "priceReturn52Week",
  "distanceFrom52WeekLow",
  "pullbackFromHigh",
];

function copyKeys(target = {}, source = {}, keys = []) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source || {}, key)) {
      target[key] = source[key];
    }
  }
}

function mergeByTtl(cachedReport, freshReport, plan) {
  if (!cachedReport?.grades || !freshReport?.grades) return freshReport;

  const merged = structuredClone(freshReport);
  const cachedCategories = cachedReport?.grades?.categories || {};
  const freshCategories = freshReport?.grades?.categories || {};
  merged.grades.categories = { ...freshCategories };

  if (!plan.refreshFundamentals) {
    copyKeys(merged.grades.categories, cachedCategories, FUNDAMENTAL_CATEGORY_KEYS);
    copyKeys(merged.metrics, cachedReport.metrics, FUNDAMENTAL_METRIC_KEYS);
  }

  if (!plan.refreshValuation) {
    copyKeys(merged.grades.categories, cachedCategories, VALUATION_CATEGORY_KEYS);
    copyKeys(merged.metrics, cachedReport.metrics, VALUATION_METRIC_KEYS);
  }

  if (!plan.refreshMarket) {
    merged.quote = cachedReport.quote || merged.quote;
    copyKeys(merged.grades.categories, cachedCategories, MARKET_CATEGORY_KEYS);
    copyKeys(merged.metrics, cachedReport.metrics, MARKET_METRIC_KEYS);
  }

  if (!plan.refreshNews) {
    copyKeys(merged.grades.categories, cachedCategories, NEWS_CATEGORY_KEYS);
    if (cachedReport.metrics?.newsSentiment) merged.metrics.newsSentiment = cachedReport.metrics.newsSentiment;
    if (cachedReport.newsSentiment) merged.newsSentiment = cachedReport.newsSentiment;
  }

  if (!plan.refreshRisk && cachedReport?.grades?.riskLabel) {
    merged.grades.riskLabel = cachedReport.grades.riskLabel;
  }

  if (!plan.refreshProfile && cachedReport?.profile) {
    merged.profile = cachedReport.profile;
  }

  const categories = merged.grades.categories || {};
  const edgeScore = availableWeightedAverage(
    [
      { score: categories.growth, weight: 0.215 },
      { score: categories.profitability, weight: 0.205 },
      { score: categories.financialHealth, weight: 0.175 },
      { score: categories.valuation, weight: 0.150 },
      { score: categories.momentum, weight: 0.105 },
      { score: categories.reversal, weight: 0.075 },
      { score: categories.newsSentiment, weight: 0.075 },
    ],
    Number(merged.grades.edgeScore)
  );

  merged.grades.edgeScore = Number(edgeScore.toFixed(1));
  merged.grades.grade = scoreToneName(edgeScore);

  const sw = strongestWeakestFromCategories(categories);
  merged.strengths = [sw.strongest];
  merged.weaknesses = [sw.weakest];
  merged.evaluationSummary = `${merged.symbol} has an Eval Score of ${scoreText10(edgeScore)} out of 10. The score blends growth, profitability, financial health, valuation, momentum, pullback, and news sentiment.`;

  if (merged.grades.dataQuality) {
    merged.grades.dataQuality.componentCachePolicy = "growth/profitability/financial health 4 months, valuation 1 month, price/momentum/pullback 1 day, risk/news 7 days";
  }

  return merged;
}

function updatedComponentSavedAt(previous = {}, plan = {}) {
  const now = Date.now();
  return {
    fundamentals: previous.fundamentals && !plan.refreshFundamentals ? previous.fundamentals : now,
    valuation: previous.valuation && !plan.refreshValuation ? previous.valuation : now,
    market: previous.market && !plan.refreshMarket ? previous.market : now,
    news: previous.news && !plan.refreshNews ? previous.news : now,
    risk: previous.risk && !plan.refreshRisk ? previous.risk : now,
    profile: previous.profile && !plan.refreshProfile ? previous.profile : now,
  };
}

async function getCachedAnalysis(symbol) {
  const clean = cleanTicker(symbol);
  if (!clean) throw new Error("Missing ticker symbol.");

  const cached = analysisCache.get(clean);
  const cachedReport = cached?.data || null;
  const savedAt = cached?.componentSavedAt || {};
  const plan = getRefreshPlan(savedAt);

  if (cachedReport && allComponentsFresh(plan)) {
    return withCacheInfo(cachedReport, { hit: true, componentHit: true }, savedAt);
  }

  const lastValid = lastValidAnalysisCache.get(clean);

  try {
    const data = await buildStockAnalysis(clean, {
      cachedReport,
      refreshFundamentals: plan.refreshFundamentals,
      refreshValuation: plan.refreshValuation,
      refreshMarket: plan.refreshMarket,
      refreshNews: plan.refreshNews,
      refreshRisk: plan.refreshRisk,
      refreshProfile: plan.refreshProfile,
    });

    const merged = cachedReport ? mergeByTtl(cachedReport, data, plan) : data;
    const componentSavedAt = updatedComponentSavedAt(savedAt, plan);
    const payload = withCacheInfo(merged, {
      hit: false,
      refreshed: Object.entries(plan).filter(([, value]) => value).map(([key]) => key),
    }, componentSavedAt);

    if (!isValidAnalysisPayload(payload)) {
      if (lastValid?.data) {
        return withCacheInfo(lastValid.data, {
          hit: true,
          fallback: "lastValid",
          reason: "New report had incomplete provider data or rate-limited source response.",
        }, lastValid.componentSavedAt || {});
      }

      return {
        ...payload,
        warning: "Partial provider data. Score may be unavailable until data sources recover.",
      };
    }

    analysisCache.set(clean, {
      savedAt: Date.now(),
      componentSavedAt,
      data: payload,
    });

    lastValidAnalysisCache.set(clean, {
      savedAt: Date.now(),
      componentSavedAt,
      data: payload,
    });

    return payload;
  } catch (error) {
    if (lastValid?.data) {
      return withCacheInfo(lastValid.data, {
        hit: true,
        fallback: "lastValid",
        reason: error?.message || "Provider fetch failed.",
      }, lastValid.componentSavedAt || {});
    }

    throw error;
  }
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "Eval backend",
    routes: ["/api/health", "/api/ticker-lookup", "/api/ticker-answer", "/api/analyze/:symbol", "/api/industry-top/:industry"],
    cacheTtlHours: 24,
    componentCachePolicy: "fundamentals 4 months, valuation 1 month, market/price 1 day, risk/news 7 days",
    dataProviderPlan: "Massive + light FMP + Finnhub with last-valid fallback",
    faqCount: 1050,
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "Eval backend",
    dataProviders: {
      finnhub: Boolean(process.env.FINNHUB_API_KEY),
      massive: Boolean(process.env.MASSIVE_API_KEY),
      fmp: Boolean(process.env.FMP_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
    },
    cacheTtlHours: 24,
    componentCachePolicy: "fundamentals 4 months, valuation 1 month, market/price 1 day, risk/news 7 days",
    cacheSize: analysisCache.size,
    lastValidCacheSize: lastValidAnalysisCache.size,
    tickerLookupCacheSize: CSV_TICKER_LOOKUP.length,
    tickerLookupSource: "CSV ticker list",
    fallbackPolicy: "Component-level cache plus minimized provider calls: Finnhub for current price/% change, Massive for historical market data, light FMP for fundamentals, Finnhub for profile/news/fallback metrics, uploaded CSV ticker list for ticker lookup, lastValid cache as final safety net.",
    faqCount: 1050,
  });
});



app.get("/api/ticker-answer", (req, res) => {
  const q = String(req.query.q || "").trim();
  const matches = findTickerLookupMatches(q, 8);

  res.json({
    query: q,
    count: matches.length,
    source: "CSV ticker list",
    results: matches,
    answer: matches.length ? matches.map((match) => `${match.symbol} — ${match.name}`).join("\n") : null,
  });
});

app.get("/api/ticker-lookup", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    const limit = Math.min(Math.max(Number(req.query.limit) || 150, 1), 300);
    const list = getCsvTickerLookupList();

    const results = (!q
      ? []
      : list
          .filter((item) => {
            const symbol = item.symbol.toLowerCase();
            const name = item.name.toLowerCase();
            return symbol.includes(q) || name.includes(q);
          })
          .sort((a, b) => {
            const parts = tickerLookupCandidates(q);
            const scoreA = scoreTickerLookupItem(a, parts);
            const scoreB = scoreTickerLookupItem(b, parts);
            return scoreB - scoreA || a.name.localeCompare(b.name);
          })
          .slice(0, limit)
    );

    res.json({
      query: q,
      count: results.length,
      totalAvailable: list.length,
      cached: tickerLookupCache.savedAt > 0,
      source: "CSV ticker list",
      results,
    });
  } catch (error) {
    console.error("Ticker lookup route failed:", error?.stack || error?.message || error);
    res.status(500).json({
      error: error?.message || "Could not load ticker lookup list.",
      source: "CSV ticker list",
      results: [],
    });
  }
});

app.get("/api/analyze/:symbol", async (req, res) => {
  try {
    const symbol = cleanTicker(req.params.symbol);
    const data = await getCachedAnalysis(symbol);
    res.json(data);
  } catch (error) {
    console.error("Analyze route failed:", error?.stack || error?.message || error);
    res.status(500).json({
      error: error?.message || "Could not analyze this stock.",
      route: "api/analyze",
    });
  }
});

app.get("/api/industry-top/:industry", async (req, res) => {
  try {
    const industry = String(req.params.industry || "").trim();
    const symbol = cleanTicker(req.query.symbol);
    const industryKey = getIndustryKey(industry);
    const cacheKey = `${industryKey}:${symbol}`;

    const cached = industryCache.get(cacheKey);
    if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
      return res.json({
        ...cached.data,
        cache: { hit: true, ttlHours: 24 },
      });
    }

    const universe = [...new Set([symbol, ...(INDUSTRY_UNIVERSES[industryKey] || [])].filter(Boolean))].slice(0, 12);
    const results = [];

    for (const ticker of universe) {
      try {
        const analysis = await getCachedAnalysis(ticker);
        const score = Number(analysis?.grades?.edgeScore);

        if (Number.isFinite(score)) {
          results.push({
            symbol: ticker,
            name: analysis?.profile?.name || ticker,
            industry: analysis?.profile?.finnhubIndustry || industryKey,
            score,
            price: analysis?.quote?.c ?? null,
            categories: analysis?.grades?.categories || {},
            riskLabel: analysis?.grades?.riskLabel || "",
          });
        }
      } catch (error) {
        console.warn(`Industry ranking skipped ${ticker}:`, error?.message || error);
      }
    }

    const leaders = results.sort((a, b) => b.score - a.score).slice(0, 5);

    const payload = {
      industry,
      industryKey,
      candidates: universe,
      leaders,
      limit: 5,
      cachedForHours: 24,
      cache: { hit: false, ttlHours: 24 },
    };

    industryCache.set(cacheKey, {
      savedAt: Date.now(),
      data: payload,
    });

    res.json(payload);
  } catch (error) {
    console.error("Industry top route failed:", error?.stack || error?.message || error);
    res.status(500).json({
      error: error?.message || "Could not rank this industry.",
      route: "api/industry-top",
    });
  }
});


app.post("/api/assistant", async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const question = String(req.body?.question || "").trim().slice(0, 150);
    const current = req.body?.current || null;
    const watchlist = Array.isArray(req.body?.watchlist) ? req.body.watchlist : [];

    if (!question) {
      return res.status(400).json({ error: "Missing question." });
    }

    const tickerLookupAnswer = findTickerLookupAnswer(question);
    if (tickerLookupAnswer) {
      return res.json({ answer: tickerLookupAnswer });
    }

    const allowedWebsiteTerms = [
      "eval",
      "score",
      "power score",
      "stock",
      "ticker",
      "watchlist",
      "price",
      "risk",
      "industry",
      "industries",
      "news",
      "sentiment",
      "growth",
      "profitability",
      "financial health",
      "valuation",
      "momentum",
      "pullback",
      "company",
      "metric",
      "metrics",
      "category",
      "categories",
      "strong",
      "weak",
      "strongest",
      "weakest",
      "dashboard",
      "website",
      "app",
      "page",
      "button",
      "menu",
      "dropdown",
      "navigate",
      "navigation",
      "how do i",
      "how to",
      "where is",
      "what is",
      "explain",
      "use",
      "using",
      "add",
      "remove",
      "delete",
      "refresh",
      "search",
      "open",
      "click",
      "chart",
      "bar chart",
      "radar",
      "compare",
      "comparison",
      "article",
      "read article",
      "bubble",
      "color",
      "green",
      "yellow",
      "red",
      "rank",
      "ranking",
      "industry ranking",
      "homepage",
      "home",
      "terms",
      "conditions",
      "contact",
      "support",
      "profile",
      "sign in",
      "log in",
      "login",
      "dashboard",
      "clerk",
      "csv",
      "symbol",
      "stock ticker",
      "stock symbol",
      "company name",
      "microsoft",
      "apple",
    ];

    const supportIntentTerms = [
      "how",
      "help",
      "use",
      "navigate",
      "where",
      "what does",
      "what is",
      "explain",
      "show",
      "find",
      "open",
      "click",
      "button",
      "page",
      "menu",
      "dropdown",
      "dashboard",
      "watchlist",
      "compare",
      "metrics",
      "score",
      "industry",
      "news sentiment",
      "risk",
      "price",
      "contact",
      "terms",
      "homepage",
      "profile",
    ];

    const normalizedQuestion = question.toLowerCase();
    const hasWebsiteTerm = allowedWebsiteTerms.some((term) => normalizedQuestion.includes(term));
    const hasSupportIntent = supportIntentTerms.some((term) => normalizedQuestion.includes(term));

    const currentSymbol = String(current?.symbol || current?.profile?.ticker || "").toLowerCase();
    const currentName = String(current?.profile?.name || "").toLowerCase();
    const watchlistSymbols = watchlist
      .map((item) => String(item?.symbol || item?.ticker || "").toLowerCase())
      .filter(Boolean);

    const stockLikeTokens = [...question.toUpperCase().matchAll(/\b[A-Z]{1,5}(?:\.[A-Z])?\b/g)].map((match) => match[0]);
    const allAllowedStockSymbols = [...new Set([currentSymbol, ...watchlistSymbols].filter(Boolean))];
    const mentionedAllowedTicker = stockLikeTokens.some((token) => allAllowedStockSymbols.includes(token.toLowerCase()));

    const mentionsKnownTicker =
      (currentSymbol && normalizedQuestion.includes(currentSymbol)) ||
      watchlistSymbols.some((symbol) => normalizedQuestion.includes(symbol)) ||
      mentionedAllowedTicker;

    const stockAnalysisWords = /\b(should i|buy|sell|hold|invest|investment|target|price target|undervalued|overvalued|better stock|compare|valuation|risk|sentiment|earnings|revenue|profit|growth|momentum|pullback|financial health|metrics?|score|news)\b/i.test(question);
    const asksAboutSpecificStock = stockLikeTokens.length > 0 && stockAnalysisWords;

    const asksGeneralUnrelated =
      /\b(weather|sports score|recipe|movie|music|dating|politics|history homework|essay|song|lyrics|fraternity|hockey|travel|write my|homework answer)\b/i.test(question) &&
      !hasWebsiteTerm &&
      !mentionsKnownTicker;

    if (asksGeneralUnrelated || (!hasWebsiteTerm && !hasSupportIntent && !mentionsKnownTicker && !currentName.includes(normalizedQuestion))) {
      return res.json({
        answer:
          "I can help with Eval support, FAQs, ticker lookup, dashboard, metrics, watchlist, compare, news, risk, and loaded/watchlist stocks.",
      });
    }

    if (asksAboutSpecificStock && !mentionsKnownTicker) {
      return res.json({
        answer:
          "Load that ticker or add it to your watchlist first, then ask again.",
      });
    }

    if (!apiKey) {
      return res.status(200).json({
        answer:
          "Eval AI needs OPENAI_API_KEY added in Render.",
      });
    }

    const watchlistContext = watchlist
      .slice(0, 15)
      .map((item) => {
        const symbol = item?.symbol || item?.ticker || "";
        const score = item?.score ?? item?.edgeScore ?? "N/A";
        const strongest = item?.strongest || item?.strength || "N/A";
        const weakest = item?.weakest || item?.weakness || "N/A";
        return `${symbol}: Eval Score ${score}, Strong: ${strongest}, Weak: ${weakest}`;
      })
      .filter(Boolean)
      .join("\n");

    const currentContext = current
      ? JSON.stringify({
          symbol: current.symbol,
          name: current.profile?.name,
          industry: current.profile?.finnhubIndustry,
          price: current.quote?.c,
          dailyChangePercent: current.quote?.dp,
          evalScore: current.grades?.edgeScore,
          risk: current.grades?.riskLabel,
          categories: current.grades?.categories,
          strengths: current.strengths,
          weaknesses: current.weaknesses,
          newsSentiment: current.newsSentiment,
          metrics: current.metrics,
        })
      : "No current stock loaded.";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_ASSISTANT_MODEL || "gpt-4.1-nano",
        temperature: 0.15,
        max_tokens: 55,
        messages: [
          {
            role: "system",
            content:
              `You are Eval AI, the support assistant inside the Eval stock-evaluation website. Your main job is to help users navigate and understand the app. You CAN answer questions about CSV ticker lookup/company ticker symbols and all Eval FAQs, how to use the dashboard, ticker lookup, search ticker bar, dropdown menu, AI Assistant page, Compare page, Watchlist, industry ranking pages, metric cards, bar charts, radar charts, Eval Score rings, score colors, price/risk cards, data caching, data sources, provider fallbacks, news sentiment, article cards, Terms & Conditions, Contact/Support page, profile/sign-in basics, and how to add, remove, refresh, or compare stocks. You CAN explain what the metrics mean in simple language. You CAN answer stock-specific questions only using the current loaded stock or tickers saved in the user's watchlist context. If a stock is not loaded or in the watchlist, tell the user to load it or add it to the watchlist first. Do NOT answer unrelated questions outside Eval. Do NOT give buy/sell commands or financial advice. Be helpful like a website support agent. Keep answers extremely short. Prefer one line. For ticker questions, answer only like: AMZN — Amazon.com Inc.

FAQ KNOWLEDGE:
${EVAL_FAQ_KNOWLEDGE}`,
          },
          {
            role: "user",
            content: `Question: ${question}\n\nCurrent Eval website stock context:\n${currentContext}\n\nEval website watchlist context:\n${watchlistContext || "No watchlist context."}`,
          },
        ],
      }),
    });

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("OpenAI assistant failed:", response.status, json?.error?.message || "");
      return res.status(200).json({
        answer:
          "Eval AI could not reach OpenAI right now. Check your OPENAI_API_KEY or billing settings in Render.",
      });
    }

    const answer = json?.choices?.[0]?.message?.content?.trim();

    return res.json({
      answer:
        answer ||
        "I can help with Eval support, FAQs, ticker lookup, dashboard, metrics, watchlist, compare, news, risk, and loaded/watchlist stocks.",
    });
  } catch (error) {
    console.error("Assistant route failed:", error?.stack || error?.message || error);
    return res.status(500).json({
      error: error?.message || "Assistant route failed.",
      route: "api/assistant",
    });
  }
});


app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
  });
});

app.listen(PORT, () => {
  console.log(`Eval backend running on port ${PORT}`);
});
