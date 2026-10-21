import { NextRequest } from "next/server";
import { z } from "zod";
import { chatRecipeWithAi, type RecipeAiDraft } from "@/lib/ai-recipe";
import { requireAdmin } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";

const ingredientSchema = z.object({
  name: z.string(),
  ml: z.number(),
  note: z.string().optional(),
});

const tasteSchema = z.object({
  category: z.string(),
  tagline: z.string(),
  sweetness: z.number(),
  acidity: z.number(),
  strength: z.number(),
  abvApprox: z.number().nullable(),
  glassType: z.string(),
  isNonAlcoholic: z.boolean(),
  hasDairy: z.boolean(),
  hasCaffeine: z.boolean(),
  allergens: z.string(),
  flavorText: z.string(),
});

const draftSchema = z.object({
  name: z.string(),
  notes: z.string(),
  ingredients: z.array(ingredientSchema),
  steps: z.string(),
  taste: tasteSchema,
  questions: z.array(z.string()),
  assistantMessage: z.string(),
});

const schema = z.object({
  draft: draftSchema,
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .min(1),
  imageUrls: z.array(z.string()).optional().default([]),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = schema.parse(await request.json());
    const last = body.messages.at(-1);
    if (!last || last.role !== "user" || !last.content.trim()) {
      return jsonError("请先输入要确认的内容");
    }
    const draft = await chatRecipeWithAi({
      draft: body.draft as RecipeAiDraft,
      messages: body.messages,
      imageUrls: body.imageUrls,
    });
    return jsonOk({ draft });
  } catch (error) {
    return handleRouteError(error);
  }
}
