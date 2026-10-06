/** Logo BOLIGO : deux anneaux entrelacés, framboise et lavande (comme sur le site). */
export function BrandLogo({ size = 26, withText = true }: { size?: number; withText?: boolean }) {
  const r = 9;
  const arc = (a: number) => `${13 + r * Math.cos(a)} ${14 + r * Math.sin(a)}`;
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="BOLIGO">
      <svg width={size * 1.3} height={size} viewBox="0 0 36 28" aria-hidden>
        <circle cx={13} cy={14} r={r} fill="none" stroke="#C62A6E" strokeWidth={2.6} />
        <circle cx={23} cy={14} r={r} fill="none" stroke="#7C5CDB" strokeWidth={2.6} />
        <path
          d={`M ${arc(-1.2)} A ${r} ${r} 0 0 1 ${arc(-0.35)}`}
          fill="none"
          stroke="#C62A6E"
          strokeWidth={2.6}
          strokeLinecap="round"
        />
      </svg>
      {withText && (
        <span className="font-title text-encre" style={{ fontSize: size * 0.8, letterSpacing: "0.03em" }}>
          BOLIGO
        </span>
      )}
    </span>
  );
}
