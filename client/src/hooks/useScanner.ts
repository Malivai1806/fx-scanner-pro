import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchCandles } from '@/lib/api-service';
import { calculateIndicators, detectPatterns, detectTrend, findSupportResistance, generateSignal } from '@/lib/analysis';
import type { PairAnalysis, PairInfo, Timeframe, TrendData } from '@/lib/forex-types';
import { FOREX_PAIRS } from '@/lib/forex-types';
import { sendSignalNotification, requestNotificationPermission } from '@/lib/notifications';

// HTF map — welke timeframe geeft context
const HTF_MAP: Partial<Record<Timeframe, Timeframe>> = {
  '1min': '15min', '2min': '15min', '5min': '1h',
  '15min': '1h', '30min': '4h', '1h': '4h',
  '4h': '1day', '1day': '1week',
};

// HTF cache — 15 minuten apart cachen zodat het niet bij elke scan opnieuw wordt opgehaald
const htfCache = new Map<string, { trend: TrendData; ts: number }>();
const HTF_CACHE_MS = 15 * 60 * 1000;

export function useScanner() {
  const [analyses, setAnalyses] = useState<Map<string, PairAnalysis>>(new Map());
  const [selectedPair, setSelectedPair] = useState<PairInfo>(FOREX_PAIRS[0]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1h');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingPair, setLoadingPair] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getHTFTrend = useCallback(async (pair: PairInfo, timeframe: Timeframe): Promise<TrendData | undefined> => {
    const htfTimeframe = HTF_MAP[timeframe];
    if (!htfTimeframe) return undefined;

    const cacheKey = `${pair.symbol}_${htfTimeframe}`;
    const cached = htfCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < HTF_CACHE_MS) return cached.trend;

    try {
      const htfCandles = await fetchCandles(pair.apiSymbol, htfTimeframe, 60);
      if (!htfCandles || htfCandles.length < 20) return undefined;
      const trend = detectTrend(htfCandles);
      htfCache.set(cacheKey, { trend, ts: Date.now() });
      return trend;
    } catch {
      return undefined;
    }
  }, []);

  const analyzePair = useCallback(async (pair: PairInfo, timeframe: Timeframe): Promise<PairAnalysis | null> => {
    try {
      const candles = await fetchCandles(pair.apiSymbol, timeframe, 100);
      if (!candles || candles.length < 20) return null;

      const lastCandle = candles[candles.length - 1];
      const firstCandle = candles[0];
      const currentPrice = lastCandle.close;
      const change24h = lastCandle.close - firstCandle.open;
      const changePercent = firstCandle.open ? (change24h / firstCandle.open) * 100 : 0;

      const trend = detectTrend(candles);
      const patterns = detectPatterns(candles);
      const indicators = calculateIndicators(candles);
      const sr = findSupportResistance(candles);

      // HTF bias — gecachet, geen extra API calls als al recent opgehaald
      const htfTrend = await getHTFTrend(pair, timeframe);

      const signal = generateSignal(candles, indicators, sr, trend, pair.pipSize, htfTrend);

      // Push notificatie bij sterk signaal
      if (signal && signal.type !== 'NEUTRAL') {
        sendSignalNotification(pair.symbol, signal.type as 'BUY' | 'SELL', signal.strength, currentPrice);
      }

      return {
        pair, price: currentPrice, change24h, changePercent,
        trend: { [timeframe]: trend }, patterns, indicators,
        supportResistance: sr, signal, candles, lastUpdate: Date.now(),
      };
    } catch (err) {
      console.error(`Error analyzing ${pair.symbol}:`, err);
      return null;
    }
  }, [getHTFTrend]);

  const scanAllPairs = useCallback(async (timeframe: Timeframe) => {
    setIsLoading(true);
    setError(null);
    setScanProgress(0);

    for (let i = 0; i < FOREX_PAIRS.length; i++) {
      const pair = FOREX_PAIRS[i];
      setLoadingPair(pair.symbol);
      setScanProgress(Math.round(((i + 1) / FOREX_PAIRS.length) * 100));

      const analysis = await analyzePair(pair, timeframe);
      if (analysis) {
        setAnalyses(prev => {
          const next = new Map(prev);
          next.set(pair.symbol, analysis);
          return next;
        });
      }

      if (i < FOREX_PAIRS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 8000));
      }
    }

    setIsLoading(false);
    setLoadingPair(null);
    setLastScanTime(Date.now());
    setScanProgress(100);
  }, [analyzePair]);

  const refreshPair = useCallback(async (pair: PairInfo, timeframe: Timeframe) => {
    setLoadingPair(pair.symbol);
    const analysis = await analyzePair(pair, timeframe);
    if (analysis) {
      setAnalyses(prev => {
        const next = new Map(prev);
        next.set(pair.symbol, analysis);
        return next;
      });
    }
    setLoadingPair(null);
  }, [analyzePair]);

  useEffect(() => {
    requestNotificationPermission();
    scanAllPairs(selectedTimeframe);
    scanIntervalRef.current = setInterval(() => {
      scanAllPairs(selectedTimeframe);
    }, 5 * 60 * 1000);
    return () => { if (scanIntervalRef.current) clearInterval(scanIntervalRef.current); };
  }, [selectedTimeframe, scanAllPairs]);

  return {
    analyses, selectedPair, setSelectedPair,
    selectedTimeframe, setSelectedTimeframe,
    isLoading, loadingPair, scanProgress,
    lastScanTime, error, refreshPair, scanAllPairs,
  };
}
