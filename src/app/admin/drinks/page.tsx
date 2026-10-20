import Link from "next/link";
import { AdminListActions } from "@/components/admin-list-actions";
import { AdminNav } from "@/components/admin-nav";
import { DrinkShelfButtons } from "@/components/shelf-actions";
import { requireAdminPage } from "@/lib/admin-guard";
import { guestFlavorText } from "@/lib/dto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDrinksPage() {
  await requireAdminPage();
  const drinks = await prisma.drink.findMany({
    where: { isPublished: true },
    include: { recipe: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <main>
      <AdminNav />
      <div className="mb-5 flex items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">已上架</h1>
        <Link href="/admin/drinks/new" className="btn-primary">
          新增
        </Link>
      </div>

      <div className="space-y-3">
        {drinks.length === 0 ? (
          <div className="card-surface px-5 py-8 text-center text-sm text-ink-mute">
            暂无酒品
          </div>
        ) : (
          drinks.map((drink) => (
            <div
              key={drink.id}
              className="flex items-start justify-between gap-3 card-surface p-4"
            >
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-medium">{drink.name}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
                  {guestFlavorText(drink, drink.recipe) || drink.tagline || "还没写风味介绍"}
                </p>
                <p className="mt-2 text-xs text-ink-mute">
                  {drink.category}
                  {drink.isNonAlcoholic ? " · 无酒精" : ""} ·{" "}
                  {drink.recipe?.name || "无配方"} ·{" "}
                  {drink.isPublished ? "已上架" : "未上架"} ·{" "}
                  {drink.isAvailable ? "供应中" : "售罄"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <DrinkShelfButtons
                  drinkId={drink.id}
                  isPublished={drink.isPublished}
                  isAvailable={drink.isAvailable}
                />
                <AdminListActions
                  editHref={
                    drink.recipeId
                      ? `/admin/recipes/${drink.recipeId}`
                      : `/admin/drinks/${drink.id}`
                  }
                  deleteUrl={`/api/drinks/${drink.id}`}
                  confirmText={`删除「${drink.name}」？相关订单也会删除。`}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
