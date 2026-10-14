"use client";

import { useCallback, useEffect, useState } from "react";
import { GuestNav } from "@/components/guest-nav";
import { STATUS_LABEL, type OrderStatus } from "@/lib/constants";
import { getStoredOrderTokens } from "@/lib/order-tokens";

interface MyOrder {
  id: string;
  nickname: string;
  drinkName: string;
  quantity: number;
  note: string;
  status: OrderStatus;
  createdAt: string;
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const tokens = getStoredOrderTokens();
    if (tokens.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/orders/mine?tokens=${tokens.join(",")}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setOrders(data.orders || []);
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

  return (
    <main className="shell">
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">我的订单</h1>
          <p className="mt-1 text-sm text-ink-soft">仅显示本机下过的单</p>
        </div>
        <button className="btn-ghost" onClick={() => { setLoading(true); load(); }}>
          刷新
        </button>
      </header>

      {loading ? (
        <p className="text-sm text-ink-mute">加载中…</p>
      ) : error ? (
        <p className="text-sm text-red-700/80">{error}</p>
      ) : orders.length === 0 ? (
        <div className="card-surface px-5 py-10 text-center text-sm text-ink-mute">
          还没有订单。去菜单挑一杯吧。
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <article key={order.id} className="card-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg text-ink">
                    {order.drinkName} × {order.quantity}
                  </h2>
                  <p className="mt-1 text-sm text-ink-soft">{order.nickname}</p>
                </div>
                <span className="rounded-full bg-sand px-3 py-1 text-xs text-ink-soft">
                  {STATUS_LABEL[order.status] || order.status}
                </span>
              </div>
              {order.note ? (
                <p className="mt-3 text-sm text-ink-mute">备注：{order.note}</p>
              ) : null}
              <p className="mt-2 text-xs text-ink-mute">
                {new Date(order.createdAt).toLocaleString("zh-CN")}
              </p>
            </article>
          ))}
        </div>
      )}

      <GuestNav />
    </main>
  );
}
