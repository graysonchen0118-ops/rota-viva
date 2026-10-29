"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronRight, Clock3, History, Home, Lock, MapPin, MessageCircle, Package, PackagePlus, Search, Send, Store, WifiOff, X } from "lucide-react";
import Phone, { Aba } from "./Phone";
import { Avatar, Spinner, StatusCorridaTag, Vazio } from "../ui";
import { useStore, sinalDe, ativa } from "@/lib/store";
import { cotacao, enderecoDe, fimDaPerna, noMaisProximo } from "@/lib/cidade";
import { DESTINOS, type Destino } from "@/lib/mock/corridas";
import { EMPRESA_SIMULADOR } from "@/lib/mock/empresas";
import { duracao, ha, hhmm, km, mesmoDia, primeiroNome, quando, reais, semAcento } from "@/lib/format";
import type { Corrida } from "@/lib/types";

type Tela = "inicio" | "pedir" | "historico" | "acompanhar";

export default function AppEmpresa() {
  const st = useStore();
  const emp = st.empresas.find((e) => e.id === EMPRESA_SIMULADOR)!;
  const [tela, setTela] = useState<Tela>("inicio");
  const [acompId, setAcompId] = useState<string | null>(null);
  const minhas = st.corridas.filter((c) => c.empresaId === emp.id);
  const abertas = minhas.filter(ativa).sort((a, b) => b.criadaEm - a.criadaEm);

  const abrir = (id: string) => {
    setAcompId(id);
    setTela("acompanhar");
  };

  return (
    <Phone
      hora={hhmm(st.agora)}
      rotulo="Celular da Farmácia Bem Viver"
      tela={tela}
      abas={
        <>
          <Aba ativa={tela === "inicio" || tela === "acompanhar"} onClick={() => setTela("inicio")} icone={<Home size={19} />} rotulo="Início" badge={abertas.length} />
          <Aba ativa={tela === "pedir"} onClick={() => setTela("pedir")} icone={<PackagePlus size={19} />} rotulo="Pedir" />
          <Aba ativa={tela === "historico"} onClick={() => setTela("historico")} icone={<History size={19} />} rotulo="Histórico" />
        </>
      }
    >
      {tela === "inicio" && <Inicio abertas={abertas} minhas={minhas} onPedir={() => setTela("pedir")} onAbrir={abrir} />}
      {tela === "pedir" && <Pedir onPedido={abrir} />}
      {tela === "historico" && <Historico minhas={minhas} onAbrir={abrir} />}
      {tela === "acompanhar" && acompId && <Acompanhar id={acompId} onVoltar={() => setTela("inicio")} />}
    </Phone>
  );
}

