"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABEL, type OrderStatus } from "@/lib/constants";

interface AdminOrder {
  id: string;
  nickname: string;
  drinkName: string;
  drinkImageUrl: string | null;
  quantity: number;
  note: string;
  status: OrderStatus;
  createdAt: string;
  ingredientSummary: string;
}

interface SummaryRow {
  drinkId: string;
  name: string;
  quantity: number;
}

export function OrdersBoard() {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState<AdminOrder | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setOrders(data.orders || []);
      setSummary(data.summary || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);

  async function deleteOrder(id: string) {
    if (!confirm("删除该订单？")) return;
    const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
    if (res.ok) load();
    else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "删除失败");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">订单</h1>
        <button
          className="btn-ghost"
          onClick={() => {
            setLoading(true);
            load();
          }}
        >
          刷新
        </button>
      </div>

      <section className="border border-[#f0f0f0] p-4">
        <h2 className="mb-3 text-sm font-medium">未完成汇总</h2>
        {summary.length === 0 ? (
          <p className="text-sm text-ink-mute">暂无</p>
        ) : (
          <ul className="space-y-2">
            {summary.map((row) => (
              <li
                key={row.drinkId}
                className="flex items-center justify-between bg-sand px-3 py-2 text-sm"
              >
                <span>{row.name}</span>
                <span className="font-medium">× {row.quantity}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {loading ? <p className="text-sm text-ink-mute">加载中…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="space-y-3">
        {orders.map((order) => (
          <article key={order.id} className="border border-[#f0f0f0] p-4">
            <button
              type="button"
              className="w-full text-left"
              onClick={() => setActive(order)}
            >
              <h3 className="text-lg font-medium">
                {order.drinkName} × {order.quantity}
              </h3>
              <p className="mt-1 text-sm text-ink-soft">{order.nickname}</p>
              <p className="mt-2 text-xs text-ink-mute">
                {STATUS_LABEL[order.status]} ·{" "}
                {new Date(order.createdAt).toLocaleString("zh-CN")}
              </p>
            </button>
            <button
              type="button"
              className="btn-ghost mt-3 px-3 py-1.5 text-xs text-red-700"
              onClick={() => deleteOrder(order.id)}
            >
              删除
            </button>
          </article>
        ))}
      </div>

      {active ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm bg-white p-4">
            {active.drinkImageUrl ? (
              <div className="border-[3px] border-ink bg-[#f7f7f7] p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={active.drinkImageUrl}
                  alt={active.drinkName}
                  className="mx-auto h-44 w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-28 items-center justify-center border-[3px] border-ink bg-sand text-xs text-ink-mute">
                暂无图片
              </div>
            )}
            <h3 className="mt-3 text-lg font-medium">
              {active.drinkName} × {active.quantity}
            </h3>
            <p className="mt-1 text-sm text-ink-soft">{active.nickname}</p>
            <p className="mt-3 text-sm leading-6">
              {active.ingredientSummary || "没有材料简述"}
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" className="btn-ghost flex-1" onClick={() => setActive(null)}>
                关闭
              </button>
              {active.status !== "done" ? (
                <button
                  type="button"
                  className="btn-primary flex-1"
                  onClick={() => router.push(`/admin/orders/${active.id}`)}
                >
                  开始制作
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
