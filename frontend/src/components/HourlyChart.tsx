type Point = {
  hora: number;
  total: number;
};

/**
 * Distribuição da produção por hora do dia (0–23), renderizada como SVG no
 * servidor. Útil para enxergar os picos de atividade da linha.
 */
export function HourlyChart({ data }: { data: Point[] }) {
  const width = 760;
  const height = 220;
  const pad = { top: 16, right: 16, bottom: 32, left: 32 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const max = Math.max(1, ...data.map((d) => d.total));
  const slot = chartW / 24;
  const barW = slot * 0.7;
  const yOf = (v: number) => pad.top + chartH - (v / max) * chartH;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Produção por hora do dia"
    >
      <line
        x1={pad.left}
        x2={width - pad.right}
        y1={pad.top + chartH}
        y2={pad.top + chartH}
        className="stroke-slate-200 dark:stroke-slate-700"
      />
      {data.map((d) => {
        const x = pad.left + d.hora * slot + (slot - barW) / 2;
        const h = (d.total / max) * chartH;
        return (
          <g key={d.hora}>
            <rect
              x={x}
              y={yOf(d.total)}
              width={barW}
              height={Math.max(0, h)}
              rx={2}
              className={d.total > 0 ? "fill-sky-500" : "fill-slate-200 dark:fill-slate-800"}
            />
            {d.hora % 3 === 0 && (
              <text
                x={x + barW / 2}
                y={height - pad.bottom + 16}
                textAnchor="middle"
                className="fill-slate-500 text-[10px] dark:fill-slate-400"
              >
                {String(d.hora).padStart(2, "0")}h
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
