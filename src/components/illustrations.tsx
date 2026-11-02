/**
 * Flat inline illustrations. Colours come from CSS variables (--ill-*) so they
 * follow light and dark mode; nothing is downloaded or licensed.
 */

const ink = "var(--ill-navy)";
const blue = "var(--ill-blue)";
const sky = "var(--ill-sky)";
const paper = "var(--ill-paper)";
const gold = "var(--ill-gold)";
const line = "var(--ill-line)";
const good = "var(--ill-good)";

export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="brand-mark">
      <path d="M12 1.5 21 5v6.5c0 5.3-3.8 9.6-9 11-5.2-1.4-9-5.7-9-11V5z" fill="#0070e0" />
      <path d="M12 1.5 21 5v6.5c0 5.3-3.8 9.6-9 11z" fill="#003087" />
      <path d="m7.5 12.2 3 3 6-6.4" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Landing hero: a pull request on a laptop, the money held in the middle, a payout landing on the right. */
export function HeroIllustration() {
  return (
    <svg viewBox="0 0 560 400" role="img" aria-label="A pull request is checked, the held payment is released to the freelancer" className="illustration">
      <rect x="0" y="0" width="560" height="400" fill={sky} />
      <circle cx="470" cy="70" r="120" fill={paper} opacity="0.5" />
      <rect x="0" y="330" width="560" height="70" fill={paper} opacity="0.6" />

      {/* Laptop with a diff */}
      <g transform="translate(40 120)">
        <rect x="0" y="0" width="230" height="150" rx="6" fill={ink} />
        <rect x="10" y="10" width="210" height="130" fill={paper} />
        <rect x="20" y="20" width="90" height="8" fill={line} />
        <rect x="20" y="36" width="190" height="10" fill="var(--ill-diff-del)" />
        <rect x="20" y="50" width="190" height="10" fill="var(--ill-diff-add)" />
        <rect x="20" y="64" width="160" height="10" fill="var(--ill-diff-add)" />
        <rect x="20" y="82" width="120" height="6" fill={line} />
        <rect x="20" y="94" width="150" height="6" fill={line} />
        <rect x="20" y="106" width="100" height="6" fill={line} />
        <circle cx="196" cy="118" r="14" fill={good} />
        <path d="m189 118 5 5 9-10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M-14 150h258l-12 16H-2z" fill={ink} opacity="0.85" />
      </g>

      {/* Held payment card with lock */}
      <g transform="translate(300 60)">
        <rect x="0" y="0" width="180" height="110" rx="6" fill={blue} />
        <rect x="16" y="18" width="70" height="8" fill="#ffffff" opacity="0.6" />
        <text x="16" y="62" fill="#fff" fontSize="28" fontWeight="700" fontFamily="var(--font-sans), sans-serif">$1,200</text>
        <rect x="16" y="78" width="124" height="18" rx="9" fill={gold} />
        <text x="25" y="91" fill="#001435" fontSize="10" fontWeight="700" fontFamily="var(--font-sans), sans-serif">HELD · NOT CHARGED</text>
        <g transform="translate(140 14)">
          <rect x="0" y="12" width="26" height="20" rx="3" fill="#fff" />
          <path d="M5 12V8a8 8 0 0 1 16 0v4" fill="none" stroke="#fff" strokeWidth="3" />
          <circle cx="13" cy="22" r="3" fill={blue} />
        </g>
      </g>

      {/* Dashed flow from laptop to card to person */}
      <path d="M272 196 C305 196 322 190 334 174" fill="none" stroke={ink} strokeWidth="2" strokeDasharray="6 6" opacity="0.5" />
      <path d="M440 175 C460 210 470 230 470 250" fill="none" stroke={ink} strokeWidth="2" strokeDasharray="6 6" opacity="0.5" />
      <path d="m463 244 7 9 7-9" fill="none" stroke={ink} strokeWidth="2" opacity="0.5" />

      {/* Freelancer receiving payout */}
      <g transform="translate(400 250)">
        <circle cx="70" cy="22" r="20" fill="var(--ill-skin)" />
        <path d="M50 18c0-14 10-20 22-20s20 8 18 22c-6-6-14-8-22-8s-14 2-18 6z" fill="var(--ill-hair)" />
        <path d="M30 100c0-30 18-50 40-50s40 20 40 50z" fill={blue} />
        <rect x="-24" y="60" width="78" height="40" rx="4" fill={paper} stroke={line} strokeWidth="2" />
        <text x="-15" y="86" fill={good} fontSize="14" fontWeight="700" fontFamily="var(--font-sans), sans-serif">+$1,200</text>
      </g>

      {/* Client sending */}
      <g transform="translate(200 324)">
        <circle cx="30" cy="0" r="14" fill="var(--ill-skin-2)" />
        <path d="M16 -4c2-10 10-14 16-14s14 6 12 16c-4-4-10-6-14-6s-10 2-14 4z" fill="var(--ill-hair)" />
        <path d="M6 40c0-20 10-28 24-28s24 8 24 28z" fill={ink} opacity="0.85" />
      </g>
    </svg>
  );
}

