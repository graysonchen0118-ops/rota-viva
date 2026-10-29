"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bike, LayoutDashboard, Menu, Radio, X } from "lucide-react";

export function Marca({ claro }: { claro?: boolean }) {
  return (
    <Link href="/" className={`marca ${claro ? "marca-clara" : ""}`} aria-label="Rota Viva, início">
      <span className="marca-icone">
        <Bike size={18} strokeWidth={2.4} />
      </span>
      <span>
        Rota<b>Viva</b>
      </span>
    </Link>
  );
}

const LINKS = [
  { href: "/", rotulo: "Início", icone: null },
  { href: "/operacao", rotulo: "Operação ao vivo", icone: Radio },
  { href: "/painel", rotulo: "Painel da central", icone: LayoutDashboard },
];

export default function Topo() {
  const path = usePathname();
  const [rolou, setRolou] = useState(false);
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    const f = () => setRolou(window.scrollY > 24);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  useEffect(() => setAberto(false), [path]);
  const ativo = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  return (
    <header className={`topo ${rolou || path !== "/" ? "rolou" : ""}`}>
      <Marca />
      <nav className="topo-nav" aria-label="Principal">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`topo-link ${ativo(l.href) ? "ativo" : ""}`}>
            {l.icone && <l.icone size={16} />}
            {l.rotulo}
          </Link>
        ))}
      </nav>
      <Link href="/operacao" className="btn btn-primario topo-cta">
        Pedir uma entrega de teste
      </Link>
      <button className="icon-btn topo-menu" aria-label={aberto ? "Fechar menu" : "Abrir menu"} onClick={() => setAberto((v) => !v)}>
        {aberto ? <X size={20} /> : <Menu size={20} />}
      </button>
      <div className={`topo-gaveta ${aberto ? "open" : ""}`}>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`topo-link ${ativo(l.href) ? "ativo" : ""}`}>
            {l.icone && <l.icone size={16} />}
            {l.rotulo}
          </Link>
        ))}
        <Link href="/operacao" className="btn btn-primario">
          Pedir uma entrega de teste
        </Link>
      </div>
    </header>
  );
}
