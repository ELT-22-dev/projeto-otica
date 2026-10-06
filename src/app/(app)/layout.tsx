import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/visual";
import { t } from "@/i18n";
import { casosDeUso } from "@/infra/container";
import { cerrarSesionAccion } from "./acciones";
import { BarraLateral, NavInferior } from "./Navegacion";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const casos = await casosDeUso();
  const contexto = await casos.obtenerContexto();

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
  const porAvisar = await casos.obtenerPorAvisar();
  // Número vermelho no menu: quantos clientes esperam aviso em cada seção.
  const avisos = { "/pedidos": porAvisar.listos.length, "/renovaciones": porAvisar.renovaciones.length };

  return (
    <div className="min-h-dvh">
      <BarraLateral
        esAdmin={esAdmin}
        optica={contexto.organizacion.nombre}
        usuario={contexto.usuario.nombre}
        avisos={avisos}
      />

      <div className="flex min-h-dvh flex-col md:pl-20 lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <Logo className="size-8 rounded-lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{contexto.organizacion.nombre}</p>
              <p className="truncate text-xs text-muted-foreground">{contexto.usuario.nombre}</p>
            </div>
          </div>
          <form action={cerrarSesionAccion}>
            <Button variant="ghost" size="sm" type="submit" className="text-muted-foreground">
              <LogOut data-icon="inline-start" />
              {t.nav.salir}
            </Button>
          </form>
        </header>
        <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-4 pb-28 md:max-w-none md:px-6 md:py-6 lg:max-w-6xl lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      <NavInferior esAdmin={esAdmin} avisos={avisos} />
    </div>
  );
}
