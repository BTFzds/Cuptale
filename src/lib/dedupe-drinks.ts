/** 前台菜单去重：同一 recipe 只留一杯；无配方则按酒名去重（保留较新） */
export function dedupePublishedDrinks<
  T extends {
    id: string;
    name: string;
    recipeId?: string | null;
    updatedAt?: Date | string;
  },
>(drinks: T[]): T[] {
  const byKey = new Map<string, T>();

  for (const drink of drinks) {
    const key = drink.recipeId
      ? `recipe:${drink.recipeId}`
      : `name:${drink.name.trim()}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, drink);
      continue;
    }
    const prevTime = toTime(prev.updatedAt);
    const nextTime = toTime(drink.updatedAt);
    if (nextTime >= prevTime) byKey.set(key, drink);
  }

  return Array.from(byKey.values());
}

function toTime(v?: Date | string) {
  if (!v) return 0;
  return v instanceof Date ? v.getTime() : new Date(v).getTime();
}
