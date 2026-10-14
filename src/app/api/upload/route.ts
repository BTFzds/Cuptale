import { requireAdmin } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { saveImage } from "@/lib/upload";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError("请选择图片文件");
    }
    if (file.size > 8 * 1024 * 1024) {
      return jsonError("图片请小于 8MB");
    }
    const url = await saveImage(file);
    return jsonOk({ url });
  } catch (error) {
    return handleRouteError(error);
  }
}
