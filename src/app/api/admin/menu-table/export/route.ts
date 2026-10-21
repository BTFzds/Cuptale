import { requireAdmin } from "@/lib/auth";
import { handleRouteError } from "@/lib/http";
import { csvFilename, menuRowsToCsv } from "@/lib/menu-csv";
import { buildMenuTableRows } from "@/lib/menu-table-query";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await buildMenuTableRows();
    const csv = menuRowsToCsv(rows);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename()}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
