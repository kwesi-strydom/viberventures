import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Trophy, Star, Calendar, Upload, Compass, Users, Shuffle, AtSign, Hash, Linkedin, Pencil, Globe, ExternalLink } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import Countdown from '@/components/Countdown';

interface EventInfo {
  id: number;
  edition: number;
  name: string;
  slug: string;
  location?: string | null;
  status: 'upcoming' | 'live' | 'past';
  startDate?: string | null;
  competitorCap?: number | null;
  competitorCount?: number;
}

interface Participation {
  id: number;
  role: 'competitor' | 'spectator';
  teamName?: string | null;
  paymentStatus: 'none' | 'pending' | 'paid';
  paymentMethod?: string | null;
  eventId: number;
}

interface ResultInfo {
  rank: number;
  title: string;
  avg_rating: number;
  rating_count: number;
  thumbnail_url?: string | null;
  game_url?: string | null;
}

interface DashboardEntry {
  participation: Participation;
  event: EventInfo | null;
  result: ResultInfo | null;
}

interface DashboardData {
  user: {
    id: number;
    name: string;
    email: string;
    username?: string | null;
    avatarUrl?: string | null;
    discordAvatar?: string | null;
    tagline?: string | null;
    twitter?: string | null;
    instagram?: string | null;
    linkedin?: string | null;
    profilePublic?: boolean | null;
    userType?: string;
    edition?: number | null;
    flag?: string | null;
    country?: string | null;
  };
  participations: DashboardEntry[];
}

