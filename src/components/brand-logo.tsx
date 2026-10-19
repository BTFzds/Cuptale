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
      <Image
        src={BRAND_MARK}
        alt={BRAND_NAME}
        width={size}
        height={size}
        className="object-contain"
        priority
      />
      {showWordmark ? (
        <div className="mt-3">
          <p className="font-display text-2xl tracking-wide text-ink">{BRAND_NAME}</p>
          <p className="mt-1 text-xs text-ink-mute">{BRAND_TAGLINE}</p>
        </div>
      ) : null}
    </div>
  );
}
