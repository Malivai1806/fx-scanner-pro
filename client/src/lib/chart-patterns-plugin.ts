// ============================================================
// FX Scanner Pro — Chart Pattern Drawing Plugin
// Uses lightweight-charts ISeriesPrimitive for custom canvas
// Draws trendlines, triangles, wedges, channels on the chart
// ============================================================

import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import type { PatternData, CandleData } from './forex-types';

// Colors
const COLORS = {
  trendlineBullish: 'rgba(16, 185, 129, 0.8)',   // emerald
  trendlineBearish: 'rgba(244, 63, 94, 0.8)',     // rose
  triangleFill: 'rgba(251, 191, 36, 0.08)',        // gold fill
  triangleLine: 'rgba(251, 191, 36, 0.7)',         // gold line
  wedgeFill: 'rgba(139, 92, 246, 0.08)',            // purple fill
  wedgeLine: 'rgba(139, 92, 246, 0.7)',             // purple line
  channelFill: 'rgba(56, 189, 248, 0.06)',          // sky fill
  channelLine: 'rgba(56, 189, 248, 0.6)',           // sky line
  label: 'rgba(255, 255, 255, 0.9)',
  labelBg: 'rgba(0, 0, 0, 0.7)',
};

interface PatternLine {
  x1: number; // candle index → time
  y1: number; // price
  x2: number;
  y2: number;
  color: string;
  width: number;
  dash?: number[];
  label?: string;
  labelColor?: string;
  fill?: { x3: number; y3: number; x4: number; y4: number; color: string };
}

/**
 * Draws pattern lines on the chart using additional LineSeries.
 * This is the most reliable approach for lightweight-charts v5.
 */
export function drawPatternsOnChart(
  chart: IChartApi,
  patterns: PatternData[],
  candles: CandleData[],
  addLineSeries: (options: any) => ISeriesApi<'Line'>
): ISeriesApi<'Line'>[] {
  const series: ISeriesApi<'Line'>[] = [];
  if (!candles.length || !patterns.length) return series;

  for (const pattern of patterns) {
    if (pattern.points.length < 2) continue;

    const patternColor = getPatternColor(pattern);
    const patternDash = getPatternDash(pattern);

    if (pattern.type === 'trendline') {
      // Draw a single trendline between two points, extended forward
      const p1 = pattern.points[0];
      const p2 = pattern.points[1];

      if (p1.x >= 0 && p1.x < candles.length && p2.x >= 0 && p2.x < candles.length) {
        const lineData = buildExtendedLine(p1, p2, candles, 10);
        if (lineData.length >= 2) {
          try {
            const lineSeries = addLineSeries({
              color: patternColor,
              lineWidth: 2,
              lineStyle: patternDash,
              priceLineVisible: false,
              lastValueVisible: false,
              crosshairMarkerVisible: false,
              title: '',
            });
            lineSeries.setData(lineData);
            series.push(lineSeries);
          } catch {}
        }
      }
    } else if (pattern.type === 'triangle' || pattern.type === 'wedge') {
      // Draw upper and lower converging lines
      // points: [low1, high1, low2, high2]
      if (pattern.points.length >= 4) {
        const low1 = pattern.points[0];
        const high1 = pattern.points[1];
        const low2 = pattern.points[2];
        const high2 = pattern.points[3];

        // Upper line (highs)
        const upperLine = buildExtendedLine(
          { x: high1.x, y: high1.y },
          { x: high2.x, y: high2.y },
          candles, 8
        );
        if (upperLine.length >= 2) {
          try {
            const upper = addLineSeries({
              color: pattern.type === 'triangle' ? COLORS.triangleLine : COLORS.wedgeLine,
              lineWidth: 2,
              lineStyle: 0,
              priceLineVisible: false,
              lastValueVisible: false,
              crosshairMarkerVisible: false,
              title: '',
            });
            upper.setData(upperLine);
            series.push(upper);
          } catch {}
        }

        // Lower line (lows)
        const lowerLine = buildExtendedLine(
          { x: low1.x, y: low1.y },
          { x: low2.x, y: low2.y },
          candles, 8
        );
        if (lowerLine.length >= 2) {
          try {
            const lower = addLineSeries({
              color: pattern.type === 'triangle' ? COLORS.triangleLine : COLORS.wedgeLine,
              lineWidth: 2,
              lineStyle: 0,
              priceLineVisible: false,
              lastValueVisible: false,
              crosshairMarkerVisible: false,
              title: '',
            });
            lower.setData(lowerLine);
            series.push(lower);
          } catch {}
        }
      }
    } else if (pattern.type === 'channel') {
      // Draw two parallel lines
      if (pattern.points.length >= 4) {
        const low1 = pattern.points[0];
        const high1 = pattern.points[1];
        const low2 = pattern.points[2];
        const high2 = pattern.points[3];

        // Upper channel line
        const upperLine = buildExtendedLine(
          { x: high1.x, y: high1.y },
          { x: high2.x, y: high2.y },
          candles, 5
        );
        if (upperLine.length >= 2) {
          try {
            const upper = addLineSeries({
              color: COLORS.channelLine,
              lineWidth: 1,
              lineStyle: 2, // dashed
              priceLineVisible: false,
              lastValueVisible: false,
              crosshairMarkerVisible: false,
              title: '',
            });
            upper.setData(upperLine);
            series.push(upper);
          } catch {}
        }

        // Lower channel line
        const lowerLine = buildExtendedLine(
          { x: low1.x, y: low1.y },
          { x: low2.x, y: low2.y },
          candles, 5
        );
        if (lowerLine.length >= 2) {
          try {
            const lower = addLineSeries({
              color: COLORS.channelLine,
              lineWidth: 1,
              lineStyle: 2,
              priceLineVisible: false,
              lastValueVisible: false,
              crosshairMarkerVisible: false,
              title: '',
            });
            lower.setData(lowerLine);
            series.push(lower);
          } catch {}
        }
      }
    }
  }

  return series;
}

/**
 * Build a line from two points, extended forward by N candles
 */
function buildExtendedLine(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  candles: CandleData[],
  extendBars: number
): { time: Time; value: number }[] {
  const data: { time: Time; value: number }[] = [];

  // Calculate slope
  const dx = p2.x - p1.x;
  if (dx === 0) return data;
  const slope = (p2.y - p1.y) / dx;

  // Start from p1, go through p2, extend forward
  const startIdx = Math.max(0, p1.x);
  const endIdx = Math.min(candles.length - 1, p2.x + extendBars);

  for (let i = startIdx; i <= endIdx; i++) {
    if (i < 0 || i >= candles.length) continue;
    const value = p1.y + slope * (i - p1.x);
    data.push({
      time: candles[i].time as Time,
      value,
    });
  }

  return data;
}

function getPatternColor(pattern: PatternData): string {
  switch (pattern.type) {
    case 'trendline':
      return pattern.direction === 'bullish' ? COLORS.trendlineBullish : COLORS.trendlineBearish;
    case 'triangle':
      return COLORS.triangleLine;
    case 'wedge':
      return COLORS.wedgeLine;
    case 'channel':
      return COLORS.channelLine;
    default:
      return 'rgba(255, 255, 255, 0.5)';
  }
}

function getPatternDash(pattern: PatternData): number {
  // 0 = solid, 2 = dashed, 3 = dotted
  switch (pattern.type) {
    case 'trendline': return 0;
    case 'channel': return 2;
    default: return 0;
  }
}
