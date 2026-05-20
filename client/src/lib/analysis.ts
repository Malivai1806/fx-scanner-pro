// ============================================================
// FX Scanner Pro — Technical Analysis Engine (v4 — correct)
// ============================================================

import type {
  CandleData, IndicatorData, PatternData,
  SupportResistance, TradeSignal, TrendData
} from './forex-types';

// ---- Moving Averages ----
export function sma(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    result.push(data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

export function ema(data: number[], period: number): number[] {
  const result: number[] = [];
  const k = 2 / (period + 1);
  let prev = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    if (i === period - 1) { result.push(prev); continue; }
    prev = (data[i] - prev) * k + prev;
    result.push(prev);
  }
  return result;
}

// ---- RSI ----
export function calculateRSI(closes: number[], period = 14): number[] {
  const result: number[] = new Array(period).fill(NaN);
  const gains: number[] = [], losses: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    gains.push(d > 0 ? d : 0);
    losses.push(d < 0 ? -d : 0);
  }
  let ag = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let al = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(100 - 100 / (1 + (al === 0 ? 100 : ag / al)));
  for (let i = period; i < gains.length; i++) {
    ag = (ag * (period - 1) + gains[i]) / period;
    al = (al * (period - 1) + losses[i]) / period;
    result.push(100 - 100 / (1 + (al === 0 ? 100 : ag / al)));
  }
  return result;
}

// ---- MACD ----
export function calculateMACD(closes: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine = emaFast.map((f, i) => f - emaSlow[i]);
  const validMacd = macdLine.filter(v => !isNaN(v));
  const signalLine = ema(validMacd, signal);
  const padded: number[] = [];
  let si = 0;
  for (let i = 0; i < macdLine.length; i++) {
    padded.push(isNaN(macdLine[i]) ? NaN : (si < signalLine.length ? signalLine[si++] : NaN));
  }
  return { macd: macdLine, signal: padded, histogram: macdLine.map((m, i) => m - padded[i]) };
}

// ---- ATR ----
export function calculateATR(candles: CandleData[], period = 14): number[] {
  const tr = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    return Math.max(c.high - c.low, Math.abs(c.high - candles[i-1].close), Math.abs(c.low - candles[i-1].close));
  });
  return sma(tr, period);
}

// ---- Candlestick Patronen ----
function isBullishEngulfing(candles: CandleData[]): boolean {
  if (candles.length < 2) return false;
  const prev = candles[candles.length - 2];
  const curr = candles[candles.length - 1];
  return prev.close < prev.open && // vorige = rood
    curr.close > curr.open && // huidige = groen
    curr.open <= prev.close && // opent onder vorige close
    curr.close >= prev.open; // sluit boven vorige open
}

function isBearishEngulfing(candles: CandleData[]): boolean {
  if (candles.length < 2) return false;
  const prev = candles[candles.length - 2];
  const curr = candles[candles.length - 1];
  return prev.close > prev.open && // vorige = groen
    curr.close < curr.open && // huidige = rood
    curr.open >= prev.close && // opent boven vorige close
    curr.close <= prev.open; // sluit onder vorige open
}

function isPinBarBullish(candle: CandleData): boolean {
  const body = Math.abs(candle.close - candle.open);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;
  const upperWick = candle.high - Math.max(candle.open, candle.close);
  return lowerWick > body * 2 && lowerWick > upperWick * 2;
}

function isPinBarBearish(candle: CandleData): boolean {
  const body = Math.abs(candle.close - candle.open);
  const upperWick = candle.high - Math.max(candle.open, candle.close);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;
  return upperWick > body * 2 && upperWick > lowerWick * 2;
}

// ---- Higher Low / Lower High detectie ----
function hasHigherLow(candles: CandleData[], lookback = 10): boolean {
  if (candles.length < lookback) return false;
  const recent = candles.slice(-lookback);
  const lows = recent.map(c => c.low);
  // Check of de laatste low hoger is dan de voorlaatste low
  const midIdx = Math.floor(lookback / 2);
  const prevLow = Math.min(...lows.slice(0, midIdx));
  const currLow = Math.min(...lows.slice(midIdx));
  return currLow > prevLow;
}

