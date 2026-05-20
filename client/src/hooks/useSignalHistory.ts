// ============================================================
// FX Scanner Pro — Signal History Hook
// Design: Obsidian Flow — Tracks and persists signals
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PairAnalysis, Timeframe } from '@/lib/forex-types';
import { FOREX_PAIRS } from '@/lib/forex-types';
import type { HistoricalSignal } from '@/lib/signal-history';
import {
  loadSignalHistory,
  saveSignalHistory,
  recordSignal,
  updateSignalOutcome,
} from '@/lib/signal-history';

const MIN_CONFIDENCE_TO_LOG = 65;
const SIGNAL_COOLDOWN = 10 * 60 * 1000; // 10 min between same pair signals

export function useSignalHistory(analyses: Map<string, PairAnalysis>, timeframe: Timeframe) {
  const [signals, setSignals] = useState<HistoricalSignal[]>(loadSignalHistory);
  const lastLoggedRef = useRef<Map<string, number>>(new Map());
  const prevSignalsRef = useRef<Map<string, string>>(new Map()); // pair -> signal type

  // Save to localStorage whenever signals change
  useEffect(() => {
    saveSignalHistory(signals);
  }, [signals]);

  // Check for new signals to log
  useEffect(() => {
    if (analyses.size === 0) return;

    const now = Date.now();
    const newSignals: HistoricalSignal[] = [];

    analyses.forEach((analysis, symbol) => {
      const { signal } = analysis;

      // Only log strong non-neutral signals
      if (signal.type === 'neutral' || signal.confidence < MIN_CONFIDENCE_TO_LOG) return;

      // Check cooldown
      const lastLogged = lastLoggedRef.current.get(symbol);
      if (lastLogged && now - lastLogged < SIGNAL_COOLDOWN) return;

      // Check if signal type changed (new signal)
      const prevType = prevSignalsRef.current.get(symbol);
      if (prevType === signal.type) return; // Same signal, don't re-log

      // Find pair info
      const pair = FOREX_PAIRS.find(p => p.symbol === symbol);
      if (!pair) return;

      // Record the signal
      const historicalSignal = recordSignal(pair, signal, timeframe, analysis.price);
      newSignals.push(historicalSignal);
      lastLoggedRef.current.set(symbol, now);
      prevSignalsRef.current.set(symbol, signal.type);
    });

    if (newSignals.length > 0) {
      setSignals(prev => [...newSignals, ...prev]);
    }
  }, [analyses, timeframe]);

  // Update outcomes of pending signals
  useEffect(() => {
    if (analyses.size === 0) return;

    setSignals(prev => {
      let changed = false;
      const updated = prev.map(signal => {
        if (signal.outcome !== 'pending') return signal;

        const analysis = analyses.get(signal.pair);
        if (!analysis) return signal;

        const pair = FOREX_PAIRS.find(p => p.symbol === signal.pair);
        if (!pair) return signal;

        const updatedSignal = updateSignalOutcome(signal, analysis.price, pair.pipSize);
        if (updatedSignal !== signal) changed = true;
        return updatedSignal;
      });

      return changed ? updated : prev;
    });
  }, [analyses]);

  const clearHistory = useCallback(() => {
    setSignals([]);
    lastLoggedRef.current.clear();
    prevSignalsRef.current.clear();
  }, []);

  return {
    signals,
    clearHistory,
  };
}
