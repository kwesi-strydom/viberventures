import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ArrowLeft, AtSign, Hash, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest } from '@/lib/queryClient';

interface PublicProfile {
  id: number;
  name: string;
  country?: string | null;
  flag?: string | null;
  tagline?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  avatarUrl?: string | null;
  edition?: number | null;
  teamName?: string | null;
}

const CompetitorPublicPage = () => {
  const { id } = useParams<{ id: string }>();

  const { data: profile, isLoading } = useQuery<PublicProfile>({
    queryKey: [`/api/competitors/${id}`],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={32} className="animate-spin text-primary" />
        <span className="kicker">Loading profile</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="arena-wrap py-20 text-center">
        <h2 className="h2 uppercase mb-2">Profile not found</h2>
        <p className="text-muted-foreground mb-6">This competitor doesn't exist or isn't public.</p>
        <Link to="/v5/waiting-room" className="btn btn-primary">Back to waiting room</Link>
      </div>
    );
  }

  return (
    <div className="arena-wrap py-10 md:py-14">
      <Link to="/v5/waiting-room" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-6 transition">
        <ArrowLeft size={14} /> Back to waiting room
      </Link>

      <div className="card p-8 max-w-xl mx-auto">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-28 w-28 rounded-full overflow-hidden border-2 border-primary bg-card flex items-center justify-center mb-4">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="display text-4xl text-primary">{(profile.name || '?').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <h1 className="display uppercase" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', lineHeight: 1 }}>
            {profile.name}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
            <Globe size={14} />
            <span>{profile.flag || ''}</span>
            <span>{profile.country || ''}</span>
          </div>
          {profile.tagline && (
            <p className="text-muted-foreground mt-2 italic">"{profile.tagline}"</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          {profile.twitter && (
            <a href={`https://twitter.com/${profile.twitter.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-sm text-primary hover:border-primary/40 transition">
              <AtSign size={14} /> {profile.twitter}
            </a>
          )}
          {profile.instagram && (
            <a href={`https://instagram.com/${profile.instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-sm text-primary hover:border-primary/40 transition">
              <Hash size={14} /> {profile.instagram}
            </a>
          )}
        </div>

        <div className="flex items-center justify-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded border border-primary/30 text-primary bg-primary/5">
            V{profile.edition ?? 5} Competitor
          </span>
          {profile.teamName && (
            <span className="text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded border border-border text-muted-foreground">
              {profile.teamName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompetitorPublicPage;
