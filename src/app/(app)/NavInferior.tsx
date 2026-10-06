"use client";

import { ClipboardList, Plus, RefreshCcw, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

export function NavInferior({ esAdmin }: { esAdmin: boolean }) {
  const ruta = usePathname();
  const activo = (href: string) =>
    href === "/pedidos" ? ruta.startsWith("/pedidos") && ruta !== "/pedidos/nuevo" : ruta.startsWith(href);

  const items = [
    { href: "/pedidos", etiqueta: t.nav.pedidos, Icono: ClipboardList },
    { href: "/renovaciones", etiqueta: t.nav.renovaciones, Icono: RefreshCcw },
    ...(esAdmin ? [{ href: "/configuracion", etiqueta: t.nav.ajustes, Icono: Settings }] : []),
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-xl items-center justify-around gap-2 px-2 py-2">
        <Link
          href="/pedidos/nuevo"
          className={cn(
            "order-2 flex h-12 items-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground shadow-md transition active:scale-95",
            ruta === "/pedidos/nuevo" && "ring-4 ring-primary/25",
          )}
        >
          <Plus className="size-5" />
          {t.nav.nuevo}
        </Link>
        {items.map(({ href, etiqueta, Icono }, i) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex min-w-16 flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition",
              i === 0 ? "order-1" : "order-3",
              activo(href) && "font-medium text-primary",
            )}
          >
            <Icono className="size-5" />
            {etiqueta}
          </Link>
        ))}
      </div>
    </nav>
  );
}
