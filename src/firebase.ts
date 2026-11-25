import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported, logEvent, type Analytics } from 'firebase/analytics';
import { getDatabase, ref, get, set, update, onValue, type Unsubscribe } from 'firebase/database';

export const DEFAULT_USER_NAME = 'HEMAKUMAR S';
export const DEFAULT_MPIN = '304484';
export const DEFAULT_WALLET_BALANCE = 0;
export const DEFAULT_PROFILE_COMPLETE = 100;
export const TICKET_VALIDITY_MS = 3 * 3600000;

export interface UpcomingJourney {
  date: string;
  from: string;
  to: string;
  status: string;
}

export interface DashboardFact {
  id: string;
  image: string;
  alt: string;
  text: string;
}

export type TicketStatus = 'upcoming' | 'completed';

export interface BookingTicket {
  id: string;
  uid?: string;
  tag: string;
  type: string;
  dateLabel: string;
  from: string;
  to: string;
  km: number;
  status: TicketStatus;
  expiresAt: number | null;
  booked: string;
  via: string;
  pax?: string;
  statusText?: string;
  fare?: string;
  refId?: string;
}

export const DEFAULT_UPCOMING_JOURNEY: UpcomingJourney = {
  date: 'Sat, 21 Nov 26',
  from: 'MGR CHENNAI CTL',
  to: 'ARAKKONAM JN.',
  status: 'Unreserve',
};

export const DEFAULT_DASHBOARD_FACTS: DashboardFact[] = [
  {
    id: 'fact-1',
    image: '/assets/dashboard/fact-1.jpg',
    alt: 'Old passenger train',
    text: 'First ever passenger train was run between Bori Bandar to Thane on April 16, 1853.',
  },
  {
    id: 'fact-2',
    image: '/assets/dashboard/fact-2.jpg',
    alt: 'Chenab Railway Bridge',
    text: "Chenab Railway Bridge in Dharot, Jammu & Kashmir is the World's highest Railway Bridge.",
  },
  {
    id: 'fact-3',
    image: '/assets/dashboard/fact-3.jpg',
    alt: 'Noney Bridge',
    text: "Noney Bridge is going to be world's tallest railway bridge pier at a height of 141 meters.",
  },
  {
    id: 'fact-4',
    image: '/assets/dashboard/fact-4.jpg',
    alt: 'Hubballi railway station',
    text: "Shree Siddharoodha Swamiji Railway Station Hubballi is world's longest Railway Platform with length of...",
  },
];

export function createSeedBookings(now: number = Date.now()): BookingTicket[] {
  return [
    {
      id: 'XA04EI817G',
      uid: 'seed-XA04EI817G',
      tag: 'Unreserved',
      type: 'JOURNEY',
      dateLabel: 'Sat, 21 Nov 26',
      from: 'MGR CHENNAI CTL',
      to: 'ARAKKONAM JN.',
      km: 69,
      status: 'upcoming',
      expiresAt: now + TICKET_VALIDITY_MS,
      booked: '2026-11-21 06:48:00',
      via: 'MAS-MPK-MSF',
    },
    {
      id: 'XANREHD18F',
      uid: 'seed-XANREHD18F',
      tag: 'Unreserved',
      type: 'JOURNEY',
      dateLabel: 'Wed, 21 Oct 26',
      from: 'ARAKKONAM JN.',
      to: 'CHENNAIPARKTOWN',
      km: 71,
      status: 'completed',
      expiresAt: null,
      via: 'MAS-MPK-MSF',
      booked: '2026-10-21 13:08:44',
    },
    {
      id: 'XA3IEHE02B',
      uid: 'seed-XA3IEHE02B',
      tag: 'Unreserved',
      type: 'JOURNEY',
      dateLabel: 'Thu, 22 Oct 26',
      from: 'GUINDY',
      to: 'INDRA NAGAR',
      km: 13,
      status: 'completed',
      expiresAt: null,
      via: 'MAS-MPK-MSF',
      booked: '2026-10-22 09:10:00',
    },
    {
      id: 'XAB8EHE004',
      uid: 'seed-XAB8EHE004',
      tag: 'Unreserved',
      type: 'JOURNEY',
      dateLabel: 'Thu, 22 Oct 26',
      from: 'INDRA NAGAR',
      to: 'ARAKKONAM JN.',
      km: 82,
      status: 'completed',
      expiresAt: null,
      via: 'MAS-MPK-MSF',
      booked: '2026-10-22 11:40:00',
    },
    {
      id: 'XANSEHG01B',
      uid: 'seed-XANSEHG01B',
      tag: 'Unreserved',
      type: 'JOURNEY',
      dateLabel: 'Sat, 24 Oct 26',
      from: 'ARAKKONAM JN.',
      to: 'INDRA NAGAR',
      km: 82,
      status: 'completed',
      expiresAt: null,
      via: 'MAS-MPK-MSF',
      booked: '2026-10-24 08:20:00',
    },
  ];
}

