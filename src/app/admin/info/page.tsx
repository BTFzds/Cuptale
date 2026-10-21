import { AdminInfoTable } from "@/components/admin-info-table";
import { AdminNav } from "@/components/admin-nav";
import { requireAdminPage } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export default async function AdminInfoPage() {
  await requireAdminPage();
  return (
    <main>
      <AdminNav />
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">信息管理</h1>
        <p className="mt-1 text-xs text-ink-mute">
          统筹改菜单信息与状态；可 AI 重算甜酸烈，或按成片批量识杯型
        </p>
      </div>
      <AdminInfoTable />
    </main>
  );
}
