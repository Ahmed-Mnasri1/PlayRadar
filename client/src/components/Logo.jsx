import { Link } from "react-router-dom";

/** PlayRadar logo (radar mark + wordmark), links home. */
export default function Logo() {
  return (
    <Link className="logo" to="/" aria-label="PlayRadar, home">
      <svg className="logo__mark" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="8.5" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="1.5" />
        <path d="M16 16 L27.5 9.5 A14 14 0 0 1 30 16 Z" fill="var(--radar)" opacity=".35" />
        <path d="M16 16 L27.5 9.5" stroke="var(--radar)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="16" cy="16" r="2.2" fill="currentColor" />
        <circle cx="22.5" cy="11" r="2" fill="var(--radar)" />
      </svg>
      <span className="logo__word">
        Play<b>Radar</b>
      </span>
    </Link>
  );
}
