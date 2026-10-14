import { NextRequest } from "next/server";
import { toPublicOrder } from "@/lib/dto";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const tokensParam = request.nextUrl.searchParams.get("tokens") || "";
    const tokens = tokensParam
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 40);

    if (tokens.length === 0) {
      return jsonOk({ orders: [] });
    }

    const orders = await prisma.order.findMany({
      where: { publicToken: { in: tokens } },
      include: { drink: { select: { id: true, name: true, imageUrl: true } } },
      orderBy: { createdAt: "desc" },
    });

    return jsonOk({ orders: orders.map(toPublicOrder) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST() {
  return jsonError("Method not allowed", 405);
}
