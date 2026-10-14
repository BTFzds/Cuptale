import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import { requireAdminPage } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDrinksPage() {
  await requireAdminPage();
  const drinks = await prisma.drink.findMany({
    include: { recipe: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <main>
      <AdminNav />
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">酒品管理</h1>
          <p className="text-sm text-ink-soft">对外菜单，可先上架后补配方</p>
        </div>
        <Link href="/admin/drinks/new" className="btn-primary">
          新增酒品
        </Link>
      </div>

      <div className="space-y-3">
        {drinks.length === 0 ? (
          <div className="card-surface px-5 py-8 text-center text-sm text-ink-mute">
            还没有酒品，先新增一杯吧。
          </div>
        ) : (
          drinks.map((drink) => (
            <Link
              key={drink.id}
              href={`/admin/drinks/${drink.id}`}
              className="card-surface block p-4 transition hover:bg-white/80"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg text-ink">{drink.name}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
                    {drink.flavorText || "暂无风味文案"}
                  </p>
                  <p className="mt-2 text-xs text-ink-mute">
                    配方：{drink.recipe?.name || "未关联"} ·{" "}
                    {drink.isPublished ? "已上架" : "未上架"} ·{" "}
                    {drink.isAvailable ? "供应中" : "暂停供应"}
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
