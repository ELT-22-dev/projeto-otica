"use client";

import { Button } from "@/components/ui/button";
import { t } from "@/i18n";

export default function ErrorApp({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-muted-foreground">{t.app.errorGenerico}</p>
      <Button variant="outline" onClick={reset}>
        {t.app.volver}
      </Button>
    </div>
  );
}
