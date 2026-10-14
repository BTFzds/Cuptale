"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { GuestNav } from "@/components/guest-nav";
import { ORDER_SIDEBAR_CATEGORIES } from "@/lib/categories";

export interface MenuDrink {
  id: string;
  name: string;
  imageUrl: string | null;
  flavorText: string;
  category: string;
  tagline: string;
  isAvailable: boolean;
  isNonAlcoholic: boolean;
  hasDairy: boolean;
  hasCaffeine: boolean;
  glassType: string;
  abvApprox: number | null;
}

export function MenuClient({ drinks }: { drinks: MenuDrink[] }) {
  const categories = useMemo(() => [...ORDER_SIDEBAR_CATEGORIES], []);
  const [active, setActive] = useState("全部");

  const filtered =
    active === "全部"
      ? drinks
      : drinks.filter((d) => (d.category || "经典") === active);

  return (
    <main className="shell !pb-0">
      <header className="border-b border-[#f0f0f0] bg-ink px-5 pb-5 pt-6 text-white">
        <h1 className="text-xl font-semibold tracking-wide">点单</h1>
      </header>

      <div className="flex min-h-[calc(100vh-9.5rem)]">
        <aside className="w-[88px] shrink-0 bg-[#f7f7f7]">
          {categories.map((cat) => {
            const selected = cat === active;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActive(cat)}
                className={`relative block w-full px-2 py-4 text-center text-xs leading-tight ${
                  selected
                    ? "bg-white font-semibold text-ink"
                    : "text-ink-soft"
                }`}
              >
                {selected ? (
                  <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 bg-ink" />
                ) : null}
                {cat}
              </button>
            );
          })}
        </aside>

        <section className="flex-1 overflow-y-auto pb-28">
          <div className="flex items-center justify-between px-4 pb-2 pt-4">
            <h2 className="font-display text-lg text-ink">{active}</h2>
            <span className="text-[11px] text-ink-mute">{filtered.length} 款</span>
          </div>

          {filtered.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-ink-mute">
              这一类暂时没有酒品
            </p>
          ) : (
            <ul>
              {filtered.map((drink) => (
                <li
                  key={drink.id}
                  className={`border-b border-[#f5f5f5] px-4 py-4 ${
                    drink.isAvailable ? "" : "opacity-45 grayscale"
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden bg-sand">
                      {drink.imageUrl ? (
                        <Image
                          src={drink.imageUrl}
                          alt={drink.name}
                          fill
                          className="object-cover"
                          sizes="88px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-ink-mute">
                          暂无图
                        </div>
                      )}
                      {!drink.isAvailable ? (
                        <span className="absolute left-1 top-1 rounded-sm bg-black/55 px-1.5 py-0.5 text-[9px] text-white">
                          暂停
                        </span>
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] font-medium leading-snug">
                        {drink.name}
                      </h3>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {drink.isNonAlcoholic ? (
                          <span className="tag">无酒精</span>
                        ) : null}
                        {drink.hasCaffeine ? (
                          <span className="tag">含咖啡因</span>
                        ) : null}
                        {drink.hasDairy ? <span className="tag">含奶</span> : null}
                        {drink.glassType ? (
                          <span className="tag">{drink.glassType}</span>
                        ) : null}
                        {!drink.isNonAlcoholic && drink.abvApprox != null ? (
                          <span className="tag">约 {drink.abvApprox}%</span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-ink-mute">
                        {drink.flavorText || drink.tagline || ""}
                      </p>
                      <div className="mt-3 flex items-center justify-end">
                        {drink.isAvailable ? (
                          <Link
                            href={`/drinks/${drink.id}`}
                            className="rounded-sm bg-ink px-3 py-1.5 text-xs text-white"
                          >
                            选规格
                          </Link>
                        ) : (
                          <span className="rounded-sm bg-[#ddd] px-3 py-1.5 text-xs text-white">
                            暂停供应
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <GuestNav />
    </main>
  );
}
