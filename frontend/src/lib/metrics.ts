import { query, DISPLAY_TIMEZONE } from "./db";

export type Totals = {
  total: number;
  boas: number;
  ruins: number;
  /** boas / total, em 0..1 */
  qualidade: number;
};

export type DailyPoint = {
  /** ISO date (YYYY-MM-DD) no fuso de exibição */
  dia: string;
  boas: number;
  ruins: number;
  total: number;
};

export type WeeklyPoint = {
  /** ISO date (YYYY-MM-DD) do início da semana (segunda-feira) no fuso de exibição */
  semana: string;
  boas: number;
  ruins: number;
  total: number;
};

export type HourlyPoint = {
  /** 0..23 no fuso de exibição */
  hora: number;
  boas: number;
  ruins: number;
  total: number;
};

export type RecentPiece = {
  id: number;
  horario: string;
  status: string;
};

export type Dashboard = {
  totals: Totals;
  daily: DailyPoint[];
  weekly: WeeklyPoint[];
  hourly: HourlyPoint[];
  recent: RecentPiece[];
};

export type DashboardResult =
  | { ok: true; data: Dashboard }
  | { ok: false; error: string };

// pg devolve COUNT/bigint como string; converte com segurança.
function num(value: unknown): number {
  return Number(value ?? 0);
}

async function getTotals(): Promise<Totals> {
  const rows = await query<{ boas: string; ruins: string }>(
    `SELECT
       COUNT(*) FILTER (WHERE lower(status) = 'boa')  AS boas,
       COUNT(*) FILTER (WHERE lower(status) = 'ruim') AS ruins
     FROM pecas`
  );
  const boas = num(rows[0]?.boas);
  const ruins = num(rows[0]?.ruins);
  const total = boas + ruins;
  return { total, boas, ruins, qualidade: total > 0 ? boas / total : 0 };
}

async function getDaily(): Promise<DailyPoint[]> {
  const rows = await query<{ dia: string; boas: string; ruins: string }>(
    `SELECT
       to_char(date_trunc('day', horario AT TIME ZONE $1), 'YYYY-MM-DD') AS dia,
       COUNT(*) FILTER (WHERE lower(status) = 'boa')  AS boas,
       COUNT(*) FILTER (WHERE lower(status) = 'ruim') AS ruins
     FROM pecas
     GROUP BY 1
     ORDER BY 1 ASC`,
    [DISPLAY_TIMEZONE]
  );
  return rows.map((r) => {
    const boas = num(r.boas);
    const ruins = num(r.ruins);
    return { dia: r.dia, boas, ruins, total: boas + ruins };
  });
}

async function getWeekly(): Promise<WeeklyPoint[]> {
  const rows = await query<{ semana: string; boas: string; ruins: string }>(
    `SELECT
       to_char(date_trunc('week', horario AT TIME ZONE $1), 'YYYY-MM-DD') AS semana,
       COUNT(*) FILTER (WHERE lower(status) = 'boa')  AS boas,
       COUNT(*) FILTER (WHERE lower(status) = 'ruim') AS ruins
     FROM pecas
     GROUP BY 1
     ORDER BY 1 ASC`,
    [DISPLAY_TIMEZONE]
  );
  return rows.map((r) => {
    const boas = num(r.boas);
    const ruins = num(r.ruins);
    return { semana: r.semana, boas, ruins, total: boas + ruins };
  });
}

async function getHourly(): Promise<HourlyPoint[]> {
  const rows = await query<{ hora: string; boas: string; ruins: string }>(
    `SELECT
       EXTRACT(HOUR FROM horario AT TIME ZONE $1) AS hora,
       COUNT(*) FILTER (WHERE lower(status) = 'boa')  AS boas,
       COUNT(*) FILTER (WHERE lower(status) = 'ruim') AS ruins
     FROM pecas
     GROUP BY 1
     ORDER BY 1 ASC`,
    [DISPLAY_TIMEZONE]
  );
  // Preenche as 24 horas para o gráfico ficar contínuo.
  const byHour = new Map<number, { boas: number; ruins: number }>();
  for (const r of rows) {
    byHour.set(num(r.hora), { boas: num(r.boas), ruins: num(r.ruins) });
  }
  return Array.from({ length: 24 }, (_, hora) => {
    const v = byHour.get(hora) ?? { boas: 0, ruins: 0 };
    return { hora, boas: v.boas, ruins: v.ruins, total: v.boas + v.ruins };
  });
}

async function getRecent(limit = 12): Promise<RecentPiece[]> {
  const rows = await query<{ id: number; horario: string; status: string }>(
    `SELECT
       id,
       to_char(horario AT TIME ZONE $1, 'DD/MM/YYYY HH24:MI:SS') AS horario,
       status
     FROM pecas
     ORDER BY horario DESC
     LIMIT $2`,
    [DISPLAY_TIMEZONE, limit]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    horario: r.horario,
    status: r.status,
  }));
}

export async function getDashboard(): Promise<DashboardResult> {
  try {
    const [totals, daily, weekly, hourly, recent] = await Promise.all([
      getTotals(),
      getDaily(),
      getWeekly(),
      getHourly(),
      getRecent(),
    ]);
    return { ok: true, data: { totals, daily, weekly, hourly, recent } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/** Todas as peças, em ordem cronológica — usado na exportação para Excel. */
export async function getAllPieces(): Promise<RecentPiece[]> {
  const rows = await query<{ id: number; horario: string; status: string }>(
    `SELECT
       id,
       to_char(horario AT TIME ZONE $1, 'YYYY-MM-DD HH24:MI:SS') AS horario,
       status
     FROM pecas
     ORDER BY horario ASC`,
    [DISPLAY_TIMEZONE]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    horario: r.horario,
    status: r.status,
  }));
}
