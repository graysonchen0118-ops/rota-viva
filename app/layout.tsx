import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Toasts } from "@/components/ui";

const lexend = Lexend({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Rota Viva | Entregas sob demanda para empresas",
  description: "Empresas pedem a entrega pelo app, motoboys parceiros aceitam pelo deles e a central acompanha cada corrida no mapa, do pedido ao comprovante.",
};

export const viewport: Viewport = {
  themeColor: "#3b5bfd",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={lexend.className}>
        <StoreProvider>
          {children}
          <Toasts />
        </StoreProvider>
      </body>
    </html>
  );
}
