// ============================================================
// FX Scanner Pro — Historical Backtest Engine
// ============================================================

import {
  calculateIndicators,
  detectTrend,
  findSupportResistance,
  generateSignal,
} from './analysis';
import type { CandleData, PairInfo, Timeframe, TradeSignal } from './forex-types';

export type BacktestOutcome = 'tp1_hit' | 'tp2_hit' | 'tp3_hit' | 'sl_hit' | 'expired';

export interface BacktestTrade {
  id: string;
  pair: string;
  timeframe: Timeframe;
  type: 'buy' | 'sell';
  entryTime: number;
  exitTime: number;
  entry: number;
  exit: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  outcome: BacktestOutcome;
  pnlPips: number;
  pnlR: number;
  confidence: number;
  reason: string;
}

export interface BacktestStats {
  pair: string;
  timeframe: Timeframe;
  candlesTested: number;
  totalTrades: number;
  wins: number;
  losses: number;
  expired: number;
  winRate: number;
  totalPips: number;
  totalR: number;
  profitFactor: number;
  avgWinPips: number;
  avgLossPips: number;
  maxDrawdownPips: number;
  maxLosingStreak: number;
  bestTrade: BacktestTrade | null;
  worstTrade: BacktestTrade | null;
}

export interface BacktestResult {
  trades: BacktestTrade[];
  stats: BacktestStats;
}

const MIN_LOOKBACK = 80;

export const BACKTEST_HTF_MAP: Partial<Record<Timeframe, Timeframe>> = {
  '1min': '15min',
  '2min': '15min',
  '5min': '1h',
  '15min': '1h',
  '30min': '4h',
  '1h': '4h',
  '4h': '1day',
  '1day': '1week',
};

function timeframeMaxHoldBars(timeframe: Timeframe): number {
  switch (timeframe) {
    case '1min':
    case '2min':
      return 90;
    case '5min':
      return 72;
    case '15min':
      return 56;
    case '30min':
      return 48;
    case '1h':
      return 36;
    case '4h':
      return 24;
    case '1day':
      return 12;
    case '1week':
      return 8;
    default:
      return 40;
  }
}

function resolveTrade(
  signal: TradeSignal,
  pair: PairInfo,
  timeframe: Timeframe,
  entryCandleIndex: number,
  candles: CandleData[],
): { trade: BacktestTrade; exitIndex: number } | null {
  const entryCandle = candles[entryCandleIndex];
  if (!entryCandle || signal.type === 'neutral') return null;

  const entry = entryCandle.open;
  const isBuy = signal.type === 'buy';
  const maxHoldBars = timeframeMaxHoldBars(timeframe);
  const lastIndex = Math.min(candles.length - 1, entryCandleIndex + maxHoldBars);

  let stopLoss = signal.stopLoss;
  let takeProfit1 = signal.takeProfit1;
  let takeProfit2 = signal.takeProfit2;
  let takeProfit3 = signal.takeProfit3;

  const originalRisk = Math.abs(signal.entry - signal.stopLoss);
  if (originalRisk <= 0) return null;

  // Keep the scanner's risk model, but anchor it to next-candle execution.
  if (isBuy) {
    stopLoss = entry - originalRisk;
    takeProfit1 = entry + originalRisk * 1.5;
    takeProfit2 = entry + originalRisk * 2.5;
    takeProfit3 = entry + originalRisk * 3.5;
  } else {
    stopLoss = entry + originalRisk;
    takeProfit1 = entry - originalRisk * 1.5;
    takeProfit2 = entry - originalRisk * 2.5;
    takeProfit3 = entry - originalRisk * 3.5;
  }

  let outcome: BacktestOutcome = 'expired';
  let exit = candles[lastIndex].close;
  let exitIndex = lastIndex;

  for (let i = entryCandleIndex; i <= lastIndex; i++) {
    const c = candles[i];

    if (isBuy) {
      if (c.low <= stopLoss) {
        outcome = 'sl_hit';
        exit = stopLoss;
        exitIndex = i;
        break;
      }
      if (c.high >= takeProfit3) {
        outcome = 'tp3_hit';
        exit = takeProfit3;
        exitIndex = i;
        break;
      }
      if (c.high >= takeProfit2) {
        outcome = 'tp2_hit';
        exit = takeProfit2;
        exitIndex = i;
        break;
      }
      if (c.high >= takeProfit1) {
        outcome = 'tp1_hit';
        exit = takeProfit1;
        exitIndex = i;
        break;
      }
    } else {
      if (c.high >= stopLoss) {
        outcome = 'sl_hit';
        exit = stopLoss;
        exitIndex = i;
        break;
      }
      if (c.low <= takeProfit3) {
        outcome = 'tp3_hit';
        exit = takeProfit3;
        exitIndex = i;
        break;
      }
      if (c.low <= takeProfit2) {
        outcome = 'tp2_hit';
        exit = takeProfit2;
        exitIndex = i;
        break;
      }
      if (c.low <= takeProfit1) {
        outcome = 'tp1_hit';
        exit = takeProfit1;
        exitIndex = i;
        break;
      }
    }
  }

  const pnlPips = isBuy
    ? (exit - entry) / pair.pipSize
    : (entry - exit) / pair.pipSize;
  const riskPips = Math.abs(entry - stopLoss) / pair.pipSize;

  return {
    exitIndex,
    trade: {
      id: `${pair.symbol}_${timeframe}_${entryCandle.time}`,
      pair: pair.symbol,
      timeframe,
      type: signal.type,
      entryTime: entryCandle.time,
      exitTime: candles[exitIndex].time,
      entry,
      exit,
      stopLoss,
      takeProfit1,
      takeProfit2,
      takeProfit3,
      outcome,
      pnlPips,
      pnlR: riskPips > 0 ? pnlPips / riskPips : 0,
      confidence: signal.confidence,
      reason: signal.reason,
    },
  };
}

