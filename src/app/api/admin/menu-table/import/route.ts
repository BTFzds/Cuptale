import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { mergeCsvIntoMenuRows } from "@/lib/menu-csv";
import { buildMenuTableRows } from "@/lib/menu-table-query";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const contentType = request.headers.get("content-type") || "";

    let csvText = "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return jsonError("请上传 CSV 文件");
      }
      csvText = await file.text();
    } else {
      const body = await request.json().catch(() => null);
      csvText = String(body?.csv || "");
    }

    if (!csvText.trim()) return jsonError("表格内容为空");

    const current = await buildMenuTableRows();
    const result = mergeCsvIntoMenuRows(csvText, current);
    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
