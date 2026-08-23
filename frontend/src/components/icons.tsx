type P = { className?: string };
const base = 'h-[18px] w-[18px]';

export const Mic = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M19 10a7 7 0 0 1-14 0" /><path d="M12 17v5" />
  </svg>
);

export const MicOff = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 9v-4a3 3 0 0 1 6 0v4" /><path d="M15 12.5V14a3 3 0 0 1-5.1 2.1" />
    <path d="M19 10a7 7 0 0 1-1.1 3.8M5 10a7 7 0 0 0 10.4 6.1" /><path d="M12 19v3" /><path d="M3 3l18 18" />
  </svg>
);

export const Video = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="13" height="12" rx="2" /><path d="m22 8-7 4 7 4V8Z" />
  </svg>
);

export const VideoOff = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.7 6H13a2 2 0 0 1 2 2v2.3M15 15.5V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1" />
    <path d="m22 8-7 4 7 4V8Z" /><path d="M3 3l18 18" />
  </svg>
);

export const Screen = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /><path d="m9 10 3-3 3 3" /><path d="M12 7v6" />
  </svg>
);

export const PhoneOff = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.7 13.3a12 12 0 0 0 3.4 2.2l1.7-1.7a1.5 1.5 0 0 1 1.6-.3 12 12 0 0 0 3 .6 1.5 1.5 0 0 1 1.3 1.5v2.4a1.5 1.5 0 0 1-1.6 1.5 18 18 0 0 1-9.6-4" />
    <path d="M5.3 9.2a18 18 0 0 1-1.2-4.8A1.5 1.5 0 0 1 5.6 3H8a1.5 1.5 0 0 1 1.5 1.3c.1 1 .3 2 .6 3a1.5 1.5 0 0 1-.3 1.6L8.1 10.6" />
    <path d="M3 3l18 18" />
  </svg>
);

export const Play = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 4 14 8-14 8V4Z" />
  </svg>
);

export const Copy = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const Check = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m20 6-11 11-5-5" />
  </svg>
);

export const Users = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9" /><path d="M16 3.1a4 4 0 0 1 0 7.8" />
  </svg>
);

export const ArrowLeft = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

export const Plus = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const Keypad = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="1" /><circle cx="12" cy="6" r="1" /><circle cx="18" cy="6" r="1" />
    <circle cx="6" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="18" cy="12" r="1" />
    <circle cx="12" cy="18" r="1" />
  </svg>
);
