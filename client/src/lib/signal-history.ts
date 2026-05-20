// ============================================================
// FX Scanner Pro — Signal History Store
// Design: Obsidian Flow — Persistent signal tracking & backtesting
// ============================================================

import type { TradeSignal, PairInfo, Timeframe } from './forex-types';

export interface HistoricalSignal {
  id: string;
  timestamp: number;
  pair: string;
  base: string;
  quote: string;
  group: string;
  timeframe: Timeframe;
  type: 'buy' | 'sell';
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskReward: number;
  confidence: number;
  reason: string;
  // Outcome tracking
  outcome: 'pending' | 'tp1_hit' | 'tp2_hit' | 'tp3_hit' | 'sl_hit' | 'expired';
  outcomePrice: number | null;
  outcomeTimestamp: number | null;
  pnlPips: number | null;
  pnlPercent: number | null;
  // Price at check time
  currentPrice: number | null;
  highSinceEntry: number | null;
  lowSinceEntry: number | null;
}

export interface BacktestStats {
  totalSignals: number;
  winCount: number;
  lossCount: number;
  pendingCount: number;
  winRate: number;
  avgWinPips: number;
  avgLossPips: number;
  profitFactor: number;
  totalPips: number;
  bestTrade: HistoricalSignal | null;
  worstTrade: HistoricalSignal | null;
  byPair: Record<string, { wins: number; losses: number; totalPips: number }>;
  byTimeframe: Record<string, { wins: number; losses: number; totalPips: number }>;
  byType: Record<string, { wins: number; losses: number; totalPips: number }>;
}

const STORAGE_KEY = 'fx-scanner-signal-history';
const MAX_SIGNALS = 500;

// Load from localStorage
export function loadSignalHistory(): HistoricalSignal[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return [];
}

