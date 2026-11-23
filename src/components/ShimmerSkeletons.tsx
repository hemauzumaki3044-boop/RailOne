const OFFERING_SKELETON_ITEMS = [
  { line1: 'w-[48px]', line2: 'w-[40px]' },
  { line1: 'w-[30px]', line2: 'w-[48px]' },
  { line1: 'w-[40px]', line2: 'w-[52px]' },
  { line1: 'w-[64px]', line2: 'w-[34px]' },
  { line1: 'w-[40px]', line2: 'w-[46px]' },
  { line1: 'w-[26px]', line2: 'w-[44px]' },
  { line1: 'w-[30px]', line2: 'w-[48px]' },
  { line1: 'w-[38px]', line2: 'w-[48px]' },
] as const;

export function DashboardShimmerSkeleton({ showUpcoming = true }: { showUpcoming?: boolean }) {
  return (
    <div aria-busy="true" aria-label="Loading dashboard" className="px-[16px] pt-[18px]">
      {/* Greeting line */}
      <div className="railone-shimmer h-[14px] w-[114px] rounded-full" />

      {/* Journey Planner section heading */}
      <div className="railone-shimmer mt-[24px] h-[16px] w-[148px] rounded-full" />

      {/* Journey Planner 3-card row */}
      <div className="mt-[16px] grid grid-cols-3 gap-[12px]">
        {[0, 1, 2].map((idx) => (
          <div key={idx} className="flex flex-col items-center">
            <div className="railone-shimmer h-[90px] w-full rounded-[18px]" />
            <div className="railone-shimmer mt-[10px] h-[12px] w-[66%] rounded-full" />
          </div>
        ))}
      </div>

      {/* More Offerings section heading */}
      <div className="railone-shimmer mt-[28px] h-[16px] w-[136px] rounded-full" />

      {/* More Offerings 4x2 grid */}
      <div className="mt-[20px] grid grid-cols-4 gap-x-[10px] gap-y-[26px]">
        {OFFERING_SKELETON_ITEMS.map((item, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <div className="railone-shimmer h-[62px] w-[62px] rounded-[14px]" />
            <div className={`railone-shimmer mt-[10px] h-[11px] rounded-full ${item.line1}`} />
            <div className={`railone-shimmer mt-[6px] h-[11px] rounded-full ${item.line2}`} />
          </div>
        ))}
      </div>

      {showUpcoming && (
        <>
          {/* Upcoming Journey section heading */}
          <div className="railone-shimmer mt-[28px] h-[16px] w-[140px] rounded-full" />

          {/* Upcoming Journey card placeholder */}
          <div className="railone-shimmer mx-auto mt-[14px] h-[117px] w-[268px] rounded-[20px]" />
        </>
      )}
    </div>
  );
}

export function MyBookingsShimmerSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading bookings" className="px-[19px] pt-[20px]">
      {/* Section title pill */}
      <div className="railone-shimmer h-[16px] w-[134px] rounded-full" />

      {/* Ticket card placeholders */}
      <div className="mt-[16px] flex flex-col items-center gap-[16px]">
        {[0, 1, 2].map((idx) => (
          <div
            key={idx}
            className="w-full max-w-[322px] rounded-[16px] border border-[#EBEBF3] bg-white p-[14px]"
          >
            <div className="flex items-center justify-between">
              <div className="railone-shimmer h-[16px] w-[86px] rounded-full" />
              <div className="railone-shimmer h-[14px] w-[96px] rounded-full" />
            </div>

            <div className="mt-[16px] flex items-center justify-between gap-[8px]">
              <div className="railone-shimmer h-[13px] w-[104px] rounded-full" />
              <div className="railone-shimmer h-[10px] w-[38px] rounded-full" />
              <div className="railone-shimmer h-[13px] w-[104px] rounded-full" />
            </div>

            <div className="my-[15px] h-[1px] w-full bg-[#EFEFF6]" />

            <div className="flex items-center justify-between">
              <div className="railone-shimmer h-[12px] w-[90px] rounded-full" />
              <div className="flex items-center gap-[8px]">
                <div className="railone-shimmer h-[24px] w-[74px] rounded-full" />
                <div className="railone-shimmer h-[24px] w-[82px] rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
