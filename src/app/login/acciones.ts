"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { t } from "@/i18n";
import { iniciarSesion } from "@/infra/auth";

const esquema = z.object({
  email: z.email().max(200),
  password: z.string().min(1).max(200),
});

export async function entrarAccion(
  _previo: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const datos = esquema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!datos.success || !(await iniciarSesion(datos.data.email, datos.data.password))) {
    return { error: t.login.error };
  }
  redirect("/pedidos");
}