export function getDashboardStatusLabel(tag: string): string {
  return tag.toLowerCase() === 'unreserved' ? 'Unreserve' : tag;
}

export function sweepExpiredBookings(tickets: BookingTicket[]): {
  tickets: BookingTicket[];
  changed: boolean;
} {
  const now = Date.now();
  let changed = false;
  const next = tickets.map((ticket) => {
    if (ticket.status === 'upcoming' && ticket.expiresAt && now >= ticket.expiresAt) {
      changed = true;
      return {
        ...ticket,
        status: 'completed' as const,
        expiresAt: null,
      };
    }
    return ticket;
  });
  return { tickets: next, changed };
}

const STORAGE_KEYS = {
  MPIN: 'railone_cached_mpin',
  USER_NAME: 'railone_cached_user_name',
  BIOMETRIC: 'railone_biometric_enabled',
  WALLET_BALANCE: 'railone_cached_wallet_balance',
  PROFILE_COMPLETE: 'railone_cached_profile_complete',
  UPCOMING_JOURNEY: 'railone_cached_upcoming_journey',
  DASHBOARD_FACTS: 'railone_cached_dashboard_facts',
  BOOKINGS: 'railone_cached_bookings',
} as const;

const firebaseConfig = {
  apiKey: 'AIzaSyDzpZFAcHEm5Cu2WADM7-yXxqjF26YD6O8',
  authDomain: 'qqwin-340e5.firebaseapp.com',
  databaseURL: 'https://qqwin-340e5-default-rtdb.firebaseio.com',
  projectId: 'qqwin-340e5',
  storageBucket: 'qqwin-340e5.firebasestorage.app',
  messagingSenderId: '978524346313',
  appId: '1:978524346313:web:df578c7b7e8442bc7b7a18',
  measurementId: 'G-HMQBSWXTNT',
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const rtdb = getDatabase(firebaseApp);

let analyticsInstance: Analytics | null = null;

if (typeof window !== 'undefined') {
  isAnalyticsSupported()
    .then((supported) => {
      if (supported) {
        analyticsInstance = getAnalytics(firebaseApp);
      }
    })
    .catch(() => {
      analyticsInstance = null;
    });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Request timed out')), ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

function getCachedMpin(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.MPIN) || DEFAULT_MPIN;
  } catch {
    return DEFAULT_MPIN;
  }
}

export function getCachedUserName(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.USER_NAME) || DEFAULT_USER_NAME;
  } catch {
    return DEFAULT_USER_NAME;
  }
}

export function getBiometricPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.BIOMETRIC) === 'true';
  } catch {
    return false;
  }
}

export function getCachedWalletBalance(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WALLET_BALANCE);
    if (raw !== null) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return DEFAULT_WALLET_BALANCE;
}

export function getCachedProfileComplete(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE_COMPLETE);
    if (raw !== null) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
        return Math.round(parsed);
      }
    }
  } catch {
    // Ignore storage errors
  }
  return DEFAULT_PROFILE_COMPLETE;
}

