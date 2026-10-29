"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, ChevronLeft, ChevronRight, KeyRound, Plus, Search, WifiOff } from "lucide-react";
import { Avatar, Skel, StatusCorridaTag, Vazio, useCarregando } from "../ui";
import { useStore, ativa } from "@/lib/store";
import { km, nomeCurto, quando, reais, semAcento } from "@/lib/format";
import type { StatusCorrida } from "@/lib/types";
import { GavetaCorrida, ModalNovaCorrida } from "./CorridaUI";
import { useSel } from "./Shell";

type Filtro = "todas" | "abertas" | StatusCorrida;
type Ordem = "recentes" | "antigas" | "valor" | "distancia";
const POR_PAGINA = 12;

export default function Corridas() {
  const st = useStore();
  const sel = useSel();
  const carregando = useCarregando(700);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [ordem, setOrdem] = useState<Ordem>("recentes");
  const [pagina, setPagina] = useState(0);
  const [aberta, setAberta] = useState<string | null>(null);
  const [nova, setNova] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [buscaAplicada, setBuscaAplicada] = useState("");

  // search answers like an API: a short wait, then the filtered list
  useEffect(() => {
    if (busca === buscaAplicada) return;
    setBuscando(true);
    const t = setTimeout(() => {
      setBuscaAplicada(busca);
      setBuscando(false);
      setPagina(0);
    }, 350);
    return () => clearTimeout(t);
  }, [busca, buscaAplicada]);

  const empNome = useMemo(() => new Map(st.empresas.map((e) => [e.id, e.nome])), [st.empresas]);
  const contagem = (f: Filtro) => st.corridas.filter((c) => (f === "todas" ? true : f === "abertas" ? ativa(c) : c.status === f)).length;

  const lista = useMemo(() => {
    const q = semAcento(buscaAplicada.trim());
    const out = st.corridas.filter((c) => {
      if (filtro === "abertas" ? !ativa(c) : filtro !== "todas" && c.status !== filtro) return false;
      if (!q) return true;
      const ent = st.entregadores.find((e) => e.id === c.entregadorId)?.nome ?? "";
      return semAcento(`${c.id} ${empNome.get(c.empresaId) ?? ""} ${ent} ${c.destino.contato} ${c.destino.bairro} ${c.destino.endereco}`).includes(q);
    });
    out.sort((a, b) => (ordem === "recentes" ? b.criadaEm - a.criadaEm : ordem === "antigas" ? a.criadaEm - b.criadaEm : ordem === "valor" ? b.preco - a.preco : b.kmRota - a.kmRota));
    return out;
  }, [st.corridas, st.entregadores, filtro, ordem, buscaAplicada, empNome]);

  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const pg = Math.min(pagina, paginas - 1);
  const visiveis = lista.slice(pg * POR_PAGINA, pg * POR_PAGINA + POR_PAGINA);
  const FILTROS: [Filtro, string][] = [
    ["todas", "Todas"],
    ["abertas", "Abertas"],
    ["aguardando", "Aguardando"],
    ["em_rota", "Em rota"],
    ["entregue", "Entregues"],
    ["cancelada", "Canceladas"],
  ];

  return (
    <div className="pg">
      <div className="pg-cab">
        <div>
          <h1>Corridas</h1>
          <p>Toda corrida dos últimos 7 dias, com o preço travado no pedido, o entregador, o código e as quedas de sinal.</p>
        </div>
        <button className="btn btn-primario" onClick={() => setNova(true)}>
          <Plus size={16} /> Nova corrida
        </button>
      </div>

      <div className="barra-filtros">
        <div className="input-icone grande">
          <Search size={16} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por código, empresa, entregador, destinatário ou bairro" aria-label="Buscar corridas" />
        </div>
        <label className="ordem">
          <ArrowDownUp size={15} />
          <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} aria-label="Ordenar">
            <option value="recentes">Mais recentes</option>
            <option value="antigas">Mais antigas</option>
            <option value="valor">Maior valor</option>
            <option value="distancia">Maior distância</option>
          </select>
        </label>
      </div>
      <div className="chips">
        {FILTROS.map(([f, rot]) => (
          <button
            key={f}
            className={`chip ${filtro === f ? "ativo" : ""}`}
            onClick={() => {
              setFiltro(f);
              setPagina(0);
            }}
          >
            {rot} <em>{contagem(f)}</em>
          </button>
        ))}
      </div>

      <div className="tabela-wrap cartao">
        {carregando || buscando ? (
          <div className="lista-skel">
            {Array.from({ length: 8 }, (_, i) => (
              <Skel key={i} h={46} />
            ))}
          </div>
        ) : visiveis.length === 0 ? (
          <Vazio
            titulo="Nenhuma corrida encontrada"
            texto={buscaAplicada ? `Nada com "${buscaAplicada}" neste filtro.` : "Nenhuma corrida neste filtro."}
            acao={
              <button
                className="btn btn-claro btn-pequeno"
                onClick={() => {
                  setBusca("");
                  setFiltro("todas");
                }}
              >
                Limpar filtros
              </button>
            }
          />
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Corrida</th>
                <th>Empresa</th>
                <th className="col-m">Destino</th>
                <th className="col-m">Entregador</th>
                <th className="num">Rua</th>
                <th className="num">Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((c, i) => {
                const e = st.entregadores.find((x) => x.id === c.entregadorId);
                return (
                  <tr key={c.id} onClick={() => setAberta(c.id)} onMouseEnter={() => ativa(c) && sel.setCorridaFoco(c.id)} style={{ animationDelay: `${i * 0.025}s` }}>
                    <td>
                      <strong>{c.id}</strong>
                      <small>{quando(c.criadaEm, st.agora)}</small>
                    </td>
                    <td>
                      <span className="trunca">{empNome.get(c.empresaId) ?? "Empresa removida"}</span>
                    </td>
                    <td className="col-m">
                      <span className="trunca">{c.destino.contato}</span>
                      <small>{c.destino.bairro}</small>
                    </td>
                    <td className="col-m">
                      {e ? (
                        <span className="td-ent">
                          <Avatar chave={e.foto} nome={e.nome} size={26} /> {nomeCurto(e.nome)}
                        </span>
                      ) : (
                        <span className="muted">Sem entregador</span>
                      )}
                    </td>
                    <td className="num">{km(c.kmRota)}</td>
                    <td className="num">
                      <strong>{reais(c.preco)}</strong>
                    </td>
                    <td>
                      <span className="td-status">
                        <StatusCorridaTag s={c.status} />
                        {c.confirmadaPorCodigo && <KeyRound size={13} aria-label="Fechada com código" />}
                        {c.quedasSinal > 0 && <WifiOff size={13} aria-label="Teve queda de sinal" className="txt-alerta" />}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="paginacao">
        <span>
          {lista.length === 0 ? "0" : `${pg * POR_PAGINA + 1} a ${Math.min(lista.length, (pg + 1) * POR_PAGINA)}`} de {lista.length}
        </span>
        <div>
          <button className="icon-btn" aria-label="Página anterior" disabled={pg === 0} onClick={() => setPagina(pg - 1)}>
            <ChevronLeft size={18} />
          </button>
          <span>
            {pg + 1} / {paginas}
          </span>
          <button className="icon-btn" aria-label="Próxima página" disabled={pg >= paginas - 1} onClick={() => setPagina(pg + 1)}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <GavetaCorrida id={aberta} onFechar={() => setAberta(null)} />
      <ModalNovaCorrida aberto={nova} onFechar={() => setNova(false)} />
    </div>
  );
}
