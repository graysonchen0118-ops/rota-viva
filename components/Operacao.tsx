"use client";

import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Eye, EyeOff, Info, Map as MapaIcone, Pause, Play, Radio, Smartphone, TriangleAlert, Wifi, WifiOff } from "lucide-react";
import Topo from "./Topo";
import Cidade from "./three/Cidade";
import AppEmpresa from "./app/AppEmpresa";
import AppEntregador from "./app/AppEntregador";
import { useStore, sinalDe, ativa } from "@/lib/store";
import { ENTREGADOR_SIMULADOR } from "@/lib/mock/entregadores";
import { ha, hhmm, hhmmss, nomeCurto } from "@/lib/format";

export default function Operacao() {
  const st = useStore();
  const diego = st.entregadores.find((e) => e.id === ENTREGADOR_SIMULADOR)!;
  const [verReal, setVerReal] = useState(true);
  const [foco, setFoco] = useState<string | null>(null);
  const semSinal = st.entregadores.filter((e) => sinalDe(e, st.agora).tipo === "sem");
  const naRua = st.entregadores.filter((e) => e.status === "em_corrida").length;

  // follow Diego on the map while he has a ride, unless someone picked another courier
  useEffect(() => {
    if (diego.corridaId) setFoco(ENTREGADOR_SIMULADOR);
  }, [diego.corridaId]);

  return (
    <>
      <Topo />
      <main className="op">
        <div className="op-barra">
          <div className="op-titulo">
            <span className="selo selo-claro">
              <Radio size={14} /> Operação ao vivo
            </span>
            <h1>Uma entrega, três telas, a mesma cidade</h1>
            <p>Peça no celular da farmácia, aceite no celular do Diego e acompanhe a moto no mapa. Os dados são inventados, a lógica é a de verdade.</p>
          </div>
          <div className="op-relogio" aria-label="Relógio da simulação">
            <span className="op-hora">{hhmmss(st.agora)}</span>
            <div className="op-vel" role="group" aria-label="Velocidade do relógio">
              {[1, 4, 8].map((v) => (
                <button key={v} className={st.velocidade === v ? "ativo" : ""} onClick={() => st.definirVelocidade(v)}>
                  {v}x
                </button>
              ))}
              <button onClick={st.alternarPausa} aria-label={st.pausado ? "Continuar" : "Pausar"}>
                {st.pausado ? <Play size={14} /> : <Pause size={14} />}
              </button>
            </div>
          </div>
        </div>

        <nav className="op-saltos" aria-label="Ir para">
          <a href="#tela-empresa">
            <Building2 size={15} /> Empresa
          </a>
          <a href="#tela-mapa">
            <MapaIcone size={15} /> Mapa
          </a>
          <a href="#tela-entregador">
            <Smartphone size={15} /> Entregador
          </a>
        </nav>

        <div className="op-grade">
          <section className="op-col" id="tela-empresa" aria-label="App da empresa">
            <div className="op-rot">
              <Building2 size={15} /> App da empresa
            </div>
            <AppEmpresa />
          </section>

          <section className="op-centro" id="tela-mapa" aria-label="Mapa ao vivo">
            <div className="op-rot">
              <MapaIcone size={15} /> Mapa da central · {naRua} motos em corrida
            </div>
            <div className="op-mapa">
              <Cidade modo="mapa" foco={foco} mostrarReal={verReal} className="op-mapa-canvas" />
              <div className="mapa-legenda">
                <span>
                  <i className="lg lg-acento" /> Em corrida
                </span>
                <span>
                  <i className="lg lg-ok" /> Livre
                </span>
                <span>
                  <i className="lg lg-alerta" /> Sem sinal
                </span>
                <span>
                  <i className="lg lg-laranja" /> Loja
                </span>
              </div>
              {foco && (
                <button className="mapa-foco" onClick={() => setFoco(null)}>
                  Seguindo {nomeCurto(st.entregadores.find((e) => e.id === foco)?.nome ?? "")} · ver a cidade toda
                </button>
              )}
            </div>

            <div className="cenarios">
              <div className="cenario">
                <div className="cenario-txt">
                  <strong>
                    {diego.sinal ? <Wifi size={16} /> : <WifiOff size={16} />} Celular do Diego sem sinal
                  </strong>
                  <span>Túnel, bateria no fim ou plano de dados acabou. O painel tem que dizer que ele sumiu, não fingir que ele parou.</span>
                </div>
                <button className={`btn ${diego.sinal ? "btn-alerta" : "btn-ok"} btn-pequeno`} onClick={() => st.alternarSinal(diego.id)} disabled={diego.status === "offline"}>
                  {diego.sinal ? "Cortar o sinal" : "Devolver o sinal"}
                </button>
              </div>
              <div className="cenario">
                <div className="cenario-txt">
                  <strong>
                    {st.modoComum ? <TriangleAlert size={16} /> : <CheckCircle2 size={16} />} Como um painel comum mostraria
                  </strong>
                  <span>Liga para ver a moto sem sinal parada em verde, com cara de ao vivo. É o ponto que mente.</span>
                </div>
                <button className={`toggle ${st.modoComum ? "on" : ""}`} onClick={st.alternarModoComum} aria-pressed={st.modoComum} aria-label="Mostrar como um painel comum">
                  <span />
                </button>
              </div>
              <div className="cenario">
                <div className="cenario-txt">
                  <strong>
                    {verReal ? <Eye size={16} /> : <EyeOff size={16} />} Onde a moto realmente está
                  </strong>
                  <span>Só a simulação sabe. A sombra transparente segue andando enquanto o ponto laranja fica onde o sinal caiu.</span>
                </div>
                <button className={`toggle ${verReal ? "on" : ""}`} onClick={() => setVerReal((v) => !v)} aria-pressed={verReal} aria-label="Mostrar a posição real">
                  <span />
                </button>
              </div>
            </div>

            {semSinal.length > 0 && (
              <div className="alerta-sinal" role="status">
                <WifiOff size={18} />
                <div>
                  {semSinal.map((e) => (
                    <button key={e.id} onClick={() => setFoco(e.id)}>
                      <strong>{nomeCurto(e.nome)}</strong> sem sinal {ha(st.agora - e.ultimaPosicaoEm)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="feed">
              <div className="feed-cab">
                <strong>O que está acontecendo</strong>
                <span>{st.corridas.filter(ativa).length} corridas abertas</span>
              </div>
              <ul>
                {st.log.slice(0, 7).map((l) => (
                  <li key={l.id} className={`feed-${l.tom}`}>
                    <span className="feed-hora">{hhmm(l.em)}</span>
                    <span>{l.texto}</span>
                    {l.entregadorId && (
                      <button className="feed-ver" onClick={() => setFoco(l.entregadorId!)} aria-label="Ver no mapa">
                        <MapaIcone size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="op-col" id="tela-entregador" aria-label="App do entregador">
            <div className="op-rot">
              <Smartphone size={15} /> App do entregador
            </div>
            <AppEntregador />
          </section>
        </div>
        <p className="op-nota">
          <Info size={15} /> Relógio acelerado para a corrida caber em um minuto. Empresas, pessoas, placas e endereços são inventados.
        </p>
      </main>
    </>
  );
}