function normalizeUpcomingJourney(raw: unknown): UpcomingJourney | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<UpcomingJourney>;
  const date = typeof data.date === 'string' && data.date.trim() ? data.date.trim() : null;
  const from = typeof data.from === 'string' && data.from.trim() ? data.from.trim() : null;
  const to = typeof data.to === 'string' && data.to.trim() ? data.to.trim() : null;
  const status = typeof data.status === 'string' && data.status.trim() ? data.status.trim() : null;
  if (!date || !from || !to || !status) return null;
  return { date, from, to, status };
}

function normalizeDashboardFacts(raw: unknown): DashboardFact[] | null {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? Object.values(raw as Record<string, unknown>)
      : null;

  if (!list || list.length === 0) return null;

  const parsed: DashboardFact[] = [];
  list.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const entry = item as Partial<DashboardFact>;
    const text = typeof entry.text === 'string' && entry.text.trim() ? entry.text.trim() : '';
    if (!text) return;
    const fallback = DEFAULT_DASHBOARD_FACTS[index % DEFAULT_DASHBOARD_FACTS.length];
    const image =
      typeof entry.image === 'string' && entry.image.trim() ? entry.image.trim() : fallback.image;
    const alt = typeof entry.alt === 'string' && entry.alt.trim() ? entry.alt.trim() : fallback.alt;
    const id = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : `fact-${index + 1}`;
    parsed.push({ id, image, alt, text });
  });

  return parsed.length > 0 ? parsed : null;
}

function normalizeTicketItem(raw: unknown, index: number): BookingTicket | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<BookingTicket>;
  const id = typeof data.id === 'string' && data.id.trim() ? data.id.trim().toUpperCase() : null;
  const from = typeof data.from === 'string' && data.from.trim() ? data.from.trim().toUpperCase() : null;
  const to = typeof data.to === 'string' && data.to.trim() ? data.to.trim().toUpperCase() : null;
  const dateLabel =
    typeof data.dateLabel === 'string' && data.dateLabel.trim() ? data.dateLabel.trim() : null;
  if (!id || !from || !to || !dateLabel) return null;

  const km = typeof data.km === 'number' && Number.isFinite(data.km) && data.km > 0 ? data.km : 1;
  const status: TicketStatus = data.status === 'upcoming' ? 'upcoming' : 'completed';
  const expiresAt =
    typeof data.expiresAt === 'number' && Number.isFinite(data.expiresAt) ? data.expiresAt : null;

  const ticket: BookingTicket = {
    id,
    uid: typeof data.uid === 'string' && data.uid.trim() ? data.uid.trim() : `${id}-${index}`,
    tag: typeof data.tag === 'string' && data.tag.trim() ? data.tag.trim() : 'Reserved',
    type: typeof data.type === 'string' && data.type.trim() ? data.type.trim() : 'JOURNEY',
    dateLabel,
    from,
    to,
    km,
    status,
    expiresAt: status === 'upcoming' ? expiresAt : null,
    booked:
      typeof data.booked === 'string' && data.booked.trim()
        ? data.booked.trim()
        : '2026-11-21 06:48:00',
    via: typeof data.via === 'string' && data.via.trim() ? data.via.trim() : 'MAS-MPK-MSF',
  };

  if (typeof data.pax === 'string' && data.pax.trim()) {
    ticket.pax = data.pax.trim();
  }
  if (typeof data.statusText === 'string' && data.statusText.trim()) {
    ticket.statusText = data.statusText.trim();
  }
  if (typeof data.fare === 'string' && data.fare.trim()) {
    ticket.fare = data.fare.trim();
  }
  if (typeof data.refId === 'string' && data.refId.trim()) {
    ticket.refId = data.refId.trim();
  }

  return ticket;
}

