export default function Cargando() {
  return (
    <div className="flex flex-col gap-3" aria-busy>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
