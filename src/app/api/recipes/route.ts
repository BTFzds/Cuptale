import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { toAdminRecipe } from "@/lib/dto";
import { handleRouteError, jsonOk } from "@/lib/http";
import { stringifyImageUrls, stringifyIngredients } from "@/lib/ingredients";
import { prisma } from "@/lib/prisma";

const ingredientSchema = z.object({
  name: z.string().min(1),
  ml: z.number().min(0),
  note: z.string().optional(),
});

const createSchema = z.object({
  name: z.string().min(1, "请填写配方名"),
  imageUrl: z.string().optional().nullable(),
  imageUrls: z.array(z.string()).optional().default([]),
  ingredients: z.array(ingredientSchema).default([]),
  steps: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  flavorText: z.string().optional().default(""),
  category: z.string().optional().default("经典"),
});

export async function GET() {
  try {
    await requireAdmin();
    const recipes = await prisma.recipe.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return jsonOk({ recipes: recipes.map(toAdminRecipe) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = createSchema.parse(await request.json());
    const recipe = await prisma.recipe.create({
      data: {
        name: body.name,
        imageUrl: body.imageUrl || null,
        imageUrls: stringifyImageUrls(body.imageUrls || []),
        ingredients: stringifyIngredients(body.ingredients),
        steps: body.steps,
        notes: body.notes,
        flavorText: body.flavorText,
        category: body.category || "经典",
      },
    });
    return jsonOk({ recipe: toAdminRecipe(recipe) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
