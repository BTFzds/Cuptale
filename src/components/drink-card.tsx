"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export interface PublicDrinkCard {
  id: string;
  name: string;
  imageUrl: string | null;
  flavorText: string;
  isAvailable: boolean;
}

export function DrinkCard({ drink, index = 0 }: { drink: PublicDrinkCard; index?: number }) {
  const unavailable = !drink.isAvailable;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
    >
      <Link
        href={`/drinks/${drink.id}`}
        className={`card-surface block overflow-hidden transition ${
          unavailable ? "opacity-55 grayscale" : "hover:-translate-y-0.5"
        }`}
      >
        <div className="relative aspect-[4/3] bg-sand-deep">
          {drink.imageUrl ? (
            <Image
              src={drink.imageUrl}
              alt={drink.name}
              fill
              className="object-cover"
              sizes="(max-width: 448px) 100vw, 448px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-ink-mute">
              暂无图片
            </div>
          )}
          {unavailable ? (
            <span className="absolute right-3 top-3 rounded-full bg-ink/70 px-3 py-1 text-xs text-sand">
              暂停供应
            </span>
          ) : null}
        </div>
        <div className="space-y-2 p-4">
          <h2 className="font-display text-lg text-ink">{drink.name}</h2>
          <p className="line-clamp-2 text-sm leading-relaxed text-ink-soft">
            {drink.flavorText || "静候一杯故事。"}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
