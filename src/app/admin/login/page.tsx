import { redirect } from "next/navigation";

/** Password gate removed — keep URL so old bookmarks still work. */
export default function AdminLoginPage() {
  redirect("/admin/orders");
}
