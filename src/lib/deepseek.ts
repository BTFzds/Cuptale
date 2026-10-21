import OpenAI from "openai";
import { resolveImagesForVision } from "@/lib/ai-images";

const FLAVOR_SYSTEM_PROMPT = `你是「HUSH」家庭调酒吧的文案师。根据内部配方信息和成片外观，写一段对外短风味介绍。

要求：
1. 中文，2–4 句，约 40–90 字，口语自然。
2. 可写口感、香气、颜色；少用文艺套话。
3. 绝对不要写出具体原料名称、毫升数、配比或制作步骤。
4. 不要标题、不要列表、不要引号包裹全文、不要表情符号。
5. 只输出风味正文本身。`;

function getClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("未配置 DEEPSEEK_API_KEY");
  return new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  });
}

async function completeFlavor(
  client: OpenAI,
  model: string,
  userContent: string | OpenAI.Chat.Completions.ChatCompletionContentPart[],
) {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: FLAVOR_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    temperature: 0.85,
    max_tokens: 400,
  });
  return completion.choices[0]?.message?.content?.trim() || "";
}

export async function generateFlavorText(input: {
  drinkName: string;
  recipeName?: string;
  ingredientsSummary?: string;
  steps?: string;
  tasteHints?: string;
  imageUrls?: string[];
}) {
  const client = getClient();
  const textModel = process.env.DEEPSEEK_MODEL || "deepseek-flash";
  const visionModel =
    process.env.DEEPSEEK_MODEL_VISION || process.env.DEEPSEEK_MODEL || textModel;

  const userText = [
    `酒名：${input.drinkName}`,
    input.recipeName ? `关联配方名：${input.recipeName}` : "",
    input.ingredientsSummary
      ? `内部原料参考（勿外泄）：${input.ingredientsSummary}`
      : "",
    input.steps ? `制作步骤参考（勿外泄）：${input.steps}` : "",
    input.tasteHints ? `口味标签：${input.tasteHints}` : "",
    "请写对外风味介绍，不要点名原料。",
  ]
    .filter(Boolean)
    .join("\n");

  // 先纯文本（稳定）；识图仅作增强，失败则回退
  let text = await completeFlavor(client, textModel, userText);
  if (text) return text;

  const images = await resolveImagesForVision(input.imageUrls || [], 1);
  if (images.length) {
    text = await completeFlavor(client, visionModel, [
      { type: "text", text: userText + "\n请结合照片颜色与气质。" },
      { type: "image_url", image_url: { url: images[0] } },
    ]);
    if (text) return text;
  }

  // 最后兜底：再试一次更短提示
  text = await completeFlavor(
    client,
    textModel,
    `酒名「${input.drinkName}」。写 2–3 句中文风味介绍，不要原料名。`,
  );
  if (!text) throw new Error("DeepSeek 未返回内容");
  return text;
}
