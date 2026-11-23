import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-3 left-1/2 z-40 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#3C4353] px-3 py-1 text-[11.5px] font-medium text-white shadow-sm"
    >
      <WifiOff className="h-3.5 w-3.5" />
      <span>Offline mode</span>
    </div>
  );
}