function Inicio({ abertas, minhas, onPedir, onAbrir }: { abertas: Corrida[]; minhas: Corrida[]; onPedir: () => void; onAbrir: (id: string) => void }) {
  const st = useStore();
  const hoje = minhas.filter((c) => mesmoDia(c.criadaEm, st.agora) && c.status !== "cancelada");
  const gasto = hoje.reduce((a, c) => a + c.preco, 0);
  return (
    <div className="app-pad">
      <div className="app-saud">
        <Avatar chave="contato-w1" nome="Patrícia Lemos" size={40} />
        <div>
          <span>Olá, Patrícia</span>
          <strong>Farmácia Bem Viver</strong>
        </div>
      </div>
      <button className="app-pedir" onClick={onPedir}>
        <span className="app-pedir-icone">
          <Package size={22} />
        </span>
        <span>
          <strong>Pedir uma entrega</strong>
          <small>Coleta aqui na loja, preço antes de confirmar</small>
        </span>
        <ChevronRight size={18} />
      </button>
      <div className="app-mini-kpis">
        <div>
          <strong>{hoje.length}</strong>
          <span>entregas hoje</span>
        </div>
        <div>
          <strong>{reais(gasto)}</strong>
          <span>no dia</span>
        </div>
      </div>
      <h4 className="app-sec">Em andamento</h4>
      {abertas.length === 0 ? (
        <div className="app-vazio">
          <Clock3 size={18} />
          <span>Nenhuma entrega na rua agora. Peça uma e ela aparece aqui.</span>
        </div>
      ) : (
        <div className="app-lista">
          {abertas.map((c) => (
            <LinhaCorrida key={c.id} c={c} onClick={() => onAbrir(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function LinhaSinal({ c }: { c: Corrida }) {
  const st = useStore();
  const e = st.entregadores.find((x) => x.id === c.entregadorId);
  if (!e || !["indo_coleta", "na_coleta", "em_rota", "no_destino"].includes(c.status)) return null;
  const sn = sinalDe(e, st.agora, st.modoComum);
  if (sn.tipo === "sem") {
    const no = noMaisProximo(e.posRecebida.x, e.posRecebida.y);
    return (
      <span className="sinal-linha sem">
        <WifiOff size={13} /> Sem sinal do entregador {ha(sn.idade)}. Última posição: {enderecoDe(no).endereco.split(",")[0]}
      </span>
    );
  }
  if (sn.tipo === "atraso")
    return (
      <span className="sinal-linha atraso">
        <Clock3 size={13} /> Posição recebida {ha(sn.idade)}
      </span>
    );
  return (
    <span className="sinal-linha vivo">
      <span className="ponto-vivo" /> Ao vivo, posição {ha(sn.idade)}
    </span>
  );
}

function LinhaCorrida({ c, onClick }: { c: Corrida; onClick: () => void }) {
  const st = useStore();
  const e = st.entregadores.find((x) => x.id === c.entregadorId);
  return (
    <button className="app-linha" onClick={onClick}>
      <div className="app-linha-topo">
        <strong>{c.destino.contato}</strong>
        <StatusCorridaTag s={c.status} />
      </div>
      <span className="app-linha-sub">
        {c.destino.endereco} · {c.destino.bairro}
      </span>
      <span className="app-linha-sub">{e ? `${primeiroNome(e.nome)} · ${e.moto}` : "Procurando o motoboy mais perto"}</span>
      <LinhaSinal c={c} />
    </button>
  );
}

function Pedir({ onPedido }: { onPedido: (id: string) => void }) {
  const st = useStore();
  const emp = st.empresas.find((e) => e.id === EMPRESA_SIMULADOR)!;
  const [busca, setBusca] = useState("");
  const [dest, setDest] = useState<Destino | null>(null);
  const [contato, setContato] = useState("");
  const [telefone, setTelefone] = useState("");
  const [obs, setObs] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const sugestoes = useMemo(() => {
    const q = semAcento(busca.trim());
    if (q.length < 2) return [];
    return DESTINOS.filter((d) => semAcento(`${d.endereco} ${d.bairro} ${d.contato}`).includes(q)).slice(0, 5);
  }, [busca]);
  const q = dest ? cotacao(emp.coleta.no, dest.no, st.tarifa) : null;

  const escolher = (d: Destino) => {
    setDest(d);
    setBusca("");
    setContato(d.contato);
    setTelefone(d.telefone);
    setObs(d.obs);
    setErro(null);
  };

  const enviar = async () => {
    if (!dest) return setErro("Escolha o endereço de entrega.");
    if (contato.trim().length < 3) return setErro("Informe quem vai receber.");
    setEnviando(true);
    setErro(null);
    const r = await st.pedirEntrega({ empresaId: emp.id, destino: { no: dest.no, endereco: dest.endereco, bairro: dest.bairro }, contato: contato.trim(), telefone, obs }, true);
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    st.toast("Entrega pedida. Procurando o motoboy livre mais perto pela rua.", "ok");
    setDest(null);
    onPedido(r.valor!);
  };

  return (
    <div className="app-pad">
      <h3 className="app-titulo">Nova entrega</h3>
      <div className="app-rota-box">
        <div className="app-rota-pt">
          <span className="pt pt-coleta">
            <Store size={13} />
          </span>
          <div>
            <small>Coleta</small>
            <strong>{emp.coleta.endereco}</strong>
            <span>{emp.coleta.bairro}</span>
          </div>
        </div>
        <div className="app-rota-pt">
          <span className="pt pt-destino">
            <MapPin size={13} />
          </span>
          {dest ? (
            <div>
              <small>Entrega</small>
              <strong>{dest.endereco}</strong>
              <span>{dest.bairro}</span>
              <button className="app-trocar" onClick={() => setDest(null)}>
                Trocar
              </button>
            </div>
          ) : (
            <div className="app-busca">
              <small>Entrega</small>
              <div className="input-icone">
                <Search size={15} />
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Rua, bairro ou nome de quem recebe" aria-label="Endereço de entrega" />
              </div>
            </div>
          )}
        </div>
        {!dest && sugestoes.length > 0 && (
          <ul className="app-sugestoes" role="listbox">
            {sugestoes.map((d) => (
              <li key={d.endereco}>
                <button onClick={() => escolher(d)} role="option" aria-selected={false}>
                  <MapPin size={14} />
                  <span>
                    <strong>{d.endereco}</strong>
                    <small>
                      {d.bairro} · {d.contato}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!dest && busca.trim().length >= 2 && sugestoes.length === 0 && <p className="app-nada">Nenhum endereço encontrado com &quot;{busca}&quot;.</p>}
        {!dest && busca.trim().length < 2 && (
          <div className="app-atalhos">
            <small>Clientes recentes</small>
            {DESTINOS.slice(0, 3).map((d) => (
              <button key={d.endereco} onClick={() => escolher(d)}>
                {d.contato.split(" ")[0]} · {d.bairro}
              </button>
            ))}
          </div>
        )}
      </div>
      {dest && (
        <>
          <div className="app-campos">
            <label>
              <span>Quem recebe</span>
              <input value={contato} onChange={(e) => setContato(e.target.value)} />
            </label>
            <label>
              <span>Telefone</span>
              <input value={telefone} onChange={(e) => setTelefone(e.target.value)} inputMode="tel" />
            </label>
            <label>
              <span>Observação para o motoboy</span>
              <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Portaria, bloco, referência" />
            </label>
          </div>
          {q && (
            <div className="app-cotacao">
              <div>
                <small>Pela rua</small>
                <strong>{km(q.kmRota)}</strong>
              </div>
              <div>
                <small>Valor</small>
                <strong className="valor">{reais(q.preco)}</strong>
              </div>
              <span className="app-trava">
                <Lock size={12} /> Preço travado neste pedido
              </span>
            </div>
          )}
        </>
      )}
      {erro && <p className="app-erro">{erro}</p>}
      <button className="btn btn-primario btn-bloco" onClick={enviar} disabled={enviando || !dest}>
        {enviando ? (
          <>
            <Spinner /> Enviando pedido
          </>
        ) : (
          <>
            <Send size={16} /> Confirmar entrega
          </>
        )}
      </button>
    </div>
  );
}

const PASSOS: { s: Corrida["status"][]; rot: string; campo: keyof Corrida }[] = [
  { s: ["aguardando"], rot: "Pedido criado", campo: "criadaEm" },
  { s: ["indo_coleta"], rot: "Motoboy a caminho", campo: "aceitaEm" },
  { s: ["na_coleta"], rot: "Chegou na loja", campo: "chegouColetaEm" },
  { s: ["em_rota"], rot: "Saiu para entrega", campo: "coletadaEm" },
  { s: ["no_destino"], rot: "Chegou no destino", campo: "chegouDestinoEm" },
  { s: ["entregue"], rot: "Entregue com código", campo: "entregueEm" },
];

function Acompanhar({ id, onVoltar }: { id: string; onVoltar: () => void }) {
  const st = useStore();
  const c = st.corridas.find((x) => x.id === id);
  const [cancelando, setCancelando] = useState(false);
  const [confirmaCancel, setConfirmaCancel] = useState(false);
  if (!c) return <Vazio titulo="Corrida não encontrada" texto="Ela pode ter sido removida." />;
  const e = st.entregadores.find((x) => x.id === c.entregadorId);
  const eta = c.perna ? Math.max(0, fimDaPerna(c.perna) - st.agora) : 0;
  const podeCancelar = ["aguardando", "indo_coleta", "na_coleta"].includes(c.status);

  const cancelar = async () => {
    setCancelando(true);
    const r = await st.cancelar(c.id, "A empresa cancelou pelo app");
    setCancelando(false);
    setConfirmaCancel(false);
    st.toast(r.ok ? "Entrega cancelada." : r.erro, r.ok ? "info" : "erro");
  };

  return (
    <div className="app-pad">
      <button className="app-voltar" onClick={onVoltar}>
        <ArrowLeft size={16} /> Voltar
      </button>
      <div className="app-acomp-cab">
        <div>
          <small>{c.id}</small>
          <h3>{c.destino.contato}</h3>
          <span>
            {c.destino.endereco} · {c.destino.bairro}
          </span>
        </div>
        <StatusCorridaTag s={c.status} />
      </div>
      {c.status === "aguardando" && (
        <div className="app-procurando">
          <Spinner size={18} />
          <span>Oferecendo ao motoboy livre mais perto pela rua. Se ele não aceitar em 30 s, vai para o próximo.</span>
        </div>
      )}
      {e && c.status !== "cancelada" && (
        <div className="app-entregador">
          <Avatar chave={e.foto} nome={e.nome} size={44} />
          <div>
            <strong>{e.nome}</strong>
            <span>
              {e.moto} · {e.placa}
            </span>
            <LinhaSinal c={c} />
          </div>
        </div>
      )}
      {c.perna && (
        <div className="app-eta">
          <Clock3 size={15} />
          {c.status === "indo_coleta" ? "Chega na loja" : "Chega no destino"} em cerca de {duracao(eta)}
          <div className="barra">
            <span style={{ width: `${Math.min(100, Math.max(4, (1 - eta / Math.max(1, fimDaPerna(c.perna) - c.perna.inicio)) * 100))}%` }} />
          </div>
        </div>
      )}
      <ol className="app-passos">
        {PASSOS.map((p, i) => {
          const t = c[p.campo] as number | undefined;
          const feito = !!t;
          return (
            <li key={i} className={feito ? "feito" : ""}>
              <span className="app-passo-bola">{feito ? <Check size={12} /> : null}</span>
              <span>{p.rot}</span>
              <small>{t ? hhmm(t) : ""}</small>
            </li>
          );
        })}
      </ol>
      {c.status !== "cancelada" && c.status !== "entregue" && (
        <div className="app-codigo">
          <div>
            <small>Código de entrega</small>
            <strong>{c.codigoEntrega}</strong>
            <span>O motoboy só fecha a entrega com esse número, dito por quem recebe.</span>
          </div>
          <button className="btn btn-claro btn-pequeno" onClick={() => st.toast(`Mensagem com o código ${c.codigoEntrega} pronta para ${primeiroNome(c.destino.contato)} no WhatsApp.`, "ok")}>
            <MessageCircle size={15} /> Enviar
          </button>
        </div>
      )}
      {c.status === "entregue" && (
        <div className="app-entregue">
          <Check size={18} />
          <span>
            Entregue às {hhmm(c.entregueEm!)}, confirmada com o código. {reais(c.preco)} pela rota de {km(c.kmRota)}.
          </span>
        </div>
      )}
      {c.status === "cancelada" && <div className="app-cancelada">Cancelada às {hhmm(c.canceladaEm!)}. {c.motivoCancelamento}</div>}
      {podeCancelar &&
        (confirmaCancel ? (
          <div className="app-confirma">
            <span>Cancelar esta entrega?</span>
            <button className="btn btn-perigo btn-pequeno" onClick={cancelar} disabled={cancelando}>
              {cancelando ? <Spinner /> : "Sim, cancelar"}
            </button>
            <button className="btn btn-claro btn-pequeno" onClick={() => setConfirmaCancel(false)}>
              Não
            </button>
          </div>
        ) : (
          <button className="app-link-perigo" onClick={() => setConfirmaCancel(true)}>
            <X size={14} /> Cancelar entrega
          </button>
        ))}
    </div>
  );
}

function Historico({ minhas, onAbrir }: { minhas: Corrida[]; onAbrir: (id: string) => void }) {
  const st = useStore();
  const [filtro, setFiltro] = useState<"todas" | "entregue" | "cancelada">("todas");
  const [busca, setBusca] = useState("");
  const lista = minhas
    .filter((c) => (filtro === "todas" ? true : c.status === filtro))
    .filter((c) => !busca.trim() || semAcento(`${c.id} ${c.destino.contato} ${c.destino.bairro} ${c.destino.endereco}`).includes(semAcento(busca.trim())))
    .sort((a, b) => b.criadaEm - a.criadaEm);
  const total = lista.filter((c) => c.status === "entregue").reduce((a, c) => a + c.preco, 0);
  return (
    <div className="app-pad">
      <h3 className="app-titulo">Histórico</h3>
      <div className="input-icone">
        <Search size={15} />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, bairro ou código" aria-label="Buscar no histórico" />
      </div>
      <div className="chips">
        {(["todas", "entregue", "cancelada"] as const).map((f) => (
          <button key={f} className={`chip ${filtro === f ? "ativo" : ""}`} onClick={() => setFiltro(f)}>
            {f === "todas" ? "Todas" : f === "entregue" ? "Entregues" : "Canceladas"}
          </button>
        ))}
      </div>
      <div className="app-total">
        <span>{lista.length} corridas</span>
        <strong>{reais(total)} em entregas</strong>
      </div>
      {lista.length === 0 ? (
        <Vazio titulo="Nada por aqui" texto="Nenhuma corrida com esse filtro." />
      ) : (
        <div className="app-hist">
          {lista.slice(0, 40).map((c) => (
            <button key={c.id} className="app-hist-linha" onClick={() => onAbrir(c.id)}>
              <div>
                <strong>{c.destino.contato}</strong>
                <small>
                  {quando(c.criadaEm, st.agora)} · {c.destino.bairro} · {km(c.kmRota)}
                </small>
              </div>
              <div className="app-hist-dir">
                <strong>{reais(c.preco)}</strong>
                <StatusCorridaTag s={c.status} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
