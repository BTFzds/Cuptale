"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "菜单" },
  { href: "/order", label: "点单" },
  { href: "/my-orders", label: "我的" },
];

export function GuestNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-sand-deep/80 bg-sand/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2.5">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-2xl px-5 py-2 text-sm transition ${
                active ? "bg-ink text-sand" : "text-ink-soft"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
