"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminListActions } from "@/components/admin-list-actions";
import { MenuShelfControls } from "@/components/shelf-actions";

export type MenuItem = {
  key: string;
  name: string;
  summary: string;
  meta: string;
  isPublished: boolean;
  isAvailable: boolean;
  recipeId?: string;
  drinkId: string | null;
  editHref: string;
  deleteUrl: string;
  confirmText: string;
};

function shortId(item: MenuItem) {
  const id = item.drinkId || item.recipeId || "";
  return id ? id.slice(-8) : "";
}

type Filter = "all" | "on" | "soldout" | "off";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "on", label: "已上架" },
  { id: "off", label: "未上架" },
  { id: "soldout", label: "售罄" },
];

function sortRank(item: MenuItem) {
  if (item.isPublished && item.isAvailable) return 0;
  if (!item.isPublished) return 1;
  return 2;
}

function matchesFilter(item: MenuItem, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "on") return item.isPublished && item.isAvailable;
  if (filter === "soldout") return item.isPublished && !item.isAvailable;
  return !item.isPublished;
}

function cardClass(item: MenuItem) {
  if (!item.isPublished) {
    return "border border-[#3a2a48] bg-[#181022]";
  }
  if (!item.isAvailable) {
    return "border border-zinc-600/60 bg-zinc-800/35 opacity-70 grayscale";
  }
  return "border border-hush-pink/50 bg-[#321a44] shadow-[0_0_18px_rgba(255,110,199,0.12)]";
}

export function AdminMenuList({ items }: { items: MenuItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const sorted = useMemo(
    () => [...items].sort((a, b) => sortRank(a) - sortRank(b)),
    [items],
  );

  const counts = useMemo(() => {
    const on = items.filter((i) => i.isPublished && i.isAvailable).length;
    const soldout = items.filter((i) => i.isPublished && !i.isAvailable).length;
    const off = items.filter((i) => !i.isPublished).length;
    return { all: items.length, on, soldout, off };
  }, [items]);

  const visible = sorted.filter((i) => matchesFilter(i, filter));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          const count = counts[f.id];
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-sm px-3 py-1.5 text-xs transition ${
                active
                  ? "bg-hush-pink text-[#1a0b22]"
                  : "bg-sand text-ink-soft"
              }`}
            >
              {f.label}
              <span className={active ? "ml-1 opacity-70" : "ml-1 text-ink-mute"}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="card-surface px-5 py-8 text-center text-sm text-ink-mute">
          这一类暂时没有饮品
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => (
            <div
              key={item.key}
              className={`flex items-start justify-between gap-3 p-4 ${cardClass(item)}`}
            >
              <div className="min-w-0 flex-1">
                {item.recipeId ? (
                  <Link
                    href={`/admin/recipes/${item.recipeId}`}
                    className="text-lg font-medium"
                  >
                    {item.name}
                  </Link>
                ) : (
                  <h2 className="text-lg font-medium">{item.name}</h2>
                )}
                {shortId(item) ? (
                  <p className="mt-0.5 text-[10px] text-ink-mute">
                    ID {shortId(item)}
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-ink-soft">{item.summary}</p>
                <p className="mt-1 text-xs text-ink-mute">{item.meta}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <MenuShelfControls
                  recipeId={item.recipeId}
                  drinkId={item.drinkId}
                  isPublished={item.isPublished}
                  isAvailable={item.isAvailable}
                />
                <AdminListActions
                  editHref={item.editHref}
                  deleteUrl={item.deleteUrl}
                  confirmText={item.confirmText}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
