"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, Building2, Mail, MapPin, Pause, Pencil, Phone, Play, Plus, Search, Trash2 } from "lucide-react";
import { Avatar, Campo, Foto, Modal, Skel, Spinner, Vazio, useCarregando } from "../ui";
import { useStore, ativa, type DadosEmpresa } from "@/lib/store";
import { COLS, ROWS, enderecoDe } from "@/lib/cidade";
import { SEGMENTOS } from "@/lib/mock/empresas";
import { dataCurta, mesmoDia, num, reais, semAcento } from "@/lib/format";
import type { Empresa, Segmento } from "@/lib/types";
import { useSel } from "./Shell";

type Ordem = "nome" | "corridas" | "gasto";

export default function Empresas() {
  const st = useStore();
  const sel = useSel();
  const carregando = useCarregando(600);
  const [busca, setBusca] = useState("");
  const [seg, setSeg] = useState<Segmento | "todos">("todos");
  const [status, setStatus] = useState<"todas" | "ativa" | "suspensa">("todas");
  const [ordem, setOrdem] = useState<Ordem>("corridas");
  const [edit, setEdit] = useState<Empresa | "nova" | null>(null);
  const [excluir, setExcluir] = useState<Empresa | null>(null);
  const [carregandoId, setCarregandoId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const m = new Map<string, { semana: number; gasto: number; hoje: number; abertas: number }>();
    for (const c of st.corridas) {
      const s = m.get(c.empresaId) ?? { semana: 0, gasto: 0, hoje: 0, abertas: 0 };
      s.semana++;
      if (c.status === "entregue") s.gasto += c.preco;
      if (mesmoDia(c.criadaEm, st.agora)) s.hoje++;
      if (ativa(c)) s.abertas++;
      m.set(c.empresaId, s);
    }
    return m;
  }, [st.corridas, st.agora]);

  const lista = useMemo(() => {
    const q = semAcento(busca.trim());
    const out = st.empresas
      .filter((e) => (seg === "todos" ? true : e.segmento === seg))
      .filter((e) => (status === "todas" ? true : e.status === status))
      .filter((e) => !q || semAcento(`${e.nome} ${e.contato} ${e.cnpj} ${e.coleta.bairro}`).includes(q));
    const st0 = (id: string) => stats.get(id) ?? { semana: 0, gasto: 0, hoje: 0, abertas: 0 };
    out.sort((a, b) => (ordem === "nome" ? a.nome.localeCompare(b.nome, "pt-BR") : ordem === "corridas" ? st0(b.id).semana - st0(a.id).semana : st0(b.id).gasto - st0(a.id).gasto));
    return out;
  }, [st.empresas, busca, seg, status, ordem, stats]);

  const segsUsados = [...new Set(st.empresas.map((e) => e.segmento))];

  const suspender = async (e: Empresa) => {
    setCarregandoId(e.id);
    await st.alternarSuspensa(e.id);
    setCarregandoId(null);
    st.toast(e.status === "ativa" ? `${e.nome} suspensa: novos pedidos ficam bloqueados.` : `${e.nome} reativada.`, "info");
  };

  return (
    <div className="pg">
      <div className="pg-cab">
        <div>
          <h1>Empresas</h1>
          <p>Quem pede entregas: endereço de coleta, contato, volume da semana e quanto já foi entregue.</p>
        </div>
        <button className="btn btn-primario" onClick={() => setEdit("nova")}>
          <Plus size={16} /> Nova empresa
        </button>
      </div>
      <div className="barra-filtros">
        <div className="input-icone grande">
          <Search size={16} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, contato, CNPJ ou bairro" aria-label="Buscar empresas" />
        </div>
        <label className="ordem">
          <Building2 size={15} />
          <select value={seg} onChange={(e) => setSeg(e.target.value as Segmento | "todos")} aria-label="Segmento">
            <option value="todos">Todos os segmentos</option>
            {segsUsados.map((s) => (
              <option key={s} value={s}>
                {SEGMENTOS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="ordem">
          <ArrowDownUp size={15} />
          <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} aria-label="Ordenar">
            <option value="corridas">Mais corridas</option>
            <option value="gasto">Maior valor</option>
            <option value="nome">Nome</option>
          </select>
        </label>
      </div>
      <div className="chips">
        {(["todas", "ativa", "suspensa"] as const).map((s) => (
          <button key={s} className={`chip ${status === s ? "ativo" : ""}`} onClick={() => setStatus(s)}>
            {s === "todas" ? "Todas" : s === "ativa" ? "Ativas" : "Suspensas"} <em>{st.empresas.filter((e) => s === "todas" || e.status === s).length}</em>
          </button>
        ))}
      </div>

      {carregando ? (
        <div className="cards-emp">
          {Array.from({ length: 6 }, (_, i) => (
            <Skel key={i} h={230} r={18} />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <Vazio titulo="Nenhuma empresa encontrada" texto="Tente outro nome ou outro segmento." />
      ) : (
        <div className="cards-emp">
          {lista.map((e, i) => {
            const s = stats.get(e.id) ?? { semana: 0, gasto: 0, hoje: 0, abertas: 0 };
            return (
              <article key={e.id} className={`card-emp entra d${(i % 4) + 1} ${e.status === "suspensa" ? "suspensa" : ""}`} onMouseEnter={() => sel.setComparar(null)}>
                <div className="card-emp-foto">
                  <Foto chave={e.foto} w={560} h={260} alt={e.nome} />
                  <span className="card-emp-seg">{SEGMENTOS[e.segmento]}</span>
                  {e.status === "suspensa" && <span className="card-emp-susp">Suspensa</span>}
                </div>
                <div className="card-emp-corpo">
                  <h3>{e.nome}</h3>
                  <span className="card-emp-end">
                    <MapPin size={13} /> {e.coleta.endereco} · {e.coleta.bairro}
                  </span>
                  <div className="card-emp-contato">
                    <Avatar chave={e.contatoFoto} nome={e.contato} size={30} />
                    <span>
                      <strong>{e.contato}</strong>
                      <small>{e.telefone}</small>
                    </span>
                  </div>
                  <div className="card-emp-num">
                    <span>
                      <strong>{s.hoje}</strong> hoje
                    </span>
                    <span>
                      <strong>{s.semana}</strong> em 7 dias
                    </span>
                    <span>
                      <strong>{reais(s.gasto)}</strong> entregues
                    </span>
                  </div>
                  <div className="card-emp-acoes">
                    <button className="btn btn-claro btn-pequeno" onClick={() => setEdit(e)}>
                      <Pencil size={14} /> Editar
                    </button>
                    <button className="btn btn-claro btn-pequeno" onClick={() => suspender(e)} disabled={carregandoId === e.id}>
                      {carregandoId === e.id ? <Spinner /> : e.status === "ativa" ? (
                        <>
                          <Pause size={14} /> Suspender
                        </>
                      ) : (
                        <>
                          <Play size={14} /> Reativar
                        </>
                      )}
                    </button>
                    <button className="icon-btn perigo" aria-label={`Excluir ${e.nome}`} onClick={() => setExcluir(e)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <ModalEmpresa alvo={edit} onFechar={() => setEdit(null)} />
      <ModalExcluir e={excluir} onFechar={() => setExcluir(null)} />
    </div>
  );
}

function ModalEmpresa({ alvo, onFechar }: { alvo: Empresa | "nova" | null; onFechar: () => void }) {
  const st = useStore();
  const nova = alvo === "nova";
  const base = alvo && alvo !== "nova" ? alvo : null;
  const [f, setF] = useState<{ nome: string; segmento: Segmento; cnpj: string; contato: string; telefone: string; email: string; x: number; y: number }>({ nome: "", segmento: "farmacia", cnpj: "", contato: "", telefone: "", email: "", x: 3, y: 2 });
  const [chave, setChave] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const k = alvo === "nova" ? "nova" : alvo?.id ?? null;
  if (k !== chave) {
    setChave(k);
    setErro(null);
    if (base) setF({ nome: base.nome, segmento: base.segmento, cnpj: base.cnpj, contato: base.contato, telefone: base.telefone, email: base.email, x: base.coleta.no[0], y: base.coleta.no[1] });
    else setF({ nome: "", segmento: "farmacia", cnpj: "", contato: "", telefone: "", email: "", x: 3, y: 2 });
  }
  const coleta = enderecoDe([f.x, f.y], 1);
  const salvar = async () => {
    if (f.nome.trim().length < 3) return setErro("Informe o nome da empresa.");
    if (f.contato.trim().length < 3) return setErro("Informe o nome do contato.");
    setCarregando(true);
    setErro(null);
    const d: DadosEmpresa = { nome: f.nome, segmento: f.segmento, cnpj: f.cnpj, contato: f.contato.trim(), telefone: f.telefone, email: f.email, coleta: base && base.coleta.no[0] === f.x && base.coleta.no[1] === f.y ? base.coleta : coleta };
    const r = await st.salvarEmpresa(base?.id ?? null, d);
    setCarregando(false);
    if (!r.ok) return setErro(r.erro);
    st.toast(nova ? `${f.nome.trim()} cadastrada. Ela já pode pedir entregas.` : "Dados da empresa salvos.", "ok");
    onFechar();
  };
  return (
    <Modal
      aberto={!!alvo}
      titulo={nova ? "Nova empresa" : `Editar ${base?.nome ?? ""}`}
      onFechar={onFechar}
      largura={600}
      rodape={
        <>
          <button className="btn btn-claro" onClick={onFechar}>
            Cancelar
          </button>
          <button className="btn btn-primario" onClick={salvar} disabled={carregando}>
            {carregando ? <Spinner /> : nova ? "Cadastrar" : "Salvar"}
          </button>
        </>
      }
    >
      <div className="form-grade">
        <Campo rotulo="Nome da empresa">
          <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
        </Campo>
        <Campo rotulo="Segmento">
          <select value={f.segmento} onChange={(e) => setF({ ...f, segmento: e.target.value as Segmento })}>
            {Object.entries(SEGMENTOS).map(([k2, v]) => (
              <option key={k2} value={k2}>
                {v}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="CNPJ" dica="14 dígitos">
          <input value={f.cnpj} onChange={(e) => setF({ ...f, cnpj: e.target.value })} placeholder="00.000.000/0001-00" inputMode="numeric" />
        </Campo>
        <Campo rotulo="Contato">
          <input value={f.contato} onChange={(e) => setF({ ...f, contato: e.target.value })} />
        </Campo>
        <Campo rotulo="Telefone">
          <span className="input-icone">
            <Phone size={14} />
            <input value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} />
          </span>
        </Campo>
        <Campo rotulo="E-mail">
          <span className="input-icone">
            <Mail size={14} />
            <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </span>
        </Campo>
        <Campo rotulo="Ponto de coleta: coluna">
          <input type="number" min={0} max={COLS - 1} value={f.x} onChange={(e) => setF({ ...f, x: Math.max(0, Math.min(COLS - 1, +e.target.value || 0)) })} />
        </Campo>
        <Campo rotulo="Ponto de coleta: linha">
          <input type="number" min={0} max={ROWS - 1} value={f.y} onChange={(e) => setF({ ...f, y: Math.max(0, Math.min(ROWS - 1, +e.target.value || 0)) })} />
        </Campo>
      </div>
      <p className="modal-txt">
        <MapPin size={13} /> Coleta em {base && base.coleta.no[0] === f.x && base.coleta.no[1] === f.y ? base.coleta.endereco : coleta.endereco}, {coleta.bairro}.
      </p>
      {base && <p className="modal-txt pequeno">Cliente desde {dataCurta(base.desde)}. {num(base.corridasMes)} corridas antes desta semana.</p>}
      {erro && <p className="app-erro">{erro}</p>}
    </Modal>
  );
}

function ModalExcluir({ e, onFechar }: { e: Empresa | null; onFechar: () => void }) {
  const st = useStore();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const excluir = async () => {
    if (!e) return;
    setCarregando(true);
    setErro(null);
    const r = await st.excluirEmpresa(e.id);
    setCarregando(false);
    if (!r.ok) return setErro(r.erro);
    st.toast(`${e.nome} excluída. O histórico de corridas continua no relatório.`, "info");
    onFechar();
  };
  return (
    <Modal
      aberto={!!e}
      titulo="Excluir empresa"
      onFechar={() => {
        setErro(null);
        onFechar();
      }}
      largura={460}
      rodape={
        <>
          <button className="btn btn-claro" onClick={onFechar}>
            Manter
          </button>
          <button className="btn btn-perigo" onClick={excluir} disabled={carregando}>
            {carregando ? <Spinner /> : "Excluir"}
          </button>
        </>
      }
    >
      <p className="modal-txt">
        Excluir <strong>{e?.nome}</strong>? Ela deixa de poder pedir entregas. As corridas já feitas ficam no histórico.
      </p>
      {erro && <p className="app-erro">{erro}</p>}
    </Modal>
  );
}
