import { NextRequest } from "next/server";
import { z } from "zod";
import { batchDetectGlasses } from "@/lib/ai-glasses";
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
  isNonAlcoholic: z.boolean().optional().default(false),
  hasDairy: z.boolean().optional().default(false),
  hasCaffeine: z.boolean().optional().default(false),
  hasTea: z.boolean().optional().default(false),
  hasSparkling: z.boolean().optional().default(false),
  flavorText: z.string(),
  ingredientsSummary: z.string(),
  imageUrl: z.string().nullable().optional().default(null),
  salesCount: z.number().optional().default(0),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = z.object({ rows: z.array(rowSchema).min(1) }).parse(
      await request.json(),
    );
    if (!body.rows.some((r) => r.imageUrl)) {
      return jsonError("没有可识别的成片，请先上传封面图");
    }
    const result = await batchDetectGlasses(
      body.rows.map((r) => ({
        ...r,
        imageUrl: r.imageUrl ?? null,
        isNonAlcoholic: r.isNonAlcoholic,
        hasDairy: r.hasDairy,
        hasCaffeine: r.hasCaffeine,
        hasTea: r.hasTea,
        hasSparkling: r.hasSparkling,
        salesCount: r.salesCount ?? 0,
      })),
    );
    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
