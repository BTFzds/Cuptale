import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { toAdminDrink, toPublicDrink } from "@/lib/dto";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  imageUrl: z.string().optional().nullable(),
  flavorText: z.string().optional(),
  category: z.string().optional(),
  tagline: z.string().optional(),
  sweetness: z.number().int().min(1).max(5).optional(),
  acidity: z.number().int().min(1).max(5).optional(),
  strength: z.number().int().min(1).max(5).optional(),
  abvApprox: z.number().min(0).max(100).optional().nullable(),
  glassType: z.string().optional(),
  isNonAlcoholic: z.boolean().optional(),
  hasDairy: z.boolean().optional(),
  hasCaffeine: z.boolean().optional(),
  hasTea: z.boolean().optional(),
  hasSparkling: z.boolean().optional(),
  allergens: z.string().optional(),
  isPublished: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  recipeId: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const adminView = request.nextUrl.searchParams.get("admin") === "1";
    const drink = await prisma.drink.findUnique({
      where: { id: params.id },
      include: { recipe: adminView },
    });
    if (!drink) return jsonError("饮品不存在", 404);
    if (!adminView && !drink.isPublished) return jsonError("饮品不存在", 404);

    if (adminView) return jsonOk({ drink: toAdminDrink(drink) });
    return jsonOk({ drink: toPublicDrink(drink) });
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
    const drink = await prisma.drink.update({
      where: { id: params.id },
      data: {
        ...body,
        recipeId: body.recipeId === undefined ? undefined : body.recipeId || null,
      },
      include: { recipe: true },
    });
    return jsonOk({ drink: toAdminDrink(drink) });
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
    await prisma.drink.delete({ where: { id: params.id } });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
