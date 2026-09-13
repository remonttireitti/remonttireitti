/** Kattokasetin kaavio huoltopöytäkirjaan — tulo/meno-putket ja 4-suuntainen ritilä. */

export function CeilingCassetteDiagram({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 400 190"
      className={className}
      role="img"
      aria-label="Kattokasetin kaavio: tulo- ja menoputket sekä puhallus"
    >
      <title>Kattokonvektori</title>
      <defs>
        <linearGradient id="cassette-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d7dce3" />
          <stop offset="55%" stopColor="#9aa3ad" />
          <stop offset="100%" stopColor="#6f7882" />
        </linearGradient>
        <linearGradient id="cassette-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4f6f8" />
          <stop offset="100%" stopColor="#c5ccd3" />
        </linearGradient>
        <linearGradient id="grille" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b939c" />
          <stop offset="100%" stopColor="#5c656e" />
        </linearGradient>
      </defs>

      {/* Tulo / meno */}
      <g strokeLinecap="round">
        <line x1="18" y1="78" x2="132" y2="78" stroke="#c45c4a" strokeWidth="7" />
        <line x1="18" y1="98" x2="132" y2="98" stroke="#3b82c4" strokeWidth="7" />
      </g>
      <g fill="none" stroke="#94a3b8" strokeWidth="1.4">
        <path d="M48 62 v8" />
        <path d="M48 54 l-4 8 h8 z" fill="#fb7185" stroke="#fb7185" />
        <circle cx="48" cy="50" r="7" fill="#fff" stroke="#64748b" />
        <path d="M48 46 v8 M45 50 h6" stroke="#ef4444" strokeWidth="1.3" />
        <path d="M48 106 v8" />
        <path d="M48 122 l-4 -8 h8 z" fill="#38bdf8" stroke="#38bdf8" />
        <circle cx="48" cy="128" r="7" fill="#fff" stroke="#64748b" />
        <path d="M48 124 v8 M45 128 h6" stroke="#0ea5e9" strokeWidth="1.3" />
      </g>

      {/* Kotelo */}
      <path
        d="M148 58 L268 38 L318 62 L198 86 Z"
        fill="url(#cassette-body)"
        stroke="#4b5563"
        strokeWidth="1.2"
      />
      <path
        d="M318 62 L318 92 L198 118 L198 86 Z"
        fill="#6b7280"
        stroke="#4b5563"
        strokeWidth="1.2"
      />
      <rect
        x="248"
        y="48"
        width="46"
        height="22"
        rx="2"
        transform="skewY(-18)"
        fill="#9ca3af"
        stroke="#4b5563"
        strokeWidth="0.8"
      />

      {/* Ritilä */}
      <path
        d="M132 78 L278 52 L338 88 L188 122 Z"
        fill="url(#cassette-face)"
        stroke="#94a3b8"
        strokeWidth="1.4"
      />
      <path
        d="M168 84 L252 68 L276 84 L192 102 Z"
        fill="url(#grille)"
        stroke="#4b5563"
        strokeWidth="0.8"
      />
      {/* Neljä puhallussuuntaa */}
      <path d="M176 80 L248 66 L258 72 L184 86 Z" fill="#d1d5db" opacity="0.9" />
      <path d="M186 92 L258 76 L266 82 L194 98 Z" fill="#e5e7eb" opacity="0.7" />
      <path d="M164 86 L174 80 L192 100 L180 106 Z" fill="#cbd5e1" />
      <path d="M250 70 L270 82 L260 88 L242 76 Z" fill="#9ca3af" />

      {/* Ilmavirta */}
      <path
        d="M292 118 C 312 128, 328 122, 336 108"
        fill="none"
        stroke="#f97316"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <polygon points="332,102 344,108 330,118" fill="#f97316" />
    </svg>
  );
}