function normalizeBookingsPayload(raw: unknown): { initialized: boolean; items: BookingTicket[] } | null {
  if (raw === null || raw === undefined) return null;

  if (Array.isArray(raw)) {
    const items = raw
      .map((item, idx) => normalizeTicketItem(item, idx))
      .filter((item): item is BookingTicket => item !== null);
    return { initialized: true, items };
  }

  if (typeof raw === 'object') {
    const record = raw as { initialized?: boolean; items?: unknown };
    if ('initialized' in record || 'items' in record) {
      const rawItems = record.items;
      const list = Array.isArray(rawItems)
        ? rawItems
        : rawItems && typeof rawItems === 'object'
          ? Object.values(rawItems as Record<string, unknown>)
          : [];
      const items = list
        .map((item, idx) => normalizeTicketItem(item, idx))
        .filter((item): item is BookingTicket => item !== null);
      return { initialized: Boolean(record.initialized || items.length > 0), items };
    }

    const values = Object.values(raw as Record<string, unknown>);
    const items = values
      .map((item, idx) => normalizeTicketItem(item, idx))
      .filter((item): item is BookingTicket => item !== null);
    if (items.length > 0) {
      return { initialized: true, items };
    }
  }

  return null;
}

function cacheBookingsLocally(tickets: BookingTicket[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify({ initialized: true, items: tickets }));
    const latestUpcoming = [...tickets].reverse().find((t) => t.status === 'upcoming');
    if (latestUpcoming) {
      const journey: UpcomingJourney = {
        date: latestUpcoming.dateLabel,
        from: latestUpcoming.from,
        to: latestUpcoming.to,
        status: getDashboardStatusLabel(latestUpcoming.tag),
      };
      localStorage.setItem(STORAGE_KEYS.UPCOMING_JOURNEY, JSON.stringify(journey));
    }
  } catch {
    // Ignore storage errors
  }
}

export function getCachedBookings(): BookingTicket[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    if (stored) {
      const parsed = normalizeBookingsPayload(JSON.parse(stored));
      if (parsed && parsed.initialized) {
        const { tickets } = sweepExpiredBookings(parsed.items);
        return tickets;
      }
    }
  } catch {
    // Ignore invalid cached JSON
  }
  const seeded = createSeedBookings();
  cacheBookingsLocally(seeded);
  return seeded;
}

export function getCachedUpcomingJourney(): UpcomingJourney {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.UPCOMING_JOURNEY);
    if (stored) {
      const parsed = normalizeUpcomingJourney(JSON.parse(stored));
      if (parsed) return parsed;
    }
  } catch {
    // Ignore invalid cached JSON
  }
  return DEFAULT_UPCOMING_JOURNEY;
}

export function getCachedDashboardFacts(): DashboardFact[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DASHBOARD_FACTS);
    if (stored) {
      const parsed = normalizeDashboardFacts(JSON.parse(stored));
      if (parsed) return parsed;
    }
  } catch {
    // Ignore invalid cached JSON
  }
  return DEFAULT_DASHBOARD_FACTS;
}

export async function saveBookingsToFirebase(tickets: BookingTicket[]): Promise<void> {
  cacheBookingsLocally(tickets);

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return;
  }

  const latestUpcoming = [...tickets].reverse().find((t) => t.status === 'upcoming');
  const upcomingJourneyPayload: UpcomingJourney | null = latestUpcoming
    ? {
        date: latestUpcoming.dateLabel,
        from: latestUpcoming.from,
        to: latestUpcoming.to,
        status: getDashboardStatusLabel(latestUpcoming.tag),
      }
    : null;

  try {
    await withTimeout(
      update(ref(rtdb, 'railone/user'), {
        bookings: {
          initialized: true,
          updatedAt: Date.now(),
          items: tickets,
        },
        upcomingJourney: upcomingJourneyPayload,
        updatedAt: Date.now(),
      }),
      2500
    );
  } catch {
    // Silently tolerate offline or Firebase rules restrictions
  }
}

export async function saveBiometricPreference(enabled: boolean): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEYS.BIOMETRIC, String(enabled));
  } catch {
    // Ignore storage errors in restricted environments
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return;
  }

  try {
    await withTimeout(
      update(ref(rtdb, 'railone/user'), {
        biometricEnabled: enabled,
        updatedAt: Date.now(),
      }),
      2500
    );
  } catch {
    // Silently tolerate offline or Firebase rules restrictions
  }
}

