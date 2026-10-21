/**
 * Netlify / 生产 db push 前：清理同一 recipeId 多杯酒，避免 @unique 建索引失败。
 * 使用 raw SQL，避免「schema 已有新列、库尚未 push」时 Prisma findMany 崩溃。
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("[dedupe] skip: no DATABASE_URL");
    return;
  }

  // 不 SELECT *，只取 dedupe 需要的列（兼容库尚未加 hasTea 等新列）
  const drinks = await prisma.$queryRaw`
    SELECT id, "recipeId", name, "isPublished", "updatedAt"
    FROM "Drink"
    WHERE "recipeId" IS NOT NULL
    ORDER BY "updatedAt" DESC
  `;

  const seen = new Set();
  let unlinked = 0;
  for (const d of drinks) {
    if (!d.recipeId) continue;
    if (seen.has(d.recipeId)) {
      await prisma.$executeRaw`
        UPDATE "Drink"
        SET "recipeId" = NULL, "isPublished" = false
        WHERE id = ${d.id}
      `;
      unlinked += 1;
    } else {
      seen.add(d.recipeId);
    }
  }

  const published = await prisma.$queryRaw`
    SELECT id, "recipeId", name, "updatedAt"
    FROM "Drink"
    WHERE "isPublished" = true
    ORDER BY "updatedAt" DESC
  `;
  const keys = new Set();
  let unpublished = 0;
  for (const d of published) {
    const key = d.recipeId
      ? `r:${d.recipeId}`
      : `n:${String(d.name || "").trim()}`;
    if (keys.has(key)) {
      await prisma.$executeRaw`
        UPDATE "Drink" SET "isPublished" = false WHERE id = ${d.id}
      `;
      unpublished += 1;
    } else {
      keys.add(key);
    }
  }

  console.log(
    `[dedupe] unlinked=${unlinked} unpublished_name_dups=${unpublished}`,
  );
}

main()
  .catch((e) => {
    console.error("[dedupe] failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
