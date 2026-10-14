import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import { DrinkEditor } from "@/components/drink-editor";
import { requireAdminPage } from "@/lib/admin-guard";

export default async function EditDrinkPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdminPage();
  return (
    <main>
      <AdminNav />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">编辑酒品</h1>
        <Link href="/admin/drinks" className="text-sm text-ink-mute">
          返回列表
        </Link>
      </div>
      <DrinkEditor drinkId={params.id} />
    </main>
  );
}
