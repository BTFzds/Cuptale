"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
      <header className="flex items-center justify-between px-5 pb-2 pt-8">
        <h1 className="text-2xl font-semibold">我的</h1>
        <button
          type="button"
          className="text-xs text-ink-mute"
          onClick={() => {
            setLoading(true);
            load();
          }}
        >
          刷新
        </button>
      </header>

      <section className="mt-6 px-5">
        <h2 className="mb-3 text-[15px] font-semibold">订单</h2>

        {loading ? (
          <p className="py-8 text-center text-sm text-ink-mute">加载中…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : orders.length === 0 ? (
          <div className="border border-[#f0f0f0] px-4 py-10 text-center">
            <p className="text-sm text-ink-mute">暂无订单</p>
            <Link href="/order" className="btn-primary mt-4 inline-flex">
              去点单
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#f0f0f0] border border-[#f0f0f0]">
            {orders.map((order) => (
              <article key={order.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-medium">
                      {order.drinkName} × {order.quantity}
                    </h3>
                    <p className="mt-1 text-xs text-ink-mute">{order.nickname}</p>
                  </div>
                  <span className="text-xs font-medium text-ink">
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                </div>
                {order.note ? (
                  <p className="mt-2 text-xs text-ink-soft">备注：{order.note}</p>
                ) : null}
                <p className="mt-2 text-[11px] text-ink-mute">
                  {new Date(order.createdAt).toLocaleString("zh-CN")}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <GuestNav />
    </main>
  );
}
