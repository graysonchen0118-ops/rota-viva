import type { Metadata } from "next";
import Relatorios from "@/components/painel/Relatorios";

export const metadata: Metadata = { title: "Relatórios | Rota Viva" };

export default function Page() {
  return <Relatorios />;
}
