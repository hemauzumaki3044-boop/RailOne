import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getCachedWalletBalance,
  logDashboardAction,
  subscribeYouProfile,
} from '../firebase';

interface MenuDrawerProps {
  isOpen: boolean;
  userName: string;
  onUserNameChange?: (name: string) => void;
  onClose: () => void;
  onLogout: () => void;
}

const MENU_ROWS = [
  {
    action: 'show',
    label: 'Show/Hide Services',
    icon: '/assets/menu/show.png',
    iconSizeClass: 'h-[20px] w-[17px]',
    labelLeftClass: 'left-[43.5px]',
  },
  {
    action: 'faq',
    label: 'FAQs',
    icon: '/assets/menu/faq.png',
    iconSizeClass: 'h-[18.5px] w-[18.5px]',
    labelLeftClass: 'left-[48.5px]',
  },
  {
    action: 'help',
    label: 'Help & Support',
    icon: '/assets/menu/help.png',
    iconSizeClass: 'h-[17px] w-[18.5px]',
    labelLeftClass: 'left-[48.5px]',
  },
  {
    action: 'reserved',
    label: 'Reserved Services - Counter',
    icon: '/assets/menu/reserved.png',
    iconSizeClass: 'h-[15.5px] w-[18.5px]',
    labelLeftClass: 'left-[48.5px]',
  },
  {
    action: 'about',
    label: 'About',
    icon: '/assets/menu/about.png',
    iconSizeClass: 'h-[18.5px] w-[18.5px]',
    labelLeftClass: 'left-[48.5px]',
  },
  {
    action: 'rate',
    label: 'Rate Us',
    icon: '/assets/menu/rate.png',
    iconSizeClass: 'h-[18.5px] w-[20.5px]',
    labelLeftClass: 'left-[48.5px]',
  },
  {
    action: 'share',
    label: 'Share',
    icon: '/assets/menu/share.png',
    iconSizeClass: 'h-[18.5px] w-[17px]',
    labelLeftClass: 'left-[48.5px]',
  },
] as const;

export function MenuDrawer({
  isOpen,
  userName,
  onUserNameChange,
  onClose,
  onLogout,
}: MenuDrawerProps) {
  const [walletBalance, setWalletBalance] = useState<number>(() => getCachedWalletBalance());
  const [showLoader, setShowLoader] = useState(false);
  const loaderTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeYouProfile({
      onUserName: (remoteName) => {
        onUserNameChange?.(remoteName);
      },
      onWalletBalance: (remoteBalance) => {
        setWalletBalance(remoteBalance);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [onUserNameChange]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      if (loaderTimerRef.current !== null) {
        window.clearTimeout(loaderTimerRef.current);
      }
    };
  }, []);

  const runAction = useCallback(
    (action: string) => {
      if (loaderTimerRef.current !== null) {
        window.clearTimeout(loaderTimerRef.current);
      }
      setShowLoader(true);
      loaderTimerRef.current = window.setTimeout(() => {
        setShowLoader(false);
        loaderTimerRef.current = null;
        if (action === 'log-out') {
          onClose();
          onLogout();
        }
      }, 1200);

      logDashboardAction(action);
    },
    [onClose, onLogout]
  );

  return (
    <>
      <div
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 left-1/2 z-[60] w-full -translate-x-1/2 overflow-hidden sm:max-w-[430px] ${
          isOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        {/* Backdrop overlay */}
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-[rgba(20,24,32,0.42)] transition-opacity duration-[280ms] ease-in-out ${
            isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
          }`}
        />

        {/* Slide-in right drawer */}
        <aside
          role="dialog"
          aria-modal={isOpen}
          aria-label="Menu"
          className={`railone-carousel absolute top-0 right-0 bottom-0 w-[313.5px] max-w-[87vw] overflow-x-hidden overflow-y-auto rounded-r-[20px] bg-white transition-transform duration-[280ms] ease-in-out ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Top lavender profile block */}
          <div className="railone-menu-top bg-[#EFEEFE]">
            <div className="relative h-[214px]">
              <img
                src="/assets/menu/avatar.png"
                alt="Profile photo"
                draggable={false}
                className="railone-nodrag absolute top-[72.5px] left-1/2 block h-[81px] w-[81px] -translate-x-1/2"
              />
              <h2 className="absolute top-[171px] right-0 left-0 m-0 text-center text-[17px] leading-[22px] font-bold whitespace-nowrap text-black">
                {userName}
              </h2>
            </div>
          </div>

          {/* R-Wallet pill */}
          <div className="relative mt-[31px] h-[74px] w-full rounded-l-[37px] bg-[#EFEEFE]">
            <img
              src="/assets/menu/wallet.png"
              alt=""
              draggable={false}
              className="railone-nodrag absolute top-[24px] left-[11px] block h-[26.5px] w-[30.5px]"
            />
            <p className="absolute top-[17px] left-[52px] m-0 text-[12.5px] leading-[16px] font-medium whitespace-nowrap text-black">
              R-Wallet
            </p>
            <p className="absolute top-[31px] left-[52px] m-0 text-[17px] leading-[20px] font-bold whitespace-nowrap text-black">
              ₹ {walletBalance.toFixed(2)}
            </p>
            <button
              type="button"
              onClick={() => runAction('add-money')}
              className="absolute top-[14px] right-[11.5px] m-0 h-[47px] w-[104px] cursor-pointer rounded-[24px] border-0 bg-[#0166FF] p-0 text-[14.5px] font-semibold text-white"
            >
              Add Money
            </button>
          </div>

          {/* Menu list */}
          <div className="w-full">
            {MENU_ROWS.map((item) => (
              <button
                key={item.action}
                type="button"
                onClick={() => runAction(item.action)}
                className="relative m-0 block h-[42px] w-full cursor-pointer border-0 bg-transparent p-0 text-left active:bg-[#EFEEFE]/60"
              >
                <img
                  src={item.icon}
                  alt=""
                  draggable={false}
                  className={`railone-nodrag absolute top-1/2 left-[15.5px] block -translate-y-1/2 ${item.iconSizeClass}`}
                />
                <span
                  className={`absolute top-1/2 -translate-y-1/2 text-[15px] font-medium whitespace-nowrap text-black ${item.labelLeftClass}`}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="mx-[15.5px] mt-[48px] h-[1px] bg-[#C9C9E5]" />

          {/* Log Out */}
          <button
            type="button"
            onClick={() => runAction('log-out')}
            className="relative mt-[6px] mb-0 block h-[40px] w-full cursor-pointer border-0 bg-transparent p-0 text-left active:bg-[#EFEEFE]/60"
          >
            <img
              src="/assets/menu/logout.png"
              alt=""
              draggable={false}
              className="railone-nodrag absolute top-1/2 left-[15.5px] block h-[23.5px] w-[21.5px] -translate-y-1/2"
            />
            <span className="absolute top-1/2 left-[48.5px] -translate-y-1/2 text-[14.5px] font-medium whitespace-nowrap text-black">
              Log Out
            </span>
          </button>

          {/* App version */}
          <p className="mt-[8px] mb-0 pb-[calc(24px+env(safe-area-inset-bottom,0px))] text-center text-[13px] leading-[16px] text-[#9D9D9D]">
            V-2.1.82-256
          </p>
        </aside>

        {isOpen && (
          <div
            aria-hidden="true"
            className="railone-mb-safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-[65] mx-auto w-full sm:max-w-[430px]"
          />
        )}
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
    </>
  );
}
