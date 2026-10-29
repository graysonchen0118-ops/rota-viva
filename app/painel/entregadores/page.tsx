import type { Metadata } from "next";
import Entregadores from "@/components/painel/Entregadores";

export const metadata: Metadata = { title: "Entregadores | Rota Viva" };

export default function Page() {
  return <Entregadores />;
}
