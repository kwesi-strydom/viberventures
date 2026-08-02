import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Trophy, Star, ExternalLink } from 'lucide-react';
import { SiX, SiInstagram, SiLinkedin } from 'react-icons/si';

interface RecordEntry {
  role: 'competitor' | 'spectator';
  teamName?: string | null;
  event: {
    id: number;
    edition: number;
    name: string;
    slug: string;
    status: 'upcoming' | 'live' | 'past';
    startDate?: string | null;
  } | null;
  result: {
    rank: number;
    title: string;
    avg_rating: number;
    rating_count: number;
    thumbnail_url?: string | null;
    game_url?: string | null;
  } | null;
}

interface BuilderProfile {
  id: number;
  username?: string | null;
  name: string;
  country?: string | null;
  flag?: string | null;
  tagline?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  avatarUrl?: string | null;
  record: RecordEntry[];
}

const resultLabel = (rank: number) => {
  if (rank === 1) return { label: 'Champion', cls: 'border-[#f9a826]/40 text-[#f9a826] bg-[#f9a826]/10' };
  if (rank <= 4) return { label: 'Finalist', cls: 'border-primary/40 text-primary bg-primary/10' };
  return { label: 'Competed', cls: 'border-border text-muted-foreground bg-white/5' };
};

// Users paste anything from "@handle" to full URLs — always reduce to a clean handle.
const cleanText = (v?: string | null) => {
  const s = (v || '').trim();
  if (!s || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return null;
  return s;
};

const socialHandle = (v: string) =>
  v
    .trim()
    .replace(/^https?:\/\/(www\.)?(x\.com|twitter\.com|instagram\.com)\//i, '')
    .replace(/[/?#].*$/, '')
    .replace(/^@/, '');

const linkedinHref = (v: string) => {
  const s = v.trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (s.includes('linkedin.com')) return `https://${s.replace(/^\/+/, '')}`;
  return `https://linkedin.com/in/${s.replace(/^@/, '')}`;
};

const linkedinLabel = (v: string) => {
  const m = v.trim().match(/linkedin\.com\/in\/([^/?#]+)/i);
  return m ? m[1] : 'LinkedIn';
};

const RoleBadge = ({ role }: { role: string }) => (
  <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${
    role === 'competitor' ? 'border-primary/40 text-primary bg-primary/5' : 'border-border text-muted-foreground bg-white/5'
  }`}>
    {role}
  </span>
);

const SocialCard = ({
  href,
  icon,
  network,
  handle,
  accent,
  iconBg,
}: {
  href: string;
  icon: React.ReactNode;
  network: string;
  handle: string;
  accent: string;
  iconBg?: string;
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="group flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200 hover:-translate-y-0.5"
    style={{
      borderColor: `${accent}55`,
      background: `linear-gradient(135deg, ${accent}1f, transparent 65%)`,
    }}
  >
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white transition-transform duration-200 group-hover:scale-110"
      style={{ background: iconBg || accent, boxShadow: `0 0 18px ${accent}66` }}
    >
      {icon}
    </span>
    <span className="min-w-0">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {network}
      </span>
      <span className="block truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">
        @{handle}
      </span>
    </span>
  </a>
);

const BuilderProfilePage = () => {
  const { handle } = useParams<{ handle: string }>();

  const { data: profile, isLoading } = useQuery<BuilderProfile>({
    queryKey: [`/api/builders/${handle}`],
    enabled: !!handle,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={32} className="animate-spin text-primary" />
        <span className="kicker">Loading builder</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="arena-wrap py-20 text-center">
        <h2 className="h2 uppercase mb-2">Builder not found</h2>
        <p className="text-muted-foreground mb-6">This builder doesn't exist or keeps their profile private.</p>
        <Link to="/events" className="btn btn-primary">Browse events</Link>
      </div>
    );
  }

  const tagline = cleanText(profile.tagline);
  const twitter = cleanText(profile.twitter);
  const instagram = cleanText(profile.instagram);
  const linkedin = cleanText(profile.linkedin);
  const hasSocials = !!(twitter || instagram || linkedin);

  const pastEntries = profile.record.filter(r => r.event?.status === 'past');
  const sorted = [...pastEntries].sort((a, b) => (b.event?.edition ?? 0) - (a.event?.edition ?? 0));

  return (
    <div className="arena-wrap py-10 md:py-14">
      <Link to="/events" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-6 transition">
        <ArrowLeft size={14} /> Back to events
      </Link>

      {/* Hero card: full-bleed portrait with neon overlay — builders are the heroes */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative overflow-hidden rounded-2xl border border-border">
          <div className="relative w-full" style={{ aspectRatio: '16 / 10', maxHeight: 380 }}>
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'radial-gradient(circle at 50% 30%, hsl(263, 60%, 25%), hsl(0, 0%, 5%))' }}
              >
                <span className="display text-primary" style={{ fontSize: 'clamp(5rem, 20vw, 10rem)', lineHeight: 1 }}>
                  {(profile.name || '?').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {/* Neon color wash + readability gradient */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255, 122, 26, 0.28), rgba(168, 55, 235, 0.28) 55%, rgba(20, 220, 190, 0.22))',
                mixBlendMode: 'overlay',
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.05) 70%)',
              }}
            />

            {/* Identity overlay */}
            <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
              <span className="kicker text-primary block mb-2" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>
                Viber Builder
              </span>
              <h1
                className="display uppercase text-white"
                style={{ fontSize: 'clamp(2rem, 6vw, 3.4rem)', lineHeight: 0.95, textShadow: '0 2px 16px rgba(0,0,0,0.9)' }}
              >
                {profile.name}
              </h1>
              {(profile.flag || profile.country) && (
                <p className="mt-2 text-sm font-semibold text-white/90" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>
                  {profile.flag || ''} {profile.country || ''}
                </p>
              )}
              {tagline && (
                <p
                  className="mt-2 max-w-md text-sm md:text-base italic text-white/85"
                  style={{ textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}
                >
                  &ldquo;{tagline}&rdquo;
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Social links: branded, glowing, clickable cards */}
        {hasSocials && (
          <div className="mt-4">
            <p className="mono-label mb-2">Connect with {profile.name.split(' ')[0]}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {twitter && (
                <SocialCard
                  href={`https://x.com/${socialHandle(twitter)}`}
                  icon={<SiX size={16} />}
                  network="X / Twitter"
                  handle={socialHandle(twitter)}
                  accent="#e7e9ea"
                />
              )}
              {instagram && (
                <SocialCard
                  href={`https://instagram.com/${socialHandle(instagram)}`}
                  icon={<SiInstagram size={16} />}
                  network="Instagram"
                  handle={socialHandle(instagram)}
                  accent="#962fbf"
                  iconBg="linear-gradient(45deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5)"
                />
              )}
              {linkedin && (
                <SocialCard
                  href={linkedinHref(linkedin)}
                  icon={<SiLinkedin size={16} />}
                  network="LinkedIn"
                  handle={linkedinLabel(linkedin)}
                  accent="#0a66c2"
                />
              )}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto">
        <h2 className="h3 uppercase mb-4">Viber record</h2>
        {sorted.length === 0 ? (
          <div className="card p-6 text-center text-muted-foreground text-sm">
            No completed events yet.
          </div>
        ) : (
          <div className="grid gap-4">
            {sorted.map((entry, i) => {
              const badge = entry.result ? resultLabel(entry.result.rank) : null;
              return (
                <div key={i} className="card p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Link to={`/events/${entry.event!.slug}`} className="h3 uppercase hover:text-primary transition-colors">
                          {entry.event!.name}
                        </Link>
                        <RoleBadge role={entry.role} />
                        {badge && (
                          <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${badge.cls}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                      {entry.teamName && (
                        <p className="text-sm text-muted-foreground">Team {entry.teamName}</p>
                      )}
                      {entry.result && (
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="inline-flex items-center gap-1 text-[#f9a826]">
                            <Trophy size={14} /> #{entry.result.rank}
                          </span>
                          <span className="inline-flex items-center gap-1 text-primary">
                            <Star size={14} /> {entry.result.avg_rating.toFixed(1)} ({entry.result.rating_count} votes)
                          </span>
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
                        ) : (
                          <span className="text-sm text-foreground">{entry.result.title}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuilderProfilePage;
