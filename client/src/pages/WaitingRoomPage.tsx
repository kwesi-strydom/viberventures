import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Users, ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

interface CompetitorCard {
  id: number;
  username?: string | null;
  name: string;
  country?: string | null;
  flag?: string | null;
  tagline?: string | null;
  avatarUrl?: string | null;
  teamName?: string | null;
  profilePublic?: boolean;
}

const V5_START = new Date('2026-07-24T19:00:00+08:00').getTime();

function fmtClock(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const WaitingRoomPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: competitors, isLoading: compLoading } = useQuery<CompetitorCard[]>({
    queryKey: ['/api/v5/competitors'],
    refetchInterval: 8000,
  });

  // Poll my-team every 8s — when team is assigned, auto-transition to reveal
  const { data: myTeam } = useQuery<{ teamName?: string | null }>({
    queryKey: ['/api/my-team'],
    refetchInterval: 8000,
    enabled: !!user,
  });

  useEffect(() => {
    if (myTeam?.teamName) {
      navigate('/v5/my-team', { replace: true });
    }
  }, [myTeam?.teamName, navigate]);

  const countdown = V5_START - now;

  return (
    <div className="arena-wrap py-10 md:py-14">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <span className="kicker text-primary block mb-1">VIBER 5 · Waiting Room</span>
          <h1 className="display uppercase" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.6rem)', lineHeight: 1 }}>
            Competitors
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {competitors?.length ?? 0} builders registered. Teams assigned live at kickoff.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="mono-label mb-1">Event starts in</p>
          <p className="font-mono font-bold text-2xl tabular-nums text-foreground">{fmtClock(countdown)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Asia/Kuala Lumpur · Jul 24, 19:00</p>
        </div>
      </div>

      {compLoading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 size={24} className="animate-spin text-primary" />
          <span className="text-muted-foreground">Loading competitors...</span>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {competitors?.map(c => {
            const inner = (
              <>
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-full overflow-hidden border border-border bg-card shrink-0 flex items-center justify-center">
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="display text-lg text-primary">{(c.name || '?').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground truncate">{c.name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>{c.flag || ''}</span>
                      <span className="truncate">{c.country || ''}</span>
                    </div>
                    {c.tagline && <p className="text-xs text-muted-foreground truncate mt-0.5">{c.tagline}</p>}
                  </div>
                </div>
                {c.teamName && (
                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-1 text-xs text-primary font-semibold">
                    <Users size={12} />
                    {c.teamName}
                  </div>
                )}
              </>
            );
            return c.profilePublic !== false ? (
               <Link key={c.id} to={`/builders/${encodeURIComponent(c.username || String(c.id))}`} className="card p-4 hover:border-primary/40 transition group">
                {inner}
              </Link>
            ) : (
              <div key={c.id} className="card p-4">
                {inner}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link to="/me/profile" className="btn btn-ghost border border-border text-muted-foreground hover:text-foreground">
          Edit my profile
        </Link>
      </div>
    </div>
  );
};

export default WaitingRoomPage;
