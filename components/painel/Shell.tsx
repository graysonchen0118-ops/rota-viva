"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { BarChart3, Bike, Building2, ChevronDown, ChevronUp, LayoutDashboard, ListOrdered, Menu, Radio, Receipt, WifiOff, X } from "lucide-react";
import { Marca } from "../Topo";
import Cidade from "../three/Cidade";
import { useStore, sinalDe } from "@/lib/store";
import { hhmm, nomeCurto } from "@/lib/format";
import type { No } from "@/lib/types";

interface Sel {
  foco: string | null;
  setFoco: (id: string | null) => void;
  corridaFoco: string | null;
  setCorridaFoco: (id: string | null) => void;
  comparar: { a: No; b: No } | null;
  setComparar: (p: { a: No; b: No } | null) => void;
}
const SelCtx = createContext<Sel | null>(null);
export const useSel = () => useContext(SelCtx)!;

const NAV = [
  { href: "/painel", rot: "Visão geral", icone: LayoutDashboard },
  { href: "/painel/corridas", rot: "Corridas", icone: ListOrdered },
  { href: "/painel/entregadores", rot: "Entregadores", icone: Bike },
  { href: "/painel/empresas", rot: "Empresas", icone: Building2 },
  { href: "/painel/tarifas", rot: "Tarifas", icone: Receipt },
  { href: "/painel/relatorios", rot: "Relatórios", icone: BarChart3 },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const st = useStore();
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const [foco, setFoco] = useState<string | null>(null);
  const [corridaFoco, setCorridaFoco] = useState<string | null>(null);
  const [comparar, setComparar] = useState<{ a: No; b: No } | null>(null);
  const [mapaAberto, setMapaAberto] = useState(true);
  useEffect(() => {
    setMenu(false);
    setFoco(null);
    setCorridaFoco(null);
    setComparar(null);
  }, [path]);
  const pendentes = st.entregadores.filter((e) => e.status === "pendente").length;
  const semSinal = st.entregadores.filter((e) => sinalDe(e, st.agora).tipo === "sem");
  const aguardando = st.corridas.filter((c) => c.status === "aguardando").length;
  const visao = path === "/painel";
  const ativo = (h: string) => (h === "/painel" ? path === "/painel" : path.startsWith(h));

  return (
    <SelCtx.Provider value={{ foco, setFoco, corridaFoco, setCorridaFoco, comparar, setComparar }}>
      <div className="painel">
        <button className={`scrim ${menu ? "show" : ""}`} aria-label="Fechar menu" onClick={() => setMenu(false)} />
        <aside className={`lateral ${menu ? "open" : ""}`}>
          <div className="lateral-topo">
            <Marca />
            <button className="icon-btn lateral-fechar" aria-label="Fechar menu" onClick={() => setMenu(false)}>
              <X size={18} />
            </button>
          </div>
          <span className="lateral-sobre">Central de operação</span>
          <nav aria-label="Painel">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={`lateral-link ${ativo(n.href) ? "ativo" : ""}`}>
                <n.icone size={18} />
                <span>{n.rot}</span>
                {n.href === "/painel/entregadores" && pendentes > 0 && <em className="lateral-badge">{pendentes}</em>}
                {n.href === "/painel/corridas" && aguardando > 0 && <em className="lateral-badge alerta">{aguardando}</em>}
              </Link>
            ))}
          </nav>
          <Link href="/operacao" className="lateral-ao-vivo">
            <Radio size={16} /> Abrir a operação ao vivo
          </Link>
          <div className="lateral-usuario">
            <span className="lateral-av">
              <Radio size={16} />
            </span>
            <div>
              <strong>Turno do almoço</strong>
              <span>Central · {hhmm(st.agora)}</span>
            </div>
          </div>
        </aside>

        <div className="painel-main main">
          <header className="painel-topo">
            <button className="icon-btn painel-menu" aria-label="Abrir menu" onClick={() => setMenu(true)}>
              <Menu size={20} />
            </button>
            <div className="painel-topo-txt">
              <strong>{NAV.find((n) => ativo(n.href))?.rot ?? "Painel"}</strong>
              <span>
                Quinta-feira, 29 de outubro · <b>{hhmm(st.agora)}</b>
              </span>
            </div>
            {semSinal.length > 0 && (
              <button className="topo-alerta" onClick={() => setFoco(semSinal[0].id)}>
                <WifiOff size={15} /> {semSinal.length === 1 ? `${nomeCurto(semSinal[0].nome)} sem sinal` : `${semSinal.length} motos sem sinal`}
              </button>
            )}
            <label className="auto-dist">
              <span>Distribuição automática</span>
              <button className={`toggle ${st.autoDistribuir ? "on" : ""}`} onClick={st.alternarAuto} aria-pressed={st.autoDistribuir} aria-label="Distribuição automática">
                <span />
              </button>
            </label>
          </header>

          <section className={`painel-mapa ${visao ? "grande" : ""} ${mapaAberto ? "" : "fechado"}`} aria-label="Mapa da cidade">
            {mapaAberto && <Cidade modo="mapa" foco={foco} corridaFoco={corridaFoco} comparar={comparar} distancia={visao ? 24 : comparar ? 15 : 27} className="painel-mapa-canvas" />}
            <button className="painel-mapa-toggle" onClick={() => setMapaAberto((v) => !v)}>
              {mapaAberto ? <ChevronUp size={15} /> : <ChevronDown size={15} />} {mapaAberto ? "Recolher mapa" : "Mostrar mapa"}
            </button>
            {foco && mapaAberto && (
              <button className="mapa-foco" onClick={() => setFoco(null)}>
                Seguindo {nomeCurto(st.entregadores.find((e) => e.id === foco)?.nome ?? "")} · ver a cidade toda
              </button>
            )}
          </section>

          <div className="painel-conteudo">{children}</div>
        </div>
      </div>
    </SelCtx.Provider>
  );
}
