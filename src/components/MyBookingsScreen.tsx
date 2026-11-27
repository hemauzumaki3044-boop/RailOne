import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getCachedBookings,
  getCachedUserName,
  logDashboardAction,
  saveBookingsToFirebase,
  subscribeBookings,
  sweepExpiredBookings,
  TICKET_VALIDITY_MS,
  type BookingTicket,
  type TicketStatus,
} from '../firebase';
import { MyBookingsShimmerSkeleton } from './ShimmerSkeletons';
import { TicketDetailView } from './TicketDetailView';
import { RailOneNotificationBanner } from './RailOneNotificationBanner';
import {
  buildTicketNotificationBody,
  generateTicketReferenceId,
  getNotificationPermissionState,
  requestBookingNotificationPermission,
  sendTicketBookedNotification,
} from '../utils/notifications';
import { useTicketScreenBoost } from '../utils/screenBrightness';

interface MyBookingsScreenProps {
  onBackToDashboard: () => void;
}

type BookingTab = 'upcoming' | 'completed' | 'cancelled' | 'all';
type BookingView = 'list' | 'detail';
type EditableDetailField =
  | 'type'
  | 'id'
  | 'from'
  | 'to'
  | 'via'
  | 'booked'
  | 'statusText'
  | 'pax'
  | 'fare';

interface NewTicketInput {
  id: string;
  tag: 'Unreserved' | 'Reserved';
  type: string;
  dateLabel: string;
  from: string;
  to: string;
  km: number;
  refId: string;
}

interface EditingDetailState {
  field: EditableDetailField;
  label: string;
  value: string;
}

function getDetailPaxDisplay(ticket: BookingTicket): string {
  if (!ticket.pax) return 'Passenger(s) : 2 Adult , 0 Child';
  return /^passenger/i.test(ticket.pax) ? ticket.pax : `Passenger(s) : ${ticket.pax}`;
}

