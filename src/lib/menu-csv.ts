import { normalizeDrinkCategory } from "@/lib/categories";
import { DEFAULT_GLASS_TYPE, normalizeGlassType } from "@/lib/glasses";
import { clampTaste, type MenuTableRow } from "@/lib/menu-table";

/** 表格列：中文表头便于 Excel 编辑；首列 ID 用于回写匹配 */
export const MENU_CSV_COLUMNS = [
  { key: "drinkId", header: "酒品ID" },
  { key: "recipeId", header: "配方ID" },
  { key: "name", header: "酒名" },
  { key: "category", header: "分类" },
  { key: "glassType", header: "杯型" },
  { key: "sweetness", header: "甜度" },
  { key: "acidity", header: "酸度" },
  { key: "strength", header: "烈度" },
  { key: "abvApprox", header: "酒精度" },
  { key: "isPublished", header: "已上架" },
  { key: "isAvailable", header: "供应中" },
  { key: "hasDairy", header: "含奶" },
  { key: "hasCaffeine", header: "含咖啡因" },
  { key: "hasTea", header: "含茶" },
  { key: "hasSparkling", header: "含气泡" },
  { key: "isNonAlcoholic", header: "无酒精" },
  { key: "flavorText", header: "风味介绍" },
  { key: "ingredientsSummary", header: "原料摘要" },
  { key: "imageUrl", header: "封面图URL" },
  { key: "salesCount", header: "销量" },
] as const;

type ColKey = (typeof MENU_CSV_COLUMNS)[number]["key"];

