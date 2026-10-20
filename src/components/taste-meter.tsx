export function TasteMeter({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-ink-soft">
      <span className="w-8 shrink-0">{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-5 ${
              i < value ? "bg-hush-pink" : "bg-hush-plum/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
