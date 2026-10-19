import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { toAdminRecipe } from "@/lib/dto";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { stringifyImageUrls, stringifyIngredients } from "@/lib/ingredients";
import { prisma } from "@/lib/prisma";

const ingredientSchema = z.object({
  name: z.string().min(1),
  ml: z.number().min(0),
  note: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  imageUrl: z.string().optional().nullable(),
  imageUrls: z.array(z.string()).optional(),
  ingredients: z.array(ingredientSchema).optional(),
  steps: z.string().optional(),
  notes: z.string().optional(),
  flavorText: z.string().optional(),
  category: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();
    const recipe = await prisma.recipe.findUnique({ where: { id: params.id } });
    if (!recipe) return jsonError("配方不存在", 404);
    return jsonOk({ recipe: toAdminRecipe(recipe) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();
    const body = updateSchema.parse(await request.json());
    const recipe = await prisma.recipe.update({
      where: { id: params.id },
      data: {
        name: body.name,
        imageUrl: body.imageUrl === undefined ? undefined : body.imageUrl || null,
        imageUrls:
          body.imageUrls === undefined
            ? undefined
            : stringifyImageUrls(body.imageUrls),
        steps: body.steps,
        notes: body.notes,
        flavorText: body.flavorText,
        category: body.category,
        ingredients:
          body.ingredients === undefined
            ? undefined
            : stringifyIngredients(body.ingredients),
      },
    });
    if (
      body.flavorText !== undefined ||
      body.name ||
      body.imageUrl !== undefined ||
      body.category
    ) {
      await prisma.drink.updateMany({
        where: { recipeId: recipe.id },
        data: {
          ...(body.name ? { name: body.name } : {}),
          ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl || null } : {}),
          ...(body.flavorText !== undefined ? { flavorText: body.flavorText } : {}),
          ...(body.category ? { category: body.category } : {}),
        },
      });
    }
    return jsonOk({ recipe: toAdminRecipe(recipe) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();
    await prisma.recipe.delete({ where: { id: params.id } });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
