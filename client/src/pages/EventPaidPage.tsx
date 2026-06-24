import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';

const EventPaidPage = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<'verifying' | 'paid' | 'failed'>('verifying');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setState('failed');
      return;
    }
    (async () => {
      try {
        const res = await apiRequest(`/api/events/${slug}/pay/verify`, {
          method: 'POST',
          body: JSON.stringify({ sessionId }),
        });
        queryClient.invalidateQueries({ queryKey: ['/api/me/dashboard'] });
        if (res.paid) {
          setState('paid');
          setTimeout(() => navigate('/onboarding'), 1500);
        } else {
          setState('failed');
        }
      } catch {
        setState('failed');
      }
    })();
  }, [slug, searchParams, navigate]);

  return (
    <div className="arena-wrap flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      {state === 'verifying' && (
        <>
          <Loader2 size={36} className="animate-spin text-primary" />
          <span className="kicker">Confirming your payment</span>
        </>
      )}
      {state === 'paid' && (
        <>
          <CheckCircle2 size={48} className="text-pos" />
          <h1 className="h3 uppercase">Payment confirmed</h1>
          <p className="text-muted-foreground">Setting up your team…</p>
        </>
      )}
      {state === 'failed' && (
        <>
          <XCircle size={48} className="text-destructive" />
          <h1 className="h3 uppercase">Payment not confirmed</h1>
          <p className="text-muted-foreground max-w-md">
            We couldn't confirm your payment. If you were charged, contact the organizer.
          </p>
          <button onClick={() => navigate(`/events/${slug}`)} className="btn btn-primary">Back to event</button>
        </>
      )}
    </div>
  );
};

export default EventPaidPage;
