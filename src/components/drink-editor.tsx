"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/components/image-upload";

interface RecipeOption {
  id: string;
  name: string;
}

interface DrinkForm {
  name: string;
  imageUrl: string;
  flavorText: string;
  sweetness: number;
  acidity: number;
  strength: number;
  abvApprox: string;
  glassType: string;
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
  sweetness: 3,
  acidity: 3,
  strength: 3,
  abvApprox: "",
  glassType: "岩石杯",
  hasDairy: false,
  hasCaffeine: false,
  allergens: "",
  isPublished: false,
  isAvailable: true,
  sortOrder: 0,
  recipeId: "",
};

export function DrinkEditor({ drinkId }: { drinkId?: string }) {
  const router = useRouter();
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
    fetch(`/api/drinks/${drinkId}`)
      .then((res) => res.json())
      .then((data) => {
        const d = data.drink;
        if (!d) return;
        setForm({
          name: d.name || "",
          imageUrl: d.imageUrl || "",
          flavorText: d.flavorText || "",
          sweetness: d.sweetness ?? 3,
          acidity: d.acidity ?? 3,
          strength: d.strength ?? 3,
          abvApprox: d.abvApprox != null ? String(d.abvApprox) : "",
          glassType: d.glassType || "岩石杯",
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
      setMessage("已生成风味文案，可继续编辑后保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        name: form.name,
        imageUrl: form.imageUrl || null,
        flavorText: form.flavorText,
        sweetness: Number(form.sweetness),
        acidity: Number(form.acidity),
        strength: Number(form.strength),
        abvApprox: form.abvApprox === "" ? null : Number(form.abvApprox),
        glassType: form.glassType,
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
    <form onSubmit={handleSave} className="card-surface space-y-4 p-5">
      <label className="block space-y-2">
        <span className="text-sm text-ink-soft">酒名</span>
        <input
          className="field"
          value={form.name}
          onChange={(e) => patch("name", e.target.value)}
          required
        />
      </label>

      <div className="space-y-2">
        <span className="text-sm text-ink-soft">图片</span>
        <ImageUpload value={form.imageUrl} onChange={(url) => patch("imageUrl", url)} />
      </div>

      <label className="block space-y-2">
        <span className="text-sm text-ink-soft">风味文案（对外）</span>
        <textarea
          className="field min-h-[120px]"
          value={form.flavorText}
          onChange={(e) => patch("flavorText", e.target.value)}
        />
        <button
          type="button"
          className="btn-ghost"
          onClick={generateFlavor}
          disabled={generating || !form.name}
        >
          {generating ? "生成中…" : "DeepSeek 一键生成 / 重新生成"}
        </button>
      </label>

      <div className="grid grid-cols-3 gap-3">
        {(
          [
            ["sweetness", "甜度"],
            ["acidity", "酸度"],
            ["strength", "烈度"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block space-y-2">
            <span className="text-sm text-ink-soft">{label}</span>
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
          <span className="text-sm text-ink-soft">酒精度约 %</span>
          <input
            className="field"
            value={form.abvApprox}
            onChange={(e) => patch("abvApprox", e.target.value)}
            placeholder="如 18"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-ink-soft">杯型</span>
          <input
            className="field"
            value={form.glassType}
            onChange={(e) => patch("glassType", e.target.value)}
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm text-ink-soft">过敏提示</span>
        <input
          className="field"
          value={form.allergens}
          onChange={(e) => patch("allergens", e.target.value)}
          placeholder="坚果 / 蛋清等"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm text-ink-soft">关联配方（可选，可后补）</span>
        <select
          className="field"
          value={form.recipeId}
          onChange={(e) => patch("recipeId", e.target.value)}
        >
          <option value="">不关联</option>
          {recipes.map((recipe) => (
            <option key={recipe.id} value={recipe.id}>
              {recipe.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-4 text-sm text-ink-soft">
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
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => patch("isPublished", e.target.checked)}
          />
          上架
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

      {error ? <p className="text-sm text-red-700/80">{error}</p> : null}
      {message ? <p className="text-sm text-ink-soft">{message}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button className="btn-primary" disabled={saving}>
          {saving ? "保存中…" : "保存"}
        </button>
        {drinkId ? (
          <button type="button" className="btn-ghost" onClick={handleDelete}>
            删除
          </button>
        ) : null}
      </div>
    </form>
  );
}
