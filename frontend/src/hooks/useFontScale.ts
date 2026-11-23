import { useCallback, useEffect, useState } from 'react';

export const FONT_SCALE_STEPS = [90, 100, 110, 120, 130] as const;

export type FontScalePercent = (typeof FONT_SCALE_STEPS)[number];

const DEFAULT_FONT_SCALE: FontScalePercent = 100;
const STORAGE_KEY = 'cu_iso_audit_font_scale_v1';

function readStoredFontScale(): FontScalePercent {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_FONT_SCALE;
    }
    const parsed = Number(raw);
    const match = FONT_SCALE_STEPS.find((step) => step === parsed);
    return match ?? DEFAULT_FONT_SCALE;
  } catch {
    return DEFAULT_FONT_SCALE;
  }
}

export interface FontScaleControls {
  fontScale: FontScalePercent;
  canDecrease: boolean;
  canIncrease: boolean;
  decreaseFontScale: () => void;
  increaseFontScale: () => void;
  resetFontScale: () => void;
}

export function useFontScale(): FontScaleControls {
  const [fontScale, setFontScale] = useState<FontScalePercent>(() =>
    readStoredFontScale(),
  );

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale}%`;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(fontScale));
    } catch {
      // Ignore storage quota / privacy mode errors
    }
  }, [fontScale]);

  const currentIndex = FONT_SCALE_STEPS.indexOf(fontScale);
  const canDecrease = currentIndex > 0;
  const canIncrease =
    currentIndex >= 0 && currentIndex < FONT_SCALE_STEPS.length - 1;

  const decreaseFontScale = useCallback(() => {
    setFontScale((prev) => {
      const idx = FONT_SCALE_STEPS.indexOf(prev);
      const next = idx > 0 ? FONT_SCALE_STEPS[idx - 1] : undefined;
      return next ?? prev;
    });
  }, []);

  const increaseFontScale = useCallback(() => {
    setFontScale((prev) => {
      const idx = FONT_SCALE_STEPS.indexOf(prev);
      const next =
        idx >= 0 && idx < FONT_SCALE_STEPS.length - 1
          ? FONT_SCALE_STEPS[idx + 1]
          : undefined;
      return next ?? prev;
    });
  }, []);

  const resetFontScale = useCallback(() => {
    setFontScale(DEFAULT_FONT_SCALE);
  }, []);

  return {
    fontScale,
    canDecrease,
    canIncrease,
    decreaseFontScale,
    increaseFontScale,
    resetFontScale,
  };
}
