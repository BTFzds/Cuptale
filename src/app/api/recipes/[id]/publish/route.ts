import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { DRINK_CATEGORIES } from "@/lib/categories";
import { toAdminDrink } from "@/lib/dto";
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
    const category =
      body.category &&
      (DRINK_CATEGORIES as readonly string[]).includes(body.category)
        ? body.category
        : "特调";

    const existing = await prisma.drink.findFirst({
      where: { recipeId: recipe.id },
      orderBy: { updatedAt: "desc" },
    });

    const data = {
      name: body.name?.trim() || recipe.name,
      imageUrl:
        body.imageUrl === undefined
          ? recipe.imageUrl
          : body.imageUrl || null,
      flavorText: body.flavorText || "",
      category,
      tagline: body.tagline || "",
      sweetness: body.sweetness ?? 3,
      acidity: body.acidity ?? 3,
      strength: body.strength ?? 3,
      abvApprox: body.abvApprox ?? null,
      glassType: body.glassType || "岩石杯",
      isNonAlcoholic: body.isNonAlcoholic ?? false,
      hasDairy: body.hasDairy ?? false,
      hasCaffeine: body.hasCaffeine ?? false,
      allergens: body.allergens || "",
      isPublished: body.isPublished ?? true,
      isAvailable: body.isAvailable ?? true,
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