// Save to localStorage
export function saveSignalHistory(signals: HistoricalSignal[]): void {
  try {
    // Keep only the most recent signals
    const trimmed = signals.slice(0, MAX_SIGNALS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
}

// Record a new signal
export function recordSignal(
  pair: PairInfo,
  signal: TradeSignal,
  timeframe: Timeframe,
  currentPrice: number
): HistoricalSignal {
  const id = `${pair.symbol}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    timestamp: Date.now(),
    pair: pair.symbol,
    base: pair.base,
    quote: pair.quote,
    group: pair.group,
    timeframe,
    type: signal.type as 'buy' | 'sell',
    entry: signal.entry,
    stopLoss: signal.stopLoss,
    takeProfit1: signal.takeProfit1,
    takeProfit2: signal.takeProfit2,
    takeProfit3: signal.takeProfit3,
    riskReward: signal.riskReward,
    confidence: signal.confidence,
    reason: signal.reason,
    outcome: 'pending',
    outcomePrice: null,
    outcomeTimestamp: null,
    pnlPips: null,
    pnlPercent: null,
    currentPrice,
    highSinceEntry: currentPrice,
    lowSinceEntry: currentPrice,
  };
}

// Update signal outcome based on current price
export function updateSignalOutcome(
  signal: HistoricalSignal,
  currentPrice: number,
  pipSize: number
): HistoricalSignal {
  if (signal.outcome !== 'pending') return signal;

  const updated = { ...signal };
  updated.currentPrice = currentPrice;

  // Track high/low since entry
  if (currentPrice > (updated.highSinceEntry || 0)) {
    updated.highSinceEntry = currentPrice;
  }
  if (currentPrice < (updated.lowSinceEntry || Infinity)) {
    updated.lowSinceEntry = currentPrice;
  }

  // Check if any target or stop was hit
  if (signal.type === 'buy') {
    if (currentPrice <= signal.stopLoss) {
      updated.outcome = 'sl_hit';
      updated.outcomePrice = signal.stopLoss;
      updated.outcomeTimestamp = Date.now();
      updated.pnlPips = (signal.stopLoss - signal.entry) / pipSize;
    } else if (currentPrice >= signal.takeProfit3) {
      updated.outcome = 'tp3_hit';
      updated.outcomePrice = signal.takeProfit3;
      updated.outcomeTimestamp = Date.now();
      updated.pnlPips = (signal.takeProfit3 - signal.entry) / pipSize;
    } else if (currentPrice >= signal.takeProfit2) {
      updated.outcome = 'tp2_hit';
      updated.outcomePrice = signal.takeProfit2;
      updated.outcomeTimestamp = Date.now();
      updated.pnlPips = (signal.takeProfit2 - signal.entry) / pipSize;
    } else if (currentPrice >= signal.takeProfit1) {
      updated.outcome = 'tp1_hit';
      updated.outcomePrice = signal.takeProfit1;
      updated.outcomeTimestamp = Date.now();
      updated.pnlPips = (signal.takeProfit1 - signal.entry) / pipSize;
    }
  } else {
    // Sell signal
    if (currentPrice >= signal.stopLoss) {
      updated.outcome = 'sl_hit';
      updated.outcomePrice = signal.stopLoss;
      updated.outcomeTimestamp = Date.now();
      updated.pnlPips = (signal.entry - signal.stopLoss) / pipSize;
    } else if (currentPrice <= signal.takeProfit3) {
      updated.outcome = 'tp3_hit';
      updated.outcomePrice = signal.takeProfit3;
      updated.outcomeTimestamp = Date.now();
      updated.pnlPips = (signal.entry - signal.takeProfit3) / pipSize;
    } else if (currentPrice <= signal.takeProfit2) {
      updated.outcome = 'tp2_hit';
      updated.outcomePrice = signal.takeProfit2;
      updated.outcomeTimestamp = Date.now();
      updated.pnlPips = (signal.entry - signal.takeProfit2) / pipSize;
    } else if (currentPrice <= signal.takeProfit1) {
      updated.outcome = 'tp1_hit';
      updated.outcomePrice = signal.takeProfit1;
      updated.outcomeTimestamp = Date.now();
      updated.pnlPips = (signal.entry - signal.takeProfit1) / pipSize;
    }
  }

  // Expire signals older than 24 hours that haven't hit any target
  const age = Date.now() - signal.timestamp;
  if (age > 24 * 60 * 60 * 1000 && updated.outcome === 'pending') {
    updated.outcome = 'expired';
    updated.outcomePrice = currentPrice;
    updated.outcomeTimestamp = Date.now();
    if (signal.type === 'buy') {
      updated.pnlPips = (currentPrice - signal.entry) / pipSize;
    } else {
      updated.pnlPips = (signal.entry - currentPrice) / pipSize;
    }
  }

  if (updated.pnlPips !== null) {
    updated.pnlPercent = (updated.pnlPips * pipSize / signal.entry) * 100;
  }

  return updated;
}

// Calculate backtest statistics
export function calculateBacktestStats(signals: HistoricalSignal[]): BacktestStats {
  const completed = signals.filter(s => s.outcome !== 'pending');
  const wins = completed.filter(s => s.outcome.startsWith('tp'));
  const losses = completed.filter(s => s.outcome === 'sl_hit');
  const pending = signals.filter(s => s.outcome === 'pending');

  const winPips = wins.reduce((sum, s) => sum + (s.pnlPips || 0), 0);
  const lossPips = Math.abs(losses.reduce((sum, s) => sum + (s.pnlPips || 0), 0));

  // By pair
  const byPair: Record<string, { wins: number; losses: number; totalPips: number }> = {};
  completed.forEach(s => {
    if (!byPair[s.pair]) byPair[s.pair] = { wins: 0, losses: 0, totalPips: 0 };
    if (s.outcome.startsWith('tp')) byPair[s.pair].wins++;
    else if (s.outcome === 'sl_hit') byPair[s.pair].losses++;
    byPair[s.pair].totalPips += s.pnlPips || 0;
  });

  // By timeframe
  const byTimeframe: Record<string, { wins: number; losses: number; totalPips: number }> = {};
  completed.forEach(s => {
    if (!byTimeframe[s.timeframe]) byTimeframe[s.timeframe] = { wins: 0, losses: 0, totalPips: 0 };
    if (s.outcome.startsWith('tp')) byTimeframe[s.timeframe].wins++;
    else if (s.outcome === 'sl_hit') byTimeframe[s.timeframe].losses++;
    byTimeframe[s.timeframe].totalPips += s.pnlPips || 0;
  });

  // By type
  const byType: Record<string, { wins: number; losses: number; totalPips: number }> = {};
  completed.forEach(s => {
    if (!byType[s.type]) byType[s.type] = { wins: 0, losses: 0, totalPips: 0 };
    if (s.outcome.startsWith('tp')) byType[s.type].wins++;
    else if (s.outcome === 'sl_hit') byType[s.type].losses++;
    byType[s.type].totalPips += s.pnlPips || 0;
  });

  // Best and worst trades
  const sortedByPnl = [...completed].sort((a, b) => (b.pnlPips || 0) - (a.pnlPips || 0));

  return {
    totalSignals: signals.length,
    winCount: wins.length,
    lossCount: losses.length,
    pendingCount: pending.length,
    winRate: completed.length > 0 ? (wins.length / completed.length) * 100 : 0,
    avgWinPips: wins.length > 0 ? winPips / wins.length : 0,
    avgLossPips: losses.length > 0 ? lossPips / losses.length : 0,
    profitFactor: lossPips > 0 ? winPips / lossPips : winPips > 0 ? Infinity : 0,
    totalPips: completed.reduce((sum, s) => sum + (s.pnlPips || 0), 0),
    bestTrade: sortedByPnl[0] || null,
    worstTrade: sortedByPnl[sortedByPnl.length - 1] || null,
    byPair,
    byTimeframe,
    byType,
  };
}
