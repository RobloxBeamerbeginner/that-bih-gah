export function D3LTALogo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="D3LTAhub"
      className={className}
    >
      <defs>
        <linearGradient id="dlogo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--theme-from, #22d3ee)" />
          <stop offset="100%" stopColor="var(--theme-to, #a855f7)" />
        </linearGradient>
        <filter id="dglow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#dlogo)" opacity="0.15" />
      <path
        d="M16 46 L32 14 L48 46 Z"
        stroke="url(#dlogo)"
        strokeWidth="3"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M28 34 L36 26 M28 26 L36 34" stroke="url(#dlogo)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="14" r="3" fill="url(#dlogo)" filter="url(#dglow)" />
    </svg>
  );
}

export function SparkleIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <defs>
        <linearGradient id="sparkgrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--theme-from, #22d3ee)" />
          <stop offset="100%" stopColor="var(--theme-to, #a855f7)" />
        </linearGradient>
      </defs>
      <path
        d="M12 2l1.8 4.6L18.4 8 13.8 9.8 12 14.4 10.2 9.8 5.6 8l4.6-1.4L12 2zm6 12l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1L18 14zM5 13l.8 1.9 1.9.8-1.9.8L5 18.4l-.8-1.9-1.9-.8 1.9-.8L5 13z"
        fill="url(#sparkgrad)"
      />
    </svg>
  );
}
