// ============================================================
// FX Scanner Pro — Alert/Notification System
// Design: Obsidian Flow — Push alerts for strong signals
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BellRing, X, TrendingUp, TrendingDown,
  Volume2, VolumeX, Settings2, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PairAnalysis } from '@/lib/forex-types';
import { FLAG_EMOJIS } from '@/lib/forex-types';

export interface Alert {
  id: string;
  timestamp: number;
  pair: string;
  base: string;
  type: 'buy' | 'sell';
  price: number;
  confidence: number;
  reason: string;
  timeframe: string;
  read: boolean;
}

interface AlertSystemProps {
  analyses: Map<string, PairAnalysis>;
  selectedTimeframe: string;
  onPairSelect: (symbol: string) => void;
}

// Alert thresholds
const MIN_CONFIDENCE = 70;
const ALERT_COOLDOWN = 5 * 60 * 1000; // 5 minutes between alerts for same pair

export function AlertSystem({ analyses, selectedTimeframe, onPairSelect }: AlertSystemProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const lastAlertTimes = useRef<Map<string, number>>(new Map());
  const prevAnalyses = useRef<Map<string, PairAnalysis>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
    }
  }, []);

  // Play alert sound
  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      // Create a simple beep using Web Audio API
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch {}
  }, [soundEnabled]);

  // Send browser notification
  const sendBrowserNotification = useCallback((alert: Alert) => {
    if (!notificationsEnabled || !('Notification' in window)) return;
    try {
      new Notification(`FX Scanner Pro — ${alert.type === 'buy' ? 'KOOP' : 'VERKOOP'} Signaal`, {
        body: `${alert.pair} @ ${alert.price.toFixed(5)} — ${alert.reason}`,
        icon: '/favicon.ico',
        tag: alert.id,
      });
    } catch {}
  }, [notificationsEnabled]);

  // Check for new strong signals
  useEffect(() => {
    if (analyses.size === 0) return;

    const now = Date.now();
    const newAlerts: Alert[] = [];

    analyses.forEach((analysis, symbol) => {
      const prev = prevAnalyses.current.get(symbol);
      const signal = analysis.signal;

      // Only alert on strong buy/sell signals
      if (signal.type === 'neutral' || signal.confidence < MIN_CONFIDENCE) return;

      // Check cooldown
      const lastAlert = lastAlertTimes.current.get(symbol);
      if (lastAlert && now - lastAlert < ALERT_COOLDOWN) return;

      // Check if signal changed from previous scan
      const prevSignal = prev?.signal;
      const isNewSignal = !prevSignal ||
        prevSignal.type !== signal.type ||
        Math.abs(prevSignal.confidence - signal.confidence) > 10;

      if (isNewSignal) {
        const alert: Alert = {
          id: `${symbol}_${now}`,
          timestamp: now,
          pair: symbol,
          base: analysis.pair.base,
          type: signal.type as 'buy' | 'sell',
          price: analysis.price,
          confidence: signal.confidence,
          reason: signal.reason,
          timeframe: selectedTimeframe,
          read: false,
        };
        newAlerts.push(alert);
        lastAlertTimes.current.set(symbol, now);
      }
    });

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 50)); // Keep max 50 alerts
      playAlertSound();
      newAlerts.forEach(sendBrowserNotification);
    }

    // Update previous analyses reference
    prevAnalyses.current = new Map(analyses);
  }, [analyses, selectedTimeframe, playAlertSound, sendBrowserNotification]);

  const unreadCount = alerts.filter(a => !a.read).length;

  const markAllRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  const handleAlertClick = (alert: Alert) => {
    setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, read: true } : a));
    onPairSelect(alert.pair);
    setIsOpen(false);
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Nu';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m geleden`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}u geleden`;
    return new Date(ts).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-white/5 transition-colors duration-150"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5 text-gold animate-pulse" />
        ) : (
          <Bell className="w-5 h-5 text-muted-foreground" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-gold text-[9px] font-bold text-black flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Alert panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute right-0 top-12 w-[380px] max-h-[500px] glass-panel overflow-hidden z-50 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-gold" />
                <span className="text-sm font-bold text-foreground">Alerts</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold bg-gold/20 text-gold px-1.5 py-0.5 rounded-full">
                    {unreadCount} nieuw
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1.5 rounded hover:bg-white/5 transition-colors"
                  title={soundEnabled ? 'Geluid uit' : 'Geluid aan'}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>
                <button
                  onClick={requestPermission}
                  className={`p-1.5 rounded hover:bg-white/5 transition-colors ${notificationsEnabled ? 'text-bullish' : 'text-muted-foreground'}`}
                  title={notificationsEnabled ? 'Browser notificaties aan' : 'Browser notificaties activeren'}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
                {alerts.length > 0 && (
                  <>
                    <button
                      onClick={markAllRead}
                      className="p-1.5 rounded hover:bg-white/5 transition-colors text-muted-foreground text-[10px] font-semibold"
                      title="Alles gelezen"
                    >
                      Gelezen
                    </button>
                    <button
                      onClick={clearAlerts}
                      className="p-1.5 rounded hover:bg-white/5 transition-colors"
                      title="Alles wissen"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded hover:bg-white/5 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Alert list */}
            <div className="max-h-[400px] overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Geen alerts nog</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    Alerts verschijnen bij sterke signalen ({'>'}70% betrouwbaarheid)
                  </p>
                </div>
              ) : (
                alerts.map((alert, i) => (
                  <motion.button
                    key={alert.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => handleAlertClick(alert)}
                    className={`w-full text-left p-3 border-b border-border/20 hover:bg-white/[0.03] transition-colors ${
                      !alert.read ? 'bg-white/[0.02]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Signal icon */}
                      <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        alert.type === 'buy' ? 'bg-bullish/10' : 'bg-bearish/10'
                      }`}>
                        {alert.type === 'buy' ? (
                          <TrendingUp className="w-4 h-4 text-bullish" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-bearish" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs">{FLAG_EMOJIS[alert.base]}</span>
                            <span className="text-xs font-bold text-foreground">{alert.pair}</span>
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              alert.type === 'buy' ? 'bg-bullish/20 text-bullish' : 'bg-bearish/20 text-bearish'
                            }`}>
                              {alert.type === 'buy' ? 'KOOP' : 'VERKOOP'}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatTime(alert.timestamp)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {alert.reason}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-mono text-foreground/70">
                            @ {alert.price.toFixed(5)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {alert.confidence}% betrouwbaar
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase">
                            {alert.timeframe}
                          </span>
                        </div>
                      </div>

                      {/* Unread dot */}
                      {!alert.read && (
                        <div className="w-2 h-2 rounded-full bg-gold shrink-0 mt-2" />
                      )}
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
