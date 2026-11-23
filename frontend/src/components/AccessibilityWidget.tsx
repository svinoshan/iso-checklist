import { useEffect, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw, X } from 'lucide-react';
import type { FontScaleControls } from '../hooks/useFontScale';

interface AccessibilityWidgetProps {
  fontScaleControls: FontScaleControls;
}

export function AccessibilityWidget({
  fontScaleControls,
}: AccessibilityWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    fontScale,
    canDecrease,
    canIncrease,
    decreaseFontScale,
    increaseFontScale,
    resetFontScale,
  } = fontScaleControls;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="fixed bottom-[16px] left-[16px] z-40">
      {isOpen && (
        <div
          role="dialog"
          aria-label="Accessibility Menu"
          className="mb-[12px] w-[288px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between bg-[#1E3A5F] px-[16px] py-[12px] text-white">
            <h2 className="text-[14px] leading-[20px] font-semibold">
              Accessibility Menu
            </h2>
            <div className="flex items-center gap-[6px]">
              <button
                type="button"
                onClick={resetFontScale}
                disabled={fontScale === 100}
                title="Reset font size to 100%"
                aria-label="Reset font size to 100%"
                className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-white text-[#1E3A5F] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <RotateCcw className="h-[14px] w-[14px]" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close Accessibility Menu"
                aria-label="Close Accessibility Menu"
                className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-white text-[#1E3A5F] transition hover:bg-slate-100"
              >
                <X className="h-[14px] w-[14px]" />
              </button>
            </div>
          </div>

          <div className="bg-slate-50 p-[14px]">
            <div className="rounded-[12px] border border-slate-200 bg-white p-[14px] shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[12px] leading-[16px] font-semibold text-slate-800">
                  Adjust Font Size
                </span>
                <span className="text-[11px] leading-[14px] text-slate-400">
                  90% – 130%
                </span>
              </div>

              <div className="mt-[12px] flex items-center justify-between gap-[12px]">
                <button
                  type="button"
                  onClick={decreaseFontScale}
                  disabled={!canDecrease}
                  title="Decrease font size"
                  aria-label="Decrease font size"
                  className="flex h-[36px] w-[36px] items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="h-[16px] w-[16px]" />
                </button>

                <span
                  aria-live="polite"
                  className="text-[16px] leading-[22px] font-semibold text-slate-900 tabular-nums"
                >
                  {fontScale}%
                </span>

                <button
                  type="button"
                  onClick={increaseFontScale}
                  disabled={!canIncrease}
                  title="Increase font size"
                  aria-label="Increase font size"
                  className="flex h-[36px] w-[36px] items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-[16px] w-[16px]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Open Accessibility Menu"
        title="Accessibility Menu"
        className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[#1E3A5F] text-white shadow-lg ring-2 ring-white transition hover:bg-[#162d4a] focus:ring-2 focus:ring-[#1E3A5F] focus:ring-offset-2 focus:outline-none"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-[24px] w-[24px]"
        >
          <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
          <circle cx="12" cy="7.5" r="1.25" fill="currentColor" stroke="none" />
          <path d="M7.5 10.5c1.5.5 3 .75 4.5.75s3-.25 4.5-.75" />
          <path d="M12 11.25V14.5" />
          <path d="M12 14.5 9.75 18" />
          <path d="M12 14.5 14.25 18" />
        </svg>
      </button>
    </div>
  );
}
