import { useQuery } from '@tanstack/react-query';
import { Loader2, Calendar, MapPin, ArrowRight } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface Workshop {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  date?: string | null;
  dateDisplay?: string | null;
  location?: string | null;
  thumbnailUrl?: string | null;
  link?: string | null;
  status: 'past' | 'upcoming';
}

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    upcoming: 'bg-primary/15 text-primary border-primary/30',
    past: 'bg-white/5 text-muted-foreground border-border',
  };
  return (
    <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded border ${map[status] || map.past}`}>
      {status}
    </span>
  );
};

const UpcomingWorkshopCard = ({ w }: { w: Workshop }) => {
  const inner = (
    <>
      <div className="relative bg-ink-800 aspect-[16/9] md:aspect-auto md:min-h-[260px]">
        {w.thumbnailUrl ? (
          <img src={w.thumbnailUrl} alt={w.name} className="absolute inset-0 w-full h-full object-contain" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-900/20">
            <span className="h3 uppercase text-4xl opacity-30">{w.name}</span>
          </div>
        )}
        <div className="absolute top-4 left-4"><StatusBadge status={w.status} /></div>
      </div>
      <div className="p-6 md:p-8 flex flex-col justify-center">
        <h3 className="h3 uppercase mb-3" style={{ fontSize: 'clamp(1.4rem, 2.4vw, 2rem)', lineHeight: 1.1 }}>
          {w.name}
        </h3>
        {w.description && <p className="body-l mb-5 line-clamp-3">{w.description}</p>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-6">
          {w.dateDisplay && <span className="flex items-center gap-1"><Calendar size={14} /> {w.dateDisplay}</span>}
          {w.location && <span className="flex items-center gap-1"><MapPin size={14} /> {w.location}</span>}
        </div>
        {w.link && (
          <span className="btn btn-primary btn-lg self-start group-hover:gap-2 transition-all">
            View event <ArrowRight size={16} className="ml-1" />
          </span>
        )}
      </div>
    </>
  );

  const cls = 'reveal card p-0 overflow-hidden grid md:grid-cols-2 hover:border-primary/60 transition group';
  return w.link ? (
    <a href={w.link} target="_blank" rel="noopener noreferrer" className={`${cls} block`}>{inner}</a>
  ) : (
    <div className={cls}>{inner}</div>
  );
};

const PastWorkshopCard = ({ w }: { w: Workshop }) => {
  const inner = (
    <>
      <div className="relative aspect-[16/9] bg-ink-800">
        {w.thumbnailUrl ? (
          <img src={w.thumbnailUrl} alt={w.name} className="absolute inset-0 w-full h-full object-contain" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/5 to-white/0">
            <span className="h3 uppercase text-2xl opacity-30 text-center px-2">{w.name}</span>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="h3 uppercase mb-1">{w.name}</h3>
        {w.dateDisplay && (
          <span className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
            <Calendar size={12} /> {w.dateDisplay}
          </span>
        )}
        {w.link && (
          <span className="mt-auto flex items-center text-primary font-semibold uppercase tracking-wider text-xs group-hover:gap-2 transition-all">
            View event <ArrowRight size={14} className="ml-1" />
          </span>
        )}
      </div>
    </>
  );

  const cls = 'reveal card p-0 overflow-hidden hover:border-primary/50 transition group flex flex-col';
  return w.link ? (
    <a href={w.link} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
  ) : (
    <div className={cls}>{inner}</div>
  );
};

const WorkshopsPage = () => {
  const { data: workshops, isLoading } = useQuery<Workshop[]>({ queryKey: ['/api/workshops'] });
  useScrollReveal([isLoading]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={32} className="animate-spin text-primary" />
        <span className="kicker">Loading workshops</span>
      </div>
    );
  }

  const list = workshops || [];
  const upcoming = list.filter((w) => w.status === 'upcoming');
  const past = list.filter((w) => w.status === 'past');

  return (
    <div className="arena-wrap py-12 md:py-16">
      <div className="reveal mb-14">
        <span className="kicker text-primary block mb-2">Learn to vibecode</span>
        <h1 className="display" style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', lineHeight: 1 }}>
          <span style={{ color: 'var(--accent)' }}>Workshops</span>
        </h1>
        <p className="body-l mt-6 max-w-2xl">
          Hands-on sessions where we teach you how to build real AI-powered apps, fast — perfect prep before stepping into the championship arena.
        </p>
      </div>

      {/* Upcoming — the main event */}
      <section className="mb-24">
        <h2 className="reveal h2 mb-8">Next up</h2>
        {upcoming.length > 0 ? (
          <div className="space-y-5">
            {upcoming.map((w) => <UpcomingWorkshopCard key={w.id} w={w} />)}
          </div>
        ) : (
          <div className="card text-center py-12">
            <p className="body-l">No workshops scheduled right now — new ones drop regularly. Check back soon or join a competition to stay in the loop.</p>
          </div>
        )}
      </section>

      {/* Past workshops */}
      {past.length > 0 && (
        <section>
          <h2 className="reveal h2 mb-8">Past workshops</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {past.map((w) => <PastWorkshopCard key={w.id} w={w} />)}
          </div>
        </section>
      )}
    </div>
  );
};

export default WorkshopsPage;
