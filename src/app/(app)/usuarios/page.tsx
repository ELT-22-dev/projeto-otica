import { UserCog } from "lucide-react";
import type { Metadata } from "next";
import { EncabezadoPagina } from "@/components/gestion";
import { t } from "@/i18n";
import { casosDeUso } from "@/infra/container";
import { soloAdmin } from "../../_lib/solo-admin";
import { GestionUsuarios } from "./GestionUsuarios";

export const metadata: Metadata = { title: t.usuarios.titulo };

export default async function PaginaUsuarios() {
  const casos = await casosDeUso();
  const [usuarios, contexto] = await Promise.all([soloAdmin(casos.listarUsuarios()), casos.obtenerContexto()]);
  if (!usuarios) return <p className="py-12 text-center text-sm text-muted-foreground">{t.ajustes.soloAdmin}</p>;

  return (
    <div className="flex flex-col gap-5 lg:max-w-5xl lg:gap-6">
      <EncabezadoPagina
        icono={UserCog}
        tono="pizarra"
        titulo={t.usuarios.titulo}
        descripcion={t.usuarios.descripcion}
      />
      <GestionUsuarios usuarios={usuarios} miId={contexto?.usuario.id ?? ""} />
    </div>
  );
}
