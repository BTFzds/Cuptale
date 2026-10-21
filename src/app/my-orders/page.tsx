"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GuestNav } from "@/components/guest-nav";
import { STATUS_LABEL, type OrderStatus } from "@/lib/constants";
import {
  getGuestDisplayName,
  getOrCreateGuestId,
  setGuestDisplayName,
} from "@/lib/guest-profile";
import { getStoredOrderTokens } from "@/lib/order-tokens";

interface MyOrder {
  id: string;
  nickname: string;
  drinkId: string;
  drinkName: string;
  drinkImageUrl: string | null;
  quantity: number;
  note: string;
  status: OrderStatus;
  createdAt: string;
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [idSaved, setIdSaved] = useState(false);

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
    getOrCreateGuestId();
    setNameDraft(getGuestDisplayName());
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);

  const orderedDrinks = useMemo(() => {
    const map = new Map<
      string,
      { drinkId: string; drinkName: string; drinkImageUrl: string | null; count: number }
    >();
    for (const order of orders) {
      const prev = map.get(order.drinkId);
      map.set(order.drinkId, {
        drinkId: order.drinkId,
        drinkName: order.drinkName,
        drinkImageUrl: order.drinkImageUrl,
        count: (prev?.count || 0) + order.quantity,
      });
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [orders]);

  function saveName() {
    setGuestDisplayName(nameDraft);
    setIdSaved(true);
    window.setTimeout(() => setIdSaved(false), 1500);
  }

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

      <section className="mt-5 px-5">
        <h2 className="mb-3 text-[15px] font-semibold">ID</h2>
        <div className="flex gap-2">
          <input
            className="field"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
          />
          <button type="button" className="btn-ghost shrink-0" onClick={saveName}>
            保存
          </button>
        </div>
        {idSaved ? (
          <p className="mt-2 text-xs text-ink-soft">保存成功</p>
        ) : null}
      </section>

      <section className="mt-6 px-5">
        <h2 className="mb-3 text-[15px] font-semibold">我点过的</h2>
        {orderedDrinks.length === 0 ? (
          <p className="card-surface px-4 py-8 text-center text-sm text-ink-mute">
            还没有点过
          </p>
        ) : (
          <ul className="divide-y divide-hush-plum/60 card-surface">
            {orderedDrinks.map((item) => (
              <li key={item.drinkId}>
                <Link
                  href={`/drinks/${item.drinkId}`}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden bg-transparent">
                    {item.drinkImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.drinkImageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.drinkName}</p>
                    <p className="text-xs text-ink-mute">{item.count} 杯</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 px-5 pb-4">
        <h2 className="mb-3 text-[15px] font-semibold">订单</h2>
        {loading ? (
          <p className="py-8 text-center text-sm text-ink-mute">加载中…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : orders.length === 0 ? (
          <div className="card-surface px-4 py-10 text-center">
            <p className="text-sm text-ink-mute">暂无订单</p>
            <Link href="/order" className="btn-primary mt-4 inline-flex">
              去点单
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-hush-plum/60 card-surface">
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
