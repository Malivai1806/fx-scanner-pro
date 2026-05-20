// ============================================================
// FX Scanner Pro — Header Component
// Design: Obsidian Flow — Premium Dark Glassmorphism
// ============================================================

import { ArrowLeft, RefreshCw, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertSystem } from '@/components/AlertSystem';
import type { PairAnalysis, Timeframe } from '@/lib/forex-types';
import { TIMEFRAMES } from '@/lib/forex-types';

interface HeaderProps {
  selectedTimeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  lastScanTime: number;
  isLoading: boolean;
  onRescan: () => void;
  view: 'scanner' | 'chart' | 'matrix' | 'history' | 'backtest';
  onBackToScanner: () => void;
  analyses: Map<string, PairAnalysis>;
  onPairSelectBySymbol: (symbol: string) => void;
}

export function Header({
  selectedTimeframe,
  onTimeframeChange,
  lastScanTime,
  isLoading,
  onRescan,
  view,
  onBackToScanner,
  analyses,
  onPairSelectBySymbol,
}: HeaderProps) {
  const formatTime = (ts: number) => {
    if (!ts) return '--:--';
    return new Date(ts).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 backdrop-blur-xl"
      style={{ background: 'oklch(0.13 0.01 250 / 80%)' }}>
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Back */}
          <div className="flex items-center gap-3">
            {view === 'chart' && (
              <button
                onClick={onBackToScanner}
                className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-white/5 transition-colors duration-150"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <ScanLine className="w-7 h-7 text-bullish" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-bullish pulse-dot" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-foreground leading-none">
                  FX Scanner <span className="text-bullish">Pro</span>
                </h1>
                <p className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">
                  Real-Time Trend Scanner
                </p>
              </div>
            </div>
          </div>

          {/* Center: Timeframe selector */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-lg glass-panel">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.value}
                onClick={() => onTimeframeChange(tf.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                  selectedTimeframe === tf.value
                    ? 'bg-bullish/20 text-bullish shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                {tf.shortLabel}
              </button>
            ))}
          </div>

          {/* Right: Alerts + Status + Rescan */}
          <div className="flex items-center gap-2">
            <AlertSystem
              analyses={analyses}
              selectedTimeframe={selectedTimeframe}
              onPairSelect={onPairSelectBySymbol}
            />

            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Laatste scan
              </span>
              <span className="text-xs font-mono font-semibold text-foreground">
                {formatTime(lastScanTime)}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onRescan}
              disabled={isLoading}
              className="gap-1.5 text-xs border-border/50 hover:bg-white/5 hover:border-bullish/30"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Scan</span>
            </Button>
          </div>
        </div>

        {/* Mobile timeframe selector */}
        <div className="flex md:hidden items-center gap-1 pb-3 overflow-x-auto">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.value}
              onClick={() => onTimeframeChange(tf.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                selectedTimeframe === tf.value
                  ? 'bg-bullish/20 text-bullish'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tf.shortLabel}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
