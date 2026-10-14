"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/components/image-upload";
import type { Ingredient } from "@/lib/ingredients";

interface RecipeForm {
  name: string;
  imageUrl: string;
  ingredients: Ingredient[];
  steps: string;
  notes: string;
}

const emptyForm: RecipeForm = {
  name: "",
  imageUrl: "",
  ingredients: [{ name: "", ml: 0 }],
  steps: "",
  notes: "",
};

export function RecipeEditor({ recipeId }: { recipeId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<RecipeForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!recipeId) return;
    fetch(`/api/recipes/${recipeId}`)
      .then((res) => res.json())
      .then((data) => {
        const r = data.recipe;
        if (!r) return;
        setForm({
          name: r.name || "",
          imageUrl: r.imageUrl || "",
          ingredients:
            r.ingredients?.length > 0 ? r.ingredients : [{ name: "", ml: 0 }],
          steps: r.steps || "",
          notes: r.notes || "",
        });
      })
      .catch(() => setError("加载配方失败"));
  }, [recipeId]);

  function updateIngredient(index: number, patch: Partial<Ingredient>) {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        imageUrl: form.imageUrl || null,
        ingredients: form.ingredients.filter((i) => i.name.trim()),
        steps: form.steps,
        notes: form.notes,
      };
      const res = await fetch(
        recipeId ? `/api/recipes/${recipeId}` : "/api/recipes",
        {
          method: recipeId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      router.push("/admin/recipes");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!recipeId) return;
    if (!confirm("确定删除该配方？关联酒品将解除配方绑定。")) return;
    const res = await fetch(`/api/recipes/${recipeId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/recipes");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSave} className="card-surface space-y-4 p-5">
      <label className="block space-y-2">
        <span className="text-sm text-ink-soft">配方名</span>
        <input
          className="field"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          required
        />
      </label>

      <div className="space-y-2">
        <span className="text-sm text-ink-soft">图片</span>
        <ImageUpload
          value={form.imageUrl}
          onChange={(url) => setForm((p) => ({ ...p, imageUrl: url }))}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-soft">原料配比（仅后台可见）</span>
          <button
            type="button"
            className="text-sm text-clay"
            onClick={() =>
              setForm((p) => ({
                ...p,
                ingredients: [...p.ingredients, { name: "", ml: 0 }],
              }))
            }
          >
            + 原料
          </button>
        </div>
        {form.ingredients.map((item, index) => (
          <div key={index} className="flex gap-2">
            <input
              className="field"
              placeholder="原料名"
              value={item.name}
              onChange={(e) => updateIngredient(index, { name: e.target.value })}
            />
            <input
              type="number"
              className="field w-24 shrink-0"
              placeholder="ml"
              value={item.ml}
              onChange={(e) =>
                updateIngredient(index, { ml: Number(e.target.value) || 0 })
              }
            />
            {form.ingredients.length > 1 ? (
              <button
                type="button"
                className="btn-ghost px-3"
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    ingredients: p.ingredients.filter((_, i) => i !== index),
                  }))
                }
              >
                删
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <label className="block space-y-2">
        <span className="text-sm text-ink-soft">制作步骤</span>
        <textarea
          className="field min-h-[120px]"
          value={form.steps}
          onChange={(e) => setForm((p) => ({ ...p, steps: e.target.value }))}
          placeholder="摇和 / 搅拌 / 装饰…"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm text-ink-soft">内部备注</span>
        <textarea
          className="field min-h-[80px]"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
        />
      </label>

      {error ? <p className="text-sm text-red-700/80">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button className="btn-primary" disabled={saving}>
          {saving ? "保存中…" : "保存配方"}
        </button>
        {recipeId ? (
          <button type="button" className="btn-ghost" onClick={handleDelete}>
            删除
          </button>
        ) : null}
      </div>
    </form>
  );
}
