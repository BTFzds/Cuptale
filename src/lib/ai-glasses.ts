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

/** 根据成片识别杯型（必须落在平台选项内） */
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

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `你是杯具识别助手。只根据照片判断杯型，从下列选项中选且仅选一项原样输出（不要解释、不要引号）：
${GLASS_TYPES_PROMPT}

外形提示：矮厚底→厚底杯/爵士威士忌杯/岩石棱纹杯；倒锥矮杯→富士山杯；高直筒→高球杯/经典果汁杯；大肚气球→气球杯；V型高脚→马天尼杯；曲线高脚→椰林飘香杯/果汁杯；上宽下窄高杯→喇叭杯；中鼓郁金香→郁金香杯。`,
      },
      {
        role: "user",
        content: [
          { type: "text", text: "这杯饮品用的是哪种杯子？只输出选项原文。" },
          { type: "image_url", image_url: { url: vision[0] } },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 40,
  });

  const text = completion.choices[0]?.message?.content?.trim() || "";
  if (!text) return null;
  const normalized = normalizeGlassType(text.replace(/["'`]/g, "").trim());
  if ((GLASS_TYPES as readonly string[]).includes(normalized)) {
    return normalized;
  }
  // 若模型多写了字，尝试包含匹配
  const hit = (GLASS_TYPES as readonly string[]).find((g) =>
    text.includes(g.split(" ")[0]),
  );
  return hit || DEFAULT_GLASS_TYPE;
}

export type GlassDetectResult = {
  rows: MenuTableRow[];
  updated: number;
  skipped: number;
  failed: number;
};

/** 批量按各自成片识杯型 */
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
      const glass = await detectGlassFromImage(row.imageUrl);
      if (glass && glass !== row.glassType) {
        next.push({ ...row, glassType: glass });
        updated += 1;
      } else if (glass) {
        next.push({ ...row, glassType: glass });
        updated += 1;
      } else {
        failed += 1;
        next.push(row);
      }
    } catch {
      failed += 1;
      next.push(row);
    }
  }

  return { rows: next, updated, skipped, failed };
}