function hasLowerHigh(candles: CandleData[], lookback = 10): boolean {
  if (candles.length < lookback) return false;
  const recent = candles.slice(-lookback);
  const highs = recent.map(c => c.high);
  const midIdx = Math.floor(lookback / 2);
  const prevHigh = Math.max(...highs.slice(0, midIdx));
  const currHigh = Math.max(...highs.slice(midIdx));
  return currHigh < prevHigh;
}

// ---- Sessiefilter ----
export function isInTradingSession(at: Date = new Date()): { active: boolean; session: string } {
  const hour = parseInt(new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam', hour: 'numeric', hour12: false,
  }).format(at));
  const amsterdamDate = new Date(at.toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }));
  const day = amsterdamDate.getDay();
  if (day === 0 || day === 6) return { active: false, session: 'Weekend' };
  if (hour >= 9 && hour < 12) return { active: true, session: 'London Open' };
  if (hour >= 12 && hour < 14) return { active: true, session: 'London Mid' };
  if (hour >= 14 && hour < 18) return { active: true, session: 'London/NY Overlap' };
  if (hour >= 18 && hour < 20) return { active: true, session: 'NY sessie' };
  return { active: false, session: 'Buiten sessie' };
}

// ---- Markt Open ----
export function isMarketOpen(candles: CandleData[]): boolean {
  if (candles.length < 5) return false;
  const recent = candles.slice(-5);
  const avgPrice = recent[recent.length - 1].close;
  const avgSpread = recent.reduce((s, c) => s + (c.high - c.low), 0) / recent.length;
  return (avgSpread / avgPrice) * 100 > 0.005;
}

// ---- Support & Resistance ----
export function findSupportResistance(candles: CandleData[], lookback = 3): SupportResistance {
  const supports: number[] = [], resistances: number[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    let isS = true, isR = true;
    for (let j = 1; j <= lookback; j++) {
      if (candles[i].low > candles[i-j].low || candles[i].low > candles[i+j]?.low) isS = false;
      if (candles[i].high < candles[i-j].high || candles[i].high < candles[i+j]?.high) isR = false;
    }
    if (isS) supports.push(candles[i].low);
    if (isR) resistances.push(candles[i].high);
  }
  const cluster = (levels: number[], threshold: number) => {
    const sorted = [...levels].sort((a, b) => a - b);
    const out: number[] = [];
    let i = 0;
    while (i < sorted.length) {
      const g = [sorted[i]];
      while (i + 1 < sorted.length && sorted[i+1] - sorted[i] < threshold) g.push(sorted[++i]);
      out.push(g.reduce((a, b) => a + b, 0) / g.length);
      i++;
    }
    return out;
  };
  const price = candles[candles.length - 1]?.close || 0;
  return {
    supports: cluster(supports, price * 0.002).slice(-3),
    resistances: cluster(resistances, price * 0.002).slice(-3),
  };
}

// ---- Trend Detection ----
export function detectTrend(candles: CandleData[]): TrendData {
  if (candles.length < 20) return { direction: 'neutral', strength: 0, drawdown: 0, drawdownPips: 0 };
  const closes = candles.map(c => c.close);
  const ma20 = sma(closes, 20);
  const ma50 = sma(closes, Math.min(50, closes.length));
  const last = closes.length - 1;
  const price = closes[last];
  const lma20 = ma20[last], lma50 = ma50[last];
  const lookback = Math.min(20, candles.length);
  let above = 0, below = 0;
  for (let i = candles.length - lookback; i < candles.length; i++) {
    if (!isNaN(ma20[i])) { closes[i] > ma20[i] ? above++ : below++; }
  }
  let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (price > lma20 && price > lma50 && above > below * 1.5) direction = 'bullish';
  else if (price < lma20 && price < lma50 && below > above * 1.5) direction = 'bearish';
  const strength = Math.round(Math.max(above, below) / lookback * 100);
  const slice = candles.slice(-lookback);
  const highest = Math.max(...slice.map(c => c.high));
  const lowest = Math.min(...slice.map(c => c.low));
  const drawdown = direction === 'bullish' ? ((highest - price) / highest) * 100 : ((price - lowest) / lowest) * 100;
  return { direction, strength, drawdown: Math.round(drawdown * 10) / 10, drawdownPips: Math.round(Math.abs(highest - lowest) * 10000) / 10 };
}

