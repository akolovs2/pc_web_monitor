import { useState, useCallback, useRef, useEffect } from "react";

export interface TipPos {
  x: number;
  y: number;
  containerW: number;
}

export function useLineChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [tipPos, setTipPos] = useState<TipPos | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setContainerW(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    []
  );

  const scheduleHide = useCallback((ms: number) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setActiveIdx(null);
      setTipPos(null);
      hideTimer.current = null;
    }, ms);
  }, []);

  const track = useCallback((idx: number, x: number, y: number, cW: number) => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setActiveIdx(idx);
    setTipPos({ x, y, containerW: cW });
  }, []);

  return { containerRef, containerW, activeIdx, tipPos, scheduleHide, track };
}
