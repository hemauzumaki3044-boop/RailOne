import { useEffect, useRef, useState } from 'react';
import { verifyMpin } from '../firebase';

interface MpinLoginScreenProps {
  userName: string;
  biometricEnabled: boolean;
  onBiometricChange: (enabled: boolean) => void;
  onLoginSuccess: () => void;
}

const PIN_LENGTH = 6;
const PIN_SLOTS = [0, 1, 2, 3, 4, 5] as const;

export function MpinLoginScreen({
  userName,
  biometricEnabled,
  onBiometricChange,
  onLoginSuccess,
}: MpinLoginScreenProps) {
  const [pin, setPin] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const moveCaretToEnd = (el: HTMLInputElement | null) => {
    if (!el) return;
    try {
      const len = el.value.length;
      el.setSelectionRange(len, len);
    } catch {
      // Ignore selection errors on unsupported input types
    }
  };

  const submitPin = async (enteredPin: string) => {
    if (enteredPin.length !== PIN_LENGTH || isVerifying) return;
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const { valid } = await verifyMpin(enteredPin);
      if (valid) {
        onLoginSuccess();
      } else {
        setErrorMessage('Invalid mPIN. Please try again.');
        setShaking(true);
        window.setTimeout(() => {
          setShaking(false);
          setPin('');
          inputRef.current?.focus();
        }, 380);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePinChange = (rawValue: string) => {
    if (isVerifying) return;
    const cleaned = rawValue.replace(/\D/g, '').slice(0, PIN_LENGTH);
    setPin(cleaned);
    if (errorMessage) setErrorMessage(null);

    if (cleaned.length === PIN_LENGTH) {
      void submitPin(cleaned);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-white">
      <main className="railone-mpin-bg railone-mpin-shell mx-auto flex min-h-[100dvh] w-full select-none flex-col items-center px-[26px] pb-[48px] sm:max-w-[430px]">
        <h1 className="m-0 mb-[69px] w-full text-center">
          <img
            src="/assets/mpin-logo.png"
            alt="RailOne"
            draggable={false}
            className="mx-auto block h-auto w-[122px] mix-blend-multiply"
          />
        </h1>

        <div className="w-full">
          <h2 className="m-0 mb-[25px] text-center text-[21px] leading-[26px] font-bold text-[#3C4353]">
            Login using mPIN
          </h2>
          <p className="m-0 mb-[22px] text-center text-[17px] leading-[22px] font-medium text-[#3C4353]">
            Welcome {userName}!
          </p>
          <p className="m-0 mb-[16px] text-center text-[15.5px] leading-[20px] font-medium text-[#3C4353]">
            Enter mPIN below
          </p>

          <div
            className={`relative mb-[16px] grid grid-cols-6 gap-[11px] ${shaking ? 'railone-pin-shake' : ''}`}
          >
            <input
              ref={inputRef}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={PIN_LENGTH}
              autoComplete="one-time-code"
              enterKeyHint="done"
              value={pin}
              disabled={isVerifying}
              aria-label="Enter 6-digit mPIN"
              onChange={(e) => handlePinChange(e.target.value)}
              onFocus={(e) => {
                setIsFocused(true);
                moveCaretToEnd(e.currentTarget);
              }}
              onClick={(e) => moveCaretToEnd(e.currentTarget)}
              onBlur={() => setIsFocused(false)}
              className="absolute inset-0 z-10 m-0 h-full w-full cursor-text border-0 bg-transparent p-0 text-[16px] text-transparent opacity-0 caret-transparent outline-none"
            />
            {PIN_SLOTS.map((index) => {
              const filled = index < pin.length;
              const isActive = isFocused && !isVerifying && index === pin.length;
              return (
                <div
                  key={index}
                  aria-hidden="true"
                  className={`pointer-events-none relative h-[49px] w-full rounded-[12px] border-[1.5px] bg-white transition-colors duration-200 ${
                    errorMessage
                      ? 'border-[#DC2626]'
                      : isActive
                        ? 'border-[#9EC8DA]'
                        : 'border-[#8FD3EE]'
                  }`}
                >
                  {filled && (
                    <span className="absolute top-1/2 left-1/2 block h-[7.5px] w-[7.5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#B8C2CC]" />
                  )}
                  {isActive && (
                    <span className="railone-pin-cursor absolute top-1/2 left-1/2 block h-[20px] w-[1.5px] -translate-x-1/2 -translate-y-1/2 bg-[#1E293B]" />
                  )}
                </div>
              );
            })}
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="m-0 mb-[12px] text-center text-[12.5px] font-medium text-[#DC2626]"
            >
              {errorMessage}
            </p>
          )}

          <div className="flex w-full items-center justify-between">
            <button
              type="button"
              className="cursor-pointer border-0 bg-transparent p-0 text-[15px] font-bold text-[#0F2366]"
            >
              Forgot Password?
            </button>
            <button
              type="button"
              className="cursor-pointer border-0 bg-transparent p-0 text-[15px] font-bold text-[#0F2366]"
            >
              Reset mPIN?
            </button>
          </div>
        </div>

        <div className="mt-[82px] w-full">
          <div className="mb-[33px] flex items-center gap-[12px]">
            <span className="flex-1 border-t border-dashed border-[#CBD5E1]" />
            <span className="whitespace-nowrap text-[14.5px] leading-[22px] font-medium text-[#7B828F]">
              Enable biometric ?
            </span>
            <span className="flex-1 border-t border-dashed border-[#CBD5E1]" />
          </div>

          <div className="mb-[31px] flex items-center justify-between px-[8px]">
            <div className="flex items-center gap-[20px]">
              <img
                src="/assets/face-id.png"
                alt="Face ID"
                draggable={false}
                className="block h-[29px] w-[29px] object-contain"
              />
              <img
                src="/assets/fingerprint.png"
                alt="Fingerprint"
                draggable={false}
                className="block h-[29px] w-[29px] object-contain"
              />
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={biometricEnabled}
              aria-label="Enable biometric login"
              onClick={() => onBiometricChange(!biometricEnabled)}
              className={`relative h-[28px] w-[52px] cursor-pointer rounded-full border-0 p-[3px] transition-colors duration-200 ${
                biometricEnabled ? 'bg-[#0B2972]' : 'bg-[#CBD0D6]'
              }`}
            >
              <span
                className={`block h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15)] transition-transform duration-200 ${
                  biometricEnabled ? 'translate-x-[24px]' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <p className="mx-[5px] my-0 text-left text-[12.5px] leading-[17.5px] font-normal text-[#3C4353]">
            By enabling biometric authentication you will be able to login through your device set
            biometric.
          </p>
        </div>

        <div className="mt-[42px]">
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-0 text-[15px] font-bold text-[#0F2366]"
          >
            Different User?
          </button>
        </div>
      </main>
    </div>
  );
}
