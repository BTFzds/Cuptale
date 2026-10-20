import Image from "next/image";
import { BRAND_MARK, BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

export function BrandLogo({
  size = 88,
  showWordmark = true,
}: {
  size?: number;
  showWordmark?: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div
        className="overflow-hidden rounded-sm shadow-hush"
        style={{ width: size, height: size }}
      >
        <Image
          src={BRAND_MARK}
          alt={BRAND_NAME}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          priority
        />
      </div>
      {showWordmark ? (
        <div className="mt-4">
          <p className="font-display text-3xl tracking-[0.35em] text-ink">
            {BRAND_NAME}
          </p>
          <p className="mt-2 text-xs tracking-widest text-ink-mute">
            {BRAND_TAGLINE}
          </p>
        </div>
      ) : null}
    </div>
  );
}
