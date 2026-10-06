import Link from "next/link";
import { t } from "@/i18n";

export default function NoEncontrado() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-muted-foreground">{t.app.noEncontrado}</p>
      <Link href="/pedidos" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        {t.app.irAPedidos}
      </Link>
    </main>
  );
}
