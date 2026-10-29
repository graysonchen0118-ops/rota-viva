import type { Metadata } from "next";
import Corridas from "@/components/painel/Corridas";

export const metadata: Metadata = { title: "Corridas | Rota Viva" };

export default function Page() {
  return <Corridas />;
}
