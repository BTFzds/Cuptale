"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/components/image-upload";
import { DRINK_CATEGORIES } from "@/lib/categories";

interface RecipeOption {
  id: string;
  name: string;
}

interface DrinkForm {
  name: string;
  imageUrl: string;
  flavorText: string;
  category: string;
  tagline: string;
  sweetness: number;
  acidity: number;
  strength: number;
  abvApprox: string;
  glassType: string;
  isNonAlcoholic: boolean;
  hasDairy: boolean;
  hasCaffeine: boolean;
  allergens: string;
  isPublished: boolean;
  isAvailable: boolean;
  sortOrder: number;
  recipeId: string;
}

const emptyForm: DrinkForm = {
  name: "",
  imageUrl: "",
  flavorText: "",
  category: "经典",
  tagline: "",
  sweetness: 3,
  acidity: 3,
  strength: 3,
  abvApprox: "",
  glassType: "岩石杯",
  isNonAlcoholic: false,
  hasDairy: false,
  hasCaffeine: false,
  allergens: "",
  isPublished: true,
  isAvailable: true,
  sortOrder: 0,
  recipeId: "",
};

const STEPS = ["基本信息", "口味标签", "风味文案", "上架发布"] as const;

export function DrinkEditor({ drinkId }: { drinkId?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<DrinkForm>(emptyForm);
  const [recipes, setRecipes] = useState<RecipeOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/recipes")
      .then((res) => res.json())
      .then((data) => setRecipes(data.recipes || []))
      .catch(() => undefined);

    if (!drinkId) return;
    fetch(`/api/drinks/${drinkId}?admin=1`)
      .then((res) => res.json())
      .then((data) => {
        const d = data.drink;
        if (!d) return;
        setForm({
          name: d.name || "",
          imageUrl: d.imageUrl || "",
          flavorText: d.flavorText || "",
          category: d.category || "经典",
          tagline: d.tagline || "",
          sweetness: d.sweetness ?? 3,
          acidity: d.acidity ?? 3,
          strength: d.strength ?? 3,
          abvApprox: d.abvApprox != null ? String(d.abvApprox) : "",
          glassType: d.glassType || "岩石杯",
          isNonAlcoholic: !!d.isNonAlcoholic,
          hasDairy: !!d.hasDairy,
          hasCaffeine: !!d.hasCaffeine,
          allergens: d.allergens || "",
          isPublished: !!d.isPublished,
          isAvailable: d.isAvailable !== false,
          sortOrder: d.sortOrder ?? 0,
          recipeId: d.recipeId || "",
        });
      })
      .catch(() => setError("加载酒品失败"));
  }, [drinkId]);

  function patch<K extends keyof DrinkForm>(key: K, value: DrinkForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function canNext() {
    if (step === 0) return form.name.trim().length > 0;
    return true;
  }

  async function generateFlavor() {
    setGenerating(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/ai/flavor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drinkId,
          drinkName: form.name,
          recipeId: form.recipeId || null,
          tasteHints: `甜度${form.sweetness} 酸度${form.acidity} 烈度${form.strength} 杯型${form.glassType}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      patch("flavorText", data.flavorText);
      setMessage("已生成，可直接改字再保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        name: form.name,
        imageUrl: form.imageUrl || null,
        flavorText: form.flavorText,
        category: form.category,
        tagline: form.tagline,
        sweetness: Number(form.sweetness),
        acidity: Number(form.acidity),
        strength: Number(form.strength),
        abvApprox: form.abvApprox === "" ? null : Number(form.abvApprox),
        glassType: form.glassType,
        isNonAlcoholic: form.isNonAlcoholic,
        hasDairy: form.hasDairy,
        hasCaffeine: form.hasCaffeine,
        allergens: form.allergens,
        isPublished: form.isPublished,
        isAvailable: form.isAvailable,
        sortOrder: Number(form.sortOrder) || 0,
        recipeId: form.recipeId || null,
      };
      const res = await fetch(drinkId ? `/api/drinks/${drinkId}` : "/api/drinks", {
        method: drinkId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setMessage("已保存");
      router.push("/admin/drinks");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!drinkId) return;
    if (!confirm("确定删除这杯酒品？")) return;
    const res = await fetch(`/api/drinks/${drinkId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/drinks");
      router.refresh();
    }
  }

  return (
    <div className="space-y-5">
      <ol className="flex gap-1">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`flex-1 px-1 py-2 text-center text-[11px] ${
              i === step
                ? "bg-hush-pink text-[#1a0b22]"
                : i < step
                  ? "bg-hush-plum/70 text-ink"
                  : "bg-sand text-ink-mute"
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      <div className="card-surface p-5">
        {step === 0 ? (
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm">酒名 *</span>
              <input
                className="field"
                value={form.name}
                onChange={(e) => patch("name", e.target.value)}
                placeholder="酒名"
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm">短说明</span>
              <input
                className="field"
                value={form.tagline}
                onChange={(e) => patch("tagline", e.target.value)}
                placeholder="可选"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm">分类</span>
              <select
                className="field"
                value={form.category}
                onChange={(e) => patch("category", e.target.value)}
              >
                {DRINK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-2">
              <span className="text-sm">饮品图片</span>
              <ImageUpload
                value={form.imageUrl}
                onChange={(url) => patch("imageUrl", url)}
              />
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ["sweetness", "甜度"],
                  ["acidity", "酸度"],
                  ["strength", "烈度"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block space-y-2">
                  <span className="text-sm">{label}</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    className="field"
                    value={form[key]}
                    onChange={(e) => patch(key, Number(e.target.value) || 1)}
                  />
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-2">
                <span className="text-sm">酒精度约 %</span>
                <input
                  className="field"
                  value={form.abvApprox}
                  onChange={(e) => patch("abvApprox", e.target.value)}
                  placeholder="如 18"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm">杯型</span>
                <input
                  className="field"
                  value={form.glassType}
                  onChange={(e) => patch("glassType", e.target.value)}
                />
              </label>
            </div>
            <label className="block space-y-2">
              <span className="text-sm">过敏提示</span>
              <input
                className="field"
                value={form.allergens}
                onChange={(e) => patch("allergens", e.target.value)}
                placeholder="可选"
              />
            </label>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isNonAlcoholic}
                  onChange={(e) => patch("isNonAlcoholic", e.target.checked)}
                />
                无酒精
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.hasDairy}
                  onChange={(e) => patch("hasDairy", e.target.checked)}
                />
                含奶
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.hasCaffeine}
                  onChange={(e) => patch("hasCaffeine", e.target.checked)}
                />
                含咖啡因
              </label>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm">关联配方（可选）</span>
              <select
                className="field"
                value={form.recipeId}
                onChange={(e) => patch("recipeId", e.target.value)}
              >
                <option value="">暂不关联</option>
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm">风味介绍</span>
              <textarea
                className="field min-h-[140px]"
                value={form.flavorText}
                onChange={(e) => patch("flavorText", e.target.value)}
                placeholder="风味介绍"
              />
            </label>
            <button
              type="button"
              className="btn-ghost"
              onClick={generateFlavor}
              disabled={generating || !form.name}
            >
              {generating ? "生成中…" : "生成文案"}
            </button>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div className="space-y-3 rounded-sm bg-sand p-4 text-sm">
              <p>
                <span className="text-ink-mute">酒名</span> {form.name || "—"}
              </p>
              <p>
                <span className="text-ink-mute">分类</span> {form.category}
              </p>
              <p className="line-clamp-3">
                <span className="text-ink-mute">文案</span>{" "}
                {form.flavorText || "（空）"}
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => patch("isPublished", e.target.checked)}
                />
                上架到菜单
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(e) => patch("isAvailable", e.target.checked)}
                />
                供应中（取消=灰显暂停）
              </label>
            </div>
          </div>
        ) : null}

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {message ? <p className="mt-4 text-sm text-ink-soft">{message}</p> : null}
      </div>

      <div className="flex flex-wrap gap-3">
        {step > 0 ? (
          <button type="button" className="btn-ghost" onClick={() => setStep((s) => s - 1)}>
            上一步
          </button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            className="btn-primary"
            disabled={!canNext()}
            onClick={() => setStep((s) => s + 1)}
          >
            下一步
          </button>
        ) : (
          <button type="button" className="btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? "保存中…" : "保存酒品"}
          </button>
        )}
        {drinkId ? (
          <button type="button" className="btn-ghost" onClick={handleDelete}>
            删除
          </button>
        ) : null}
      </div>
    </div>
  );
}
