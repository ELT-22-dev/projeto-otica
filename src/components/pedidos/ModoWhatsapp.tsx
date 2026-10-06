"use client";

import { createContext, useContext } from "react";

/** true quando o WhatsApp da ótica está conectado por QR: os avisos saem sozinhos, sem abrir o app. */
const ModoWhatsapp = createContext(false);

export function ProveedorModoWhatsapp({ automatico, children }: { automatico: boolean; children: React.ReactNode }) {
  return <ModoWhatsapp value={automatico}>{children}</ModoWhatsapp>;
}

export function useEnvioAutomatico(): boolean {
  return useContext(ModoWhatsapp);
}
