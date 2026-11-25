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

export async function sendTicketBookedNotification(
  refId: string,
  tag: string = 'Unreserved'
): Promise<boolean> {
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
        } = {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-badge-96x96.png',
          tag: notificationTag,
          renotify: true,
          silent: false,
          vibrate: [200, 100, 200],
          data: {
            refId,
            url: '/',
          },
        };
        await registration.showNotification(title, options);
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
