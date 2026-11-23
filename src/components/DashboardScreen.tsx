import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getCachedBookings,
  getCachedDashboardFacts,
  getDashboardStatusLabel,
  logDashboardAction,
  saveBookingsToFirebase,
  subscribeDashboardData,
  sweepExpiredBookings,
  type BookingTicket,
  type DashboardFact,
} from '../firebase';
import { DashboardShimmerSkeleton } from './ShimmerSkeletons';

interface DashboardScreenProps {
  userName: string;
  onUserNameChange?: (name: string) => void;
  onOpenBookings: () => void;
  onOpenYou: () => void;
  onOpenMenu: () => void;
  menuOpen?: boolean;
}

type NavTab = 'nav-home' | 'nav-bookings' | 'nav-you' | 'nav-menu';

const MORE_OFFERINGS_HITS = [
  {
    action: 'search-trains',
    positionClass: 'left-[0%] top-[2.9%] w-[18.45%] h-[34.42%]',
  },
  {
    action: 'pnr-status',
    positionClass: 'left-[25.62%] top-[2.9%] w-[19.33%] h-[34.42%]',
  },
  {
    action: 'coach-position',
    positionClass: 'left-[52.12%] top-[2.9%] w-[19.33%] h-[34.42%]',
  },
  {
    action: 'track-train',
    positionClass: 'left-[78.77%] top-[2.9%] w-[19.33%] h-[34.42%]',
  },
  {
    action: 'order-food',
    positionClass: 'left-[0%] top-[53.08%] w-[18.45%] h-[34.96%]',
  },
  {
    action: 'file-refund',
    positionClass: 'left-[25.62%] top-[53.08%] w-[19.33%] h-[34.96%]',
  },
  {
    action: 'rail-madad',
    positionClass: 'left-[52.12%] top-[53.08%] w-[19.33%] h-[34.96%]',
  },
  {
    action: 'go-to-waves',
    positionClass: 'left-[78.77%] top-[53.08%] w-[19.33%] h-[34.96%]',
  },
] as const;

