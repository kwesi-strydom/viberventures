import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MapPin, ArrowRight, Calendar, PlayCircle, Film, Sparkles } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface EventCard {
  id: number;
  edition: number;
  name: string;
  slug: string;
  description?: string | null;
  location?: string | null;
  status: 'upcoming' | 'live' | 'past';
  thumbnailUrl?: string | null;
  startDate?: string | null;
  recapUrl?: string | null;
  videoUrl?: string | null;
  entryFeeCents: number;
  currency: string;
  competitorCount: number;
  spectatorCount: number;
}

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null;

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    live: 'bg-pos/15 text-pos border-pos/30',
    upcoming: 'bg-primary/15 text-primary border-primary/30',
    past: 'bg-white/5 text-muted-foreground border-border',
  };
  return (
    <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded border ${map[status] || map.past}`}>
      {status}
    </span>
  );
};

const feeLabel = (cents: number, currency: string) =>
  cents > 0 ? `${(cents / 100).toLocaleString(undefined, { style: 'currency', currency: currency.toUpperCase() })} entry` : 'Free entry';

const EventsPage = () => {
  const { data: events, isLoading } = useQuery<EventCard[]>({ queryKey: ['/api/events'] });
  useScrollReveal([isLoading]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={32} className="animate-spin text-primary" />
        <span className="kicker">Loading events</span>
      </div>
    );
  }

  const all = events || [];
  const upcoming = all
    .filter((e) => e.status === 'upcoming' || e.status === 'live')
    .sort((a, b) => b.edition - a.edition);
  const past = all
    .filter((e) => e.status === 'past')
    .sort((a, b) => b.edition - a.edition);

  return (
    <div className="arena-wrap py-12 md:py-16">
      <div className="reveal mb-10">
        <span className="kicker text-primary block mb-2">The Viber championship series</span>
        <h1 className="display" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', lineHeight: 1 }}>
          Competitions
        </h1>
        <p className="body-l text-muted-foreground mt-3 max-w-2xl">
          The next Viber vibecoding championship. Join as a competitor or spectator. Plus every past edition and its winning apps.
        </p>
      </div>

      {/* Upcoming — the main event */}
      <section className="mb-14">
        <h2 className="reveal h3 mb-4 flex items-center gap-2">
          <Sparkles size={18} className="text-primary" /> Next up
        </h2>
        {upcoming.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-muted-foreground">No competition scheduled right now — check back soon.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {upcoming.map((ev, i) => (
              <Link
                key={ev.id}
                to={`/competition/${ev.slug}`}
                className="reveal card p-0 overflow-hidden grid md:grid-cols-2 hover:border-primary/60 transition group"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="relative bg-ink-800 min-h-[220px]">
                  {ev.thumbnailUrl ? (
                    <img src={ev.thumbnailUrl} alt={ev.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-900/20">
                      <span className="display uppercase text-4xl opacity-30">{ev.name}</span>
                    </div>
                  )}
                  <div className="absolute top-4 left-4"><StatusBadge status={ev.status} /></div>
                </div>
                <div className="p-6 md:p-8 flex flex-col justify-center">
                  <h3 className="display uppercase mb-3" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', lineHeight: 1 }}>
                    {ev.name}
                  </h3>
                  {ev.description && (
                    <p className="text-muted-foreground mb-5 line-clamp-3">{ev.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-6">
                    {fmtDate(ev.startDate) && (
                      <span className="flex items-center gap-1"><Calendar size={14} /> {fmtDate(ev.startDate)}</span>
                    )}
                    {ev.location && (
                      <span className="flex items-center gap-1"><MapPin size={14} /> {ev.location}</span>
                    )}
                    <span className="font-semibold text-foreground">{feeLabel(ev.entryFeeCents, ev.currency)}</span>
                  </div>
                  <span className="btn btn-primary btn-lg self-start group-hover:gap-2 transition-all">
                    Register now <ArrowRight size={16} className="ml-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Past competitions */}
      {past.length > 0 && (
        <section>
          <h2 className="reveal h3 mb-4 text-muted-foreground">Past competitions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {past.map((ev, i) => (
              <Link key={ev.id} to={`/competition/${ev.slug}`} className="reveal card p-0 overflow-hidden hover:border-primary/50 transition group flex flex-col" style={{ transitionDelay: `${i * 60}ms` }}>
                <div className="relative aspect-[3/4] bg-ink-800">
                  {ev.thumbnailUrl ? (
                    <img src={ev.thumbnailUrl} alt={ev.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/5 to-white/0">
                      <span className="display uppercase text-2xl opacity-30 text-center px-2">{ev.name}</span>
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="h4 uppercase mb-1">{ev.name}</h3>
                  {fmtDate(ev.startDate) && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                      <Calendar size={12} /> {fmtDate(ev.startDate)}
                    </span>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    {ev.recapUrl && (
                      <span
                        role="link"
                        tabIndex={0}
                        onClick={(e) => { e.preventDefault(); window.open(ev.recapUrl!, '_blank', 'noopener'); }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition"
                      >
                        <PlayCircle size={12} /> Recap
                      </span>
                    )}
                    {ev.videoUrl && (
                      <span
                        role="link"
                        tabIndex={0}
                        onClick={(e) => { e.preventDefault(); window.open(ev.videoUrl!, '_blank', 'noopener'); }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition"
                      >
                        <Film size={12} /> Video
                      </span>
                    )}
                  </div>
                  <span className="mt-3 flex items-center text-primary font-semibold uppercase tracking-wider text-xs group-hover:gap-2 transition-all">
                    View results <ArrowRight size={14} className="ml-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default EventsPage;
