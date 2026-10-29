import type { Metadata } from "next";
import Operacao from "@/components/Operacao";

export const metadata: Metadata = { title: "Operação ao vivo | Rota Viva" };

export default function Page() {
  return <Operacao />;
}
