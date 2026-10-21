import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const drinks = await prisma.drink.findMany({
    where: { recipeId: { not: null } },
    orderBy: { updatedAt: "desc" },
  });
  const seen = new Set();
  let unlinked = 0;
  for (const d of drinks) {
    if (seen.has(d.recipeId)) {
      await prisma.drink.update({
        where: { id: d.id },
        data: { recipeId: null, isPublished: false },
      });
      unlinked += 1;
    } else {
      seen.add(d.recipeId);
    }
  }

  const published = await prisma.drink.findMany({
    where: { isPublished: true },
    orderBy: { updatedAt: "desc" },
  });
  const keys = new Set();
  let unpublished = 0;
  for (const d of published) {
    const key = d.recipeId ? `r:${d.recipeId}` : `n:${d.name.trim()}`;
    if (keys.has(key)) {
      await prisma.drink.update({
        where: { id: d.id },
        data: { isPublished: false },
      });
      unpublished += 1;
    } else {
      keys.add(key);
    }
  }

  console.log(
    JSON.stringify({ unlinked, unpublished, ok: true }, null, 2),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
