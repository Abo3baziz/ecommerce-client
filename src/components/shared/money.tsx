const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function Money({
  value,
  className,
}: {
  value: string | null | undefined;
  className?: string;
}) {
  if (!value) {
    return <span className={className}>—</span>;
  }
  const parsed = Number(value);
  const rendered = Number.isFinite(parsed)
    ? formatter.format(parsed)
    : value;
  return (
    <span className={`tabular-nums ${className ?? ""}`}>{rendered}</span>
  );
}
