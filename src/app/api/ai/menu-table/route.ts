import { NextRequest } from "next/server";
import { z } from "zod";
import { editMenuTableWithAi } from "@/lib/ai-menu-table";
import { requireAdmin } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";

const rowSchema = z.object({
  recipeId: z.string().nullable(),
  drinkId: z.string().nullable(),
  name: z.string(),
  category: z.string(),
  sweetness: z.number(),
  acidity: z.number(),
  strength: z.number(),
  abvApprox: z.number().nullable(),
  glassType: z.string(),
  isPublished: z.boolean(),
  isAvailable: z.boolean(),
  flavorText: z.string(),
  ingredientsSummary: z.string(),
  imageUrl: z.string().nullable().optional().default(null),
});

const schema = z.object({
  rows: z.array(rowSchema).min(1),
  instruction: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = schema.parse(await request.json());
    if (!body.instruction.trim()) return jsonError("请输入修改指令");
    const rows = await editMenuTableWithAi({
      rows: body.rows.map((r) => ({ ...r, imageUrl: r.imageUrl ?? null })),
      instruction: body.instruction,
    });
    return jsonOk({ rows });
  } catch (error) {
    return handleRouteError(error);
  }
}
