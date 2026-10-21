import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { DRINK_CATEGORIES } from "@/lib/categories";
import { handleRouteError, jsonOk } from "@/lib/http";
import { parseIngredients } from "@/lib/ingredients";
import type { MenuTableRow } from "@/lib/menu-table";
import { keepSingleDrinkForRecipe } from "@/lib/drink-recipe-link";
import { DEFAULT_GLASS_TYPE, normalizeGlassType } from "@/lib/glasses";
import { normalizeCategory, clampTaste } from "@/lib/menu-table";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();
    const [recipes, orphanDrinks] = await Promise.all([
      prisma.recipe.findMany({
        include: {
          drinks: { orderBy: { updatedAt: "desc" } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.drink.findMany({
        where: { recipeId: null },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const rows: MenuTableRow[] = [
      ...recipes.map((recipe) => {
        const drink = recipe.drinks[0] ?? null;
        const ings = parseIngredients(recipe.ingredients);
        return {
          recipeId: recipe.id,
          drinkId: drink?.id ?? null,
          name: drink?.name || recipe.name,
          category: drink?.category || recipe.category || "经典",
          sweetness: drink?.sweetness ?? 3,
          acidity: drink?.acidity ?? 3,
          strength: drink?.strength ?? 2,
          abvApprox: drink?.abvApprox ?? null,
          glassType: normalizeGlassType(
            drink?.glassType || DEFAULT_GLASS_TYPE,
          ),
          isPublished: drink?.isPublished ?? false,
          isAvailable: drink?.isAvailable ?? true,
          flavorText: (drink?.flavorText || recipe.flavorText || "").trim(),
          ingredientsSummary: ings.length
            ? ings
                .map((i) =>
                  i.ml
                    ? `${i.name} ${i.ml}ml`
                    : `${i.name}${i.note ? ` ${i.note}` : ""}`,
                )
                .join(" · ")
            : "",
          imageUrl: drink?.imageUrl || recipe.imageUrl || null,
        };
      }),
      ...orphanDrinks.map((drink) => ({
        recipeId: null,
        drinkId: drink.id,
        name: drink.name,
        category: drink.category,
        sweetness: drink.sweetness,
        acidity: drink.acidity,
        strength: drink.strength,
        abvApprox: drink.abvApprox,
        glassType: normalizeGlassType(drink.glassType),
        isPublished: drink.isPublished,
        isAvailable: drink.isAvailable,
        flavorText: drink.flavorText,
        ingredientsSummary: "",
        imageUrl: drink.imageUrl || null,
      })),
    ];

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
  flavorText: z.string(),
  ingredientsSummary: z.string().optional().default(""),
  imageUrl: z.string().nullable().optional(),
});

const patchSchema = z.object({
  rows: z.array(rowSchema).min(1),
});

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = patchSchema.parse(await request.json());

    for (const row of body.rows) {
      const category = normalizeCategory(row.category);
      const sweetness = clampTaste(row.sweetness, 3);
      const acidity = clampTaste(row.acidity, 3);
      const strength = clampTaste(row.strength, 2);

      const glassType = normalizeGlassType(
        row.glassType || DEFAULT_GLASS_TYPE,
      );

      if (row.recipeId) {
        await keepSingleDrinkForRecipe(row.recipeId);
        await prisma.recipe.update({
          where: { id: row.recipeId },
          data: {
            name: row.name,
            category,
            flavorText: row.flavorText,
          },
        });

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
          recipeId: row.recipeId,
          isNonAlcoholic: !row.abvApprox || row.abvApprox < 0.5,
        };

        if (row.drinkId) {
          await prisma.drink.update({
            where: { id: row.drinkId },
            data: drinkData,
          });
        } else if (row.isPublished) {
          await prisma.drink.create({ data: drinkData });
        }
      } else if (row.drinkId) {
        await prisma.drink.update({
          where: { id: row.drinkId },
          data: {
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
            isNonAlcoholic: !row.abvApprox || row.abvApprox < 0.5,
          },
        });
      }
    }

    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
