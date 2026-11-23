import { useCallback, useEffect, useState } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { MpinLoginScreen } from './components/MpinLoginScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { MyBookingsScreen } from './components/MyBookingsScreen';
import { YouScreen } from './components/YouScreen';
import { MenuDrawer } from './components/MenuDrawer';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  getBiometricPreference,
  getCachedUserName,
  saveBiometricPreference,
  syncFirebaseUserProfile,
} from './firebase';

type ScreenState = 'splash' | 'mpin' | 'dashboard' | 'bookings' | 'you';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('splash');
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string>(() => getCachedUserName());
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(() => getBiometricPreference());

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
