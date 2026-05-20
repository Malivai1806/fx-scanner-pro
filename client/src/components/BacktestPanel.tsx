// ============================================================
// FX Scanner Pro — Historical Backtest Panel
// ============================================================

import { useMemo, useState } from 'react';
import { BarChart3, Loader2, Play, ShieldAlert, Target, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchCandles } from '@/lib/api-service';
import {
  BACKTEST_HTF_MAP,
  runHistoricalBacktest,
  type BacktestResult,
  type BacktestTrade,
} from '@/lib/backtest';
import { FOREX_PAIRS, TIMEFRAMES, type PairInfo, type Timeframe } from '@/lib/forex-types';

const CANDLE_OPTIONS = [200, 300, 500];

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(pair: PairInfo, value: number): string {
  const decimals = pair.pipSize < 0.01 ? 5 : pair.pipSize < 0.1 ? 3 : 2;
  return value.toFixed(decimals);
}

function formatNumber(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '∞';
  return value.toFixed(digits);
}

export function BacktestPanel() {
  const [pairSymbol, setPairSymbol] = useState(FOREX_PAIRS[0].symbol);
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [candleCount, setCandleCount] = useState(300);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pair = useMemo(
    () => FOREX_PAIRS.find(p => p.symbol === pairSymbol) || FOREX_PAIRS[0],
    [pairSymbol],
  );

  const runBacktest = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const candles = await fetchCandles(pair.apiSymbol, timeframe, candleCount);
      if (candles.length < 100) {
        throw new Error(`Te weinig candles ontvangen (${candles.length}). Probeer later opnieuw of kies minder data.`);
      }
      const htfTimeframe = BACKTEST_HTF_MAP[timeframe];
      const htfCandles = htfTimeframe
        ? await fetchCandles(pair.apiSymbol, htfTimeframe, Math.min(candleCount, 500))
        : [];
      setResult(runHistoricalBacktest(pair, timeframe, candles, htfCandles));
    } catch (err: any) {
      setError(err.message || 'Backtest mislukt');
    } finally {
      setIsRunning(false);
    }
  };

  const stats = result?.stats;
  const recentTrades = result?.trades.slice(-15).reverse() || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-foreground">Historische Backtest</h2>
          <p className="text-xs text-muted-foreground">
            Test dezelfde scannerlogica candle-voor-candle zonder vooruitkijken.
          </p>
        </div>
        <Button
          onClick={runBacktest}
          disabled={isRunning}
          className="gap-2 bg-bullish/15 hover:bg-bullish/20 text-bullish border border-bullish/20"
        >
          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Run Backtest
        </Button>
      </div>

      <div className="glass-panel p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="space-y-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pair</span>
            <select
              value={pairSymbol}
              onChange={e => setPairSymbol(e.target.value)}
              className="w-full bg-background border border-border/50 rounded-md px-3 py-2 text-sm text-foreground"
            >
              {FOREX_PAIRS.map(p => (
                <option key={p.symbol} value={p.symbol}>{p.symbol}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Timeframe</span>
            <select
              value={timeframe}
              onChange={e => setTimeframe(e.target.value as Timeframe)}
              className="w-full bg-background border border-border/50 rounded-md px-3 py-2 text-sm text-foreground"
            >
              {TIMEFRAMES.map(tf => (
                <option key={tf.value} value={tf.value}>{tf.shortLabel}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Candles</span>
            <select
              value={candleCount}
              onChange={e => setCandleCount(Number(e.target.value))}
              className="w-full bg-background border border-border/50 rounded-md px-3 py-2 text-sm text-foreground"
            >
              {CANDLE_OPTIONS.map(count => (
                <option key={count} value={count}>{count}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && (
        <div className="glass-panel p-4 border border-bearish/20">
          <div className="flex items-center gap-2 text-sm text-bearish">
            <ShieldAlert className="w-4 h-4" />
            {error}
          </div>
        </div>
      )}

      {stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            <StatCard label="Trades" value={String(stats.totalTrades)} icon={<BarChart3 className="w-4 h-4" />} />
            <StatCard label="Winrate" value={`${formatNumber(stats.winRate)}%`} icon={<Trophy className="w-4 h-4" />} tone={stats.winRate >= 60 ? 'bullish' : stats.winRate >= 45 ? 'gold' : 'bearish'} />
            <StatCard label="Profit Factor" value={formatNumber(stats.profitFactor, 2)} icon={<Target className="w-4 h-4" />} tone={stats.profitFactor >= 1.5 ? 'bullish' : stats.profitFactor >= 1 ? 'gold' : 'bearish'} />
            <StatCard label="Pips" value={`${stats.totalPips >= 0 ? '+' : ''}${formatNumber(stats.totalPips)}`} icon={<BarChart3 className="w-4 h-4" />} tone={stats.totalPips >= 0 ? 'bullish' : 'bearish'} />
            <StatCard label="Totaal R" value={`${stats.totalR >= 0 ? '+' : ''}${formatNumber(stats.totalR, 2)}`} icon={<Target className="w-4 h-4" />} tone={stats.totalR >= 0 ? 'bullish' : 'bearish'} />
            <StatCard label="Max DD" value={`${formatNumber(stats.maxDrawdownPips)} pips`} icon={<ShieldAlert className="w-4 h-4" />} tone="gold" />
            <StatCard label="Loss Streak" value={String(stats.maxLosingStreak)} icon={<ShieldAlert className="w-4 h-4" />} tone={stats.maxLosingStreak <= 2 ? 'bullish' : stats.maxLosingStreak <= 4 ? 'gold' : 'bearish'} />
            <StatCard label="W/L/E" value={`${stats.wins}/${stats.losses}/${stats.expired}`} icon={<Trophy className="w-4 h-4" />} />
          </div>

          {stats.totalTrades === 0 ? (
            <div className="glass-panel p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Geen trades gevonden voor deze combinatie. Probeer een ander timeframe of meer candles.
              </p>
            </div>
          ) : (
            <div className="glass-panel overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Laatste Trades</span>
                <span className="text-[10px] text-muted-foreground">{stats.pair} {stats.timeframe}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-white/[0.03] text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-2">Tijd</th>
                      <th className="text-left px-4 py-2">Type</th>
                      <th className="text-right px-4 py-2">Entry</th>
                      <th className="text-right px-4 py-2">Exit</th>
                      <th className="text-left px-4 py-2">Resultaat</th>
                      <th className="text-right px-4 py-2">Pips</th>
                      <th className="text-right px-4 py-2">R</th>
                      <th className="text-left px-4 py-2">Reden</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTrades.map(trade => (
                      <TradeRow key={trade.id} trade={trade} pair={pair} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: 'bullish' | 'bearish' | 'gold' | 'neutral';
}) {
  const toneClass = tone === 'bullish'
    ? 'text-bullish'
    : tone === 'bearish'
    ? 'text-bearish'
    : tone === 'gold'
    ? 'text-gold'
    : 'text-foreground';

  return (
    <div className="glass-panel p-3">
      <div className={`flex items-center gap-1.5 mb-1 ${toneClass}`}>
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className={`text-lg font-bold font-mono ${toneClass}`}>{value}</div>
    </div>
  );
}

function TradeRow({ trade, pair }: { trade: BacktestTrade; pair: PairInfo }) {
  const isWin = trade.outcome.startsWith('tp');
  const isLoss = trade.outcome === 'sl_hit';
  return (
    <tr className="border-t border-border/20 hover:bg-white/[0.02]">
      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{formatTime(trade.entryTime)}</td>
      <td className={`px-4 py-2 font-bold uppercase ${trade.type === 'buy' ? 'text-bullish' : 'text-bearish'}`}>
        {trade.type === 'buy' ? 'Buy' : 'Sell'}
      </td>
      <td className="px-4 py-2 text-right font-mono">{formatPrice(pair, trade.entry)}</td>
      <td className="px-4 py-2 text-right font-mono">{formatPrice(pair, trade.exit)}</td>
      <td className={`px-4 py-2 font-semibold ${isWin ? 'text-bullish' : isLoss ? 'text-bearish' : 'text-gold'}`}>
        {trade.outcome.replace('_', ' ').toUpperCase()}
      </td>
      <td className={`px-4 py-2 text-right font-mono font-bold ${trade.pnlPips >= 0 ? 'text-bullish' : 'text-bearish'}`}>
        {trade.pnlPips >= 0 ? '+' : ''}{formatNumber(trade.pnlPips)}
      </td>
      <td className={`px-4 py-2 text-right font-mono ${trade.pnlR >= 0 ? 'text-bullish' : 'text-bearish'}`}>
        {trade.pnlR >= 0 ? '+' : ''}{formatNumber(trade.pnlR, 2)}
      </td>
      <td className="px-4 py-2 text-muted-foreground min-w-[220px]">{trade.reason}</td>
    </tr>
  );
}
