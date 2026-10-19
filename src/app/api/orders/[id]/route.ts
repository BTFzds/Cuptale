import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { ORDER_STATUSES } from "@/lib/constants";
import { toAdminOrder } from "@/lib/dto";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { parseIngredients } from "@/lib/ingredients";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

const orderInclude = {
  drink: {
    include: { recipe: true },
  },
} as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: orderInclude,
    });
    if (!order) return jsonError("订单不存在", 404);
    return jsonOk({
      order: {
        ...toAdminOrder(order),
        glassType: order.drink.glassType,
        recipeId: order.drink.recipe?.id || null,
        ingredients: parseIngredients(order.drink.recipe?.ingredients),
        steps: order.drink.recipe?.steps || "",
        notes: order.drink.recipe?.notes || "",
      },
    });
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
    const body = patchSchema.parse(await request.json());
    const order = await prisma.order.update({
      where: { id: params.id },
      data: { status: body.status },
      include: { drink: { select: { id: true, name: true, imageUrl: true } } },
    });
    return jsonOk({ order: toAdminOrder(order) });
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
    await prisma.order.delete({ where: { id: params.id } });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
