import { useCallback, useEffect, useRef, useState } from 'react';
import { logDashboardAction } from '../firebase';

interface UnreservedTicketScreenProps {
  onClose: () => void;
}

type TicketCategory = 'normal' | 'season';
type StationMode = 'outside' | 'at';

function InfoCircleIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 20 20"
      fill="none"
      className={`shrink-0 ${active ? 'text-white' : 'text-[#C2C4CA]'}`}
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="6.2" r="0.95" fill="currentColor" />
      <path d="M10 9v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function UnreservedTicketScreen({ onClose }: UnreservedTicketScreenProps) {
  const [ticketType, setTicketType] = useState<TicketCategory>('normal');
  const [stationMode, setStationMode] = useState<StationMode>('outside');
  const [fromStation, setFromStation] = useState('');
  const [toStation, setToStation] = useState('');
  const [showLoader, setShowLoader] = useState(false);
  const loaderTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (loaderTimerRef.current !== null) {
        window.clearTimeout(loaderTimerRef.current);
      }
    };
  }, []);

  const runAction = useCallback((action: string, meta?: string, afterLoader?: () => void) => {
    if (loaderTimerRef.current !== null) {
      window.clearTimeout(loaderTimerRef.current);
    }
    setShowLoader(true);
    loaderTimerRef.current = window.setTimeout(() => {
      setShowLoader(false);
      loaderTimerRef.current = null;
      afterLoader?.();
    }, 1200);

    logDashboardAction(action, meta);
  }, []);

  const handleSwapStations = useCallback(() => {
    setFromStation(toStation);
    setToStation(fromStation);
    logDashboardAction('unreserved:swap');
  }, [fromStation, toStation]);

  const handleProceed = useCallback(() => {
    const meta = `${ticketType}|${stationMode}|${fromStation.trim() || '-'}->${toStation.trim() || '-'}`;
    runAction('unreserved:proceed-to-book', meta);
  }, [fromStation, runAction, stationMode, ticketType, toStation]);

  const handleCheckTrains = useCallback(() => {
    const meta = `${fromStation.trim() || '-'}->${toStation.trim() || '-'}`;
    runAction('unreserved:check-upcoming-trains', meta);
  }, [fromStation, runAction, toStation]);

  const handleClose = useCallback(() => {
    runAction('unreserved:close', undefined, onClose);
  }, [onClose, runAction]);

  return (
    <div className="min-h-dvh w-full bg-[#F5F5F5] text-[#182140] sm:bg-[#E5E7EB]">
      <div className="railone-unreserved-shell relative mx-auto min-h-dvh w-full overflow-x-hidden bg-[#F5F5F5] sm:max-w-[430px]">
        {/* White Header */}
        <header className="railone-unreserved-hdr bg-white">
          <div className="relative flex h-[60px] items-center justify-center px-[16px]">
            <h1 className="m-0 text-center text-[19px] leading-[26px] font-bold whitespace-nowrap text-[#182140]">
              Unreserved E-Ticket
            </h1>

            <button
              type="button"
              aria-label="Close"
              onClick={handleClose}
              className="absolute right-[14px] flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full border-2 border-[#CFEAF7] bg-white p-0 active:scale-95"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 16 16"
                stroke="#0166FF"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M2 2l12 12M14 2L2 14" />
              </svg>
            </button>
          </div>
        </header>

        {/* Booking Card */}
        <main className="px-[11px] pt-[16.5px]">
          <section className="mx-auto w-full max-w-[356px] rounded-[26px] border border-[#E8EAEE] bg-white px-[16px] pt-[24px] pb-[32px]">
            {/* Normal / Season Segmented Control */}
            <div
              role="tablist"
              aria-label="Ticket category"
              className="flex h-[48px] w-full rounded-[14px] bg-[#EEEEEE] p-[3px]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={ticketType === 'normal'}
                onClick={() => setTicketType('normal')}
                className={`h-[42px] flex-1 cursor-pointer rounded-[12px] border-0 p-0 text-[13.5px] font-semibold transition-colors ${
                  ticketType === 'normal'
                    ? 'bg-white text-[#0166FF] shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                    : 'bg-transparent text-black'
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={ticketType === 'season'}
                onClick={() => setTicketType('season')}
                className={`h-[42px] flex-1 cursor-pointer rounded-[12px] border-0 p-0 text-[13.5px] font-semibold transition-colors ${
                  ticketType === 'season'
                    ? 'bg-white text-[#0166FF] shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                    : 'bg-transparent text-black'
                }`}
              >
                Season
              </button>
            </div>

            {/* Outside Station / At Station Selector */}
            <div className="mt-[21px] grid grid-cols-2 gap-[8px]" role="radiogroup" aria-label="Booking location">
              <button
                type="button"
                role="radio"
                aria-checked={stationMode === 'outside'}
                onClick={() => setStationMode('outside')}
                className={`flex h-[43px] cursor-pointer items-center justify-center gap-[6px] rounded-full border-[1.5px] px-[8px] text-[13px] whitespace-nowrap transition-colors ${
                  stationMode === 'outside'
                    ? 'border-[#0166FF] bg-[#0166FF] font-semibold text-white'
                    : 'border-[#D5D5D5] bg-white font-medium text-[#7C7D81]'
                }`}
              >
                <span>Outside Station</span>
                <InfoCircleIcon active={stationMode === 'outside'} />
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={stationMode === 'at'}
                onClick={() => setStationMode('at')}
                className={`flex h-[43px] cursor-pointer items-center justify-center gap-[8px] rounded-full border-[1.5px] px-[8px] text-[13px] whitespace-nowrap transition-colors ${
                  stationMode === 'at'
                    ? 'border-[#0166FF] bg-[#0166FF] font-semibold text-white'
                    : 'border-[#D5D5D5] bg-white font-medium text-[#7C7D81]'
                }`}
              >
                <span>At Station</span>
                <InfoCircleIcon active={stationMode === 'at'} />
              </button>
            </div>

            {/* From / To Inputs + Swap Button */}
            <div className="mt-[28px]">
              <label
                htmlFor="unreservedFromInput"
                className="m-0 block text-[14.5px] leading-[18px] font-semibold text-[#0B97E6]"
              >
                From
              </label>

              <div className="mt-[8px] flex h-[30px] items-center pr-[46px]">
                <img
                  src="/assets/unreserved/from-train.png"
                  alt=""
                  draggable={false}
                  className="railone-nodrag block h-[17.5px] w-[25px] shrink-0 mix-blend-multiply"
                />
                <input
                  id="unreservedFromInput"
                  type="text"
                  placeholder="Source"
                  autoComplete="off"
                  value={fromStation}
                  onChange={(e) => setFromStation(e.target.value)}
                  className="ml-[9px] h-[30px] min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] font-medium text-[#222222] placeholder:text-[#C5C7CC] focus:outline-none"
                />
              </div>

              <div className="relative mt-[6px] flex items-center">
                <div className="h-[1px] flex-1 bg-[#DCDCDC]" />
                <button
                  type="button"
                  aria-label="Swap source and destination"
                  onClick={handleSwapStations}
                  className="-my-[20px] ml-[6px] flex h-[41px] w-[41px] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-[#C0DAFF] p-0 transition-transform active:scale-95"
                >
                  <img
                    src="/assets/unreserved/swap.png"
                    alt=""
                    draggable={false}
                    className="railone-nodrag block h-[20px] w-[15.5px] mix-blend-multiply"
                  />
                </button>
              </div>

              <label
                htmlFor="unreservedToInput"
                className="mt-[8px] mb-0 block text-[14.5px] leading-[18px] font-semibold text-[#0B97E6]"
              >
                To
              </label>

              <div className="mt-[6px] flex h-[30px] items-center pr-[46px]">
                <img
                  src="/assets/unreserved/to-train.png"
                  alt=""
                  draggable={false}
                  className="railone-nodrag block h-[17px] w-[25px] shrink-0 mix-blend-multiply"
                />
                <input
                  id="unreservedToInput"
                  type="text"
                  placeholder="Destination"
                  autoComplete="off"
                  value={toStation}
                  onChange={(e) => setToStation(e.target.value)}
                  className="ml-[9px] h-[30px] min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] font-medium text-[#222222] placeholder:text-[#C5C7CC] focus:outline-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <button
              type="button"
              onClick={handleProceed}
              className="mt-[34px] h-[50px] w-full cursor-pointer rounded-full border-0 bg-[#0166FF] p-0 text-[16.5px] font-semibold text-white active:opacity-90"
            >
              Proceed To Book
            </button>

            <button
              type="button"
              onClick={handleCheckTrains}
              className="mt-[12px] h-[50px] w-full cursor-pointer rounded-full border-[1.5px] border-[#1962D1] bg-white p-0 text-[16.5px] font-semibold text-[#0065FF] active:bg-[#F2F7FF]"
            >
              Check Upcoming Trains
            </button>
          </section>
        </main>
      </div>

      {/* Bottom Android system navigation blue strip */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full sm:max-w-[430px]">
        <div className="railone-mb-safe-bottom w-full" aria-hidden="true" />
      </div>

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
