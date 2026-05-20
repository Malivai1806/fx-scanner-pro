// ============================================================
// FX Scanner Pro — Ticker Tape Component
// Design: Obsidian Flow — Scrolling price ticker
// ============================================================

import { useEffect, useRef } from 'react';
import type { PairAnalysis } from '@/lib/forex-types';
import { FLAG_EMOJIS } from '@/lib/forex-types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TickerTapeProps {
  analyses: Map<string, PairAnalysis>;
}

export function TickerTape({ analyses }: TickerTapeProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let animationId: number;
    let scrollPos = 0;

    const animate = () => {
      scrollPos += 0.5;
      if (scrollPos >= el.scrollWidth / 2) {
        scrollPos = 0;
      }
      el.scrollLeft = scrollPos;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [analyses.size]);

  const items = Array.from(analyses.values());
  if (items.length === 0) return null;

  // Duplicate for infinite scroll effect
  const doubled = [...items, ...items];

  return (
    <div className="border-b border-border/30 bg-card/30 backdrop-blur-sm overflow-hidden">
      <div
        ref={scrollRef}
        className="flex items-center gap-6 py-2 px-4 overflow-hidden whitespace-nowrap"
        style={{ scrollBehavior: 'auto' }}
      >
        {doubled.map((analysis, i) => {
          const isUp = analysis.changePercent >= 0;
          return (
            <div
              key={`${analysis.pair.symbol}-${i}`}
              className="flex items-center gap-2 shrink-0"
            >
              <span className="text-xs text-muted-foreground">
                {FLAG_EMOJIS[analysis.pair.base]}
              </span>
              <span className="text-xs font-semibold text-foreground">
                {analysis.pair.symbol}
              </span>
              <span className="text-xs font-mono font-semibold text-foreground">
                {analysis.price.toFixed(analysis.pair.pipSize < 0.01 ? 5 : 3)}
              </span>
              <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${isUp ? 'text-bullish' : 'text-bearish'}`}>
                {isUp ? <TrendingUp className="w-3 h-3" /> : analysis.changePercent < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                {isUp ? '+' : ''}{analysis.changePercent.toFixed(2)}%
              </span>
              <div className="w-px h-3 bg-border/30 ml-2" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
