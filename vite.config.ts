import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

// =============================================================================
// Manus Debug Collector - Vite Plugin
// Writes browser logs directly to files, trimmed when exceeding size limit
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024; // 1MB per log file
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6); // Trim to 60% to avoid constant re-trimming

type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function trimLogFile(logPath: string, maxSize: number) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }

    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines: string[] = [];
    let keptBytes = 0;

    // Keep newest lines (from end) that fit within 60% of maxSize
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}\n`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
    /* ignore trim errors */
  }
}

function writeToLogFile(source: LogSource, entries: unknown[]) {
  if (entries.length === 0) return;

  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);

  // Format entries with timestamps
  const lines = entries.map((entry) => {
    const ts = new Date().toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });

  // Append to log file
  fs.appendFileSync(logPath, `${lines.join("\n")}\n`, "utf-8");

  // Trim if exceeds max size
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}

/**
 * Vite plugin to collect browser debug logs
 * - POST /__manus__/logs: Browser sends logs, written directly to files
 * - Files: browserConsole.log, networkRequests.log, sessionReplay.log
 * - Auto-trimmed when exceeding 1MB (keeps newest entries)
 */
function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "manus-debug-collector",

    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true,
            },
            injectTo: "head",
          },
        ],
      };
    },

    configureServer(server: ViteDevServer) {
      // POST /__manus__/logs: Browser sends logs (written directly to files)
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }

        const handlePayload = (payload: any) => {
          // Write logs directly to files
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };

        const reqBody = (req as { body?: unknown }).body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }

        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    },
  };
}

// Yahoo Finance symbol mapping
const YAHOO_SYMBOLS: Record<string, string> = {
  'EUR/USD': 'EURUSD=X', 'GBP/USD': 'GBPUSD=X', 'USD/JPY': 'USDJPY=X',
  'USD/CHF': 'USDCHF=X', 'AUD/USD': 'AUDUSD=X', 'NZD/USD': 'NZDUSD=X',
  'USD/CAD': 'USDCAD=X', 'EUR/GBP': 'EURGBP=X', 'EUR/JPY': 'EURJPY=X',
  'GBP/JPY': 'GBPJPY=X', 'AUD/JPY': 'AUDJPY=X', 'EUR/AUD': 'EURAUD=X',
  'GBP/AUD': 'GBPAUD=X', 'EUR/CAD': 'EURCAD=X', 'GBP/CAD': 'GBPCAD=X',
  'AUD/CAD': 'AUDCAD=X', 'NZD/JPY': 'NZDJPY=X', 'XAU/USD': 'GC=F',
};

const INTERVAL_MAP: Record<string, { interval: string; range: string }> = {
  '1min': { interval: '1m', range: '1d' },
  '2min': { interval: '2m', range: '1d' },
  '5min': { interval: '5m', range: '5d' },
  '15min': { interval: '15m', range: '5d' },
  '30min': { interval: '30m', range: '5d' },
  '1h': { interval: '1h', range: '1mo' },
  '4h': { interval: '1h', range: '3mo' },
  '1day': { interval: '1d', range: '1y' },
  '1week': { interval: '1wk', range: '5y' },
};

function aggregate4h(candles: any[]) {
  const result = [];
  for (let i = 0; i < candles.length; i += 4) {
    const chunk = candles.slice(i, i + 4);
    if (chunk.length === 0) continue;
    result.push({
      datetime: chunk[0].datetime,
      open: chunk[0].open,
      high: String(Math.max(...chunk.map((c: any) => parseFloat(c.high)))),
      low: String(Math.min(...chunk.map((c: any) => parseFloat(c.low)))),
      close: chunk[chunk.length - 1].close,
      volume: String(chunk.reduce((sum: number, c: any) => sum + parseFloat(c.volume || '0'), 0)),
    });
  }
  return result;
}

function vitePluginForexApi(): Plugin {
  return {
    name: 'forex-api-proxy',
    configureServer(server: ViteDevServer) {
      // Health check
      server.middlewares.use('/api/health', (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', pairs: Object.keys(YAHOO_SYMBOLS).length }));
      });

      // Forex candles endpoint
      server.middlewares.use('/api/forex/candles', async (req, res) => {
        try {
          const url = new URL(req.url || '', 'http://localhost');
          const symbol = url.searchParams.get('symbol') || '';
          const interval = url.searchParams.get('interval') || '1h';
          const outputsize = parseInt(url.searchParams.get('outputsize') || '100');

          const yahooSymbol = YAHOO_SYMBOLS[symbol];
          if (!yahooSymbol) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: `Unknown symbol: ${symbol}` }));
            return;
          }

          const mapping = INTERVAL_MAP[interval] || INTERVAL_MAP['1h'];
          const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${mapping.interval}&range=${mapping.range}&includeAdjustedClose=true`;

          const response = await fetch(yahooUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          });

          const data = await response.json() as any;
          if (!data?.chart?.result?.[0]) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'No data from Yahoo Finance' }));
            return;
          }

          const result = data.chart.result[0];
          const timestamps = result.timestamp || [];
          const quotes = result.indicators?.quote?.[0] || {};
          const meta = result.meta || {};

          let candles = [];
          for (let i = 0; i < timestamps.length; i++) {
            const o = quotes.open?.[i];
            const h = quotes.high?.[i];
            const l = quotes.low?.[i];
            const c = quotes.close?.[i];
            if (!o || !h || !l || !c || o === 0) continue;
            candles.push({
              datetime: new Date(timestamps[i] * 1000).toISOString().replace('T', ' ').slice(0, 19),
              open: String(o), high: String(h), low: String(l), close: String(c),
              volume: quotes.volume?.[i] ? String(quotes.volume[i]) : '0',
            });
          }

          if (interval === '4h') candles = aggregate4h(candles);

          const limited = candles.slice(-Math.min(outputsize, 500));

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            meta: { symbol, interval, exchange: meta.exchangeName || 'FOREX' },
            values: limited.reverse(),
            price: meta.regularMarketPrice || null,
          }));
        } catch (error: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: error.message }));
        }
      });

      // Quick price endpoint
      server.middlewares.use('/api/forex/price', async (req, res) => {
        try {
          const url = new URL(req.url || '', 'http://localhost');
          const symbol = url.searchParams.get('symbol') || '';
          const yahooSymbol = YAHOO_SYMBOLS[symbol];
          if (!yahooSymbol) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: `Unknown symbol` }));
            return;
          }
          const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=2d`;
          const response = await fetch(yahooUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          });
          const data = await response.json() as any;
          const meta = data?.chart?.result?.[0]?.meta || {};
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            price: meta.regularMarketPrice || null,
            previousClose: meta.chartPreviousClose || meta.previousClose || null,
            change: meta.regularMarketPrice && meta.chartPreviousClose
              ? meta.regularMarketPrice - meta.chartPreviousClose : null,
          }));
        } catch (error: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: error.message }));
        }
      });
    },
  };
}

function vitePluginStorageProxy(): Plugin {
  return {
    name: "manus-storage-proxy",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/manus-storage", async (req, res) => {
        const key = req.url?.replace(/^\//, "");
        if (!key) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Missing storage key");
          return;
        }

        const forgeBaseUrl = (process.env.BUILT_IN_FORGE_API_URL || "").replace(/\/+$/, "");
        const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;

        if (!forgeBaseUrl || !forgeKey) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Storage proxy not configured");
          return;
        }

        try {
          const forgeUrl = new URL("v1/storage/presign/get", forgeBaseUrl + "/");
          forgeUrl.searchParams.set("path", key);

          const forgeResp = await fetch(forgeUrl, {
            headers: { Authorization: `Bearer ${forgeKey}` },
          });

          if (!forgeResp.ok) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Storage backend error");
            return;
          }

          const { url } = (await forgeResp.json()) as { url: string };
          if (!url) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Empty signed URL");
            return;
          }

          res.writeHead(307, { Location: url, "Cache-Control": "no-store" });
          res.end();
        } catch {
          res.writeHead(502, { "Content-Type": "text/plain" });
          res.end("Storage proxy error");
        }
      });
    },
  };
}

const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector(), vitePluginStorageProxy(), vitePluginForexApi()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: false, // Will find next available port if 3000 is busy
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
