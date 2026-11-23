import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getCachedProfileComplete,
  getCachedWalletBalance,
  logDashboardAction,
  refreshYouWalletFromFirebase,
  subscribeYouProfile,
} from '../firebase';

interface YouScreenProps {
  userName: string;
  biometricEnabled: boolean;
  onUserNameChange?: (name: string) => void;
  onBiometricChange: (enabled: boolean) => void;
  onRemoteBiometricSync?: (enabled: boolean) => void;
  onNavigateHome: () => void;
  onNavigateBookings: () => void;
  onOpenMenu: () => void;
  menuOpen?: boolean;
}

function getProgressWidthClass(percent: number): string {
  if (percent >= 95) return 'w-full';
  if (percent >= 85) return 'w-11/12';
  if (percent >= 75) return 'w-3/4';
  if (percent >= 65) return 'w-2/3';
  if (percent >= 50) return 'w-1/2';
  if (percent >= 35) return 'w-1/3';
  if (percent >= 20) return 'w-1/4';
  if (percent > 0) return 'w-1/12';
  return 'w-0';
}

export function YouScreen({
  userName,
  biometricEnabled,
  onUserNameChange,
  onBiometricChange,
  onRemoteBiometricSync,
  onNavigateHome,
  onNavigateBookings,
  onOpenMenu,
  menuOpen = false,
}: YouScreenProps) {
  const [walletBalance, setWalletBalance] = useState<number>(() => getCachedWalletBalance());
  const [profileComplete, setProfileComplete] = useState<number>(() => getCachedProfileComplete());
  const [showLoader, setShowLoader] = useState(false);
  const loaderTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeYouProfile({
      onUserName: (remoteName) => {
        onUserNameChange?.(remoteName);
      },
      onBiometricEnabled: (remoteBio) => {
        onRemoteBiometricSync?.(remoteBio);
      },
      onWalletBalance: (remoteBalance) => {
        setWalletBalance(remoteBalance);
      },
      onProfileComplete: (remotePct) => {
        setProfileComplete(remotePct);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [onRemoteBiometricSync, onUserNameChange]);

  useEffect(() => {
    return () => {
      if (loaderTimerRef.current !== null) {
        window.clearTimeout(loaderTimerRef.current);
      }
    };
  }, []);

  const runAction = useCallback((action: string, afterLoader?: () => void) => {
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
  }, []);

  const handleRefreshWallet = useCallback(() => {
    runAction('refresh-wallet', () => {
      void refreshYouWalletFromFirebase().then((latestBalance) => {
        setWalletBalance(latestBalance);
      });
    });
  }, [runAction]);

  const handleToggleBiometric = useCallback(() => {
    const next = !biometricEnabled;
    onBiometricChange(next);
    logDashboardAction('biometric', String(next));
  }, [biometricEnabled, onBiometricChange]);

  return (
    <div className="min-h-dvh w-full bg-white text-black sm:bg-[#E5E7EB]">
      <div className="relative mx-auto min-h-dvh w-full overflow-x-hidden bg-white pb-[80px] sm:max-w-[430px]">
        {/* Top profile block */}
        <section className="railone-you-top rounded-b-[60px] bg-[#E2F9FF]">
          <div className="relative h-[368px]">
            <button
              type="button"
              aria-label="Back"
              onClick={() => runAction('back', onNavigateHome)}
              className="absolute top-[56.5px] left-[14.5px] m-0 h-[48px] w-[48px] cursor-pointer border-0 bg-transparent p-0"
            >
              <img
                src="/assets/you/back.png"
                alt=""
                draggable={false}
                className="railone-nodrag block h-[48px] w-[48px]"
              />
            </button>

            <img
              src="/assets/you/avatar.png"
              alt="Profile photo"
              draggable={false}
              className="railone-nodrag absolute top-[123.75px] left-1/2 block h-[80.5px] w-[80.5px] -translate-x-1/2"
            />

            <h1 className="absolute top-[212px] right-0 left-0 m-0 text-center text-[17px] leading-[24px] font-bold whitespace-nowrap text-black">
              {userName}
            </h1>

            <div className="absolute top-[236px] right-0 left-0 flex h-[22px] items-center justify-center text-[15px] font-medium whitespace-nowrap text-[#0166FF]">
              <button
                type="button"
                onClick={() => runAction('view-details')}
                className="m-0 flex cursor-pointer items-center border-0 bg-transparent p-0 text-inherit"
              >
                <img
                  src="/assets/you/eye.png"
                  alt=""
                  draggable={false}
                  className="railone-nodrag mr-[3px] block h-[12px] w-[16px]"
                />
                <span>View Details</span>
              </button>
              <span className="mx-[17px] font-normal text-[#8A8F98]">|</span>
              <button
                type="button"
                onClick={() => runAction('edit-details')}
                className="m-0 flex cursor-pointer items-center border-0 bg-transparent p-0 text-inherit"
              >
                <img
                  src="/assets/you/pencil.png"
                  alt=""
                  draggable={false}
                  className="railone-nodrag mr-[3px] block h-[14px] w-[13.5px]"
                />
                <span>Edit Details</span>
              </button>
            </div>

            {/* R-Wallet pill */}
            <div className="absolute top-[284px] left-1/2 h-[62px] w-[296px] max-w-[calc(100%-32px)] -translate-x-1/2 rounded-[31px] bg-white">
              <img
                src="/assets/you/wallet.png"
                alt=""
                draggable={false}
                className="railone-nodrag absolute top-[17.75px] left-[13px] block h-[26.5px] w-[30.5px]"
              />
              <div className="absolute top-[12px] left-[53px] text-[11.5px] leading-[16px] font-medium whitespace-nowrap text-black">
                R-Wallet
              </div>
              <div className="absolute top-[27px] left-[53px] text-[17px] leading-[20px] font-bold whitespace-nowrap text-[#015F47]">
                ₹ {walletBalance.toFixed(2)}
              </div>
              <button
                type="button"
                aria-label="Refresh wallet"
                onClick={handleRefreshWallet}
                className="absolute top-[19px] right-[87.5px] m-0 h-[24px] w-[18.5px] cursor-pointer border-0 bg-transparent p-0"
              >
                <img
                  src="/assets/you/wallet-refresh.png"
                  alt=""
                  draggable={false}
                  className="railone-nodrag block h-full w-full"
                />
              </button>
              <button
                type="button"
                onClick={() => runAction('add-wallet')}
                className="absolute top-[15.5px] right-[13.5px] m-0 flex h-[31px] w-[62px] cursor-pointer items-center justify-center rounded-[16px] border-0 bg-[#0166FF] p-0 text-[11px] font-semibold text-white"
              >
                Add
              </button>
            </div>
          </div>
        </section>

        {/* Profile Complete card */}
        <div className="relative mx-auto mt-[12px] h-[86px] w-[317px] max-w-[calc(100%-32px)] rounded-[16px] border-2 border-[#D7F1FB] bg-white">
          <p className="absolute top-[9px] left-[10px] m-0 text-[14.5px] leading-[18px] font-medium whitespace-nowrap text-black">
            Profile Complete
          </p>
          <div className="absolute top-[48px] left-[9.5px] h-[5px] w-[252px] max-w-[calc(100%-65px)] overflow-hidden rounded-[3px] bg-[#E5E7EB]">
            <div
              className={`h-full rounded-[3px] bg-[#3A8F3A] transition-all duration-300 ${getProgressWidthClass(profileComplete)}`}
            />
          </div>
          <p className="absolute top-[28px] right-[10px] m-0 text-right text-[16.5px] leading-[25px] font-bold whitespace-pre text-black">
            {profileComplete}%
          </p>
        </div>

        {/* Saved Passengers card */}
        <div className="relative mx-auto mt-[21.5px] h-[64px] w-[323px] max-w-[calc(100%-32px)] rounded-[20px] bg-[#FFF1E4]">
          <img
            src="/assets/you/passengers.png"
            alt=""
            draggable={false}
            className="railone-nodrag absolute top-[22px] left-[16.5px] block h-[20px] w-[31px]"
          />
          <p className="absolute top-[14px] left-[57px] m-0 text-[13px] leading-[16px] font-medium whitespace-nowrap text-[#1A1A1A]">
            Saved Passengers
          </p>
          <p className="absolute top-[33px] left-[57px] m-0 text-[11px] leading-[14px] font-normal whitespace-nowrap text-[#1A1A1A]">
            Add/Edit Passenger info
          </p>
          <button
            type="button"
            aria-label="Refresh passengers"
            onClick={() => runAction('refresh-passengers')}
            className="absolute top-[20px] right-[91.5px] m-0 h-[24px] w-[17px] cursor-pointer border-0 bg-transparent p-0"
          >
            <img
              src="/assets/you/passengers-refresh.png"
              alt=""
              draggable={false}
              className="railone-nodrag block h-full w-full"
            />
          </button>
          <button
            type="button"
            onClick={() => runAction('add-passenger')}
            className="absolute top-[8.5px] right-[15.5px] m-0 flex h-[47px] w-[62px] cursor-pointer items-center justify-center rounded-[24px] border-0 bg-[#FABD53] p-0 text-[11px] font-semibold text-[#8C5A01]"
          >
            Add
          </button>
        </div>

        {/* Menu Tiles */}
        <div className="mx-auto mt-[16px] w-[323px] max-w-[calc(100%-32px)]">
          {/* Row 1 */}
          <div className="grid grid-cols-3 items-start gap-[11px]">
            <button
              type="button"
              onClick={() => runAction('change-password')}
              className="m-0 flex h-[116px] w-full cursor-pointer flex-col items-center rounded-[16px] border-0 bg-[#E2F9FF] p-0 text-center text-[#0C234D]"
            >
              <img
                src="/assets/you/change-password.png"
                alt=""
                draggable={false}
                className="railone-nodrag mx-auto mt-[16px] block h-[31px] w-[30.5px]"
              />
              <p className="mt-[5px] mb-0 w-[60px] text-[12.5px] leading-[19px] font-semibold break-words">
                Change Password
              </p>
            </button>

            <button
              type="button"
              onClick={() => runAction('my-account')}
              className="m-0 flex h-[100px] w-full cursor-pointer flex-col items-center rounded-[16px] border-0 bg-[#E9FFE8] p-0 text-center text-[#0C234D]"
            >
              <img
                src="/assets/you/my-account.png"
                alt=""
                draggable={false}
                className="railone-nodrag mx-auto mt-[16px] block h-[29.5px] w-[31.5px]"
              />
              <p className="mt-[8px] mb-0 w-[60px] text-[12.5px] leading-[19px] font-semibold break-words">
                My Account
              </p>
            </button>

            <div className="flex h-[117px] w-full flex-col items-center rounded-[16px] bg-[#FFF6FB] text-center text-[#0C234D]">
              <button
                type="button"
                role="switch"
                aria-checked={biometricEnabled}
                aria-label="Biometric login"
                onClick={handleToggleBiometric}
                className={`relative mx-auto mt-[28.5px] block h-[21px] w-[51px] cursor-pointer rounded-[11px] border-[1.5px] bg-white p-0 transition-colors duration-200 ${
                  biometricEnabled ? 'border-[#0066FF]' : 'border-[#B9BEC6]'
                }`}
              >
                <span
                  className={`absolute top-1/2 left-[9px] -translate-y-1/2 text-[10.5px] leading-[12px] font-semibold text-[#0066FF] transition-opacity duration-200 ${
                    biometricEnabled ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  On
                </span>
                <span
                  className={`absolute top-[1px] right-[1px] h-[17.5px] w-[17.5px] rounded-full transition-transform duration-200 ease-in-out ${
                    biometricEnabled
                      ? 'translate-x-0 bg-[#0066FF]'
                      : '-translate-x-[27px] bg-[#B9BEC6]'
                  }`}
                />
              </button>
              <p className="mt-[10px] mb-0 w-[60px] text-[12.5px] leading-[19px] font-semibold break-words">
                Biometric
              </p>
            </div>
          </div>

          {/* Row 2 */}
          <div className="mt-[11.5px] grid grid-cols-3 items-start gap-[11px]">
            <button
              type="button"
              onClick={() => runAction('transfer-ticket')}
              className="m-0 flex h-[100.5px] w-full cursor-pointer flex-col items-center rounded-[16px] border-0 bg-[#F0F8FB] p-0 text-center text-[#0C234D]"
            >
              <img
                src="/assets/you/transfer-ticket.png"
                alt=""
                draggable={false}
                className="railone-nodrag mx-auto mt-[15.5px] block h-[25.5px] w-[31px]"
              />
              <p className="mt-[8px] mb-0 w-[60px] text-[12.5px] leading-[19px] font-semibold break-words">
                Transfer Ticket
              </p>
            </button>

            <button
              type="button"
              onClick={() => runAction('my-transactions')}
              className="m-0 flex h-[99.5px] w-full cursor-pointer flex-col items-center rounded-[16px] border-0 bg-[#FFF1E4] p-0 text-center text-[#0C234D]"
            >
              <img
                src="/assets/you/my-transactions.png"
                alt=""
                draggable={false}
                className="railone-nodrag mx-auto mt-[14px] block h-[31px] w-[27px]"
              />
              <p className="mt-[8px] mb-0 w-[60px] text-[12.5px] leading-[19px] font-semibold break-words">
                My Transaction
              </p>
            </button>

            <button
              type="button"
              onClick={() => runAction('link-aadhar')}
              className="m-0 flex h-[117.5px] w-full cursor-pointer flex-col items-center rounded-[16px] border-0 bg-[#F0F1EC] p-0 text-center text-[#0C234D]"
            >
              <img
                src="/assets/you/link-aadhar.png"
                alt=""
                draggable={false}
                className="railone-nodrag mx-auto mt-[14.5px] block h-[29.5px] w-[32px]"
              />
              <p className="mt-[9px] mb-0 w-[60px] text-[12.5px] leading-[19px] font-semibold break-words">
                Link Your Aadhar
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <nav
        aria-label="Primary navigation"
        className="railone-bottom-nav fixed bottom-0 left-1/2 z-20 grid h-[58px] w-full -translate-x-1/2 grid-cols-4 bg-[#0166FF] sm:max-w-[430px]"
      >
        <button
          type="button"
          onClick={() => runAction('nav-home', onNavigateHome)}
          className="flex cursor-pointer flex-col items-center justify-center gap-[2px] border-0 bg-transparent p-0 text-[11px] font-medium text-white/[0.78]"
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
          onClick={() => runAction('nav-bookings', onNavigateBookings)}
          className="flex cursor-pointer flex-col items-center justify-center gap-[2px] border-0 bg-transparent p-0 text-[11px] font-medium text-white/[0.78]"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-[22px] w-[22px]">
            <path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z" />
          </svg>
          My Bookings
        </button>

        <button
          type="button"
          onClick={() => runAction('nav-you')}
          className={`flex cursor-pointer flex-col items-center justify-center gap-[2px] border-0 bg-transparent p-0 text-[11px] font-medium ${
            menuOpen ? 'text-white/[0.78]' : 'text-white'
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
          onClick={() => {
            logDashboardAction('nav-menu');
            onOpenMenu();
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-[2px] border-0 bg-transparent p-0 text-[11px] font-medium ${
            menuOpen ? 'text-white' : 'text-white/[0.78]'
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
