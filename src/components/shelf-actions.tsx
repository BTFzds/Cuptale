"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PublishRecipeButton({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function publish() {
    setBusy(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPublished: true,
          isAvailable: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "上架失败");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "上架失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className="btn-primary px-3 py-1.5 text-xs"
      disabled={busy}
      onClick={publish}
    >
      {busy ? "…" : "上架为酒品"}
    </button>
  );
}

export function DrinkShelfButtons({
  drinkId,
  isPublished,
  isAvailable,
}: {
  drinkId: string;
  isPublished: boolean;
  isAvailable: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(body: { isPublished?: boolean; isAvailable?: boolean }) {
    setBusy(true);
    try {
      const res = await fetch(`/api/drinks/${drinkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "更新失败");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "更新失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button
        type="button"
        className="btn-ghost px-3 py-1.5 text-xs"
        disabled={busy}
        onClick={() => patch({ isPublished: !isPublished })}
      >
        {isPublished ? "下架" : "重新上架"}
      </button>
      <button
        type="button"
        className="btn-ghost px-3 py-1.5 text-xs"
        disabled={busy || !isPublished}
        onClick={() => patch({ isAvailable: !isAvailable })}
      >
        {isAvailable ? "设为售罄" : "恢复供应"}
      </button>
    </div>
  );
}
