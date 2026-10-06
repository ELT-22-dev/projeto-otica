"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/i18n";
import { entrarAccion } from "./acciones";

export function FormLogin() {
  const [estado, accion, pendiente] = useActionState(entrarAccion, { error: null });

  return (
    <form action={accion} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t.login.email}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          className="h-12 rounded-xl text-base"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{t.login.password}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 rounded-xl text-base"
        />
      </div>
      {estado.error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {estado.error}
        </p>
      )}
      <Button
        type="submit"
        disabled={pendiente}
        className="bg-marca h-12 rounded-xl border-0 text-base shadow-lg shadow-tema-500/25 hover:brightness-110"
      >
        {pendiente ? t.login.entrando : t.login.entrar}
      </Button>
    </form>
  );
}
