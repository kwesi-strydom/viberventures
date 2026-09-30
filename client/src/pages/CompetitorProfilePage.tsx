import { useRef, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Upload, AtSign, Hash, Type, AlertTriangle, ArrowLeft, Linkedin, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import Countdown from '@/components/Countdown';

interface ProfileUser {
  id: number;
  name: string;
  email: string;
  country?: string | null;
  flag?: string | null;
  avatarUrl?: string | null;
  discordAvatar?: string | null;
  tagline?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  profilePublic?: boolean | null;
  username?: string | null;
  edition?: number | null;
  userType?: string;
}

function fileToAvatarDataUrl(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
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

const CompetitorProfilePage = () => {
  const { user: authUser, isLoading: authLoading, login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tagline, setTagline] = useState('');
  const [twitter, setTwitter] = useState('');
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [profilePublic, setProfilePublic] = useState(true);

  const { data: dashboard, isLoading } = useQuery<{ user: ProfileUser; participations: any[] }>({
    queryKey: ['/api/me/dashboard'],
    enabled: !!authUser,
  });

  useEffect(() => {
    if (!authLoading && !authUser) {
      navigate('/get-started');
    }
  }, [authLoading, authUser, navigate]);

  const profile = dashboard?.user;

  // Populate local state once profile loads
  useEffect(() => {
    if (profile) {
      setTagline(profile.tagline || '');
      setTwitter(profile.twitter || '');
      setInstagram(profile.instagram || '');
      setLinkedin(profile.linkedin || '');
      setProfilePublic(profile.profilePublic !== false);
    }
  }, [profile]);

  if (authLoading || (!authLoading && !authUser)) {
    return null;
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={32} className="animate-spin text-primary" />
        <span className="kicker">Loading profile</span>
      </div>
    );
  }

  const user = profile ?? authUser;
  if (!user) return null;

  const avatar = user.avatarUrl || user.discordAvatar || null;
  const needsSocials = profile ? !profile.twitter && !profile.instagram : false;

  const onPick = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      const updated = await apiRequest('/api/me/avatar', { method: 'POST', body: JSON.stringify({ avatarUrl: dataUrl }) });
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

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updated = await apiRequest('/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          tagline: tagline.trim() || null,
          twitter: twitter.trim() || null,
          instagram: instagram.trim() || null,
          linkedin: linkedin.trim() || null,
          profilePublic,
        }),
      });
      login(updated);
      queryClient.invalidateQueries({ queryKey: ['/api/me/dashboard'] });
      toast({ title: 'Profile saved' });
    } catch {
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="arena-wrap py-10 md:py-14">
      <Link to="/me" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-6 transition">
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      {needsSocials && (
        <div className="mb-6 rounded-md border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground text-sm">Add your social handle</p>
            <p className="text-sm text-muted-foreground">Competitors need a Twitter or Instagram handle for the event. Fill at least one below.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 mb-8">
        <div className="relative">
          <div className="h-28 w-28 rounded-full overflow-hidden border-2 border-primary bg-card flex items-center justify-center">
            {avatar ? (
              <img src={avatar} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="display text-4xl text-primary">{(user.name || '?').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <button onClick={onPick} disabled={uploading} className="absolute -bottom-1 -right-1 h-10 w-10 rounded-full bg-primary text-black flex items-center justify-center border-2 border-background hover:opacity-90" aria-label="Change avatar">
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        </div>
        <div className="text-center sm:text-left flex-1">
          <span className="kicker text-primary block mb-1">V5 Competitor</span>
          <h1 className="display uppercase" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.6rem)', lineHeight: 1 }}>{user.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
            <span>{(user as any).flag || ''}</span>
            <span>{(user as any).country || ''}</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="mono-label mb-2 block">Tagline</label>
          <div className="relative">
            <Type size={16} className="absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              placeholder="One-line bio..."
              className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              maxLength={120}
            />
          </div>
        </div>
        <div>
          <label className="mono-label mb-2 block">Twitter / X</label>
          <div className="relative">
            <AtSign size={16} className="absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              value={twitter}
              onChange={e => setTwitter(e.target.value)}
              placeholder="@handle"
              className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              maxLength={60}
            />
          </div>
        </div>
        <div>
          <label className="mono-label mb-2 block">Instagram</label>
          <div className="relative">
            <Hash size={16} className="absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              value={instagram}
              onChange={e => setInstagram(e.target.value)}
              placeholder="@handle"
              className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              maxLength={60}
            />
          </div>
        </div>
        <div>
          <label className="mono-label mb-2 block">LinkedIn</label>
          <div className="relative">
            <Linkedin size={16} className="absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              value={linkedin}
              onChange={e => setLinkedin(e.target.value)}
              placeholder="linkedin.com/in/you or handle"
              className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              maxLength={120}
            />
          </div>
        </div>
      </div>

      <div className="card p-4 mb-8 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          {profilePublic ? <Eye size={18} className="text-primary shrink-0 mt-0.5" /> : <EyeOff size={18} className="text-muted-foreground shrink-0 mt-0.5" />}
          <div>
            <p className="font-semibold text-foreground text-sm">Public builder profile</p>
            <p className="text-sm text-muted-foreground">
              {profilePublic
                ? 'Anyone can view your builder page with your photo, tagline, socials and Viber record.'
                : 'Your builder page is hidden. Your name won\u2019t link anywhere on the site.'}
            </p>
          </div>
        </div>
        <button
          role="switch"
          aria-checked={profilePublic}
          onClick={() => setProfilePublic(v => !v)}
          className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${profilePublic ? 'bg-primary' : 'bg-border'}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform ${profilePublic ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={saveProfile} disabled={saving} className="btn btn-primary">
          {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
          Save profile
        </button>
        <Link to="/v5/waiting-room" className="btn btn-ghost border border-primary/40 text-primary">
          Go to waiting room
        </Link>
      </div>

      {/* My competitions */}
      <div className="mt-12">
        <h2 className="h3 uppercase mb-4">My competitions</h2>
        <div className="card p-5 flex items-center justify-between">
          <div>
            <h3 className="h3 uppercase text-foreground">VIBER 5</h3>
            <p className="text-sm text-muted-foreground mt-0.5">July 24, 2026 · Network School</p>
          </div>
          <div className="flex items-center gap-3">
            <Countdown target="2026-07-24T19:00:00+08:00" label="Starts in" />
            <Link to="/v5/waiting-room" className="btn btn-ghost border border-primary/40 text-primary shrink-0">
              Waiting room →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompetitorProfilePage;
