import type { Metadata } from "next";
import Empresas from "@/components/painel/Empresas";

export const metadata: Metadata = { title: "Empresas | Rota Viva" };

export default function Page() {
  return <Empresas />;
}
