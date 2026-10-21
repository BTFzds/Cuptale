/**
 * Netlify / 生产 db push 前：清理同一 recipeId 多杯酒，避免 @unique 建索引失败。
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("[dedupe] skip: no DATABASE_URL");
    return;
  }

  const drinks = await prisma.drink.findMany({
    where: { recipeId: { not: null } },
    orderBy: { updatedAt: "desc" },
  });

  const seen = new Set();
  let unlinked = 0;
  for (const d of drinks) {
    if (!d.recipeId) continue;
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

  console.log(`[dedupe] unlinked=${unlinked} unpublished_name_dups=${unpublished}`);
}

main()
  .catch((e) => {
    console.error("[dedupe] failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