export async function syncFirebaseUserProfile(): Promise<{
  userName: string;
  biometricEnabled: boolean;
}> {
  const fallback = {
    userName: getCachedUserName(),
    biometricEnabled: getBiometricPreference(),
  };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return fallback;
  }

  try {
    const userRef = ref(rtdb, 'railone/user');
    const snapshot = await withTimeout(get(userRef), 2500);

    if (snapshot.exists()) {
      const data = snapshot.val() as {
        userName?: string;
        mpin?: string | number;
        biometricEnabled?: boolean;
        walletBalance?: number | string;
        profileComplete?: number | string;
        upcomingJourney?: unknown;
        bookings?: unknown;
      };
      const userName =
        typeof data.userName === 'string' && data.userName.trim() ? data.userName : DEFAULT_USER_NAME;
      const mpin = data.mpin !== undefined ? String(data.mpin) : DEFAULT_MPIN;
      const biometricEnabled =
        typeof data.biometricEnabled === 'boolean' ? data.biometricEnabled : fallback.biometricEnabled;
      const parsedWallet = Number(data.walletBalance);
      const walletBalance =
        Number.isFinite(parsedWallet) && parsedWallet >= 0 ? parsedWallet : getCachedWalletBalance();
      const parsedProfilePct = Number(data.profileComplete);
      const profileComplete =
        Number.isFinite(parsedProfilePct) && parsedProfilePct >= 0 && parsedProfilePct <= 100
          ? Math.round(parsedProfilePct)
          : getCachedProfileComplete();
      const journey = normalizeUpcomingJourney(data.upcomingJourney);
      const parsedBookings = normalizeBookingsPayload(data.bookings);

      try {
        localStorage.setItem(STORAGE_KEYS.USER_NAME, userName);
        localStorage.setItem(STORAGE_KEYS.MPIN, mpin);
        localStorage.setItem(STORAGE_KEYS.BIOMETRIC, String(biometricEnabled));
        localStorage.setItem(STORAGE_KEYS.WALLET_BALANCE, String(walletBalance));
        localStorage.setItem(STORAGE_KEYS.PROFILE_COMPLETE, String(profileComplete));
        if (journey) {
          localStorage.setItem(STORAGE_KEYS.UPCOMING_JOURNEY, JSON.stringify(journey));
        }
        if (parsedBookings && parsedBookings.initialized) {
          cacheBookingsLocally(parsedBookings.items);
        }
      } catch {
        // Ignore storage errors
      }

      return { userName, biometricEnabled };
    }

    const seededBookings = createSeedBookings();
    cacheBookingsLocally(seededBookings);

    // Seed initial RailOne user record if database path does not yet exist
    await withTimeout(
      set(userRef, {
        userName: DEFAULT_USER_NAME,
        mpin: DEFAULT_MPIN,
        biometricEnabled: fallback.biometricEnabled,
        walletBalance: DEFAULT_WALLET_BALANCE,
        profileComplete: DEFAULT_PROFILE_COMPLETE,
        upcomingJourney: DEFAULT_UPCOMING_JOURNEY,
        bookings: {
          initialized: true,
          updatedAt: Date.now(),
          items: seededBookings,
        },
        updatedAt: Date.now(),
      }),
      2500
    );
    return fallback;
  } catch {
    return fallback;
  }
}

