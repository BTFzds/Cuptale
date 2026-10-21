import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import { RecipeEditor } from "@/components/recipe-editor";
import { requireAdminPage } from "@/lib/admin-guard";

export default async function EditRecipePage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdminPage();
  return (
    <main>
      <AdminNav />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">编辑配方</h1>
        <Link href="/admin/recipes" className="text-sm text-ink-mute">
          返回菜单
        </Link>
      </div>
      <RecipeEditor recipeId={params.id} />
    </main>
  );
}
