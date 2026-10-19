import { AdminNav } from "@/components/admin-nav";
import { requireAdminPage } from "@/lib/admin-guard";
import { MakeStation } from "./make-station";

export const dynamic = "force-dynamic";

export default async function AdminMakeOrderPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdminPage();
  return (
    <main>
      <AdminNav />
      <MakeStation orderId={params.id} />
    </main>
  );
}
