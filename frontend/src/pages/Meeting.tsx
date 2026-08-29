import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import type { MeetingResponse } from '../services/api';
import { Avatar, StatusPill, ControlButton } from '../components/ui';
import { VideoPreview } from '../components/VideoPreview';
import { useMediaStream } from '../hooks/useMediaStream';
import { MEDIA_PREFS_KEY } from './Lobby';
import {
  connectWebSocket, disconnectWebSocket, subscribeMeeting, subscribeParticipantList,
  sendJoinEvent, sendLeaveEvent,subscribeToWebRTCSignals,
} from '../services/websocket';

import type { Participant } from '../types/participant';
import {
  Mic, MicOff, Video, VideoOff, Screen, PhoneOff,
  Play, Copy, Check, ArrowLeft, Users,
} from '../components/icons';
import { useWebRTC } from '../hooks/useWebRtc';

/**
 * Only the states worth saying out loud. `connected` is deliberately absent: a
 * working call should say nothing, just show the person.
 */
const CONNECTION_LABEL: Partial<Record<RTCPeerConnectionState, string>> = {
  new: 'Connecting…',
  connecting: 'Connecting…',
  disconnected: 'Reconnecting…',
  failed: 'Connection failed',
  closed: 'Disconnected',
};

export function Meeting() {
  const navigate = useNavigate();
  const { meetingCode } = useParams<{ meetingCode: string }>();
  const [meeting, setMeeting] = useState<MeetingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Screen share is still UI-only — getDisplayMedia is not wired up yet.
  const [sharing, setSharing] = useState(false);

  const email = localStorage.getItem('email') ?? '';
  const userId = Number(localStorage.getItem('userId')) || null;
  const userName = localStorage.getItem('name') ?? '';
  const displayName = userName || email.split('@')[0] || 'You';

  // Everyone who has announced themselves on this meeting's topic.
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Local camera/mic.
  const media = useMediaStream(true);

  // Peer connections to everyone else, keyed by their user id. `mediaSettled`
  // tells the hook the camera question has been answered one way or the other,
  // so it can stop holding incoming offers back.
  const mediaSettled = media.phase !== 'idle' && media.phase !== 'prompting';
  const { remoteStreams, remoteMedia, peerStates, handleSignal, callPeer, removePeer } =
    useWebRTC(meetingCode!, userId, media.stream, mediaSettled);

  // Peers we want to call, held until the local camera is actually ready — an
  // offer built before then carries no tracks, and connects to a black tile.
  // `callPeer` is idempotent, so this list can be replayed freely.
  const [pendingCalls, setPendingCalls] = useState<number[]>([]);

  // Apply the choices made in the lobby, once the devices are actually ready.
  useEffect(() => {
    if (media.phase !== 'ready') return;
    const raw = sessionStorage.getItem(MEDIA_PREFS_KEY);
    if (!raw) return;
    sessionStorage.removeItem(MEDIA_PREFS_KEY);
    try {
      const prefs = JSON.parse(raw) as { micOn?: boolean; camOn?: boolean; code?: string };
      if (prefs.code && prefs.code !== meetingCode) return;
      if (prefs.micOn === false) media.toggleMic();
      if (prefs.camOn === false) media.toggleCam();
    } catch {
      // Malformed prefs are not worth surfacing — fall back to device defaults.
    }
  }, [media.phase, meetingCode]);

  // Status (SCHEDULED → LIVE → ENDED) is only ever changed by the host, over
  // REST. There is no websocket event for it, so everyone else finds out by
  // asking. Replace this with a broadcast on the meeting topic and the interval
  // below can go.
  const loadMeeting = useCallback(async () => {
    try {
      if (!meetingCode) return;
      const data = await api.getMeeting(meetingCode);
      setMeeting(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meeting');
    } finally {
      setLoading(false);
    }
  }, [meetingCode]);

  useEffect(() => {
    // loadMeeting is async and touches no state before its first await, so
    // nothing is set synchronously here — the rule cannot see through the call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMeeting();
    const interval = setInterval(loadMeeting, 5000);
    return () => clearInterval(interval);
  }, [loadMeeting]);

  // Announce this user on the meeting topic, and track everyone else's
  // announcements. Subscribe before publishing, or the echo of our own join
  // arrives before we are listening for it.
  useEffect(() => {
    // No userId means a session predating login-issued ids — logging out and
    // back in fixes it. Announcing without one would collide with every other
    // unidentified user, so sit the roster out instead.
    if (!meetingCode || !email || !userId) return;

    connectWebSocket(() => {
      // The roster snapshot, addressed to this client alone. It arrives on the
      // same ordered connection as the deltas below, so it cannot overtake an
      // event it should have preceded — assigning it wholesale is safe.
      subscribeParticipantList((message) => {
        setParticipants(message.participants);

        // Everyone in this snapshot was already here when we arrived, so we are
        // the one who offers and they answer — that asymmetry is what stops both
        // sides dialling at once. Queued rather than called: the camera may not
        // be ready yet.
        setPendingCalls(
          message.participants
            .filter((p) => p.userId !== userId)
            .map((p) => p.userId),
        );
      });

      subscribeMeeting(meetingCode, (message) => {
        if (message.type === 'USER_LEFT') {
          // Their peer connection is dead the moment they go, and ICE would spend
          // half a minute discovering that on its own. removePeer also forgets we
          // ever dialled them, so a rejoin gets a fresh offer rather than being
          // answered on a connection that no longer exists.
          removePeer(message.userId);
        }

        setParticipants((current) => {
          if (message.type === 'USER_LEFT') {
            return current.filter((p) => p.userId !== message.userId);
          }
          // The broadcast goes to the whole topic, sender included.
          return current.some((p) => p.userId === message.userId)
            ? current
            : [...current, { userId: message.userId, userName: message.userName }];
        });
      });

      subscribeToWebRTCSignals(handleSignal);

      sendJoinEvent(meetingCode);
    });

    // Backstop for the exits that never touch a handler — back button, in-app
    // navigation. The explicit leave/end handlers announce it themselves, so a
    // second USER_LEFT can arrive here; filtering an already-removed id is a
    // no-op. Must publish before deactivating, or the frame never gets written.
    return () => {
      sendLeaveEvent(meetingCode);
      setParticipants([]);
      disconnectWebSocket();
    };
  }, [meetingCode, email]);

  // Drain the queue once the camera is up. Splitting this from the roster
  // callback is what lets the offer wait for tracks without holding up the join.
  // Safe to re-run on every stream or roster change: callPeer ignores anyone it
  // has already dialled, and forgets them again if the connection is torn down.
  useEffect(() => {
    if (!media.stream) return;
    pendingCalls.forEach(callPeer);
  }, [media.stream, pendingCalls, callPeer]);

  const isHost = meeting?.hostId === userId;

  const run = async (fn: () => Promise<void>) => {
    setActionLoading(true);
    try { await fn(); } finally { setActionLoading(false); }
  };

  const handleStartMeeting = () => run(async () => {
    if (!meetingCode) return;
    try {
      setMeeting(await api.startMeeting(meetingCode));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start meeting');
    }
  });

  const handleEndMeeting = () => run(async () => {
    if (!meetingCode) return;
    try {
      setMeeting(await api.endMeeting(meetingCode));
      if (userId) sendLeaveEvent(meetingCode);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end meeting');
    }
  });

  const handleLeaveMeeting = () => run(async () => {
    if (!meetingCode) return;
    try {
      await api.leaveMeeting(meetingCode);
      // Leaving over REST must happen either way; only the announcement needs
      // an identity, and a stale session has none.
      if (userId) sendLeaveEvent(meetingCode);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave meeting');
    }
  });

  const handleCopy = () => {
    if (!meeting) return;
    navigator.clipboard.writeText(meeting.meetingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <div className="min-h-full grid place-items-center">
        <div className="h-5 w-5 rounded-full border-2 border-line border-t-accent animate-spin" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-full grid place-items-center px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-semibold tracking-tight mb-1.5">Meeting not found</h1>
          <p className="text-sm text-ink-muted mb-6">That code doesn't match any meeting.</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const ended = meeting.status === 'ENDED';
  const live = meeting.status === 'LIVE';

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:overflow-hidden">
      {/* top bar */}
      <header className="flex shrink-0 items-center gap-3 px-4 py-3 sm:px-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-ghost -ml-2 gap-1.5 px-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="mx-1 hidden h-4 w-px bg-line sm:block" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-medium sm:text-base">{meeting.title}</h1>
        </div>
        <StatusPill status={meeting.status} />
      </header>

      {error && (
        <div className="mx-4 mb-2 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger sm:mx-6">
          {error}
        </div>
      )}

      {/* stage + rail */}
      <main className="flex flex-1 flex-col gap-4 px-4 pb-4 sm:px-6 lg:min-h-0 lg:flex-row lg:gap-6 lg:overflow-hidden lg:pb-6">
        <section className="flex min-w-0 flex-col gap-4 lg:min-h-0 lg:flex-1">
          <div className="grid w-full place-items-center lg:min-h-0 lg:flex-1">
            <div
              className={`grid w-full gap-3 ${
                remoteStreams.size > 0
                  ? 'sm:grid-cols-2'
                  : 'lg:max-w-[calc((100vh-16rem)*16/9)]'
              }`}
            >
              <VideoPreview
                stream={media.stream}
                name={displayName}
                camOn={media.camOn}
                micOn={media.micOn}
                label={`${displayName} (you)`}
                className="w-full animate-rise"
              />

              {/* One tile per negotiated peer. Not mirrored — mirroring is a
                  courtesy for looking at yourself, and wrong for anyone else —
                  and not muted, which is the whole point of the remote audio. */}
              {[...remoteStreams].map(([id, stream]) => {
                const peer = participants.find((p) => p.userId === id);
                const name = peer?.userName ?? 'Participant';
                const status = CONNECTION_LABEL[peerStates.get(id) ?? 'new'];
                return (
                  <VideoPreview
                    key={id}
                    stream={stream}
                    name={name}
                    camOn={remoteMedia.get(id)?.camOn ?? true}
                    micOn={remoteMedia.get(id)?.micOn ?? true}
                    mirrored={false}
                    muted={false}
                    label={status ? `${name} · ${status}` : name}
                    className="w-full animate-rise"
                  />
                );
              })}
            </div>
          </div>

          {!ended && (
            <div className="flex shrink-0 items-center justify-center gap-2 pb-1 sm:gap-3">
              <ControlButton
                on={media.micOn} onClick={media.toggleMic}
                label={media.micOn ? 'Mute microphone' : 'Unmute microphone'}
                OnIcon={Mic} OffIcon={MicOff}
              />
              <ControlButton
                on={media.camOn} onClick={media.toggleCam}
                label={media.camOn ? 'Turn camera off' : 'Turn camera on'}
                OnIcon={Video} OffIcon={VideoOff}
              />
              <ControlButton
                on={!sharing} onClick={() => setSharing(v => !v)}
                label={sharing ? 'Stop sharing screen' : 'Share screen'}
                OnIcon={Screen}
              />

              <div className="mx-1 h-8 w-px bg-line" />

              {isHost && !live && (
                <button onClick={handleStartMeeting} disabled={actionLoading} className="btn-primary gap-2">
                  <Play className="h-4 w-4" />
                  {actionLoading ? 'Starting…' : 'Start'}
                </button>
              )}
              {isHost && live && (
                <button
                  onClick={handleEndMeeting}
                  disabled={actionLoading}
                  aria-label="End meeting"
                  className="grid h-12 w-[4.5rem] place-items-center rounded-full bg-danger text-white
                             transition-colors hover:bg-danger/90 disabled:opacity-40"
                >
                  <PhoneOff className="h-5 w-5" />
                </button>
              )}
              {!isHost && (
                <button
                  onClick={handleLeaveMeeting}
                  disabled={actionLoading}
                  aria-label="Leave meeting"
                  className="grid h-12 w-[4.5rem] place-items-center rounded-full bg-danger text-white
                             transition-colors hover:bg-danger/90 disabled:opacity-40"
                >
                  <PhoneOff className="h-5 w-5" />
                </button>
              )}
            </div>
          )}

          {ended && (
            <div className="card text-center">
              <p className="text-sm text-ink-muted">This meeting has ended.</p>
            </div>
          )}
        </section>

        {/* side rail */}
        <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-80 lg:overflow-y-auto">
          <div className="card">
            <div className="label">Meeting code</div>
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-mono text-xl tracking-[0.25em]">
                {meeting.meetingCode}
              </span>
              <button
                onClick={handleCopy}
                aria-label="Copy meeting code"
                className="btn-secondary h-9 w-9 shrink-0 !px-0"
              >
                {copied ? <Check className="h-4 w-4 text-live" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2.5 text-xs text-ink-faint">Share this code to let people join.</p>
          </div>

          <div className="card">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-ink-muted">
              <Users className="h-4 w-4" /> In this meeting
            </div>
            <div className="flex items-center gap-2.5">
              <Avatar name={displayName} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm">{displayName}</span>
              <span className="text-xs text-ink-faint">
                {isHost ? 'You · Host' : 'You'}
              </span>
            </div>

            {/* Everyone else comes from the roster, so the host appears here
                like anyone else — listing them separately double-counted them. */}
            {participants
              .filter((p) => p.userId !== userId)
              .map((p) => (
                <div
                  key={p.userId}
                  className="mt-3 flex items-center gap-2.5 border-t border-line pt-3"
                >
                  <Avatar name={p.userName} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm">{p.userName}</span>
                  <span className="text-xs text-ink-faint">
                    {p.userId === meeting.hostId ? 'Host' : 'Joined'}
                  </span>
                </div>
              ))}

            {!isHost && !participants.some((p) => p.userId === meeting.hostId) && (
              <div className="mt-3 flex items-center gap-2.5 border-t border-line pt-3">
                <Avatar name={meeting.hostName} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm text-ink-muted">
                  {meeting.hostName}
                </span>
                <span className="text-xs text-ink-faint">Host · away</span>
              </div>
            )}
          </div>

          <div className="card space-y-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-ink-faint">Created</span>
              <span className="min-w-0 truncate text-ink-muted">
                {new Date(meeting.createdAt).toLocaleString()}
              </span>
            </div>
            {meeting.startedAt && (
              <div className="flex justify-between gap-3">
                <span className="text-ink-faint">Started</span>
                <span className="min-w-0 truncate text-ink-muted">
                  {new Date(meeting.startedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
