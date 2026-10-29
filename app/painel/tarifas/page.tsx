import type { Metadata } from "next";
import Tarifas from "@/components/painel/Tarifas";

export const metadata: Metadata = { title: "Tarifas | Rota Viva" };

export default function Page() {
  return <Tarifas />;
}
