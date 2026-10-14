export function TasteMeter({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const level = Math.min(5, Math.max(1, value));
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-ink-mute">{label}</span>
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`h-2 w-5 rounded-full ${
              i < level ? "bg-clay" : "bg-sand-deep"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
