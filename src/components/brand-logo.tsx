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
        src="/brand/offsip-logo.jpg"
        alt="息盏 OffSip"
        width={size}
        height={size}
        className="rounded-full object-cover"
        priority
      />
      {showWordmark ? (
        <div className="mt-3">
          <p className="font-display text-2xl tracking-wide text-ink">息盏</p>
          <p className="mt-0.5 text-xs tracking-[0.35em] text-ink-mute">OFFSIP</p>
        </div>
      ) : null}
    </div>
  );
}
