import { BrandLogo } from "@/components/brand-logo";
import { DrinkCard } from "@/components/drink-card";
import { GuestNav } from "@/components/guest-nav";
import { toPublicDrink } from "@/lib/dto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const drinks = await prisma.drink.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <main className="shell">
      <header className="mb-8">
        <BrandLogo />
        <p className="mt-4 text-center text-sm leading-relaxed text-ink-soft">
          杯叙 CupTale · 深夜居家调酒
          <br />
          选一杯，慢慢等就好
        </p>
      </header>

      <section className="space-y-4">
        {drinks.length === 0 ? (
          <div className="card-surface px-5 py-10 text-center text-sm text-ink-mute">
            菜单准备中，稍后再来看看。
          </div>
        ) : (
          drinks.map((drink, index) => (
            <DrinkCard key={drink.id} drink={toPublicDrink(drink)} index={index} />
          ))
        )}
      </section>

      <GuestNav />
    </main>
  );
}
