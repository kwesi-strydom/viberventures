import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Link } from 'react-router-dom';
import { Trash2, Edit2, Check, X, Shield, Zap, QrCode, Lock, Unlock, ExternalLink, UserX, Database, Sprout, Users, Eye, Calendar, GraduationCap, Plus, Save, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User, OnboardingRecord } from '@shared/schema';
import { COUNTRIES, SHIRT_SIZES, countryFlag } from '@/lib/countries';

type SafeUser = Omit<User, 'password'>;

const CURRENT_EDITION = 5;

interface OnboardingRow {
  key: string;
  id: number;
  name: string;
  email: string;
  discordId: string | null;
  discordUsername: string | null;
  discordAvatar: string | null;
  country: string | null;
  shirtSize: string | null;
  paymentMethod: string | null;
  shirtPaid: boolean | null;
  onboarded: boolean | null;
  readOnly: boolean;
}

interface TeamMember {
  id: number;
  name: string;
  discordId: string | null;
  discordAvatar: string | null;
}

interface AdminTeam {
  id: number;
  slug: string;
  name: string;
  nameChanged: boolean;
  memberCount: number;
  members: TeamMember[];
}

interface AdminEvent {
  id: number;
  edition: number;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  status: string;
  startDate: string | null;
  thumbnailUrl: string | null;
  recapUrl: string | null;
  videoUrl: string | null;
  registrationUrl: string | null;
  entryFeeCents: number;
  currency: string;
  competitorCount: number;
  spectatorCount: number;
}

interface AdminWorkshop {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  date: string | null;
  dateDisplay: string | null;
  location: string | null;
  thumbnailUrl: string | null;
  link: string | null;
  status: string;
  sortOrder: number;
}

const inp = 'bg-card border border-border rounded px-3 py-2 text-foreground text-sm w-full outline-none focus:border-primary';

