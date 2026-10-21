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

      if (row.recipeId) {
        await keepSingleDrinkForRecipe(row.recipeId);
        await prisma.recipe.update({
          where: { id: row.recipeId },
          data: { name: row.name, category, flavorText: row.flavorText },
        });

        if (row.drinkId) {
          await prisma.drink.update({
            where: { id: row.drinkId },
            data: { ...drinkData, recipeId: row.recipeId },
          });
        } else if (row.isPublished) {
          await prisma.drink.create({
            data: { ...drinkData, recipeId: row.recipeId },
          });
        }
      } else if (row.drinkId) {
        await prisma.drink.update({
          where: { id: row.drinkId },
          data: drinkData,
        });
      } else if (row.name.trim()) {
        // CSV 导入的新行（无配方/无酒品 ID）
        await prisma.drink.create({
          data: {
            ...drinkData,
            imageUrl: row.imageUrl || null,
            recipeId: null,
          },
        });
      }
    }

    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