type IconName = "agree" | "fund" | "deliver" | "verify" | "release" | "defend";

/** 40px step icons for the landing "how it works" row. */
export function StepIcon({ name }: { name: IconName }) {
  const common = { fill: "none", stroke: ink, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden className="step-icon">
      <rect x="0" y="0" width="40" height="40" rx="4" fill={sky} />
      {name === "agree" && (
        <g {...common}>
          <path d="M12 8h12l5 5v19H12z" fill={paper} />
          <path d="m15 18 2 2 3-3M15 25l2 2 3-3M23 19h3M23 26h3" />
        </g>
      )}
      {name === "fund" && (
        <g {...common}>
          <rect x="10" y="17" width="20" height="15" rx="2" fill={gold} />
          <path d="M14 17v-4a6 6 0 0 1 12 0v4" />
          <circle cx="20" cy="24.5" r="2" fill={ink} />
        </g>
      )}
      {name === "deliver" && (
        <g {...common}>
          <circle cx="13" cy="11" r="3" fill={paper} />
          <circle cx="13" cy="29" r="3" fill={paper} />
          <circle cx="27" cy="17" r="3" fill={blue} stroke={blue} />
          <path d="M13 14v12M27 20c0 5-6 6-11 7" />
        </g>
      )}
      {name === "verify" && (
        <g {...common}>
          <circle cx="18" cy="18" r="8" fill={paper} />
          <path d="m15 18 2.5 2.5L22 16M24 24l7 7" />
        </g>
      )}
      {name === "release" && (
        <g {...common}>
          <rect x="8" y="14" width="24" height="16" rx="2" fill={paper} />
          <path d="M8 19h24" />
          <path d="M20 4v8m-3-3 3 3 3-3" stroke={good} />
        </g>
      )}
      {name === "defend" && (
        <g {...common}>
          <path d="M20 7 30 11v7c0 6-4 11-10 13-6-2-10-7-10-13v-7z" fill={paper} />
          <path d="m16 19 3 3 5-5" stroke={blue} />
        </g>
      )}
    </svg>
  );
}

/** Empty list: a clipboard with nothing on it yet. */
export function EmptyIllustration() {
  return (
    <svg viewBox="0 0 160 120" width="160" height="120" aria-hidden className="illustration-small">
      <rect x="20" y="96" width="120" height="8" rx="4" fill={sky} />
      <rect x="48" y="14" width="64" height="84" rx="4" fill={paper} stroke={line} strokeWidth="2" />
      <rect x="66" y="8" width="28" height="12" rx="3" fill={blue} />
      <rect x="58" y="34" width="44" height="6" fill={line} />
      <rect x="58" y="48" width="34" height="6" fill={line} />
      <rect x="58" y="62" width="40" height="6" fill={line} />
      <circle cx="116" cy="30" r="12" fill={gold} />
      <path d="M116 24v12M110 30h12" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** New-job side panel: brief turns into a checklist. */
export function BriefIllustration() {
  return (
    <svg viewBox="0 0 280 150" role="img" aria-label="A brief becomes a checklist of acceptance criteria" className="illustration">
      <rect width="280" height="150" fill={sky} />
      <g transform="translate(24 24)">
        <rect width="96" height="104" rx="3" fill={paper} stroke={line} strokeWidth="2" />
        {[16, 30, 44, 58, 72].map((y, i) => (
          <rect key={y} x="12" y={y} width={i % 2 ? 56 : 72} height="6" fill={line} />
        ))}
      </g>
      <path d="M128 76h24m-6-6 6 6-6 6" fill="none" stroke={ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(160 24)">
        <rect width="96" height="104" rx="3" fill={paper} stroke={blue} strokeWidth="2" />
        {[18, 44, 70].map((y) => (
          <g key={y}>
            <rect x="10" y={y} width="14" height="14" rx="2" fill={blue} />
            <path d={`m13 ${y + 7} 3 3 5-6`} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <rect x="32" y={y + 4} width="52" height="6" fill={line} />
          </g>
        ))}
      </g>
    </svg>
  );
}
