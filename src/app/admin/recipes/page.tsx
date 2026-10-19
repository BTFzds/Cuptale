import Link from "next/link";
import { AdminListActions } from "@/components/admin-list-actions";
import { AdminNav } from "@/components/admin-nav";
import { requireAdminPage } from "@/lib/admin-guard";
import { parseIngredients } from "@/lib/ingredients";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminRecipesPage() {
  await requireAdminPage();
  const recipes = await prisma.recipe.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <main>
      <AdminNav />
      <div className="mb-5 flex items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">配方</h1>
        <Link href="/admin/recipes/new" className="btn-primary">
          新增
        </Link>
      </div>

      <div className="space-y-3">
        {recipes.length === 0 ? (
          <div className="border border-[#f0f0f0] px-5 py-8 text-center text-sm text-ink-mute">
            暂无配方
          </div>
        ) : (
          recipes.map((recipe) => {
            const ingredients = parseIngredients(recipe.ingredients);
            return (
              <div
                key={recipe.id}
                className="flex items-start justify-between gap-3 border border-[#f0f0f0] p-4"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/recipes/${recipe.id}`}
                    className="text-lg font-medium"
                  >
                    {recipe.name}
                  </Link>
                  <p className="mt-2 text-sm text-ink-soft">
                    {ingredients.length
                      ? ingredients
                          .map((i) =>
                            i.ml
                              ? `${i.name} ${i.ml}ml`
                              : `${i.name}${i.note ? ` ${i.note}` : ""}`,
                          )
                          .join(" · ")
                      : "未填原料"}
                  </p>
                  <p className="mt-1 text-xs text-ink-mute">
                    {recipe.imageUrl ? "已有成片" : "仅手记，可稍后补图再上架"}
                  </p>
                </div>
                <AdminListActions
                  editHref={`/admin/recipes/${recipe.id}`}
                  deleteUrl={`/api/recipes/${recipe.id}`}
                  confirmText={`删除配方「${recipe.name}」？`}
                />
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
