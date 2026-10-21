import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { DRINK_CATEGORIES } from "@/lib/categories";
import { keepSingleDrinkForRecipe } from "@/lib/drink-recipe-link";
import { toAdminDrink } from "@/lib/dto";
import { DEFAULT_GLASS_TYPE, normalizeGlassType } from "@/lib/glasses";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().optional(),
  imageUrl: z.string().optional().nullable(),
  flavorText: z.string().optional().default(""),
  category: z.string().optional(),
  tagline: z.string().optional().default(""),
  sweetness: z.number().int().min(1).max(5).optional(),
  acidity: z.number().int().min(1).max(5).optional(),
  strength: z.number().int().min(1).max(5).optional(),
  abvApprox: z.number().optional().nullable(),
  glassType: z.string().optional(),
  isNonAlcoholic: z.boolean().optional(),
  hasDairy: z.boolean().optional(),
  hasCaffeine: z.boolean().optional(),
  hasTea: z.boolean().optional(),
  hasSparkling: z.boolean().optional(),
  allergens: z.string().optional().default(""),
  isPublished: z.boolean().optional().default(true),
  isAvailable: z.boolean().optional().default(true),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();
    const recipe = await prisma.recipe.findUnique({ where: { id: params.id } });
    if (!recipe) return jsonError("配方不存在", 404);

    const body = schema.parse(await request.json().catch(() => ({})));
    const picked = body.category || recipe.category || "经典";
    const category = (DRINK_CATEGORIES as readonly string[]).includes(picked)
      ? picked
      : "经典";

    const existing = await keepSingleDrinkForRecipe(recipe.id);

    const data = {
      name: body.name?.trim() || existing?.name || recipe.name,
      imageUrl:
        body.imageUrl === undefined
          ? existing?.imageUrl ?? recipe.imageUrl
          : body.imageUrl || null,
      flavorText:
        body.flavorText?.trim() ||
        recipe.flavorText?.trim() ||
        existing?.flavorText ||
        "",
      category,
      tagline: body.tagline ?? existing?.tagline ?? "",
      sweetness: body.sweetness ?? existing?.sweetness ?? 3,
      acidity: body.acidity ?? existing?.acidity ?? 3,
      strength: body.strength ?? existing?.strength ?? 3,
      abvApprox:
        body.abvApprox !== undefined
          ? body.abvApprox
          : (existing?.abvApprox ?? null),
      glassType: normalizeGlassType(
        body.glassType || existing?.glassType || DEFAULT_GLASS_TYPE,
      ),
      isNonAlcoholic:
        body.isNonAlcoholic ?? existing?.isNonAlcoholic ?? false,
      hasDairy: body.hasDairy ?? existing?.hasDairy ?? false,
      hasCaffeine: body.hasCaffeine ?? existing?.hasCaffeine ?? false,
      hasTea: body.hasTea ?? existing?.hasTea ?? false,
      hasSparkling: body.hasSparkling ?? existing?.hasSparkling ?? false,
      allergens: body.allergens ?? existing?.allergens ?? "",
      isPublished: body.isPublished ?? true,
      isAvailable: body.isAvailable ?? existing?.isAvailable ?? true,
      recipeId: recipe.id,
    };

    const drink = existing
      ? await prisma.drink.update({ where: { id: existing.id }, data })
      : await prisma.drink.create({ data });

    return jsonOk({ drink: toAdminDrink(drink), reused: Boolean(existing) });
  } catch (error) {
    return handleRouteError(error);
  }
}
