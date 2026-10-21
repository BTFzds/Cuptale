import { redirect } from "next/navigation";

/** 旧「已上架」入口，统一到菜单 */
export default function AdminDrinksRedirect() {
  redirect("/admin/recipes");
}
