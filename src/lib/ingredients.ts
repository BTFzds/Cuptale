export interface Ingredient {
  name: string;
  ml: number;
  /** e.g. 加满 / 适量 */
  note?: string;
}

export function parseIngredients(raw: string | null | undefined): Ingredient[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .map((item) => {
        const row = item as Partial<Ingredient>;
        const note = String(row.note || "").trim();
        return {
          name: String(row.name || "").trim(),
          ml: Number(row.ml) || 0,
          ...(note ? { note } : {}),
        };
      })
      .filter((item) => item.name);
  } catch {
    return [];
  }
}

export function stringifyIngredients(items: Ingredient[]): string {
  return JSON.stringify(
    items.map((item) => {
      const note = item.note?.trim();
      return {
        name: item.name.trim(),
        ml: Number(item.ml) || 0,
        ...(note ? { note } : {}),
      };
    }),
  );
}

export function parseImageUrls(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.map((u) => String(u || "").trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function stringifyImageUrls(urls: string[]): string {
  return JSON.stringify(urls.map((u) => u.trim()).filter(Boolean));
}
