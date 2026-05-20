// ============================================================
// FX Scanner Pro — Main Dashboard Page
// Design: Obsidian Flow — Premium Dark Glassmorphism
// ============================================================

import { useState } from 'react';
import { useScanner } from '@/hooks/useScanner';
import { useSignalHistory } from '@/hooks/useSignalHistory';
import { Header } from '@/components/Header';
import { ScannerGrid } from '@/components/ScannerGrid';
import { ChartPanel } from '@/components/ChartPanel';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { TickerTape } from '@/components/TickerTape';
import { ScanProgress } from '@/components/ScanProgress';
import { MarketStatus } from '@/components/MarketStatus';
import { TimeframeMatrix } from '@/components/TimeframeMatrix';
import { SignalHistory } from '@/components/SignalHistory';
import { BacktestPanel } from '@/components/BacktestPanel';
import type { PairInfo, Timeframe } from '@/lib/forex-types';
import { FOREX_PAIRS } from '@/lib/forex-types';

export default function Home() {
  const scanner = useScanner();
  const { signals, clearHistory } = useSignalHistory(scanner.analyses, scanner.selectedTimeframe);
  const [view, setView] = useState<'scanner' | 'chart' | 'matrix' | 'history' | 'backtest'>('scanner');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterDirection, setFilterDirection] = useState<string>('all');

  const handlePairSelect = (pair: PairInfo) => {
    scanner.setSelectedPair(pair);
    setView('chart');
  };

  const handlePairSelectBySymbol = (symbol: string) => {
    const pair = FOREX_PAIRS.find(p => p.symbol === symbol);
    if (pair) {
      scanner.setSelectedPair(pair);
      setView('chart');
    }
  };

  const handleBackToScanner = () => {
    setView('scanner');
  };

  const handleTimeframeChange = (tf: Timeframe) => {
    scanner.setSelectedTimeframe(tf);
  };

  // Filter analyses
  const filteredPairs = FOREX_PAIRS.filter(pair => {
    if (filterGroup !== 'all' && pair.group !== filterGroup) return false;
    if (filterDirection !== 'all') {
      const analysis = scanner.analyses.get(pair.symbol);
      if (analysis) {
        const trend = analysis.trend[scanner.selectedTimeframe];
        if (trend && filterDirection !== trend.direction) return false;
      }
    }
    return true;
  });

  const isMainView = view === 'scanner' || view === 'matrix' || view === 'history' || view === 'backtest';

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, oklch(0.696 0.17 162.48), transparent)' }} />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.02]"
          style={{ background: 'radial-gradient(circle, oklch(0.795 0.184 86.047), transparent)' }} />
      </div>

      <div className="relative z-10">
        <Header
          selectedTimeframe={scanner.selectedTimeframe}
          onTimeframeChange={handleTimeframeChange}
          lastScanTime={scanner.lastScanTime}
          isLoading={scanner.isLoading}
          onRescan={() => scanner.scanAllPairs(scanner.selectedTimeframe)}
          view={view}
          onBackToScanner={handleBackToScanner}
          analyses={scanner.analyses}
          onPairSelectBySymbol={handlePairSelectBySymbol}
        />

        <MarketStatus />
        <TickerTape analyses={scanner.analyses} />

        {scanner.isLoading && scanner.scanProgress < 100 && view === 'scanner' && (
          <ScanProgress
            progress={scanner.scanProgress}
            currentPair={scanner.loadingPair}
          />
        )}

        <main className="container py-4">
          {isMainView && (
            <div className="space-y-4">
              {/* View tabs */}
              <div className="flex items-center gap-2">
                {(['scanner', 'matrix', 'backtest', 'history'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setView(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                      view === tab
                        ? 'bg-bullish/10 text-bullish border border-bullish/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                    }`}
                  >
                    {tab === 'scanner' ? 'Scanner' : tab === 'matrix' ? 'Matrix' : tab === 'backtest' ? 'Backtest' : 'Geschiedenis'}
                  </button>
                ))}
                {signals.length > 0 && view !== 'history' && (
                  <span className="text-[10px] font-bold bg-gold/10 text-gold px-2 py-0.5 rounded-full ml-1">
                    {signals.length} signalen
                  </span>
                )}
              </div>

              {view === 'scanner' && (
                <ScannerGrid
                  pairs={filteredPairs}
                  analyses={scanner.analyses}
                  selectedTimeframe={scanner.selectedTimeframe}
                  onPairSelect={handlePairSelect}
                  loadingPair={scanner.loadingPair}
                  filterGroup={filterGroup}
                  setFilterGroup={setFilterGroup}
                  filterDirection={filterDirection}
                  setFilterDirection={setFilterDirection}
                />
              )}

              {view === 'matrix' && (
                <TimeframeMatrix onPairSelect={handlePairSelect} />
              )}

              {view === 'history' && (
                <SignalHistory
                  signals={signals}
                  onClearHistory={clearHistory}
                  onPairSelect={handlePairSelectBySymbol}
                />
              )}

              {view === 'backtest' && (
                <BacktestPanel />
              )}
            </div>
          )}

          {view === 'chart' && (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
              <ChartPanel
                pair={scanner.selectedPair}
                analysis={scanner.analyses.get(scanner.selectedPair.symbol) || null}
                timeframe={scanner.selectedTimeframe}
                onTimeframeChange={handleTimeframeChange}
                onRefresh={() => scanner.refreshPair(scanner.selectedPair, scanner.selectedTimeframe)}
                isLoading={scanner.loadingPair === scanner.selectedPair.symbol}
              />
              <AnalysisPanel
                pair={scanner.selectedPair}
                analysis={scanner.analyses.get(scanner.selectedPair.symbol) || null}
                timeframe={scanner.selectedTimeframe}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
