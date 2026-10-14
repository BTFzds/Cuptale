"use client";

import { useCallback, useEffect, useState } from "react";
import { ORDER_STATUSES, STATUS_LABEL, type OrderStatus } from "@/lib/constants";

interface AdminOrder {
  id: string;
  nickname: string;
  drinkName: string;
  quantity: number;
  note: string;
  status: OrderStatus;
  createdAt: string;
}

interface SummaryRow {
  drinkId: string;
  name: string;
  quantity: number;
}

export function OrdersBoard() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  async function updateStatus(id: string, status: OrderStatus) {
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) load();
  }

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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-medium">
                  {order.drinkName} × {order.quantity}
                </h3>
                <p className="mt-1 text-sm text-ink-soft">{order.nickname}</p>
                {order.note ? (
                  <p className="mt-2 text-sm text-ink-mute">备注：{order.note}</p>
                ) : null}
                <p className="mt-2 text-xs text-ink-mute">
                  {new Date(order.createdAt).toLocaleString("zh-CN")}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <select
                  className="field w-auto"
                  value={order.status}
                  onChange={(e) =>
                    updateStatus(order.id, e.target.value as OrderStatus)
                  }
                >
                  {ORDER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABEL[status]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-ghost px-3 py-1.5 text-xs text-red-700"
                  onClick={() => deleteOrder(order.id)}
                >
                  删除
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
