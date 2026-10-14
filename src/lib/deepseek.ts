import OpenAI from "openai";

const FLAVOR_SYSTEM_PROMPT = `你是「息盏 OffSip」家庭调酒吧的文案师。根据内部配方信息，写一段对外展示的文艺风味介绍。

要求：
1. 中文，2–4 句，约 60–120 字，安静松弛、深夜居家氛围。
2. 可写口感、情绪、香气联想、颜色与温度感。
3. 绝对不要写出具体原料名称、毫升数、配比或制作步骤；不要剧透配方。
4. 不要标题、不要列表、不要引号包裹全文、不要表情符号。
5. 只输出风味正文本身。`;

export async function generateFlavorText(input: {
  drinkName: string;
  recipeName?: string;
  ingredientsSummary?: string;
  steps?: string;
  tasteHints?: string;
}) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("未配置 DEEPSEEK_API_KEY");
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  });

  const userContent = [
    `酒名：${input.drinkName}`,
    input.recipeName ? `关联配方名：${input.recipeName}` : "",
    input.ingredientsSummary ? `内部原料参考（勿外泄）：${input.ingredientsSummary}` : "",
    input.steps ? `制作步骤参考（勿外泄）：${input.steps}` : "",
    input.tasteHints ? `口味标签：${input.tasteHints}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const completion = await client.chat.completions.create({
    model: process.env.DEEPSEEK_MODEL || "deepseek-flash",
    messages: [
      { role: "system", content: FLAVOR_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    temperature: 0.85,
    max_tokens: 300,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("DeepSeek 未返回内容");
  return text;
}
