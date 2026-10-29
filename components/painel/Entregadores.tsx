"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownUp, BadgeCheck, Ban, Bike, Check, CheckCircle2, FileText, IdCard, MapPin, Phone, Plus, Search, Star, Unlock, UserCheck, WifiOff, X } from "lucide-react";
import { Avatar, Campo, Gaveta, Modal, Skel, Spinner, StatusEntregadorTag, Tilt, Vazio, useCarregando } from "../ui";
import { useStore, sinalDe } from "@/lib/store";
import { COLS, ROWS, BAIRROS, bairroDe } from "@/lib/cidade";
import { DIA, dataCurta, ha, mesmoDia, nomeCurto, num, quando, reais, semAcento } from "@/lib/format";
import type { Entregador, StatusEntregador } from "@/lib/types";
import { useSel } from "./Shell";

type Aba = "rede" | "analise" | "recusados";
type Ordem = "nome" | "nota" | "corridas";

const anoDe = (ms: number) => new Date(ms).getUTCFullYear();

export default function Entregadores() {
  const st = useStore();
  const sel = useSel();
  const carregando = useCarregando(650);
  const [aba, setAba] = useState<Aba>("rede");
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusEntregador | "todos">("todos");
  const [ordem, setOrdem] = useState<Ordem>("nome");
  const [aberto, setAberto] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  useEffect(() => {
    if (window.location.search.includes("aba=analise")) setAba("analise");
  }, []);

  const da = (e: Entregador) => (aba === "rede" ? ["online", "em_corrida", "offline", "bloqueado"].includes(e.status) : aba === "analise" ? e.status === "pendente" : e.status === "recusado");
  const lista = useMemo(() => {
    const q = semAcento(busca.trim());
    const out = st.entregadores.filter(da).filter((e) => (status === "todos" ? true : e.status === status)).filter((e) => !q || semAcento(`${e.nome} ${e.placa} ${e.moto} ${e.bairroBase}`).includes(q));
    out.sort((a, b) => (ordem === "nome" ? a.nome.localeCompare(b.nome, "pt-BR") : ordem === "nota" ? b.nota - a.nota : b.corridasTotal - a.corridasTotal));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.entregadores, aba, busca, status, ordem]);
  const n = (a: Aba) => st.entregadores.filter((e) => (a === "rede" ? ["online", "em_corrida", "offline", "bloqueado"].includes(e.status) : a === "analise" ? e.status === "pendente" : e.status === "recusado")).length;
  const atual = aberto ? st.entregadores.find((e) => e.id === aberto) ?? null : null;

  return (
    <div className="pg">
      <div className="pg-cab">
        <div>
          <h1>Entregadores</h1>
          <p>A rede de motoboys parceiros. Ninguém entra na distribuição antes de a central conferir CNH, observação EAR e documento da moto.</p>
        </div>
        <button className="btn btn-primario" onClick={() => setNovo(true)}>
          <Plus size={16} /> Cadastrar entregador
        </button>
      </div>
      <div className="abas" role="tablist">
        {(
          [
            ["rede", "Rede"],
            ["analise", "Em análise"],
            ["recusados", "Recusados"],
          ] as [Aba, string][]
        ).map(([a, r]) => (
          <button
            key={a}
            role="tab"
            aria-selected={aba === a}
            className={`aba ${aba === a ? "ativa" : ""}`}
            onClick={() => {
              setAba(a);
              setStatus("todos");
            }}
          >
            {r} <em>{n(a)}</em>
          </button>
        ))}
      </div>
      <div className="barra-filtros">
        <div className="input-icone grande">
          <Search size={16} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, placa, moto ou bairro" aria-label="Buscar entregadores" />
        </div>
        <label className="ordem">
          <ArrowDownUp size={15} />
          <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} aria-label="Ordenar">
            <option value="nome">Nome</option>
            <option value="nota">Maior nota</option>
            <option value="corridas">Mais corridas</option>
          </select>
        </label>
      </div>
      {aba === "rede" && (
        <div className="chips">
          {(["todos", "em_corrida", "online", "offline", "bloqueado"] as const).map((s) => (
            <button key={s} className={`chip ${status === s ? "ativo" : ""}`} onClick={() => setStatus(s)}>
              {s === "todos" ? "Todos" : s === "em_corrida" ? "Em corrida" : s === "online" ? "Livres" : s === "offline" ? "Offline" : "Bloqueados"}
            </button>
          ))}
        </div>
      )}

      {carregando ? (
        <div className="cards-ent">
          {Array.from({ length: 6 }, (_, i) => (
            <Skel key={i} h={170} r={18} />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <Vazio titulo="Ninguém por aqui" texto={aba === "analise" ? "Nenhum cadastro esperando análise." : "Nenhum entregador com esse filtro."} />
      ) : (
        <div className="cards-ent">
          {lista.map((e, i) => {
            const sn = sinalDe(e, st.agora, st.modoComum);
            const hoje = st.corridas.filter((c) => c.entregadorId === e.id && c.status === "entregue" && mesmoDia(c.entregueEm ?? 0, st.agora)).length;
            return (
              <Tilt key={e.id} className={`card-ent entra d${(i % 4) + 1}`} max={4}>
                <button className="card-ent-in" onClick={() => setAberto(e.id)}>
                  <div className="card-ent-topo">
                    <Avatar chave={e.foto} nome={e.nome} size={50} />
                    <div>
                      <strong>{e.nome}</strong>
                      <span>
                        {e.moto} · {e.placa}
                      </span>
                    </div>
                  </div>
                  <div className="card-ent-meio">
                    <StatusEntregadorTag s={e.status} />
                    {sn.tipo === "sem" && (
                      <span className="tag tag-alerta">
                        <WifiOff size={12} /> Sem sinal {ha(sn.idade)}
                      </span>
                    )}
                    {aba === "analise" && !e.docs.ear && (
                      <span className="tag tag-erro">
                        <AlertTriangle size={12} /> Sem EAR
                      </span>
                    )}
                    {aba === "analise" && e.docs.cnhValidade - st.agora < 30 * DIA && (
                      <span className="tag tag-alerta">CNH vence em {Math.round((e.docs.cnhValidade - st.agora) / DIA)} dias</span>
                    )}
                  </div>
                  {aba === "rede" ? (
                    <div className="card-ent-num">
                      <span>
                        <Star size={13} /> {e.nota.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                      <span>{num(e.corridasTotal)} corridas</span>
                      <span>{hoje} hoje</span>
                    </div>
                  ) : (
                    <div className="card-ent-num">
                      <span>
                        <FileText size={13} /> Enviado {quando(e.docs.enviadoEm, st.agora)}
                      </span>
                      <span>{e.bairroBase || "Bairro não informado"}</span>
                    </div>
                  )}
                </button>
              </Tilt>
            );
          })}
        </div>
      )}
      <GavetaEntregador e={atual} onFechar={() => setAberto(null)} onMapa={(id) => sel.setFoco(id)} />
      <ModalCadastro aberto={novo} onFechar={() => setNovo(false)} />
    </div>
  );
}

function GavetaEntregador({ e, onFechar, onMapa }: { e: Entregador | null; onFechar: () => void; onMapa: (id: string) => void }) {
  const st = useStore();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ telefone: "", moto: "", placa: "", pix: "" });
  const [carregando, setCarregando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [recusando, setRecusando] = useState(false);
  useEffect(() => {
    if (e) setForm({ telefone: e.telefone, moto: e.moto, placa: e.placa, pix: e.pix });
    setEditando(false);
    setErro(null);
    setRecusando(false);
    setMotivo("");
    // reset only when another courier is opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e?.id]);
  if (!e) return <Gaveta aberto={false} titulo="" onFechar={onFechar}>{null}</Gaveta>;
  const sn = sinalDe(e, st.agora, st.modoComum);
  const recentes = st.corridas.filter((c) => c.entregadorId === e.id).sort((a, b) => b.criadaEm - a.criadaEm).slice(0, 6);
  const semana = st.corridas.filter((c) => c.entregadorId === e.id && c.status === "entregue");
  const pend = e.status === "pendente";
  const vence = e.docs.cnhValidade - st.agora;

  const rodar = async (k: string, fn: () => Promise<{ ok: true } | { ok: false; erro: string }>, msg: string) => {
    setCarregando(k);
    setErro(null);
    const r = await fn();
    setCarregando(null);
    if (!r.ok) return setErro(r.erro);
    st.toast(msg, "ok");
    return true;
  };

  return (
    <Gaveta
      aberto={!!e}
      titulo={e.nome}
      sub={<StatusEntregadorTag s={e.status} />}
      onFechar={onFechar}
      rodape={
        pend ? (
          recusando ? (
            <>
              <button className="btn btn-perigo" disabled={!!carregando} onClick={async () => (await rodar("recusar", () => st.recusar(e.id, motivo), "Cadastro recusado. O motivo vai para o entregador corrigir.")) && setRecusando(false)}>
                {carregando === "recusar" ? <Spinner /> : "Confirmar recusa"}
              </button>
              <button className="btn btn-claro" onClick={() => setRecusando(false)}>
                Voltar
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-primario" disabled={!!carregando} onClick={() => rodar("aprovar", () => st.aprovar(e.id), `${nomeCurto(e.nome)} aprovado. Ele já pode ficar online.`)}>
                {carregando === "aprovar" ? <Spinner /> : (
                  <>
                    <UserCheck size={16} /> Aprovar cadastro
                  </>
                )}
              </button>
              <button className="btn btn-claro btn-perigo-txt" onClick={() => setRecusando(true)}>
                <X size={16} /> Recusar
              </button>
            </>
          )
        ) : editando ? (
          <>
            <button className="btn btn-primario" disabled={!!carregando} onClick={async () => (await rodar("salvar", () => st.salvarEntregador(e.id, form), "Dados do entregador salvos.")) && setEditando(false)}>
              {carregando === "salvar" ? <Spinner /> : "Salvar"}
            </button>
            <button className="btn btn-claro" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </>
        ) : (
          <>
            {(e.status === "em_corrida" || e.status === "online") && (
              <button
                className="btn btn-primario"
                onClick={() => {
                  onMapa(e.id);
                  onFechar();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <MapPin size={16} /> Ver no mapa
              </button>
            )}
            <button className="btn btn-claro" onClick={() => setEditando(true)}>
              Editar dados
            </button>
            {e.status === "bloqueado" ? (
              <button className="btn btn-claro" disabled={!!carregando} onClick={() => rodar("bloq", () => st.bloquear(e.id, false), `${nomeCurto(e.nome)} desbloqueado.`)}>
                {carregando === "bloq" ? <Spinner /> : (
                  <>
                    <Unlock size={16} /> Desbloquear
                  </>
                )}
              </button>
            ) : (
              <button className="btn btn-claro btn-perigo-txt" disabled={!!carregando} onClick={() => rodar("bloq", () => st.bloquear(e.id, true), `${nomeCurto(e.nome)} bloqueado.`)}>
                {carregando === "bloq" ? <Spinner /> : (
                  <>
                    <Ban size={16} /> Bloquear
                  </>
                )}
              </button>
            )}
          </>
        )
      }
    >
      <div className="gv-perfil">
        <Avatar chave={e.foto} nome={e.nome} size={64} />
        <div>
          <strong>{e.nome}</strong>
          <span>
            {e.moto} · {e.placa}
          </span>
          <span>
            <Phone size={12} /> {e.telefone}
          </span>
        </div>
      </div>
      {!pend && sn.tipo !== "off" && (
        <p className={`sinal-linha ${sn.tipo}`}>{sn.tipo === "sem" ? <><WifiOff size={13} /> Sem sinal {ha(sn.idade)}</> : <><span className="ponto-vivo" /> Transmitindo, posição {ha(sn.idade)}</>}</p>
      )}

      {pend ? (
        <>
          <h4 className="gv-sec">Conferência dos documentos</h4>
          <ul className="docs">
            <li className={e.docs.cnhCategoria.includes("A") ? "ok" : "ruim"}>
              {e.docs.cnhCategoria.includes("A") ? <Check size={15} /> : <X size={15} />}
              <span>CNH categoria {e.docs.cnhCategoria}</span>
              <small>nº {e.docs.cnhNumero}</small>
            </li>
            <li className={vence > 30 * DIA ? "ok" : vence > 0 ? "aviso" : "ruim"}>
              {vence > 30 * DIA ? <Check size={15} /> : <AlertTriangle size={15} />}
              <span>Validade da CNH</span>
              <small>
                {dataCurta(e.docs.cnhValidade)}/{anoDe(e.docs.cnhValidade)}
                {vence < 30 * DIA && vence > 0 ? `, vence em ${Math.round(vence / DIA)} dias` : ""}
              </small>
            </li>
            <li className={e.docs.ear ? "ok" : "ruim"}>
              {e.docs.ear ? <Check size={15} /> : <X size={15} />}
              <span>Observação EAR na CNH</span>
              <small>{e.docs.ear ? "exerce atividade remunerada" : "ausente: entrega paga não pode ser liberada"}</small>
            </li>
            <li className={e.docs.crlvOk ? "ok" : "ruim"}>
              {e.docs.crlvOk ? <Check size={15} /> : <X size={15} />}
              <span>Documento da moto (CRLV)</span>
              <small>{e.placa}</small>
            </li>
            <li className={e.docs.fotoOk ? "ok" : "aviso"}>
              {e.docs.fotoOk ? <Check size={15} /> : <AlertTriangle size={15} />}
              <span>Selfie com o documento</span>
              <small>{e.docs.fotoOk ? "confere com a CNH" : "não enviada"}</small>
            </li>
          </ul>
          {recusando && (
            <Campo rotulo="Motivo da recusa" erro={erro ?? undefined} dica="O entregador vê esse texto e pode corrigir o cadastro.">
              <input value={motivo} onChange={(x) => setMotivo(x.target.value)} placeholder={!e.docs.ear ? "CNH sem a observação EAR" : "Ex.: foto do documento ilegível"} autoFocus />
            </Campo>
          )}
        </>
      ) : editando ? (
        <div className="form-grade">
          <Campo rotulo="Telefone">
            <input value={form.telefone} onChange={(x) => setForm({ ...form, telefone: x.target.value })} />
          </Campo>
          <Campo rotulo="Moto">
            <input value={form.moto} onChange={(x) => setForm({ ...form, moto: x.target.value })} />
          </Campo>
          <Campo rotulo="Placa" dica="Formato ABC1D23">
            <input value={form.placa} onChange={(x) => setForm({ ...form, placa: x.target.value })} />
          </Campo>
          <Campo rotulo="Chave Pix para repasse">
            <input value={form.pix} onChange={(x) => setForm({ ...form, pix: x.target.value })} />
          </Campo>
        </div>
      ) : (
        <>
          <div className="gv-numeros">
            <div>
              <small>Nota</small>
              <strong>{e.nota.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
            </div>
            <div>
              <small>Corridas</small>
              <strong>{num(e.corridasTotal)}</strong>
            </div>
            <div>
              <small>7 dias</small>
              <strong>{semana.length}</strong>
            </div>
            <div>
              <small>Repasses 7 dias</small>
              <strong>{reais(semana.reduce((a, c) => a + c.repasse, 0))}</strong>
            </div>
          </div>
          <h4 className="gv-sec">Documentos</h4>
          <ul className="docs">
            <li className="ok">
              <IdCard size={15} />
              <span>CNH {e.docs.cnhCategoria}</span>
              <small>
                válida até {dataCurta(e.docs.cnhValidade)}/{anoDe(e.docs.cnhValidade)}
              </small>
            </li>
            <li className={e.docs.ear ? "ok" : "ruim"}>
              <BadgeCheck size={15} />
              <span>EAR</span>
              <small>{e.docs.ear ? "conferida" : "pendente"}</small>
            </li>
            <li className="ok">
              <Bike size={15} />
              <span>Moto</span>
              <small>{e.moto}</small>
            </li>
          </ul>
          <h4 className="gv-sec">Últimas corridas</h4>
          {recentes.length === 0 ? (
            <p className="muted">Nenhuma corrida ainda.</p>
          ) : (
            <ul className="mini-corridas">
              {recentes.map((c) => (
                <li key={c.id}>
                  <span>
                    <strong>{c.id}</strong> {c.coleta.bairro} para {c.destino.bairro}
                  </span>
                  <small>
                    {quando(c.criadaEm, st.agora)} · {reais(c.repasse)}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {e.status === "recusado" && e.docs.motivoRecusa && <p className="app-erro">Recusado: {e.docs.motivoRecusa}</p>}
      {erro && !recusando && <p className="app-erro">{erro}</p>}
    </Gaveta>
  );
}

function ModalCadastro({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const st = useStore();
  const vazio = { nome: "", telefone: "", moto: "Honda CG 160 Fan", placa: "", cnh: "", ear: true, validade: "2029-05-31", bairro: BAIRROS[0] as string };
  const [f, setF] = useState(vazio);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const salvar = async () => {
    setCarregando(true);
    setErro(null);
    const idx = BAIRROS.indexOf(f.bairro as (typeof BAIRROS)[number]);
    const base: [number, number] = [(idx % 3) * 4 + 2, idx < 3 ? 2 : 7];
    const r = await st.cadastrarEntregador({ nome: f.nome, telefone: f.telefone, moto: f.moto, placa: f.placa, cnhNumero: f.cnh, ear: f.ear, validade: Date.parse(`${f.validade}T12:00:00Z`) || st.agora + 365 * DIA, base: [Math.min(COLS - 1, base[0]), Math.min(ROWS - 1, base[1])] });
    setCarregando(false);
    if (!r.ok) return setErro(r.erro);
    st.toast(`Cadastro de ${f.nome.split(" ")[0]} criado e enviado para análise.`, "ok");
    setF(vazio);
    onFechar();
  };
  return (
    <Modal
      aberto={aberto}
      titulo="Cadastrar entregador"
      onFechar={onFechar}
      rodape={
        <>
          <button className="btn btn-claro" onClick={onFechar}>
            Cancelar
          </button>
          <button className="btn btn-primario" onClick={salvar} disabled={carregando}>
            {carregando ? <Spinner /> : "Enviar para análise"}
          </button>
        </>
      }
    >
      <div className="form-grade">
        <Campo rotulo="Nome completo">
          <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Nome e sobrenome" />
        </Campo>
        <Campo rotulo="Telefone">
          <input value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} placeholder="(11) 90000-0000" inputMode="tel" />
        </Campo>
        <Campo rotulo="Moto">
          <input value={f.moto} onChange={(e) => setF({ ...f, moto: e.target.value })} />
        </Campo>
        <Campo rotulo="Placa" dica="Formato ABC1D23">
          <input value={f.placa} onChange={(e) => setF({ ...f, placa: e.target.value })} placeholder="ABC1D23" />
        </Campo>
        <Campo rotulo="Número da CNH" dica="11 dígitos">
          <input value={f.cnh} onChange={(e) => setF({ ...f, cnh: e.target.value })} inputMode="numeric" />
        </Campo>
        <Campo rotulo="Validade da CNH">
          <input type="date" value={f.validade} onChange={(e) => setF({ ...f, validade: e.target.value })} />
        </Campo>
        <Campo rotulo="Bairro onde costuma rodar">
          <select value={f.bairro} onChange={(e) => setF({ ...f, bairro: e.target.value })}>
            {BAIRROS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </Campo>
        <label className="check">
          <input type="checkbox" checked={f.ear} onChange={(e) => setF({ ...f, ear: e.target.checked })} />
          <span>A CNH tem a observação EAR</span>
        </label>
      </div>
      {erro && <p className="app-erro">{erro}</p>}
      <p className="modal-txt pequeno">
        <CheckCircle2 size={13} /> O cadastro entra em análise e só vai para a distribuição depois de aprovado.
      </p>
    </Modal>
  );
}

export { bairroDe };
