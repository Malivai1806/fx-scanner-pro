// ============================================================
// FX Scanner Pro — Chart Panel Component
// Design: Obsidian Flow — TradingView Lightweight Charts v5
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  ColorType,
  CrosshairMode,
  LineStyle,
} from 'lightweight-charts';
import { RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PairAnalysis, PairInfo, Timeframe } from '@/lib/forex-types';
import { TIMEFRAMES, FLAG_EMOJIS } from '@/lib/forex-types';
import { sma } from '@/lib/analysis';
import { drawPatternsOnChart } from '@/lib/chart-patterns-plugin';

interface ChartPanelProps {
  pair: PairInfo;
  analysis: PairAnalysis | null;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

function formatChartTime(time: unknown): string {
  if (typeof time === 'number') {
    return new Date(time * 1000).toLocaleString('nl-NL', {
      timeZone: 'Europe/Amsterdam',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (typeof time === 'string') return time;
  if (time && typeof time === 'object' && 'year' in time && 'month' in time && 'day' in time) {
    const d = time as { year: number; month: number; day: number };
    return `${String(d.day).padStart(2, '0')}-${String(d.month).padStart(2, '0')}-${d.year}`;
  }
  return '';
}

export function ChartPanel({
  pair,
  analysis,
  timeframe,
  onTimeframeChange,
  onRefresh,
  isLoading,
}: ChartPanelProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [crosshairData, setCrosshairData] = useState<{
    time: string; open: number; high: number; low: number; close: number;
  } | null>(null);

  const destroyChart = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
  }, []);

  // Build chart whenever analysis or fullscreen changes
  useEffect(() => {
    if (!chartContainerRef.current) return;
    destroyChart();

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      localization: {
        locale: 'nl-NL',
        timeFormatter: formatChartTime,
      },
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.5)',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(255, 255, 255, 0.15)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: 'rgba(16, 185, 129, 0.9)',
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.15)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: 'rgba(16, 185, 129, 0.9)',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: formatChartTime,
      },
      handleScroll: { vertTouchDrag: false },
      width: container.clientWidth,
      height: isFullscreen ? window.innerHeight - 200 : 450,
    });

    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderUpColor: '#10b981',
      borderDownColor: '#f43f5e',
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });

    // Crosshair handler
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setCrosshairData(null);
        return;
      }
      const data = param.seriesData.get(candleSeries) as any;
      if (data) {
        setCrosshairData({
          time: String(param.time),
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
        });
      }
    });

    // Set data if available
    if (analysis && analysis.candles.length > 0) {
      const candles = analysis.candles;

      candleSeries.setData(
        candles.map(c => ({
          time: c.time as any,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );

      // MA20
      const closes = candles.map(c => c.close);
      const ma20 = sma(closes, 20);
      const ma20Data = candles
        .map((c, i) => ({ time: c.time as any, value: ma20[i] }))
        .filter(d => !isNaN(d.value));

      if (ma20Data.length > 0) {
        const ma20Series = chart.addSeries(LineSeries, {
          color: 'rgba(251, 191, 36, 0.6)',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          title: 'MA20',
        });
        ma20Series.setData(ma20Data);
      }

      // MA50
      const ma50 = sma(closes, Math.min(50, closes.length));
      const ma50Data = candles
        .map((c, i) => ({ time: c.time as any, value: ma50[i] }))
        .filter(d => !isNaN(d.value));

      if (ma50Data.length > 0) {
        const ma50Series = chart.addSeries(LineSeries, {
          color: 'rgba(139, 92, 246, 0.6)',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          title: 'MA50',
        });
        ma50Series.setData(ma50Data);
      }

      // Support & Resistance price lines
      if (analysis.supportResistance) {
        analysis.supportResistance.supports.forEach(level => {
          candleSeries.createPriceLine({
            price: level,
            color: 'rgba(16, 185, 129, 0.4)',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: 'S',
          });
        });

        analysis.supportResistance.resistances.forEach(level => {
          candleSeries.createPriceLine({
            price: level,
            color: 'rgba(244, 63, 94, 0.4)',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: 'R',
          });
        });
      }

      // Signal lines
      if (analysis.signal && analysis.signal.type !== 'neutral') {
        candleSeries.createPriceLine({
          price: analysis.signal.entry,
          color: analysis.signal.type === 'buy' ? 'rgba(16, 185, 129, 0.8)' : 'rgba(244, 63, 94, 0.8)',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: analysis.signal.type === 'buy' ? 'BUY' : 'SELL',
        });

        candleSeries.createPriceLine({
          price: analysis.signal.stopLoss,
          color: 'rgba(244, 63, 94, 0.6)',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: 'SL',
        });

        candleSeries.createPriceLine({
          price: analysis.signal.takeProfit1,
          color: 'rgba(16, 185, 129, 0.6)',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: 'TP1',
        });

        candleSeries.createPriceLine({
          price: analysis.signal.takeProfit2,
          color: 'rgba(16, 185, 129, 0.4)',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: 'TP2',
        });
      }

      // === Draw detected patterns as lines on the chart ===
      if (analysis.patterns && analysis.patterns.length > 0) {
        drawPatternsOnChart(
          chart,
          analysis.patterns,
          candles,
          (options: any) => chart.addSeries(LineSeries, options)
        );
      }

      chart.timeScale().fitContent();
    }

    // Resize observer
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (chartRef.current) {
          chartRef.current.applyOptions({
            width: entry.contentRect.width,
          });
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      destroyChart();
    };
  }, [analysis, isFullscreen, destroyChart]);

  const decimals = pair.pipSize < 0.01 ? 5 : pair.pipSize < 0.1 ? 3 : 2;

  return (
    <div className={`glass-panel overflow-hidden ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
      {/* Chart header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          <span className="text-lg">{FLAG_EMOJIS[pair.base]}{FLAG_EMOJIS[pair.quote]}</span>
          <div>
            <h2 className="text-lg font-bold text-foreground">{pair.symbol}</h2>
            <div className="flex items-center gap-2">
              {analysis && (
                <>
                  <span className="text-sm font-mono font-bold text-foreground">
                    {analysis.price.toFixed(decimals)}
                  </span>
                  <span className={`text-xs font-bold ${
                    analysis.changePercent >= 0 ? 'text-bullish' : 'text-bearish'
                  }`}>
                    {analysis.changePercent >= 0 ? '+' : ''}{analysis.changePercent.toFixed(2)}%
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe pills */}
          <div className="hidden sm:flex items-center gap-1 p-1 rounded-lg bg-white/[0.03]">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.value}
                onClick={() => onTimeframeChange(tf.value)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-150 ${
                  timeframe === tf.value
                    ? 'bg-bullish/20 text-bullish'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                {tf.shortLabel}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-border/50 hover:bg-white/5"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-border/50 hover:bg-white/5"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* OHLC data overlay */}
      {crosshairData && (
        <div className="absolute top-[72px] left-4 z-10 flex items-center gap-3 text-[11px] font-mono bg-background/80 backdrop-blur-sm px-2 py-1 rounded">
          <span className="text-muted-foreground">O <span className="text-foreground">{crosshairData.open.toFixed(decimals)}</span></span>
          <span className="text-muted-foreground">H <span className="text-foreground">{crosshairData.high.toFixed(decimals)}</span></span>
          <span className="text-muted-foreground">L <span className="text-foreground">{crosshairData.low.toFixed(decimals)}</span></span>
          <span className="text-muted-foreground">C <span className={crosshairData.close >= crosshairData.open ? 'text-bullish' : 'text-bearish'}>{crosshairData.close.toFixed(decimals)}</span></span>
        </div>
      )}

      {/* Chart container */}
      <div className="relative">
        <div ref={chartContainerRef} className="w-full" style={{ height: isFullscreen ? 'calc(100vh - 280px)' : '450px' }} />

        {/* Pattern labels overlay */}
        {analysis?.patterns && analysis.patterns.length > 0 && (
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {analysis.patterns.slice(0, 3).map((pattern, i) => (
              <div
                key={i}
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm ${
                  pattern.direction === 'bullish' ? 'bg-bullish/20 text-bullish border border-bullish/30' :
                  pattern.direction === 'bearish' ? 'bg-bearish/20 text-bearish border border-bearish/30' :
                  'bg-gold/20 text-gold border border-gold/30'
                }`}
              >
                {pattern.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Indicators bar */}
      {analysis && (
        <div className="flex items-center gap-4 px-4 py-3 border-t border-border/30 overflow-x-auto">
          <IndicatorBadge
            label="RSI"
            value={analysis.indicators.rsi.toFixed(1)}
            color={analysis.indicators.rsi > 70 ? 'bearish' : analysis.indicators.rsi < 30 ? 'bullish' : 'neutral'}
          />
          <IndicatorBadge
            label="MACD"
            value={analysis.indicators.macd.histogram > 0 ? 'Bullish' : 'Bearish'}
            color={analysis.indicators.macd.histogram > 0 ? 'bullish' : 'bearish'}
          />
          <IndicatorBadge
            label="MA20"
            value={analysis.indicators.ma20.toFixed(decimals)}
            color={analysis.price > analysis.indicators.ma20 ? 'bullish' : 'bearish'}
          />
          <IndicatorBadge
            label="MA50"
            value={analysis.indicators.ma50.toFixed(decimals)}
            color={analysis.price > analysis.indicators.ma50 ? 'bullish' : 'bearish'}
          />
          <IndicatorBadge
            label="ATR"
            value={analysis.indicators.atr.toFixed(decimals)}
            color="neutral"
          />
        </div>
      )}
    </div>
  );
}

function IndicatorBadge({ label, value, color }: { label: string; value: string; color: 'bullish' | 'bearish' | 'neutral' }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</span>
      <span className={`text-xs font-mono font-bold ${
        color === 'bullish' ? 'text-bullish' :
        color === 'bearish' ? 'text-bearish' : 'text-foreground'
      }`}>
        {value}
      </span>
    </div>
  );
}