// ---- Patroon detectie ----
function findSwingPoints(candles: CandleData[], lb = 2) {
  const highs: { idx: number; price: number }[] = [];
  const lows: { idx: number; price: number }[] = [];
  for (let i = lb; i < candles.length - lb; i++) {
    let isH = true, isL = true;
    for (let j = 1; j <= lb; j++) {
      if (candles[i].high <= candles[i-j].high || candles[i].high <= candles[i+j].high) isH = false;
      if (candles[i].low >= candles[i-j].low || candles[i].low >= candles[i+j].low) isL = false;
    }
    if (isH) highs.push({ idx: i, price: candles[i].high });
    if (isL) lows.push({ idx: i, price: candles[i].low });
  }
  return { highs, lows };
}

function pct(a: number, b: number, p: number) { return Math.abs(a - b) / Math.max(a, b) * 100 < p; }

function countTouches(candles: CandleData[], p1: { idx: number; price: number }, p2: { idx: number; price: number }, side: 'high' | 'low') {
  const dx = p2.idx - p1.idx;
  if (dx === 0) return 2;
  const slope = (p2.price - p1.price) / dx;
  const tol = ((p1.price + p2.price) / 2) * 0.002;
  let t = 0;
  for (let i = p1.idx; i <= Math.min(p2.idx + 5, candles.length - 1); i++) {
    if (Math.abs((side === 'low' ? candles[i].low : candles[i].high) - (p1.price + slope * (i - p1.idx))) < tol) t++;
  }
  return t;
}

