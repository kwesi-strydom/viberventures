import { Link } from 'react-router-dom';
import { ExternalLink, Star, Trophy } from 'lucide-react';

export interface ViberRecordEntry {
  role: 'competitor' | 'spectator';
  teamName?: string | null;
  event: { id: number; edition: number; name: string; slug: string; status: string } | null;
  result: {
    rank: number;
    title: string;
    avg_rating: number;
    rating_count: number;
    thumbnail_url?: string | null;
    game_url?: string | null;
  } | null;
}

const resultBadge = (entry: ViberRecordEntry) => {
  if (entry.role === 'spectator') return { label: 'Attended', cls: 'border-border text-muted-foreground bg-white/5' };
  if (entry.result?.rank === 1) return { label: 'Champion', cls: 'border-[#f9a826]/40 text-[#f9a826] bg-[#f9a826]/10' };
  if (entry.result && entry.result.rank <= 4) return { label: 'Finalist', cls: 'border-primary/40 text-primary bg-primary/10' };
  return { label: 'Competed', cls: 'border-border text-muted-foreground bg-white/5' };
};

export default function ViberRecord({ entries, title = 'Viber record' }: { entries: ViberRecordEntry[]; title?: string }) {
  const completed = entries
    .filter((entry): entry is ViberRecordEntry & { event: NonNullable<ViberRecordEntry['event']> } => entry.event?.status === 'past')
    .sort((a, b) => b.event.edition - a.event.edition);

  return (
    <section className="mb-10">
      <h2 className="h3 uppercase mb-4">{title}</h2>
      {completed.length === 0 ? (
        <div className="card p-6 text-center text-muted-foreground text-sm">No completed events yet.</div>
      ) : (
        <div className="grid gap-4">
          {completed.map(entry => {
            const badge = resultBadge(entry);
            return (
              <div key={entry.event.id} className="card p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Link to={`/events/${entry.event.slug}`} className="h3 uppercase hover:text-primary transition-colors">
                        {entry.event.name}
                      </Link>
                      <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        entry.role === 'competitor' ? 'border-primary/40 text-primary bg-primary/5' : 'border-border text-muted-foreground bg-white/5'
                      }`}>{entry.role}</span>
                      <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${badge.cls}`}>{badge.label}</span>
                    </div>
                    {entry.teamName && <p className="text-sm text-muted-foreground">Team {entry.teamName}</p>}
                    {entry.result && (
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="inline-flex items-center gap-1 text-[#f9a826]"><Trophy size={14} /> #{entry.result.rank}</span>
                        <span className="inline-flex items-center gap-1 text-primary"><Star size={14} /> {entry.result.avg_rating.toFixed(1)} ({entry.result.rating_count} votes)</span>
                      </div>
                    )}
                  </div>
                  {entry.result && (
                    <div className="sm:w-44 shrink-0">
                      {entry.result.thumbnail_url && (
                        <img src={entry.result.thumbnail_url} alt={entry.result.title} className="w-full h-24 object-cover rounded-md border border-border mb-2" />
                      )}
                      {entry.result.game_url ? (
                        <a href={entry.result.game_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                          {entry.result.title} <ExternalLink size={12} />
                        </a>
                      ) : <span className="text-sm text-foreground">{entry.result.title}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}