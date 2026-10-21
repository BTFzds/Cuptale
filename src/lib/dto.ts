import type { Drink, Order, Recipe } from "@prisma/client";
import { parseImageUrls, parseIngredients } from "@/lib/ingredients";

/** Guest flavor comes from the drink, then the recipe's public flavor line. */
export function guestFlavorText(
  drink: { flavorText: string },
  recipe?: { flavorText: string } | null,
) {
  return drink.flavorText.trim() || recipe?.flavorText.trim() || "";
}

/** Public drink shape — never includes recipe internals */
export function toPublicDrink(
  drink: Drink & { recipe?: { flavorText: string } | null },
  extras?: { salesCount?: number },
) {
  return {
    id: drink.id,
    name: drink.name,
    imageUrl: drink.imageUrl,
    flavorText: guestFlavorText(drink, drink.recipe),
    category: drink.category,
    tagline: drink.tagline,
    sweetness: drink.sweetness,
    acidity: drink.acidity,
    strength: drink.strength,
    abvApprox: drink.abvApprox,
    glassType: drink.glassType,
    hasDairy: drink.hasDairy,
    hasCaffeine: drink.hasCaffeine,
    hasTea: drink.hasTea,
    hasSparkling: drink.hasSparkling,
    allergens: drink.allergens,
    isNonAlcoholic: drink.isNonAlcoholic,
    isAvailable: drink.isAvailable,
    salesCount: extras?.salesCount ?? 0,
  };
}

export function toAdminDrink(drink: Drink & { recipe?: Recipe | null }) {
  return {
    ...drink,
    recipe: drink.recipe
      ? {
          id: drink.recipe.id,
          name: drink.recipe.name,
        }
      : null,
  };
}

export function toAdminRecipe(recipe: Recipe) {
  return {
    ...recipe,
    ingredients: parseIngredients(recipe.ingredients),
    imageUrls: parseImageUrls(recipe.imageUrls),
  };
}

export function toPublicOrder(
  order: Order & { drink: Pick<Drink, "id" | "name" | "imageUrl"> },
) {
  return {
    id: order.id,
    nickname: order.nickname,
    drinkId: order.drinkId,
    drinkName: order.drink.name,
    drinkImageUrl: order.drink.imageUrl,
    quantity: order.quantity,
    note: order.note,
    status: order.status,
    publicToken: order.publicToken,
    createdAt: order.createdAt.toISOString(),
  };
}

export function toAdminOrder(
  order: Order & { drink: Pick<Drink, "id" | "name" | "imageUrl"> },
) {
  return toPublicOrder(order);
}
