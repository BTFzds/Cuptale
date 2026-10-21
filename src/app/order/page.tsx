import { MenuClient } from "./menu-client";
import { dedupePublishedDrinks } from "@/lib/dedupe-drinks";
import { toPublicDrink } from "@/lib/dto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OrderPage() {
  const drinks = await prisma.drink.findMany({
    where: { isPublished: true },
    include: { recipe: { select: { flavorText: true } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  const unique = dedupePublishedDrinks(drinks);

  return <MenuClient drinks={unique.map(toPublicDrink)} />;
}