export function detectPatterns(candles: CandleData[]): PatternData[] {
  const patterns: PatternData[] = [];
  if (candles.length < 20) return patterns;
  const { highs, lows } = findSwingPoints(candles, 2);
  const len = candles.length;

  if (lows.length >= 2) {
    const [l1, l2] = [lows[lows.length - 2], lows[lows.length - 1]];
    if (l2.price > l1.price && l2.idx > l1.idx) {
      const t = countTouches(candles, l1, l2, 'low');
      patterns.push({ type: 'trendline', direction: 'bullish', reliability: Math.min(50 + t * 15, 90), points: [{ x: l1.idx, y: l1.price }, { x: l2.idx, y: l2.price }], label: `Uptrend (${t} touches)` });
    }
  }
  if (highs.length >= 2) {
    const [h1, h2] = [highs[highs.length - 2], highs[highs.length - 1]];
    if (h2.price < h1.price && h2.idx > h1.idx) {
      const t = countTouches(candles, h1, h2, 'high');
      patterns.push({ type: 'trendline', direction: 'bearish', reliability: Math.min(50 + t * 15, 90), points: [{ x: h1.idx, y: h1.price }, { x: h2.idx, y: h2.price }], label: `Downtrend (${t} touches)` });
    }
  }
  if (highs.length >= 2) {
    const [h1, h2] = [highs[highs.length - 2], highs[highs.length - 1]];
    if (pct(h1.price, h2.price, 0.3) && h2.idx - h1.idx >= 5)
      patterns.push({ type: 'double_top', direction: 'bearish', reliability: 75, points: [{ x: h1.idx, y: h1.price }, { x: h2.idx, y: h2.price }], label: 'Double Top' });
  }
  if (lows.length >= 2) {
    const [l1, l2] = [lows[lows.length - 2], lows[lows.length - 1]];
    if (pct(l1.price, l2.price, 0.3) && l2.idx - l1.idx >= 5)
      patterns.push({ type: 'double_bottom', direction: 'bullish', reliability: 75, points: [{ x: l1.idx, y: l1.price }, { x: l2.idx, y: l2.price }], label: 'Double Bottom' });
  }
  if (highs.length >= 3) {
    const h = highs.slice(-3);
    if (h[1].price > h[0].price && h[1].price > h[2].price && pct(h[0].price, h[2].price, 1.0))
      patterns.push({ type: 'head_shoulders', direction: 'bearish', reliability: 80, points: h.map(p => ({ x: p.idx, y: p.price })), label: 'Head & Shoulders' });
  }
  if (lows.length >= 3) {
    const l = lows.slice(-3);
    if (l[1].price < l[0].price && l[1].price < l[2].price && pct(l[0].price, l[2].price, 1.0))
      patterns.push({ type: 'head_shoulders', direction: 'bullish', reliability: 80, points: l.map(p => ({ x: p.idx, y: p.price })), label: 'Inv. Head & Shoulders' });
  }
  if (highs.length >= 2 && lows.length >= 2) {
    const [lh1, lh2] = highs.slice(-2), [ll1, ll2] = lows.slice(-2);
    const hD = lh2.price < lh1.price, lU = ll2.price > ll1.price;
    const pts = [{ x: ll1.idx, y: ll1.price }, { x: lh1.idx, y: lh1.price }, { x: ll2.idx, y: ll2.price }, { x: lh2.idx, y: lh2.price }];
    if (hD && lU) patterns.push({ type: 'triangle', direction: 'neutral', reliability: 70, points: pts, label: 'Symmetrical Triangle' });
    else if (!hD && lU) patterns.push({ type: 'triangle', direction: 'bullish', reliability: 65, points: pts, label: 'Ascending Triangle' });
    else if (hD && !lU) patterns.push({ type: 'triangle', direction: 'bearish', reliability: 65, points: pts, label: 'Descending Triangle' });
    if (lh2.price > lh1.price && lU) patterns.push({ type: 'wedge', direction: 'bearish', reliability: 65, points: pts, label: 'Rising Wedge' });
    else if (hD && ll2.price < ll1.price) patterns.push({ type: 'wedge', direction: 'bullish', reliability: 65, points: pts, label: 'Falling Wedge' });
  }
  if (len >= 20) {
    const pole = Math.abs(candles[len-5].close - candles[len-15].close);
    const cons = Math.max(...candles.slice(-5).map(c => c.high)) - Math.min(...candles.slice(-5).map(c => c.low));
    if (pole > 0 && cons < pole * 0.4)
      patterns.push({ type: 'flag', direction: candles[len-5].close > candles[len-15].close ? 'bullish' : 'bearish', reliability: 70, points: [{ x: len-15, y: candles[len-15].close }, { x: len-5, y: candles[len-5].close }], label: candles[len-5].close > candles[len-15].close ? 'Bull Flag' : 'Bear Flag' });
  }
  return patterns;
}

// ---- Indicators ----
export function calculateIndicators(candles: CandleData[]): IndicatorData {
  const closes = candles.map(c => c.close);
  const last = closes.length - 1;
  const rsi = calculateRSI(closes);
  const macd = calculateMACD(closes);
  const ma20 = sma(closes, 20);
  const ma50 = sma(closes, Math.min(50, closes.length));
  const ma200 = sma(closes, Math.min(200, closes.length));
  const atr = calculateATR(candles);
  return {
    rsi: rsi[last] || 50,
    macd: { macd: macd.macd[last] || 0, signal: macd.signal[last] || 0, histogram: macd.histogram[last] || 0 },
    ma20: ma20[last] || closes[last],
    ma50: ma50[last] || closes[last],
    ma200: ma200[last] || closes[last],
    atr: atr[last] || 0,
  };
}

