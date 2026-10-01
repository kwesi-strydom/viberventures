import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AstanaLayout, { Notice } from '@/components/astana/AstanaLayout';
import { astanaRequest, useAstana, useRefreshAstana } from '@/hooks/useAstana';
import type { Me } from '@shared/astana';

export default function AstanaJoin() {
  const navigate = useNavigate();
  const refresh = useRefreshAstana();
  const me = useAstana<Me>('/me');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [follow, setFollow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deviceCode, setDeviceCode] = useState('');
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [deviceError, setDeviceError] = useState('');
  const recovering = useRef(false);

  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get('recover');
    if (!value || recovering.current) return;
    recovering.current = true;
    history.replaceState(null, '', window.location.pathname);
    setBusy(true);
    astanaRequest('/recover', 'POST', { token: value })
      .then(() => { refresh(); navigate('/astana/team'); })
      .catch(e => setError(e.message))
      .finally(() => setBusy(false));
  }, [navigate, refresh]);

  async function checkIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await astanaRequest('/join', 'POST', { name, email, followConfirmed: follow });
      await refresh();
      navigate('/astana/team');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function signInWithCode(event: React.FormEvent) {
    event.preventDefault();
    setDeviceBusy(true);
    setDeviceError('');
    try {
      await astanaRequest('/device-login', 'POST', { code: deviceCode });
      await refresh();
      navigate('/astana/team');
    } catch (e) {
      setDeviceError((e as Error).message);
    } finally {
      setDeviceBusy(false);
    }
  }

  return (
    <AstanaLayout>
      <h1>You’re up, builder.</h1>
      <p className="astana-lead mb-8">Check in once, then use a temporary code to sign in on your other devices.</p>
      {me.isLoading ? <p className="astana-note">Checking your sign-in…</p> : me.data?.guest ? (
        <div className="astana-panel">
          <h2>You’re checked in, {me.data.guest.name}.</h2>
          <Link className="btn btn-primary" to="/astana/team">See my team</Link>
        </div>
      ) : (
        <div className="astana-sign-in-options">
          <section className="astana-panel">
            <h2>Already checked in?</h2>
            <p className="astana-note mb-4">On your signed-in device, open My team and generate a temporary sign-in code. Enter it here to add this device; your other device stays signed in.</p>
            <form className="astana-form" onSubmit={signInWithCode}>
              <label>Sign-in code
                <input autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} required maxLength={23}
                  value={deviceCode} onChange={event => setDeviceCode(event.target.value)} placeholder="ABCD-EFGH-JKLM-NPQR" />
              </label>
              <Notice error message={deviceError} />
              <button className="btn btn-primary" disabled={deviceBusy}>{deviceBusy ? 'Signing in…' : 'Add this device'}</button>
            </form>
          </section>

          <section className="astana-panel">
            <h2>New participant check-in</h2>
            <p className="astana-note mb-4">Name and email create a new participant registration. They cannot be used to sign in to an existing registration.</p>
            <form className="astana-form" onSubmit={checkIn}>
              <label>Your name<input autoComplete="name" required maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label>
              <label>Email address<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label>
              <p className="astana-note">Your name appears with your team. Your email stays private with the organizers. If this email is already registered, use the sign-in code above or ask the organizer to verify you and restore access.</p>
              <a className="btn" href="https://x.com/viberventures" target="_blank" rel="noopener noreferrer">Follow Viber on Twitter / X ↗</a>
              <label className="astana-check"><input type="checkbox" required checked={follow} onChange={event => setFollow(event.target.checked)} /><span>I’ve followed @viberventures.<small className="astana-note block">Your confirmation helps us stay connected after the event.</small></span></label>
              <Notice error message={error} />
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Checking you in…' : 'Check in'}</button>
            </form>
          </section>
        </div>
      )}
    </AstanaLayout>
  );
}