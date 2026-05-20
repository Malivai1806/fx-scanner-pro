// ============================================================
// FX Scanner Pro — Analysis Panel Component
// Design: Obsidian Flow — Trade signals, S/R, patterns
// ============================================================

import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Minus, Target, ShieldAlert,
  Crosshair, BarChart3, Activity, Layers, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import type { PairAnalysis, PairInfo, Timeframe } from '@/lib/forex-types';

interface AnalysisPanelProps {
  pair: PairInfo;
  analysis: PairAnalysis | null;
  timeframe: Timeframe;
}

export function AnalysisPanel({ pair, analysis, timeframe }: AnalysisPanelProps) {
  if (!analysis) {
    return (
      <div className="glass-panel p-6 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Activity className="w-8 h-8 text-muted-foreground mx-auto animate-pulse" />
          <p className="text-sm text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  const { signal, indicators, supportResistance, patterns, trend } = analysis;
  const currentTrend = trend[timeframe];
  const decimals = pair.pipSize < 0.01 ? 5 : pair.pipSize < 0.1 ? 3 : 2;

  return (
    <div className="space-y-3">
      {/* Trade Signal Card */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.05, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className={`glass-panel overflow-hidden ${
          signal.type === 'buy' ? 'glow-green' :
          signal.type === 'sell' ? 'glow-red' : ''
        }`}
      >
        <div className={`px-4 py-3 flex items-center justify-between ${
          signal.type === 'buy' ? 'bg-bullish/10' :
          signal.type === 'sell' ? 'bg-bearish/10' : 'bg-white/[0.03]'
        }`}>
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-foreground" />
            <span className="text-sm font-bold text-foreground">Signaal</span>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            signal.type === 'buy' ? 'bg-bullish/20 text-bullish' :
            signal.type === 'sell' ? 'bg-bearish/20 text-bearish' :
            'bg-white/10 text-muted-foreground'
          }`}>
            {signal.type === 'buy' ? <ArrowUpRight className="w-3 h-3" /> :
             signal.type === 'sell' ? <ArrowDownRight className="w-3 h-3" /> :
             <Minus className="w-3 h-3" />}
            {signal.type === 'buy' ? 'KOOP' :
             signal.type === 'sell' ? 'VERKOOP' : 'NEUTRAAL'}
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              signal.sessionActive ? 'bg-bullish/10 text-bullish' : 'bg-white/5 text-muted-foreground'
            }`}>{signal.sessionName}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              signal.htfBias === 'bullish' ? 'bg-bullish/10 text-bullish' :
              signal.htfBias === 'bearish' ? 'bg-bearish/10 text-bearish' :
              'bg-white/5 text-muted-foreground'
            }`}>HTF: {signal.htfBias}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Betrouwbaarheid</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{
                  width: `${signal.confidence}%`,
                  background: signal.confidence > 70 ? 'oklch(0.696 0.17 162.48)' :
                             signal.confidence > 50 ? 'oklch(0.795 0.184 86.047)' :
                             'oklch(0.645 0.246 16.439)',
                }} />
              </div>
              <span className="text-xs font-mono font-bold text-foreground">{signal.confidence}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <LevelRow icon={<Target className="w-3.5 h-3.5" />} label="Entry" value={signal.entry.toFixed(decimals)} color="text-foreground" />
            <LevelRow icon={<ShieldAlert className="w-3.5 h-3.5" />} label="Stop Loss" value={signal.stopLoss.toFixed(decimals)} color="text-bearish" />
            <LevelRow icon={<Target className="w-3.5 h-3.5" />} label="Take Profit 1" value={signal.takeProfit1.toFixed(decimals)} color="text-bullish" />
            <LevelRow icon={<Target className="w-3.5 h-3.5" />} label="Take Profit 2" value={signal.takeProfit2.toFixed(decimals)} color="text-bullish" />
            <LevelRow icon={<Target className="w-3.5 h-3.5" />} label="Take Profit 3" value={signal.takeProfit3.toFixed(decimals)} color="text-bullish" />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <span className="text-xs text-muted-foreground">Risk/Reward</span>
            <span className={`text-sm font-bold font-mono ${
              signal.riskReward >= 2 ? 'text-bullish' :
              signal.riskReward >= 1 ? 'text-gold' : 'text-bearish'
            }`}>1:{signal.riskReward}</span>
          </div>

          <div className="pt-2 border-t border-border/30">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Reden</span>
            <p className="text-xs text-foreground/80">{signal.reason}</p>
          </div>
        </div>
      </motion.div>

      {/* Trend Card */}
      {currentTrend && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="glass-panel p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-foreground" />
            <span className="text-sm font-bold text-foreground">Trend Analyse</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Richting</span>
              <div className="flex items-center gap-1.5">
                {currentTrend.direction === 'bullish' ? <TrendingUp className="w-4 h-4 text-bullish" /> :
                 currentTrend.direction === 'bearish' ? <TrendingDown className="w-4 h-4 text-bearish" /> :
                 <Minus className="w-4 h-4 text-gold" />}
                <span className={`text-xs font-bold ${
                  currentTrend.direction === 'bullish' ? 'text-bullish' :
                  currentTrend.direction === 'bearish' ? 'text-bearish' : 'text-gold'
                }`}>{currentTrend.direction === 'bullish' ? 'Bullish' : currentTrend.direction === 'bearish' ? 'Bearish' : 'Neutraal'}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Sterkte</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{
                    width: `${currentTrend.strength}%`,
                    background: currentTrend.direction === 'bullish' ? 'oklch(0.696 0.17 162.48)' :
                      currentTrend.direction === 'bearish' ? 'oklch(0.645 0.246 16.439)' : 'oklch(0.795 0.184 86.047)',
                  }} />
                </div>
                <span className="text-xs font-mono font-bold">{currentTrend.strength}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Drawdown</span>
              <span className="text-xs font-mono font-bold text-foreground">
                {currentTrend.drawdown}% ({currentTrend.drawdownPips} pips)
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Indicators Card */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="glass-panel p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-foreground" />
          <span className="text-sm font-bold text-foreground">Indicatoren</span>
        </div>
        <div className="space-y-2">
          <IndicatorRow label="RSI (14)" value={indicators.rsi.toFixed(1)}
            status={indicators.rsi > 70 ? 'Overbought' : indicators.rsi < 30 ? 'Oversold' : 'Neutraal'}
            color={indicators.rsi > 70 ? 'bearish' : indicators.rsi < 30 ? 'bullish' : 'neutral'} />
          <IndicatorRow label="MACD" value={indicators.macd.macd.toFixed(decimals)}
            status={indicators.macd.histogram > 0 ? 'Bullish' : 'Bearish'}
            color={indicators.macd.histogram > 0 ? 'bullish' : 'bearish'} />
          <IndicatorRow label="MA20" value={indicators.ma20.toFixed(decimals)}
            status={analysis.price > indicators.ma20 ? 'Boven' : 'Onder'}
            color={analysis.price > indicators.ma20 ? 'bullish' : 'bearish'} />
          <IndicatorRow label="MA50" value={indicators.ma50.toFixed(decimals)}
            status={analysis.price > indicators.ma50 ? 'Boven' : 'Onder'}
            color={analysis.price > indicators.ma50 ? 'bullish' : 'bearish'} />
          <IndicatorRow label="ATR (14)" value={indicators.atr.toFixed(decimals)}
            status="Volatiliteit" color="neutral" />
        </div>
      </motion.div>

      {/* Support & Resistance */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="glass-panel p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-foreground" />
          <span className="text-sm font-bold text-foreground">Support & Resistance</span>
        </div>
        <div className="space-y-2">
          {supportResistance.resistances.filter(r => r > analysis.price).sort((a,b) => a-b).slice(0,3).map((r, i) => (
            <div key={`r-${i}`} className="flex items-center justify-between">
              <span className="text-xs text-bearish font-semibold">R{i+1}</span>
              <span className="text-xs font-mono font-bold text-bearish">{r.toFixed(decimals)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between py-1 border-y border-border/30">
            <span className="text-xs text-foreground font-semibold">Prijs</span>
            <span className="text-xs font-mono font-bold text-foreground">{analysis.price.toFixed(decimals)}</span>
          </div>
          {supportResistance.supports.filter(s => s < analysis.price).sort((a,b) => b-a).slice(0,3).map((s, i) => (
            <div key={`s-${i}`} className="flex items-center justify-between">
              <span className="text-xs text-bullish font-semibold">S{i+1}</span>
              <span className="text-xs font-mono font-bold text-bullish">{s.toFixed(decimals)}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Patterns */}
      {patterns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="glass-panel p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-foreground" />
            <span className="text-sm font-bold text-foreground">Patronen</span>
          </div>
          <div className="space-y-2">
            {patterns.map((pattern, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    pattern.direction === 'bullish' ? 'bg-bullish' :
                    pattern.direction === 'bearish' ? 'bg-bearish' : 'bg-gold'
                  }`} />
                  <span className="text-xs font-semibold text-foreground">{pattern.label}</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">{pattern.reliability}% betrouwbaar</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function LevelRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span className={color}>{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className={`text-xs font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}

function IndicatorRow({ label, value, status, color }: { label: string; value: string; status: string; color: 'bullish' | 'bearish' | 'neutral' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-bold text-foreground">{value}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
          color === 'bullish' ? 'bg-bullish/10 text-bullish' :
          color === 'bearish' ? 'bg-bearish/10 text-bearish' :
          'bg-white/5 text-muted-foreground'
        }`}>{status}</span>
      </div>
    </div>
  );
}
