export interface CandleData {
  time: number; open: number; high: number; low: number; close: number; volume?: number;
}

export interface PairInfo {
  symbol: string; displayName: string; base: string; quote: string;
  group: 'major' | 'minor' | 'exotic' | 'commodity'; pipSize: number; apiSymbol: string;
}

export interface TrendData {
  direction: 'bullish' | 'bearish' | 'neutral'; strength: number; drawdown: number; drawdownPips: number;
}

export interface PatternData {
  type: 'triangle' | 'flag' | 'wedge' | 'channel' | 'trendline' | 'head_shoulders' | 'double_top' | 'double_bottom';
  direction: 'bullish' | 'bearish' | 'neutral'; reliability: number;
  points: { x: number; y: number }[]; label: string;
}

export interface IndicatorData {
  rsi: number; macd: { macd: number; signal: number; histogram: number };
  ma20: number; ma50: number; ma200: number; atr: number;
}

export interface SupportResistance { supports: number[]; resistances: number[]; }

export interface TradeSignal {
  type: 'buy' | 'sell' | 'neutral'; entry: number; stopLoss: number;
  takeProfit1: number; takeProfit2: number; takeProfit3: number;
  riskReward: number; confidence: number; reason: string;
  sessionActive: boolean; sessionName: string; htfBias: 'bullish' | 'bearish' | 'neutral';
}

export interface PairAnalysis {
  pair: PairInfo; price: number; change24h: number; changePercent: number;
  trend: Record<string, TrendData>; patterns: PatternData[]; indicators: IndicatorData;
  supportResistance: SupportResistance; signal: TradeSignal; candles: CandleData[]; lastUpdate: number;
}

export type Timeframe = '1min' | '2min' | '5min' | '15min' | '30min' | '1h' | '4h' | '1day' | '1week';

export const TIMEFRAMES: { value: Timeframe; label: string; shortLabel: string }[] = [
  { value: '1min', label: '1 Minute', shortLabel: 'M1' },
  { value: '2min', label: '2 Minutes', shortLabel: 'M2' },
  { value: '5min', label: '5 Minutes', shortLabel: 'M5' },
  { value: '15min', label: '15 Minutes', shortLabel: 'M15' },
  { value: '30min', label: '30 Minutes', shortLabel: 'M30' },
  { value: '1h', label: '1 Hour', shortLabel: 'H1' },
  { value: '4h', label: '4 Hours', shortLabel: 'H4' },
  { value: '1day', label: 'Daily', shortLabel: 'D1' },
  { value: '1week', label: 'Weekly', shortLabel: 'W1' },
];

export const FOREX_PAIRS: PairInfo[] = [
  { symbol: 'EUR/USD', displayName: 'EUR/USD', base: 'EUR', quote: 'USD', group: 'major', pipSize: 0.0001, apiSymbol: 'EUR/USD' },
  { symbol: 'GBP/USD', displayName: 'GBP/USD', base: 'GBP', quote: 'USD', group: 'major', pipSize: 0.0001, apiSymbol: 'GBP/USD' },
  { symbol: 'USD/JPY', displayName: 'USD/JPY', base: 'USD', quote: 'JPY', group: 'major', pipSize: 0.01,   apiSymbol: 'USD/JPY' },
  { symbol: 'USD/CHF', displayName: 'USD/CHF', base: 'USD', quote: 'CHF', group: 'major', pipSize: 0.0001, apiSymbol: 'USD/CHF' },
  { symbol: 'AUD/USD', displayName: 'AUD/USD', base: 'AUD', quote: 'USD', group: 'major', pipSize: 0.0001, apiSymbol: 'AUD/USD' },
  { symbol: 'NZD/USD', displayName: 'NZD/USD', base: 'NZD', quote: 'USD', group: 'major', pipSize: 0.0001, apiSymbol: 'NZD/USD' },
  { symbol: 'USD/CAD', displayName: 'USD/CAD', base: 'USD', quote: 'CAD', group: 'major', pipSize: 0.0001, apiSymbol: 'USD/CAD' },
  // XAU/USD: pipSize = 1.0 want 1 pip goud = $1 beweging
  { symbol: 'XAU/USD', displayName: 'XAU/USD', base: 'XAU', quote: 'USD', group: 'commodity', pipSize: 1.0, apiSymbol: 'XAU/USD' },
];

export const PAIR_GROUPS = [
  { value: 'all', label: 'Alle Paren' },
  { value: 'major', label: 'Majors' },
  { value: 'commodity', label: 'Commodities' },
];

export const FLAG_EMOJIS: Record<string, string> = {
  EUR: '🇪🇺', USD: '🇺🇸', GBP: '🇬🇧', JPY: '🇯🇵',
  CHF: '🇨🇭', AUD: '🇦🇺', NZD: '🇳🇿', CAD: '🇨🇦',
  XAU: '🥇', XAG: '🥈',
};
