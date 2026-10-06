"use client";

import { KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { UsuarioListado } from "@/application";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, TituloSeccion } from "@/components/visual";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { actualizarUsuarioAccion, crearUsuarioAccion, restablecerContrasenaAccion } from "../acciones";

type Rol = UsuarioListado["rol"];

export function GestionUsuarios({ usuarios, miId }: { usuarios: UsuarioListado[]; miId: string }) {
  const [pendiente, iniciar] = useTransition();
  const [nuevo, setNuevo] = useState({ nombre: "", email: "", rol: "atendente" as Rol, contrasena: "" });
  const [claveDe, setClaveDe] = useState<string | null>(null);
  const [clave, setClave] = useState("");

  function ejecutar(accion: () => Promise<{ ok: boolean; error?: string }>, exito: string, despues?: () => void) {
    iniciar(async () => {
      const r = await accion();
      if (r.ok) {
        toast.success(exito);
        despues?.();
      } else toast.error(r.error);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <ul className="flex flex-col divide-y overflow-hidden rounded-2xl border bg-card shadow-xs">
        {usuarios.map((u) => (
          <li key={u.id} className={cn("flex flex-col gap-3 p-4", !u.activo && "bg-muted/40")}>
            <div className="flex items-center gap-3">
              <Avatar nombre={u.nombre} className={cn("size-10", !u.activo && "opacity-50")} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {u.nombre}
                  {u.id === miId && <span className="ml-2 text-xs text-muted-foreground">({t.usuarios.tu})</span>}
                </p>
                <p className="truncate text-sm text-muted-foreground">{u.email}</p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  u.rol === "admin" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700",
                )}
              >
                {t.usuarios.roles[u.rol]}
              </span>
              {!u.activo && (
                <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs text-slate-700">
                  {t.usuarios.inactivo}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {u.id !== miId && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pendiente}
                    onClick={() =>
                      ejecutar(
                        () => actualizarUsuarioAccion({ id: u.id, rol: u.rol === "admin" ? "atendente" : "admin" }),
                        t.usuarios.guardado,
                      )
                    }
                  >
                    <ShieldCheck data-icon="inline-start" />
                    {u.rol === "admin" ? t.usuarios.quitarAdmin : t.usuarios.hacerAdmin}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pendiente}
                    onClick={() =>
                      ejecutar(() => actualizarUsuarioAccion({ id: u.id, activo: !u.activo }), t.usuarios.guardado)
                    }
                  >
                    {u.activo ? t.usuarios.desactivar : t.usuarios.activar}
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={() => setClaveDe(claveDe === u.id ? null : u.id)}>
                <KeyRound data-icon="inline-start" />
                {t.usuarios.cambiarContrasena}
              </Button>
            </div>
            {claveDe === u.id && (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  ejecutar(
                    () => restablecerContrasenaAccion({ id: u.id, contrasena: clave }),
                    t.usuarios.guardado,
                    () => {
                      setClave("");
                      setClaveDe(null);
                    },
                  );
                }}
              >
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder={t.usuarios.nuevaContrasena}
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  className="h-10"
                />
                <Button type="submit" disabled={pendiente || clave.length < 8} className="h-10">
                  {t.app.guardar}
                </Button>
              </form>
            )}
          </li>
        ))}
      </ul>

      <form
        className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs md:p-5"
        onSubmit={(e) => {
          e.preventDefault();
          ejecutar(
            () => crearUsuarioAccion(nuevo),
            t.usuarios.creado,
            () => setNuevo({ nombre: "", email: "", rol: "atendente", contrasena: "" }),
          );
        }}
      >
        <TituloSeccion icono={UserPlus} tono="violeta">
          {t.usuarios.nuevo}
        </TituloSeccion>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="u-nombre">{t.usuarios.nombre}</Label>
          <Input
            id="u-nombre"
            value={nuevo.nombre}
            onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="u-email">{t.usuarios.email}</Label>
          <Input
            id="u-email"
            type="email"
            value={nuevo.email}
            onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })}
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t.usuarios.rol}</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["atendente", "admin"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setNuevo({ ...nuevo, rol: r })}
                aria-pressed={nuevo.rol === r}
                className={cn(
                  "h-10 rounded-xl border text-sm font-medium transition",
                  nuevo.rol === r ? "border-primary bg-primary text-primary-foreground" : "bg-background",
                )}
              >
                {t.usuarios.roles[r]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="u-clave">{t.usuarios.contrasena}</Label>
          <Input
            id="u-clave"
            type="password"
            autoComplete="new-password"
            value={nuevo.contrasena}
            onChange={(e) => setNuevo({ ...nuevo, contrasena: e.target.value })}
            className="h-11"
          />
        </div>
        <Button type="submit" disabled={pendiente} className="bg-marca h-11 border-0 text-white hover:brightness-110">
          {t.usuarios.crear}
        </Button>
      </form>
    </div>
  );
}
