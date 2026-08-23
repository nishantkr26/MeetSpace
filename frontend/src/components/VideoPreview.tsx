import { useEffect, useRef } from 'react';
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
  label = 'You',
  className = '',
}: {
  stream: MediaStream | null;
  name: string;
  camOn: boolean;
  micOn: boolean;
  mirrored?: boolean;
  label?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    // Autoplay can still reject (e.g. backgrounded tab); it is not fatal here.
    if (stream) el.play().catch(() => {});
  }, [stream, camOn]);

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
        muted
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
    </div>
  );
}
