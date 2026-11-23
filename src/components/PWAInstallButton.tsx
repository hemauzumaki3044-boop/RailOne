import { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { canInstall, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (!canInstall && !isIOS) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => (canInstall ? void install() : setShowIOSGuide(true))}
        aria-label="Install RailOne App"
        className="fixed top-3 right-3 z-40 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#8FD3EE] bg-white/95 py-1 pr-3 pl-1.5 text-[12px] font-semibold text-[#0F2366] shadow-xs backdrop-blur-xs transition-colors hover:bg-[#E7F5FA]"
      >
        <img
          src="/pwa-192x192.png"
          alt=""
          className="h-5 w-5 rounded-full object-cover"
        />
        <span>Install</span>
        <Download className="h-3.5 w-3.5" />
      </button>

      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Install RailOne on iOS"
        >
          <div className="w-full max-w-[360px] rounded-2xl bg-white p-5 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src="/pwa-192x192.png"
                  alt="RailOne"
                  className="h-8 w-8 rounded-lg object-cover"
                />
                <h3 className="m-0 text-[16px] font-bold text-[#0F2366]">Install RailOne</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                aria-label="Close install instructions"
                className="cursor-pointer rounded-full border-0 bg-transparent p-1 text-[#3C4353]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ol className="m-0 space-y-2 pl-4 text-[13px] leading-[19px] text-[#3C4353]">
              <li>
                Tap the <Share className="inline h-3.5 w-3.5 text-[#0F2366]" /> Share button in
                Safari.
              </li>
              <li>
                Scroll down and tap <strong>Add to Home Screen</strong>.
              </li>
              <li>
                Tap <strong>Add</strong> to install RailOne.
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
