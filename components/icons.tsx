type IconProps = { className?: string; strokeWidth?: number };

const base = "h-5 w-5";

export function IconPause({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
      <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
    </svg>
  );
}

export function IconPlay({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M7 4.5v15l13-7.5-13-7.5Z" fill="currentColor" />
    </svg>
  );
}

export function IconAlertTriangle({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3.5 2.5 20h19L12 3.5Z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17.2" r="0.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconCheckCircle({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 5-5.5" />
    </svg>
  );
}

export function IconTrendingUp({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 17 10 10l4 4 7-7" />
      <path d="M15 6.5h6V12.5" />
    </svg>
  );
}

export function IconTrendingDown({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 7 10 14l4-4 7 7" />
      <path d="M15 17.5h6V11.5" />
    </svg>
  );
}

export function IconDollar({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2.5v19" />
      <path d="M17 6.8c0-1.8-2-3.3-5-3.3s-5 1.3-5 3.2c0 4 10 2 10 6 0 2-2.2 3.3-5 3.3s-5-1.2-5-3.1" />
    </svg>
  );
}

export function IconCalendarClock({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18" />
      <path d="M8 2.5v3M16 2.5v3" />
      <circle cx="15.5" cy="15.5" r="3.6" />
      <path d="M15.5 13.6v1.9l1.3 1.1" />
    </svg>
  );
}

export function IconHourglass({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7 3h10M7 21h10" />
      <path d="M7 3c0 5 5 6.5 5 9s-5 4-5 9M17 3c0 5-5 6.5-5 9s5 4 5 9" />
    </svg>
  );
}

export function IconSun({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={className}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
    </svg>
  );
}

export function IconMoon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
    </svg>
  );
}

export function IconSparkle({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.5 13.8 9l6.5 1.8-6.5 1.8L12 19l-1.8-6.4L3.7 10.8 10.2 9 12 2.5Z" />
    </svg>
  );
}

export function IconSnowflake({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={className}>
      <path d="M12 2.5v19M4 7l16 10M20 7 4 17" />
    </svg>
  );
}
