import { NextRequest } from "next/server";
import { z } from "zod";
import { parseRecipeWithAi } from "@/lib/ai-recipe";
import { requireAdmin } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";

const schema = z.object({
  text: z.string().optional().default(""),
  imageUrls: z.array(z.string()).optional().default([]),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = schema.parse(await request.json());
    if (!body.text.trim() && body.imageUrls.length === 0) {
      return jsonError("请粘贴随手记，或先上传图片");
    }
    const draft = await parseRecipeWithAi({
      text: body.text,
      imageUrls: body.imageUrls,
    });
    return jsonOk({ draft });
  } catch (error) {
    return handleRouteError(error);
  }
}
