export function RosterLogo() {
  return (
    <svg
      className="roster-logo"
      viewBox="0 0 320 56"
      role="img"
      aria-label="Roster"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="rosterGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff3d1" />
          <stop offset="45%" stopColor="#e8b34a" />
          <stop offset="100%" stopColor="#9c6a1d" />
        </linearGradient>
      </defs>
      <line x1="0" y1="28" x2="34" y2="28" stroke="url(#rosterGold)" strokeWidth="2" />
      <path d="M40 22 L46 28 L40 34 L34 28 Z" fill="url(#rosterGold)" />
      <text
        x="60"
        y="40"
        textAnchor="start"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="34"
        fontWeight="700"
        letterSpacing="3"
        fill="url(#rosterGold)"
        stroke="#3d2a08"
        strokeWidth="0.75"
        paintOrder="stroke"
      >
        ROSTER
      </text>
    </svg>
  );
}
