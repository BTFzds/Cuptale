import { DRINK_CATEGORIES } from "@/lib/categories";
import { estimateAbv } from "@/lib/ai-recipe";
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
  flavorText: string;
  ingredientsSummary: string;
  /** 成片封面，供批量识杯型 */
  imageUrl: string | null;
};

export function clampTaste(n: unknown, d: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return d;
  return Math.min(5, Math.max(1, Math.round(v)));
}

export function normalizeCategory(raw: string) {
  return (DRINK_CATEGORIES as readonly string[]).includes(raw) ? raw : "经典";
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

/** 无 AI 时：按原料摘要粗算甜酸烈与酒精度 */
export function heuristicRecalcRow(row: MenuTableRow): MenuTableRow {
  const text = row.ingredientsSummary || "";
  const ings = parseSummaryIngredients(text);
  const hasSpirit = /威士忌|朗姆|伏特加|金酒|龙舌兰|白兰地/i.test(text);
  const hasSweet = /糖浆|可乐|果汁|蜜|甜/i.test(text);
  const hasAcid = /柠檬|青柠|酸|西柚|气泡/i.test(text);
  const hasFizz = /可乐|气泡|苏打|汽水|汤力/i.test(text);
  const hasDairy = /奶|乳|奶油|拿铁/i.test(text);
  const abv = estimateAbv(ings) || row.abvApprox || 0;

  return {
    ...row,
    category: hasDairy
      ? "奶制"
      : hasFizz
        ? "碳酸"
        : hasSpirit
          ? "特调"
          : normalizeCategory(row.category),
    sweetness: hasSweet ? 4 : hasSpirit ? 2 : 3,
    acidity: hasAcid ? 4 : 2,
    strength: abv >= 12 ? 4 : abv >= 6 ? 3 : abv > 0 ? 2 : 1,
    abvApprox: abv || null,
    imageUrl: row.imageUrl ?? null,
  };
}
