import { Mic, MicOff, Video, VideoOff } from './icons';

const AVATAR_TONES = [
  'from-indigo-500 to-violet-600',
  'from-sky-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
];

// These three take `string` and are called with whatever the API returned. A
// field that arrives undefined used to throw here, and a throw during render
// unmounts the entire app — the blank page you get has no hint that a single
// missing name caused it. Degrading to a placeholder keeps the damage local.
export function initialsOf(name: string) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function toneOf(seed: string) {
  const text = seed ?? '';
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'h-20 w-20 text-2xl' : size === 'sm' ? 'h-7 w-7 text-[11px]' : 'h-10 w-10 text-sm';
  return (
    <div
      className={`${dim} shrink-0 rounded-full bg-gradient-to-br ${toneOf(name)}
                  grid place-items-center font-semibold text-white select-none`}
    >
      {initialsOf(name)}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    LIVE: 'bg-live/15 text-live ring-1 ring-live/25',
    SCHEDULED: 'bg-scheduled/15 text-scheduled ring-1 ring-scheduled/25',
    ENDED: 'bg-white/5 text-ink-faint ring-1 ring-white/10',
  };
  const label = status ? status.charAt(0) + status.slice(1).toLowerCase() : 'Unknown';
  return (
    <span className={`badge ${map[status] ?? map.ENDED}`}>
      {status === 'LIVE' ? (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-live" />
        </span>
      ) : (
        <span className="dot" />
      )}
      {label}
    </span>
  );
}

/** A stage tile. Renders a `video` child when one is supplied, otherwise the avatar placeholder. */
export function VideoTile({
  name,
  you = false,
  camOn = false,
  micOn = true,
  featured = false,
  className = '',
  children,
}: {
  name: string;
  you?: boolean;
  camOn?: boolean;
  micOn?: boolean;
  featured?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-tile ring-1 ring-white/5
                  ${featured ? 'aspect-video' : 'aspect-[4/3]'} ${className}`}
    >
      {camOn && children ? (
        children
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent" />
          <Avatar name={name} size={featured ? 'lg' : 'md'} />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3">
        <span className="max-w-[70%] truncate rounded-md bg-black/50 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {name}{you && ' (you)'}
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

export function ControlButton({
  on,
  onClick,
  label,
  danger = false,
  OnIcon,
  OffIcon,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  danger?: boolean;
  OnIcon: React.ComponentType<{ className?: string }>;
  OffIcon?: React.ComponentType<{ className?: string }>;
}) {
  const Icon = on || !OffIcon ? OnIcon : OffIcon;
  const tone = danger
    ? 'bg-danger text-white hover:bg-danger/90'
    : on
      ? 'bg-white/10 text-ink hover:bg-white/[0.16]'
      : 'bg-danger/90 text-white hover:bg-danger';
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={!danger ? on : undefined}
      title={label}
      className={`grid h-12 w-12 place-items-center rounded-full transition-colors ${tone}
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60
                  focus-visible:ring-offset-2 focus-visible:ring-offset-canvas`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

export { Video, VideoOff, Mic, MicOff };
