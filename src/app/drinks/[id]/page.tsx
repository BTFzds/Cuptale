import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuestNav } from "@/components/guest-nav";
import { TasteMeter } from "@/components/taste-meter";
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
      <Link href="/" className="text-sm text-ink-mute">
        ← 返回菜单
      </Link>

      <div className="card-surface mt-4 overflow-hidden">
        <div className="relative aspect-[4/5] bg-sand-deep">
          {drink.imageUrl ? (
            <Image
              src={drink.imageUrl}
              alt={drink.name}
              fill
              className={`object-cover ${unavailable ? "grayscale" : ""}`}
              sizes="(max-width: 448px) 100vw, 448px"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-ink-mute">
              暂无图片
            </div>
          )}
        </div>

        <div className="space-y-5 p-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="font-display text-2xl text-ink">{drink.name}</h1>
              {unavailable ? (
                <span className="shrink-0 rounded-full bg-ink/10 px-3 py-1 text-xs text-ink-soft">
                  暂停供应
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-7 text-ink-soft">
              {drink.flavorText || "一杯安静的故事，正为你准备。"}
            </p>
          </div>

          <div className="space-y-2.5 rounded-2xl bg-sand/80 p-4">
            <TasteMeter label="甜度" value={drink.sweetness} />
            <TasteMeter label="酸度" value={drink.acidity} />
            <TasteMeter label="烈度" value={drink.strength} />
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white/60 px-3 py-3">
              <dt className="text-ink-mute">酒精度约</dt>
              <dd className="mt-1 text-ink">
                {drink.abvApprox != null ? `${drink.abvApprox}%` : "未标注"}
              </dd>
            </div>
            <div className="rounded-2xl bg-white/60 px-3 py-3">
              <dt className="text-ink-mute">杯型</dt>
              <dd className="mt-1 text-ink">{drink.glassType}</dd>
            </div>
            <div className="rounded-2xl bg-white/60 px-3 py-3">
              <dt className="text-ink-mute">含奶</dt>
              <dd className="mt-1 text-ink">{drink.hasDairy ? "是" : "否"}</dd>
            </div>
            <div className="rounded-2xl bg-white/60 px-3 py-3">
              <dt className="text-ink-mute">含咖啡因</dt>
              <dd className="mt-1 text-ink">{drink.hasCaffeine ? "是" : "否"}</dd>
            </div>
          </dl>

          {drink.allergens ? (
            <p className="text-xs leading-relaxed text-ink-mute">
              过敏提示：{drink.allergens}
            </p>
          ) : null}

          {unavailable ? (
            <button className="btn-primary w-full" disabled>
              暂时无法点单
            </button>
          ) : (
            <Link
              href={`/order?drinkId=${drink.id}`}
              className="btn-primary w-full"
            >
              点一杯这个
            </Link>
          )}
        </div>
      </div>

      <GuestNav />
    </main>
  );
}
