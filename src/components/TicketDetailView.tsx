import { useCallback, useEffect, useRef, useState } from 'react';
import { logDashboardAction, type BookingTicket } from '../firebase';

declare global {
  interface Window {
    QRCode?: {
      new (
        el: HTMLElement,
        options: {
          text: string;
          width: number;
          height: number;
          colorDark?: string;
          colorLight?: string;
          correctLevel?: number;
        }
      ): unknown;
      CorrectLevel: {
        L: number;
        M: number;
        Q: number;
        H: number;
      };
    };
  }
}

interface TicketDetailViewProps {
  ticket: BookingTicket;
  userName: string;
  onBack: () => void;
  onUpdateTicket: (updated: BookingTicket) => void;
}

interface EditableFieldsState {
  mobile: string;
  user: string;
  dt: string;
  uts: string;
  qrlabel: string;
  qr: string;
  status: string;
  src: string;
  dst: string;
  dist: string;
  pax: string;
  ttype: string;
  traintype: string;
  tclass: string;
  fare: string;
  via: string;
  ir: string;
}

type EditableKey = keyof EditableFieldsState;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function OdometerDigit({ value }: { value: number }) {
  const [state, setState] = useState<{ curr: number; prev: number; tick: number }>({
    curr: value,
    prev: value,
    tick: 0,
  });

  useEffect(() => {
    setState((s) => {
      if (s.curr === value) return s;
      return {
        curr: value,
        prev: s.curr,
        tick: s.tick + 1,
      };
    });
  }, [value]);

  const isRolling = state.tick > 0 && state.curr !== state.prev;

  return (
    <div className="railone-odo-slot relative inline-block h-[46px] w-[26px] overflow-hidden">
      {isRolling ? (
        <div
          key={state.tick}
          className="railone-odo-track-anim absolute top-0 left-0 flex w-full flex-col"
        >
          <span className="block h-[46px] w-full text-center text-[41px] leading-[46px] font-extrabold text-[#F43F2A]">
            {state.curr}
          </span>
          <span className="block h-[46px] w-full text-center text-[41px] leading-[46px] font-extrabold text-[#F43F2A]">
            {state.prev}
          </span>
        </div>
      ) : (
        <span className="block h-[46px] w-full text-center text-[41px] leading-[46px] font-extrabold text-[#F43F2A]">
          {state.curr}
        </span>
      )}
    </div>
  );
}

