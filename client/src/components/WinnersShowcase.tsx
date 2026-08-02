import { Crown, Medal, Award, ExternalLink, Sparkles } from 'lucide-react';
import { EDITIONS, MEDAL } from '../pages/WinnersPage';

const SLUG_MAP: Record<string, string> = {
  'viber-fifa-world-cup': 'fifa-world-cup',
  'viber-halloween': 'viber-3',
};

export const WinnersShowcase = ({ slug }: { slug: string }) => {
  const winnerKey = SLUG_MAP[slug] || slug;
  const config = EDITIONS[winnerKey];
  if (!config) return null;

  const champion = config.winners.find((w) => w.rank === 1);
  const runners = config.winners.filter((w) => w.rank !== 1);
  if (!champion) return null;

  const m = MEDAL[1];

  return (
    <div className="mb-8">
      {/* Champion hero card */}
      <a
        href={champion.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block rounded-xl overflow-hidden border-2 transition-transform hover:-translate-y-1 mb-5"
        style={{
          borderColor: m.color,
          background: 'var(--ink-800)',
          boxShadow: `0 0 40px ${m.color}33`,
        }}
      >
        <div className="grid md:grid-cols-2">
          <div className="relative aspect-video md:aspect-auto md:min-h-[280px] overflow-hidden bg-ink-700">
            <img
              src={champion.thumbnail}
              alt={champion.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div
              className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest"
              style={{ background: m.color, color: 'var(--accent-ink)' }}
            >
              <Crown size={16} /> {m.label}
            </div>
          </div>

          <div className="p-6 md:p-8 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} style={{ color: m.color }} />
              <span className="mono-label text-xs" style={{ color: m.color }}>
                {config.name} &middot; #1 Winner
              </span>
            </div>
            <h2 className="h2 mb-1 group-hover:text-primary transition-colors">{champion.title}</h2>
            <div className="mono-label mb-3 text-sm">{champion.team}</div>
            {champion.description && (
              <p className="body-l text-ink-200 mb-5">{champion.description}</p>
            )}
            <span
              className="btn btn-solid self-start"
              style={{ background: m.color, color: 'var(--accent-ink)', borderColor: m.color }}
            >
              Play App <ExternalLink size={14} className="ml-2" />
            </span>
          </div>
        </div>
      </a>

      {/* Runner-up cards */}
      {runners.length > 0 && (
        <div
          className={`grid gap-4 ${
            runners.length === 1
              ? 'md:grid-cols-1 max-w-md'
              : runners.length === 2
                ? 'md:grid-cols-2'
                : 'md:grid-cols-3'
          }`}
        >
          {runners.map((w) => {
            const rm = MEDAL[w.rank as 2 | 3 | 4];
            const { Icon } = rm;
            return (
              <a
                key={w.rank}
                href={w.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-lg overflow-hidden border transition-transform hover:-translate-y-1"
                style={{ borderColor: 'var(--ink-600)', background: 'var(--ink-800)' }}
              >
                <div className="relative aspect-video overflow-hidden bg-ink-700">
                  <img
                    src={w.thumbnail}
                    alt={w.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div
                    className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
                    style={{ background: rm.color, color: 'var(--accent-ink)' }}
                  >
                    <Icon size={14} /> #{w.rank}
                  </div>
                </div>
                <div className="p-4">
                  <div className="mono-label mb-1 text-xs" style={{ color: rm.color }}>
                    {rm.label}
                  </div>
                  <h3 className="h3 mb-1 group-hover:text-primary transition-colors text-base">{w.title}</h3>
                  <div className="mono-label mb-2 text-xs">{w.team}</div>
                  {w.description && (
                    <p className="text-xs text-ink-300 line-clamp-2 mb-3">{w.description}</p>
                  )}
                  <span className="inline-flex items-center text-xs font-bold uppercase tracking-wide" style={{ color: rm.color }}>
                    Play App <ExternalLink size={12} className="ml-1" />
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};
