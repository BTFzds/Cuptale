import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { toAdminOrder, toPublicOrder } from "@/lib/dto";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  nickname: z.string().min(1, "请填写昵称").max(40),
  note: z.string().max(200).optional().default(""),
  items: z
    .array(
      z.object({
        drinkId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1, "请至少选择一杯"),
});

export async function GET() {
  try {
    await requireAdmin();
    const orders = await prisma.order.findMany({
      include: { drink: { select: { id: true, name: true, imageUrl: true } } },
      orderBy: { createdAt: "desc" },
    });

    const summaryMap = new Map<string, { drinkId: string; name: string; quantity: number }>();
    for (const order of orders) {
      if (order.status === "done") continue;
      const prev = summaryMap.get(order.drinkId);
      const qty = order.quantity + (prev?.quantity || 0);
      summaryMap.set(order.drinkId, {
        drinkId: order.drinkId,
        name: order.drink.name,
        quantity: qty,
      });
    }

    return jsonOk({
      orders: orders.map(toAdminOrder),
      summary: Array.from(summaryMap.values()).sort((a, b) => b.quantity - a.quantity),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json());
    const drinkIds = body.items.map((item) => item.drinkId);
    const drinks = await prisma.drink.findMany({
      where: { id: { in: drinkIds }, isPublished: true },
    });
    const drinkMap = new Map(drinks.map((d) => [d.id, d]));

    for (const item of body.items) {
      const drink = drinkMap.get(item.drinkId);
      if (!drink) return jsonError("部分饮品不存在或未上架", 400);
      if (!drink.isAvailable) return jsonError(`「${drink.name}」暂停供应`, 400);
    }

    const publicToken = randomUUID().replace(/-/g, "");
    const created = await prisma.$transaction(
      body.items.map((item) =>
        prisma.order.create({
          data: {
            nickname: body.nickname.trim(),
            drinkId: item.drinkId,
            quantity: item.quantity,
            note: body.note?.trim() || "",
            status: "pending",
            publicToken,
          },
          include: { drink: { select: { id: true, name: true, imageUrl: true } } },
        }),
      ),
    );

    return jsonOk(
      {
        publicToken,
        orders: created.map(toPublicOrder),
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
