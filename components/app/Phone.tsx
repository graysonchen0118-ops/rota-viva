"use client";

import { useEffect, useRef } from "react";
import { BatteryMedium, Signal, Wifi, WifiOff } from "lucide-react";

export default function Phone({ hora, sinal = true, bateria = 64, notificacao, children, rotulo, abas, tela }: { hora: string; sinal?: boolean; bateria?: number; notificacao?: React.ReactNode; children: React.ReactNode; rotulo: string; abas?: React.ReactNode; tela?: string }) {
  const conteudo = useRef<HTMLDivElement | null>(null);
  // a new screen always opens at the top
  useEffect(() => {
    conteudo.current?.scrollTo({ top: 0 });
  }, [tela]);
  return (
    <div className="phone" aria-label={rotulo}>
      <div className="phone-tela">
        <div className="phone-status">
          <span className="phone-hora">{hora}</span>
          <span className="phone-ilha" aria-hidden="true" />
          <span className="phone-icones">
            {sinal ? <Signal size={13} /> : <Signal size={13} className="apagado" />}
            {sinal ? <Wifi size={13} /> : <WifiOff size={13} className="sem" />}
            <BatteryMedium size={15} />
            <small>{bateria}%</small>
          </span>
        </div>
        {notificacao && <div className="phone-notif">{notificacao}</div>}
        <div className="phone-conteudo" ref={conteudo}>
          {children}
        </div>
        {abas && <nav className="phone-abas">{abas}</nav>}
      </div>
    </div>
  );
}

export function Aba({ ativa, onClick, icone, rotulo, badge }: { ativa: boolean; onClick: () => void; icone: React.ReactNode; rotulo: string; badge?: number }) {
  return (
    <button className={`phone-aba ${ativa ? "ativa" : ""}`} onClick={onClick} aria-current={ativa ? "page" : undefined}>
      <span className="phone-aba-icone">
        {icone}
        {!!badge && <em>{badge}</em>}
      </span>
      {rotulo}
    </button>
  );
}
