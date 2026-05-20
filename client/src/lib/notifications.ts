// Push notificaties voor FX Scanner Pro
// Werkt als PWA op iPhone (Safari) en Android (Chrome)

export function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return Promise.resolve(false);
  if (Notification.permission === 'granted') return Promise.resolve(true);
  return Notification.requestPermission().then(p => p === 'granted');
}

export function sendSignalNotification(symbol: string, direction: 'BUY' | 'SELL', strength: number, price: number) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const emoji = direction === 'BUY' ? '🟢' : '🔴';
  const title = `${emoji} ${direction} Signaal — ${symbol}`;
  const body = `Prijs: ${price.toFixed(5)} | Sterkte: ${strength}%`;

  try {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `signal-${symbol}`,
      renotify: true,
    });
  } catch {}
}
