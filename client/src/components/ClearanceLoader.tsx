import { useEffect, useState } from 'react';

const FRAMES = [
  '/website/assets/loader/v4-group.jpg',
  '/website/assets/loader/founders.jpg',
  '/website/assets/loader/v4-women.jpg',
  '/website/assets/loader/drama-crowd.jpg',
  '/website/assets/loader/v4-coding.jpg',
];

const FLIP_MS = 240;
const FILL_MS = 1700;

const ClearanceLoader = () => {
  const [frame, setFrame] = useState(0);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    FRAMES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const flip = setInterval(() => {
      setFrame((f) => (f + 1) % FRAMES.length);
    }, FLIP_MS);
    return () => clearInterval(flip);
  }, []);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / FILL_MS);
      const eased = 1 - Math.pow(1 - p, 2);
      setPct(Math.round(eased * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '22px',
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      }}
    >
      <div
        style={{
          width: '128px',
          height: '192px',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '3px',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.14), 0 18px 60px rgba(0,0,0,0.7)',
        }}
      >
        {FRAMES.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: i === frame ? 1 : 0,
            }}
          />
        ))}
      </div>

      <div style={{ width: '128px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
        <div
          style={{
            width: '100%',
            height: '2px',
            background: 'rgba(255,255,255,0.12)',
            overflow: 'hidden',
            borderRadius: '2px',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #F9CE32, #F25C5C)',
              transition: 'width 80ms linear',
            }}
          />
        </div>
        <span
          style={{
            fontSize: '11px',
            letterSpacing: '0.32em',
            color: 'rgba(255,255,255,0.55)',
            paddingLeft: '0.32em',
          }}
        >
          {pct}%
        </span>
      </div>

      <span
        style={{
          fontSize: '10px',
          letterSpacing: '0.42em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.4)',
          paddingLeft: '0.42em',
        }}
      >
        Check-in clearance
      </span>
    </div>
  );
};

export default ClearanceLoader;