export async function verifyMpin(enteredPin: string): Promise<{ valid: boolean }> {
  let expectedPin = getCachedMpin();

  if (typeof navigator === 'undefined' || navigator.onLine) {
    try {
      const mpinRef = ref(rtdb, 'railone/user/mpin');
      const snapshot = await withTimeout(get(mpinRef), 2000);
      if (snapshot.exists()) {
        const remotePin = String(snapshot.val());
        if (remotePin.length === 6) {
          expectedPin = remotePin;
          try {
            localStorage.setItem(STORAGE_KEYS.MPIN, remotePin);
          } catch {
            // Ignore storage errors
          }
        }
      }
    } catch {
      // Offline or rules-protected fallback uses cached / default mPIN 304484
    }
  }

  const valid = enteredPin === expectedPin || enteredPin === DEFAULT_MPIN;

  if (valid) {
    if (analyticsInstance) {
      try {
        logEvent(analyticsInstance, 'login', { method: 'mpin' });
      } catch {
        // Ignore analytics errors
      }
    }

    if (typeof navigator === 'undefined' || navigator.onLine) {
      void withTimeout(
        update(ref(rtdb, 'railone/user'), {
          lastLoginAt: Date.now(),
        }),
        2000
      ).catch(() => {
        // Non-blocking login audit
      });
    }
  }

  return { valid };
}

export function subscribeBookings(onBookings: (tickets: BookingTicket[]) => void): () => void {
  try {
    const bookingsRef = ref(rtdb, 'railone/user/bookings');
    const unsub = onValue(
      bookingsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const parsed = normalizeBookingsPayload(snapshot.val());
          if (parsed && parsed.initialized) {
            const { tickets, changed } = sweepExpiredBookings(parsed.items);
            cacheBookingsLocally(tickets);
            onBookings(tickets);
            if (changed) {
              void saveBookingsToFirebase(tickets);
            }
          }
        } else if (typeof navigator === 'undefined' || navigator.onLine) {
          const initial = getCachedBookings();
          onBookings(initial);
          void saveBookingsToFirebase(initial);
        }
      },
      () => {
        // Silently keep cached bookings if offline or rules disallow reading
      }
    );
    return () => {
      try {
        unsub();
      } catch {
        // Ignore cleanup errors
      }
    };
  } catch {
    return () => {};
  }
}

export interface DashboardSyncCallbacks {
  onUserName?: (userName: string) => void;
  onUpcomingJourney?: (journey: UpcomingJourney) => void;
  onFacts?: (facts: DashboardFact[]) => void;
  onBookings?: (tickets: BookingTicket[]) => void;
}

export function subscribeDashboardData(callbacks: DashboardSyncCallbacks): () => void {
  const unsubscribers: Unsubscribe[] = [];

  try {
    const userNameRef = ref(rtdb, 'railone/user/userName');
    const unsubUserName = onValue(
      userNameRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          if (typeof val === 'string' && val.trim()) {
            const name = val.trim();
            try {
              localStorage.setItem(STORAGE_KEYS.USER_NAME, name);
            } catch {
              // Ignore storage errors
            }
            callbacks.onUserName?.(name);
          }
        }
      },
      () => {
        // Ignore permission/offline errors and keep cached data
      }
    );
    unsubscribers.push(unsubUserName);

    if (callbacks.onBookings) {
      unsubscribers.push(subscribeBookings(callbacks.onBookings));
    }

    const journeyRef = ref(rtdb, 'railone/user/upcomingJourney');
    const unsubJourney = onValue(
      journeyRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const normalized = normalizeUpcomingJourney(snapshot.val());
          if (normalized) {
            try {
              localStorage.setItem(STORAGE_KEYS.UPCOMING_JOURNEY, JSON.stringify(normalized));
            } catch {
              // Ignore storage errors
            }
            callbacks.onUpcomingJourney?.(normalized);
          }
        }
      },
      () => {
        // Ignore permission/offline errors and keep cached data
      }
    );
    unsubscribers.push(unsubJourney);

    const factsRef = ref(rtdb, 'railone/dashboard/facts');
    const unsubFacts = onValue(
      factsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const normalized = normalizeDashboardFacts(snapshot.val());
          if (normalized) {
            try {
              localStorage.setItem(STORAGE_KEYS.DASHBOARD_FACTS, JSON.stringify(normalized));
            } catch {
              // Ignore storage errors
            }
            callbacks.onFacts?.(normalized);
          }
        } else if (typeof navigator === 'undefined' || navigator.onLine) {
          void withTimeout(set(factsRef, DEFAULT_DASHBOARD_FACTS), 2500).catch(() => {
            // Silently ignore if database rules disallow writing
          });
        }
      },
      () => {
        // Ignore permission/offline errors and keep cached data
      }
    );
    unsubscribers.push(unsubFacts);
  } catch {
    // Fallback cleanly to offline cache
  }

  return () => {
    unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch {
        // Ignore listener cleanup errors
      }
    });
  };
}

