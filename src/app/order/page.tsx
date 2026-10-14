import { Suspense } from "react";
import { GuestNav } from "@/components/guest-nav";
import { OrderClient } from "./order-client";

export default function OrderPage() {
  return (
    <Suspense
      fallback={
        <main className="shell">
          <p className="text-sm text-ink-mute">加载点单页…</p>
          <GuestNav />
        </main>
      }
    >
      <OrderClient />
    </Suspense>
  );
}
