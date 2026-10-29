"use client";

import { useMemo, useState } from "react";
import { Check, KeyRound, Lock, MapPin, Navigation, Phone, Search, Store, UserPlus, WifiOff, XCircle } from "lucide-react";
import { Avatar, Campo, Gaveta, Modal, Spinner, StatusCorridaTag, StatusEntregadorTag } from "../ui";
import { useStore, sinalDe } from "@/lib/store";
import { cotacao, enderecoDe, fimDaPerna, kmDe, noMaisProximo, rota } from "@/lib/cidade";
import { DESTINOS } from "@/lib/mock/corridas";
import { ENTREGADOR_SIMULADOR } from "@/lib/mock/entregadores";
import { duracao, ha, hhmm, km, nomeCurto, quando, reais, semAcento } from "@/lib/format";
import type { Corrida } from "@/lib/types";
import { useSel } from "./Shell";

export function GavetaCorrida({ id, onFechar }: { id: string | null; onFechar: () => void }) {
  const st = useStore();
  const sel = useSel();
  const c = id ? st.corridas.find((x) => x.id === id) : undefined;
  const [atribuir, setAtribuir] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  if (!c) return <Gaveta aberto={false} titulo="" onFechar={onFechar}>{null}</Gaveta>;
  const emp = st.empresas.find((e) => e.id === c.empresaId);
  const ent = st.entregadores.find((e) => e.id === c.entregadorId);
  const sn = ent ? sinalDe(ent, st.agora, st.modoComum) : null;
  const eta = c.perna ? Math.max(0, fimDaPerna(c.perna) - st.agora) : 0;
  const podeCancelar = ["aguardando", "indo_coleta", "na_coleta"].includes(c.status);
  const podeAtribuir = ["aguardando", "indo_coleta"].includes(c.status);

  const cancelar = async () => {
    if (motivo.trim().length < 4) return setErro("Escreva o motivo do cancelamento.");
    setCarregando(true);
    const r = await st.cancelar(c.id, motivo.trim());
    setCarregando(false);
    if (!r.ok) return setErro(r.erro);
    setCancelando(false);
    setMotivo("");
    st.toast(`${c.id} cancelada.`, "info");
  };

  const linhas: [string, number | undefined][] = [
    ["Pedido criado", c.criadaEm],
    ["Aceita", c.aceitaEm],
    ["Chegou na coleta", c.chegouColetaEm],
    ["Coletada", c.coletadaEm],
    ["Chegou no destino", c.chegouDestinoEm],
    ["Entregue com código", c.entregueEm],
  ];

  return (
    <>
      <Gaveta
        aberto={!!c}
        titulo={c.id}
        sub={
          <>
            <StatusCorridaTag s={c.status} /> <span>{emp?.nome}</span>
          </>
        }
        onFechar={onFechar}
        rodape={
          <>
            {podeAtribuir && (
              <button className="btn btn-primario" onClick={() => setAtribuir(true)}>
                <UserPlus size={16} /> {c.entregadorId ? "Trocar entregador" : "Atribuir entregador"}
              </button>
            )}
            {podeCancelar && !cancelando && (
              <button className="btn btn-claro btn-perigo-txt" onClick={() => setCancelando(true)}>
                <XCircle size={16} /> Cancelar corrida
              </button>
            )}
            {ent && ["indo_coleta", "na_coleta", "em_rota", "no_destino"].includes(c.status) && (
              <button
                className="btn btn-claro"
                onClick={() => {
                  sel.setFoco(ent.id);
                  sel.setCorridaFoco(c.id);
                  onFechar();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <Navigation size={16} /> Ver no mapa
              </button>
            )}
          </>
        }
      >
        <div className="gv-rota">
          <div>
            <span className="pt pt-coleta">
              <Store size={13} />
            </span>
            <div>
              <small>Coleta</small>
              <strong>{emp?.nome}</strong>
              <span>
                {c.coleta.endereco} · {c.coleta.bairro}
              </span>
            </div>
          </div>
          <div>
            <span className="pt pt-destino">
              <MapPin size={13} />
            </span>
            <div>
              <small>Entrega</small>
              <strong>{c.destino.contato}</strong>
              <span>
                {c.destino.endereco} · {c.destino.bairro}
              </span>
              {c.obs && <em>{c.obs}</em>}
            </div>
          </div>
        </div>

        <div className="gv-numeros">
          <div>
            <small>Pela rua</small>
            <strong>{km(c.kmRota)}</strong>
          </div>
          <div>
            <small>Em linha reta</small>
            <strong>{km(c.kmReta)}</strong>
          </div>
          <div>
            <small>Preço travado</small>
            <strong>{reais(c.preco)}</strong>
          </div>
          <div>
            <small>Repasse</small>
            <strong>{reais(c.repasse)}</strong>
          </div>
        </div>

        {ent && (
          <div className="gv-ent">
            <Avatar chave={ent.foto} nome={ent.nome} size={46} />
            <div>
              <strong>{ent.nome}</strong>
              <span>
                {ent.moto} · {ent.placa}
              </span>
              {sn && sn.tipo !== "off" && ["indo_coleta", "na_coleta", "em_rota", "no_destino"].includes(c.status) && (
                <span className={`sinal-linha ${sn.tipo}`}>
                  {sn.tipo === "sem" ? (
                    <>
                      <WifiOff size={13} /> Sem sinal {ha(sn.idade)}, última posição na {enderecoDe(noMaisProximo(ent.posRecebida.x, ent.posRecebida.y)).endereco.split(",")[0]}
                    </>
                  ) : (
                    <>
                      <span className="ponto-vivo" /> Posição {ha(sn.idade)}
                    </>
                  )}
                </span>
              )}
            </div>
            <button className="icon-btn" aria-label="Ligar para o entregador" onClick={() => st.toast(`Ligando para ${nomeCurto(ent.nome)}, ${ent.telefone}.`, "info")}>
              <Phone size={16} />
            </button>
          </div>
        )}
        {c.perna && (
          <p className="gv-eta">
            {c.status === "indo_coleta" ? "Chega na coleta" : "Chega no destino"} em cerca de {duracao(eta)}.
          </p>
        )}

        <h4 className="gv-sec">Linha do tempo</h4>
        <ol className="gv-tempo">
          {linhas.map(([rot, t]) => (
            <li key={rot} className={t ? "feito" : ""}>
              <span className="gv-bola">{t ? <Check size={11} /> : null}</span>
              <span>{rot}</span>
              <small>{t ? quando(t, st.agora) : ""}</small>
            </li>
          ))}
          {c.status === "cancelada" && (
            <li className="cancel">
              <span className="gv-bola">
                <XCircle size={11} />
              </span>
              <span>Cancelada: {c.motivoCancelamento}</span>
              <small>{c.canceladaEm ? quando(c.canceladaEm, st.agora) : ""}</small>
            </li>
          )}
        </ol>

        <div className="gv-fatos">
          <span>
            <KeyRound size={14} /> Código {c.status === "entregue" ? (c.confirmadaPorCodigo ? "conferido na porta" : "não digitado") : c.codigoEntrega}
          </span>
          <span>
            <Lock size={14} /> Preço calculado pela {st.tarifa.medida === "rota" ? "rota" : "linha reta"} no pedido
          </span>
          <span>
            <WifiOff size={14} /> {c.quedasSinal === 0 ? "Sem quedas de sinal" : `${c.quedasSinal} ${c.quedasSinal === 1 ? "queda" : "quedas"} de sinal`}
          </span>
          <span>{c.ofertas === 1 ? "Aceita na primeira oferta" : `${c.ofertas} ofertas até o aceite`}</span>
        </div>

        {cancelando && (
          <div className="gv-cancel">
            <Campo rotulo="Motivo do cancelamento" erro={erro ?? undefined}>
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: a empresa pediu, endereço errado" autoFocus />
            </Campo>
            <div className="gv-cancel-bts">
              <button className="btn btn-perigo" onClick={cancelar} disabled={carregando}>
                {carregando ? <Spinner /> : "Confirmar cancelamento"}
              </button>
              <button className="btn btn-claro" onClick={() => setCancelando(false)}>
                Voltar
              </button>
            </div>
          </div>
        )}
        {erro && !cancelando && <p className="app-erro">{erro}</p>}
      </Gaveta>
      <ModalAtribuir corrida={atribuir ? c : null} onFechar={() => setAtribuir(false)} />
    </>
  );
}

export function ModalAtribuir({ corrida, onFechar }: { corrida: Corrida | null; onFechar: () => void }) {
  const st = useStore();
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const lista = useMemo(() => {
    if (!corrida) return [];
    return st.entregadores
      .filter((e) => e.status === "online" || e.status === "em_corrida")
      .map((e) => {
        const kmAte = kmDe(rota(e.parado, corrida.coleta.no));
        return { e, kmAte, reta: +(Math.hypot(e.parado[0] - corrida.coleta.no[0], e.parado[1] - corrida.coleta.no[1]) * 0.4).toFixed(1) };
      })
      .sort((a, b) => (a.e.status === b.e.status ? a.kmAte - b.kmAte : a.e.status === "online" ? -1 : 1));
    // the list is recomputed when the modal opens; positions move slowly enough for that
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corrida?.id, st.entregadores.length, st.entregadores.filter((e) => e.status === "online").length]);
  const escolher = async (id: string) => {
    if (!corrida) return;
    setEnviando(id);
    setErro(null);
    const r = await st.atribuir(corrida.id, id);
    setEnviando(null);
    if (!r.ok) return setErro(r.erro);
    st.toast(id === ENTREGADOR_SIMULADOR ? "Oferta enviada ao celular do Diego. Ele tem 30 s para aceitar." : `${corrida.id} atribuída.`, "ok");
    onFechar();
  };
  return (
    <Modal aberto={!!corrida} titulo={corrida ? `Atribuir ${corrida.id}` : "Atribuir"} onFechar={onFechar} largura={560}>
      <p className="modal-txt">Ordenados pela distância até a coleta pela rua, não em linha reta. Quem está do outro lado do rio fica mais longe do que parece.</p>
      {erro && <p className="app-erro">{erro}</p>}
      <div className="atrib-lista">
        {lista.map(({ e, kmAte, reta }) => (
          <div key={e.id} className={`atrib-linha ${e.status !== "online" ? "ocupado" : ""}`}>
            <Avatar chave={e.foto} nome={e.nome} size={38} />
            <div>
              <strong>{e.nome}</strong>
              <span>
                {km(kmAte)} pela rua{reta + 0.4 < kmAte ? ` (${km(reta)} em linha reta)` : ""} · {e.bairroBase}
              </span>
            </div>
            <StatusEntregadorTag s={e.status} />
            <button className="btn btn-primario btn-pequeno" disabled={e.status !== "online" || !!enviando} onClick={() => escolher(e.id)}>
              {enviando === e.id ? <Spinner /> : "Atribuir"}
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function ModalNovaCorrida({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const st = useStore();
  const ativas = st.empresas.filter((e) => e.status === "ativa");
  const [empresaId, setEmpresaId] = useState(ativas[1]?.id ?? "");
  const [busca, setBusca] = useState("");
  const [destIdx, setDestIdx] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const emp = st.empresas.find((e) => e.id === empresaId);
  const dest = destIdx !== null ? DESTINOS[destIdx] : null;
  const q = emp && dest ? cotacao(emp.coleta.no, dest.no, st.tarifa) : null;
  const sug = DESTINOS.map((d, i) => ({ d, i }))
    .filter(({ d }) => !busca.trim() || semAcento(`${d.endereco} ${d.bairro} ${d.contato}`).includes(semAcento(busca.trim())))
    .slice(0, 6);
  const criar = async () => {
    if (!emp) return setErro("Escolha a empresa.");
    if (!dest) return setErro("Escolha o endereço de entrega.");
    setEnviando(true);
    setErro(null);
    const r = await st.pedirEntrega({ empresaId: emp.id, destino: { no: dest.no, endereco: dest.endereco, bairro: dest.bairro }, contato: dest.contato, telefone: dest.telefone, obs: dest.obs }, false);
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    st.toast(`${r.valor} criada. ${st.autoDistribuir ? "A distribuição automática assume em segundos." : "Atribua um entregador na lista."}`, "ok");
    setDestIdx(null);
    setBusca("");
    onFechar();
  };
  return (
    <Modal
      aberto={aberto}
      titulo="Nova corrida pela central"
      onFechar={onFechar}
      largura={560}
      rodape={
        <>
          <button className="btn btn-claro" onClick={onFechar}>
            Fechar
          </button>
          <button className="btn btn-primario" onClick={criar} disabled={enviando}>
            {enviando ? <Spinner /> : "Criar corrida"}
          </button>
        </>
      }
    >
      <Campo rotulo="Empresa que pediu por telefone">
        <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
          {ativas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome} · {e.coleta.bairro}
            </option>
          ))}
        </select>
      </Campo>
      <Campo rotulo="Entrega">
        <div className="input-icone">
          <Search size={15} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Rua, bairro ou destinatário" />
        </div>
      </Campo>
      <div className="nc-sug">
        {sug.length === 0 ? (
          <p className="app-nada">Nenhum endereço encontrado.</p>
        ) : (
          sug.map(({ d, i }) => (
            <button key={i} className={destIdx === i ? "ativo" : ""} onClick={() => setDestIdx(i)}>
              <MapPin size={14} />
              <span>
                <strong>{d.endereco}</strong>
                <small>
                  {d.bairro} · {d.contato}
                </small>
              </span>
            </button>
          ))
        )}
      </div>
      {q && (
        <div className="nc-cot">
          <span>
            Pela rua <strong>{km(q.kmRota)}</strong>
          </span>
          <span>
            Em linha reta <strong>{km(q.kmReta)}</strong>
          </span>
          <span>
            Preço <strong>{reais(q.preco)}</strong>
          </span>
          <span>
            Repasse <strong>{reais(q.repasse)}</strong>
          </span>
        </div>
      )}
      {erro && <p className="app-erro">{erro}</p>}
      <p className="modal-txt pequeno">Criada às {hhmm(st.agora)}. O código de entrega vai para o destinatário por mensagem.</p>
    </Modal>
  );
}
