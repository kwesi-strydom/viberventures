import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import AstanaLayout, { LoadState, Notice } from '@/components/astana/AstanaLayout';
import AstanaTeamDraw from '@/components/astana/AstanaTeamDraw';
import JudgingPanel from '@/components/astana/JudgingPanel';
import ProjectCard from '@/components/astana/ProjectCard';
import { astanaRequest, useAstana, useRefreshAstana, useRosterSelection } from '@/hooks/useAstana';
import type { AdminState } from '@shared/astana';
import { apiRequest } from '@/lib/queryClient';

export default function AstanaAdmin() {
  const admin = useAstana<AdminState>('/admin');
  const refresh = useRefreshAstana();
  const [tab, setTab] = useState('Check-in');
  const [qr, setQr] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recovery, setRecovery] = useState('');
  const [moves, setMoves] = useRosterSelection<Record<string, string>>(admin.data?.rosterRevision ?? -1, {});
  const [rotate, setRotate] = useRosterSelection<string[]>(admin.data?.rosterRevision ?? -1, []);
  const joinUrl = `${window.location.origin}/astana/join`;

  useEffect(() => {
    QRCode.toDataURL(joinUrl, { width: 520, margin: 3, errorCorrectionLevel: 'M' })
      .then(setQr)
      .catch(() => setError('Could not generate QR. Use the check-in link below.'));
  }, [joinUrl]);

  async function action(path: string, body: unknown) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await astanaRequest(path, 'POST', body);
      await refresh();
      setMessage('Saved.');
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function recover(id: string) {
    setBusy(true);
    setError('');
    setRecovery('');
    try {
      const result = await astanaRequest<{ recoveryPath: string }>(`/admin/recover/${id}`, 'POST');
      setRecovery(`${window.location.origin}${result.recoveryPath}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function linkArena() {
    setBusy(true);
    setError('');
    try {
      await apiRequest('/api/admin/dashboard/event', {
        method: 'POST',
        body: JSON.stringify({ action: 'set-event', eventId: admin.data!.eventId }),
      });
      await apiRequest('/api/admin/dashboard/event', {
        method: 'POST',
        body: JSON.stringify({ action: 'set-duration', durationSeconds: 3600 }),
      });
      setMessage('Arena connected to Astana. Open the timer controls when the room is ready.');
    } catch {
      setError('Could not connect the arena. Check the dashboard controls and retry.');
    } finally {
      setBusy(false);
    }
  }

  const state = admin.data;
  return (
    <AstanaLayout>
      <h1>Run the room.</h1>
      <p className="astana-lead">Viber Astana organizer console</p>
      {admin.isLoading || admin.error ? (
        <>
          <LoadState error={admin.error} />
          {admin.error && <Link className="btn" to="/login">Admin sign in</Link>}
        </>
      ) : state && (
        <>
          <div className="astana-tabs" role="tablist" aria-label="Organizer sections">
            {['Check-in', 'Teams', 'Projects & judges'].map(section => (
              <button key={section} className="btn" role="tab" aria-selected={tab === section}
                onClick={() => setTab(section)}>{section}</button>
            ))}
          </div>
          <Notice error message={error} />
          <Notice message={message} />

          {tab === 'Check-in' && (
            <>
              <div className="astana-split">
                <section>
                  <h2>Scan to check in</h2>
                  {qr && <img className="astana-qr" src={qr} alt={`Check in at ${joinUrl}`} />}
                  <a className="astana-link block my-4" href={joinUrl}>{joinUrl}</a>
                  <p className="astana-note">
                    {state.guests.length} checked in · {state.guests.filter(guest => !guest.teamId).length} awaiting a team
                  </p>
                </section>
                <section>
                  <h2>The live arena</h2>
                  <p>Connect tonight’s roster and set the build clock to 60 minutes. Start it from the timer controls.</p>
                  <div className="astana-actions">
                    <button className="btn btn-primary" disabled={busy} onClick={linkArena}>Connect Astana to the arena</button>
                    <Link className="btn" to="/admin/dashboard">Timer controls</Link>
                    <Link className="btn" to="/admin/wheel-of-destiny">Wheel of Destiny</Link>
                    <Link className="btn" to="/dashboard">Public arena</Link>
                  </div>
                  <p className="astana-note">Spin at minutes 10, 20, 30, 40 and 50. At 60 minutes, stop building and begin the 60-second pitches.</p>
                </section>
              </div>
              <section className="astana-section">
                <h2>Checked-in builders</h2>
                {recovery && (
                  <div className="astana-panel">
                    <p>After verifying the builder in person, share this one-use link. It expires in 10 minutes and replaces their previous session.</p>
                    <input aria-label="Recovery link" readOnly value={recovery} onFocus={event => event.target.select()} />
                    <button className="btn mt-3" onClick={() => setRecovery('')}>Hide recovery link</button>
                  </div>
                )}
                {state.guests.length === 0 ? (
                  <p>No builders yet. Display the QR to open check-in.</p>
                ) : state.guests.map(guest => (
                  <div key={guest.id} className="astana-admin-row">
                    <div><strong>{guest.name}</strong><small>{guest.email}</small></div>
                    <span>{state.teams.find(team => team.id === guest.teamId)?.name ?? 'Awaiting team'}</span>
                    <button className="btn" disabled={busy} onClick={() => recover(guest.id)}>Restore access</button>
                  </div>
                ))}
              </section>
            </>
          )}

          {tab === 'Teams' && (
            <>
              <AstanaTeamDraw state={state} busy={busy} setBusy={setBusy}
                onAssigned={async () => { await refresh(); setMessage('Saved.'); }}
                onError={value => { setError(value); setMessage(''); }} />
              <details className="astana-section">
                <summary className="cursor-pointer font-semibold">Manage late arrivals and team changes</summary>
                <p className="astana-note mt-4">Move a builder to a team or create a new one. Use a swap or rotation to resolve disputes without redrawing.</p>
              {state.guests.map(guest => (
                <div key={guest.id} className="astana-admin-row">
                  <div>
                    <strong>{guest.name}</strong>
                    <small>{state.teams.find(team => team.id === guest.teamId)?.name ?? 'Unassigned'}</small>
                  </div>
                  <select aria-label={`Destination for ${guest.name}`} value={moves[guest.id] ?? ''}
                    onChange={event => setMoves(previous => ({ ...previous, [guest.id]: event.target.value }))}>
                    <option value="">Choose destination</option>
                    <option value="new">New team</option>
                    {state.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                  </select>
                  <button className="btn" disabled={busy || !moves[guest.id]}
                    onClick={() => action('/admin/move', {
                      guestId: guest.id,
                      teamId: moves[guest.id] === 'new' ? null : moves[guest.id],
                      rosterRevision: state.rosterRevision,
                    })}>Move builder</button>
                </div>
              ))}
              <section className="astana-section">
                <h2>Founder dispute: swap or rotate</h2>
                <p className="astana-note mb-4">Select one person from each of two or three different teams. They move to the next selected person’s team.</p>
                <div className="astana-members">
                  {state.guests.filter(guest => guest.teamId).map(guest => (
                    <label className="astana-check" key={guest.id}>
                      <input type="checkbox" checked={rotate.includes(guest.id)}
                        disabled={busy || (!rotate.includes(guest.id) && rotate.length === 3)}
                        onChange={() => setRotate(ids => ids.includes(guest.id)
                          ? ids.filter(id => id !== guest.id) : [...ids, guest.id])} />
                      {guest.name} ({state.teams.find(team => team.id === guest.teamId)?.name})
                    </label>
                  ))}
                </div>
                <button className="btn" disabled={busy || rotate.length < 2} onClick={async () => {
                  if (await action('/admin/rotate', { guestIds: rotate, rosterRevision: state.rosterRevision })) setRotate([]);
                }}>Confirm swap / rotation</button>
              </section>
              </details>
            </>
          )}

          {tab === 'Projects & judges' && (
            <>
              <JudgingPanel state={state} />
              <section className="astana-section">
                <h2>{state.projects.length} submitted projects</h2>
                <div className="astana-grid">{state.projects.map(project => <ProjectCard key={project.id} project={project} />)}</div>
                <Link className="astana-link inline-block mt-8" to="/astana/winners">Open public winners page</Link>
              </section>
            </>
          )}
        </>
      )}
    </AstanaLayout>
  );
}