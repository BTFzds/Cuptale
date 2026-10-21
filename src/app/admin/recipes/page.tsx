import Link from "next/link";
import { AdminMenuList, type MenuItem } from "@/components/admin-menu-list";
import { AdminNav } from "@/components/admin-nav";
import { requireAdminPage } from "@/lib/admin-guard";
import { parseIngredients } from "@/lib/ingredients";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  await requireAdminPage();

  const [recipes, orphanDrinks] = await Promise.all([
    prisma.recipe.findMany({
      include: {
        drinks: {
          select: {
            id: true,
            isPublished: true,
            isAvailable: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.drink.findMany({
      where: { recipeId: null },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const items: MenuItem[] = [
    ...recipes.map((recipe) => {
      const drink = recipe.drinks[0] ?? null;
      const isPublished = drink?.isPublished ?? false;
      const isAvailable = drink?.isAvailable ?? true;
      const ingredients = parseIngredients(recipe.ingredients);
      const summary = ingredients.length
        ? ingredients
            .map((i) =>
              i.ml
                ? `${i.name} ${i.ml}ml`
                : `${i.name}${i.note ? ` ${i.note}` : ""}`,
            )
            .join(" · ")
        : recipe.flavorText?.trim() || "未填原料";

      return {
        key: `recipe-${recipe.id}`,
        name: recipe.name,
        summary,
        meta: [
          recipe.category,
          isPublished ? "已上架" : "未上架",
          isPublished ? (isAvailable ? "供应中" : "售罄") : null,
          recipe.imageUrl ? "已有成片" : "可稍后补图",
        ]
          .filter(Boolean)
          .join(" · "),
        isPublished,
        isAvailable,
        recipeId: recipe.id,
        drinkId: drink?.id ?? null,
        editHref: `/admin/recipes/${recipe.id}`,
        deleteUrl: `/api/recipes/${recipe.id}`,
        confirmText: `删除「${recipe.name}」？关联前台酒品也会受影响。`,
      };
    }),
    ...orphanDrinks.map((drink) => ({
      key: `drink-${drink.id}`,
      name: drink.name,
      summary: drink.flavorText.trim() || drink.tagline || "无配方手记",
      meta: [
        drink.category,
        drink.isPublished ? "已上架" : "未上架",
        drink.isPublished ? (drink.isAvailable ? "供应中" : "售罄") : null,
        "旧酒品",
      ]
        .filter(Boolean)
        .join(" · "),
      isPublished: drink.isPublished,
      isAvailable: drink.isAvailable,
      drinkId: drink.id,
      editHref: `/admin/drinks/${drink.id}`,
      deleteUrl: `/api/drinks/${drink.id}`,
      confirmText: `删除「${drink.name}」？相关订单也会删除。`,
    })),
  ];

  return (
    <main>
      <AdminNav />
      <div className="mb-5 flex items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">菜单</h1>
        <Link href="/admin/recipes/new" className="btn-primary">
          新增
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="card-surface px-5 py-8 text-center text-sm text-ink-mute">
          还没有饮品，点右上角新增（支持 AI 整理配方）
        </div>
      ) : (
        <AdminMenuList items={items} />
      )}
    </main>
  );
}
