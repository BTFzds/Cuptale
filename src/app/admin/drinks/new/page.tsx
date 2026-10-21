import { redirect } from "next/navigation";

/** 旧酒品新增（无 AI），统一走配方/AI 新增 */
export default function AdminNewDrinkRedirect() {
  redirect("/admin/recipes/new");
}
