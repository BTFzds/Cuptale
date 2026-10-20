"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageCropUpload } from "@/components/image-crop-upload";
import type { RecipeAiDraft, RecipeTasteDraft } from "@/lib/ai-recipe";
import { DRINK_CATEGORIES } from "@/lib/categories";
import type { Ingredient } from "@/lib/ingredients";

interface RecipeForm {
  name: string;
  imageUrl: string;
  imageUrls: string[];
  ingredients: Ingredient[];
  steps: string;
  notes: string;
}

const emptyForm: RecipeForm = {
  name: "",
  imageUrl: "",
  imageUrls: [],
  ingredients: [{ name: "", ml: 0 }],
  steps: "",
  notes: "",
};

const emptyTaste: RecipeTasteDraft = {
  category: "经典",
  tagline: "",
  sweetness: 3,
  acidity: 3,
  strength: 2,
  abvApprox: null,
  glassType: "岩石杯",
  isNonAlcoholic: false,
  hasDairy: false,
  hasCaffeine: false,
  allergens: "",
  flavorText: "",
};

type ChatMsg = { role: "user" | "assistant"; content: string };

export function RecipeEditor({ recipeId }: { recipeId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<RecipeForm>(emptyForm);
  const [taste, setTaste] = useState<RecipeTasteDraft>(emptyTaste);
  const [rawNote, setRawNote] = useState("");
  const [draft, setDraft] = useState<RecipeAiDraft | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [chatting, setChatting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [flavorBusy, setFlavorBusy] = useState(false);
  const [flavorHistory, setFlavorHistory] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!recipeId) return;
    fetch(`/api/recipes/${recipeId}`)
      .then((res) => res.json())
      .then((data) => {
        const r = data.recipe;
        if (!r) return;
        const gallery: string[] = r.imageUrls?.length
          ? r.imageUrls
          : r.imageUrl
            ? [r.imageUrl]
            : [];
        setForm({
          name: r.name || "",
          imageUrl: r.imageUrl || gallery[0] || "",
          imageUrls: gallery,
          ingredients:
            r.ingredients?.length > 0 ? r.ingredients : [{ name: "", ml: 0 }],
          steps: r.steps || "",
          notes: r.notes || "",
        });
        setTaste((t) => ({
          ...t,
          flavorText: r.flavorText || t.flavorText,
          category: r.category || t.category,
        }));
        if (r.notes) setRawNote(r.notes);
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

  function applyDraft(next: RecipeAiDraft) {
    setDraft(next);
    setTaste(next.taste);
    if (next.taste.flavorText.trim()) {
      setFlavorHistory([next.taste.flavorText.trim()]);
    }
    setForm((prev) => ({
      ...prev,
      name: next.name || prev.name,
      ingredients: next.ingredients.length
        ? next.ingredients
        : prev.ingredients,
      steps: next.steps || prev.steps,
      notes: next.notes || prev.notes,
    }));
    setMessage("");
  }

  async function fetchFlavorForDraft(next: RecipeAiDraft) {
    setFlavorBusy(true);
    try {
      const res = await fetch("/api/ai/flavor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drinkName: next.name,
          ingredientsSummary: next.ingredients
            .map((i) => `${i.name}${i.ml ? i.ml + "ml" : i.note || ""}`)
            .join("、"),
          steps: next.steps,
          tasteHints: `甜度${next.taste.sweetness} 酸度${next.taste.acidity} 烈度${next.taste.strength} 杯型${next.taste.glassType}`,
          imageUrls: form.imageUrls,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      const text = String(data.flavorText || "").trim();
      if (!text) throw new Error("生成失败");
      setTaste((t) => ({ ...t, flavorText: text }));
      setFlavorHistory([text]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "风味生成失败");
    } finally {
      setFlavorBusy(false);
    }
  }

  async function regenerateFlavor() {
    const name = form.name.trim() || draft?.name || "";
    if (!name) {
      setError("请先填写配方名");
      return;
    }
    setFlavorBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ai/flavor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drinkName: name,
          ingredientsSummary: form.ingredients
            .filter((i) => i.name.trim())
            .map((i) => `${i.name}${i.ml ? i.ml + "ml" : i.note || ""}`)
            .join("、"),
          steps: form.steps,
          tasteHints: `甜度${taste.sweetness} 酸度${taste.acidity} 烈度${taste.strength} 杯型${taste.glassType}`,
          imageUrls: form.imageUrls,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      const next = String(data.flavorText || "").trim();
      if (!next) throw new Error("生成失败");
      setFlavorHistory((prev) =>
        taste.flavorText.trim() ? [...prev, taste.flavorText.trim()] : prev,
      );
      setTaste((t) => ({ ...t, flavorText: next }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setFlavorBusy(false);
    }
  }

  function restorePreviousFlavor() {
    setFlavorHistory((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      setTaste((t) => ({ ...t, flavorText: last }));
      return prev.slice(0, -1);
    });
  }

  async function handleAiParse() {
    setParsing(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/ai/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: rawNote,
          imageUrls: form.imageUrls,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "识别失败");
      const next = data.draft as RecipeAiDraft;
      applyDraft(next);
      setChat([{ role: "assistant", content: next.assistantMessage }]);
      if (!next.taste.flavorText.trim()) {
        void fetchFlavorForDraft(next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "识别失败");
    } finally {
      setParsing(false);
    }
  }

  async function handleChatSend() {
    if (!draft || !chatInput.trim()) return;
    const userMsg: ChatMsg = { role: "user", content: chatInput.trim() };
    const nextMessages = [...chat, userMsg];
    setChat(nextMessages);
    setChatInput("");
    setChatting(true);
    setError("");
    try {
      const res = await fetch("/api/ai/recipe/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, messages: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "对话失败");
      const next = data.draft as RecipeAiDraft;
      applyDraft(next);
      setChat((prev) => [
        ...prev,
        { role: "assistant", content: next.assistantMessage },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "对话失败");
    } finally {
      setChatting(false);
    }
  }

  async function persistRecipe(): Promise<string> {
    const cover = form.imageUrls[0] || form.imageUrl || null;
    const payload = {
      name: form.name,
      imageUrl: cover,
      imageUrls: form.imageUrls,
      ingredients: form.ingredients.filter((i) => i.name.trim()),
      steps: form.steps,
      notes: form.notes || rawNote,
      flavorText: taste.flavorText,
      category: taste.category,
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
    return data.recipe.id as string;
  }

  function validateRequired() {
    if (!form.name.trim()) {
      setError("请填写配方名");
      return false;
    }
    if (!taste.flavorText.trim()) {
      setError("请填写风味介绍（可点重新生成）");
      return false;
    }
    return true;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!validateRequired()) return;
    setSaving(true);
    try {
      await persistRecipe();
      setMessage("保存成功");
      await new Promise((r) => setTimeout(r, 700));
      router.push("/admin/recipes");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setError("");
    if (!validateRequired()) return;
    setPublishing(true);
    setError("");
    setMessage("");
    try {
      const id = recipeId || (await persistRecipe());
      const res = await fetch(`/api/recipes/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          imageUrl: form.imageUrls[0] || form.imageUrl || null,
          ...taste,
          isPublished: true,
          isAvailable: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "上架失败");
      setMessage(data.reused ? "已更新关联酒品" : "已上架为酒品");
      router.push(`/admin/drinks/${data.drink.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "上架失败");
    } finally {
      setPublishing(false);
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
    <div className="space-y-5">
      <section className="card-surface p-5 space-y-3">
        <h2 className="text-base font-medium">AI 识配方</h2>
        <textarea
          className="field min-h-[100px]"
          value={rawNote}
          onChange={(e) => setRawNote(e.target.value)}
          placeholder={"2026.10.18初恋\n朗姆酒25ml …"}
        />
        <ImageCropUpload
          urls={form.imageUrls}
          onChange={(urls) =>
            setForm((p) => ({
              ...p,
              imageUrls: urls,
              imageUrl: urls[0] || "",
            }))
          }
        />
        <button
          type="button"
          className="btn-primary"
          disabled={parsing}
          onClick={handleAiParse}
        >
          {parsing ? "识别中…" : "AI 识别并填入"}
        </button>

        {chat.length ? (
          <div className="space-y-3 border-t border-hush-plum pt-4">
            <p className="text-sm text-ink-soft">确认对话</p>
            <div className="max-h-56 space-y-2 overflow-y-auto text-sm">
              {chat.map((m, i) => (
                <div
                  key={i}
                  className={`rounded-sm px-3 py-2 ${
                    m.role === "assistant" ? "bg-sand" : "bg-[#1e1028]"
                  }`}
                >
                  <span className="text-xs text-ink-mute">
                    {m.role === "assistant" ? "助手" : "我"}
                  </span>
                  <p className="mt-1 whitespace-pre-wrap">{m.content}</p>
                </div>
              ))}
            </div>
            {draft?.questions?.length ? (
              <ul className="list-disc space-y-1 pl-5 text-xs text-ink-soft">
                {draft.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            ) : null}
            <div className="flex gap-2">
              <input
                className="field"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="糖浆用红石榴；先加冰，最后气泡水加满，不摇"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleChatSend();
                  }
                }}
              />
              <button
                type="button"
                className="btn-ghost shrink-0"
                disabled={chatting || !chatInput.trim()}
                onClick={handleChatSend}
              >
                {chatting ? "…" : "发送"}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <form onSubmit={handleSave} className="card-surface space-y-4 p-5">
        <label className="block space-y-2">
          <span className="text-sm text-ink-soft">配方名 *</span>
          <input
            className="field"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
        </label>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-soft">原料配比（仅后台）</span>
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
            <div key={index} className="flex flex-wrap gap-2">
              <input
                className="field min-w-[120px] flex-1"
                placeholder="原料名"
                value={item.name}
                onChange={(e) => updateIngredient(index, { name: e.target.value })}
              />
              <input
                type="number"
                className="field w-20 shrink-0"
                placeholder="ml"
                value={item.ml}
                onChange={(e) =>
                  updateIngredient(index, { ml: Number(e.target.value) || 0 })
                }
              />
              <input
                className="field w-20 shrink-0"
                placeholder="备注"
                value={item.note || ""}
                onChange={(e) => updateIngredient(index, { note: e.target.value })}
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
            placeholder="倒入顺序与手法…"
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

        <div className="space-y-3 border-t border-hush-plum pt-4">
          <p className="text-sm text-ink-soft">上架参数</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 text-sm">
              <span>分类</span>
              <select
                className="field"
                value={taste.category}
                onChange={(e) =>
                  setTaste((t) => ({ ...t, category: e.target.value }))
                }
              >
                {DRINK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>杯型</span>
              <input
                className="field"
                value={taste.glassType}
                onChange={(e) =>
                  setTaste((t) => ({ ...t, glassType: e.target.value }))
                }
              />
            </label>
            {(
              [
                ["sweetness", "甜度"],
                ["acidity", "酸度"],
                ["strength", "烈度"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block space-y-1 text-sm">
                <span>{label}</span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="field"
                  value={taste[key]}
                  onChange={(e) =>
                    setTaste((t) => ({
                      ...t,
                      [key]: Number(e.target.value) || 1,
                    }))
                  }
                />
              </label>
            ))}
            <label className="block space-y-1 text-sm">
              <span>酒精度约 %</span>
              <input
                className="field"
                value={taste.abvApprox ?? ""}
                onChange={(e) =>
                  setTaste((t) => ({
                    ...t,
                    abvApprox:
                      e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
              />
            </label>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">风味介绍 *</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-ghost px-2 py-1 text-xs"
                  disabled={!flavorHistory.length}
                  onClick={restorePreviousFlavor}
                >
                  上一个
                </button>
                <button
                  type="button"
                  className="btn-ghost px-2 py-1 text-xs"
                  disabled={flavorBusy}
                  onClick={() => void regenerateFlavor()}
                >
                  {flavorBusy ? "…" : "重新生成"}
                </button>
              </div>
            </div>
            <textarea
              className="field min-h-[90px]"
              value={taste.flavorText}
              onChange={(e) =>
                setTaste((t) => ({ ...t, flavorText: e.target.value }))
              }
            />
            {flavorBusy ? (
              <p className="text-xs text-ink-mute">风味生成中…</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={taste.isNonAlcoholic}
                onChange={(e) =>
                  setTaste((t) => ({ ...t, isNonAlcoholic: e.target.checked }))
                }
              />
              无酒精
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={taste.hasDairy}
                onChange={(e) =>
                  setTaste((t) => ({ ...t, hasDairy: e.target.checked }))
                }
              />
              含奶
            </label>
          </div>
        </div>

        {error ? <p className="text-sm text-red-700/80">{error}</p> : null}
        {message ? (
          <p className="text-sm font-medium text-ink">{message}</p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button className="btn-primary" disabled={saving}>
            {saving ? "保存中…" : "保存配方"}
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={publishing}
            onClick={handlePublish}
          >
            {publishing ? "上架中…" : "上架为酒品"}
          </button>
          {recipeId ? (
            <button type="button" className="btn-ghost" onClick={handleDelete}>
              删除
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