// ---- Signaal Generatie (v4 — correct & consistent) ----
export function generateSignal(
  candles: CandleData[],
  indicators: IndicatorData,
  sr: SupportResistance,
  trend: TrendData,
  pipSize: number,
  htfTrend?: TrendData,
  evaluationTime?: number
): TradeSignal {
  const price = candles[candles.length - 1].close;
  const atr = indicators.atr;
  const session = isInTradingSession(evaluationTime ? new Date(evaluationTime) : new Date());
  const htfBias = htfTrend?.direction || 'neutral';

  // Geen signaal buiten sessie of gesloten markt
  if (!isMarketOpen(candles) || !session.active) {
    return {
      type: 'neutral', entry: price, stopLoss: price - atr * 2,
      takeProfit1: price + atr, takeProfit2: price + atr * 2, takeProfit3: price + atr * 3,
      riskReward: 0, confidence: 0,
      reason: !session.active ? session.session : 'Markt gesloten',
      sessionActive: session.active,
      sessionName: session.session,
      htfBias,
    };
  }

  // ── Scores ──────────────────────────────────────────────────
  let buyScore = 0, sellScore = 0;
  const buyR: string[] = [], sellR: string[] = [];

  // 1. TREND (zwaarste weging — bepaalt de richting)
  if (trend.direction === 'bullish' && trend.strength >= 55) {
    buyScore += 3; buyR.push(`Uptrend (${trend.strength}%)`);
  } else if (trend.direction === 'bearish' && trend.strength >= 55) {
    sellScore += 3; sellR.push(`Downtrend (${trend.strength}%)`);
  }

  // 2. PRICE ACTION — candlestick patronen (leading indicator)
  if (isBullishEngulfing(candles)) {
    buyScore += 3; buyR.push('Bullish engulfing');
  } else if (isBearishEngulfing(candles)) {
    sellScore += 3; sellR.push('Bearish engulfing');
  }
  const lastCandle = candles[candles.length - 1];
  if (isPinBarBullish(lastCandle)) {
    buyScore += 2; buyR.push('Bullish pin bar');
  } else if (isPinBarBearish(lastCandle)) {
    sellScore += 2; sellR.push('Bearish pin bar');
  }

  // 3. PRICE STRUCTURE — higher lows / lower highs
  if (hasHigherLow(candles)) {
    buyScore += 2; buyR.push('Higher low structuur');
  }
  if (hasLowerHigh(candles)) {
    sellScore += 2; sellR.push('Lower high structuur');
  }

  // 4. RSI — alleen als extremen (oversold/overbought)
  // RSI oversold in bearish trend = KOOP kans (reversal)
  // RSI overbought in bullish trend = VERKOOP kans (reversal)
  if (indicators.rsi < 30) {
    buyScore += 3; buyR.push(`RSI oversold (${indicators.rsi.toFixed(1)})`);
  } else if (indicators.rsi > 70) {
    sellScore += 3; sellR.push(`RSI overbought (${indicators.rsi.toFixed(1)})`);
  } else if (indicators.rsi < 40 && trend.direction === 'bullish') {
    // Pullback in uptrend = koopkans
    buyScore += 1; buyR.push(`RSI pullback in uptrend`);
  } else if (indicators.rsi > 60 && trend.direction === 'bearish') {
    // Bounce in downtrend = verkoopkans
    sellScore += 1; sellR.push(`RSI bounce in downtrend`);
  }

  // 5. MACD — bevestiging, niet leidend
  if (indicators.macd.histogram > 0 && indicators.macd.macd > indicators.macd.signal) {
    buyScore += 1; buyR.push('MACD bullish');
  } else if (indicators.macd.histogram < 0 && indicators.macd.macd < indicators.macd.signal) {
    sellScore += 1; sellR.push('MACD bearish');
  }

  // 6. MA ALIGNMENT — bevestiging
  if (price > indicators.ma20 && price > indicators.ma50) {
    buyScore += 1; buyR.push('Boven MA20 & MA50');
  } else if (price < indicators.ma20 && price < indicators.ma50) {
    sellScore += 1; sellR.push('Onder MA20 & MA50');
  }

  // 7. HTF BIAS — blokkeer tegen-trend trades
  if (htfTrend && htfTrend.strength >= 55) {
    if (htfTrend.direction === 'bullish') {
      buyScore += 1; buyR.push(`HTF bullish`);
    } else if (htfTrend.direction === 'bearish') {
      sellScore += 1; sellR.push(`HTF bearish`);
    }
  }

  // ── Bepaal signaal ───────────────────────────────────────────
  // Minimale drempel: 5 punten EN duidelijk dominantie (2+ punten verschil)
  let type: 'buy' | 'sell' | 'neutral' = 'neutral';
  let reasons: string[] = [];

  const gap = Math.abs(buyScore - sellScore);

  if (buyScore >= 5 && buyScore > sellScore && gap >= 2) {
    // Blokkeer als HTF hard tegenstaat
    if (htfTrend && htfTrend.direction === 'bearish' && htfTrend.strength >= 65) {
      reasons = [`HTF bearish blokkeert buy`];
    } else {
      type = 'buy'; reasons = buyR;
    }
  } else if (sellScore >= 5 && sellScore > buyScore && gap >= 2) {
    if (htfTrend && htfTrend.direction === 'bullish' && htfTrend.strength >= 65) {
      reasons = [`HTF bullish blokkeert sell`];
    } else {
      type = 'sell'; reasons = sellR;
    }
  } else {
    reasons = ['Geen duidelijk signaal'];
  }

  // ── Confidence ──────────────────────────────────────────────
  // Gebaseerd op gap en totaalscore, max 90%
  const totalScore = buyScore + sellScore;
  const confidence = totalScore > 0
    ? Math.min(Math.round(50 + (gap / totalScore) * 50), 90)
    : 0;

  // ── SL / TP berekening ───────────────────────────────────────
  const validSupports = sr.supports.filter(s => s < price);
  const validResistances = sr.resistances.filter(r => r > price);
  const nearSupport = validSupports.length > 0
    ? validSupports.reduce((p, c) => Math.abs(c - price) < Math.abs(p - price) ? c : p)
    : price - atr * 1.5;
  const nearResistance = validResistances.length > 0
    ? validResistances.reduce((p, c) => Math.abs(c - price) < Math.abs(p - price) ? c : p)
    : price + atr * 1.5;

  let stopLoss: number, tp1: number, tp2: number, tp3: number;

  if (type === 'buy') {
    // SL: onder dichtstbijzijnde support of 1.5x ATR, max 2x ATR
    stopLoss = Math.max(nearSupport - atr * 0.3, price - atr * 2);
    const risk = price - stopLoss;
    tp1 = price + risk * 1.5;
    tp2 = price + risk * 2.5;
    tp3 = Math.max(nearResistance, price + risk * 3.5);
  } else if (type === 'sell') {
    // SL: boven dichtstbijzijnde resistance of 1.5x ATR, max 2x ATR
    stopLoss = Math.min(nearResistance + atr * 0.3, price + atr * 2);
    const risk = stopLoss - price;
    tp1 = price - risk * 1.5;
    tp2 = price - risk * 2.5;
    tp3 = Math.min(nearSupport, price - risk * 3.5);
  } else {
    stopLoss = price - atr * 1.5;
    tp1 = price + atr; tp2 = price + atr * 2; tp3 = price + atr * 3;
  }

  const risk = Math.abs(price - stopLoss);
  const reward = Math.abs(tp2 - price);
  const riskReward = risk > 0 ? Math.round((reward / risk) * 10) / 10 : 0;

  return {
    type, entry: price, stopLoss,
    takeProfit1: tp1, takeProfit2: tp2, takeProfit3: tp3,
    riskReward, confidence,
    reason: reasons.slice(0, 4).join(' + '),
    sessionActive: session.active,
    sessionName: session.session,
    htfBias,
  };
}
