/** 前台/后台统一分类：经典=烈酒为主；其余按主原料 */
export const DRINK_CATEGORIES = [
  "经典",
  "果汁",
  "碳酸",
  "奶制",
] as const;

export type DrinkCategory = (typeof DRINK_CATEGORIES)[number];

/** 点单左侧：全部 + 分类（右侧按分类分段） */
export const ORDER_SIDEBAR_CATEGORIES = ["全部", ...DRINK_CATEGORIES] as const;

const LEGACY: Record<string, DrinkCategory> = {
  特调: "经典",
  经典: "经典",
  果汁: "果汁",
  碳酸: "碳酸",
  奶制: "奶制",
};

export function normalizeDrinkCategory(raw: string | null | undefined): DrinkCategory {
  const s = String(raw || "").trim();
  if ((DRINK_CATEGORIES as readonly string[]).includes(s)) {
    return s as DrinkCategory;
  }
  return LEGACY[s] || "经典";
}
