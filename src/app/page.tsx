import { redirect } from "next/navigation";
import { RUTA_INICIAL } from "@/lib/modulos";

export default function Inicio() {
  redirect(RUTA_INICIAL);
}
