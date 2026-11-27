import { useState } from 'react';

interface RailOneNotificationBannerProps {
  message: string;
  timestampLabel?: string;
  onDismiss: () => void;
  onOpen?: () => void;
}

export function RailOneNotificationBanner({
  message,
  timestampLabel = 'Now',
  onDismiss,
  onOpen,
}: RailOneNotificationBannerProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={() => {
        if (onOpen) {
          onOpen();
        }
        onDismiss();
      }}
      className="railone-notif-banner fixed top-[12px] left-1/2 z-[120] flex w-[calc(100%-24px)] max-w-[396px] cursor-pointer items-start gap-[14px] rounded-[22px] bg-[#5F6064]/95 px-[16px] py-[14px] text-white shadow-[0_10px_28px_rgba(0,0,0,0.34)] backdrop-blur-md select-none"
    >
      <img
        src="/pwa-192x192.png"
        alt="RailOne"
        className="mt-[2px] block h-[42px] w-[42px] shrink-0 rounded-[11px]"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-[8px]">
          <span className="text-[16px] leading-[20px] font-bold tracking-[0.1px] text-white">
            RailOne
          </span>
          <div className="flex items-center gap-[8px]">
            <span className="text-[13px] leading-[16px] font-medium text-white/80">
              {timestampLabel}
            </span>
            <button
              type="button"
              aria-label={expanded ? 'Collapse notification' : 'Expand notification'}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((prev) => !prev);
              }}
              className="flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-white/85"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>
        <p
          className={`mt-[4px] mb-0 text-[14px] leading-[19.5px] font-medium text-white/95 ${
            expanded ? '' : 'line-clamp-2'
          }`}
        >
          {message}
        </p>
      </div>
    </div>
  );
}
