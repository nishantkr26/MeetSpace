import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowLeft } from '../components/icons';

const CODE_LENGTH = 6;

/** 4.1 + 4.2 — collect a meeting code and validate it before entering the lobby. */
export function JoinMeeting() {
  const navigate = useNavigate();
  const [meetingCode, setMeetingCode] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setChecking(true);

    try {
      const meeting = await api.getMeeting(meetingCode);

      if (meeting.status === 'ENDED') {
        setError('This meeting has already ended.');
        return;
      }

      // Validated — hand off to the lobby, which owns device setup.
      navigate(`/lobby/${meeting.meetingCode}`);
    } catch {
      // The backend returns a generic failure for a bad code; keep the user-facing
      // copy specific to what they can actually act on.
      setError("We couldn't find a meeting with that code. Check it and try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-4 py-3 sm:px-6">
        <button onClick={() => navigate('/dashboard')} className="btn-ghost -ml-2 gap-1.5 px-2 text-sm">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Join MeetSpace</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Enter the {CODE_LENGTH}-character code from your invite.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleContinue} className="mt-6 space-y-3">
            <div>
              <label htmlFor="meetingCode" className="label">Meeting code</label>
              <input
                id="meetingCode"
                type="text"
                value={meetingCode}
                onChange={(e) => {
                  setMeetingCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                  setError('');
                }}
                placeholder="A7K9P2"
                required
                autoFocus
                autoComplete="off"
                spellCheck={false}
                maxLength={CODE_LENGTH}
                className="input-field text-center font-mono text-2xl tracking-[0.4em] uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={checking || meetingCode.length < CODE_LENGTH}
              className="btn-primary w-full"
            >
              {checking ? 'Checking…' : 'Continue'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-ink-faint">
            You'll set up your camera and mic on the next screen.
          </p>
        </div>
      </main>
    </div>
  );
}
