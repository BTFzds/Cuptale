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
用户给出菜单表格片段与指令。只输出 JSON 对象：{"rows":[...]}，与输入行一一对应。

字段：recipeId, drinkId, name, category, sweetness, acidity, strength, abvApprox, glassType, isPublished, isAvailable, isNonAlcoholic, hasDairy, hasCaffeine, hasTea, hasSparkling, flavorText, ingredientsSummary, imageUrl, salesCount。

规则：
1. category 只能是 ${DRINK_CATEGORIES.join("/")}（经典=烈酒为主；果汁/碳酸/奶制=对应主原料）。
2. sweetness/acidity/strength 为 1–5；估算酒精度时参考 glassType 里的 ml 杯容（加满≈杯容−已知毫升）。
3. glassType 只能是：${GLASS_TYPES_PROMPT}（无图指令时尽量保持原杯型）。
4. 标签布尔：hasDairy 含奶、hasCaffeine 含咖啡因、hasTea 含茶、hasSparkling 含气泡、isNonAlcoholic 无酒精；按原料判断。
5. 不要改 recipeId/drinkId/imageUrl/salesCount；ingredientsSummary 保持原样。
6. flavorText 不要写原料名与毫升。不要 markdown 围栏。`;

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

  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start >= 0 && end > start) {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    if (Array.isArray(parsed)) return parsed;
  }

  throw new Error("AI 未返回表格数组");
}

function slimRow(row: MenuTableRow) {
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
    isNonAlcoholic: row.isNonAlcoholic,
    hasDairy: row.hasDairy,
    hasCaffeine: row.hasCaffeine,
    hasTea: row.hasTea,
    hasSparkling: row.hasSparkling,
    flavorText: row.flavorText.slice(0, 60),
    ingredientsSummary: row.ingredientsSummary.slice(0, 140),
  };
}

function mergeRow(base: MenuTableRow, patch: Record<string, unknown>): MenuTableRow {
  const bool = (v: unknown, d: boolean) =>
    v === undefined ? d : Boolean(v);

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
    isPublished: bool(patch.isPublished, base.isPublished),
    isAvailable: bool(patch.isAvailable, base.isAvailable),
    isNonAlcoholic: bool(patch.isNonAlcoholic, base.isNonAlcoholic),
    hasDairy: bool(patch.hasDairy, base.hasDairy),
    hasCaffeine: bool(patch.hasCaffeine, base.hasCaffeine),
    hasTea: bool(patch.hasTea, base.hasTea),
    hasSparkling: bool(patch.hasSparkling, base.hasSparkling),
    flavorText: String(patch.flavorText ?? base.flavorText),
    ingredientsSummary: base.ingredientsSummary,
    imageUrl: base.imageUrl,
    salesCount: base.salesCount,
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
        content: `指令：${instruction}\n\n表格片段：\n${JSON.stringify(rows.map(slimRow))}\n\n只输出 {"rows":[...]}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 4000,
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
    if (/重算|甜度|酸度|烈度|酒精度|分类|标签|含奶|咖啡|abv/i.test(instruction)) {
      return input.rows.map(heuristicRecalcRow);
    }
    return input.rows;
  }

  const chunkSize = 4;
  const out: MenuTableRow[] = [];
  try {
    for (let i = 0; i < input.rows.length; i += chunkSize) {
      const chunk = input.rows.slice(i, i + chunkSize);
      out.push(...(await editChunk(client, chunk, instruction)));
    }
    return out;
  } catch (err) {
    if (/重算|甜度|酸度|烈度|酒精度|分类|标签|含奶|咖啡|abv/i.test(instruction)) {
      return input.rows.map(heuristicRecalcRow);
    }
    throw err instanceof Error ? err : new Error("AI 改表失败");
  }
}
