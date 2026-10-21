/** 家里实有杯具，供后台选项与 AI 识杯 */
export const GLASS_TYPES = [
  "厚底杯 300ml",
  "爵士威士忌杯 300ml",
  "岩石棱纹杯 360ml",
  "富士山杯 380ml",
  "高球杯 300ml",
  "喇叭杯 470ml",
  "郁金香杯 490ml",
  "气球杯 500ml",
  "马天尼杯 220ml",
  "椰林飘香杯 375ml",
  "果汁杯 308ml",
  "经典果汁杯 340ml",
] as const;

export type GlassType = (typeof GLASS_TYPES)[number];

export const DEFAULT_GLASS_TYPE: GlassType = "高球杯 300ml";

export const GLASS_TYPES_PROMPT = GLASS_TYPES.join(" / ");

/** 从杯型文案解析容量 ml */
export function glassCapacityMl(glassType: string | null | undefined): number {
  const m = String(glassType || "").match(/(\d+)\s*ml/i);
  if (m) return Number(m[1]);
  return 300;
}

/** 把自由文本归一到平台杯型 */
export function normalizeGlassType(raw: string | null | undefined): string {
  const s = String(raw || "").trim();
  if (!s) return DEFAULT_GLASS_TYPE;
  const exact = (GLASS_TYPES as readonly string[]).find((g) => g === s);
  if (exact) return exact;

  const lower = s.toLowerCase();
  const rules: [RegExp, GlassType][] = [
    [/马天尼|martini|鸡尾酒杯/i, "马天尼杯 220ml"],
    [/椰林|飓风|poco|pina|飘香/i, "椰林飘香杯 375ml"],
    [/气球|gin.?balloon|大肚/i, "气球杯 500ml"],
    [/富士|锥形|倒三角底/i, "富士山杯 380ml"],
    [/郁金香|tulip/i, "郁金香杯 490ml"],
    [/喇叭|品脱|cooler|宽口高/i, "喇叭杯 470ml"],
    [/爵士|威士忌杯|rocks|old.?fashioned/i, "爵士威士忌杯 300ml"],
    [/棱纹|钻石底|岩石棱/i, "岩石棱纹杯 360ml"],
    [/厚底/i, "厚底杯 300ml"],
    [/经典果汁|340/i, "经典果汁杯 340ml"],
    [/果汁杯|308/i, "果汁杯 308ml"],
    [/高球|collins|直筒高/i, "高球杯 300ml"],
    [/岩石杯/i, "爵士威士忌杯 300ml"],
  ];
  for (const [re, glass] of rules) {
    if (re.test(s) || re.test(lower)) return glass;
  }
  return DEFAULT_GLASS_TYPE;
}
