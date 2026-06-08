import ExcelJS from "exceljs";
import { getAllPieces } from "@/lib/metrics";

// Precisa do runtime Node (pg + exceljs) e nunca deve ser cacheado.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let rows;
  try {
    rows = await getAllPieces();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`Erro ao consultar o banco de dados: ${message}`, {
      status: 500,
    });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "OEE Monitor";
  const sheet = workbook.addWorksheet("Peças");

  sheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Horário", key: "horario", width: 24 },
    { header: "Status", key: "status", width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const r of rows) {
    sheet.addRow({ id: r.id, horario: r.horario, status: r.status });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="pecas.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
