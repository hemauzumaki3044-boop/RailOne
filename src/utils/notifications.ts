export function generateTicketReferenceId(): string {
  const digits: number[] = [];

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < 16; i += 1) {
      digits.push(i === 0 ? (bytes[i] % 9) + 1 : bytes[i] % 10);
    }
  } else {
    for (let i = 0; i < 16; i += 1) {
      digits.push(i === 0 ? Math.floor(Math.random() * 9) + 1 : Math.floor(Math.random() * 10));
    }
  }

  return digits.join('');
}

export function buildTicketNotificationBody(refId: string, tag: string = 'Unreserved'): string {
  const label = tag.trim() || 'Unreserved';
  return `${label} Ticket with Reference ID ${refId} is booked. Please check My Bookings to get ticket details. This message does not provide authorisation to travel.IR-CRIS`;
}

export function getNotificationPermissionState(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestBookingNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }

  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export function playNotificationChime(): void {
  if (typeof window === 'undefined') return;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([160, 70, 160]);
    }
  } catch {
    // Ignore vibration errors
  }

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.setValueAtTime(1174.66, now + 0.09);
    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);
    osc1.onended = () => {
      void ctx.close().catch(() => {});
    };
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

export async function sendTicketBookedNotification(
  refId: string,
  tag: string = 'Unreserved'
): Promise<boolean> {
  playNotificationChime();

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const title = 'RailOne';
  const body = buildTicketNotificationBody(refId, tag);
  const notificationTag = `railone-ticket-${refId}`;

  // Android Chrome & installed PWAs require ServiceWorkerRegistration.showNotification()
  if ('serviceWorker' in navigator) {
    try {
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 2000)),
      ]);

      if (registration && typeof registration.showNotification === 'function') {
        const options: NotificationOptions & {
          renotify?: boolean;
          vibrate?: number[];
          timestamp?: number;
        } = {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-badge-96x96.png',
          tag: notificationTag,
          renotify: true,
          silent: false,
          vibrate: [200, 100, 200],
          timestamp: Date.now(),
          data: {
            refId,
            url: '/',
          },
        };
        await registration.showNotification(title, options);
        return true;
      }

      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_TICKET_NOTIFICATION',
          title,
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-badge-96x96.png',
          tag: notificationTag,
          refId,
        });
        return true;
      }
    } catch {
      // Fall through to standard Notification constructor on desktop browsers
    }
  }

  try {
    new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-badge-96x96.png',
      tag: notificationTag,
    });
    return true;
  } catch {
    return false;
  }
}
