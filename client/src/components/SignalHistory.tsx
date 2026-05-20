// ============================================================
// FX Scanner Pro — Signal History & Backtesting Page
// Design: Obsidian Flow — Premium Dark Glassmorphism
// ============================================================

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Target, ShieldAlert, Clock,
  Trophy, AlertTriangle, BarChart3, Filter, Trash2,
  CheckCircle2, XCircle, Timer, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HistoricalSignal, BacktestStats } from '@/lib/signal-history';
import { calculateBacktestStats } from '@/lib/signal-history';
import { FLAG_EMOJIS, TIMEFRAMES, PAIR_GROUPS } from '@/lib/forex-types';

interface SignalHistoryProps {
  signals: HistoricalSignal[];
  onClearHistory: () => void;
  onPairSelect: (symbol: string) => void;
}

export function SignalHistory({ signals, onClearHistory, onPairSelect }: SignalHistoryProps) {
  const [filterPair, setFilterPair] = useState<string>('all');
  const [filterOutcome, setFilterOutcome] = useState<string>('all');
  const [filterTimeframe, setFilterTimeframe] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showStats, setShowStats] = useState(true);

  // Filter signals
  const filteredSignals = useMemo(() => {
    return signals.filter(s => {
      if (filterPair !== 'all' && s.pair !== filterPair) return false;
      if (filterOutcome !== 'all') {
        if (filterOutcome === 'win' && !s.outcome.startsWith('tp')) return false;
        if (filterOutcome === 'loss' && s.outcome !== 'sl_hit') return false;
        if (filterOutcome === 'pending' && s.outcome !== 'pending') return false;
        if (filterOutcome === 'expired' && s.outcome !== 'expired') return false;
      }
      if (filterTimeframe !== 'all' && s.timeframe !== filterTimeframe) return false;
      if (filterType !== 'all' && s.type !== filterType) return false;
      return true;
    });
  }, [signals, filterPair, filterOutcome, filterTimeframe, filterType]);

  // Calculate stats
  const stats = useMemo(() => calculateBacktestStats(filteredSignals), [filteredSignals]);

  // Get unique pairs from signals
  const uniquePairs = useMemo(() => {
    const pairs = new Set(signals.map(s => s.pair));
    return Array.from(pairs).sort();
  }, [signals]);

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' }) + ' ' +
           date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimeDiff = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Nu';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}u`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'tp1_hit': case 'tp2_hit': case 'tp3_hit':
        return <CheckCircle2 className="w-4 h-4 text-bullish" />;
      case 'sl_hit':
        return <XCircle className="w-4 h-4 text-bearish" />;
      case 'expired':
        return <Timer className="w-4 h-4 text-gold" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground animate-pulse" />;
    }
  };

  const getOutcomeLabel = (outcome: string) => {
    switch (outcome) {
      case 'tp1_hit': return 'TP1 Geraakt';
      case 'tp2_hit': return 'TP2 Geraakt';
      case 'tp3_hit': return 'TP3 Geraakt';
      case 'sl_hit': return 'SL Geraakt';
      case 'expired': return 'Verlopen';
      default: return 'Actief';
    }
  };

  const getOutcomeColor = (outcome: string) => {
    if (outcome.startsWith('tp')) return 'text-bullish';
    if (outcome === 'sl_hit') return 'text-bearish';
    if (outcome === 'expired') return 'text-gold';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Signaal Geschiedenis</h2>
          <p className="text-xs text-muted-foreground">
            {signals.length} signalen gelogd — backtesting resultaten
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className="gap-1.5 text-xs border-border/50 hover:bg-white/5"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            {showStats ? 'Verberg Stats' : 'Toon Stats'}
          </Button>
          {signals.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearHistory}
              className="gap-1.5 text-xs border-border/50 hover:bg-white/5 hover:border-bearish/30 hover:text-bearish"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Wissen
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {showStats && signals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3"
        >
          {/* Main stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatCard
              label="Win Rate"
              value={`${stats.winRate.toFixed(1)}%`}
              icon={<Trophy className="w-4 h-4" />}
              color={stats.winRate >= 60 ? 'bullish' : stats.winRate >= 40 ? 'gold' : 'bearish'}
            />
            <StatCard
              label="Totaal Pips"
              value={`${stats.totalPips >= 0 ? '+' : ''}${stats.totalPips.toFixed(1)}`}
              icon={<BarChart3 className="w-4 h-4" />}
              color={stats.totalPips >= 0 ? 'bullish' : 'bearish'}
            />
            <StatCard
              label="Profit Factor"
              value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
              icon={<Target className="w-4 h-4" />}
              color={stats.profitFactor >= 1.5 ? 'bullish' : stats.profitFactor >= 1 ? 'gold' : 'bearish'}
            />
            <StatCard
              label="Wins / Losses"
              value={`${stats.winCount} / ${stats.lossCount}`}
              icon={<CheckCircle2 className="w-4 h-4" />}
              color="neutral"
            />
            <StatCard
              label="Gem. Win"
              value={`+${stats.avgWinPips.toFixed(1)} pips`}
              icon={<ArrowUpRight className="w-4 h-4" />}
              color="bullish"
            />
            <StatCard
              label="Gem. Loss"
              value={`-${stats.avgLossPips.toFixed(1)} pips`}
              icon={<ArrowDownRight className="w-4 h-4" />}
              color="bearish"
            />
          </div>

          {/* Breakdown tables */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* By Pair */}
            {Object.keys(stats.byPair).length > 0 && (
              <div className="glass-panel p-3">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Per Paar</h4>
                <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                  {Object.entries(stats.byPair)
                    .sort((a, b) => b[1].totalPips - a[1].totalPips)
                    .map(([pair, data]) => (
                      <div key={pair} className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-foreground">{pair}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{data.wins}W/{data.losses}L</span>
                          <span className={`font-mono font-bold ${data.totalPips >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                            {data.totalPips >= 0 ? '+' : ''}{data.totalPips.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* By Timeframe */}
            {Object.keys(stats.byTimeframe).length > 0 && (
              <div className="glass-panel p-3">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Per Tijdframe</h4>
                <div className="space-y-1.5">
                  {Object.entries(stats.byTimeframe).map(([tf, data]) => {
                    const label = TIMEFRAMES.find(t => t.value === tf)?.shortLabel || tf;
                    return (
                      <div key={tf} className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-foreground">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{data.wins}W/{data.losses}L</span>
                          <span className={`font-mono font-bold ${data.totalPips >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                            {data.totalPips >= 0 ? '+' : ''}{data.totalPips.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* By Type */}
            {Object.keys(stats.byType).length > 0 && (
              <div className="glass-panel p-3">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Per Type</h4>
                <div className="space-y-1.5">
                  {Object.entries(stats.byType).map(([type, data]) => (
                    <div key={type} className="flex items-center justify-between text-[11px]">
                      <span className={`font-semibold capitalize ${type === 'buy' ? 'text-bullish' : 'text-bearish'}`}>
                        {type === 'buy' ? 'Koop' : 'Verkoop'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{data.wins}W/{data.losses}L</span>
                        <span className={`font-mono font-bold ${data.totalPips >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                          {data.totalPips >= 0 ? '+' : ''}{data.totalPips.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />

        <select
          value={filterOutcome}
          onChange={e => setFilterOutcome(e.target.value)}
          className="text-xs font-semibold bg-white/[0.03] border border-border/50 rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:border-bullish/30"
        >
          <option value="all">Alle Resultaten</option>
          <option value="win">Winst</option>
          <option value="loss">Verlies</option>
          <option value="pending">Actief</option>
          <option value="expired">Verlopen</option>
        </select>

        <select
          value={filterPair}
          onChange={e => setFilterPair(e.target.value)}
          className="text-xs font-semibold bg-white/[0.03] border border-border/50 rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:border-bullish/30"
        >
          <option value="all">Alle Paren</option>
          {uniquePairs.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select
          value={filterTimeframe}
          onChange={e => setFilterTimeframe(e.target.value)}
          className="text-xs font-semibold bg-white/[0.03] border border-border/50 rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:border-bullish/30"
        >
          <option value="all">Alle Tijdframes</option>
          {TIMEFRAMES.map(tf => (
            <option key={tf.value} value={tf.value}>{tf.shortLabel}</option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="text-xs font-semibold bg-white/[0.03] border border-border/50 rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:border-bullish/30"
        >
          <option value="all">Koop & Verkoop</option>
          <option value="buy">Alleen Koop</option>
          <option value="sell">Alleen Verkoop</option>
        </select>
      </div>

      {/* Signal List */}
      {filteredSignals.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-foreground mb-1">Geen signalen gevonden</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {signals.length === 0
              ? 'Signalen worden automatisch gelogd wanneer de scanner sterke koop/verkoop signalen detecteert. Laat de scanner draaien om data te verzamelen.'
              : 'Pas je filters aan om signalen te zien.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSignals.map((signal, index) => (
            <motion.div
              key={signal.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02, duration: 0.2 }}
              onClick={() => onPairSelect(signal.pair)}
              className="glass-panel p-3 hover:bg-white/[0.03] cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-3">
                {/* Outcome icon */}
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  signal.outcome.startsWith('tp') ? 'bg-bullish/10' :
                  signal.outcome === 'sl_hit' ? 'bg-bearish/10' :
                  signal.outcome === 'expired' ? 'bg-gold/10' :
                  'bg-white/5'
                }`}>
                  {getOutcomeIcon(signal.outcome)}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs">{FLAG_EMOJIS[signal.base]}</span>
                    <span className="text-xs font-bold text-foreground">{signal.pair}</span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      signal.type === 'buy' ? 'bg-bullish/15 text-bullish' : 'bg-bearish/15 text-bearish'
                    }`}>
                      {signal.type === 'buy' ? 'KOOP' : 'VERKOOP'}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-mono">
                      {TIMEFRAMES.find(t => t.value === signal.timeframe)?.shortLabel}
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      {signal.confidence}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="text-muted-foreground">
                      Entry: <span className="font-mono text-foreground">{signal.entry.toFixed(5)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      SL: <span className="font-mono text-bearish">{signal.stopLoss.toFixed(5)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      TP1: <span className="font-mono text-bullish">{signal.takeProfit1.toFixed(5)}</span>
                    </span>
                  </div>
                </div>

                {/* Outcome + PnL */}
                <div className="text-right shrink-0">
                  <div className={`text-[10px] font-bold ${getOutcomeColor(signal.outcome)}`}>
                    {getOutcomeLabel(signal.outcome)}
                  </div>
                  {signal.pnlPips !== null && (
                    <div className={`text-xs font-mono font-bold ${signal.pnlPips >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {signal.pnlPips >= 0 ? '+' : ''}{signal.pnlPips.toFixed(1)} pips
                    </div>
                  )}
                  <div className="text-[9px] text-muted-foreground mt-0.5">
                    {formatTimeDiff(signal.timestamp)} geleden
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="mt-1.5 pl-12">
                <p className="text-[10px] text-muted-foreground/70 truncate">
                  {signal.reason}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label, value, icon, color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'bullish' | 'bearish' | 'gold' | 'neutral';
}) {
  const colorClasses = {
    bullish: 'text-bullish bg-bullish/10',
    bearish: 'text-bearish bg-bearish/10',
    gold: 'text-gold bg-gold/10',
    neutral: 'text-foreground bg-white/5',
  };

  return (
    <div className="glass-panel p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-6 h-6 rounded flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <p className={`text-lg font-bold font-mono ${
        color === 'bullish' ? 'text-bullish' :
        color === 'bearish' ? 'text-bearish' :
        color === 'gold' ? 'text-gold' : 'text-foreground'
      }`}>
        {value}
      </p>
    </div>
  );
}
