import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Trophy, Star, Calendar, Upload, Compass } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface EventInfo {
  id: number;
  edition: number;
  name: string;
  slug: string;
  location?: string | null;
  status: 'upcoming' | 'live' | 'past';
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
}

interface DashboardEntry {
  participation: Participation;
  event: EventInfo | null;
  result: ResultInfo | null;
}

interface DashboardData {
  user: { id: number; name: string; email: string; avatarUrl?: string | null; discordAvatar?: string | null };
  participations: DashboardEntry[];
}

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
          <p className="text-muted-foreground mt-1">{user?.email}</p>
        </div>
        <Link to="/events" className="btn btn-primary btn-lg">
          <Compass size={16} className="mr-2" />
          Find an event
        </Link>
      </div>

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
          {entries.map(({ participation, event, result }) => (
            <div key={participation.id} className="card flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="h3 uppercase">{event?.name || `Edition ${participation.eventId}`}</h3>
                  {event && <StatusBadge status={event.status} />}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="uppercase tracking-wider font-semibold text-foreground">
                    {participation.role}
                  </span>
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
          ))}
        </div>
      )}
    </div>
  );
};

export default MePage;
