import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { ORDER_STATUSES } from "@/lib/constants";
import { toAdminOrder } from "@/lib/dto";
import { handleRouteError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

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
