import 'dotenv/config';
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = 'https://api.twelvedata.com';

// Key rotation — automatisch overschakelen als limiet bereikt is
const KEYS = [
  '77286f61bc4c4daea25bfc6db03a10d5',
  'c4171da6842f4cf194c73a0ebeb1db2d',
  '3c87615290d640b69ee099f3c9ecf5e8',
  '6596dcf492a14ab4940a3440fd186bf2',
  'cf92c63f0ac446cea2659879e505fe67',
];
let currentKeyIdx = 0;
const keyExhausted = new Set<number>();

function getKey(): string {
  return KEYS[currentKeyIdx];
}

function rotateKey(): boolean {
  keyExhausted.add(currentKeyIdx);
  for (let i = 0; i < KEYS.length; i++) {
    if (!keyExhausted.has(i)) {
      currentKeyIdx = i;
      console.log(`🔄 Switched to API key ${i + 1}`);
      return true;
    }
  }
  console.error('❌ All API keys exhausted');
  return false;
}

// Reset exhausted keys elke dag om 02:00
function scheduleKeyReset() {
  const now = new Date();
  const next = new Date();
  next.setHours(2, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const ms = next.getTime() - now.getTime();
  setTimeout(() => {
    keyExhausted.clear();
    currentKeyIdx = 0;
    console.log('🔑 API keys reset');
    scheduleKeyReset();
  }, ms);
}
scheduleKeyReset();

const SYM: Record<string, string> = {
  'EUR/USD': 'EUR/USD', 'GBP/USD': 'GBP/USD', 'USD/JPY': 'USD/JPY',
  'USD/CHF': 'USD/CHF', 'AUD/USD': 'AUD/USD', 'NZD/USD': 'NZD/USD',
  'USD/CAD': 'USD/CAD', 'XAU/USD': 'XAU/USD',
};

const IV: Record<string, string> = {
  '1min': '1min', '2min': '2min', '5min': '5min', '15min': '15min',
  '30min': '30min', '1h': '1h', '4h': '4h', '1day': '1day', '1week': '1week',
};

// Cache — 3 minuten
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_MS = 3 * 60 * 1000;
function fromCache(k: string) { const c = cache.get(k); return c && Date.now() - c.ts < CACHE_MS ? c.data : null; }
function toCache(k: string, d: any) { cache.set(k, { data: d, ts: Date.now() }); }

async function td(endpoint: string): Promise<any> {
  for (let attempt = 0; attempt < KEYS.length; attempt++) {
    const key = getKey();
    const r = await fetch(`${BASE}${endpoint}&apikey=${key}`, {
      headers: { 'User-Agent': 'FXPro/1.0' }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();

    if (d.status === 'error') {
      const msg: string = d.message || '';
      // Rate limit of dagelijkse limiet bereikt
      if (msg.includes('run out') || msg.includes('credits') || msg.includes('rate limit')) {
        console.warn(`⚠️  Key ${currentKeyIdx + 1} exhausted: ${msg}`);
        const rotated = rotateKey();
        if (!rotated) throw new Error('Alle API keys opgebruikt voor vandaag');
        continue; // probeer opnieuw met nieuwe key
      }
      throw new Error(msg);
    }
    return d;
  }
  throw new Error('Alle API keys opgebruikt');
}

const app = express();
const server = createServer(app);
app.use(express.json({ limit: '2mb' }));

// ── Candles ──────────────────────────────────────────────────
app.get('/api/forex/candles', async (req, res) => {
  try {
    const { symbol, interval = '1h', outputsize = '100' } = req.query as Record<string, string>;
    const sym = SYM[symbol];
    if (!sym) return res.status(400).json({ error: `Unknown: ${symbol}` });

    const iv = IV[interval] || '1h';
    const sz = Math.min(parseInt(outputsize) || 100, 500);
    const cacheKey = `candles_${symbol}_${iv}_${sz}`;
    const cached = fromCache(cacheKey);
    if (cached) return res.json(cached);

    const cD = await td(`/time_series?symbol=${encodeURIComponent(sym)}&interval=${iv}&outputsize=${sz}`);

    const cs = (cD.values || [])
      .map((v: any) => ({ datetime: v.datetime, open: v.open, high: v.high, low: v.low, close: v.close, volume: v.volume || '0' }))
      .filter((c: any) => parseFloat(c.open) > 0);
    const latestPrice = parseFloat(cs[0]?.close || '0');

    const result = { meta: { symbol, interval, exchange: 'FOREX', currency: 'USD' }, values: cs, price: latestPrice };
    toCache(cacheKey, result);
    res.json(result);
  } catch (e: any) {
    console.error('Candles error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Price ────────────────────────────────────────────────────
app.get('/api/forex/price', async (req, res) => {
  try {
    const { symbol } = req.query as Record<string, string>;
    const sym = SYM[symbol];
    if (!sym) return res.status(400).json({ error: `Unknown: ${symbol}` });

    const cacheKey = `price_${symbol}`;
    const cached = fromCache(cacheKey);
    if (cached) return res.json(cached);

    const [pD, eD] = await Promise.all([
      td(`/price?symbol=${encodeURIComponent(sym)}`),
      td(`/time_series?symbol=${encodeURIComponent(sym)}&interval=1day&outputsize=2`).catch(() => null),
    ]);

    const price = parseFloat(pD.price);
    const prev = eD?.values?.[1] ? parseFloat(eD.values[1].close) : null;
    const result = { price, previousClose: prev, change: prev ? price - prev : null };
    toCache(cacheKey, result);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Prices ───────────────────────────────────────────────────
app.get('/api/forex/prices', async (req, res) => {
  try {
    const cacheKey = 'prices_all';
    const cached = fromCache(cacheKey);
    if (cached) return res.json(cached);

    const syms = Object.values(SYM).join(',');
    const data = await td(`/price?symbol=${encodeURIComponent(syms)}`);
    const result: Record<string, any> = {};
    for (const [fx, ts] of Object.entries(SYM)) {
      const p = (data as any)[ts] || (data as any)[fx];
      result[fx] = { price: p?.price ? parseFloat(p.price) : null, previousClose: null };
    }
    toCache(cacheKey, result);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/health', (_, res) => res.json({
  status: 'ok', source: 'TwelveData',
  activeKey: currentKeyIdx + 1,
  exhaustedKeys: Array.from(keyExhausted).map(i => i + 1),
  ts: Date.now()
}));

const sp = path.resolve(__dirname, 'public');
app.use(express.static(sp));
app.get('*', (_, res) => res.sendFile(path.join(sp, 'index.html')));

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`✅ FX Scanner Pro op http://localhost:${port}/`);
  console.log(`🔑 ${KEYS.length} API keys geladen — automatische rotation`);
  console.log(`📊 Twelve Data — realtime data`);
  console.log('🤖 AI uitgeschakeld');
});
