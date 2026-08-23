import { useCallback, useEffect, useRef, useState } from 'react';

export type MediaPhase = 'idle' | 'prompting' | 'ready' | 'denied' | 'unavailable' | 'insecure';

export type MediaState = {
  phase: MediaPhase;
  stream: MediaStream | null;
  /** A camera track was actually acquired. */
  hasCamera: boolean;
  /** A microphone track was actually acquired. */
  hasMic: boolean;
  /** Human-readable explanation for the current phase, when something went wrong. */
  message: string;
  /** Set when we got one device but not the other. */
  partial: string;
};

const DENIED = ['NotAllowedError', 'SecurityError'];
const MISSING = ['NotFoundError', 'DevicesNotFoundError', 'OverconstrainedError'];
const BUSY = ['NotReadableError', 'TrackStartError', 'AbortError'];

function describe(err: unknown): string {
  const name = (err as DOMException)?.name ?? '';
  if (DENIED.includes(name)) return 'Permission denied';
  if (MISSING.includes(name)) return 'No device found';
  if (BUSY.includes(name)) return 'Device is already in use by another app';
  return (err as Error)?.message || 'Could not access your devices';
}

async function tryGet(constraints: MediaStreamConstraints) {
  return navigator.mediaDevices.getUserMedia(constraints);
}

/**
 * Acquires camera + microphone for a pre-join preview.
 *
 * Falls back to audio-only or video-only when just one device is available, so a
 * user with no webcam can still join with sound. Tracks are always stopped on
 * unmount — otherwise the camera indicator stays lit after leaving the page.
 */
export function useMediaStream(enabled = true) {
  const [state, setState] = useState<MediaState>({
    phase: 'idle',
    stream: null,
    hasCamera: false,
    hasMic: false,
    message: '',
    partial: '',
  });

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const request = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState(s => ({
        ...s,
        phase: 'insecure',
        message:
          window.isSecureContext === false
            ? 'Camera access needs HTTPS (or localhost).'
            : 'This browser does not support camera access.',
      }));
      return;
    }

    setState(s => ({ ...s, phase: 'prompting', message: '', partial: '' }));

    // Preferred: both devices.
    try {
      const stream = await tryGet({ video: true, audio: true });
      stop();
      streamRef.current = stream;
      setState({
        phase: 'ready',
        stream,
        hasCamera: stream.getVideoTracks().length > 0,
        hasMic: stream.getAudioTracks().length > 0,
        message: '',
        partial: '',
      });
      return;
    } catch (bothErr) {
      // A hard denial applies to every device — no point trying the fallbacks.
      if (DENIED.includes((bothErr as DOMException)?.name)) {
        stop();
        setState({
          phase: 'denied',
          stream: null,
          hasCamera: false,
          hasMic: false,
          message:
            'Camera and microphone are blocked. Allow them in your browser’s address bar, then retry.',
          partial: '',
        });
        return;
      }

      // Otherwise one device is probably missing or busy. Try each alone.
      const audioOnly = await tryGet({ audio: true }).catch(e => e as Error);
      if (audioOnly instanceof MediaStream) {
        stop();
        streamRef.current = audioOnly;
        setCamOn(false);
        setState({
          phase: 'ready',
          stream: audioOnly,
          hasCamera: false,
          hasMic: true,
          message: '',
          partial: `Camera unavailable — ${describe(bothErr)}. You can still join with audio.`,
        });
        return;
      }

      const videoOnly = await tryGet({ video: true }).catch(e => e as Error);
      if (videoOnly instanceof MediaStream) {
        stop();
        streamRef.current = videoOnly;
        setMicOn(false);
        setState({
          phase: 'ready',
          stream: videoOnly,
          hasCamera: true,
          hasMic: false,
          message: '',
          partial: `Microphone unavailable — ${describe(audioOnly)}. Others won’t hear you.`,
        });
        return;
      }

      stop();
      setState({
        phase: 'unavailable',
        stream: null,
        hasCamera: false,
        hasMic: false,
        message: describe(bothErr),
        partial: '',
      });
    }
  }, [stop]);

  useEffect(() => {
    if (enabled) request();
    return stop;
  }, [enabled, request, stop]);

  // Toggling `enabled` keeps the track (and the permission) but silences it,
  // which is what a call UI needs — re-prompting on every mute would be hostile.
  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = micOn; });
  }, [micOn, state.stream]);

  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach(t => { t.enabled = camOn; });
  }, [camOn, state.stream]);

  return {
    ...state,
    micOn: micOn && state.hasMic,
    camOn: camOn && state.hasCamera,
    toggleMic: () => state.hasMic && setMicOn(v => !v),
    toggleCam: () => state.hasCamera && setCamOn(v => !v),
    retry: request,
    stop,
  };
}
