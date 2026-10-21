import { DRINK_CATEGORIES, normalizeDrinkCategory } from "@/lib/categories";
import { DEFAULT_GLASS_TYPE, normalizeGlassType } from "@/lib/glasses";
import { parseIngredients } from "@/lib/ingredients";
import type { MenuTableRow } from "@/lib/menu-table";
import { prisma } from "@/lib/prisma";

async function salesByDrinkId() {
  const rows = await prisma.order.groupBy({
    by: ["drinkId"],
    where: { status: "done" },
    _sum: { quantity: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.drinkId, r._sum.quantity || 0);
  }
  return map;
}

export async function buildMenuTableRows(): Promise<MenuTableRow[]> {
  const [recipes, orphanDrinks, salesMap] = await Promise.all([
    prisma.recipe.findMany({
      include: { drinks: { orderBy: { updatedAt: "desc" } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.drink.findMany({
      where: { recipeId: null },
      orderBy: { updatedAt: "desc" },
    }),
    salesByDrinkId(),
  ]);

  return [
    ...recipes.map((recipe) => {
      const drink = recipe.drinks[0] ?? null;
      const ings = parseIngredients(recipe.ingredients);
      return {
        recipeId: recipe.id,
        drinkId: drink?.id ?? null,
        name: drink?.name || recipe.name,
        category: normalizeDrinkCategory(
          drink?.category || recipe.category || "经典",
        ),
        sweetness: drink?.sweetness ?? 3,
        acidity: drink?.acidity ?? 3,
        strength: drink?.strength ?? 2,
        abvApprox: drink?.abvApprox ?? null,
        glassType: normalizeGlassType(
          drink?.glassType || DEFAULT_GLASS_TYPE,
        ),
        isPublished: drink?.isPublished ?? false,
        isAvailable: drink?.isAvailable ?? true,
        isNonAlcoholic: drink?.isNonAlcoholic ?? false,
        hasDairy: drink?.hasDairy ?? false,
        hasCaffeine: drink?.hasCaffeine ?? false,
        hasTea: drink?.hasTea ?? false,
        hasSparkling: drink?.hasSparkling ?? false,
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
        salesCount: drink ? salesMap.get(drink.id) || 0 : 0,
      };
    }),
    ...orphanDrinks.map((drink) => ({
      recipeId: null as string | null,
      drinkId: drink.id,
      name: drink.name,
      category: normalizeDrinkCategory(drink.category),
      sweetness: drink.sweetness,
      acidity: drink.acidity,
      strength: drink.strength,
      abvApprox: drink.abvApprox,
      glassType: normalizeGlassType(drink.glassType),
      isPublished: drink.isPublished,
      isAvailable: drink.isAvailable,
      isNonAlcoholic: drink.isNonAlcoholic,
      hasDairy: drink.hasDairy,
      hasCaffeine: drink.hasCaffeine,
      hasTea: drink.hasTea,
      hasSparkling: drink.hasSparkling,
      flavorText: drink.flavorText,
      ingredientsSummary: "",
      imageUrl: drink.imageUrl || null,
      salesCount: salesMap.get(drink.id) || 0,
    })),
  ];
}

export { DRINK_CATEGORIES };
