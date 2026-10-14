import Image from "next/image";

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
        src="/brand/offsip-mark.png"
        alt="息盏"
        width={size}
        height={size}
        className="object-contain"
        priority
      />
      {showWordmark ? (
        <div className="mt-3">
          <p className="font-display text-2xl tracking-wide text-ink">息盏</p>
        </div>
      ) : null}
    </div>
  );
}
