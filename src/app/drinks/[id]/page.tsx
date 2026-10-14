import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuestNav } from "@/components/guest-nav";
import { TasteMeter } from "@/components/taste-meter";
import { OrderSheet } from "./order-sheet";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DrinkDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const drink = await prisma.drink.findFirst({
    where: { id: params.id, isPublished: true },
  });
  if (!drink) notFound();

  const unavailable = !drink.isAvailable;

  return (
    <main className="shell">
      <div className="relative aspect-[4/5] bg-sand">
        {drink.imageUrl ? (
          <Image
            src={drink.imageUrl}
            alt={drink.name}
            fill
            className={`object-cover ${unavailable ? "grayscale" : ""}`}
            sizes="(max-width: 448px) 100vw, 448px"
            priority
          />
        ) : null}
        <Link
          href="/order"
          className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs text-ink"
        >
          ← 菜单
        </Link>
      </div>

      <div className="space-y-5 px-5 py-5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-wide">{drink.name}</h1>
            {unavailable ? (
              <span className="shrink-0 text-xs text-ink-mute">暂停供应</span>
            ) : null}
          </div>
          {drink.tagline ? (
            <p className="mt-1 text-xs text-ink-mute">{drink.tagline}</p>
          ) : null}
          {drink.isNonAlcoholic ? (
            <p className="mt-2">
              <span className="tag">无酒精</span>
            </p>
          ) : null}
          <p className="mt-3 text-sm leading-7 text-ink-soft">
            {drink.flavorText || "暂无介绍"}
          </p>
        </div>

        <div className="space-y-2.5 border border-[#f0f0f0] px-4 py-3">
          <TasteMeter label="甜度" value={drink.sweetness} />
          <TasteMeter label="酸度" value={drink.acidity} />
          <TasteMeter label="烈度" value={drink.strength} />
        </div>

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-sand px-3 py-3">
            <dt className="text-xs text-ink-mute">酒精度约</dt>
            <dd className="mt-1">{drink.abvApprox != null ? `${drink.abvApprox}%` : "未标注"}</dd>
          </div>
          <div className="bg-sand px-3 py-3">
            <dt className="text-xs text-ink-mute">杯型</dt>
            <dd className="mt-1">{drink.glassType}</dd>
          </div>
          <div className="bg-sand px-3 py-3">
            <dt className="text-xs text-ink-mute">含奶</dt>
            <dd className="mt-1">{drink.hasDairy ? "是" : "否"}</dd>
          </div>
          <div className="bg-sand px-3 py-3">
            <dt className="text-xs text-ink-mute">含咖啡因</dt>
            <dd className="mt-1">{drink.hasCaffeine ? "是" : "否"}</dd>
          </div>
        </dl>

        {drink.allergens ? (
          <p className="text-xs text-ink-mute">过敏提示：{drink.allergens}</p>
        ) : null}

        <OrderSheet
          drinkId={drink.id}
          drinkName={drink.name}
          unavailable={unavailable}
        />
      </div>

      <GuestNav />
    </main>
  );
}
