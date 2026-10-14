import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { toAdminDrink, toPublicDrink } from "@/lib/dto";
import { handleRouteError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const drinkBodySchema = z.object({
  name: z.string().min(1, "请填写酒名"),
  imageUrl: z.string().optional().nullable(),
  flavorText: z.string().optional().default(""),
  category: z.string().optional().default("经典"),
  tagline: z.string().optional().default(""),
  sweetness: z.number().int().min(1).max(5).optional().default(3),
  acidity: z.number().int().min(1).max(5).optional().default(3),
  strength: z.number().int().min(1).max(5).optional().default(3),
  abvApprox: z.number().min(0).max(100).optional().nullable(),
  glassType: z.string().optional().default("岩石杯"),
  isNonAlcoholic: z.boolean().optional().default(false),
  hasDairy: z.boolean().optional().default(false),
  hasCaffeine: z.boolean().optional().default(false),
  allergens: z.string().optional().default(""),
  isPublished: z.boolean().optional().default(false),
  isAvailable: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
  recipeId: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const scope = request.nextUrl.searchParams.get("scope");

    if (scope === "admin") {
      const drinks = await prisma.drink.findMany({
        include: { recipe: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      });
      return jsonOk({ drinks: drinks.map(toAdminDrink) });
    }

    const drinks = await prisma.drink.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return jsonOk({ drinks: drinks.map(toPublicDrink) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = drinkBodySchema.parse(await request.json());
    const drink = await prisma.drink.create({
      data: {
        name: body.name,
        imageUrl: body.imageUrl || null,
        flavorText: body.flavorText,
        category: body.category,
        tagline: body.tagline,
        sweetness: body.sweetness,
        acidity: body.acidity,
        strength: body.strength,
        abvApprox: body.abvApprox ?? null,
        glassType: body.glassType,
        isNonAlcoholic: body.isNonAlcoholic,
        hasDairy: body.hasDairy,
        hasCaffeine: body.hasCaffeine,
        allergens: body.allergens,
        isPublished: body.isPublished,
        isAvailable: body.isAvailable,
        sortOrder: body.sortOrder,
        recipeId: body.recipeId || null,
      },
      include: { recipe: true },
    });
    return jsonOk({ drink: toAdminDrink(drink) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
