// ============================================================
// FX Scanner Pro — Market Status Banner
// Design: Obsidian Flow — Shows market open/closed state
// ============================================================

import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

export function MarketStatus() {
  const [status, setStatus] = useState<'open' | 'closed' | 'checking'>('checking');
  const [nextOpen, setNextOpen] = useState<string>('');

  useEffect(() => {
    const checkMarketStatus = () => {
      const now = new Date();
      const utcDay = now.getUTCDay();
      const utcHour = now.getUTCHours();

      // Forex market: Sunday 22:00 UTC to Friday 22:00 UTC
      // Closed: Friday 22:00 UTC to Sunday 22:00 UTC
      let isOpen = true;

      if (utcDay === 6) {
        // Saturday — always closed
        isOpen = false;
      } else if (utcDay === 0 && utcHour < 22) {
        // Sunday before 22:00 UTC — closed
        isOpen = false;
      } else if (utcDay === 5 && utcHour >= 22) {
        // Friday after 22:00 UTC — closed
        isOpen = false;
      }

      setStatus(isOpen ? 'open' : 'closed');

      if (!isOpen) {
        // Calculate next open time
        const nextSunday = new Date(now);
        if (utcDay === 5) {
          nextSunday.setUTCDate(now.getUTCDate() + 2); // Skip to Sunday
        } else if (utcDay === 6) {
          nextSunday.setUTCDate(now.getUTCDate() + 1); // Skip to Sunday
        }
        nextSunday.setUTCHours(22, 0, 0, 0);
        if (utcDay === 0 && utcHour < 22) {
          nextSunday.setTime(now.getTime()); // Today
          nextSunday.setUTCHours(22, 0, 0, 0);
        }

        const diff = nextSunday.getTime() - now.getTime();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);

        if (hours > 0) {
          setNextOpen(`Opent over ${hours}u ${minutes}m`);
        } else {
          setNextOpen(`Opent over ${minutes}m`);
        }
      }
    };

    checkMarketStatus();
    const interval = setInterval(checkMarketStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  if (status === 'checking') return null;

  if (status === 'open') {
    return (
      <div className="border-b border-border/20 bg-bullish/5">
        <div className="container py-1.5 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-bullish" />
          <span className="text-[11px] font-semibold text-bullish">Markt Open</span>
          <span className="text-[10px] text-muted-foreground">— Live data wordt geladen</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-gold/20 bg-gold/5">
      <div className="container py-2 flex items-center justify-center gap-2">
        <AlertTriangle className="w-4 h-4 text-gold" />
        <span className="text-xs font-bold text-gold">Forex Markt Gesloten</span>
        <span className="text-[10px] text-muted-foreground">— Weekend pauze</span>
        {nextOpen && (
          <>
            <span className="text-[10px] text-muted-foreground">|</span>
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-gold font-semibold">{nextOpen}</span>
          </>
        )}
      </div>
      <div className="container pb-1.5">
        <p className="text-[10px] text-muted-foreground/70 text-center">
          Data toont laatste beschikbare koersen van vrijdag. Signalen zijn gebaseerd op historische data en worden bijgewerkt wanneer de markt opent.
        </p>
      </div>
    </div>
  );
}
