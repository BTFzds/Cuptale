export interface Ingredient {
  name: string;
  ml: number;
}

export function parseIngredients(raw: string | null | undefined): Ingredient[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .map((item) => {
        const row = item as Partial<Ingredient>;
        return {
          name: String(row.name || "").trim(),
          ml: Number(row.ml) || 0,
        };
      })
      .filter((item) => item.name);
  } catch {
    return [];
  }
}

export function stringifyIngredients(items: Ingredient[]): string {
  return JSON.stringify(
    items.map((item) => ({
      name: item.name.trim(),
      ml: Number(item.ml) || 0,
    })),
  );
}