function formatBookingDateTime(booked?: string): string {
  if (booked) {
    const match = booked.trim().match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    if (match) {
      const year = match[1];
      const monthIdx = Math.max(0, Math.min(11, Number(match[2]) - 1));
      const day = match[3];
      const hours = match[4];
      const mins = match[5];
      return `${day} ${MONTHS[monthIdx]} ${year}, ${hours}:${mins}`;
    }
  }
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${dd} ${MONTHS[now.getMonth()]} ${now.getFullYear()}, ${hh}:${mm}`;
}

function cleanFareValue(raw?: string): string {
  if (!raw) return '5.00';
  const stripped = raw.replace(/^₹\s*/g, '').trim();
  return stripped || '5.00';
}

function buildInitialFields(ticket: BookingTicket, fallbackUserName: string): EditableFieldsState {
  return {
    mobile: ticket.mobile || '6380621214',
    user: ticket.userName || fallbackUserName || 'HEMAKUMAR S',
    dt: ticket.bookingDtDisplay || formatBookingDateTime(ticket.booked),
    uts: ticket.utsCode || 'R21607',
    qrlabel: ticket.qrLabel || 'Journey Ticket',
    qr: ticket.id || 'XA3NEID052',
    status: ticket.statusText || 'ACTIVE',
    src: ticket.from || 'GUINDY',
    dst: ticket.to || 'INDRA NAGAR',
    dist: `${ticket.km || 13} km`,
    pax: ticket.pax || '1 Adult, 0 Child',
    ttype: ticket.type || 'JOURNEY',
    traintype: ticket.trainType || 'ORDINARY',
    tclass: ticket.ticketClass || 'SECOND',
    fare: cleanFareValue(ticket.fare),
    via: ticket.via || 'STM-VLCY',
    ir: ticket.irCode || 'IR:33AAAGM0289C1ZQ',
  };
}

interface EditableInlineFieldProps {
  value: string;
  onCommit: (nextValue: string) => void;
  className?: string;
  as?: 'span' | 'div';
}

function EditableInlineField({
  value,
  onCommit,
  className = '',
  as = 'span',
}: EditableInlineFieldProps) {
  const elRef = useRef<HTMLElement | null>(null);
  const [editing, setEditing] = useState(false);
  const lastTapRef = useRef<number>(0);
  const cancelledRef = useRef<boolean>(false);

  const startEditing = useCallback(() => {
    cancelledRef.current = false;
    setEditing(true);
    window.setTimeout(() => {
      const node = elRef.current;
      if (!node) return;
      node.focus();
      try {
        const range = document.createRange();
        range.selectNodeContents(node);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      } catch {
        // Ignore selection errors
      }
    }, 10);
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (editing) return;
      const now = Date.now();
      if (now - lastTapRef.current < 350) {
        e.preventDefault();
        lastTapRef.current = 0;
        startEditing();
      } else {
        lastTapRef.current = now;
      }
    },
    [editing, startEditing]
  );

  const handleDoubleClick = useCallback(() => {
    if (!editing) {
      startEditing();
    }
  }, [editing, startEditing]);

  const handleBlur = useCallback(() => {
    const node = elRef.current;
    setEditing(false);
    if (!node) return;
    if (cancelledRef.current) {
      node.textContent = value;
      cancelledRef.current = false;
      return;
    }
    const next = (node.textContent || '').replace(/\s+/g, ' ').trim();
    if (!next) {
      node.textContent = value;
      return;
    }
    if (next !== value) {
      onCommit(next);
    }
  }, [onCommit, value]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      elRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelledRef.current = true;
      elRef.current?.blur();
    }
  }, []);

  const combinedClass = `cursor-pointer rounded-[4px] transition-colors ${className} ${
    editing ? 'railone-td-editing-active' : ''
  }`;

  if (as === 'div') {
    return (
      <div
        ref={(node) => {
          elRef.current = node;
        }}
        contentEditable={editing}
        suppressContentEditableWarning
        onDoubleClick={handleDoubleClick}
        onTouchEnd={handleTouchEnd}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={combinedClass}
      >
        {value}
      </div>
    );
  }

  return (
    <span
      ref={(node) => {
        elRef.current = node;
      }}
      contentEditable={editing}
      suppressContentEditableWarning
      onDoubleClick={handleDoubleClick}
      onTouchEnd={handleTouchEnd}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={combinedClass}
    >
      {value}
    </span>
  );
}

function FallbackQrSvg({ seed }: { seed: string }) {
  const size = 65;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const cells: Array<{ x: number; y: number }> = [];
  const isFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (isFinder(r, c)) {
        const lr = r >= size - 7 ? r - (size - 7) : r;
        const lc = c >= size - 7 ? c - (size - 7) : c;
        const border = lr === 0 || lr === 6 || lc === 0 || lc === 6;
        const core = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
        if (border || core) cells.push({ x: c, y: r });
      } else if (
        (r === 7 && c <= 7) ||
        (c === 7 && r <= 7) ||
        (r === 7 && c >= size - 8) ||
        (c === size - 8 && r <= 7) ||
        (r === size - 8 && c <= 7) ||
        (c === 7 && r >= size - 8)
      ) {
        continue;
      } else {
        const mixed = Math.imul((r + 1) * 73856093 ^ (c + 1) * 19349663 ^ hash, 2654435761);
        if ((mixed >>> 30) & 1) cells.push({ x: c, y: r });
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="272"
      height="272"
      role="img"
      aria-label="Ticket QR code"
      className="block h-[272px] w-[272px] bg-white"
    >
      <rect width={size} height={size} fill="#FFFFFF" />
      {cells.map((cell) => (
        <rect
          key={`${cell.x}-${cell.y}`}
          x={cell.x}
          y={cell.y}
          width="1"
          height="1"
          fill="#000000"
        />
      ))}
    </svg>
  );
}

export function TicketDetailView({
  ticket,
  userName,
  onBack,
  onUpdateTicket,
}: TicketDetailViewProps) {
  const [fields, setFields] = useState<EditableFieldsState>(() =>
    buildInitialFields(ticket, userName)
  );
  const [bandAlt, setBandAlt] = useState<boolean>(() => ticket.bandColor === '#0A66FF');
  const [remaining, setRemaining] = useState<number>(300);
  const [rating, setRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [qrFallback, setQrFallback] = useState<boolean>(false);

  const qrContainerRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const bandTapRef = useRef<number>(0);

  useEffect(() => {
    setFields(buildInitialFields(ticket, userName));
    setBandAlt(ticket.bandColor === '#0A66FF');
  }, [ticket.uid, ticket.id, userName]);

  useEffect(() => {
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const prevColor = themeMeta?.getAttribute('content') || '#0166FF';
    themeMeta?.setAttribute('content', '#0A66FF');
    return () => {
      themeMeta?.setAttribute('content', prevColor);
    };
  }, []);

  useEffect(() => {
    setRemaining(300);
    const id = window.setInterval(() => {
      setRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, [ticket.uid, ticket.id]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMsg(null);
      toastTimerRef.current = null;
    }, 1500);
  }, []);

  // Dense UTS signed ticket payload to match the authentic high-density RailOne UTS QR pattern
  const qrPayload = `UTS|V2|CRIS|IR|TKT:${fields.qr}|UTS:${fields.uts}|REF:${ticket.refId || '6531230635074550'}|SRC:${fields.src}|DST:${fields.dst}|VIA:${fields.via}|DIST:${fields.dist}|PAX:${fields.pax}|TYPE:${fields.ttype}|TRAIN:${fields.traintype}|CLS:${fields.tclass}|FARE:${fields.fare}|DT:${fields.dt}|GST:${fields.ir}|MOB:${fields.mobile}|USR:${fields.user}|ZONE:SR|DIV:MAS|VALID:1HR|NONTRANSFERABLE|SIG:9F4A7C2E8B10D5E4A9C3F172B864D0E5A12F8C93E4B71D206A5C9E3B7F104D8A2C6E91B4F0A3D75E82C1B9F4A6D0E3C7B2F8A194D5E0C3A7F2B681E9D4C0A5F3B7`;

  useEffect(() => {
    const container = qrContainerRef.current;
    if (!container) return;

    if (typeof window !== 'undefined' && typeof window.QRCode === 'function') {
      container.innerHTML = '';
      try {
        new window.QRCode(container, {
          text: qrPayload,
          width: 272,
          height: 272,
          colorDark: '#000000',
          colorLight: '#FFFFFF',
          correctLevel: window.QRCode.CorrectLevel.H,
        });
        setQrFallback(false);
      } catch {
        setQrFallback(true);
      }
    } else {
      setQrFallback(true);
    }
  }, [qrPayload]);

  const commitField = useCallback(
    (key: EditableKey, rawValue: string) => {
      const nextValue =
        key === 'qr' || key === 'src' || key === 'dst' ? rawValue.toUpperCase() : rawValue;

      setFields((prev) => ({
        ...prev,
        [key]: nextValue,
      }));

      const updated: BookingTicket = { ...ticket };
      switch (key) {
        case 'mobile':
          updated.mobile = nextValue;
          break;
        case 'user':
          updated.userName = nextValue;
          break;
        case 'dt':
          updated.bookingDtDisplay = nextValue;
          break;
        case 'uts':
          updated.utsCode = nextValue;
          break;
        case 'qrlabel':
          updated.qrLabel = nextValue;
          break;
        case 'qr':
          updated.id = nextValue;
          break;
        case 'status':
          updated.statusText = nextValue;
          break;
        case 'src':
          updated.from = nextValue;
          break;
        case 'dst':
          updated.to = nextValue;
          break;
        case 'dist': {
          const parsedKm = parseInt(nextValue.replace(/[^\d]/g, ''), 10);
          if (Number.isFinite(parsedKm) && parsedKm > 0) {
            updated.km = parsedKm;
          }
          break;
        }
        case 'pax':
          updated.pax = nextValue;
          break;
        case 'ttype':
          updated.type = nextValue;
          break;
        case 'traintype':
          updated.trainType = nextValue;
          break;
        case 'tclass':
          updated.ticketClass = nextValue;
          break;
        case 'fare':
          updated.fare = cleanFareValue(nextValue);
          break;
        case 'via':
          updated.via = nextValue;
          break;
        case 'ir':
          updated.irCode = nextValue;
          break;
      }

      onUpdateTicket(updated);
      logDashboardAction('bookings:upcoming-detail-edit', `${ticket.id}:${key}`);
      showToast('Saved');
    },
    [onUpdateTicket, showToast, ticket]
  );

  const toggleBandColor = useCallback(() => {
    setBandAlt((prev) => {
      const next = !prev;
      const nextColor = next ? '#0A66FF' : '#47BAE9';
      onUpdateTicket({ ...ticket, bandColor: nextColor });
      return next;
    });
  }, [onUpdateTicket, ticket]);

  const handleBandTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const now = Date.now();
      if (now - bandTapRef.current < 350) {
        e.preventDefault();
        bandTapRef.current = 0;
        toggleBandColor();
      } else {
        bandTapRef.current = now;
      }
    },
    [toggleBandColor]
  );

  const handleSubmitFeedback = useCallback(() => {
    if (rating === 0) return;
    logDashboardAction('bookings:feedback-submit', `${ticket.id}:${rating}`);
    showToast('Thank you for your feedback');
  }, [rating, showToast, ticket.id]);

  const minsStr = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secsStr = String(remaining % 60).padStart(2, '0');
  const timerDigits = [
    Number(minsStr[0]),
    Number(minsStr[1]),
    Number(secsStr[0]),
    Number(secsStr[1]),
  ];

  const bandBgClass = bandAlt ? 'bg-[#0A66FF]' : 'bg-[#47BAE9]';

  return (
    <div className="railone-td-root min-h-dvh w-full bg-white text-[#22252A] sm:bg-[#E5E7EB]">
      <div className="mx-auto flex min-h-dvh w-full flex-col overflow-x-hidden bg-white sm:max-w-[412px]">
        {/* Sticky Blue Header (no phone icon, crisp 42px back circle) */}
        <header className="railone-td-header sticky top-0 z-50 flex items-center gap-[20px] bg-[#0A66FF] shadow-[0_2px_6px_rgba(10,102,255,0.22)]">
          <button
            type="button"
            aria-label="Back"
            onClick={onBack}
            className="flex h-[42px] w-[42px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/95 bg-transparent p-0"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-[18px] w-[18px] fill-none stroke-white stroke-[2]"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="min-w-0">
            <div className="text-[21px] leading-[1.2] font-semibold text-white">
              Booking Details
            </div>
            <div className="mt-[3px] text-[14.5px] font-normal text-white/95">
              Mobile:{' '}
              <EditableInlineField
                value={fields.mobile}
                onCommit={(val) => commitField('mobile', val)}
              />
            </div>
          </div>
        </header>

        {/* Top Ticket Card Wrapper (soft grey canvas around the white ticket card) */}
        <div className="bg-[#EEF1F5] pb-[12px]">
          {/* Greeting Banner */}
          <div className="mb-[12px] w-full overflow-hidden border-b border-[#E2E8F0] bg-[#F8FAFC] px-[10px] py-[12px] text-center text-[13px] font-medium whitespace-nowrap text-[#374151]">
            Thank You{' '}
            <EditableInlineField
              value={fields.user}
              onCommit={(val) => commitField('user', val)}
            />
            , Happy Journey !
          </div>

          {/* Ticket Card (pure white body) */}
          <main className="relative mx-[14px] overflow-hidden rounded-[14px] border border-[#E2E6EC] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
            {/* Top Color Band (double-tap/double-click toggles sky blue <-> royal blue) */}
            <div
              onDoubleClick={toggleBandColor}
              onTouchEnd={handleBandTouchEnd}
              className={`h-[12px] w-full cursor-pointer transition-colors ${bandBgClass}`}
            />

            {/* Black Security Box */}
            <section className="railone-td-sec-box relative flex h-[168px] w-full items-stretch justify-between overflow-hidden text-white">
              <div className="railone-td-strip-left relative flex w-[32px] shrink-0 items-center justify-center">
                <span className="railone-td-vertical-label text-[11px] font-bold tracking-[0.8px] text-[#9CA3AF]">
                  INDIAN RAILWAYS
                </span>
              </div>

              <div className="relative flex flex-1 flex-col items-center overflow-hidden px-[4px] pt-[9px] pb-0">
                <div className="w-full pl-[8px] text-[16.5px] leading-[1.25] font-bold whitespace-nowrap text-white">
                  Dynamic preview will close
                  <br />
                  in
                </div>

                {/* Rolling Number / Odometer Countdown Timer */}
                <div
                  className="my-[3px] flex h-[46px] items-center justify-center"
                  aria-label="Dynamic preview countdown"
                >
                  <OdometerDigit value={timerDigits[0]} />
                  <OdometerDigit value={timerDigits[1]} />

                  <span className="inline-block h-[46px] px-[2px] text-[38px] leading-[41px] font-extrabold text-[#F43F2A]">
                    :
                  </span>

                  <OdometerDigit value={timerDigits[2]} />
                  <OdometerDigit value={timerDigits[3]} />
                </div>

                <div className="mt-[2px] text-center text-[13px] font-medium text-[#A1A7B3]">
                  Ticket Booking Date &amp; Time
                </div>

                <EditableInlineField
                  as="div"
                  value={fields.dt}
                  onCommit={(val) => commitField('dt', val)}
                  className="mt-[3px] text-center text-[21px] leading-[1.15] font-bold tracking-[0.1px] whitespace-nowrap text-[#F59E2D]"
                />

                <EditableInlineField
                  as="div"
                  value={fields.uts}
                  onCommit={(val) => commitField('uts', val)}
                  className="absolute bottom-[-5.5px] left-1/2 -translate-x-1/2 px-[8px] pt-[4px] text-center text-[11.5px] leading-none font-bold tracking-[0.4px] whitespace-nowrap text-white/80"
                />
              </div>

              <div className="railone-td-strip-right relative flex w-[32px] shrink-0 items-center justify-center">
                <span className="railone-td-vertical-label text-[13.5px] font-bold tracking-[0.5px] text-[#9CA3AF]">
                  भारतीय रेल
                </span>
              </div>
            </section>

            {/* 300s Animated Progress Bar synced with 5-minute countdown */}
            <div className="h-[4px] w-full overflow-hidden bg-[#E2EEF5]">
              <div
                key={`${ticket.uid || ticket.id}-bar`}
                className={`railone-td-accent-fill transition-colors ${bandBgClass}`}
              />
            </div>

            {/* Ticket Details Body (pure white) */}
            <section className="bg-white px-[16px] pt-[14px] pb-[4px]">
              <div className="mb-[12px] flex items-start justify-between">
                <div className="text-left">
                  <EditableInlineField
                    as="div"
                    value={fields.qrlabel}
                    onCommit={(val) => commitField('qrlabel', val)}
                    className="text-[13.5px] leading-[1.25] font-medium text-[#7B818C]"
                  />
                  <EditableInlineField
                    as="div"
                    value={fields.qr}
                    onCommit={(val) => commitField('qr', val)}
                    className="mt-[2px] text-[16.5px] leading-[1.3] font-semibold tracking-[0.1px] text-[#22252A]"
                  />
                </div>

                <div className="text-right">
                  <div className="mt-[2px] inline-flex items-center gap-[6px] rounded-full bg-[#E6F7EC] px-[12px] py-[5px]">
                    <span className="h-[6px] w-[6px] rounded-full bg-[#2ECC71]" />
                    <EditableInlineField
                      value={fields.status}
                      onCommit={(val) => commitField('status', val)}
                      className="text-[12.5px] font-semibold tracking-[0.3px] text-[#38A169]"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-[12px] flex items-start justify-between">
                <div className="text-left">
                  <div className="text-[13.5px] leading-[1.25] font-medium text-[#7B818C]">
                    Source
                  </div>
                  <EditableInlineField
                    as="div"
                    value={fields.src}
                    onCommit={(val) => commitField('src', val)}
                    className="mt-[2px] text-[16.5px] leading-[1.3] font-semibold tracking-[0.1px] text-[#22252A]"
                  />
                </div>
                <div className="text-right">
                  <div className="text-[13.5px] leading-[1.25] font-medium text-[#7B818C]">
                    Destination
                  </div>
                  <EditableInlineField
                    as="div"
                    value={fields.dst}
                    onCommit={(val) => commitField('dst', val)}
                    className="mt-[2px] text-[16.5px] leading-[1.3] font-semibold tracking-[0.1px] text-[#22252A]"
                  />
                </div>
              </div>

              <div className="mb-[12px] flex items-start justify-between">
                <div className="text-left">
                  <div className="text-[13.5px] leading-[1.25] font-medium text-[#7B818C]">
                    Distance
                  </div>
                  <EditableInlineField
                    as="div"
                    value={fields.dist}
                    onCommit={(val) => commitField('dist', val)}
                    className="mt-[2px] text-[16.5px] leading-[1.3] font-semibold tracking-[0.1px] text-[#22252A]"
                  />
                </div>
                <div className="text-right">
                  <div className="text-[13.5px] leading-[1.25] font-medium text-[#7B818C]">
                    Passenger
                  </div>
                  <EditableInlineField
                    as="div"
                    value={fields.pax}
                    onCommit={(val) => commitField('pax', val)}
                    className="mt-[2px] text-[16.5px] leading-[1.3] font-semibold tracking-[0.1px] text-[#22252A]"
                  />
                </div>
              </div>

              <div className="mb-[12px] flex items-start justify-between">
                <div className="text-left">
                  <div className="text-[13.5px] leading-[1.25] font-medium text-[#7B818C]">
                    Ticket Type
                  </div>
                  <EditableInlineField
                    as="div"
                    value={fields.ttype}
                    onCommit={(val) => commitField('ttype', val)}
                    className="mt-[2px] text-[16.5px] leading-[1.3] font-semibold tracking-[0.1px] text-[#22252A]"
                  />
                </div>
                <div className="text-right">
                  <div className="text-[13.5px] leading-[1.25] font-medium text-[#7B818C]">
                    Train Types
                  </div>
                  <EditableInlineField
                    as="div"
                    value={fields.traintype}
                    onCommit={(val) => commitField('traintype', val)}
                    className="mt-[2px] text-[16.5px] leading-[1.3] font-semibold tracking-[0.1px] text-[#22252A]"
                  />
                </div>
              </div>

              <div className="mb-[12px] flex items-start justify-between">
                <div className="text-left">
                  <div className="text-[13.5px] leading-[1.25] font-medium text-[#7B818C]">
                    Class
                  </div>
                  <EditableInlineField
                    as="div"
                    value={fields.tclass}
                    onCommit={(val) => commitField('tclass', val)}
                    className="mt-[2px] text-[16.5px] leading-[1.3] font-semibold tracking-[0.1px] text-[#22252A]"
                  />
                </div>
                <div className="text-right">
                  <div className="text-[13.5px] leading-[1.25] font-medium text-[#7B818C]">
                    Fare
                  </div>
                  <div className="mt-[2px] text-[16.5px] leading-[1.3] font-semibold tracking-[0.1px] text-[#22252A]">
                    ₹
                    <EditableInlineField
                      value={fields.fare}
                      onCommit={(val) => commitField('fare', val)}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Via Pill & IR Code */}
            <section className="bg-white px-[16px] pt-[2px] pb-[4px]">
              <div className="mt-[2px] mb-[11px] flex w-full items-center gap-[8px] rounded-[7px] bg-[#EEF1F5] px-[12px] py-[8px]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-[14px] w-[14px] shrink-0 fill-none stroke-[#4B5563] stroke-[1.9]"
                >
                  <circle cx="6" cy="6" r="2.2" />
                  <circle cx="18" cy="18" r="2.2" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.5 6h4a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-1"
                  />
                </svg>
                <span className="text-[14px] font-medium text-[#374151]">
                  Via:{' '}
                  <EditableInlineField
                    value={fields.via}
                    onCommit={(val) => commitField('via', val)}
                  />
                </span>
              </div>

              <EditableInlineField
                as="div"
                value={fields.ir}
                onCommit={(val) => commitField('ir', val)}
                className="mb-[2px] text-[11px] font-medium text-[#4B5563]"
              />
            </section>

            {/* Perforated Seam */}
            <div className="relative flex h-[22px] items-center bg-white">
              <div className="absolute top-1/2 left-[-11px] z-[5] h-[20px] w-[20px] -translate-y-1/2 rounded-full border border-[#E2E6EC] bg-[#EEF1F5]" />
              <div className="h-[1px] w-full bg-[#E2E6EC]" />
              <div className="absolute top-1/2 right-[-11px] z-[5] h-[20px] w-[20px] -translate-y-1/2 rounded-full border border-[#E2E6EC] bg-[#EEF1F5]" />
            </div>

            {/* Validity Footer */}
            <section className="bg-white px-[16px] pt-[2px] pb-[13px]">
              <div className="text-[12.5px] leading-[1.45] text-[#374151]">
                *Valid for start of journey within 1 hour or until departure of the first train.
              </div>
            </section>

            {/* Bottom Color Band */}
            <div
              onDoubleClick={toggleBandColor}
              onTouchEnd={handleBandTouchEnd}
              className={`h-[12px] w-full cursor-pointer transition-colors ${bandBgClass}`}
            />
          </main>
        </div>

        {/* White Section: Warning Note Box + Book Connecting Journey Button */}
        <section className="bg-white px-[14px] pt-[14px] pb-[18px]">
          <div className="rounded-[12px] bg-[#FCECEE] px-[14px] py-[13px] text-center text-[13.8px] leading-[1.48] font-medium text-[#C92A3E]">
            Note: This ticket is non refundable. Ticket is stored locally on the device. Please do
            not change your handset or perform factory reset.
          </div>

          <button
            type="button"
            onClick={() => {
              logDashboardAction('bookings:book-connecting', ticket.id);
              showToast('Connecting journey selected');
            }}
            className="mt-[14px] w-full cursor-pointer rounded-full border-[1.3px] border-[#0A66FF] bg-white px-[16px] py-[13px] text-[16px] font-semibold text-[#0A66FF] active:bg-[#0A66FF]/5"
          >
            Book Connecting Journey
          </button>
        </section>

        {/* Thick Section Divider */}
        <div className="h-[11px] w-full bg-[#ECEFF3]" aria-hidden="true" />

        {/* White Section: High-Density QR Code */}
        <section className="flex w-full items-center justify-center bg-white py-[24px]">
          <div className="railone-td-qr-box flex h-[272px] w-[272px] items-center justify-center bg-white">
            <div
              ref={qrContainerRef}
              className={
                qrFallback ? 'hidden' : 'flex h-[272px] w-[272px] items-center justify-center'
              }
            />
            {qrFallback && <FallbackQrSvg seed={qrPayload} />}
          </div>
        </section>

        {/* Thick Section Divider */}
        <div className="h-[11px] w-full bg-[#ECEFF3]" aria-hidden="true" />

        {/* White Section: Do you know? */}
        <section className="bg-white px-[18px] pt-[20px] pb-[22px] text-[#374151]">
          <div className="mb-[14px] text-[18px] font-bold text-[#22252A]">Do you know?</div>
          <p className="mb-[18px] text-[15px] leading-[1.55] text-[#374151]">
            IR recovers only 57% of cost of travel on an average.
          </p>
          <p className="mb-[18px] text-[15px] leading-[1.55] text-[#374151]">
            This ticket is booked on a personal user ID. It&apos;s sale/purchase is an offence u/s
            143 of the
            <br />
            Railways Act, 1989
          </p>
          <p className="mb-0 text-[15px] leading-[1.55] text-[#374151]">
            For enquiry and integrated railway helpline.
            <br />
            please dial 139.
          </p>
        </section>

        {/* Thick Section Divider */}
        <div className="h-[11px] w-full bg-[#ECEFF3]" aria-hidden="true" />

        {/* White Section: Booking Experience Feedback */}
        <section className="bg-white px-[18px] pt-[20px] pb-[34px]">
          <div className="mb-[18px] text-[17.5px] leading-[1.4] font-semibold text-[#22252A]">
            How was your ticket booking experience ?
          </div>
          <div className="mb-[12px] text-[16.5px] font-medium text-[#22252A]">Your Rating</div>

          <div className="mb-[22px] flex items-center gap-[16px]">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= rating;
              return (
                <button
                  key={star}
                  type="button"
                  aria-label={`${star} star`}
                  onClick={() => setRating(star)}
                  className="inline-flex cursor-pointer items-center justify-center border-0 bg-transparent p-0"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-[32px] w-[32px] stroke-[1.4] transition-colors duration-150 ${
                      active
                        ? 'fill-[#F59E0B] stroke-[#F59E0B]'
                        : 'fill-transparent stroke-[#7B818C]'
                    }`}
                  >
                    <path
                      strokeLinejoin="miter"
                      d="M12 2.5l2.85 6.05 6.65.8-4.9 4.55 1.3 6.6L12 17.25 6.1 20.5l1.3-6.6-4.9-4.55 6.65-.8z"
                    />
                  </svg>
                </button>
              );
            })}
          </div>

          <div className="relative mb-[22px] w-full">
            <textarea
              maxLength={200}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Description"
              className="h-[132px] w-full resize-none rounded-[6px] border border-[#8E95A0] bg-white px-[14px] pt-[12px] pb-[28px] text-[15px] text-[#22252A] outline-none placeholder:text-[#5B6270] focus:border-[#0A66FF]"
            />
            <span className="absolute right-[12px] bottom-[9px] text-[13px] font-medium text-[#5B6270]">
              {feedbackText.length}/200
            </span>
          </div>

          <button
            type="button"
            onClick={handleSubmitFeedback}
            className={`w-full cursor-pointer rounded-full border-0 px-[16px] py-[14px] text-[17px] font-semibold transition-colors duration-200 ${
              rating > 0 ? 'bg-[#0A66FF] text-white' : 'bg-[#BFC2C7] text-[#5B6270]'
            }`}
          >
            Submit
          </button>
        </section>
      </div>

      {/* Save / Feedback Toast */}
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed bottom-[20px] left-1/2 z-[999] -translate-x-1/2 rounded-full bg-[#111827] px-[16px] py-[8px] text-[12px] text-white transition-all duration-250 ${
          toastMsg ? 'translate-y-0 opacity-100' : 'translate-y-[80px] opacity-0'
        }`}
      >
        {toastMsg || 'Saved'}
      </div>
    </div>
  );
}
