import type { CandleData, Timeframe } from './forex-types';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL: Record<Timeframe, number> = {
  '1min': 15000, '2min': 30000, '5min': 45000, '15min': 60000,
  '30min': 120000, '1h': 180000, '4h': 600000, '1day': 1800000, '1week': 3600000,
};

function getCacheKey(symbol: string, interval: string, outputsize: number): string {
  return `${symbol}_${interval}_${outputsize}`;
}

function parseDateTime(datetime: string): number {
  const iso = datetime.replace(' ', 'T') + 'Z';
  const ts = new Date(iso).getTime();
  return isNaN(ts) ? 0 : ts / 1000;
}

export async function fetchCandles(symbol: string, interval: Timeframe, outputsize = 100): Promise<CandleData[]> {
  const cacheKey = getCacheKey(symbol, interval, outputsize);
  const cached = cache.get(cacheKey);
  const ttl = CACHE_TTL[interval] || 60000;
  if (cached && Date.now() - cached.timestamp < ttl) return cached.data;

  try {
    const url = `/api/forex/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${outputsize}`;
    const response = await fetch(url);
    if (!response.ok) { if (cached) return cached.data; return []; }

    const data = await response.json();
    if (data.error || !data.values || !Array.isArray(data.values)) {
      if (cached) return cached.data;
      return [];
    }

    const mapped: CandleData[] = data.values
      .map((v: any) => ({
        time: parseDateTime(v.datetime),
        open: parseFloat(v.open), high: parseFloat(v.high),
        low: parseFloat(v.low), close: parseFloat(v.close),
        volume: v.volume ? parseFloat(v.volume) : undefined,
      }))
      .filter((c: CandleData) => c.time > 0 && !isNaN(c.open) && c.open > 0);

    mapped.sort((a, b) => a.time - b.time);

    const seen = new Set<number>();
    const candles: CandleData[] = [];
    for (const c of mapped) {
      if (!seen.has(c.time)) { seen.add(c.time); candles.push(c); }
    }

    cache.set(cacheKey, { data: candles, timestamp: Date.now() });
    return candles;
  } catch {
    if (cached) return cached.data;
    return [];
  }
}

export async function fetchPrice(symbol: string): Promise<{ price: number; change: number; percentChange: number } | null> {
  const cacheKey = `price_${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 30000) return cached.data;

  try {
    const response = await fetch(`/api/forex/price?symbol=${encodeURIComponent(symbol)}`);
    const data = await response.json();
    if (data.price) {
      const change = data.change || 0;
      const prevClose = data.previousClose || data.price;
      const result = { price: data.price, change, percentChange: prevClose ? ((data.price - prevClose) / prevClose) * 100 : 0 };
      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }
    return null;
  } catch {
    if (cached) return cached.data;
    return null;
  }
}
