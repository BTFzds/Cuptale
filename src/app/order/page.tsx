import { MenuClient } from "./menu-client";
import { toPublicDrink } from "@/lib/dto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OrderPage() {
  const drinks = await prisma.drink.findMany({
    where: { isPublished: true },
    include: { recipe: { select: { flavorText: true } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return <MenuClient drinks={drinks.map(toPublicDrink)} />;
}
