"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminListActions({
  editHref,
  deleteUrl,
  confirmText = "确定删除？",
}: {
  editHref: string;
  deleteUrl: string;
  confirmText?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm(confirmText)) return;
    setBusy(true);
    try {
      const res = await fetch(deleteUrl, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "删除失败");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex shrink-0 gap-2">
      <Link href={editHref} className="btn-ghost px-3 py-1.5 text-xs">
        编辑
      </Link>
      <button
        type="button"
        className="btn-ghost px-3 py-1.5 text-xs text-red-700"
        disabled={busy}
        onClick={handleDelete}
      >
        {busy ? "…" : "删除"}
      </button>
    </div>
  );
}
