import { AdminNav } from "@/components/admin-nav";
import { requireAdminPage } from "@/lib/admin-guard";
import { OrdersBoard } from "./orders-board";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  await requireAdminPage();
  return (
    <main>
      <AdminNav />
      <OrdersBoard />
    </main>
  );
}