const AdminPage = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState<'users' | 'teams' | 'onboarding' | 'competitions' | 'workshops' | 'tools'>('users');
  const [search, setSearch] = useState('');
  const [editionFilter, setEditionFilter] = useState(5);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<SafeUser>>({});
  const [renamingSlug, setRenamingSlug] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [eventForm, setEventForm] = useState<Partial<AdminEvent> | null>(null);
  const [workshopForm, setWorkshopForm] = useState<Partial<AdminWorkshop> | null>(null);

  const { data: currentUser } = useQuery<{ user: SafeUser }>({ queryKey: ['/api/auth/user'] });
  const { data: users = [], isLoading } = useQuery<SafeUser[]>({ queryKey: ['/api/admin/users'] });
  const { data: adminTeams = [], isLoading: teamsLoading } = useQuery<AdminTeam[]>({
    queryKey: ['/api/admin/teams'],
    enabled: tab === 'teams',
  });
  const { data: pastOnboardings = [], isLoading: pastLoading } = useQuery<OnboardingRecord[]>({
    queryKey: [`/api/admin/onboardings/${editionFilter}`],
    enabled: tab === 'onboarding' && editionFilter !== CURRENT_EDITION,
  });
  const { data: adminEvents = [], isLoading: eventsLoading } = useQuery<AdminEvent[]>({
    queryKey: ['/api/events'],
    enabled: tab === 'competitions',
  });
  const { data: adminWorkshops = [], isLoading: workshopsLoading } = useQuery<AdminWorkshop[]>({
    queryKey: ['/api/workshops'],
    enabled: tab === 'workshops',
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; data: Partial<SafeUser> }) =>
      apiRequest(`/api/admin/users/${vars.id}`, { method: 'PATCH', body: JSON.stringify(vars.data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] }); setEditingId(null); },
    onError: () => toast({ title: 'Update failed', variant: 'destructive' }),
  });

  const adminRenameMutation = useMutation({
    mutationFn: (vars: { slug: string; newName: string }) =>
      apiRequest(`/api/teams/${vars.slug}/rename`, { method: 'PATCH', body: JSON.stringify({ newName: vars.newName }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teams'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setRenamingSlug(null);
      setRenameValue('');
      toast({ title: 'Team renamed successfully' });
    },
    onError: (err: any) => toast({ title: err?.message || 'Rename failed', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] }),
    onError: () => toast({ title: 'Delete failed', variant: 'destructive' }),
  });

  const clearTeamsMutation = useMutation({
    mutationFn: () => apiRequest('/api/admin/clear-teams', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teams'] });
      toast({ title: 'All team assignments cleared' });
    },
    onError: () => toast({ title: 'Failed to clear teams', variant: 'destructive' }),
  });

  const clearGamesMutation = useMutation({
    mutationFn: () => apiRequest('/api/admin/clear-games', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      toast({ title: 'All apps and ratings cleared' });
    },
    onError: () => toast({ title: 'Failed to clear apps', variant: 'destructive' }),
  });

  const seedGamesMutation = useMutation({
    mutationFn: () => apiRequest('/api/admin/seed-games', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      toast({ title: 'Seed app added successfully' });
    },
    onError: () => toast({ title: 'Failed to seed apps', variant: 'destructive' }),
  });

  const saveEventMutation = useMutation({
    mutationFn: (v: Partial<AdminEvent>) =>
      v.id
        ? apiRequest(`/api/admin/events/${v.id}`, { method: 'PATCH', body: JSON.stringify(v) })
        : apiRequest('/api/admin/events', { method: 'POST', body: JSON.stringify(v) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setEventForm(null);
      toast({ title: 'Competition saved' });
    },
    onError: (e: any) => toast({ title: e?.message || 'Save failed', variant: 'destructive' }),
  });

  const saveWorkshopMutation = useMutation({
    mutationFn: (v: Partial<AdminWorkshop>) =>
      v.id
        ? apiRequest(`/api/admin/workshops/${v.id}`, { method: 'PATCH', body: JSON.stringify(v) })
        : apiRequest('/api/admin/workshops', { method: 'POST', body: JSON.stringify(v) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workshops'] });
      setWorkshopForm(null);
      toast({ title: 'Workshop saved' });
    },
    onError: (e: any) => toast({ title: e?.message || 'Save failed', variant: 'destructive' }),
  });

  const deleteWorkshopMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/workshops/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workshops'] });
      toast({ title: 'Workshop deleted' });
    },
    onError: () => toast({ title: 'Delete failed', variant: 'destructive' }),
  });

  if (!currentUser?.user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center card">
          <Shield className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="h2 text-primary mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.discordUsername || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.teamName || '').toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (user: SafeUser) => {
    setEditingId(user.id);
    setEditForm({ userType: user.userType, teamName: user.teamName || '', teammate: user.teammate || '', isAdmin: user.isAdmin });
  };

  const saveEdit = (id: number) => updateMutation.mutate({ id, data: editForm });

  const competitors = users.filter(u => u.userType === 'competitor');
  const spectators = users.filter(u => u.userType === 'spectator');

  return (
    <div className="arena-wrap py-10">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-8 w-8 text-primary" />
        <h1 className="h1 text-primary">Admin</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(['users', 'teams', 'onboarding', 'competitions', 'workshops', 'tools'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`btn ${tab === t ? 'btn-primary' : 'btn-ghost'}`}>
            {({ users: 'Users', teams: 'Teams', onboarding: 'Onboarding', competitions: 'Competitions', workshops: 'Workshops', tools: 'Tools' } as Record<string, string>)[t]}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <>
          <div className="arena-grid cols-3 mb-6">
            <div className="stat">
              <div className="stat-label flex items-center gap-2"><Users className="w-4 h-4"/> Competitors</div>
              <div className="stat-value">{competitors.length}</div>
            </div>
            <div className="stat">
              <div className="stat-label flex items-center gap-2"><Eye className="w-4 h-4"/> Spectators</div>
              <div className="stat-value">{spectators.length}</div>
            </div>
            <div className="stat">
              <div className="stat-label flex items-center gap-2"><Users className="w-4 h-4"/> Total</div>
              <div className="stat-value">{users.length}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="field flex-1">
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, Discord, or team…"
              />
            </div>
            <button
              onClick={() => { if (confirm('Clear all team assignments for every user?')) clearTeamsMutation.mutate(); }}
              disabled={clearTeamsMutation.isPending}
              className="btn btn-ghost text-destructive border-destructive hover:bg-destructive/10"
            >
              <UserX className="h-4 w-4" />
              {clearTeamsMutation.isPending ? 'Clearing…' : 'Clear Teams'}
            </button>
          </div>

          {isLoading ? (
            <div className="text-center text-muted-foreground py-20">Loading users…</div>
          ) : (
            <div className="panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs uppercase mono-label">
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Team</th>
                      <th className="px-4 py-3">Flags</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((user) => {
                      const isEditing = editingId === user.id;
                      return (
                        <tr key={user.id} className="border-b border-border hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {user.discordAvatar ? (
                                <img src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.discordAvatar}.png?size=32`}
                                  className="h-8 w-8 rounded-sm" alt="" />
                              ) : (
                                <div className="h-8 w-8 rounded-sm bg-card border border-border flex items-center justify-center text-xs text-muted-foreground">
                                  {user.name[0]?.toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="text-foreground font-bold">{user.name}</div>
                                <div className="text-muted-foreground text-xs font-mono">{user.discordUsername ? `@${user.discordUsername}` : user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <select value={editForm.userType || ''} onChange={e => setEditForm(f => ({ ...f, userType: e.target.value }))}
                                className="bg-card border border-border rounded px-2 py-1 text-foreground text-sm font-mono">
                                <option value="spectator">Spectator</option>
                                <option value="competitor">Competitor</option>
                              </select>
                            ) : (
                              <span className={`badge ${user.userType === 'competitor' ? 'badge-fill' : ''}`}>
                                {user.userType}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input value={editForm.teamName || ''} onChange={e => setEditForm(f => ({ ...f, teamName: e.target.value }))}
                                placeholder="Team name"
                                className="bg-card border border-border rounded px-2 py-1 text-foreground text-sm w-32 font-mono" />
                            ) : (
                              user.teamName ? (
                                <span className="badge">{user.teamName}</span>
                              ) : <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {user.nsVerified && <span className="badge">NS</span>}
                              {user.isAdmin && <span className="badge">Admin</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              {isEditing ? (
                                <>
                                  <button onClick={() => saveEdit(user.id)} className="p-2 rounded bg-card hover:bg-primary/20 text-primary transition-colors">
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => setEditingId(null)} className="p-2 rounded bg-card hover:bg-white/10 text-muted-foreground transition-colors">
                                    <X className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startEdit(user)} className="p-2 rounded bg-card hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => { if (confirm(`Delete ${user.name}?`)) deleteMutation.mutate(user.id); }}
                                    className="p-2 rounded bg-card hover:bg-destructive/20 text-destructive transition-colors">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="text-center text-muted-foreground py-10">No users match your search.</div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'teams' && (
        <div>
          {teamsLoading ? (
            <div className="text-center text-muted-foreground py-20">Loading teams…</div>
          ) : adminTeams.length === 0 ? (
            <div className="text-center text-muted-foreground py-20">No teams found. Assign teams to competitors first.</div>
          ) : (
            <div className="panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs uppercase mono-label">
                      <th className="px-4 py-3">Team Name</th>
                      <th className="px-4 py-3">Slug</th>
                      <th className="px-4 py-3">Members</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminTeams.map((team) => {
                      const isRenaming = renamingSlug === team.slug;
                      return (
                        <tr key={team.slug} className="border-b border-border hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 text-foreground font-bold">{team.name}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground font-mono text-sm">{team.slug}</span>
                              <Link to={`/team/${team.slug}`} target="_blank" className="text-muted-foreground hover:text-primary transition-colors">
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {team.members.length === 0 ? (
                              <span className="text-muted-foreground text-sm">No members</span>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                {team.members.map(m => (
                                  <div key={m.id} className="flex items-center gap-2">
                                    {m.discordId && m.discordAvatar ? (
                                      <img
                                        src={`https://cdn.discordapp.com/avatars/${m.discordId}/${m.discordAvatar}.png?size=32`}
                                        alt={m.name}
                                        className="w-6 h-6 rounded-full object-cover border border-border shrink-0"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                                        {m.name.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <span className="text-foreground text-sm whitespace-nowrap">{m.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {team.nameChanged ? (
                              <div className="flex items-center gap-1.5">
                                <Lock className="h-4 w-4 text-primary" />
                                <span className="text-primary text-xs font-bold uppercase">Locked</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Unlock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground text-xs font-bold uppercase">Open</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              {isRenaming ? (
                                <>
                                  <input
                                    value={renameValue}
                                    onChange={e => setRenameValue(e.target.value)}
                                    placeholder="New name"
                                    className="bg-card border border-border rounded px-2 py-1 text-foreground text-sm font-mono w-32"
                                    autoFocus
                                    onKeyDown={e => {
                                      if (e.key === 'Enter' && renameValue.trim()) adminRenameMutation.mutate({ slug: team.slug, newName: renameValue });
                                      if (e.key === 'Escape') { setRenamingSlug(null); setRenameValue(''); }
                                    }}
                                  />
                                  <button
                                    onClick={() => { if (renameValue.trim()) adminRenameMutation.mutate({ slug: team.slug, newName: renameValue }); }}
                                    disabled={!renameValue.trim() || adminRenameMutation.isPending}
                                    className="p-2 rounded bg-card text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => { setRenamingSlug(null); setRenameValue(''); }} className="p-2 rounded bg-card text-muted-foreground hover:bg-white/10 transition-colors">
                                    <X className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => { setRenamingSlug(team.slug); setRenameValue(team.name); }}
                                  className="btn btn-sm btn-ghost"
                                >
                                  <Edit2 className="h-3 w-3" /> Rename
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'onboarding' && (() => {
        const editionName = (ed: number) =>
          ed === 0 ? 'FIFA World Cup' : `Viber ${ed}${ed === CURRENT_EDITION ? ' (Current)' : ''}`;
        const isPast = editionFilter !== CURRENT_EDITION;
        const liveRows: OnboardingRow[] = competitors
          .filter(u => (u.edition ?? CURRENT_EDITION) === editionFilter)
          .map(u => ({
            key: `live-${u.id}`, id: u.id, name: u.name, email: u.email,
            discordId: u.discordId, discordUsername: u.discordUsername, discordAvatar: u.discordAvatar,
            country: u.country, shirtSize: u.shirtSize, paymentMethod: u.paymentMethod,
            shirtPaid: u.shirtPaid, onboarded: u.onboarded, readOnly: false,
          }));
        const pastRows: OnboardingRow[] = pastOnboardings.map(o => ({
          key: `past-${o.id}`, id: o.userId, name: o.name || '—', email: o.email || '',
          discordId: o.discordId, discordUsername: o.discordUsername, discordAvatar: o.discordAvatar,
          country: o.country, shirtSize: o.shirtSize, paymentMethod: o.paymentMethod,
          shirtPaid: o.shirtPaid, onboarded: o.onboarded, readOnly: true,
        }));
        const useSnapshot = isPast && (pastLoading || pastRows.length > 0);
        const editionRows = useSnapshot ? pastRows : liveRows;
        const onboardingFiltered = editionRows.filter(r =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          (r.country || '').toLowerCase().includes(search.toLowerCase()) ||
          (r.discordUsername || '').toLowerCase().includes(search.toLowerCase())
        );
        const completed = editionRows.filter(r => r.onboarded).length;
        const paidCount = editionRows.filter(r => r.shirtPaid).length;
        const outstanding = (completed - paidCount) * 25;
        const rowsLoading = useSnapshot ? pastLoading : isLoading;
        return (
          <>
            <div className="flex items-center gap-3 mb-6">
              <span className="mono-label">Viber Edition:</span>
              <div className="flex gap-2">
                {[5, 4, 0].map(ed => (
                  <button key={ed} onClick={() => setEditionFilter(ed)}
                    className={`btn btn-sm ${editionFilter === ed ? 'btn-primary' : 'btn-ghost'}`}>
                    {editionName(ed)}
                  </button>
                ))}
              </div>
            </div>

            <div className="arena-grid cols-3 mb-6">
              <div className="stat">
                <div className="stat-label">Onboarded</div>
                <div className="stat-value">{completed}<span className="text-muted-foreground text-2xl">/{editionRows.length}</span></div>
              </div>
              <div className="stat">
                <div className="stat-label">Shirts Paid</div>
                <div className="stat-value text-pos">{paidCount}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Outstanding</div>
                <div className="stat-value text-neg">${outstanding}</div>
              </div>
            </div>

            {useSnapshot && (
              <div className="card border-primary/50 bg-primary/10 text-primary flex items-center gap-3 mb-6">
                <Lock className="h-5 w-5" />
                <span>Viewing the <strong>{editionName(editionFilter)}</strong> historical roster — read only.</span>
              </div>
            )}

            <div className="field mb-6">
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search competitors by name, country, or Discord…"
              />
            </div>

            {rowsLoading ? (
              <div className="text-center text-muted-foreground py-20">Loading competitors…</div>
            ) : onboardingFiltered.length === 0 ? (
              <div className="text-center text-muted-foreground py-20">No competitors found.</div>
            ) : (
              <div className="panel overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs uppercase mono-label">
                        <th className="px-4 py-3">Competitor</th>
                        <th className="px-4 py-3">Country</th>
                        <th className="px-4 py-3">Shirt Size</th>
                        <th className="px-4 py-3">Payment Method</th>
                        <th className="px-4 py-3">Shirt ($25)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {onboardingFiltered.map((row) => (
                        <tr key={row.key} className="border-b border-border hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {row.discordAvatar ? (
                                <img src={`https://cdn.discordapp.com/avatars/${row.discordId}/${row.discordAvatar}.png?size=32`}
                                  className="h-8 w-8 rounded-sm" alt="" />
                              ) : (
                                <div className="h-8 w-8 rounded-sm bg-card border border-border flex items-center justify-center text-xs text-muted-foreground">
                                  {row.name[0]?.toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="text-foreground font-bold flex items-center gap-2">
                                  {row.name}
                                  {!row.onboarded && <span className="badge">Pending</span>}
                                </div>
                                <div className="text-muted-foreground text-xs font-mono">{row.discordUsername ? `@${row.discordUsername}` : row.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {row.readOnly ? (
                              <span className="text-muted-foreground text-sm font-mono">{row.country ? `${countryFlag(row.country)} ${row.country}` : '—'}</span>
                            ) : (
                              <select
                                value={row.country || ''}
                                onChange={e => updateMutation.mutate({ id: row.id, data: { country: e.target.value } })}
                                className="bg-card border border-border rounded px-2 py-2 text-foreground text-sm font-mono max-w-[10rem] outline-none focus:border-primary"
                              >
                                <option value="">— {countryFlag(row.country)}</option>
                                {COUNTRIES.map(c => (
                                  <option key={c.name} value={c.name}>{c.flag} {c.name}</option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.readOnly ? (
                              <span className="text-muted-foreground text-sm font-mono">{row.shirtSize || '—'}</span>
                            ) : (
                              <select
                                value={row.shirtSize || ''}
                                onChange={e => updateMutation.mutate({ id: row.id, data: { shirtSize: e.target.value } })}
                                className="bg-card border border-border rounded px-2 py-2 text-foreground text-sm font-mono outline-none focus:border-primary"
                              >
                                <option value="">—</option>
                                {SHIRT_SIZES.map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.readOnly ? (
                              <span className="text-muted-foreground text-sm font-mono">{row.paymentMethod === 'cash' ? 'Cash' : row.paymentMethod === 'crypto' ? 'Crypto' : '—'}</span>
                            ) : (
                              <select
                                value={row.paymentMethod || ''}
                                onChange={e => updateMutation.mutate({ id: row.id, data: { paymentMethod: e.target.value } })}
                                className="bg-card border border-border rounded px-2 py-2 text-foreground text-sm font-mono outline-none focus:border-primary"
                              >
                                <option value="">—</option>
                                <option value="cash">Cash</option>
                                <option value="crypto">Crypto</option>
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.readOnly ? (
                              <span className={`badge ${row.shirtPaid ? 'badge-pos' : 'badge-neg'}`}>
                                {row.shirtPaid ? 'Paid' : 'Not Paid'}
                              </span>
                            ) : (
                              <button
                                onClick={() => updateMutation.mutate({ id: row.id, data: { shirtPaid: !row.shirtPaid } })}
                                className={`badge cursor-pointer hover:opacity-80 transition-opacity ${row.shirtPaid ? 'badge-pos bg-pos/10' : 'badge-neg bg-neg/10'}`}
                              >
                                {row.shirtPaid ? 'Paid' : 'Not Paid'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {tab === 'competitions' && (
        <div>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <p className="text-muted-foreground text-sm max-w-xl">Create and edit competitions. Set an upcoming event's date and registration link; mark old editions <strong>archived</strong> to hide them from the public site without deleting their data.</p>
            <button className="btn btn-primary" onClick={() => setEventForm({ status: 'upcoming', edition: CURRENT_EDITION, entryFeeCents: 0, currency: 'usd' })}>
              <Plus className="h-4 w-4" /> New competition
            </button>
          </div>

          {eventForm && (
            <div className="card mb-6 border-primary/40">
              <h3 className="h3 mb-4">{eventForm.id ? `Edit ${eventForm.name}` : 'New competition'}</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="mono-label block mb-1">Name</label>
                  <input className={inp} value={eventForm.name || ''} onChange={e => setEventForm(f => ({ ...f, name: e.target.value }))} placeholder="Viber 5" /></div>
                <div><label className="mono-label block mb-1">Edition</label>
                  <input type="number" className={inp} value={eventForm.edition ?? ''} onChange={e => setEventForm(f => ({ ...f, edition: Number(e.target.value) }))} /></div>
                <div><label className="mono-label block mb-1">Slug</label>
                  <input className={inp} value={eventForm.slug || ''} onChange={e => setEventForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto from name if blank" /></div>
                <div><label className="mono-label block mb-1">Status</label>
                  <select className={inp} value={eventForm.status || 'upcoming'} onChange={e => setEventForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="upcoming">Upcoming</option>
                    <option value="live">Live</option>
                    <option value="past">Past</option>
                    <option value="archived">Archived (hidden)</option>
                  </select></div>
                <div><label className="mono-label block mb-1">Start date</label>
                  <input type="date" className={inp} value={eventForm.startDate ? String(eventForm.startDate).slice(0, 10) : ''} onChange={e => setEventForm(f => ({ ...f, startDate: e.target.value }))} /></div>
                <div><label className="mono-label block mb-1">Location</label>
                  <input className={inp} value={eventForm.location || ''} onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))} placeholder="Network School" /></div>
                <div><label className="mono-label block mb-1">Entry fee (USD)</label>
                  <input type="number" min="0" className={inp} value={eventForm.entryFeeCents != null ? eventForm.entryFeeCents / 100 : 0} onChange={e => setEventForm(f => ({ ...f, entryFeeCents: Math.round(Number(e.target.value || 0) * 100) }))} /></div>
                <div><label className="mono-label block mb-1">Registration URL (NS)</label>
                  <input className={inp} value={eventForm.registrationUrl || ''} onChange={e => setEventForm(f => ({ ...f, registrationUrl: e.target.value }))} placeholder="https://ns.com/events/…" /></div>
                <div><label className="mono-label block mb-1">Thumbnail URL</label>
                  <input className={inp} value={eventForm.thumbnailUrl || ''} onChange={e => setEventForm(f => ({ ...f, thumbnailUrl: e.target.value }))} /></div>
                <div><label className="mono-label block mb-1">Recap URL</label>
                  <input className={inp} value={eventForm.recapUrl || ''} onChange={e => setEventForm(f => ({ ...f, recapUrl: e.target.value }))} /></div>
                <div><label className="mono-label block mb-1">Video URL</label>
                  <input className={inp} value={eventForm.videoUrl || ''} onChange={e => setEventForm(f => ({ ...f, videoUrl: e.target.value }))} /></div>
                <div className="sm:col-span-2"><label className="mono-label block mb-1">Description</label>
                  <textarea className={inp} rows={3} value={eventForm.description || ''} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))} /></div>
              </div>
              <div className="flex gap-2 mt-4">
                <button className="btn btn-primary" disabled={saveEventMutation.isPending || !eventForm.name?.trim()} onClick={() => saveEventMutation.mutate(eventForm)}>
                  <Save className="h-4 w-4" /> {saveEventMutation.isPending ? 'Saving…' : 'Save'}
                </button>
                <button className="btn btn-ghost" onClick={() => setEventForm(null)}>Cancel</button>
              </div>
            </div>
          )}

          {eventsLoading ? (
            <div className="text-center text-muted-foreground py-20">Loading competitions…</div>
          ) : (
            <div className="panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs uppercase mono-label">
                      <th className="px-4 py-3">Competition</th>
                      <th className="px-4 py-3">Edition</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Players</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...adminEvents].sort((a, b) => b.edition - a.edition).map(ev => (
                      <tr key={ev.id} className="border-b border-border hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Trophy className="h-4 w-4 text-primary shrink-0" />
                            <div>
                              <div className="text-foreground font-bold">{ev.name}</div>
                              <div className="text-muted-foreground text-xs font-mono">/{ev.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono">{ev.edition}</td>
                        <td className="px-4 py-3"><span className={`badge ${ev.status === 'upcoming' || ev.status === 'live' ? 'badge-fill' : ''}`}>{ev.status}</span></td>
                        <td className="px-4 py-3 text-muted-foreground text-sm">{ev.startDate ? new Date(ev.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground text-sm">{ev.competitorCount}c · {ev.spectatorCount}s</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Link to={`/competition/${ev.slug}`} target="_blank" className="p-2 rounded bg-card hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"><ExternalLink className="h-4 w-4" /></Link>
                            <button onClick={() => setEventForm(ev)} className="p-2 rounded bg-card hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {adminEvents.length === 0 && <div className="text-center text-muted-foreground py-10">No competitions yet.</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'workshops' && (
        <div>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <p className="text-muted-foreground text-sm max-w-xl">Manage vibecoding workshops shown on the public Workshops page. Lower sort order appears first.</p>
            <button className="btn btn-primary" onClick={() => setWorkshopForm({ status: 'upcoming', sortOrder: 0 })}>
              <Plus className="h-4 w-4" /> New workshop
            </button>
          </div>

          {workshopForm && (
            <div className="card mb-6 border-primary/40">
              <h3 className="h3 mb-4">{workshopForm.id ? `Edit ${workshopForm.name}` : 'New workshop'}</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="mono-label block mb-1">Name</label>
                  <input className={inp} value={workshopForm.name || ''} onChange={e => setWorkshopForm(f => ({ ...f, name: e.target.value }))} placeholder="Vibecoding Workshop" /></div>
                <div><label className="mono-label block mb-1">Slug</label>
                  <input className={inp} value={workshopForm.slug || ''} onChange={e => setWorkshopForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto from name if blank" /></div>
                <div><label className="mono-label block mb-1">Status</label>
                  <select className={inp} value={workshopForm.status || 'upcoming'} onChange={e => setWorkshopForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="upcoming">Upcoming</option>
                    <option value="past">Past</option>
                  </select></div>
                <div><label className="mono-label block mb-1">Sort order</label>
                  <input type="number" className={inp} value={workshopForm.sortOrder ?? 0} onChange={e => setWorkshopForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} /></div>
                <div><label className="mono-label block mb-1">Date</label>
                  <input type="date" className={inp} value={workshopForm.date ? String(workshopForm.date).slice(0, 10) : ''} onChange={e => setWorkshopForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div><label className="mono-label block mb-1">Date label</label>
                  <input className={inp} value={workshopForm.dateDisplay || ''} onChange={e => setWorkshopForm(f => ({ ...f, dateDisplay: e.target.value }))} placeholder="July 3, 2026" /></div>
                <div><label className="mono-label block mb-1">Location</label>
                  <input className={inp} value={workshopForm.location || ''} onChange={e => setWorkshopForm(f => ({ ...f, location: e.target.value }))} placeholder="Network School" /></div>
                <div><label className="mono-label block mb-1">Link</label>
                  <input className={inp} value={workshopForm.link || ''} onChange={e => setWorkshopForm(f => ({ ...f, link: e.target.value }))} placeholder="https://…" /></div>
                <div className="sm:col-span-2"><label className="mono-label block mb-1">Thumbnail URL</label>
                  <input className={inp} value={workshopForm.thumbnailUrl || ''} onChange={e => setWorkshopForm(f => ({ ...f, thumbnailUrl: e.target.value }))} /></div>
                <div className="sm:col-span-2"><label className="mono-label block mb-1">Description</label>
                  <textarea className={inp} rows={3} value={workshopForm.description || ''} onChange={e => setWorkshopForm(f => ({ ...f, description: e.target.value }))} /></div>
              </div>
              <div className="flex gap-2 mt-4">
                <button className="btn btn-primary" disabled={saveWorkshopMutation.isPending || !workshopForm.name?.trim()} onClick={() => saveWorkshopMutation.mutate(workshopForm)}>
                  <Save className="h-4 w-4" /> {saveWorkshopMutation.isPending ? 'Saving…' : 'Save'}
                </button>
                <button className="btn btn-ghost" onClick={() => setWorkshopForm(null)}>Cancel</button>
              </div>
            </div>
          )}

          {workshopsLoading ? (
            <div className="text-center text-muted-foreground py-20">Loading workshops…</div>
          ) : (
            <div className="panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs uppercase mono-label">
                      <th className="px-4 py-3">Workshop</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminWorkshops.map(w => (
                      <tr key={w.id} className="border-b border-border hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                            <div>
                              <div className="text-foreground font-bold">{w.name}</div>
                              <div className="text-muted-foreground text-xs font-mono">/{w.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-sm">{w.dateDisplay || '—'}</td>
                        <td className="px-4 py-3"><span className={`badge ${w.status === 'upcoming' ? 'badge-fill' : ''}`}>{w.status}</span></td>
                        <td className="px-4 py-3 text-muted-foreground font-mono">{w.sortOrder}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {w.link && <a href={w.link} target="_blank" rel="noopener noreferrer" className="p-2 rounded bg-card hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"><ExternalLink className="h-4 w-4" /></a>}
                            <button onClick={() => setWorkshopForm(w)} className="p-2 rounded bg-card hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="h-4 w-4" /></button>
                            <button onClick={() => { if (confirm(`Delete ${w.name}?`)) deleteWorkshopMutation.mutate(w.id); }} className="p-2 rounded bg-card hover:bg-destructive/20 text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {adminWorkshops.length === 0 && <div className="text-center text-muted-foreground py-10">No workshops yet.</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'tools' && (
        <div className="arena-grid cols-2">
          <div className="card flex flex-col items-start gap-4">
            <Database className="h-8 w-8 text-destructive" />
            <div className="flex-1">
              <h3 className="h3 mb-2">Clear All Apps</h3>
              <p className="text-muted-foreground text-sm mb-6">Delete every submitted app and all ratings. Use before a new competition round.</p>
              <button
                onClick={() => { if (confirm('Delete ALL apps and ratings? This cannot be undone.')) clearGamesMutation.mutate(); }}
                disabled={clearGamesMutation.isPending}
                className="btn border border-destructive text-destructive bg-destructive/10 hover:bg-destructive hover:text-white"
              >
                <Trash2 className="h-4 w-4" />
                {clearGamesMutation.isPending ? 'Clearing…' : 'Clear All Apps'}
              </button>
            </div>
          </div>

          <div className="card flex flex-col items-start gap-4">
            <Sprout className="h-8 w-8 text-pos" />
            <div className="flex-1">
              <h3 className="h3 mb-2">Populate Seed App</h3>
              <p className="text-muted-foreground text-sm mb-6">Add a sample TrumpChat app to demonstrate the gallery. Good for testing before submissions come in.</p>
              <button
                onClick={() => seedGamesMutation.mutate()}
                disabled={seedGamesMutation.isPending}
                className="btn border border-pos text-pos bg-pos/10 hover:bg-pos hover:text-white"
              >
                <Sprout className="h-4 w-4" />
                {seedGamesMutation.isPending ? 'Seeding…' : 'Add Seed App'}
              </button>
            </div>
          </div>

          <Link to="/admin/team-randomizer" className="card hover:border-primary transition-all group block">
            <Zap className="h-8 w-8 text-primary mb-4" />
            <h3 className="h3 mb-2 group-hover:text-primary transition-colors">Team Randomizer</h3>
            <p className="text-muted-foreground text-sm mb-6">Randomly assign competitors into teams with a live animated reveal. Perfect for projecting during the hackathon.</p>
            <span className="mono-label text-primary">Open →</span>
          </Link>

          <Link to="/admin/wheel-of-destiny" className="card hover:border-primary transition-all group block">
            <div className="h-8 w-8 flex items-center justify-center border-2 border-primary rounded-full mb-4">
              <div className="w-4 h-4 bg-primary rounded-full"></div>
            </div>
            <h3 className="h3 mb-2 group-hover:text-primary transition-colors">Wheel of Destiny</h3>
            <p className="text-muted-foreground text-sm mb-6">Spin the wheel to assign calamities to teams — Founders Dispute, Server Crash, Lawsuit and more.</p>
            <span className="mono-label text-primary">Open →</span>
          </Link>

          <Link to="/admin/qr-codes" className="card hover:border-primary transition-all group block">
            <QrCode className="h-8 w-8 text-primary mb-4" />
            <h3 className="h3 mb-2 group-hover:text-primary transition-colors">QR Codes</h3>
            <p className="text-muted-foreground text-sm mb-6">Download QR codes for competitors and audience members to scan at the event.</p>
            <span className="mono-label text-primary">Open →</span>
          </Link>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
