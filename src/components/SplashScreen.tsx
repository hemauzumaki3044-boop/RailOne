import { useEffect } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  useEffect(() => {
    const timer = window.setTimeout(onFinish, 2400);
    return () => window.clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className="railone-splash-root fixed inset-0 z-50 flex h-[100dvh] w-screen items-center justify-center overflow-hidden border-0 bg-white"
      role="status"
      aria-label="Loading RailOne"
    >
      <img
        src="/assets/splash-logo.png"
        alt="RailOne"
        draggable={false}
        className="railone-splash-logo h-auto w-[45vw] max-w-[180px] object-contain"
      />
    </div>
  );
}
