"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { GuestNav } from "@/components/guest-nav";
import { DRINK_CATEGORIES, ORDER_SIDEBAR_CATEGORIES } from "@/lib/categories";

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
  hasTea: boolean;
  hasSparkling: boolean;
  salesCount: number;
}

function DrinkTags({ drink }: { drink: MenuDrink }) {
  const tags: string[] = [];
  if (drink.hasDairy) tags.push("含奶");
  if (drink.hasCaffeine) tags.push("含咖啡因");
  if (drink.hasTea) tags.push("含茶");
  if (drink.hasSparkling) tags.push("含气泡");
  if (drink.isNonAlcoholic) tags.push("无酒精");
  if (!tags.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {tags.map((t) => (
        <span key={t} className="tag">
          {t}
        </span>
      ))}
    </div>
  );
}

function DrinkRow({ drink }: { drink: MenuDrink }) {
  return (
    <li
      className={`border-b border-hush-plum/40 px-3 py-3.5 ${
        drink.isAvailable ? "" : "opacity-45 grayscale"
      }`}
    >
      <div className="flex gap-3">
        <div className="relative h-[80px] w-[80px] shrink-0 overflow-hidden border-[2px] border-hush-pink/40 bg-sand">
          {drink.imageUrl ? (
            <Image
              src={drink.imageUrl}
              alt={drink.name}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-ink-mute">
              暂无图
            </div>
          )}
          {!drink.isAvailable ? (
            <span className="absolute left-1 top-1 rounded-sm bg-black/55 px-1.5 py-0.5 text-[9px] text-ink">
              售罄
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-[15px] font-medium leading-snug text-ink">
              {drink.name}
            </h3>
            <span className="shrink-0 text-[10px] text-ink-mute">
              销量 {drink.salesCount}
            </span>
          </div>
          <DrinkTags drink={drink} />
          <div className="mt-1.5 flex items-end gap-2">
            <p className="min-w-0 flex-1 line-clamp-2 text-xs leading-5 text-ink-mute">
              {drink.flavorText || drink.tagline || ""}
            </p>
            {drink.isAvailable ? (
              <Link
                href={`/drinks/${drink.id}`}
                className="shrink-0 rounded-sm bg-hush-pink px-3 py-1.5 text-xs text-[#1a0b22]"
              >
                选规格
              </Link>
            ) : (
              <span className="shrink-0 rounded-sm bg-hush-plum px-3 py-1.5 text-xs text-ink-mute">
                售罄
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export function MenuClient({ drinks }: { drinks: MenuDrink[] }) {
  const sidebarCats = useMemo(() => [...ORDER_SIDEBAR_CATEGORIES], []);
  const sections = useMemo(() => {
    return DRINK_CATEGORIES.map((cat) => ({
      cat,
      items: drinks.filter((d) => (d.category || "经典") === cat),
    })).filter((s) => s.items.length > 0);
  }, [drinks]);

  const [active, setActive] = useState<string>("全部");
  const listRef = useRef<HTMLElement | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const lockRef = useRef(false);

  useEffect(() => {
    const root = listRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (lockRef.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (top?.target) {
          const id = (top.target as HTMLElement).dataset.cat;
          if (id) setActive(id);
        }
      },
      { root, rootMargin: "-10% 0px -70% 0px", threshold: [0.1, 0.35, 0.6] },
    );

    for (const s of sections) {
      const el = sectionRefs.current[s.cat];
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  function jumpTo(cat: string) {
    setActive(cat);
    if (cat === "全部") {
      listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = sectionRefs.current[cat];
    if (!el || !listRef.current) return;
    lockRef.current = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      lockRef.current = false;
    }, 450);
  }

  return (
    <main className="shell !min-h-0 !pb-0 flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden">
      <header className="shrink-0 border-b border-hush-plum px-5 pb-4 pt-6">
        <h1 className="text-xl font-semibold tracking-[0.2em] text-ink">点单</h1>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* 左侧分类：独立滚动 */}
        <aside className="w-[84px] shrink-0 overflow-y-auto overscroll-contain bg-[#1a0f24] pb-24">
          {sidebarCats.map((cat) => {
            const selected = active === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => jumpTo(cat)}
                className={`relative block w-full px-2 py-4 text-center text-xs leading-tight ${
                  selected
                    ? "bg-sand font-semibold text-hush-pink"
                    : "text-ink-mute"
                }`}
              >
                {selected ? (
                  <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 bg-hush-pink" />
                ) : null}
                {cat}
              </button>
            );
          })}
        </aside>

        {/* 右侧饮品：独立滚动 + 分类小标题 */}
        <section
          ref={listRef}
          className="min-w-0 flex-1 overflow-y-auto overscroll-contain pb-28"
        >
          <div data-list-pad className="px-3 pb-1 pt-3 text-[11px] text-ink-mute">
            共 {drinks.length} 款
          </div>

          {sections.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-ink-mute">
              暂无酒品
            </p>
          ) : (
            sections.map(({ cat, items }) => (
              <div
                key={cat}
                data-cat={cat}
                ref={(el) => {
                  sectionRefs.current[cat] = el;
                }}
              >
                <div className="sticky top-0 z-10 bg-[#1e1028]/95 px-3 py-2 backdrop-blur">
                  <h2 className="font-display text-[15px] text-ink">{cat}</h2>
                  <p className="text-[10px] text-ink-mute">{items.length} 款</p>
                </div>
                <ul>
                  {items.map((drink) => (
                    <DrinkRow key={drink.id} drink={drink} />
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>
      </div>

      <GuestNav />
    </main>
  );
}
