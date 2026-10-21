import { prisma } from "@/lib/prisma";

/** 保证一个配方最多绑定一杯酒；多余的解除绑定并下架 */
export async function keepSingleDrinkForRecipe(recipeId: string) {
  const drinks = await prisma.drink.findMany({
    where: { recipeId },
    orderBy: { updatedAt: "desc" },
  });
  if (drinks.length <= 1) return drinks[0] ?? null;

  const [keep, ...rest] = drinks;
  await prisma.drink.updateMany({
    where: { id: { in: rest.map((d) => d.id) } },
    data: { recipeId: null, isPublished: false },
  });
  return keep;
}
