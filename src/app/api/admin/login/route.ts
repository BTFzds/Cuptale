import { NextRequest } from "next/server";
import { z } from "zod";
import { createAdminSession, verifyAdminPassword } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";

const schema = z.object({
  password: z.string().min(1, "请输入密码"),
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    if (!verifyAdminPassword(body.password)) {
      return jsonError("密码不正确", 401);
    }
    await createAdminSession();
    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
