import { MenuClient } from "./menu-client";
import { normalizeDrinkCategory } from "@/lib/categories";
import { dedupePublishedDrinks } from "@/lib/dedupe-drinks";
import { toPublicDrink } from "@/lib/dto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OrderPage() {
  const [drinks, salesRows] = await Promise.all([
    prisma.drink.findMany({
      where: { isPublished: true },
      include: { recipe: { select: { flavorText: true } } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.order.groupBy({
      by: ["drinkId"],
      where: { status: "done" },
      _sum: { quantity: true },
    }),
  ]);

  const salesMap = new Map(
    salesRows.map((r) => [r.drinkId, r._sum.quantity || 0]),
  );

  const unique = dedupePublishedDrinks(drinks).map((d) =>
    toPublicDrink(
      { ...d, category: normalizeDrinkCategory(d.category) },
      { salesCount: salesMap.get(d.id) || 0 },
    ),
  );

  return <MenuClient drinks={unique} />;
}