export function DashboardScreen({
  userName,
  onUserNameChange,
  onOpenBookings,
  onOpenYou,
  onOpenMenu,
  menuOpen = false,
}: DashboardScreenProps) {
  const [bookings, setBookings] = useState<BookingTicket[]>(() => getCachedBookings());
  const [facts, setFacts] = useState<DashboardFact[]>(() => getCachedDashboardFacts());
  const [activeNav, setActiveNav] = useState<NavTab>('nav-home');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const loaderTimerRef = useRef<number | null>(null);
  const bookingsRef = useRef(bookings);
  bookingsRef.current = bookings;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsInitialLoading(false);
    }, 950);
    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeDashboardData({
      onUserName: (remoteName) => {
        onUserNameChange?.(remoteName);
      },
      onBookings: (remoteBookings) => {
        setBookings(remoteBookings);
        bookingsRef.current = remoteBookings;
      },
      onFacts: (remoteFacts) => {
        setFacts(remoteFacts);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [onUserNameChange]);

  // Keep Dashboard Upcoming Journey synced with 3-hour auto-expiry rule
  useEffect(() => {
    const sweep = () => {
      const { tickets: swept, changed } = sweepExpiredBookings(bookingsRef.current);
      if (changed) {
        setBookings(swept);
        bookingsRef.current = swept;
        void saveBookingsToFirebase(swept);
      }
    };
    sweep();
    const timer = window.setInterval(sweep, 15000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (loaderTimerRef.current !== null) {
        window.clearTimeout(loaderTimerRef.current);
      }
    };
  }, []);

  const runAction = useCallback(
    (action: string, afterLoader?: () => void) => {
      if (loaderTimerRef.current !== null) {
        window.clearTimeout(loaderTimerRef.current);
      }
      setShowLoader(true);
      loaderTimerRef.current = window.setTimeout(() => {
        setShowLoader(false);
        loaderTimerRef.current = null;
        afterLoader?.();
      }, 1200);

      logDashboardAction(action);
    },
    []
  );

  const handleNavClick = useCallback(
    (tab: NavTab) => {
      if (tab === 'nav-menu') {
        logDashboardAction(tab);
        onOpenMenu();
        return;
      }
      setActiveNav(tab);
      if (tab === 'nav-bookings') {
        runAction(tab, onOpenBookings);
      } else if (tab === 'nav-you') {
        runAction(tab, onOpenYou);
      } else {
        runAction(tab);
      }
    },
    [onOpenBookings, onOpenMenu, onOpenYou, runAction]
  );

  const displayedNav: NavTab = menuOpen ? 'nav-menu' : activeNav;

  // Show newest upcoming ticket(s) first so newly created tickets appear immediately
  const upcomingTickets = [...bookings.filter((t) => t.status === 'upcoming')].reverse();

  const renderDashboardTicket = (ticket: BookingTicket) => {
    const ticketKey = ticket.uid || ticket.id;
    return (
      <div
        key={ticketKey}
        role="group"
        aria-label={`Upcoming journey ${ticket.from} to ${ticket.to}`}
        className="railone-ticket relative box-border h-[117px] w-[268px] shrink-0 snap-center rounded-[20px] text-white"
      >
        <p className="absolute top-[21px] left-[10px] m-0 text-[13px] leading-[18px] font-medium whitespace-nowrap">
          {ticket.dateLabel}
        </p>
        <div className="absolute top-[46px] right-[10px] left-[10px] h-[1px] bg-white/50" />
        <span className="absolute top-[54px] left-[10px] max-w-[122px] truncate text-[11.5px] leading-[16px] font-medium whitespace-nowrap">
          {ticket.from}
        </span>
        <span className="absolute top-[54px] right-[10px] max-w-[122px] truncate text-right text-[11.5px] leading-[16px] font-medium whitespace-nowrap">
          {ticket.to}
        </span>
        <div className="absolute top-[77px] right-[10px] left-[10px] h-[1px] bg-white/50" />
        <span className="absolute top-[85px] left-[10px] h-[18px] text-[12px] leading-[18px] font-bold whitespace-nowrap text-[#CAFBCC]">
          {getDashboardStatusLabel(ticket.tag)}
        </span>
        <button
          type="button"
          onClick={() => runAction('book-again')}
          className="absolute top-[85px] left-[87px] box-border h-[18px] w-[73px] cursor-pointer rounded-full border border-white bg-[#7759A7] p-0 text-center text-[10px] leading-[16px] font-semibold whitespace-nowrap text-white"
        >
          Book Again
        </button>
        <button
          type="button"
          onClick={() => runAction('view-details', onOpenBookings)}
          className="absolute top-[85px] left-[169px] box-border h-[18px] w-[89px] cursor-pointer rounded-full border border-white bg-[#7E5EAD] p-0 text-center text-[10px] leading-[16px] font-semibold whitespace-nowrap text-white"
        >
          View Details
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-dvh w-full bg-white text-[#10236B] sm:bg-[#E5E7EB]">
      <div className="railone-dash-shell relative mx-auto min-h-dvh w-full overflow-x-hidden bg-white pb-[96px] sm:max-w-[430px]">
        {/* Header */}
        <header className="flex h-[64px] items-center justify-between px-[18px]">
          <button
            type="button"
            aria-label="Change language"
            onClick={() => runAction('language')}
            className="flex h-[42px] w-[42px] cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-[#1E6BFF]"
          >
            <img
              src="/assets/dashboard/lang-icon.png"
              alt="Language"
              draggable={false}
              className="block h-[42px] w-[42px] object-contain mix-blend-multiply"
            />
          </button>

          <img
            src="/assets/dashboard/logo.png"
            alt="RailOne"
            draggable={false}
            className="railone-nodrag block h-auto w-[122px] mix-blend-multiply"
          />

          <button
            type="button"
            aria-label="Notifications"
            onClick={() => runAction('notifications')}
            className="flex h-[42px] w-[42px] cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-[#1E6BFF]"
          >
            <img
              src="/assets/dashboard/notif-icon.png"
              alt="Notifications"
              draggable={false}
              className="block h-[42px] w-[42px] object-contain mix-blend-multiply"
            />
          </button>
        </header>

        {isInitialLoading ? (
          <DashboardShimmerSkeleton showUpcoming={upcomingTickets.length > 0} />
        ) : (
          <>
            <p className="mx-[16px] mt-[22px] mb-0 text-[13px] font-semibold text-[#10236B]">
              Hi, {userName}!
            </p>

        {/* Journey Planner */}
        <section className="mt-[22px] px-[16px]">
          <h2 className="mt-0 mb-[12px] text-[18px] leading-[24px] font-bold text-[#10236B]">
            Journey Planner
          </h2>
          <div className="grid grid-cols-3 gap-[8px]">
            <button
              type="button"
              onClick={() => runAction('reserved')}
              className="block cursor-pointer border-0 bg-transparent p-0 text-center"
            >
              <span className="block h-[84px] w-full overflow-hidden rounded-[12px] bg-[#F3F4F6]">
                <img
                  src="/assets/dashboard/planner-reserved.jpg"
                  alt="Reserved train"
                  className="block h-full w-full object-cover"
                />
              </span>
              <span className="mt-[6px] block text-[14px] font-semibold text-[#10236B]">
                Reserved
              </span>
            </button>

            <button
              type="button"
              onClick={() => runAction('unreserved')}
              className="block cursor-pointer border-0 bg-transparent p-0 text-center"
            >
              <span className="block h-[84px] w-full overflow-hidden rounded-[12px] bg-[#F3F4F6]">
                <img
                  src="/assets/dashboard/planner-unreserved.jpg"
                  alt="Unreserved train"
                  className="block h-full w-full object-cover"
                />
              </span>
              <span className="mt-[6px] block text-[14px] font-semibold text-[#10236B]">
                Unreserved
              </span>
            </button>

            <button
              type="button"
              onClick={() => runAction('platform')}
              className="block cursor-pointer border-0 bg-transparent p-0 text-center"
            >
              <span className="block h-[84px] w-full overflow-hidden rounded-[12px] bg-[#F3F4F6]">
                <img
                  src="/assets/dashboard/planner-platform.jpg"
                  alt="Platform"
                  className="block h-full w-full object-cover"
                />
              </span>
              <span className="mt-[6px] block text-[14px] font-semibold text-[#10236B]">
                Platform
              </span>
            </button>
          </div>
        </section>

        {/* More Offerings */}
        <section className="mt-[22px] px-[16px]">
          <h2 className="mt-0 mb-[12px] text-[18px] leading-[24px] font-bold text-[#10236B]">
            More Offerings
          </h2>
          <div className="relative w-full">
            <img
              src="/assets/dashboard/more-offerings.jpg"
              alt="More offerings"
              draggable={false}
              className="railone-nodrag block h-auto w-full select-none"
            />
            {MORE_OFFERINGS_HITS.map((item) => (
              <button
                key={item.action}
                type="button"
                aria-label={item.action}
                onClick={() => runAction(item.action)}
                className={`absolute m-0 cursor-pointer rounded-[14px] border-0 bg-transparent p-0 active:bg-[#1E6BFF]/[0.08] ${item.positionClass}`}
              />
            ))}
          </div>
        </section>

        {/* Upcoming Journey — shown only when at least one upcoming ticket exists */}
        {upcomingTickets.length > 0 && (
          <section className="mt-[22px] px-[16px]">
            <h2 className="mt-0 mb-[12px] text-[18px] leading-[24px] font-bold text-[#10236B]">
              Upcoming Journey
            </h2>
            {upcomingTickets.length === 1 ? (
              <div className="flex justify-center">
                {renderDashboardTicket(upcomingTickets[0])}
              </div>
            ) : (
              <div className="railone-carousel -mx-[16px] flex snap-x snap-mandatory gap-[12px] overflow-x-auto px-[16px] pb-[4px]">
                {upcomingTickets.map((ticket) => renderDashboardTicket(ticket))}
              </div>
            )}
          </section>
        )}

        {/* Do You Know */}
        <section className="mt-[22px] px-[16px]">
          <h2 className="mt-0 mb-[12px] text-[18px] leading-[24px] font-bold text-[#10236B]">
            Do You know?
          </h2>
          <div className="railone-carousel -mx-[16px] flex snap-x snap-mandatory gap-[12px] overflow-x-auto px-[16px] pb-[4px]">
            {facts.map((fact) => (
              <div key={fact.id} className="w-[144px] flex-none snap-start">
                <img
                  src={fact.image}
                  alt={fact.alt}
                  className="block h-[122px] w-[144px] rounded-[14px] object-cover"
                />
                <p className="mt-[8px] mb-0 text-[12.5px] leading-[17px] font-medium text-[#10236B]">
                  {fact.text}
                </p>
              </div>
            ))}
          </div>
        </section>

            {/* Social */}
            <section className="mt-[22px] px-[16px]">
              <h2 className="mt-0 mb-[12px] text-[18px] leading-[24px] font-bold text-[#10236B]">
                Follow Us On Social Media Platforms
              </h2>
              <img
                src="/assets/dashboard/social-banner.jpg"
                alt="Follow us on social media"
                className="block h-auto w-full rounded-[14px] object-cover"
              />
            </section>
          </>
        )}
      </div>

      {/* Bottom navigation */}
      <nav
        aria-label="Primary navigation"
        className="railone-bottom-nav fixed bottom-0 left-1/2 z-50 grid h-[64px] w-full -translate-x-1/2 grid-cols-4 bg-[#0A66FF] sm:max-w-[430px]"
      >
        <button
          type="button"
          onClick={() => handleNavClick('nav-home')}
          className={`flex cursor-pointer flex-col items-center justify-center gap-[3px] border-0 bg-transparent p-0 text-[11px] font-semibold ${
            displayedNav === 'nav-home' ? 'text-white' : 'text-white/[0.72]'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
            className="h-[22px] w-[22px]"
          >
            <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H10v6H4a1 1 0 0 1-1-1z" />
          </svg>
          Home
        </button>

        <button
          type="button"
          onClick={() => handleNavClick('nav-bookings')}
          className={`flex cursor-pointer flex-col items-center justify-center gap-[3px] border-0 bg-transparent p-0 text-[11px] font-semibold ${
            displayedNav === 'nav-bookings' ? 'text-white' : 'text-white/[0.72]'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-[22px] w-[22px]">
            <path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z" />
          </svg>
          My Bookings
        </button>

        <button
          type="button"
          onClick={() => handleNavClick('nav-you')}
          className={`flex cursor-pointer flex-col items-center justify-center gap-[3px] border-0 bg-transparent p-0 text-[11px] font-semibold ${
            displayedNav === 'nav-you' ? 'text-white' : 'text-white/[0.72]'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="h-[22px] w-[22px]"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
          </svg>
          You
        </button>

        <button
          type="button"
          onClick={() => handleNavClick('nav-menu')}
          className={`flex cursor-pointer flex-col items-center justify-center gap-[3px] border-0 bg-transparent p-0 text-[11px] font-semibold ${
            displayedNav === 'nav-menu' ? 'text-white' : 'text-white/[0.72]'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="h-[22px] w-[22px]"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          Menu
        </button>
      </nav>

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
