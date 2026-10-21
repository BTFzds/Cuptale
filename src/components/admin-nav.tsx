"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND_NAME } from "@/lib/brand";

const items = [
  { href: "/admin/orders", label: "订单", match: (p: string) => p.startsWith("/admin/orders") },
  {
    href: "/admin/recipes",
    label: "菜单",
    match: (p: string) =>
      p.startsWith("/admin/recipes") || p.startsWith("/admin/drinks"),
  },
  {
    href: "/admin/info",
    label: "信息管理",
    match: (p: string) => p.startsWith("/admin/info"),
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="mb-6 space-y-4">
      <div>
        <p className="text-xl font-semibold tracking-[0.2em] text-ink">
          {BRAND_NAME} · 后台
        </p>
      </div>
      <nav className="flex gap-2">
        {items.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-sm px-4 py-2 text-sm transition ${
                active
                  ? "bg-hush-pink text-[#1a0b22] shadow-hush"
                  : "bg-sand text-ink-soft"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
