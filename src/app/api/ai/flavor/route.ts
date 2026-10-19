import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { generateFlavorText } from "@/lib/deepseek";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { parseIngredients } from "@/lib/ingredients";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  drinkId: z.string().optional(),
  drinkName: z.string().optional(),
  recipeId: z.string().optional().nullable(),
  tasteHints: z.string().optional(),
  ingredientsSummary: z.string().optional(),
  steps: z.string().optional(),
  imageUrls: z.array(z.string()).optional().default([]),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = schema.parse(await request.json());

    let drinkName = body.drinkName || "";
    let recipeName = "";
    let ingredientsSummary = body.ingredientsSummary || "";
    let steps = body.steps || "";
    let tasteHints = body.tasteHints || "";
    let imageUrls = body.imageUrls || [];

    if (body.drinkId) {
      const drink = await prisma.drink.findUnique({
        where: { id: body.drinkId },
        include: { recipe: true },
      });
      if (!drink) return jsonError("饮品不存在", 404);
      drinkName = drink.name;
      tasteHints =
        tasteHints ||
        `甜度${drink.sweetness} 酸度${drink.acidity} 烈度${drink.strength} 杯型${drink.glassType}`;
      if (drink.recipe) {
        recipeName = drink.recipe.name;
        ingredientsSummary =
          ingredientsSummary ||
          parseIngredients(drink.recipe.ingredients)
            .map((i) => `${i.name}${i.ml}ml`)
            .join("、");
        steps = steps || drink.recipe.steps;
        if (!imageUrls.length && drink.imageUrl) imageUrls = [drink.imageUrl];
      }
    }

    if (body.recipeId) {
      const recipe = await prisma.recipe.findUnique({
        where: { id: body.recipeId },
      });
      if (recipe) {
        recipeName = recipe.name;
        ingredientsSummary =
          ingredientsSummary ||
          parseIngredients(recipe.ingredients)
            .map((i) => `${i.name}${i.ml}ml`)
            .join("、");
        steps = steps || recipe.steps;
        if (!drinkName) drinkName = recipe.name;
        if (!imageUrls.length && recipe.imageUrl) imageUrls = [recipe.imageUrl];
      }
    }

    if (!drinkName) return jsonError("请提供酒名");

    const flavorText = await generateFlavorText({
      drinkName,
      recipeName,
      ingredientsSummary,
      steps,
      tasteHints,
      imageUrls,
    });

    return jsonOk({ flavorText });
  } catch (error) {
    return handleRouteError(error);
  }
}
