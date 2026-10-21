import { estimateAbv } from "@/lib/ai-recipe";
import { normalizeDrinkCategory } from "@/lib/categories";
import { glassCapacityMl } from "@/lib/glasses";
import type { Ingredient } from "@/lib/ingredients";

export type MenuTableRow = {
  recipeId: string | null;
  drinkId: string | null;
  name: string;
  category: string;
  sweetness: number;
  acidity: number;
  strength: number;
  abvApprox: number | null;
  glassType: string;
  isPublished: boolean;
  isAvailable: boolean;
  isNonAlcoholic: boolean;
  hasDairy: boolean;
  hasCaffeine: boolean;
  hasTea: boolean;
  hasSparkling: boolean;
  flavorText: string;
  ingredientsSummary: string;
  imageUrl: string | null;
  salesCount: number;
};

export function clampTaste(n: unknown, d: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return d;
  return Math.min(5, Math.max(1, Math.round(v)));
}

export function normalizeCategory(raw: string) {
  return normalizeDrinkCategory(raw);
}

function parseSummaryIngredients(text: string): Ingredient[] {
  const items: Ingredient[] = [];
  const re =
    /([^\d·、，,\s]+?)\s*(\d+(?:\.\d+)?)\s*ml|([^\d·、，,\s]+?)\s*(加满|适量)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[1] && m[2]) items.push({ name: m[1].trim(), ml: Number(m[2]) });
    else if (m[3] && m[4])
      items.push({ name: m[3].trim(), ml: 0, note: m[4] });
  }
  return items;
}

function inferTags(text: string, abv: number) {
  return {
    hasDairy: /奶|乳|奶油|拿铁|炼乳/i.test(text),
    hasCaffeine: /咖啡|可乐|能量|咖啡因/i.test(text),
    hasTea: /茶|红茶|绿茶|乌龙|伯爵|茉莉/i.test(text),
    hasSparkling: /气泡|苏打|汽水|汤力|可乐|香槟|起泡/i.test(text),
    isNonAlcoholic: abv < 0.5 && !/威士忌|朗姆|伏特加|金酒|龙舌兰|白兰地/i.test(text),
  };
}

function inferCategory(text: string, tags: ReturnType<typeof inferTags>): string {
  if (tags.hasDairy) return "奶制";
  if (tags.hasSparkling && !/威士忌|朗姆|伏特加|金酒|龙舌兰/i.test(text))
    return "碳酸";
  if (/果汁|橙汁|柠檬汁|西柚|蜜桃|葡萄汁/i.test(text) && !/威士忌|朗姆|伏特加|金酒|龙舌兰/i.test(text))
    return "果汁";
  if (/威士忌|朗姆|伏特加|金酒|龙舌兰|白兰地|利口/i.test(text)) return "经典";
  if (tags.hasSparkling) return "碳酸";
  return "经典";
}

/** 无 AI 时：按原料 + 杯容粗算 */
export function heuristicRecalcRow(row: MenuTableRow): MenuTableRow {
  const text = row.ingredientsSummary || "";
  const ings = parseSummaryIngredients(text);
  const abv = estimateAbv(ings, row.glassType) || row.abvApprox || 0;
  const tags = inferTags(text, abv);
  const capacity = glassCapacityMl(row.glassType);
  // 杯越大、烈酒占比相对越低时烈度略减
  let strength = abv >= 12 ? 4 : abv >= 6 ? 3 : abv > 0 ? 2 : 1;
  if (capacity >= 450 && abv > 0 && abv < 10) strength = Math.max(1, strength - 1);

  return {
    ...row,
    category: inferCategory(text, tags),
    sweetness: /糖浆|可乐|果汁|蜜|甜|蜜桃/i.test(text) ? 4 : tags.hasDairy ? 3 : 2,
    acidity: /柠檬|青柠|酸|西柚|气泡/i.test(text) ? 4 : 2,
    strength,
    abvApprox: abv || null,
    ...tags,
    imageUrl: row.imageUrl ?? null,
  };
}
