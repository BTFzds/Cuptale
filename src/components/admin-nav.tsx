"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin/orders", label: "订单" },
  { href: "/admin/recipes", label: "未上架" },
  { href: "/admin/drinks", label: "已上架" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="mb-6 space-y-4">
      <div>
        <p className="text-xl font-semibold tracking-wide text-ink">后台</p>
      </div>
      <nav className="flex gap-2">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-sm px-4 py-2 text-sm ${
                active ? "bg-ink text-white" : "bg-[#f5f5f5] text-ink-soft"
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
