"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Ingredient } from "@/lib/ingredients";

interface MakeOrder {
  id: string;
  nickname: string;
  drinkName: string;
  drinkImageUrl: string | null;
  quantity: number;
  note: string;
  status: string;
  glassType: string;
  ingredients: Ingredient[];
  steps: string;
  notes: string;
}

export function MakeStation({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<MakeOrder | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function open() {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (!res.ok) {
        if (!cancelled) setError(data.error || "订单不存在");
        return;
      }
      if (data.order.status === "pending") {
        await fetch(`/api/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "making" }),
        });
        data.order.status = "making";
      }
      if (!cancelled) setOrder(data.order);
    }
    open().catch(() => {
      if (!cancelled) setError("加载失败");
    });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  async function finish() {
    setBusy(true);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    if (!res.ok) {
      setBusy(false);
      setError("没能标成已完成");
      return;
    }
    router.push("/admin/orders");
    router.refresh();
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!order) return <p className="text-sm text-ink-mute">加载配方…</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-ink-mute">制作中</p>
          <h1 className="text-2xl font-semibold">
            {order.drinkName} × {order.quantity}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {order.nickname}
            {order.note ? ` · ${order.note}` : ""}
          </p>
        </div>
        <button type="button" className="btn-ghost text-xs" onClick={() => router.push("/admin/orders")}>
          返回
        </button>
      </div>

      {order.drinkImageUrl ? (
        <div className="border-[3px] border-ink bg-[#f7f7f7] p-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={order.drinkImageUrl}
            alt={order.drinkName}
            className="mx-auto max-h-72 w-full object-contain"
          />
        </div>
      ) : null}

      <section className="card-surface p-4">
        <h2 className="text-sm font-medium">材料</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {order.ingredients.length === 0 ? (
            <li className="text-ink-mute">这条没有关联配方</li>
          ) : (
            order.ingredients.map((item, index) => (
              <li key={`${item.name}-${index}`}>
                {item.name}{" "}
                {item.ml ? `${item.ml}ml` : item.note || "适量"}
              </li>
            ))
          )}
        </ul>
        {order.glassType ? (
          <p className="mt-3 text-xs text-ink-mute">杯型 {order.glassType}</p>
        ) : null}
      </section>

      <section className="card-surface p-4">
        <h2 className="text-sm font-medium">怎么调</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
          {order.steps || "还没写步骤"}
        </p>
        {order.notes ? (
          <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-ink-mute">
            {order.notes}
          </p>
        ) : null}
      </section>

      <button type="button" className="btn-primary w-full" disabled={busy} onClick={finish}>
        {busy ? "…" : "制作完毕"}
      </button>
    </div>
  );
}
