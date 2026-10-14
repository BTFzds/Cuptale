import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";

export async function requireAdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
}
