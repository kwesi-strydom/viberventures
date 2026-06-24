import { useEffect } from 'react';

/**
 * Scroll-reveal: fades + lifts any `.reveal` element into view as it enters
 * the viewport (mirrors the landing page's reveal-on-scroll behaviour).
 * Pass deps (e.g. loading flags) so it re-scans once async content renders.
 */
export function useScrollReveal(deps: unknown[] = []) {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll('.reveal:not(.in)'));
    if (!nodes.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
