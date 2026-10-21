import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { GuestNav } from "@/components/guest-nav";
import { dedupePublishedDrinks } from "@/lib/dedupe-drinks";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const all = await prisma.drink.findMany({
    where: { isPublished: true },
    include: { recipe: { select: { flavorText: true } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  const featured = dedupePublishedDrinks(all).slice(0, 2);

  return (
    <main className="shell">
      <header className="px-6 pb-2 pt-12 text-center">
        <BrandLogo size={112} />
      </header>

      <section className="mt-8 grid grid-cols-2 gap-3 px-5">
        <Link href="/order" className="btn-outline py-4 text-[15px]">
          点单
        </Link>
        <Link href="/my-orders" className="btn-primary py-4 text-[15px]">
          我的订单
        </Link>
      </section>

      <section className="mt-8 px-5">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-[15px] font-semibold">推荐</h2>
          <Link href="/order" className="text-xs text-ink-mute">
            全部
          </Link>
        </div>

        {featured.length === 0 ? (
          <div className="card-surface px-4 py-10 text-center text-sm text-ink-mute">
            暂无酒品
          </div>
        ) : (
          <div className="space-y-3">
            {featured.map((drink) => (
              <Link
                key={drink.id}
                href={`/drinks/${drink.id}`}
                className={`flex gap-3 card-surface p-3 ${
                  drink.isAvailable ? "" : "opacity-45 grayscale"
                }`}
              >
                <div className="relative h-[108px] w-[108px] shrink-0 overflow-hidden bg-transparent">
                  {drink.imageUrl ? (
                    <Image
                      src={drink.imageUrl}
                      alt={drink.name}
                      fill
                      className="object-contain"
                      sizes="108px"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 py-0.5">
                  <p className="truncate text-[15px] font-medium">{drink.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-mute">
                    {drink.flavorText.trim() ||
                      drink.recipe?.flavorText.trim() ||
                      drink.tagline}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <GuestNav />
    </main>
  );
}
