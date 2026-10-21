import OpenAI from "openai";
import { DRINK_CATEGORIES } from "@/lib/categories";
import { GLASS_TYPES_PROMPT, normalizeGlassType } from "@/lib/glasses";
import {
  clampTaste,
  heuristicRecalcRow,
  normalizeCategory,
  type MenuTableRow,
} from "@/lib/menu-table";

const SYSTEM = `你是「HUSH」家庭调酒吧的菜单统筹助手。
用户会给出菜单表格片段（JSON 数组）和修改指令。
你必须只输出一个 JSON 对象，形状严格为：{"rows":[...]} 
其中 rows 与输入行一一对应，字段：
recipeId, drinkId, name, category, sweetness, acidity, strength, abvApprox, glassType, isPublished, isAvailable, flavorText, ingredientsSummary, imageUrl。

规则：
1. category 只能是 ${DRINK_CATEGORIES.join("/")} 之一。
2. sweetness/acidity/strength 为 1–5 整数。
3. 酒类按市面最常见牌子估算 abvApprox（%）；无烈酒则为 0 或 null。
4. glassType 只能是：${GLASS_TYPES_PROMPT}（本接口无图时不要乱改杯型，保持原值）。
5. 按酒含量重算时结合 ingredientsSummary。
6. 不要删行、不要改 recipeId/drinkId/imageUrl；ingredientsSummary 保持原样。
7. flavorText 不要写原料名与毫升。
8. 不要输出 markdown 代码围栏，不要其它说明文字。`;

function getClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  });
}

function extractRowsPayload(text: string): unknown[] {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : trimmed;

  // {"rows":[...]}
  try {
    const objStart = raw.indexOf("{");
    const objEnd = raw.lastIndexOf("}");
    if (objStart >= 0 && objEnd > objStart) {
      const obj = JSON.parse(raw.slice(objStart, objEnd + 1)) as {
        rows?: unknown;
      };
      if (Array.isArray(obj.rows)) return obj.rows;
    }
  } catch {
    // continue
  }

  // bare array
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start >= 0 && end > start) {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    if (Array.isArray(parsed)) return parsed;
  }

  throw new Error("AI 未返回表格数组");
}

function slimRow(row: MenuTableRow) {
  // 缩短发给模型的体积，降低截断概率
  return {
    recipeId: row.recipeId,
    drinkId: row.drinkId,
    name: row.name,
    category: row.category,
    sweetness: row.sweetness,
    acidity: row.acidity,
    strength: row.strength,
    abvApprox: row.abvApprox,
    glassType: row.glassType,
    isPublished: row.isPublished,
    isAvailable: row.isAvailable,
    flavorText: row.flavorText.slice(0, 80),
    ingredientsSummary: row.ingredientsSummary.slice(0, 120),
  };
}

function mergeRow(base: MenuTableRow, patch: Record<string, unknown>): MenuTableRow {
  return {
    ...base,
    name: String(patch.name ?? base.name).trim() || base.name,
    category: normalizeCategory(String(patch.category ?? base.category)),
    sweetness: clampTaste(patch.sweetness, base.sweetness),
    acidity: clampTaste(patch.acidity, base.acidity),
    strength: clampTaste(patch.strength, base.strength),
    abvApprox:
      patch.abvApprox === null || patch.abvApprox === ""
        ? null
        : Number.isFinite(Number(patch.abvApprox))
          ? Number(patch.abvApprox)
          : base.abvApprox,
    glassType: normalizeGlassType(
      String(patch.glassType ?? base.glassType) || base.glassType,
    ),
    isPublished: Boolean(
      patch.isPublished === undefined ? base.isPublished : patch.isPublished,
    ),
    isAvailable: Boolean(
      patch.isAvailable === undefined ? base.isAvailable : patch.isAvailable,
    ),
    flavorText: String(patch.flavorText ?? base.flavorText),
    ingredientsSummary: base.ingredientsSummary,
    imageUrl: base.imageUrl,
  };
}

async function editChunk(
  client: OpenAI,
  rows: MenuTableRow[],
  instruction: string,
): Promise<MenuTableRow[]> {
  const completion = await client.chat.completions.create({
    model: process.env.DEEPSEEK_MODEL || "deepseek-flash",
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `指令：${instruction}\n\n表格片段 JSON：\n${JSON.stringify(rows.map(slimRow))}\n\n请只输出 {"rows":[...]}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 3500,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("AI 无响应");
  const arr = extractRowsPayload(text);

  return rows.map((row, i) => {
    const patch =
      (arr.find((item) => {
        const r = item as Record<string, unknown>;
        return (
          (row.recipeId && r.recipeId === row.recipeId) ||
          (row.drinkId && r.drinkId === row.drinkId)
        );
      }) as Record<string, unknown> | undefined) ||
      (arr[i] as Record<string, unknown> | undefined);
    return patch ? mergeRow(row, patch) : row;
  });
}

export async function editMenuTableWithAi(input: {
  rows: MenuTableRow[];
  instruction: string;
}): Promise<MenuTableRow[]> {
  const instruction = input.instruction.trim();
  if (!instruction) return input.rows;

  const client = getClient();
  if (!client) {
    if (/重算|甜度|酸度|烈度|酒精度|分类|abv/i.test(instruction)) {
      return input.rows.map(heuristicRecalcRow);
    }
    return input.rows;
  }

  // 分块，避免一次返回过长被截断 → 「未返回数组」
  const chunkSize = 4;
  const out: MenuTableRow[] = [];
  try {
    for (let i = 0; i < input.rows.length; i += chunkSize) {
      const chunk = input.rows.slice(i, i + chunkSize);
      const edited = await editChunk(client, chunk, instruction);
      out.push(...edited);
    }
    return out;
  } catch (err) {
    // 解析失败时：重算类指令走本地启发，避免整页报错
    if (/重算|甜度|酸度|烈度|酒精度|分类|abv/i.test(instruction)) {
      return input.rows.map(heuristicRecalcRow);
    }
    throw err instanceof Error ? err : new Error("AI 改表失败");
  }
}
