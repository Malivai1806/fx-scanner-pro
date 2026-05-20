#!/bin/bash
cd ~/Downloads/fx-scanner-pro-app

echo "▶ Fix analytics..."
sed -i '' '/%VITE_ANALYTICS/d' client/index.html

echo "▶ Schrijf nieuwe server met Twelve Data..."
cat > server/index.ts << 'EOF'
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TWELVE_KEY = '77286f61bc4c4daea25bfc6db03a10d5';
const BASE = 'https://api.twelvedata.com';

const SYMBOLS: Record<string, string> = {
  'EUR/USD':'EUR/USD','GBP/USD':'GBP/USD','USD/JPY':'USD/JPY',
  'USD/CHF':'USD/CHF','AUD/USD':'AUD/USD','NZD/USD':'NZD/USD',
  'USD/CAD':'USD/CAD','EUR/GBP':'EUR/GBP','EUR/JPY':'EUR/JPY',
  'GBP/JPY':'GBP/JPY','AUD/JPY':'AUD/JPY','EUR/AUD':'EUR/AUD',
  'GBP/AUD':'GBP/AUD','EUR/CAD':'EUR/CAD','GBP/CAD':'GBP/CAD',
  'AUD/CAD':'AUD/CAD','NZD/JPY':'NZD/JPY','XAU/USD':'XAU/USD',
};

const IV: Record<string, string> = {
  '1min':'1min','2min':'2min','5min':'5min','15min':'15min',
  '30min':'30min','1h':'1h','4h':'4h','1day':'1day','1week':'1week',
};

async function td(endpoint: string) {
  const res = await fetch(`${BASE}${endpoint}&apikey=${TWELVE_KEY}`, {
    headers: { 'User-Agent': 'FXScannerPro/1.0' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = await res.json();
  if (d.status === 'error') throw new Error(d.message || 'API error');
  return d;
}

const app = express();
const server = createServer(app);
app.use(express.json());

app.get('/api/forex/candles', async (req, res) => {
  try {
    const { symbol, interval = '1h', outputsize = '100' } = req.query as Record<string,string>;
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });
    const sym = SYMBOLS[symbol];
    if (!sym) return res.status(400).json({ error: `Unknown: ${symbol}` });
    const iv = IV[interval] || '1h';
    const sz = Math.min(parseInt(outputsize)||100, 500);

    const [cData, pData] = await Promise.all([
      td(`/time_series?symbol=${encodeURIComponent(sym)}&interval=${iv}&outputsize=${sz}`),
      td(`/price?symbol=${encodeURIComponent(sym)}`),
    ]);

    const livePrice = parseFloat(pData.price);
    const candles = (cData.values || [])
      .map((v: any) => ({ datetime:v.datetime, open:v.open, high:v.high, low:v.low, close:v.close, volume:v.volume||'0' }))
      .filter((c: any) => parseFloat(c.open) > 0);

    if (livePrice && candles.length > 0) {
      const now = new Date().toISOString().replace('T',' ').slice(0,19);
      const prev = parseFloat(candles[0].close);
      candles.unshift({
        datetime: now,
        open: String(prev),
        high: String(Math.max(prev, livePrice)),
        low: String(Math.min(prev, livePrice)),
        close: String(livePrice),
        volume: '0',
      });
    }

    res.json({
      meta: { symbol, interval, exchange:'FOREX', currency:'USD' },
      values: candles,
      price: livePrice || parseFloat(candles[0]?.close || '0'),
    });
  } catch (e: any) {
    console.error('Candles error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/forex/price', async (req, res) => {
  try {
    const { symbol } = req.query as Record<string,string>;
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });
    const sym = SYMBOLS[symbol];
    if (!sym) return res.status(400).json({ error: `Unknown: ${symbol}` });

    const [pData, eodData] = await Promise.all([
      td(`/price?symbol=${encodeURIComponent(sym)}`),
      td(`/time_series?symbol=${encodeURIComponent(sym)}&interval=1day&outputsize=2`).catch(() => null),
    ]);

    const price = parseFloat(pData.price);
    const previousClose = eodData?.values?.[1] ? parseFloat(eodData.values[1].close) : null;
    res.json({ price, previousClose, change: previousClose ? price - previousClose : null });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/forex/prices', async (req, res) => {
  try {
    const syms = Object.values(SYMBOLS).join(',');
    const data = await td(`/price?symbol=${encodeURIComponent(syms)}`);
    const result: Record<string,any> = {};
    for (const [fxSym, tdSym] of Object.entries(SYMBOLS)) {
      const p = data[tdSym] || data[fxSym];
      result[fxSym] = { price: p?.price ? parseFloat(p.price) : null, previousClose: null };
    }
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/health', (_req, res) => res.json({ status:'ok', source:'TwelveData', ts:Date.now() }));

const staticPath = path.resolve(__dirname, "public");
app.use(express.static(staticPath));
app.get("*", (_req, res) => res.sendFile(path.join(staticPath, "index.html")));

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`✅ FX Scanner Pro op http://localhost:${port}/`);
  console.log(`📊 Data: Twelve Data live`);
});
EOF

echo "▶ Verlaag signaal drempel..."
sed -i '' 's/buyScore >= 5 && buyScore > sellScore + 3/buyScore >= 4 \&\& buyScore > sellScore + 1/g' client/src/lib/analysis.ts 2>/dev/null || true
sed -i '' 's/sellScore >= 5 && sellScore > buyScore + 3/sellScore >= 4 \&\& sellScore > buyScore + 1/g' client/src/lib/analysis.ts 2>/dev/null || true

echo "▶ Build en start..."
pnpm build && pnpm start