function calculateStats(pair: PairInfo, timeframe: Timeframe, candles: CandleData[], trades: BacktestTrade[]): BacktestStats {
  const wins = trades.filter(t => t.outcome.startsWith('tp'));
  const losses = trades.filter(t => t.outcome === 'sl_hit');
  const expired = trades.filter(t => t.outcome === 'expired');
  const grossWin = wins.reduce((sum, t) => sum + Math.max(t.pnlPips, 0), 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + Math.min(t.pnlPips, 0), 0));
  const totalPips = trades.reduce((sum, t) => sum + t.pnlPips, 0);
  const totalR = trades.reduce((sum, t) => sum + t.pnlR, 0);

  let equity = 0;
  let peak = 0;
  let maxDrawdownPips = 0;
  let losingStreak = 0;
  let maxLosingStreak = 0;

  for (const trade of trades) {
    equity += trade.pnlPips;
    peak = Math.max(peak, equity);
    maxDrawdownPips = Math.max(maxDrawdownPips, peak - equity);
    if (trade.pnlPips < 0) {
      losingStreak++;
      maxLosingStreak = Math.max(maxLosingStreak, losingStreak);
    } else {
      losingStreak = 0;
    }
  }

  const sorted = [...trades].sort((a, b) => b.pnlPips - a.pnlPips);

  return {
    pair: pair.symbol,
    timeframe,
    candlesTested: candles.length,
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    expired: expired.length,
    winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
    totalPips,
    totalR,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
    avgWinPips: wins.length ? grossWin / wins.length : 0,
    avgLossPips: losses.length ? grossLoss / losses.length : 0,
    maxDrawdownPips,
    maxLosingStreak,
    bestTrade: sorted[0] || null,
    worstTrade: sorted[sorted.length - 1] || null,
  };
}

export function runHistoricalBacktest(
  pair: PairInfo,
  timeframe: Timeframe,
  candles: CandleData[],
  htfCandles: CandleData[] = [],
): BacktestResult {
  const trades: BacktestTrade[] = [];

  if (candles.length < MIN_LOOKBACK + 5) {
    return { trades, stats: calculateStats(pair, timeframe, candles, trades) };
  }

  let i = MIN_LOOKBACK;
  while (i < candles.length - 2) {
    const window = candles.slice(0, i + 1);
    const indicators = calculateIndicators(window);
    if (!Number.isFinite(indicators.atr) || indicators.atr <= 0) {
      i++;
      continue;
    }

    const trend = detectTrend(window);
    const sr = findSupportResistance(window);
    const htfWindow = htfCandles
      .filter(c => c.time <= candles[i].time)
      .slice(-MIN_LOOKBACK);
    const htfTrend = htfWindow.length >= 20 ? detectTrend(htfWindow) : undefined;
    const signal = generateSignal(
      window,
      indicators,
      sr,
      trend,
      pair.pipSize,
      htfTrend,
      candles[i].time * 1000,
    );

    if (signal.type === 'neutral') {
      i++;
      continue;
    }

    const resolved = resolveTrade(signal, pair, timeframe, i + 1, candles);
    if (!resolved) {
      i++;
      continue;
    }

    trades.push(resolved.trade);
    i = Math.max(resolved.exitIndex + 1, i + 2);
  }

  return { trades, stats: calculateStats(pair, timeframe, candles, trades) };
}
