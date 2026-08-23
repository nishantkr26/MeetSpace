import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import type { MeetingResponse } from '../services/api';
import { useMediaStream } from '../hooks/useMediaStream';
import { VideoPreview } from '../components/VideoPreview';
import { ControlButton, StatusPill, Avatar } from '../components/ui';
import { Mic, MicOff, Video, VideoOff, ArrowLeft } from '../components/icons';

/** Media preferences handed to the meeting room on join (4.7). */
export const MEDIA_PREFS_KEY = 'meetspace:mediaPrefs';

type Gate =
  | { kind: 'loading' }
  | { kind: 'ok'; meeting: MeetingResponse }
  | { kind: 'missing' }
  | { kind: 'ended'; meeting: MeetingResponse };

export function Lobby() {
  const navigate = useNavigate();
  const { meetingCode } = useParams<{ meetingCode: string }>();

  const [gate, setGate] = useState<Gate>({ kind: 'loading' });
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const email = localStorage.getItem('email') ?? '';
  const displayName = email.split('@')[0] || 'You';

  const media = useMediaStream(true);

  // 4.2 — validate the meeting behind this URL before showing the lobby.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!meetingCode) return setGate({ kind: 'missing' });
      try {
        const meeting = await api.getMeeting(meetingCode);
        if (cancelled) return;
        setGate(meeting.status === 'ENDED' ? { kind: 'ended', meeting } : { kind: 'ok', meeting });
      } catch {
        if (!cancelled) setGate({ kind: 'missing' });
      }
    })();
    return () => { cancelled = true; };
  }, [meetingCode]);

  // 4.7 — validate, confirm media, call join, persist state, then navigate.
  const handleJoinNow = async () => {
    if (gate.kind !== 'ok' || !meetingCode) return;
    setJoining(true);
    setJoinError('');

    try {
      // Re-check status: the host may have ended it while we sat in the lobby.
      const fresh = await api.getMeeting(meetingCode);
      if (fresh.status === 'ENDED') {
        setGate({ kind: 'ended', meeting: fresh });
        return;
      }

      await api.joinMeeting(meetingCode);

      sessionStorage.setItem(
        MEDIA_PREFS_KEY,
        JSON.stringify({ micOn: media.micOn, camOn: media.camOn, code: meetingCode }),
      );

      // Release the lobby's tracks; the room re-acquires with its own lifecycle.
      media.stop();
      navigate(`/meeting/${meetingCode}`, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not join the meeting';
      // Already-joined is a benign race (double click, refresh) — proceed.
      if (/already joined/i.test(msg)) {
        media.stop();
        navigate(`/meeting/${meetingCode}`, { replace: true });
        return;
      }
      setJoinError(msg);
    } finally {
      setJoining(false);
    }
  };

  if (gate.kind === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent" />
      </div>
    );
  }

  if (gate.kind === 'missing' || gate.kind === 'ended') {
    const ended = gate.kind === 'ended';
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="max-w-sm text-center">
          <h1 className="mb-1.5 text-xl font-semibold tracking-tight">
            {ended ? 'This meeting has ended' : 'Meeting not found'}
          </h1>
          <p className="mb-6 text-sm text-ink-muted">
            {ended
              ? 'The host ended this meeting. Ask them to start a new one.'
              : "That code doesn't match any meeting. Double-check it and try again."}
          </p>
          <div className="flex justify-center gap-2">
            <button onClick={() => navigate('/join')} className="btn-secondary">
              Try another code
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-primary">
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { meeting } = gate;
  const blocked = media.phase === 'denied' || media.phase === 'unavailable' || media.phase === 'insecure';

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <button onClick={() => navigate('/dashboard')} className="btn-ghost -ml-2 gap-1.5 px-2 text-sm">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="mx-1 hidden h-4 w-px bg-line sm:block" />
        <span className="text-sm font-medium text-ink-muted">Ready to join?</span>
      </header>

      <main
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center gap-8
                   px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:gap-10 lg:py-8"
      >
        {/* 4.4 / 4.5 — preview + device controls */}
        <section className="w-full lg:flex-[1.7]">
          <VideoPreview
            stream={media.stream}
            name={displayName}
            camOn={media.camOn}
            micOn={media.micOn}
            label={`${displayName} (you)`}
            className="w-full animate-rise"
          />

          <div className="mt-4 flex items-center justify-center gap-3">
            <ControlButton
              on={media.micOn}
              onClick={media.toggleMic}
              label={media.micOn ? 'Turn microphone off' : 'Turn microphone on'}
              OnIcon={Mic}
              OffIcon={MicOff}
            />
            <ControlButton
              on={media.camOn}
              onClick={media.toggleCam}
              label={media.camOn ? 'Turn camera off' : 'Turn camera on'}
              OnIcon={Video}
              OffIcon={VideoOff}
            />
          </div>

          <p className="mt-3 text-center text-xs text-ink-faint">
            {media.phase === 'prompting' && 'Waiting for camera and microphone permission…'}
            {media.phase === 'ready' && !media.partial &&
              `${media.camOn ? 'Camera on' : 'Camera off'} · ${media.micOn ? 'Mic on' : 'Mic off'}`}
            {media.phase === 'ready' && media.partial && media.partial}
          </p>

          {/* 4.3 — permission and device failure states */}
          {blocked && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger"
            >
              <p className="font-medium">
                {media.phase === 'denied'
                  ? 'Camera and microphone blocked'
                  : media.phase === 'insecure'
                    ? 'Camera unavailable'
                    : 'No camera or microphone found'}
              </p>
              <p className="mt-1 text-danger/80">{media.message}</p>
              {media.phase !== 'insecure' && (
                <button onClick={media.retry} className="btn-secondary mt-3 h-9 text-xs">
                  Retry
                </button>
              )}
            </div>
          )}
        </section>

        {/* 4.6 — meeting context + join */}
        <section className="w-full lg:w-72">
          <div className="mb-4 flex items-center gap-2">
            <StatusPill status={meeting.status} />
            <span className="font-mono text-xs tracking-widest text-ink-faint">
              {meeting.meetingCode}
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight break-words">{meeting.title}</h1>

          <div className="mt-4 flex items-center gap-2.5">
            <Avatar name={meeting.hostName} size="sm" />
            <span className="min-w-0 truncate text-sm text-ink-muted">
              Hosted by {meeting.hostName}
            </span>
          </div>

          {joinError && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
            >
              {joinError}
            </div>
          )}

          <button
            onClick={handleJoinNow}
            disabled={joining || media.phase === 'prompting'}
            className="btn-primary mt-6 w-full"
          >
            {joining ? 'Joining…' : 'Join now'}
          </button>

          {blocked && (
            <p className="mt-3 text-center text-xs text-ink-faint">
              You can still join without a camera or mic.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
