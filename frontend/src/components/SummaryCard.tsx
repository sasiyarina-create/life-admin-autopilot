import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

function useInitialCount(value: number | null, duration = 650) {
  const [display, setDisplay] = useState(0);
  const hasAnimated = useRef(false);
  useEffect(() => {
    if (value === null || hasAnimated.current) return;
    hasAnimated.current = true;
    const startedAt = performance.now();
    let frame = 0;
    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      setDisplay(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [duration, value]);
  return display;
}

export function SummaryCard({ label, value, detail, icon, numericValue, formatValue }: { label: string; value: string; detail: string; icon: ReactNode; numericValue?: number | null; formatValue?: (value: number) => string }) {
  const animated = useInitialCount(numericValue ?? null);
  const displayedValue = numericValue === undefined || numericValue === null ? value : formatValue ? formatValue(animated) : String(animated);
  return <article className="metric-card"><div className="metric-icon">{icon}</div><p>{label}</p><strong>{displayedValue}</strong><span>{detail}</span></article>;
}
