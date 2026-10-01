import { useEffect, useState } from 'react';
import { astanaRequest } from '@/hooks/useAstana';
import { Notice } from './AstanaLayout';
import './device-code.css';

type IssuedCode = { code: string; expiresAt: string };

export default function DeviceCode() {
  const [issued, setIssued] = useState<IssuedCode | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!issued) return;
    const update = () => {
      const seconds = Math.max(0, Math.ceil((Date.parse(issued.expiresAt) - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) {
        setIssued(null);
        setMessage('This sign-in code expired. Generate a new one if you still need it.');
      }
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [issued]);

  async function generate() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      setIssued(await astanaRequest<IssuedCode>('/device-code', 'POST'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!issued) return;
    try {
      if (!navigator.clipboard) throw new Error('Clipboard access is unavailable.');
      await navigator.clipboard.writeText(issued.code);
      setMessage('Code copied. Enter it on the other device within 10 minutes.');
    } catch {
      setMessage('Select and copy the code manually, then enter it on the other device.');
    }
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, '0');

  return (
    <section className="astana-panel astana-device-code">
      <h2>Sign in on another device</h2>
      <p className="astana-note">Generate a temporary code here, then enter it on the other device. The code works once, expires in 10 minutes, and does not sign this device out.</p>
      {issued ? (
        <div className="astana-device-code-value">
          <label>
            Temporary sign-in code
            <input aria-label="Temporary sign-in code" readOnly value={issued.code} onFocus={event => event.currentTarget.select()} />
          </label>
          <p className="astana-note">Expires in {minutes}:{seconds}. Keep this code private.</p>
          <button className="btn btn-primary" type="button" onClick={copy}>Copy code</button>
          <button className="btn" type="button" disabled={busy} onClick={generate}>{busy ? 'Generating…' : 'Generate a new code'}</button>
        </div>
      ) : (
        <button className="btn btn-primary mt-4" type="button" disabled={busy} onClick={generate}>
          {busy ? 'Generating…' : 'Generate sign-in code'}
        </button>
      )}
      <Notice error message={error} />
      {!error && message && <p className="astana-note mt-3" role="status">{message}</p>}
    </section>
  );
}