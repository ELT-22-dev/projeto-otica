import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { Toaster } from "@/components/ui/sonner";
import { COOKIE_TEMA, esTema, TEMA_POR_DEFECTO } from "@/lib/temas";
import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Pedidos", template: "%s · Pedidos" },
  description: "Gestión de pedidos de la óptica",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7c3aed",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Tema no servidor: a página já chega com a cor certa, sem piscar.
  const guardado = (await cookies()).get(COOKIE_TEMA)?.value;
  const tema = esTema(guardado) ? guardado : TEMA_POR_DEFECTO;
  return (
    <html lang="es" data-tema={tema} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
