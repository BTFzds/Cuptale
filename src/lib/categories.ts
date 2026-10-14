export const DRINK_CATEGORIES = [
  "碳酸",
  "奶制",
  "特调",
  "经典",
] as const;

export type DrinkCategory = (typeof DRINK_CATEGORIES)[number];

/** Sidebar includes「全部」plus fixed categories */
export const ORDER_SIDEBAR_CATEGORIES = ["全部", ...DRINK_CATEGORIES] as const;