const RoleBadge = ({ role }: { role: string }) => (
  <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${
    role === 'competitor' ? 'border-primary/40 text-primary bg-primary/5' : 'border-border text-muted-foreground bg-white/5'
  }`}>
    {role}
  </span>
);

const resultLabel = (rank: number) => {
  if (rank === 1) return { label: 'Champion', cls: 'border-[#f9a826]/40 text-[#f9a826] bg-[#f9a826]/10' };
  if (rank <= 4) return { label: 'Finalist', cls: 'border-primary/40 text-primary bg-primary/10' };
  return { label: 'Competed', cls: 'border-border text-muted-foreground bg-white/5' };
};

// Resize an image file down to a small square data URL for avatar storage.
function fileToAvatarDataUrl(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('no canvas'));
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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

const PaymentBadge = ({ status }: { status: string }) => {
  if (status === 'paid') return <span className="text-xs font-semibold uppercase tracking-wider text-pos">Paid</span>;
  if (status === 'pending') return <span className="text-xs font-semibold uppercase tracking-wider text-[#f9a826]">Payment pending</span>;
  return null;
};

const MePage = () => {
  const { user, isLoading: authLoading, login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [switchingId, setSwitchingId] = useState<number | null>(null);

  const switchToCompetitor = async (slug: string, participationId: number) => {
    setSwitchingId(participationId);
    try {
      await apiRequest(`/api/events/${slug}/join`, {
        method: 'POST',
        body: JSON.stringify({ role: 'competitor' }),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/me/dashboard'] });
      navigate('/onboarding');
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message.replace(/^\d+:\s*/, '') : '';
      toast({
        title: 'Could not switch to competitor',
        description: msg.includes('full') ? 'All competitor spots are taken.' : undefined,
        variant: 'destructive',
      });
    } finally {
      setSwitchingId(null);
    }
  };

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['/api/me/dashboard'],
    enabled: !!user,
  });

  if (!authLoading && !user) {
    navigate('/get-started');
    return null;
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={32} className="animate-spin text-primary" />
        <span className="kicker">Loading your dashboard</span>
      </div>
    );
  }

  const avatar = data?.user.avatarUrl || data?.user.discordAvatar || null;
  const entries = data?.participations || [];

  const onPick = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      const updated = await apiRequest('/api/me/avatar', {
        method: 'POST',
        body: JSON.stringify({ avatarUrl: dataUrl }),
      });
      login(updated);
      queryClient.invalidateQueries({ queryKey: ['/api/me/dashboard'] });
      toast({ title: 'Avatar updated' });
    } catch {
      toast({ title: 'Upload failed', description: 'Try a smaller image.', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="arena-wrap py-12 md:py-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 mb-10">
        <div className="relative">
          <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-primary bg-card flex items-center justify-center">
            {avatar ? (
              <img src={avatar} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="display text-3xl text-primary">{(user?.name || '?').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <button
            onClick={onPick}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-primary text-black flex items-center justify-center border-2 border-background hover:opacity-90"
            aria-label="Change avatar"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        </div>
        <div className="text-center sm:text-left flex-1">
          <span className="kicker text-primary block mb-2">My dashboard</span>
          <h1 className="display uppercase" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', lineHeight: 1 }}>
            {user?.name}
          </h1>
          <p className="text-muted-foreground mt-1">{data?.user.email}</p>
          {data?.user.tagline && (
            <p className="text-muted-foreground mt-1 italic">"{data.user.tagline}"</p>
          )}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
            {data?.user.twitter && (
              <a href={`https://twitter.com/${data.user.twitter.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-xs text-primary hover:border-primary/40 transition">
                <AtSign size={12} /> {data.user.twitter}
              </a>
            )}
            {data?.user.instagram && (
              <a href={`https://instagram.com/${data.user.instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-xs text-primary hover:border-primary/40 transition">
                <Hash size={12} /> {data.user.instagram}
              </a>
            )}
            {data?.user.linkedin && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-xs text-primary">
                <Linkedin size={12} /> LinkedIn
              </span>
            )}
            <Link to="/me/profile" className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition">
              <Pencil size={12} /> Edit profile
            </Link>
            {data?.user.userType === 'competitor' && (data?.user.edition ?? 0) >= 5 && data?.user.profilePublic !== false && (
              <Link to={`/builders/${data?.user.username || data?.user.id}`} className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition">
                <Globe size={12} /> View public profile
              </Link>
            )}
          </div>
        </div>
        <Link to="/events" className="btn btn-primary btn-lg">
          <Compass size={16} className="mr-2" />
          Find an event
        </Link>
      </div>

      {/* My VIBER record */}
      {entries.some(e => e.event?.status === 'past' && e.participation.role === 'competitor') && (
        <div className="mb-10">
          <h2 className="h3 uppercase mb-4">My Viber record</h2>
          <div className="grid gap-4">
            {entries
              .filter(e => e.event?.status === 'past' && e.participation.role === 'competitor')
              .sort((a, b) => (b.event?.edition ?? 0) - (a.event?.edition ?? 0))
              .map(({ participation, event, result }) => {
                const badge = result ? resultLabel(result.rank) : null;
                return (
                  <div key={participation.id} className="card p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Link to={`/events/${event!.slug}`} className="h3 uppercase hover:text-primary transition-colors">
                            {event!.name}
                          </Link>
                          <RoleBadge role={participation.role} />
                          {badge && (
                            <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${badge.cls}`}>
                              {badge.label}
                            </span>
                          )}
                        </div>
                        {participation.teamName && (
                          <p className="text-sm text-muted-foreground">Team {participation.teamName}</p>
                        )}
                        {result && (
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="inline-flex items-center gap-1 text-[#f9a826]">
                              <Trophy size={14} /> #{result.rank}
                            </span>
                            <span className="inline-flex items-center gap-1 text-primary">
                              <Star size={14} /> {result.avg_rating.toFixed(1)} ({result.rating_count} votes)
                            </span>
                          </div>
                        )}
                      </div>
                      {result && (
                        <div className="sm:w-44 shrink-0">
                          {result.thumbnail_url && (
                            <img src={result.thumbnail_url} alt={result.title} className="w-full h-24 object-cover rounded-md border border-border mb-2" />
                          )}
                          {result.game_url ? (
                            <a href={result.game_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                              {result.title} <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span className="text-sm text-foreground">{result.title}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Events */}
      <h2 className="h3 uppercase mb-4">My events</h2>

      {entries.length === 0 ? (
        <div className="card text-center py-16">
          <Calendar size={40} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="h3 uppercase mb-2">No events yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            You haven't joined any Viber events yet. Find an upcoming event and join as a
            competitor or a spectator.
          </p>
          <Link to="/events" className="btn btn-primary btn-lg">
            <Compass size={16} className="mr-2" />
            Find an event
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {entries.map(({ participation, event, result }) => {
            const isUpcoming = event?.status === 'upcoming';
            const cap = event?.competitorCap ?? null;
            const spotsLeft = cap != null ? Math.max(0, cap - (event?.competitorCount ?? 0)) : null;
            const isFull = spotsLeft != null && spotsLeft <= 0;
            const showCompetitorWaitingRoom = isUpcoming && participation.role === 'competitor' && !!event?.startDate;
            const showSwitch = isUpcoming && participation.role === 'spectator';
            return (
            <div key={participation.id} className="card">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="h3 uppercase">{event?.name || `Edition ${participation.eventId}`}</h3>
                    {event && <StatusBadge status={event.status} />}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <RoleBadge role={participation.role} />
                    {participation.teamName && <span>Team: {participation.teamName}</span>}
                    {event?.location && <span>{event.location}</span>}
                    <PaymentBadge status={participation.paymentStatus} />
                  </div>
                </div>

                {result ? (
                  <div className="flex items-center gap-6 md:border-l md:border-border md:pl-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-[#f9a826]">
                        <Trophy size={16} />
                        <span className="display text-2xl">#{result.rank}</span>
                      </div>
                      <span className="mono-label">Rank</span>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-primary">
                        <Star size={16} />
                        <span className="display text-2xl">{result.avg_rating.toFixed(1)}</span>
                      </div>
                      <span className="mono-label">{result.rating_count} votes</span>
                    </div>
                  </div>
                ) : null}

                {event && (
                  <Link to={`/events/${event.slug}`} className="btn btn-ghost md:ml-2">
                    View
                  </Link>
                )}
              </div>

              {showCompetitorWaitingRoom && (
                <div className="mt-5 pt-5 border-t border-border">
                  <Countdown target={event!.startDate!} label="Event starts in" className="mb-4" />
                  <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-4">
                    <Shuffle size={18} className="text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground text-sm mb-1">You're in the waiting room</p>
                      <p className="text-sm text-muted-foreground">
                        Your team and teammate are assigned at random on the day of the event,
                        right before kickoff, using the team randomizer. Sit tight — there's nothing
                        to set up until then.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {showSwitch && (
                <div className="mt-5 pt-5 border-t border-border flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-start gap-2 flex-1">
                    <Users size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      {isFull
                        ? `Want to compete instead? All ${cap} competitor spots are taken.`
                        : `Changed your mind? Switch to competing and build an app live.${spotsLeft != null ? ` ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left.` : ''}`}
                    </p>
                  </div>
                  {!isFull && event && (
                    <button
                      onClick={() => switchToCompetitor(event.slug, participation.id)}
                      disabled={switchingId === participation.id}
                      className="btn btn-ghost border border-primary/40 text-primary shrink-0"
                    >
                      {switchingId === participation.id ? 'Please wait…' : 'Switch to competitor'}
                    </button>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MePage;