const TAB_ITEMS: Array<{
  key: BookingTab;
  label: string;
  color: string;
  activeTextClass: string;
}> = [
  { key: 'upcoming', label: 'Upcoming', color: '#FEA24D', activeTextClass: 'text-[#FEA24D]' },
  { key: 'completed', label: 'Completed', color: '#19A34E', activeTextClass: 'text-[#19A34E]' },
  { key: 'cancelled', label: 'Cancelled', color: '#FD5856', activeTextClass: 'text-[#FD5856]' },
  { key: 'all', label: 'All', color: '#0066FF', activeTextClass: 'text-[#0066FF]' },
];

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const mons = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]}, ${d.getDate()} ${mons[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

function fmtStamp(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function TicketTabIcon({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <svg width="20" height="16" viewBox="0 0 22 18">
      <path
        d="M2 2h18v5a2.5 2.5 0 0 0 0 4.5V16H2v-4.5A2.5 2.5 0 0 0 2 7z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M6 7h8M6 10h8M6 13h6" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function EmptyState() {
  return (
    <div className="px-[20px] pt-[230px] text-center">
      <svg width="93" height="62" viewBox="0 0 93 62" className="mx-auto inline-block">
        <path
          d="M4 0h85a4 4 0 0 1 4 4v13a8 8 0 0 0 0 16v13a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V33a8 8 0 0 0 0-16V4a4 4 0 0 1 4-4z"
          fill="#D2D2D2"
        />
        <rect x="18" y="12" width="57" height="38" rx="3" fill="#FFFFFF" />
        <rect x="26" y="20" width="41" height="22" fill="#D2D2D2" />
      </svg>
      <p className="mt-[26px] mb-0 text-[14.5px] font-medium text-[#AEAEAE]">
        No Tickets Found. Swipe down to refresh.
      </p>
    </div>
  );
}

export function MyBookingsScreen({ onBackToDashboard }: MyBookingsScreenProps) {
  const [tickets, setTickets] = useState<BookingTicket[]>(() => getCachedBookings());
  const [tab, setTab] = useState<BookingTab>('upcoming');
  const [view, setView] = useState<BookingView>('list');
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);

  // Create Ticket Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [fTag, setFTag] = useState<'Unreserved' | 'Reserved'>('Unreserved');
  const [fFrom, setFFrom] = useState('MGR CHENNAI CTL');
  const [fUts, setFUts] = useState('');
  const [fType, setFType] = useState('JOURNEY');
  const [fDate, setFDate] = useState(() => getTodayIso());
  const [fKm, setFKm] = useState('');
  const [fTo, setFTo] = useState('ARAKKONAM JN.');
  const [fErr, setFErr] = useState('');
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>(() =>
    getNotificationPermissionState()
  );
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);

  // Edit Booking Details text sheet state (double-tap on Completed ticket details)
  const [editingDetail, setEditingDetail] = useState<EditingDetailState | null>(null);
  const [editErr, setEditErr] = useState('');
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const detailTapsRef = useRef<Record<string, number[]>>({});

  const ticketsRef = useRef(tickets);
  ticketsRef.current = tickets;
  const viewRef = useRef(view);
  viewRef.current = view;
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const loaderTimerRef = useRef<number | null>(null);
  const utsTapsRef = useRef<Record<string, number[]>>({});
  const titleTapsRef = useRef<number[]>([]);

  const persistTickets = useCallback((nextTickets: BookingTicket[]) => {
    setTickets(nextTickets);
    ticketsRef.current = nextTickets;
    void saveBookingsToFirebase(nextTickets);
  }, []);

  const runSweep = useCallback(() => {
    const { tickets: swept, changed } = sweepExpiredBookings(ticketsRef.current);
    if (changed) {
      persistTickets(swept);
    }
  }, [persistTickets]);

  // Subscribe to Firebase RTDB live bookings updates
  useEffect(() => {
    const unsub = subscribeBookings((remoteTickets) => {
      setTickets(remoteTickets);
      ticketsRef.current = remoteTickets;
    });
    return () => {
      unsub();
    };
  }, []);

  // Sweep expired upcoming tickets every 15 seconds (3-hour validity)
  useEffect(() => {
    runSweep();
    const timer = window.setInterval(runSweep, 15000);
    return () => {
      window.clearInterval(timer);
    };
  }, [runSweep]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsInitialLoading(false);
    }, 950);
    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (loaderTimerRef.current !== null) {
        window.clearTimeout(loaderTimerRef.current);
      }
      if (fallbackTimerRef.current !== null) {
        window.clearTimeout(fallbackTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (editingDetail) {
      window.setTimeout(() => {
        const el = editInputRef.current;
        if (el) {
          el.focus();
          try {
            const len = el.value.length;
            el.setSelectionRange(len, len);
          } catch {
            // Ignore selection errors
          }
        }
      }, 30);
    }
  }, [editingDetail?.field]);

  const handleDetailTextTap = useCallback(
    (field: EditableDetailField, label: string, currentValue: string) => {
      const now = Date.now();
      const recent = (detailTapsRef.current[field] || []).filter((t) => now - t < 600);
      recent.push(now);
      detailTapsRef.current[field] = recent;

      if (recent.length >= 2) {
        detailTapsRef.current[field] = [];
        setEditErr('');
        setEditingDetail({ field, label, value: currentValue });
      }
    },
    []
  );

  const closeEditDetail = useCallback(() => {
    setEditingDetail(null);
    setEditErr('');
  }, []);

  const saveEditedDetail = useCallback(() => {
    if (!editingDetail || !detailKey) return;
    const trimmed = editingDetail.value.trim();
    if (!trimmed) {
      setEditErr('Please enter a value.');
      return;
    }

    const nextValue =
      editingDetail.field === 'id' ||
      editingDetail.field === 'from' ||
      editingDetail.field === 'to'
        ? trimmed.toUpperCase()
        : trimmed;

    const updated = ticketsRef.current.map((t) => {
      if ((t.uid || t.id) !== detailKey && t.id !== detailKey) return t;
      return {
        ...t,
        [editingDetail.field]: nextValue,
      };
    });

    persistTickets(updated);
    logDashboardAction('bookings:edit-detail', `${detailKey}:${editingDetail.field}`);
    setEditingDetail(null);
    setEditErr('');
  }, [detailKey, editingDetail, persistTickets]);

  const openSheet = useCallback(() => {
    setFTag('Unreserved');
    setFFrom('MGR CHENNAI CTL');
    setFUts('');
    setFType('JOURNEY');
    setFDate(getTodayIso());
    setFKm('');
    setFTo('ARAKKONAM JN.');
    setFErr('');
    setNotifPerm(getNotificationPermissionState());
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
  }, []);

  const handleActionComplete = useCallback(
    (name: string, data?: string | NewTicketInput) => {
      if (name.startsWith('tab-')) {
        setTab(name.slice(4) as BookingTab);
        setView('list');
        runSweep();
      } else if (name === 'view-details' && typeof data === 'string') {
        const target = ticketsRef.current.find((t) => (t.uid || t.id) === data || t.id === data);
        if (target) {
          setDetailKey(target.uid || target.id);
          setView('detail');
        }
      } else if (name === 'back') {
        if (viewRef.current === 'detail') {
          setView('list');
        } else {
          onBackToDashboard();
          return;
        }
      } else if (name === 'refresh') {
        runSweep();
      } else if (name === 'create-ticket' && data && typeof data === 'object') {
        const now = Date.now();
        const created: BookingTicket = {
          id: data.id,
          uid: `${data.id}-${now}`,
          tag: data.tag,
          type: data.type,
          dateLabel: data.dateLabel,
          from: data.from,
          to: data.to,
          km: data.km,
          status: 'upcoming',
          expiresAt: now + TICKET_VALIDITY_MS,
          booked: fmtStamp(now),
          via: 'MAS-MPK-MSF',
          refId: data.refId,
        };
        const nextList = [...ticketsRef.current, created];
        persistTickets(nextList);
        setTab('upcoming');
        setView('list');

        void sendTicketBookedNotification(data.refId, data.tag).then((dispatched) => {
          if (!dispatched) {
            if (fallbackTimerRef.current !== null) {
              window.clearTimeout(fallbackTimerRef.current);
            }
            setFallbackNotice(buildTicketNotificationBody(data.refId, data.tag));
            fallbackTimerRef.current = window.setTimeout(() => {
              setFallbackNotice(null);
              fallbackTimerRef.current = null;
            }, 8500);
          }
        });
      }

      logDashboardAction(
        `bookings:${name}`,
        typeof data === 'string' ? data : data && typeof data === 'object' ? data.id : undefined
      );
    },
    [onBackToDashboard, persistTickets, runSweep]
  );

  const act = useCallback(
    (name: string, data?: string | NewTicketInput) => {
      if (loaderTimerRef.current !== null) {
        window.clearTimeout(loaderTimerRef.current);
      }
      setShowLoader(true);
      loaderTimerRef.current = window.setTimeout(() => {
        setShowLoader(false);
        loaderTimerRef.current = null;
        handleActionComplete(name, data);
      }, 1200);
    },
    [handleActionComplete]
  );

  // Double-tap on "My Bookings" title while on Upcoming tab opens Create Ticket sheet
  const handleTitleTap = useCallback(() => {
    const now = Date.now();
    const recent = titleTapsRef.current.filter((x) => now - x < 600);
    recent.push(now);
    titleTapsRef.current = recent;
    if (recent.length >= 2) {
      titleTapsRef.current = [];
      if (viewRef.current === 'list' && tabRef.current === 'upcoming') {
        openSheet();
      }
    }
  }, [openSheet]);

  // Triple-tap on UTS: expires upcoming ticket -> completed; deletes completed ticket
  const handleUtsTap = useCallback(
    (ticketKey: string) => {
      const now = Date.now();
      const prev = (utsTapsRef.current[ticketKey] || []).filter((t) => now - t < 800);
      prev.push(now);
      utsTapsRef.current[ticketKey] = prev;

      if (prev.length >= 3) {
        utsTapsRef.current[ticketKey] = [];
        const current = ticketsRef.current;
        const target = current.find((t) => (t.uid || t.id) === ticketKey);
        if (!target) return;

        if (target.status === 'upcoming') {
          const updated = current.map((t) =>
            (t.uid || t.id) === ticketKey
              ? { ...t, status: 'completed' as const, expiresAt: null }
              : t
          );
          persistTickets(updated);
          logDashboardAction('bookings:expire-ticket', target.id);
        } else {
          const updated = current.filter((t) => (t.uid || t.id) !== ticketKey);
          persistTickets(updated);
          logDashboardAction('bookings:delete-ticket', target.id);
        }
      }
    },
    [persistTickets]
  );

  const submitTicket = useCallback(async () => {
    const from = fFrom.trim();
    const uts = fUts.trim().toUpperCase();
    const type = fType;
    const date = fDate;
    const km = Number(fKm);
    const to = fTo.trim();

    let err = '';
    if (!from) err = 'Enter the location.';
    else if (!uts) err = 'Enter the UTS number.';
    else if (!date) err = 'Select a booking date.';
    else if (!km || km <= 0) err = 'Enter the distance in km.';
    else if (!to) err = 'Enter where you will reach.';

    if (err) {
      setFErr(err);
      return;
    }

    // Request notification permission inside direct user gesture before loader timeout
    const permResult = await requestBookingNotificationPermission();
    setNotifPerm(permResult);

    const refId = generateTicketReferenceId();
    closeSheet();
    act('create-ticket', {
      id: uts,
      tag: fTag,
      type,
      dateLabel: fmtDate(date),
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      km,
      refId,
    });
  }, [act, closeSheet, fDate, fFrom, fKm, fTag, fTo, fType, fUts]);

  const inDetail = view === 'detail';
  const detailTicket = inDetail
    ? tickets.find((t) => (t.uid || t.id) === detailKey || t.id === detailKey) || null
    : null;
  const effectiveDetail = inDetail && detailTicket !== null;
  const isUpcomingDetail = effectiveDetail && detailTicket.status === 'upcoming';

  useTicketScreenBoost(effectiveDetail);

  const renderCompletedDetail = (t: BookingTicket) => {
    const statusLabel = t.statusText || 'Ticket Expired';
    const paxLabel = getDetailPaxDisplay(t);
    const fareLabel = t.fare || 'Fare : ₹20.00 | Class : SECOND';

    return (
      <div className="min-h-[calc(100dvh-62px)] bg-[#F5F5F5] pb-[28px]">
        <div className="px-[14px] pt-[16px]">
          <div className="railone-dcard relative overflow-hidden rounded-[18px] bg-[#C8EBF1] px-[18px] pt-[18px] pb-[20px] text-[#111827] shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
            <div className="mb-[14px] flex items-center justify-between gap-[8px]">
              <span
                onClick={() => handleDetailTextTap('type', 'Ticket Type', t.type)}
                className="cursor-pointer rounded-[8px] bg-white/80 px-[10px] py-[4px] text-[12px] font-bold tracking-[0.4px] text-[#0E5D70] select-none"
              >
                {t.type}
              </span>
              <span
                onClick={() => handleDetailTextTap('id', 'UTS Number', t.id)}
                className="cursor-pointer text-[13px] font-bold text-[#0F172A] select-none"
              >
                UTS: {t.id}
              </span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-[10px]">
              <div>
                <div className="text-[11px] font-semibold text-[#4B6B74]">From</div>
                <div
                  onClick={() => handleDetailTextTap('from', 'Source Station', t.from)}
                  className="mt-[2px] cursor-pointer text-[15px] leading-[19px] font-bold uppercase text-[#111827] select-none"
                >
                  {t.from}
                </div>
              </div>
              <div className="text-center text-[11px] font-semibold whitespace-nowrap text-[#3B5E68]">
                — {t.km} km —
              </div>
              <div className="text-right">
                <div className="text-[11px] font-semibold text-[#4B6B74]">To</div>
                <div
                  onClick={() => handleDetailTextTap('to', 'Destination Station', t.to)}
                  className="mt-[2px] cursor-pointer text-[15px] leading-[19px] font-bold uppercase text-[#111827] select-none"
                >
                  {t.to}
                </div>
              </div>
            </div>

            <div className="mt-[16px] flex items-center justify-between border-t border-dashed border-[#6AAAB8] pt-[12px] text-[12.5px] font-medium text-[#214550]">
              <span
                onClick={() => handleDetailTextTap('via', 'Via Route', t.via)}
                className="cursor-pointer select-none"
              >
                Via: {t.via}
              </span>
              <span
                onClick={() => handleDetailTextTap('booked', 'Booked On', t.booked)}
                className="cursor-pointer select-none"
              >
                {t.booked}
              </span>
            </div>
          </div>

          <div className="mt-[14px] rounded-[16px] border border-[#E5E7EB] bg-white px-[16px] py-[16px]">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-[12px]">
              <span className="text-[13px] font-medium text-[#6B7280]">Status</span>
              <span
                onClick={() => handleDetailTextTap('statusText', 'Ticket Status', statusLabel)}
                className="cursor-pointer rounded-full bg-[#FEE2E2] px-[10px] py-[3px] text-[12px] font-bold text-[#DC2626] select-none"
              >
                {statusLabel}
              </span>
            </div>

            <div
              onClick={() => handleDetailTextTap('pax', 'Passenger(s)', paxLabel)}
              className="cursor-pointer border-b border-[#F1F5F9] py-[12px] text-[14px] font-semibold text-[#1F2937] select-none"
            >
              {paxLabel}
            </div>

            <div
              onClick={() => handleDetailTextTap('fare', 'Fare & Class', fareLabel)}
              className="cursor-pointer pt-[12px] text-[14px] font-semibold text-[#1F2937] select-none"
            >
              {fareLabel}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const upcomingList = tickets.filter((t) => t.status === 'upcoming');
  const completedList = tickets.filter((t) => t.status === 'completed');

  const renderTicketCard = (t: BookingTicket, cat: TicketStatus) => {
    const ticketKey = t.uid || t.id;
    const cardToneClass =
      cat === 'upcoming' ? 'railone-mb-ticket-upcoming' : 'railone-mb-ticket-completed';

    return (
      <article
        key={ticketKey}
        className={`relative h-[204px] w-[326px] shrink-0 rounded-[16px] bg-[#F6F6F6] text-[#212121] ${cardToneClass}`}
      >
        <span className="absolute top-[7.5px] left-[10.5px] m-0 flex h-[27px] w-[94px] items-center justify-center rounded-[9px] bg-[#E9DAF1] text-[12px] font-semibold text-[#A87CB9]">
          {t.tag}
        </span>

        <span
          onClick={() => handleUtsTap(ticketKey)}
          className="absolute top-[12px] right-[11px] m-0 cursor-pointer text-[13px] leading-[18px] font-medium whitespace-nowrap text-[#7A7D86] select-none"
        >
          UTS: <b className="font-semibold text-[#212121]">{t.id}</b>
        </span>

        <span className="absolute top-[49px] left-[11px] m-0 text-[12px] leading-[16px] font-medium whitespace-nowrap text-[#AEAEAE]">
          Ticket Type
        </span>
        <span className="absolute top-[49px] right-[11.5px] m-0 text-right text-[12px] leading-[16px] font-medium whitespace-nowrap text-[#AEAEAE]">
          Booking Date
        </span>

        <span className="absolute top-[66px] left-[11px] m-0 text-[12.5px] leading-[18px] font-medium whitespace-nowrap text-[#212121]">
          {t.type}
        </span>
        <span className="absolute top-[66px] right-[11.5px] m-0 text-right text-[12.5px] leading-[18px] font-medium whitespace-nowrap text-[#212121]">
          {t.dateLabel}
        </span>

        <span className="absolute top-[95px] left-[11px] m-0 w-[114px] text-[12.5px] leading-[17px] font-semibold uppercase text-black [overflow-wrap:anywhere]">
          {t.from}
        </span>
        <span className="absolute top-[103px] left-1/2 m-0 -translate-x-1/2 text-[10px] leading-[14px] font-medium whitespace-nowrap text-[#ACADB1]">
          — {t.km} km —
        </span>
        <span className="absolute top-[95px] right-[11.5px] m-0 w-[114px] text-right text-[12.5px] leading-[17px] font-semibold uppercase text-black [overflow-wrap:anywhere]">
          {t.to}
        </span>

        <div className="railone-mb-divider absolute top-[146px] right-0 left-0 m-0 h-0" />

        <button
          type="button"
          onClick={() => act('book-again', t.id)}
          className="absolute top-[166px] left-[86.5px] m-0 -translate-x-1/2 cursor-pointer border-0 bg-transparent p-0 text-[17px] leading-[18px] font-medium whitespace-nowrap text-[#0A66FF]"
        >
          Book Again
        </button>

        <span className="absolute top-[167.5px] left-[162px] m-0 h-[15px] w-[1px] bg-[#B8BEC8]" />

        <button
          type="button"
          onClick={() => act('view-details', ticketKey)}
          className="absolute top-[166px] left-[239px] m-0 -translate-x-1/2 cursor-pointer border-0 bg-transparent p-0 text-[17px] leading-[18px] font-medium whitespace-nowrap text-[#0A66FF]"
        >
          View Details
        </button>
      </article>
    );
  };

  const renderSectionHead = (
    label: string,
    colorClass: string,
    isFirst: boolean,
    withRefresh: boolean
  ) => (
    <div
      className={`relative mb-[3.5px] flex h-[47px] items-center justify-center text-[15px] font-semibold ${colorClass} ${
        isFirst ? 'mt-0' : 'mt-[7.5px]'
      }`}
    >
      {label}
      {withRefresh && (
        <button
          type="button"
          aria-label="Refresh"
          onClick={() => act('refresh')}
          className="absolute top-1/2 right-[16px] flex h-[30px] w-[30px] -translate-y-1/2 cursor-pointer items-center justify-center border-0 bg-transparent p-0"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6B7280"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 11a8 8 0 0 0-14.5-4.6L4 8" />
            <path d="M4 4v4h4" />
            <path d="M4 13a8 8 0 0 0 14.5 4.6L20 16" />
            <path d="M20 20v-4h-4" />
          </svg>
        </button>
      )}
    </div>
  );

  const renderList = () => {
    if (tab === 'cancelled') return <EmptyState />;

    const showUp = tab === 'upcoming' || (tab === 'all' && upcomingList.length > 0);
    const showDone = tab === 'completed' || tab === 'all';

    return (
      <>
        {showUp && (
          <>
            {renderSectionHead(
              `Upcoming (${upcomingList.length})`,
              'text-[#FEA24D]',
              true,
              true
            )}
            {upcomingList.length > 0 ? (
              <div className="flex flex-col items-center gap-[16px]">
                {upcomingList.map((t) => renderTicketCard(t, 'upcoming'))}
              </div>
            ) : (
              <EmptyState />
            )}
          </>
        )}

        {showDone && (
          <>
            {renderSectionHead(
              `Completed (${completedList.length})`,
              'text-[#18A44E]',
              !showUp,
              !showUp
            )}
            {completedList.length > 0 ? (
              <div className="flex flex-col items-center gap-[16px]">
                {completedList.map((t) => renderTicketCard(t, 'completed'))}
              </div>
            ) : (
              <EmptyState />
            )}
          </>
        )}
      </>
    );
  };

  if (isUpcomingDetail && detailTicket) {
    return (
      <>
        <TicketDetailView
          ticket={detailTicket}
          userName={getCachedUserName()}
          onBack={() => act('back')}
          onUpdateTicket={(updated) => {
            const next = ticketsRef.current.map((t) =>
              (t.uid || t.id) === (updated.uid || updated.id) ? updated : t
            );
            persistTickets(next);
          }}
        />
        {showLoader && (
          <div
            aria-hidden="true"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(20,24,32,0.38)]"
          >
            <img
              src="/assets/dashboard/loader-ring.png"
              alt=""
              className="railone-loader-spin block h-[64px] w-[64px]"
            />
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-dvh w-full bg-white text-[#212121] sm:bg-[#E5E7EB]">
      <div className="railone-mb-shell relative mx-auto min-h-dvh w-full overflow-x-hidden bg-white sm:max-w-[430px]">
        {/* Header */}
        <header className="railone-mb-hdr sticky top-0 z-10 flex items-center gap-[23px] bg-[#0166FF] pr-[22px] pl-[15px] text-white">
          <button
            type="button"
            aria-label="Back"
            onClick={() => act('back')}
            className="flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-white bg-transparent p-0"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
          </button>

          <div className="min-w-0 flex-1">
            <h1
              onClick={handleTitleTap}
              className="m-0 text-[18.5px] leading-[24px] font-medium select-none"
            >
              {effectiveDetail ? 'Booking Details' : 'My Bookings'}
            </h1>
            {!effectiveDetail && tab !== 'upcoming' && (
              <p className="mt-[3px] mb-0 max-w-[210px] text-[14.5px] leading-[18px] font-normal">
                Tickets from last 45 days are displayed
              </p>
            )}
          </div>

          <button
            type="button"
            aria-label={effectiveDetail ? 'Receipt' : 'Sort'}
            onClick={() => act(effectiveDetail ? 'receipt' : 'sort')}
            className="flex h-[26px] w-[26px] shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0"
          >
            {effectiveDetail ? (
              <svg width="26" height="26" viewBox="0 0 24 24">
                <path
                  d="M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2z"
                  fill="#FFFFFF"
                />
                <rect x="8" y="7" width="8" height="2" fill="#0166FF" />
                <rect x="8" y="11" width="8" height="2" fill="#0166FF" />
                <rect x="8" y="15" width="8" height="2" fill="#0166FF" />
              </svg>
            ) : (
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 4v16M3 17l3 3 3-3" />
                <path d="M13 6h8M13 11h6M13 16h4" />
              </svg>
            )}
          </button>
        </header>

        {/* Body */}
        <main>
          {isInitialLoading ? (
            <MyBookingsShimmerSkeleton />
          ) : effectiveDetail && detailTicket ? (
            renderCompletedDetail(detailTicket)
          ) : (
            renderList()
          )}
        </main>
      </div>

      {/* Bottom tabs */}
      {!effectiveDetail && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full sm:max-w-[430px]">
          <nav
            aria-label="Booking categories"
            className="grid w-full grid-cols-[repeat(4,78px)] justify-center gap-[10px] rounded-t-[24px] border-t-2 border-[#D3D8E0] bg-[#F2F9FF] pt-[6px] pb-[10px]"
          >
            {TAB_ITEMS.map((item) => {
              const on = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => act(`tab-${item.key}`)}
                  className={`box-border flex h-[46px] cursor-pointer flex-col items-center justify-center gap-[2px] rounded-[12px] border-0 p-0 text-[12.5px] font-medium ${
                    on
                      ? `bg-[#F8FAF9] shadow-[0_1px_3px_rgba(0,0,0,0.08)] ${item.activeTextClass}`
                      : 'bg-[#E1F2FC] text-[#777D89]'
                  }`}
                >
                  <TicketTabIcon
                    fill={on ? item.color : '#EEF1F5'}
                    stroke={on ? '#1F2937' : '#7B8190'}
                  />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="railone-mb-safe-bottom w-full" aria-hidden="true" />
        </div>
      )}

      {/* Create Ticket Bottom Sheet */}
      {sheetOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) closeSheet();
          }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(15,23,42,0.45)]"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sheetTitle"
            className="max-h-[90dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[22px] bg-white px-[18px] pt-[18px] pb-[26px]"
          >
            <h2 id="sheetTitle" className="m-0 mb-[2px] text-[19px] font-bold text-[#10236B]">
              Create Ticket
            </h2>
            <p className="m-0 mb-[14px] text-[12.5px] text-[#6B7280]">
              Shows in Upcoming. Moves to Completed after 3 hours.
            </p>

            <div className="mb-[12px]">
              <label className="mb-[5px] block text-[12.5px] font-semibold text-[#4B5563]">
                Tag
              </label>
              <div className="flex items-center gap-[10px]" role="radiogroup" aria-label="Ticket tag">
                {(['Unreserved', 'Reserved'] as const).map((option) => {
                  const active = fTag === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setFTag(option)}
                      className={`cursor-pointer rounded-[10px] border-[1.5px] px-[14px] py-[8px] text-[13px] font-semibold transition-colors ${
                        active
                          ? 'border-[#A87CB9] bg-[#E9DAF1] text-[#8E5AA3]'
                          : 'border-[#D5DCE6] bg-[#F8FAFC] text-[#6B7280]'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-[12px]">
              <label
                htmlFor="fFrom"
                className="mb-[5px] block text-[12.5px] font-semibold text-[#4B5563]"
              >
                Location
              </label>
              <input
                id="fFrom"
                type="text"
                autoComplete="off"
                value={fFrom}
                onChange={(e) => setFFrom(e.target.value)}
                className="h-[44px] w-full rounded-[12px] border-[1.5px] border-[#D5DCE6] bg-white px-[12px] text-[14.5px] font-medium text-[#111827] focus:border-[#0166FF] focus:outline-none"
              />
            </div>

            <div className="mb-[12px]">
              <label
                htmlFor="fUts"
                className="mb-[5px] block text-[12.5px] font-semibold text-[#4B5563]"
              >
                UTS
              </label>
              <input
                id="fUts"
                type="text"
                placeholder="Enter UTS number"
                autoComplete="off"
                value={fUts}
                onChange={(e) => setFUts(e.target.value)}
                className="h-[44px] w-full rounded-[12px] border-[1.5px] border-[#D5DCE6] bg-white px-[12px] text-[14.5px] font-medium text-[#111827] focus:border-[#0166FF] focus:outline-none"
              />
            </div>

            <div className="mb-[12px]">
              <label
                htmlFor="fType"
                className="mb-[5px] block text-[12.5px] font-semibold text-[#4B5563]"
              >
                Ticket Type
              </label>
              <select
                id="fType"
                value={fType}
                onChange={(e) => setFType(e.target.value)}
                className="h-[44px] w-full rounded-[12px] border-[1.5px] border-[#D5DCE6] bg-white px-[12px] text-[14.5px] font-medium text-[#111827] focus:border-[#0166FF] focus:outline-none"
              >
                <option value="JOURNEY">JOURNEY</option>
              </select>
            </div>

            <div className="mb-[12px]">
              <label
                htmlFor="fDate"
                className="mb-[5px] block text-[12.5px] font-semibold text-[#4B5563]"
              >
                Booking Date
              </label>
              <input
                id="fDate"
                type="date"
                value={fDate}
                onChange={(e) => setFDate(e.target.value)}
                className="h-[44px] w-full rounded-[12px] border-[1.5px] border-[#D5DCE6] bg-white px-[12px] text-[14.5px] font-medium text-[#111827] focus:border-[#0166FF] focus:outline-none"
              />
            </div>

            <div className="mb-[12px]">
              <label
                htmlFor="fKm"
                className="mb-[5px] block text-[12.5px] font-semibold text-[#4B5563]"
              >
                Distance (km)
              </label>
              <input
                id="fKm"
                type="number"
                min="1"
                inputMode="numeric"
                placeholder="Enter kilometres"
                value={fKm}
                onChange={(e) => setFKm(e.target.value)}
                className="h-[44px] w-full rounded-[12px] border-[1.5px] border-[#D5DCE6] bg-white px-[12px] text-[14.5px] font-medium text-[#111827] focus:border-[#0166FF] focus:outline-none"
              />
            </div>

            <div className="mb-[12px]">
              <label
                htmlFor="fTo"
                className="mb-[5px] block text-[12.5px] font-semibold text-[#4B5563]"
              >
                Reach at
              </label>
              <input
                id="fTo"
                type="text"
                autoComplete="off"
                value={fTo}
                onChange={(e) => setFTo(e.target.value)}
                className="h-[44px] w-full rounded-[12px] border-[1.5px] border-[#D5DCE6] bg-white px-[12px] text-[14.5px] font-medium text-[#111827] focus:border-[#0166FF] focus:outline-none"
              />
            </div>

            {notifPerm === 'default' && (
              <button
                type="button"
                onClick={async () => {
                  const res = await requestBookingNotificationPermission();
                  setNotifPerm(res);
                }}
                className="mb-[10px] flex w-full cursor-pointer items-center justify-between rounded-[12px] border border-[#BFDBFE] bg-[#EFF6FF] px-[12px] py-[9px] text-left text-[12.5px] font-semibold text-[#1D4ED8]"
              >
                <span>Enable real phone booking alerts</span>
                <span className="rounded-full bg-[#0166FF] px-[10px] py-[3px] text-[11px] font-bold text-white">
                  Allow
                </span>
              </button>
            )}

            <p className="m-0 mb-[6px] min-h-[18px] text-[12.5px] text-[#DC2626]">{fErr}</p>

            <button
              type="button"
              onClick={submitTicket}
              className="mt-[4px] h-[50px] w-full cursor-pointer rounded-[14px] border-0 bg-[#0166FF] text-[16px] font-semibold text-white"
            >
              Create Ticket
            </button>

            <button
              type="button"
              onClick={closeSheet}
              className="mt-[6px] h-[44px] w-full cursor-pointer border-0 bg-transparent text-[14px] font-semibold text-[#6B7280]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Booking Detail Text Bottom Sheet */}
      {editingDetail && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditDetail();
          }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(15,23,42,0.45)]"
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="editDetailTitle"
            onSubmit={(e) => {
              e.preventDefault();
              saveEditedDetail();
            }}
            className="w-full rounded-t-[22px] bg-white px-[18px] pt-[18px] pb-[26px] sm:max-w-[430px]"
          >
            <h2
              id="editDetailTitle"
              className="m-0 mb-[14px] text-[18px] font-bold text-[#10236B]"
            >
              Edit {editingDetail.label}
            </h2>

            <div className="mb-[10px]">
              <label
                htmlFor="editDetailInput"
                className="mb-[5px] block text-[12.5px] font-semibold text-[#4B5563]"
              >
                {editingDetail.label}
              </label>
              <input
                ref={editInputRef}
                id="editDetailInput"
                type="text"
                autoComplete="off"
                value={editingDetail.value}
                onChange={(e) => {
                  setEditingDetail({ ...editingDetail, value: e.target.value });
                  if (editErr) setEditErr('');
                }}
                className="h-[46px] w-full rounded-[12px] border-[1.5px] border-[#D5DCE6] bg-white px-[12px] text-[15px] font-medium text-[#111827] focus:border-[#0166FF] focus:outline-none"
              />
            </div>

            <p className="m-0 mb-[6px] min-h-[18px] text-[12.5px] text-[#DC2626]">{editErr}</p>

            <button
              type="submit"
              className="mt-[4px] h-[50px] w-full cursor-pointer rounded-[14px] border-0 bg-[#0166FF] text-[16px] font-semibold text-white"
            >
              Save
            </button>

            <button
              type="button"
              onClick={closeEditDetail}
              className="mt-[6px] h-[44px] w-full cursor-pointer border-0 bg-transparent text-[14px] font-semibold text-[#6B7280]"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Fallback Android notification banner (shown if OS push notification is unavailable/denied) */}
      {fallbackNotice && (
        <RailOneNotificationBanner
          message={fallbackNotice}
          onDismiss={() => setFallbackNotice(null)}
          onOpen={() => {
            setTab('upcoming');
            setView('list');
          }}
        />
      )}

      {/* Loader overlay */}
      {showLoader && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(20,24,32,0.38)]"
        >
          <img
            src="/assets/dashboard/loader-ring.png"
            alt=""
            className="railone-loader-spin block h-[64px] w-[64px]"
          />
        </div>
      )}
    </div>
  );
}
