import { useEffect } from 'react';

interface NativeBrightnessWindow extends Window {
  Android?: {
    setScreenBrightness?: (value: number) => void;
    resetScreenBrightness?: () => void;
  };
  Capacitor?: {
    Plugins?: {
      ScreenBrightness?: {
        getBrightness?: () => Promise<{ brightness: number }>;
        setBrightness?: (opts: { brightness: number }) => Promise<void>;
      };
    };
  };
  cordova?: {
    plugins?: {
      brightness?: {
        getBrightness?: (success: (val: number) => void, error?: () => void) => void;
        setBrightness?: (val: number) => void;
      };
    };
  };
}

/**
 * Keeps the screen awake (preventing auto-dim/sleep) while viewing a ticket,
 * and boosts hardware brightness to 100% if running inside a native Android/Capacitor/Cordova wrapper.
 * Automatically restores normal brightness and releases Wake Lock when leaving the details page.
 */
export function useTicketScreenBoost(active: boolean): void {
  useEffect(() => {
    if (!active || typeof window === 'undefined') return;

    let cancelled = false;
    let wakeLock: WakeLockSentinel | null = null;
    let previousNativeBrightness: number | null = null;
    const win = window as NativeBrightnessWindow;

    const acquireWakeLock = async () => {
      if (!navigator.wakeLock || typeof navigator.wakeLock.request !== 'function') return;
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        if (cancelled) {
          void sentinel.release().catch(() => {});
        } else {
          wakeLock = sentinel;
        }
      } catch {
        // Ignore Wake Lock permission/battery-saver rejections
      }
    };

    const boostNativeBrightness = async () => {
      try {
        if (win.Android?.setScreenBrightness) {
          win.Android.setScreenBrightness(1.0);
          return;
        }

        const capPlugin = win.Capacitor?.Plugins?.ScreenBrightness;
        if (capPlugin?.setBrightness) {
          if (capPlugin.getBrightness) {
            const current = await capPlugin.getBrightness();
            if (typeof current?.brightness === 'number') {
              previousNativeBrightness = current.brightness;
            }
          }
          await capPlugin.setBrightness({ brightness: 1.0 });
          return;
        }

        const cordovaPlugin = win.cordova?.plugins?.brightness;
        if (cordovaPlugin?.setBrightness) {
          if (cordovaPlugin.getBrightness) {
            cordovaPlugin.getBrightness((val) => {
              previousNativeBrightness = val;
              cordovaPlugin.setBrightness?.(1.0);
            });
          } else {
            cordovaPlugin.setBrightness(1.0);
          }
        }
      } catch {
        // Ignore native bridge errors in standard web browser
      }
    };

    const restoreNativeBrightness = () => {
      try {
        if (win.Android?.resetScreenBrightness) {
          win.Android.resetScreenBrightness();
          return;
        }
        if (win.Android?.setScreenBrightness) {
          win.Android.setScreenBrightness(-1);
          return;
        }

        const capPlugin = win.Capacitor?.Plugins?.ScreenBrightness;
        if (capPlugin?.setBrightness) {
          const restoreVal = previousNativeBrightness !== null ? previousNativeBrightness : -1;
          void capPlugin.setBrightness({ brightness: restoreVal }).catch(() => {});
          return;
        }

        const cordovaPlugin = win.cordova?.plugins?.brightness;
        if (cordovaPlugin?.setBrightness) {
          const restoreVal = previousNativeBrightness !== null ? previousNativeBrightness : -1;
          cordovaPlugin.setBrightness(restoreVal);
        }
      } catch {
        // Ignore restore errors
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        void acquireWakeLock();
      }
    };

    void acquireWakeLock();
    void boostNativeBrightness();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock && !wakeLock.released) {
        void wakeLock.release().catch(() => {});
      }
      restoreNativeBrightness();
    };
  }, [active]);
}