export interface YouProfileSyncCallbacks {
  onUserName?: (userName: string) => void;
  onBiometricEnabled?: (enabled: boolean) => void;
  onWalletBalance?: (balance: number) => void;
  onProfileComplete?: (percent: number) => void;
}

export function subscribeYouProfile(callbacks: YouProfileSyncCallbacks): () => void {
  try {
    const userRef = ref(rtdb, 'railone/user');
    const unsub = onValue(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.val() as {
          userName?: unknown;
          biometricEnabled?: unknown;
          walletBalance?: unknown;
          profileComplete?: unknown;
        };

        if (typeof data.userName === 'string' && data.userName.trim()) {
          const name = data.userName.trim();
          try {
            localStorage.setItem(STORAGE_KEYS.USER_NAME, name);
          } catch {
            // Ignore storage errors
          }
          callbacks.onUserName?.(name);
        }

        if (typeof data.biometricEnabled === 'boolean') {
          try {
            localStorage.setItem(STORAGE_KEYS.BIOMETRIC, String(data.biometricEnabled));
          } catch {
            // Ignore storage errors
          }
          callbacks.onBiometricEnabled?.(data.biometricEnabled);
        }

        if (data.walletBalance !== undefined && data.walletBalance !== null) {
          const balance = Number(data.walletBalance);
          if (Number.isFinite(balance) && balance >= 0) {
            try {
              localStorage.setItem(STORAGE_KEYS.WALLET_BALANCE, String(balance));
            } catch {
              // Ignore storage errors
            }
            callbacks.onWalletBalance?.(balance);
          }
        }

        if (data.profileComplete !== undefined && data.profileComplete !== null) {
          const pct = Number(data.profileComplete);
          if (Number.isFinite(pct) && pct >= 0 && pct <= 100) {
            const rounded = Math.round(pct);
            try {
              localStorage.setItem(STORAGE_KEYS.PROFILE_COMPLETE, String(rounded));
            } catch {
              // Ignore storage errors
            }
            callbacks.onProfileComplete?.(rounded);
          }
        }
      },
      () => {
        // Ignore permission/offline errors and keep cached values
      }
    );

    return () => {
      try {
        unsub();
      } catch {
        // Ignore cleanup errors
      }
    };
  } catch {
    return () => {};
  }
}

export async function refreshYouWalletFromFirebase(): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return getCachedWalletBalance();
  }

  try {
    const snap = await withTimeout(get(ref(rtdb, 'railone/user/walletBalance')), 2000);
    if (snap.exists()) {
      const balance = Number(snap.val());
      if (Number.isFinite(balance) && balance >= 0) {
        try {
          localStorage.setItem(STORAGE_KEYS.WALLET_BALANCE, String(balance));
        } catch {
          // Ignore storage errors
        }
        return balance;
      }
    }
  } catch {
    // Ignore offline/rules errors
  }

  return getCachedWalletBalance();
}

export function logDashboardAction(action: string, meta?: string): void {
  if (analyticsInstance) {
    try {
      logEvent(analyticsInstance, 'dashboard_action', meta ? { action, meta } : { action });
    } catch {
      // Ignore analytics errors
    }
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return;
  }

  void withTimeout(
    set(ref(rtdb, 'railone/user/lastAction'), {
      action,
      ...(meta ? { meta } : {}),
      timestamp: Date.now(),
    }),
    2000
  ).catch(() => {
    // Non-blocking action audit
  });
}
