"use client";

import Link from "next/link";
import { useState } from "react";
import { AlarmClock, ArrowRight, Bike, CheckCircle2, Clock3, IdCard, KeyRound, ListOrdered, MapPin, Phone, Plus, Timer, UserPlus, WifiOff } from "lucide-react";
import { Avatar, Numero, Skel, StatusCorridaTag, useCarregando } from "../ui";
import { useStore, sinalDe, ativa } from "@/lib/store";
import { DIA, ha, hhmm, mesmoDia, nomeCurto, num, reais } from "@/lib/format";
import { useSel } from "./Shell";
import { GavetaCorrida, ModalAtribuir, ModalNovaCorrida } from "./CorridaUI";
import type { Corrida } from "@/lib/types";

export default function VisaoGeral() {
  const st = useStore();
  const sel = useSel();
  const carregando = useCarregando();
  const [aberta, setAberta] = useState<string | null>(null);
  const [atribuir, setAtribuir] = useState<Corrida | null>(null);
  const [nova, setNova] = useState(false);

  const hoje = st.corridas.filter((c) => mesmoDia(c.criadaEm, st.agora));
  const abertas = st.corridas.filter(ativa).sort((a, b) => a.criadaEm - b.criadaEm);
  const aguardando = abertas.filter((c) => c.status === "aguardando");
  const entregues = hoje.filter((c) => c.status === "entregue");
  const comCodigo = entregues.filter((c) => c.confirmadaPorCodigo).length;
  const aceites = hoje.filter((c) => c.aceitaEm).map((c) => (c.aceitaEm! - c.criadaEm) / 1000);
  const aceiteMedio = aceites.length ? aceites.reduce((a, b) => a + b, 0) / aceites.length : 0;
  const semSinal = st.entregadores.filter((e) => sinalDe(e, st.agora).tipo === "sem");
  const livres = st.entregadores.filter((e) => e.status === "online").length;
  const naRua = st.entregadores.filter((e) => e.status === "em_corrida").length;
  const pendentes = st.entregadores.filter((e) => e.status === "pendente");
  const cnhVencendo = st.entregadores.filter((e) => !["pendente", "recusado"].includes(e.status) && e.docs.cnhValidade - st.agora < 30 * DIA);
  const faturado = entregues.reduce((a, c) => a + c.preco, 0);

  const kpis = [
    { icone: ListOrdered, rot: "Corridas hoje", v: hoje.length, f: (v: number) => num(Math.round(v)), sub: `${entregues.length} entregues` },
    { icone: Bike, rot: "Motos na rua", v: naRua, f: (v: number) => num(Math.round(v)), sub: `${livres} livres esperando` },
    { icone: Timer, rot: "Até o aceite", v: aceiteMedio, f: (v: number) => `${num(Math.round(v))} s`, sub: "média do dia" },
    { icone: KeyRound, rot: "Fechadas com código", v: entregues.length ? (comCodigo / entregues.length) * 100 : 0, f: (v: number) => `${num(Math.round(v))}%`, sub: `${comCodigo} de ${entregues.length}` },
    { icone: WifiOff, rot: "Sem sinal agora", v: semSinal.length, f: (v: number) => num(Math.round(v)), sub: semSinal.length ? "veja abaixo" : "todas transmitindo", alerta: semSinal.length > 0 },
    { icone: CheckCircle2, rot: "Entregue hoje", v: faturado, f: (v: number) => reais(v), sub: "valor das corridas" },
  ];

  return (
    <div className="pg">
      <div className="kpis">
        {kpis.map((k, i) => (
          <div key={k.rot} className={`kpi entra d${(i % 4) + 1} ${k.alerta ? "kpi-alerta" : ""}`}>
            <span className="kpi-icone">
              <k.icone size={18} />
            </span>
            <span className="kpi-rot">{k.rot}</span>
            <strong>{carregando ? <Skel h={26} w={70} /> : <Numero valor={k.v} formato={k.f} />}</strong>
            <small>{k.sub}</small>
          </div>
        ))}
      </div>

      <div className="vg-grade">
        <section className="cartao">
          <div className="cartao-cab">
            <h2>Precisa de atenção</h2>
            <span className="cartao-sub">{semSinal.length + aguardando.length + pendentes.length + cnhVencendo.length} itens</span>
          </div>
          {carregando ? (
            <div className="lista-skel">
              <Skel h={54} />
              <Skel h={54} />
              <Skel h={54} />
            </div>
          ) : (
            <ul className="atencao">
              {semSinal.map((e) => {
                const c = st.corridas.find((x) => x.id === e.corridaId);
                return (
                  <li key={e.id} className="at-alerta">
                    <span className="at-icone">
                      <WifiOff size={16} />
                    </span>
                    <div>
                      <strong>
                        {nomeCurto(e.nome)} sem sinal {ha(st.agora - e.ultimaPosicaoEm)}
                      </strong>
                      <span>{c ? `${c.id}, ${c.coleta.bairro} para ${c.destino.bairro}. O ponto no mapa é a última posição recebida.` : "Livre, sem corrida."}</span>
                    </div>
                    <div className="at-acoes">
                      <button className="btn btn-claro btn-pequeno" onClick={() => sel.setFoco(e.id)}>
                        <MapPin size={14} /> Mapa
                      </button>
                      <button className="btn btn-claro btn-pequeno" onClick={() => st.toast(`Ligando para ${nomeCurto(e.nome)}, ${e.telefone}.`, "info")}>
                        <Phone size={14} /> Ligar
                      </button>
                    </div>
                  </li>
                );
              })}
              {aguardando.map((c) => (
                <li key={c.id} className={st.agora - c.criadaEm > 60_000 ? "at-alerta" : ""}>
                  <span className="at-icone">
                    <AlarmClock size={16} />
                  </span>
                  <div>
                    <strong>
                      {c.id} aguardando aceite {ha(st.agora - c.criadaEm)}
                    </strong>
                    <span>
                      {st.empresas.find((e) => e.id === c.empresaId)?.nome} para {c.destino.bairro} · {c.ofertas} {c.ofertas === 1 ? "oferta" : "ofertas"}
                    </span>
                  </div>
                  <div className="at-acoes">
                    <button className="btn btn-primario btn-pequeno" onClick={() => setAtribuir(c)}>
                      <UserPlus size={14} /> Atribuir
                    </button>
                  </div>
                </li>
              ))}
              {pendentes.length > 0 && (
                <li>
                  <span className="at-icone">
                    <IdCard size={16} />
                  </span>
                  <div>
                    <strong>{pendentes.length} cadastros de entregador em análise</strong>
                    <span>CNH, EAR e documento da moto para conferir antes de liberar.</span>
                  </div>
                  <div className="at-acoes">
                    <Link href="/painel/entregadores?aba=analise" className="btn btn-claro btn-pequeno">
                      Conferir
                    </Link>
                  </div>
                </li>
              )}
              {cnhVencendo.map((e) => (
                <li key={e.id}>
                  <span className="at-icone">
                    <Clock3 size={16} />
                  </span>
                  <div>
                    <strong>CNH de {nomeCurto(e.nome)} vence em {Math.max(0, Math.round((e.docs.cnhValidade - st.agora) / DIA))} dias</strong>
                    <span>Depois disso ele sai da distribuição até mandar a nova.</span>
                  </div>
                </li>
              ))}
              {semSinal.length + aguardando.length + pendentes.length + cnhVencendo.length === 0 && (
                <li className="at-ok">
                  <CheckCircle2 size={16} /> Tudo em ordem por agora.
                </li>
              )}
            </ul>
          )}
        </section>

        <section className="cartao">
          <div className="cartao-cab">
            <h2>Corridas abertas</h2>
            <button className="btn btn-primario btn-pequeno" onClick={() => setNova(true)}>
              <Plus size={14} /> Nova corrida
            </button>
          </div>
          {carregando ? (
            <div className="lista-skel">
              <Skel h={44} />
              <Skel h={44} />
              <Skel h={44} />
              <Skel h={44} />
            </div>
          ) : (
            <div className="abertas">
              {abertas.map((c) => {
                const e = st.entregadores.find((x) => x.id === c.entregadorId);
                const sn = e ? sinalDe(e, st.agora, st.modoComum) : null;
                return (
                  <button key={c.id} className="aberta" onClick={() => setAberta(c.id)} onMouseEnter={() => e && sel.setFoco(e.id)}>
                    {e ? <Avatar chave={e.foto} nome={e.nome} size={32} /> : <span className="aberta-sem">?</span>}
                    <div>
                      <strong>
                        {c.id} · {c.coleta.bairro} <ArrowRight size={12} /> {c.destino.bairro}
                      </strong>
                      <span>
                        {e ? nomeCurto(e.nome) : "Sem entregador"} · pedido {hhmm(c.criadaEm)}
                        {sn?.tipo === "sem" && <em className="txt-alerta"> · sem sinal</em>}
                      </span>
                    </div>
                    <StatusCorridaTag s={c.status} />
                  </button>
                );
              })}
            </div>
          )}
          <Link href="/painel/corridas" className="link-seta">
            Ver todas as corridas <ArrowRight size={15} />
          </Link>
        </section>

        <section className="cartao cartao-feed">
          <div className="cartao-cab">
            <h2>Movimento</h2>
          </div>
          <ul className="feed-lista">
            {st.log.slice(0, 10).map((l) => (
              <li key={l.id} className={`feed-${l.tom}`}>
                <span className="feed-hora">{hhmm(l.em)}</span>
                <span>{l.texto}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="cartao">
          <div className="cartao-cab">
            <h2>Quem está na rua</h2>
            <Link href="/painel/entregadores" className="link-seta">
              Rede completa <ArrowRight size={15} />
            </Link>
          </div>
          <div className="na-rua">
            {st.entregadores
              .filter((e) => e.status === "em_corrida" || e.status === "online")
              .slice(0, 12)
              .map((e) => {
                const sn = sinalDe(e, st.agora, st.modoComum);
                return (
                  <button key={e.id} className={`na-rua-item ${sn.tipo}`} onClick={() => sel.setFoco(e.id)} title={e.nome}>
                    <Avatar chave={e.foto} nome={e.nome} size={40} />
                    <span>{e.nome.split(" ")[0]}</span>
                    <i />
                  </button>
                );
              })}
          </div>
        </section>
      </div>
      <GavetaCorrida id={aberta} onFechar={() => setAberta(null)} />
      <ModalAtribuir corrida={atribuir} onFechar={() => setAtribuir(null)} />
      <ModalNovaCorrida aberto={nova} onFechar={() => setNova(false)} />
    </div>
  );
}
