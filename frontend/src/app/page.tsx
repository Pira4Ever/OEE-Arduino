import { getDashboard, type Dashboard } from "@/lib/metrics";
import { DISPLAY_TIMEZONE } from "@/lib/db";
import { Card, KpiCard } from "@/components/Card";
import { StackedBarChart } from "@/components/StackedBarChart";
import { HourlyChart } from "@/components/HourlyChart";
import { DonutChart } from "@/components/DonutChart";

// Renderiza a cada requisição (SSR dinâmico) para refletir o estado atual da linha.
export const dynamic = "force-dynamic";

function formatDateLabel(iso: string): string {
  // iso = "YYYY-MM-DD" -> "DD/MM"
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function DownloadButton() {
  return (
    <a
      href="/api/export"
      download
      className="inline-flex items-center gap-2 self-start rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M10 1.5a.75.75 0 0 1 .75.75v8.69l2.72-2.72a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 1 1 1.06-1.06l2.72 2.72V2.25A.75.75 0 0 1 10 1.5Z" />
        <path d="M3.5 13a.75.75 0 0 1 .75.75v2.25a.5.5 0 0 0 .5.5h10.5a.5.5 0 0 0 .5-.5v-2.25a.75.75 0 0 1 1.5 0v2.25A2 2 0 0 1 15.25 18H4.75a2 2 0 0 1-2-2v-2.25A.75.75 0 0 1 3.5 13Z" />
      </svg>
      Baixar Excel
    </a>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500" /> Boas
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm bg-rose-500" /> Ruins
      </span>
    </div>
  );
}

export default async function Home() {
  const result = await getDashboard();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Monitor da Linha de Produção
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Indicador OEE · classificação de peças boas e ruins · fuso{" "}
            {DISPLAY_TIMEZONE}
          </p>
        </div>
        <DownloadButton />
      </header>

      {!result.ok ? (
        <Card title="Não foi possível carregar os dados">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Falha ao consultar o banco de dados. Verifique se o PostgreSQL do{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">
              Backend
            </code>{" "}
            está em execução (<code>docker compose up -d</code>) e se as
            variáveis de conexão estão corretas.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs text-rose-600 dark:bg-slate-800">
            {result.error}
          </pre>
        </Card>
      ) : result.data.totals.total === 0 ? (
        <Card title="Sem peças registradas">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            A tabela <code>pecas</code> está vazia. Os dados aparecerão aqui
            assim que a linha começar a registrar peças.
          </p>
        </Card>
      ) : (
        <DashboardContent data={result.data} />
      )}
    </div>
  );
}

function DashboardContent({ data }: { data: Dashboard }) {
  const { totals, daily, weekly, hourly, recent } = data;
  const qualidadePct = (totals.qualidade * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total de peças" value={String(totals.total)} accent="slate" />
        <KpiCard label="Peças boas" value={String(totals.boas)} accent="emerald" />
        <KpiCard label="Peças ruins" value={String(totals.ruins)} accent="rose" />
        <KpiCard
          label="Taxa de qualidade"
          value={`${qualidadePct}%`}
          accent="sky"
          hint="boas ÷ total"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Produção por dia */}
        <Card
          title="Produção por dia"
          subtitle="Peças boas e ruins por dia"
          className="lg:col-span-2"
        >
          <div className="mb-3">
            <Legend />
          </div>
          <StackedBarChart
            data={daily.map((d) => ({
              label: formatDateLabel(d.dia),
              boas: d.boas,
              ruins: d.ruins,
            }))}
          />
        </Card>

        {/* Qualidade (donut) */}
        <Card title="Qualidade" subtitle="Proporção boas x ruins">
          <DonutChart boas={totals.boas} ruins={totals.ruins} />
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500" />
                Boas
              </span>
              <span className="font-medium">{totals.boas}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span className="inline-block h-3 w-3 rounded-sm bg-rose-500" />
                Ruins
              </span>
              <span className="font-medium">{totals.ruins}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Produção por semana */}
      <Card
        title="Produção por semana"
        subtitle="Peças boas e ruins agrupadas por semana (início na segunda-feira)"
      >
        <div className="mb-3">
          <Legend />
        </div>
        <StackedBarChart
          data={weekly.map((w) => ({
            label: `Sem. ${formatDateLabel(w.semana)}`,
            boas: w.boas,
            ruins: w.ruins,
          }))}
        />
      </Card>

      {/* Produção por hora */}
      <Card title="Produção por hora do dia" subtitle="Soma de peças em cada hora (0–23h)">
        <HourlyChart data={hourly} />
      </Card>

      {/* Últimas peças */}
      <Card title="Últimas peças registradas">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="py-2 pr-4 font-medium">#</th>
                <th className="py-2 pr-4 font-medium">Horário</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((p) => {
                const boa = p.status.toLowerCase() === "boa";
                return (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800/60"
                  >
                    <td className="py-2 pr-4 text-slate-400">{p.id}</td>
                    <td className="py-2 pr-4 tabular-nums text-slate-600 dark:text-slate-300">
                      {p.horario}
                    </td>
                    <td className="py-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          boa
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                        }`}
                      >
                        {boa ? "Boa" : "Ruim"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
