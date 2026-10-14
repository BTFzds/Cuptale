"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const items = [
  { href: "/admin/orders", label: "订单" },
  { href: "/admin/drinks", label: "酒品" },
  { href: "/admin/recipes", label: "配方" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="mb-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-xl text-ink">息盏后台</p>
          <p className="text-xs text-ink-mute">杯叙 CupTale</p>
        </div>
        <button type="button" className="btn-ghost text-xs" onClick={logout}>
          退出
        </button>
      </div>
      <nav className="flex gap-2">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-2xl px-4 py-2 text-sm ${
                active ? "bg-ink text-sand" : "bg-sand-card text-ink-soft"
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
