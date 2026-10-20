import OpenAI from "openai";

const FLAVOR_SYSTEM_PROMPT = `你是「HUSH」家庭调酒吧的文案师。根据内部配方信息和成片外观，写一段对外短风味介绍。

要求：
1. 中文，2–4 句，约 40–90 字，口语自然。
2. 可写口感、香气、颜色；少用文艺套话。
3. 绝对不要写出具体原料名称、毫升数、配比或制作步骤。
4. 不要标题、不要列表、不要引号包裹全文、不要表情符号。
5. 只输出风味正文本身。`;

export async function generateFlavorText(input: {
  drinkName: string;
  recipeName?: string;
  ingredientsSummary?: string;
  steps?: string;
  tasteHints?: string;
  imageUrls?: string[];
}) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("未配置 DEEPSEEK_API_KEY");
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  });

  const userText = [
    `酒名：${input.drinkName}`,
    input.recipeName ? `关联配方名：${input.recipeName}` : "",
    input.ingredientsSummary
      ? `内部原料参考（勿外泄）：${input.ingredientsSummary}`
      : "",
    input.steps ? `制作步骤参考（勿外泄）：${input.steps}` : "",
    input.tasteHints ? `口味标签：${input.tasteHints}` : "",
    "请结合照片里的颜色、杯型观感写介绍，仍不要点名原料。",
  ]
    .filter(Boolean)
    .join("\n");

  const images = (input.imageUrls || []).filter(Boolean).slice(0, 2);
  const useVision = images.length > 0;
  const model = useVision
    ? process.env.DEEPSEEK_MODEL_VISION ||
      process.env.DEEPSEEK_MODEL ||
      "deepseek-flash"
    : process.env.DEEPSEEK_MODEL || "deepseek-flash";

  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    { type: "text", text: userText },
    ...images.map((url) => ({
      type: "image_url" as const,
      image_url: { url },
    })),
  ];

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: FLAVOR_SYSTEM_PROMPT },
      {
        role: "user",
        content: useVision ? content : userText,
      },
    ],
    temperature: 0.9,
    max_tokens: 300,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("DeepSeek 未返回内容");
  return text;
}