function escapeCell(value: string | number | boolean | null | undefined) {
  const s =
    value === null || value === undefined
      ? ""
      : typeof value === "boolean"
        ? value
          ? "是"
          : "否"
        : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function parseBool(raw: string, fallback: boolean) {
  const s = raw.trim().toLowerCase();
  if (!s) return fallback;
  if (["1", "true", "yes", "y", "是", "真", "开"].includes(s)) return true;
  if (["0", "false", "no", "n", "否", "假", "关"].includes(s)) return false;
  return fallback;
}

function parseNum(raw: string, fallback: number | null) {
  const s = raw.trim();
  if (!s) return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

/** 简易 CSV 行解析（支持引号内逗号/换行） */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\r") continue;
    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

export function menuRowsToCsv(rows: MenuTableRow[]): string {
  const header = MENU_CSV_COLUMNS.map((c) => escapeCell(c.header)).join(",");
  const lines = rows.map((row) =>
    MENU_CSV_COLUMNS.map((c) => {
      const v = row[c.key as keyof MenuTableRow];
      return escapeCell(v as string | number | boolean | null);
    }).join(","),
  );
  return `\uFEFF${[header, ...lines].join("\r\n")}`;
}

function headerToKey(header: string): ColKey | null {
  const h = header.trim();
  const hit = MENU_CSV_COLUMNS.find(
    (c) => c.header === h || c.key === h || c.key.toLowerCase() === h.toLowerCase(),
  );
  return hit ? hit.key : null;
}

function blankRow(): MenuTableRow {
  return {
    recipeId: null,
    drinkId: null,
    name: "",
    category: "经典",
    sweetness: 3,
    acidity: 3,
    strength: 2,
    abvApprox: null,
    glassType: DEFAULT_GLASS_TYPE,
    isPublished: false,
    isAvailable: true,
    isNonAlcoholic: false,
    hasDairy: false,
    hasCaffeine: false,
    hasTea: false,
    hasSparkling: false,
    flavorText: "",
    ingredientsSummary: "",
    imageUrl: null,
    salesCount: 0,
  };
}

function cellOf(map: Partial<Record<ColKey, string>>, key: ColKey) {
  return map[key] ?? "";
}

function csvLineToRow(
  map: Partial<Record<ColKey, string>>,
  base?: MenuTableRow,
): MenuTableRow {
  const b = base ?? blankRow();
  const drinkId = cellOf(map, "drinkId").trim() || b.drinkId;
  const recipeId = cellOf(map, "recipeId").trim() || b.recipeId;
  const name = cellOf(map, "name").trim() || b.name;
  const abvRaw = cellOf(map, "abvApprox").trim();

  return {
    recipeId: recipeId || null,
    drinkId: drinkId || null,
    name,
    category: normalizeDrinkCategory(
      cellOf(map, "category").trim() || b.category,
    ),
    sweetness: clampTaste(
      parseNum(cellOf(map, "sweetness"), b.sweetness),
      b.sweetness,
    ),
    acidity: clampTaste(
      parseNum(cellOf(map, "acidity"), b.acidity),
      b.acidity,
    ),
    strength: clampTaste(
      parseNum(cellOf(map, "strength"), b.strength),
      b.strength,
    ),
    abvApprox:
      abvRaw === ""
        ? b.abvApprox
        : parseNum(abvRaw, b.abvApprox),
    glassType: normalizeGlassType(
      cellOf(map, "glassType").trim() || b.glassType,
    ),
    isPublished: parseBool(cellOf(map, "isPublished"), b.isPublished),
    isAvailable: parseBool(cellOf(map, "isAvailable"), b.isAvailable),
    isNonAlcoholic: parseBool(cellOf(map, "isNonAlcoholic"), b.isNonAlcoholic),
    hasDairy: parseBool(cellOf(map, "hasDairy"), b.hasDairy),
    hasCaffeine: parseBool(cellOf(map, "hasCaffeine"), b.hasCaffeine),
    hasTea: parseBool(cellOf(map, "hasTea"), b.hasTea),
    hasSparkling: parseBool(cellOf(map, "hasSparkling"), b.hasSparkling),
    flavorText:
      cellOf(map, "flavorText") !== ""
        ? cellOf(map, "flavorText")
        : b.flavorText,
    ingredientsSummary:
      cellOf(map, "ingredientsSummary") !== ""
        ? cellOf(map, "ingredientsSummary")
        : b.ingredientsSummary,
    imageUrl: (() => {
      const u = cellOf(map, "imageUrl").trim();
      if (u) return u;
      return b.imageUrl;
    })(),
    salesCount: b.salesCount,
  };
}

export type MenuCsvImportResult = {
  rows: MenuTableRow[];
  matched: number;
  added: number;
  skipped: number;
};

/**
 * 将 CSV 合并进当前表：优先 drinkId / recipeId，其次酒名。
 * 销量只读，不从 CSV 覆盖。
 */
export function mergeCsvIntoMenuRows(
  csvText: string,
  current: MenuTableRow[],
): MenuCsvImportResult {
  const table = parseCsv(csvText);
  if (table.length < 2) {
    throw new Error("表格为空或缺少表头");
  }

  const headers = table[0].map((h) => h.trim());
  const keys = headers.map(headerToKey);
  if (!keys.includes("name") && !keys.includes("drinkId")) {
    throw new Error("缺少必要列：酒名 或 酒品ID");
  }

  const byDrink = new Map(
    current.filter((r) => r.drinkId).map((r) => [r.drinkId!, r]),
  );
  const byRecipe = new Map(
    current.filter((r) => r.recipeId).map((r) => [r.recipeId!, r]),
  );
  const byName = new Map(
    current.map((r) => [r.name.trim().toLowerCase(), r]),
  );

  const next = current.map((r) => ({ ...r }));
  const indexOf = (row: MenuTableRow) =>
    next.findIndex(
      (r) =>
        (row.drinkId && r.drinkId === row.drinkId) ||
        (row.recipeId && r.recipeId === row.recipeId) ||
        r.name.trim().toLowerCase() === row.name.trim().toLowerCase(),
    );

  let matched = 0;
  let added = 0;
  let skipped = 0;

  for (const line of table.slice(1)) {
    if (!line.some((c) => c.trim())) continue;
    const map: Partial<Record<ColKey, string>> = {};
    keys.forEach((key, i) => {
      if (key) map[key] = line[i] ?? "";
    });

    const drinkId = (map.drinkId || "").trim();
    const recipeId = (map.recipeId || "").trim();
    const name = (map.name || "").trim();
    const base =
      (drinkId && byDrink.get(drinkId)) ||
      (recipeId && byRecipe.get(recipeId)) ||
      (name && byName.get(name.toLowerCase())) ||
      undefined;

    const parsed = csvLineToRow(map, base);
    if (!parsed.name.trim()) {
      skipped += 1;
      continue;
    }

    if (base) {
      const idx = indexOf(base);
      if (idx >= 0) {
        next[idx] = {
          ...parsed,
          drinkId: base.drinkId,
          recipeId: base.recipeId,
          salesCount: base.salesCount,
          ingredientsSummary:
            parsed.ingredientsSummary || base.ingredientsSummary,
          imageUrl: parsed.imageUrl || base.imageUrl,
        };
        matched += 1;
      } else {
        skipped += 1;
      }
    } else {
      // 新行：无配方时作为独立酒品草稿（需上架才创建）
      next.push({
        ...parsed,
        drinkId: parsed.drinkId || null,
        recipeId: parsed.recipeId || null,
        salesCount: 0,
      });
      added += 1;
    }
  }

  return { rows: next, matched, added, skipped };
}

export function csvFilename() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `hush-menu-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.csv`;
}
