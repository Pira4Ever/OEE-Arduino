/**
 * Rosca (donut) mostrando a proporção de peças boas x ruins e a taxa de
 * qualidade no centro. SVG puro, renderizado no servidor.
 */
export function DonutChart({ boas, ruins }: { boas: number; ruins: number }) {
  const total = boas + ruins;
  const pct = total > 0 ? boas / total : 0;

  const size = 200;
  const stroke = 26;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  const boasLen = c * pct;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto h-auto w-44"
      role="img"
      aria-label={`Taxa de qualidade: ${(pct * 100).toFixed(1)}%`}
    >
      {/* trilho = ruins */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        strokeWidth={stroke}
        className="stroke-rose-500"
      />
      {/* arco = boas */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="butt"
        strokeDasharray={`${boasLen} ${c - boasLen}`}
        strokeDashoffset={c / 4}
        transform={`scale(1,-1) translate(0,${-size})`}
        className="stroke-emerald-500"
      />
      <text
        x={cx}
        y={cy - 2}
        textAnchor="middle"
        className="fill-slate-900 text-[34px] font-bold dark:fill-white"
      >
        {(pct * 100).toFixed(0)}%
      </text>
      <text
        x={cx}
        y={cy + 22}
        textAnchor="middle"
        className="fill-slate-400 text-[12px]"
      >
        qualidade
      </text>
    </svg>
  );
}
