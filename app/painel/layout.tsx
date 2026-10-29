import type { Metadata } from "next";
import Shell from "@/components/painel/Shell";

export const metadata: Metadata = { title: "Painel da central | Rota Viva" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
