export function D3LTALogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="D3LTAhub"
    >
      <defs>
        <linearGradient id="delta-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.72 0.22 195)" />
          <stop offset="100%" stopColor="oklch(0.65 0.27 320)" />
        </linearGradient>
      </defs>
      <path
        d="M32 6 L58 54 L6 54 Z"
        stroke="url(#delta-grad)"
        strokeWidth="3"
        strokeLinejoin="round"
        fill="color-mix(in oklab, oklch(0.72 0.22 195) 12%, transparent)"
      />
      <circle cx="32" cy="38" r="5" fill="url(#delta-grad)" />
    </svg>
  );
}
