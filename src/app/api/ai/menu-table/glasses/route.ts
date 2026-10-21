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
  flavorText: z.string(),
  ingredientsSummary: z.string(),
  imageUrl: z.string().nullable().optional().default(null),
});

const schema = z.object({
  rows: z.array(rowSchema).min(1),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = schema.parse(await request.json());
    const withImages = body.rows.filter((r) => r.imageUrl);
    if (!withImages.length) {
      return jsonError("没有可识别的成片，请先在菜单里给酒品上传封面图");
    }
    const result = await batchDetectGlasses(
      body.rows.map((r) => ({ ...r, imageUrl: r.imageUrl ?? null })),
    );
    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
