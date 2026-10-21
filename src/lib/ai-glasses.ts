import OpenAI from "openai";
import { resolveImagesForVision } from "@/lib/ai-images";
import {
  DEFAULT_GLASS_TYPE,
  GLASS_TYPES,
  GLASS_TYPES_PROMPT,
  normalizeGlassType,
} from "@/lib/glasses";
import type { MenuTableRow } from "@/lib/menu-table";

function getClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  });
}

function pickFromText(text: string): string | null {
  const cleaned = text.replace(/["'`]/g, "").trim();
  const normalized = normalizeGlassType(cleaned);
  if ((GLASS_TYPES as readonly string[]).includes(normalized)) return normalized;
  const hit = (GLASS_TYPES as readonly string[]).find(
    (g) => cleaned.includes(g) || cleaned.includes(g.split(" ")[0]),
  );
  return hit || null;
}

/** 根据成片识别杯型 */
export async function detectGlassFromImage(
  imageUrl: string,
): Promise<string | null> {
  const client = getClient();
  if (!client || !imageUrl) return null;

  const vision = await resolveImagesForVision([imageUrl], 1);
  if (!vision.length) return null;

  const model =
    process.env.DEEPSEEK_MODEL_VISION ||
    process.env.DEEPSEEK_MODEL ||
    "deepseek-flash";

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `你是杯具识别助手。只根据照片判断杯型，从下列选项中选且仅选一项原样输出（不要解释）：
${GLASS_TYPES_PROMPT}

外形：矮厚底→厚底杯/爵士威士忌杯/岩石棱纹杯；倒锥矮杯→富士山杯；高直筒→高球杯/经典果汁杯；大肚气球→气球杯；V型高脚→马天尼杯；曲线高脚→椰林飘香杯/果汁杯；上宽下窄→喇叭杯；中鼓→郁金香杯。`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "这杯饮品用的是哪种杯子？只输出选项原文一行。" },
            { type: "image_url", image_url: { url: vision[0] } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 60,
    });

    const text = completion.choices[0]?.message?.content?.trim() || "";
    return pickFromText(text);
  } catch {
    return null;
  }
}

/** 识图失败时：按原料量与分类粗猜杯型 */
export function guessGlassFromRow(row: MenuTableRow): string {
  const text = `${row.name} ${row.ingredientsSummary} ${row.flavorText}`;
  const fromText = pickFromText(text);
  if (fromText) return fromText;

  const mls: number[] = [];
  const mlRe = /(\d+(?:\.\d+)?)\s*ml/gi;
  let mlMatch: RegExpExecArray | null;
  while ((mlMatch = mlRe.exec(text))) {
    mls.push(Number(mlMatch[1]));
  }
  const known = mls.reduce((a, b) => a + b, 0);
  const fillHint = /加满|适量|顶满/i.test(text);

  if (/马天尼|martini/i.test(text)) return "马天尼杯 220ml";
  if (/椰林|飓风|飘香/i.test(text)) return "椰林飘香杯 375ml";
  if (/郁金香|tulip/i.test(text)) return "郁金香杯 490ml";
  if (/富士/i.test(text)) return "富士山杯 380ml";

  if (row.category === "经典" && known > 0 && known <= 120 && !fillHint) {
    return "爵士威士忌杯 300ml";
  }
  if (row.category === "果汁") return "果汁杯 308ml";
  if (row.category === "碳酸" || row.hasSparkling) return "高球杯 300ml";
  if (row.category === "奶制") return "高球杯 300ml";
  if (known >= 280 || fillHint) return "喇叭杯 470ml";
  return DEFAULT_GLASS_TYPE;
}

export type GlassDetectResult = {
  rows: MenuTableRow[];
  updated: number;
  skipped: number;
  failed: number;
};

export async function batchDetectGlasses(
  rows: MenuTableRow[],
): Promise<GlassDetectResult> {
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const next: MenuTableRow[] = [];

  for (const row of rows) {
    if (!row.imageUrl) {
      skipped += 1;
      next.push(row);
      continue;
    }
    try {
      const glass =
        (await detectGlassFromImage(row.imageUrl)) || guessGlassFromRow(row);
      next.push({ ...row, glassType: glass });
      updated += 1;
    } catch {
      failed += 1;
      next.push(row);
    }
  }

  return { rows: next, updated, skipped, failed };
}
