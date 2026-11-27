import { useCallback, useEffect, useState } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { MpinLoginScreen } from './components/MpinLoginScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { MyBookingsScreen } from './components/MyBookingsScreen';
import { UnreservedTicketScreen } from './components/UnreservedTicketScreen';
import { YouScreen } from './components/YouScreen';
import { MenuDrawer } from './components/MenuDrawer';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { RailOneNotificationBanner } from './components/RailOneNotificationBanner';
import {
  getBiometricPreference,
  getCachedUserName,
  saveBiometricPreference,
  syncFirebaseUserProfile,
} from './firebase';

type ScreenState = 'splash' | 'mpin' | 'dashboard' | 'bookings' | 'unreserved' | 'you';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('splash');
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string>(() => getCachedUserName());
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(() => getBiometricPreference());
  const [globalNotice, setGlobalNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void syncFirebaseUserProfile().then((profile) => {
      if (!active) return;
      setUserName(profile.userName);
      setBiometricEnabled(profile.biometricEnabled);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'RAILONE_OPEN_BOOKINGS') {
        setMenuOpen(false);
        setScreen('bookings');
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    };
  }, []);

  useEffect(() => {
    if (!globalNotice) return;
    const timer = window.setTimeout(() => setGlobalNotice(null), 8500);
    return () => window.clearTimeout(timer);
  }, [globalNotice]);

  useEffect(() => {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      const color = menuOpen
        ? '#EFEEFE'
        : screen === 'bookings'
          ? '#0166FF'
          : screen === 'you'
            ? '#E2F9FF'
            : screen === 'mpin'
              ? '#E7F5FA'
              : '#FFFFFF';
      themeColorMeta.setAttribute('content', color);
    }

    const useBlueNavBar =
      screen === 'dashboard' ||
      screen === 'bookings' ||
      screen === 'unreserved' ||
      screen === 'you';
    document.documentElement.classList.toggle('railone-nav-blue', useBlueNavBar);
    document.body.classList.toggle('railone-nav-blue', useBlueNavBar);
  }, [menuOpen, screen]);

  const handleSplashFinish = useCallback(() => {
    setScreen('mpin');
  }, []);

  const handleBiometricChange = useCallback((enabled: boolean) => {
    setBiometricEnabled(enabled);
    void saveBiometricPreference(enabled);
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setMenuOpen(false);
    setScreen('dashboard');
  }, []);

  const handleOpenBookings = useCallback(() => {
    setMenuOpen(false);
    setScreen('bookings');
  }, []);

  const handleOpenUnreserved = useCallback(() => {
    setMenuOpen(false);
    setScreen('unreserved');
  }, []);

  const handleOpenYou = useCallback(() => {
    setMenuOpen(false);
    setScreen('you');
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setMenuOpen(false);
    setScreen('dashboard');
  }, []);

  const handleOpenMenu = useCallback(() => {
    setMenuOpen(true);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const handleLogout = useCallback(() => {
    setMenuOpen(false);
    setScreen('mpin');
  }, []);

  if (screen === 'splash') {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (screen === 'bookings') {
    return (
      <>
        <OfflineIndicator />
        <MyBookingsScreen onBackToDashboard={handleBackToDashboard} />
        {globalNotice && (
          <RailOneNotificationBanner
            message={globalNotice}
            onDismiss={() => setGlobalNotice(null)}
          />
        )}
      </>
    );
  }

  if (screen === 'unreserved') {
    return (
      <>
        <OfflineIndicator />
        <UnreservedTicketScreen
          onClose={handleBackToDashboard}
          onTicketBooked={(fallbackMsg) => {
            if (fallbackMsg) setGlobalNotice(fallbackMsg);
            setScreen('bookings');
          }}
        />
      </>
    );
  }

  if (screen === 'you') {
    return (
      <>
        <OfflineIndicator />
        <YouScreen
          userName={userName}
          biometricEnabled={biometricEnabled}
          onUserNameChange={setUserName}
          onBiometricChange={handleBiometricChange}
          onRemoteBiometricSync={setBiometricEnabled}
          onNavigateHome={handleBackToDashboard}
          onNavigateBookings={handleOpenBookings}
          onOpenMenu={handleOpenMenu}
          menuOpen={menuOpen}
        />
        <MenuDrawer
          isOpen={menuOpen}
          userName={userName}
          onUserNameChange={setUserName}
          onClose={handleCloseMenu}
          onLogout={handleLogout}
        />
      </>
    );
  }

  if (screen === 'dashboard') {
    return (
      <>
        <OfflineIndicator />
        <DashboardScreen
          userName={userName}
          onUserNameChange={setUserName}
          onOpenBookings={handleOpenBookings}
          onOpenUnreserved={handleOpenUnreserved}
          onOpenYou={handleOpenYou}
          onOpenMenu={handleOpenMenu}
          menuOpen={menuOpen}
        />
        <MenuDrawer
          isOpen={menuOpen}
          userName={userName}
          onUserNameChange={setUserName}
          onClose={handleCloseMenu}
          onLogout={handleLogout}
        />
      </>
    );
  }

  return (
    <>
      <PWAInstallButton />
      <OfflineIndicator />
      <MpinLoginScreen
        userName={userName}
        biometricEnabled={biometricEnabled}
        onBiometricChange={handleBiometricChange}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
}
