// ============================================================
// FX Scanner Pro — Scan Progress Component
// Design: Obsidian Flow — Scanning animation bar
// ============================================================

interface ScanProgressProps {
  progress: number;
  currentPair: string | null;
}

export function ScanProgress({ progress, currentPair }: ScanProgressProps) {
  return (
    <div className="border-b border-border/30 bg-card/20 backdrop-blur-sm">
      <div className="container py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-2 h-2 rounded-full bg-bullish pulse-dot" />
            <span className="text-xs font-semibold text-bullish">Scanning</span>
          </div>
          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, oklch(0.696 0.17 162.48), oklch(0.795 0.184 86.047))',
              }}
            />
          </div>
          <span className="text-xs font-mono text-muted-foreground shrink-0">
            {currentPair || '...'} ({progress}%)
          </span>
        </div>
      </div>
    </div>
  );
}
