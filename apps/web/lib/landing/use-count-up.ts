"use client";

import { useEffect, useRef, useState } from "react";

export function useCountUp(
  target: number,
  duration = 1600,
): [number, React.RefObject<HTMLDivElement | null>] {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const t0 = Date.now();
          const tick = () => {
            const p = Math.min((Date.now() - t0) / duration, 1);
            const ease = 1 - (1 - p) ** 3;
            setVal(Math.round(ease * target));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 },
    );
    const el = ref.current;
    if (el) obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);

  return [val, ref];
}
