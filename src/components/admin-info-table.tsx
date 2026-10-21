"use client";

import { useEffect, useRef, useState } from "react";
import { DRINK_CATEGORIES } from "@/lib/categories";
import { DEFAULT_GLASS_TYPE, GLASS_TYPES } from "@/lib/glasses";
import type { MenuTableRow } from "@/lib/menu-table";

function shortId(row: MenuTableRow) {
  const id = row.drinkId || row.recipeId || "";
  return id ? id.slice(-8) : "—";
}

export function AdminInfoTable() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<MenuTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [glassBusy, setGlassBusy] = useState(false);
  const [ioBusy, setIoBusy] = useState(false);
  const [instruction, setInstruction] = useState(
    "按各配方酒含量、原料与杯型容量，重算甜度、酸度、烈度、酒精度和分类（经典/果汁/碳酸/奶制）；并统一标注标签：含奶、含咖啡因、含茶、含气泡、无酒精",
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/menu-table");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setRows(data.rows || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function patchRow(index: number, patch: Partial<MenuTableRow>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/menu-table", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setMessage("已保存");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleAi() {
    if (!instruction.trim()) {
      setError("请输入 AI 指令");
      return;
    }
    setAiBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/ai/menu-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, instruction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI 修改失败");
      setRows(data.rows || rows);
      setMessage("AI 已改表，请核对后点保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 修改失败");
    } finally {
      setAiBusy(false);
    }
  }

  async function handleBatchGlasses() {
    setGlassBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/ai/menu-table/glasses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "识杯失败");
      setRows(data.rows || rows);
      setMessage(
        `杯型已更新 ${data.updated ?? 0} 款` +
          (data.skipped ? `，跳过无图 ${data.skipped}` : "") +
          (data.failed ? `，失败 ${data.failed}` : "") +
          "；请核对后点保存",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "识杯失败");
    } finally {
      setGlassBusy(false);
    }
  }

  async function handleExport() {
    setIoBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/menu-table/export");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "导出失败");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="(.+)"/)?.[1] || "hush-menu.csv";
      a.click();
      URL.revokeObjectURL(url);
      setMessage(`已导出 ${rows.length} 行（Excel 可直接打开）`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "导出失败");
    } finally {
      setIoBusy(false);
    }
  }

  async function handleImportFile(file: File) {
    setIoBusy(true);
    setError("");
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/menu-table/import", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "导入失败");
      setRows(data.rows || rows);
      setMessage(
        `已导入：更新 ${data.matched ?? 0}，新增 ${data.added ?? 0}` +
          (data.skipped ? `，跳过 ${data.skipped}` : "") +
          "；请核对后点保存",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    } finally {
      setIoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const busy = saving || aiBusy || glassBusy || ioBusy;

  if (loading) {
    return <p className="text-sm text-ink-mute">加载中…</p>;
  }

  return (
    <div className="space-y-4">
      <section className="card-surface space-y-3 p-4">
        <p className="text-sm text-ink-soft">表格导入 / 导出</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-outline"
            disabled={busy || !rows.length}
            onClick={handleExport}
          >
            {ioBusy ? "处理中…" : "导出 CSV"}
          </button>
          <button
            type="button"
            className="btn-outline"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            导入 CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImportFile(f);
            }}
          />
        </div>
        <p className="text-[10px] text-ink-mute">
          导出含酒名、分类、杯型、甜酸烈、酒精度、上下架、标签与风味等；用 Excel
          改完再导入。匹配优先「酒品ID / 配方ID」，其次酒名。销量只读不覆盖。导入后请点保存。
        </p>
      </section>

      <section className="card-surface space-y-3 p-4">
        <p className="text-sm text-ink-soft">AI 改表</p>
        <textarea
          className="field min-h-[72px]"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="例如：按酒含量批量重算甜度酸度烈度分类"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={busy || !rows.length}
            onClick={handleAi}
          >
            {aiBusy ? "处理中…" : "AI 应用到表格"}
          </button>
          <button
            type="button"
            className="btn-outline"
            disabled={busy || !rows.length}
            onClick={handleBatchGlasses}
          >
            {glassBusy ? "识杯中…" : "批量识杯型"}
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={busy || !rows.length}
            onClick={handleSave}
          >
            {saving ? "保存中…" : "保存全部"}
          </button>
        </div>
        <p className="text-[10px] text-ink-mute">
          「批量识杯型」会按每款成片封面识别杯型；无图会跳过。改完请保存。
        </p>
        {message ? <p className="text-xs text-hush-pink">{message}</p> : null}
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </section>

      {rows.length === 0 ? (
        <div className="card-surface px-5 py-8 text-center text-sm text-ink-mute">
          暂无菜单数据
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => (
            <article
              key={row.recipeId || row.drinkId || i}
              className="card-surface space-y-3 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {row.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.imageUrl}
                      alt=""
                      className="h-8 w-8 shrink-0 object-cover border border-hush-plum"
                    />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-hush-plum text-[9px] text-ink-mute">
                      无图
                    </span>
                  )}
                  <p className="text-[10px] text-ink-mute">
                    ID {shortId(row)}
                    {row.drinkId ? "" : " · 未生成酒品"}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-ink-soft">
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={row.isPublished}
                      onChange={(e) =>
                        patchRow(i, { isPublished: e.target.checked })
                      }
                    />
                    上架
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={row.isAvailable}
                      disabled={!row.isPublished}
                      onChange={(e) =>
                        patchRow(i, { isAvailable: e.target.checked })
                      }
                    />
                    供应
                  </label>
                </div>
              </div>

              {/* 第一行：酒名 + 分类 + 杯型 */}
              <div className="grid grid-cols-12 gap-2">
                <label className="col-span-5 space-y-1">
                  <span className="text-[10px] text-ink-mute">酒名</span>
                  <input
                    className="field !px-2 !py-2"
                    value={row.name}
                    onChange={(e) => patchRow(i, { name: e.target.value })}
                  />
                </label>
                <label className="col-span-3 space-y-1">
                  <span className="text-[10px] text-ink-mute">分类</span>
                  <select
                    className="field !px-2 !py-2"
                    value={row.category}
                    onChange={(e) => patchRow(i, { category: e.target.value })}
                  >
                    {DRINK_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="col-span-4 space-y-1">
                  <span className="text-[10px] text-ink-mute">杯型</span>
                  <select
                    className="field !px-2 !py-2"
                    value={
                      (GLASS_TYPES as readonly string[]).includes(row.glassType)
                        ? row.glassType
                        : DEFAULT_GLASS_TYPE
                    }
                    onChange={(e) =>
                      patchRow(i, { glassType: e.target.value })
                    }
                  >
                    {GLASS_TYPES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* 第二行：甜酸烈 ABV + 风味 */}
              <div className="grid grid-cols-12 gap-2">
                {(
                  [
                    ["sweetness", "甜"],
                    ["acidity", "酸"],
                    ["strength", "烈"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="col-span-2 space-y-1">
                    <span className="text-[10px] text-ink-mute">{label}</span>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      className="field !px-1 !py-2 text-center"
                      value={row[key]}
                      onChange={(e) =>
                        patchRow(i, {
                          [key]: Number(e.target.value) || 1,
                        })
                      }
                    />
                  </label>
                ))}
                <label className="col-span-2 space-y-1">
                  <span className="text-[10px] text-ink-mute">ABV%</span>
                  <input
                    type="number"
                    step="0.1"
                    className="field !px-1 !py-2 text-center"
                    value={row.abvApprox ?? ""}
                    onChange={(e) =>
                      patchRow(i, {
                        abvApprox:
                          e.target.value === ""
                            ? null
                            : Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="col-span-4 space-y-1">
                  <span className="text-[10px] text-ink-mute">风味</span>
                  <input
                    className="field !px-2 !py-2"
                    value={row.flavorText}
                    onChange={(e) =>
                      patchRow(i, { flavorText: e.target.value })
                    }
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-ink-soft">
                <span className="text-[10px] text-ink-mute">标签</span>
                {(
                  [
                    ["hasDairy", "含奶"],
                    ["hasCaffeine", "含咖啡因"],
                    ["hasTea", "含茶"],
                    ["hasSparkling", "含气泡"],
                    ["isNonAlcoholic", "无酒精"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={row[key]}
                      onChange={(e) =>
                        patchRow(i, { [key]: e.target.checked })
                      }
                    />
                    {label}
                  </label>
                ))}
                <span className="ml-auto text-[10px] text-ink-mute">
                  销量 {row.salesCount}
                </span>
              </div>

              {row.ingredientsSummary ? (
                <p className="text-[10px] leading-4 text-ink-mute">
                  {row.ingredientsSummary}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
