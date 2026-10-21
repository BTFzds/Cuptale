import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { DRINK_CATEGORIES, normalizeDrinkCategory } from "@/lib/categories";
import { keepSingleDrinkForRecipe } from "@/lib/drink-recipe-link";
import { DEFAULT_GLASS_TYPE, normalizeGlassType } from "@/lib/glasses";
import { handleRouteError, jsonOk } from "@/lib/http";
import { clampTaste } from "@/lib/menu-table";
import { buildMenuTableRows } from "@/lib/menu-table-query";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await buildMenuTableRows();
    return jsonOk({ rows, categories: DRINK_CATEGORIES });
  } catch (error) {
    return handleRouteError(error);
  }
}

const rowSchema = z.object({
  recipeId: z.string().nullable(),
  drinkId: z.string().nullable(),
  name: z.string().min(1),
  category: z.string(),
  sweetness: z.number().int().min(1).max(5),
  acidity: z.number().int().min(1).max(5),
  strength: z.number().int().min(1).max(5),
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
  ingredientsSummary: z.string().optional().default(""),
  imageUrl: z.string().nullable().optional(),
  salesCount: z.number().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = z.object({ rows: z.array(rowSchema).min(1) }).parse(
      await request.json(),
    );

    let updated = 0;
    let skipped = 0;

    for (const row of body.rows) {
      const category = normalizeDrinkCategory(row.category);
      const sweetness = clampTaste(row.sweetness, 3);
      const acidity = clampTaste(row.acidity, 3);
      const strength = clampTaste(row.strength, 2);
      const glassType = normalizeGlassType(
        row.glassType || DEFAULT_GLASS_TYPE,
      );
      const tags = {
        isNonAlcoholic: row.isNonAlcoholic,
        hasDairy: row.hasDairy,
        hasCaffeine: row.hasCaffeine,
        hasTea: row.hasTea,
        hasSparkling: row.hasSparkling,
      };

      const drinkData = {
        name: row.name,
        category,
        sweetness,
        acidity,
        strength,
        abvApprox: row.abvApprox,
        glassType,
        isPublished: row.isPublished,
        isAvailable: row.isAvailable,
        flavorText: row.flavorText,
        imageUrl: row.imageUrl === undefined ? undefined : row.imageUrl || null,
        ...tags,
      };

      const recipe =
        row.recipeId
          ? await prisma.recipe.findUnique({ where: { id: row.recipeId } })
          : null;
      const drink =
        row.drinkId
          ? await prisma.drink.findUnique({ where: { id: row.drinkId } })
          : null;

      if (recipe) {
        await keepSingleDrinkForRecipe(recipe.id);
        await prisma.recipe.update({
          where: { id: recipe.id },
          data: { name: row.name, category, flavorText: row.flavorText },
        });

        if (drink) {
          await prisma.drink.update({
            where: { id: drink.id },
            data: { ...drinkData, recipeId: recipe.id },
          });
        } else if (row.isPublished) {
          await prisma.drink.create({
            data: { ...drinkData, recipeId: recipe.id },
          });
        }
        updated += 1;
      } else if (drink) {
        // 配方已删：只改酒品，清掉失效 recipeId
        await prisma.drink.update({
          where: { id: drink.id },
          data: { ...drinkData, recipeId: null },
        });
        updated += 1;
      } else if (!row.recipeId && !row.drinkId && row.name.trim()) {
        // CSV 新增行（尚无 ID）
        await prisma.drink.create({
          data: {
            ...drinkData,
            imageUrl: row.imageUrl || null,
            recipeId: null,
          },
        });
        updated += 1;
      } else {
        skipped += 1;
      }
    }

    return jsonOk({ ok: true, updated, skipped });
  } catch (error) {
    return handleRouteError(error);
  }
}
