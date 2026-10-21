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
    include: { recipe: { select: { flavorText: true } } },
  });
  if (!drink) notFound();

  const unavailable = !drink.isAvailable;

  return (
    <main className="shell">
      <div className="relative aspect-square border-b-[3px] border-hush-pink/40 bg-sand">
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
          className="absolute left-4 top-4 rounded-full bg-[#1a0f24]/85 px-3 py-1.5 text-xs text-ink backdrop-blur"
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
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              drink.hasDairy && "含奶",
              drink.hasCaffeine && "含咖啡因",
              drink.hasTea && "含茶",
              drink.hasSparkling && "含气泡",
              drink.isNonAlcoholic && "无酒精",
            ]
              .filter(Boolean)
              .map((t) => (
                <span key={String(t)} className="tag">
                  {t}
                </span>
              ))}
          </div>
          <p className="mt-3 text-sm leading-7 text-ink-soft">
            {drink.flavorText.trim() ||
              drink.recipe?.flavorText.trim() ||
              "暂无介绍"}
          </p>
        </div>

        <div className="space-y-2.5 card-surface px-4 py-3">
          <TasteMeter label="甜度" value={drink.sweetness} />
          <TasteMeter label="酸度" value={drink.acidity} />
          <TasteMeter label="烈度" value={drink.strength} />
        </div>

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
