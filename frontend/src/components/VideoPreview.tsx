import { useEffect, useRef, useState } from 'react';
import { Avatar } from './ui';
import { Mic, MicOff, VideoOff } from './icons';

/**
 * Binds a MediaStream to a <video> element. Falls back to an avatar when the
 * camera is off or absent, so the tile never renders as a blank black box.
 */
export function VideoPreview({
  stream,
  name,
  camOn,
  micOn,
  mirrored = true,
  muted = true,
  label = 'You',
  className = '',
}: {
  stream: MediaStream | null;
  name: string;
  camOn: boolean;
  micOn: boolean;
  mirrored?: boolean;
  /** Your own tile must stay muted or you hear yourself; remote tiles must not. */
  muted?: boolean;
  label?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Set when the browser refused to autoplay with sound. Kept as state rather
  // than poked onto the element, so React stays the only thing writing `muted`.
  const [forcedMute, setForcedMute] = useState(false);
  const effectiveMuted = muted || forcedMute;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
      console.log(
        `[video] ${label}: bound [${stream?.getTracks()
          .map((t) => `${t.kind}${t.muted ? ':muted' : ''}`)
          .join(', ') || 'no tracks'}]`,
      );
    }
    if (!stream) return;

    // Already running: calling play() again only creates races to lose.
    if (!el.paused) return;

    el.play().catch((err: DOMException) => {
      // Only NotAllowedError is the autoplay policy — audible playback needing a
      // user gesture. AbortError means a new load superseded this play(), which
      // the element's own autoplay recovers from; treating that as a policy block
      // silently muted tiles that had nothing wrong with them.
      if (err?.name !== 'NotAllowedError') {
        console.warn(`Video play() did not start: ${err?.name}`, err?.message);
        return;
      }
      // Retry muted: a silent picture beats a blank tile, and the badge below
      // gives the viewer one click to get the sound back.
      if (!el.muted) {
        console.warn('Autoplay with sound was blocked; falling back to muted.');
        setForcedMute(true);
        return;
      }
      console.warn('Video playback was blocked even while muted.');
    });
  }, [stream, camOn, effectiveMuted, label]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-tile ring-1 ring-white/5
                  aspect-video ${className}`}
    >
      {/* The element stays mounted while the camera is off so the track keeps
          its binding and re-enabling is instant. */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={effectiveMuted}
        onPlaying={(ev) => {
          const el = ev.currentTarget;
          console.log(
            `[video] ${label}: playing ${el.videoWidth}x${el.videoHeight}, camOn=${camOn}`,
          );
        }}
        className={`h-full w-full object-cover transition-opacity duration-200
                    ${camOn ? 'opacity-100' : 'opacity-0'}
                    ${mirrored ? 'scale-x-[-1]' : ''}`}
      />

      {!camOn && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent" />
          <Avatar name={name} size="lg" />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3">
        <span className="max-w-[70%] truncate rounded-md bg-black/50 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {label}
        </span>
        <span
          className={`grid h-6 w-6 place-items-center rounded-md backdrop-blur-sm
                      ${micOn ? 'bg-black/50 text-white' : 'bg-danger/80 text-white'}`}
        >
          {micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
        </span>
      </div>

      {!camOn && (
        <span className="absolute left-3 top-3 grid h-6 w-6 place-items-center rounded-md bg-black/50 text-ink-muted backdrop-blur-sm">
          <VideoOff className="h-3.5 w-3.5" />
        </span>
      )}

      {/* A click is a user gesture, which is exactly what the autoplay policy
          was waiting for — so this is allowed to unmute where autoplay was not. */}
      {forcedMute && !muted && (
        <button
          onClick={() => setForcedMute(false)}
          className="absolute right-3 top-3 rounded-md bg-accent px-2 py-1 text-xs
                     font-medium text-white backdrop-blur-sm"
        >
          Tap for sound
        </button>
      )}
    </div>
  );
}
