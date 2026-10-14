import Link from "next/link";
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
        <div>
          <h1 className="font-display text-2xl text-ink">配方库</h1>
          <p className="text-sm text-ink-soft">私人调酒记录本，访客不可见</p>
        </div>
        <Link href="/admin/recipes/new" className="btn-primary">
          新增配方
        </Link>
      </div>

      <div className="space-y-3">
        {recipes.length === 0 ? (
          <div className="card-surface px-5 py-8 text-center text-sm text-ink-mute">
            配方库还是空的。
          </div>
        ) : (
          recipes.map((recipe) => {
            const ingredients = parseIngredients(recipe.ingredients);
            return (
              <Link
                key={recipe.id}
                href={`/admin/recipes/${recipe.id}`}
                className="card-surface block p-4 transition hover:bg-white/80"
              >
                <h2 className="font-display text-lg text-ink">{recipe.name}</h2>
                <p className="mt-2 text-sm text-ink-soft">
                  {ingredients.length
                    ? ingredients.map((i) => `${i.name} ${i.ml}ml`).join(" · ")
                    : "未填写原料"}
                </p>
              </Link>
            );
          })
        )}
      </div>
    </main>
  );
}
