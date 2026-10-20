"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getGuestDisplayName, getOrCreateGuestId } from "@/lib/guest-profile";
import { addOrderToken } from "@/lib/order-tokens";

export function OrderSheet({
  drinkId,
  drinkName,
  unavailable,
}: {
  drinkId: string;
  drinkName: string;
  unavailable: boolean;
}) {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getOrCreateGuestId();
    const saved = getGuestDisplayName();
    if (saved) setNickname(saved);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (unavailable) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname,
          note,
          items: [{ drinkId, quantity }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "下单失败");
      addOrderToken(data.publicToken);
      if (nickname.trim()) {
        const { setGuestDisplayName } = await import("@/lib/guest-profile");
        setGuestDisplayName(nickname);
      }
      router.push("/my-orders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "下单失败");
    } finally {
      setSubmitting(false);
    }
  }

  if (unavailable) {
    return (
      <button className="btn-primary w-full" disabled>
        暂时无法点单
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t border-hush-plum pt-5">
      <p className="text-sm font-medium">点一杯「{drinkName}」</p>
      <input
        className="field"
        placeholder="ID"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        required
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-ink-soft">数量</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="h-8 w-8 border border-hush-plum text-lg text-ink"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            −
          </button>
          <span className="w-6 text-center text-sm">{quantity}</span>
          <button
            type="button"
            className="h-8 w-8 border border-hush-plum text-lg text-ink"
            onClick={() => setQuantity((q) => Math.min(20, q + 1))}
          >
            +
          </button>
        </div>
      </div>
      <textarea
        className="field min-h-[72px] resize-none"
        placeholder="备注：少冰 / 调整口味等"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button className="btn-primary w-full" disabled={submitting}>
        {submitting ? "提交中…" : "确认下单"}
      </button>
    </form>
  );
}
