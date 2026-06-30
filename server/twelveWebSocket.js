// Optional Twelve Data WebSocket bridge for live prices.
// Install: npm install ws
// Usage in index.js after creating your HTTP server:
//   import { attachTwelveQuoteWebSocket } from './twelveWebSocket.js';
//   const server = app.listen(PORT, () => console.log(`Server running on ${PORT}`));
//   attachTwelveQuoteWebSocket(server);
// Frontend connects to: wss://YOUR_RENDER_URL/ws/quotes?symbols=AAPL

import WebSocket, { WebSocketServer } from "ws";

const TWELVE_WS_URL = "wss://ws.twelvedata.com/v1/quotes/price";
const MAX_SYMBOLS_PER_CLIENT = 1;
const clients = new Map();
let upstream = null;
let subscribed = new Set();
let reconnectTimer = null;

function cleanSymbol(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "").slice(0, 16);
}

function parseSymbols(url = "") {
  try {
    const parsed = new URL(url, "http://localhost");
    const raw = parsed.searchParams.get("symbols") || "";
    const requested = raw.split(",").map(cleanSymbol).filter(Boolean);
    return [...new Set(requested)].slice(0, MAX_SYMBOLS_PER_CLIENT);
  } catch {
    return [];
  }
}

function allRequestedSymbols() {
  const all = new Set();
  for (const symbols of clients.values()) symbols.forEach((symbol) => all.add(symbol));
  return all;
}

function sendUpstream(payload) {
  if (!upstream || upstream.readyState !== WebSocket.OPEN) return;
  upstream.send(JSON.stringify(payload));
}

function syncSubscriptions() {
  const wanted = allRequestedSymbols();
  const toAdd = [...wanted].filter((symbol) => !subscribed.has(symbol));
  const toRemove = [...subscribed].filter((symbol) => !wanted.has(symbol));

  if (toAdd.length) sendUpstream({ action: "subscribe", params: { symbols: toAdd.join(",") } });
  if (toRemove.length) sendUpstream({ action: "unsubscribe", params: { symbols: toRemove.join(",") } });
  subscribed = wanted;
}

function connectUpstream() {
  const key = process.env.TWELVE_DATA_API_KEY || process.env.TWELVEDATA_API_KEY;
  if (!key || upstream?.readyState === WebSocket.OPEN || upstream?.readyState === WebSocket.CONNECTING) return;

  upstream = new WebSocket(`${TWELVE_WS_URL}?apikey=${encodeURIComponent(key)}`);

  upstream.on("open", () => {
    subscribed = new Set();
    syncSubscriptions();
  });

  upstream.on("message", (raw) => {
    let message = null;
    try { message = JSON.parse(raw.toString()); } catch { return; }
    const symbol = cleanSymbol(message?.symbol || message?.event?.symbol);
    if (!symbol) return;
    const packet = JSON.stringify({
      symbol,
      price: Number(message?.price ?? message?.event?.price ?? null),
      timestamp: message?.timestamp || Date.now(),
      source: "Twelve Data WebSocket",
    });
    for (const [client, symbols] of clients.entries()) {
      if (client.readyState === WebSocket.OPEN && symbols.has(symbol)) client.send(packet);
    }
  });

  upstream.on("close", () => {
    upstream = null;
    subscribed = new Set();
    clearTimeout(reconnectTimer);
    if (clients.size) reconnectTimer = setTimeout(connectUpstream, 3000);
  });

  upstream.on("error", () => {
    try { upstream?.close(); } catch {}
  });
}

export function attachTwelveQuoteWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    if (!request.url?.startsWith("/ws/quotes")) return;
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws, request));
  });

  wss.on("connection", (ws, request) => {
    const symbols = new Set(parseSymbols(request.url));
    clients.set(ws, symbols);
    connectUpstream();
    syncSubscriptions();

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg?.type === "symbols") {
          const requested = (Array.isArray(msg.symbols) ? msg.symbols : []).map(cleanSymbol).filter(Boolean);
          clients.set(ws, new Set(requested.slice(0, MAX_SYMBOLS_PER_CLIENT)));
          syncSubscriptions();
        }
      } catch {}
    });

    ws.on("close", () => {
      clients.delete(ws);
      syncSubscriptions();
      if (!clients.size) {
        try { upstream?.close(); } catch {}
      }
    });
  });
}
