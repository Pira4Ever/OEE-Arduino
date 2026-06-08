type Bar = {
  label: string;
  boas: number;
  ruins: number;
};

/** Arredonda o topo do eixo para um valor "redondo" agradável. */
function niceCeil(value: number): number {
  if (value <= 5) return 5;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const n = value / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

/**
 * Gráfico de barras empilhadas (boas + ruins) renderizado 100% no servidor
 * como SVG. Sem JavaScript no cliente.
 */
export function StackedBarChart({ data }: { data: Bar[] }) {
  const width = 760;
  const height = 320;
  const pad = { top: 16, right: 16, bottom: 56, left: 44 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const maxTotal = Math.max(1, ...data.map((d) => d.boas + d.ruins));
  const top = niceCeil(maxTotal);
  const ticks = 4;

  const slot = chartW / Math.max(1, data.length);
  const barW = Math.min(64, slot * 0.6);
  const yOf = (v: number) => pad.top + chartH - (v / top) * chartH;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Produção por dia: peças boas e ruins"
    >
      {/* Linhas de grade + rótulos do eixo Y */}
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = (top / ticks) * i;
        const y = yOf(v);
        return (
          <g key={i}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y}
              y2={y}
              className="stroke-slate-200 dark:stroke-slate-700"
              strokeWidth={1}
            />
            <text
              x={pad.left - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-slate-400 text-[11px]"
            >
              {Math.round(v)}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const x = pad.left + i * slot + (slot - barW) / 2;
        const hBoas = (d.boas / top) * chartH;
        const hRuins = (d.ruins / top) * chartH;
        const yBoas = yOf(d.boas);
        const yRuins = yOf(d.boas + d.ruins);
        return (
          <g key={d.label}>
            {/* boas (base) */}
            <rect
              x={x}
              y={yBoas}
              width={barW}
              height={Math.max(0, hBoas)}
              rx={3}
              className="fill-emerald-500"
            />
            {/* ruins (topo) */}
            <rect
              x={x}
              y={yRuins}
              width={barW}
              height={Math.max(0, hRuins)}
              rx={3}
              className="fill-rose-500"
            />
            {/* total acima da barra */}
            <text
              x={x + barW / 2}
              y={yRuins - 6}
              textAnchor="middle"
              className="fill-slate-500 text-[11px] font-medium dark:fill-slate-300"
            >
              {d.boas + d.ruins}
            </text>
            {/* rótulo do eixo X */}
            <text
              x={x + barW / 2}
              y={height - pad.bottom + 18}
              textAnchor="middle"
              className="fill-slate-500 text-[11px] dark:fill-slate-400"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
