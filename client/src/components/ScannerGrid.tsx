// ============================================================
// FX Scanner Pro — Scanner Grid Component
// Design: Obsidian Flow — Pair cards with trend overview
// ============================================================

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import type { PairAnalysis, PairInfo, Timeframe } from '@/lib/forex-types';
import { FLAG_EMOJIS, PAIR_GROUPS } from '@/lib/forex-types';

interface ScannerGridProps {
  pairs: PairInfo[];
  analyses: Map<string, PairAnalysis>;
  selectedTimeframe: Timeframe;
  onPairSelect: (pair: PairInfo) => void;
  loadingPair: string | null;
  filterGroup: string;
  setFilterGroup: (g: string) => void;
  filterDirection: string;
  setFilterDirection: (d: string) => void;
}

export function ScannerGrid({
  pairs,
  analyses,
  selectedTimeframe,
  onPairSelect,
  loadingPair,
  filterGroup,
  setFilterGroup,
  filterDirection,
  setFilterDirection,
}: ScannerGridProps) {
  const directions = [
    { value: 'all', label: 'Alle', icon: Activity },
    { value: 'bullish', label: 'Bullish', icon: TrendingUp },
    { value: 'bearish', label: 'Bearish', icon: TrendingDown },
    { value: 'neutral', label: 'Neutraal', icon: Minus },
  ];

  // Sort pairs: strongest trends first
  const sortedPairs = [...pairs].sort((a, b) => {
    const aAnalysis = analyses.get(a.symbol);
    const bAnalysis = analyses.get(b.symbol);
    if (!aAnalysis && !bAnalysis) return 0;
    if (!aAnalysis) return 1;
    if (!bAnalysis) return -1;
    const aTrend = aAnalysis.trend[selectedTimeframe];
    const bTrend = bAnalysis.trend[selectedTimeframe];
    if (!aTrend && !bTrend) return 0;
    if (!aTrend) return 1;
    if (!bTrend) return -1;
    return bTrend.strength - aTrend.strength;
  });

  const bullishCount = Array.from(analyses.values()).filter(a => {
    const t = a.trend[selectedTimeframe];
    return t?.direction === 'bullish';
  }).length;
  const bearishCount = Array.from(analyses.values()).filter(a => {
    const t = a.trend[selectedTimeframe];
    return t?.direction === 'bearish';
  }).length;
  const neutralCount = analyses.size - bullishCount - bearishCount;

  return (
    <div className="space-y-4">
      {/* Market Overview Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-panel p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-bullish/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-bullish" />
          </div>
          <div>
            <p className="text-2xl font-bold text-bullish font-mono">{bullishCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Bullish</p>
          </div>
        </div>
        <div className="glass-panel p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-bearish/10 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-bearish" />
          </div>
          <div>
            <p className="text-2xl font-bold text-bearish font-mono">{bearishCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Bearish</p>
          </div>
        </div>
        <div className="glass-panel p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
            <Minus className="w-5 h-5 text-gold" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gold font-mono">{neutralCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Neutraal</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg glass-panel">
          {PAIR_GROUPS.map(g => (
            <button
              key={g.value}
              onClick={() => setFilterGroup(g.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                filterGroup === g.value
                  ? 'bg-white/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg glass-panel">
          {directions.map(d => (
            <button
              key={d.value}
              onClick={() => setFilterDirection(d.value)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                filterDirection === d.value
                  ? 'bg-white/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              <d.icon className="w-3 h-3" />
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pair Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {sortedPairs.map((pair, index) => {
          const analysis = analyses.get(pair.symbol);
          const trend = analysis?.trend[selectedTimeframe];
          const isCurrentlyLoading = loadingPair === pair.symbol;

          return (
            <motion.div
              key={pair.symbol}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              <button
                onClick={() => onPairSelect(pair)}
                className={`w-full text-left glass-panel p-4 transition-all duration-200 hover:bg-white/[0.07] hover:border-white/[0.12] hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden ${
                  isCurrentlyLoading ? 'scan-sweep' : ''
                }`}
              >
                {/* Trend glow indicator */}
                {trend && (
                  <div
                    className="absolute top-0 right-0 w-20 h-20 opacity-10 blur-2xl"
                    style={{
                      background: trend.direction === 'bullish'
                        ? 'oklch(0.696 0.17 162.48)'
                        : trend.direction === 'bearish'
                        ? 'oklch(0.645 0.246 16.439)'
                        : 'oklch(0.795 0.184 86.047)',
                    }}
                  />
                )}

                <div className="relative">
                  {/* Top row: Pair name + flags */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{FLAG_EMOJIS[pair.base]}{FLAG_EMOJIS[pair.quote]}</span>
                      <span className="text-sm font-bold text-foreground">{pair.symbol}</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      pair.group === 'major' ? 'bg-bullish/10 text-bullish' :
                      pair.group === 'commodity' ? 'bg-gold/10 text-gold' :
                      'bg-white/5 text-muted-foreground'
                    }`}>
                      {pair.group}
                    </span>
                  </div>

                  {/* Price */}
                  {analysis ? (
                    <>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-xl font-bold font-mono text-foreground">
                          {analysis.price.toFixed(pair.pipSize < 0.01 ? 5 : pair.pipSize < 0.1 ? 3 : 2)}
                        </span>
                        <span className={`flex items-center gap-0.5 text-xs font-bold ${
                          analysis.changePercent >= 0 ? 'text-bullish' : 'text-bearish'
                        }`}>
                          {analysis.changePercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {analysis.changePercent >= 0 ? '+' : ''}{analysis.changePercent.toFixed(2)}%
                        </span>
                      </div>

                      {/* Trend info */}
                      {trend && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {trend.direction === 'bullish' ? (
                              <TrendingUp className="w-4 h-4 text-bullish" />
                            ) : trend.direction === 'bearish' ? (
                              <TrendingDown className="w-4 h-4 text-bearish" />
                            ) : (
                              <Minus className="w-4 h-4 text-gold" />
                            )}
                            <span className={`text-xs font-bold capitalize ${
                              trend.direction === 'bullish' ? 'text-bullish' :
                              trend.direction === 'bearish' ? 'text-bearish' : 'text-gold'
                            }`}>
                              {trend.direction}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Strength bar */}
                            <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${trend.strength}%`,
                                  background: trend.direction === 'bullish'
                                    ? 'oklch(0.696 0.17 162.48)'
                                    : trend.direction === 'bearish'
                                    ? 'oklch(0.645 0.246 16.439)'
                                    : 'oklch(0.795 0.184 86.047)',
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {trend.strength}%
                            </span>
                          </div>
                        </div>
                      )}

                      {/* RSI + Signal */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          RSI {analysis.indicators.rsi.toFixed(1)}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          analysis.signal.type === 'buy' ? 'text-bullish' :
                          analysis.signal.type === 'sell' ? 'text-bearish' : 'text-muted-foreground'
                        }`}>
                          {analysis.signal.type === 'buy' ? 'KOOP' :
                           analysis.signal.type === 'sell' ? 'VERKOOP' : 'NEUTRAAL'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div className="h-6 w-24 rounded bg-white/5 animate-pulse" />
                      <div className="h-4 w-16 rounded bg-white/5 animate-pulse" />
                      <div className="h-3 w-full rounded bg-white/5 animate-pulse" />
                    </div>
                  )}
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
