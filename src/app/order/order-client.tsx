"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { GuestNav } from "@/components/guest-nav";
import { addOrderToken } from "@/lib/order-tokens";

interface DrinkOption {
  id: string;
  name: string;
  isAvailable: boolean;
}

interface LineItem {
  drinkId: string;
  quantity: number;
}

export function OrderClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetDrinkId = searchParams.get("drinkId");

  const [drinks, setDrinks] = useState<DrinkOption[]>([]);
  const [nickname, setNickname] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ drinkId: "", quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/drinks")
      .then((res) => res.json())
      .then((data) => {
        const list = (data.drinks || []) as DrinkOption[];
        setDrinks(list);
        const firstAvailable =
          list.find((d) => d.id === presetDrinkId && d.isAvailable) ||
          list.find((d) => d.isAvailable);
        if (firstAvailable) {
          setItems([{ drinkId: firstAvailable.id, quantity: 1 }]);
        }
      })
      .catch(() => setError("菜单加载失败"));
  }, [presetDrinkId]);

  const availableDrinks = useMemo(
    () => drinks.filter((d) => d.isAvailable),
    [drinks],
  );

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payloadItems = items.filter((item) => item.drinkId && item.quantity > 0);
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, note, items: payloadItems }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "下单失败");
      addOrderToken(data.publicToken);
      setSuccess(true);
      setTimeout(() => router.push("/my-orders"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "下单失败");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="shell flex min-h-[70vh] flex-col items-center justify-center text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="card-surface px-8 py-10"
        >
          <p className="font-display text-2xl text-ink">下单成功</p>
          <p className="mt-3 text-sm text-ink-soft">正在带你查看制作进度…</p>
        </motion.div>
        <GuestNav />
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="mb-6">
        <h1 className="font-display text-2xl text-ink">点单</h1>
        <p className="mt-1 text-sm text-ink-soft">像点奶茶一样选几杯就好</p>
      </header>

      <form onSubmit={handleSubmit} className="card-surface space-y-5 p-5">
        <label className="block space-y-2">
          <span className="text-sm text-ink-soft">昵称</span>
          <input
            className="field"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="怎么称呼你"
            required
          />
        </label>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-soft">饮品</span>
            <button
              type="button"
              className="text-sm text-clay"
              onClick={() =>
                setItems((prev) => [
                  ...prev,
                  { drinkId: availableDrinks[0]?.id || "", quantity: 1 },
                ])
              }
              disabled={availableDrinks.length === 0}
            >
              + 再加一杯
            </button>
          </div>

          {items.map((item, index) => (
            <div key={index} className="flex gap-2">
              <select
                className="field"
                value={item.drinkId}
                onChange={(e) => updateItem(index, { drinkId: e.target.value })}
                required
              >
                <option value="">选择饮品</option>
                {drinks.map((drink) => (
                  <option
                    key={drink.id}
                    value={drink.id}
                    disabled={!drink.isAvailable}
                  >
                    {drink.name}
                    {!drink.isAvailable ? "（暂停）" : ""}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={20}
                className="field w-20 shrink-0"
                value={item.quantity}
                onChange={(e) =>
                  updateItem(index, { quantity: Number(e.target.value) || 1 })
                }
              />
              {items.length > 1 ? (
                <button
                  type="button"
                  className="btn-ghost px-3"
                  onClick={() =>
                    setItems((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  删
                </button>
              ) : null}
            </div>
          ))}
        </div>

        <label className="block space-y-2">
          <span className="text-sm text-ink-soft">备注</span>
          <textarea
            className="field min-h-[96px] resize-none"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="少冰 / 调整口味等"
          />
        </label>

        {error ? <p className="text-sm text-red-700/80">{error}</p> : null}

        <button className="btn-primary w-full" disabled={submitting}>
          {submitting ? "提交中…" : "确认下单"}
        </button>
      </form>

      <GuestNav />
    </main>
  );
}
