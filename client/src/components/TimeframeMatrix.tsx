// ============================================================
// FX Scanner Pro — Multi-Timeframe Matrix
// Design: Obsidian Flow — FxTrendy-style overview table
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchCandles } from '@/lib/api-service';
import { detectTrend } from '@/lib/analysis';
import type { PairInfo, Timeframe, TrendData } from '@/lib/forex-types';
import { FOREX_PAIRS, TIMEFRAMES, FLAG_EMOJIS } from '@/lib/forex-types';

interface MatrixData {
  [symbol: string]: {
    [timeframe: string]: TrendData | null;
  };
}

interface TimeframeMatrixProps {
  onPairSelect: (pair: PairInfo) => void;
}

export function TimeframeMatrix({ onPairSelect }: TimeframeMatrixProps) {
  const [matrixData, setMatrixData] = useState<MatrixData>({});
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'strength'>('strength');
  const scanAbortRef = useRef(false);

  const scanMatrix = useCallback(async () => {
    setIsScanning(true);
    setScanProgress(0);
    scanAbortRef.current = false;

    const totalCalls = FOREX_PAIRS.length * TIMEFRAMES.length;
    let completed = 0;

    for (const pair of FOREX_PAIRS) {
      if (scanAbortRef.current) break;

      for (const tf of TIMEFRAMES) {
        if (scanAbortRef.current) break;

        setScanStatus(`${pair.symbol} ${tf.shortLabel}`);

        try {
          const candles = await fetchCandles(pair.apiSymbol, tf.value, 60);
          if (candles && candles.length >= 20) {
            const trend = detectTrend(candles);
            setMatrixData(prev => ({
              ...prev,
              [pair.symbol]: {
                ...(prev[pair.symbol] || {}),
                [tf.value]: trend,
              },
            }));
          }
        } catch (err) {
          console.error(`Matrix scan error for ${pair.symbol} ${tf.value}:`, err);
        }

        completed++;
        setScanProgress(Math.round((completed / totalCalls) * 100));

        // Delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 10500));
      }
    }

    setIsScanning(false);
    setScanStatus('');
  }, []);

  // Auto-scan on mount
  useEffect(() => {
    scanMatrix();
    return () => { scanAbortRef.current = true; };
  }, []);

  // Calculate overall strength for sorting
  const getOverallStrength = (symbol: string): number => {
    const data = matrixData[symbol];
    if (!data) return 0;
    const values = Object.values(data).filter(Boolean) as TrendData[];
    if (values.length === 0) return 0;
    const bullishCount = values.filter(v => v.direction === 'bullish').length;
    const bearishCount = values.filter(v => v.direction === 'bearish').length;
    const dominantCount = Math.max(bullishCount, bearishCount);
    return (dominantCount / values.length) * 100;
  };

  const sortedPairs = [...FOREX_PAIRS].sort((a, b) => {
    if (sortBy === 'strength') {
      return getOverallStrength(b.symbol) - getOverallStrength(a.symbol);
    }
    return a.symbol.localeCompare(b.symbol);
  });

  const TrendCell = ({ trend }: { trend: TrendData | null | undefined }) => {
    if (!trend) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-3 h-3 rounded-sm bg-white/5" />
        </div>
      );
    }

    const bgColor = trend.direction === 'bullish'
      ? 'bg-bullish/20 border-bullish/30'
      : trend.direction === 'bearish'
      ? 'bg-bearish/20 border-bearish/30'
      : 'bg-white/5 border-white/10';

    const icon = trend.direction === 'bullish'
      ? <TrendingUp className="w-3 h-3 text-bullish" />
      : trend.direction === 'bearish'
      ? <TrendingDown className="w-3 h-3 text-bearish" />
      : <Minus className="w-3 h-3 text-muted-foreground" />;

    return (
      <div className={`w-full h-full flex items-center justify-center gap-1 rounded border ${bgColor} px-1 py-0.5`}>
        {icon}
        <span className={`text-[9px] font-bold ${
          trend.direction === 'bullish' ? 'text-bullish' :
          trend.direction === 'bearish' ? 'text-bearish' : 'text-muted-foreground'
        }`}>
          {trend.strength}%
        </span>
      </div>
    );
  };

  // Get dominant direction for a pair
  const getDominantDirection = (symbol: string): 'bullish' | 'bearish' | 'neutral' => {
    const data = matrixData[symbol];
    if (!data) return 'neutral';
    const values = Object.values(data).filter(Boolean) as TrendData[];
    const bullish = values.filter(v => v.direction === 'bullish').length;
    const bearish = values.filter(v => v.direction === 'bearish').length;
    if (bullish > bearish && bullish >= 3) return 'bullish';
    if (bearish > bullish && bearish >= 3) return 'bearish';
    return 'neutral';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Multi-Timeframe Matrix</h2>
          <p className="text-xs text-muted-foreground">Trend richting per paar op alle tijdframes</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg glass-panel">
            <button
              onClick={() => setSortBy('strength')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                sortBy === 'strength' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sterkte
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                sortBy === 'name' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Naam
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={scanMatrix}
            disabled={isScanning}
            className="gap-1.5 text-xs border-border/50 hover:bg-white/5"
          >
            {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Scan
          </Button>
        </div>
      </div>

      {/* Scan progress */}
      {isScanning && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${scanProgress}%`,
                background: 'linear-gradient(90deg, oklch(0.696 0.17 162.48), oklch(0.795 0.184 86.047))',
              }}
            />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
            {scanStatus} ({scanProgress}%)
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-bullish/20 border border-bullish/30" />
          <span className="text-[10px] text-muted-foreground">Bullish</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-bearish/20 border border-bearish/30" />
          <span className="text-[10px] text-muted-foreground">Bearish</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-white/5 border border-white/10" />
          <span className="text-[10px] text-muted-foreground">Neutraal</span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider p-3 sticky left-0 bg-card/80 backdrop-blur-sm z-10 min-w-[120px]">
                  Paar
                </th>
                {TIMEFRAMES.map(tf => (
                  <th key={tf.value} className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider p-3 min-w-[70px]">
                    {tf.shortLabel}
                  </th>
                ))}
                <th className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider p-3 min-w-[80px]">
                  Totaal
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPairs.map((pair, index) => {
                const dominant = getDominantDirection(pair.symbol);
                const data = matrixData[pair.symbol];
                const filledCount = data ? Object.values(data).filter(Boolean).length : 0;

                return (
                  <motion.tr
                    key={pair.symbol}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => onPairSelect(pair)}
                    className="border-b border-border/10 hover:bg-white/[0.03] cursor-pointer transition-colors group"
                  >
                    <td className="p-2.5 sticky left-0 bg-card/80 backdrop-blur-sm z-10">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{FLAG_EMOJIS[pair.base]}</span>
                        <span className="text-xs font-bold text-foreground group-hover:text-bullish transition-colors">
                          {pair.symbol}
                        </span>
                      </div>
                    </td>
                    {TIMEFRAMES.map(tf => (
                      <td key={tf.value} className="p-1.5">
                        <TrendCell trend={data?.[tf.value]} />
                      </td>
                    ))}
                    <td className="p-2.5 text-center">
                      {filledCount > 0 ? (
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          dominant === 'bullish' ? 'bg-bullish/10 text-bullish' :
                          dominant === 'bearish' ? 'bg-bearish/10 text-bearish' :
                          'bg-white/5 text-muted-foreground'
                        }`}>
                          {dominant === 'bullish' ? <TrendingUp className="w-3 h-3" /> :
                           dominant === 'bearish' ? <TrendingDown className="w-3 h-3" /> :
                           <Minus className="w-3 h-3" />}
                          {dominant === 'bullish' ? 'BULL' :
                           dominant === 'bearish' ? 'BEAR' : 'MIX'}
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/50">—</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
