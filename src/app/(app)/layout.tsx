import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { casosDeUso } from "@/infra/container";
import { cerrarSesionAccion } from "./acciones";
import { NavInferior } from "./NavInferior";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const contexto = await (await casosDeUso()).obtenerContexto();

  // Cookie válido, mas o usuário foi desativado ou removido.
  if (!contexto) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-muted-foreground">{t.errores.no_autorizado}</p>
        <form action={cerrarSesionAccion}>
          <Button variant="outline" type="submit">
            {t.nav.salir}
          </Button>
        </form>
      </main>
    );
  }

  const esAdmin = contexto.usuario.rol === "admin";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{contexto.organizacion.nombre}</p>
          <p className="truncate text-xs text-muted-foreground">{contexto.usuario.nombre}</p>
        </div>
        <form action={cerrarSesionAccion}>
          <Button variant="ghost" size="sm" type="submit" className="text-muted-foreground">
            <LogOut data-icon="inline-start" />
            {t.nav.salir}
          </Button>
        </form>
      </header>
      <main className="flex-1 px-4 pt-4 pb-28">{children}</main>
      <NavInferior esAdmin={esAdmin} />
    </div>
  );
}
