import React, { useRef, useEffect, useCallback } from 'react';
import { Aperture } from 'lucide-react';

/**
 * Reads the computed background-color of a DOM element and converts it to hex.
 * Returns null if the element is not available or the color is transparent.
 */
function getComputedHexColor(element: HTMLElement): string | null {
  const rgb = getComputedStyle(element).backgroundColor;
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;
  const [, r, g, b] = match;
  return `#${[r, g, b].map(c => Number(c).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Returns a contrasting symbol color (light or dark) based on the background luminance.
 */
function getContrastSymbolColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1d1d1d' : '#e0e0e0';
}

/**
 * Dedicated window title bar that replaces the native OS frame.
 * Spans the full window width, acts as the drag region for window movement,
 * and displays the app identity. Native window controls (minimize, maximize,
 * close) are rendered by Electron's titleBarOverlay on the right side.
 *
 * On mount and theme changes, reads its own computed background color and
 * sends it to the main process so the overlay buttons match.
 */
export const TitleBar: React.FC = () => {
  const barRef = useRef<HTMLDivElement>(null);

  const syncOverlayColor = useCallback(() => {
    if (!barRef.current || !window.api?.updateTitleBarOverlay) return;
    const bgHex = getComputedHexColor(barRef.current);
    if (!bgHex) return;
    window.api.updateTitleBarOverlay({
      color: bgHex,
      symbolColor: getContrastSymbolColor(bgHex),
    });
  }, []);

  useEffect(() => {
    // Sync on mount
    syncOverlayColor();

    // Re-sync when the theme class changes on <html>
    const observer = new MutationObserver(syncOverlayColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [syncOverlayColor]);

  return (
    <div
      ref={barRef}
      className="titlebar-drag h-9 w-full bg-card border-b border-border flex items-center pl-3 pr-[138px] select-none shrink-0"
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-5 h-5 rounded bg-linear-to-br from-primary to-destructive text-primary-foreground shrink-0">
          <Aperture className="w-3 h-3" />
        </div>
        <span className="text-2xs font-semibold text-muted-foreground tracking-wide">
          Galleo
        </span>
      </div>
    </div>
  );
};
