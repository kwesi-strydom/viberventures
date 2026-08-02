import { useEffect, useState } from 'react';

interface CountdownProps {
  /** Target date (ISO string or Date) the countdown runs toward. */
  target: string | Date;
  /** Optional label shown above the units. */
  label?: string;
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

const getRemaining = (targetMs: number) => {
  const diff = targetMs - Date.now();
  if (diff <= 0) return { live: true, d: 0, h: 0, m: 0, s: 0 };
  return {
    live: false,
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
};

const Countdown = ({ target, label = 'Starts in', className = '' }: CountdownProps) => {
  const targetMs = new Date(target).getTime();
  const [t, setT] = useState(() => getRemaining(targetMs));

  useEffect(() => {
    setT(getRemaining(targetMs));
    const id = setInterval(() => setT(getRemaining(targetMs)), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  if (Number.isNaN(targetMs)) return null;

  const units: Array<{ v: number; l: string }> = [
    { v: t.d, l: 'Days' },
    { v: t.h, l: 'Hrs' },
    { v: t.m, l: 'Min' },
    { v: t.s, l: 'Sec' },
  ];

  return (
    <div className={className}>
      <span className="mono-label block mb-2">{t.live ? 'Happening now' : label}</span>
      <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-md">
        {units.map((u) => (
          <div
            key={u.l}
            className="rounded-md border border-primary/30 bg-primary/5 py-3 text-center"
          >
            <div className="display text-2xl sm:text-3xl text-primary leading-none">{pad(u.v)}</div>
            <div className="mono-label mt-1 text-[0.65rem]">{u.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Countdown;
