"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Corrida, Empresa, Entregador, Evento, No, Ponto, Tarifa, Toast } from "./types";
import { EMPRESAS } from "./mock/empresas";
import { ENTREGADORES, ENTREGADOR_SEM_SINAL, ENTREGADOR_SIMULADOR } from "./mock/entregadores";
import { CORRIDAS, DESTINOS, SEQ_INICIAL, TARIFA_INICIAL } from "./mock/corridas";
import { MS_POR_QUADRA, cotacao, fimDaPerna, noMaisProximo, posicaoNaPerna, rota, quadras } from "./cidade";
import { INICIO, MIN, SEG, hhmm, nomeCurto, primeiroNome, semAcento } from "./format";
import { pulso, type Pulso } from "./bus";

// One in-memory "API" for the whole site. The two phones, the live map and the operations
// panel all read and write the same state, with network latency on every action, and a clock
// that moves the bikes along their street routes.

export const LIMITE_SEM_SINAL = 60 * SEG;
export const LIMITE_ATRASO = 20 * SEG;
const OFERTA_REAL_MS = 30_000;

export type Sinal = { tipo: "vivo" | "atraso" | "sem" | "off"; idade: number };

export function sinalDe(e: Entregador, agora: number, modoComum = false): Sinal {
  if (e.status !== "online" && e.status !== "em_corrida") return { tipo: "off", idade: 0 };
  const idade = Math.max(0, agora - e.ultimaPosicaoEm);
  if (modoComum) return { tipo: "vivo", idade: 0 };
  if (idade <= LIMITE_ATRASO) return { tipo: "vivo", idade };
  if (idade <= LIMITE_SEM_SINAL) return { tipo: "atraso", idade };
  return { tipo: "sem", idade };
}

export interface Oferta {
  corridaId: string;
  entregadorId: string;
  expiraEmReal: number;
  duracaoReal: number;
}

interface Estado {
  agora: number;
  velocidade: number;
  pausado: boolean;
  empresas: Empresa[];
  entregadores: Entregador[];
  corridas: Corrida[];
  tarifa: Tarifa;
  autoDistribuir: boolean;
  modoComum: boolean;
  oferta: Oferta | null;
  toasts: Toast[];
  log: Evento[];
  seq: number;
  proximaChegada: number;
}

// The 3D layer reads the clock between React renders through this object.
export const RELOGIO = { agora: INICIO, real: 0, vel: 8, pausado: false };
export const agoraInterpolado = () => {
  if (RELOGIO.pausado || !RELOGIO.real) return RELOGIO.agora;
  return RELOGIO.agora + Math.min(400, performance.now() - RELOGIO.real) * RELOGIO.vel;
};

function inicial(): Estado {
  const entregadores = ENTREGADORES.map((e) => ({ ...e, posRecebida: { ...e.posRecebida }, posReal: { ...e.posReal } }));
  const corridas = CORRIDAS.map((c) => ({ ...c }));
  // couriers already on a ride start where their leg puts them
  for (const c of corridas) {
    if (!c.entregadorId || !c.perna) continue;
    const e = entregadores.find((x) => x.id === c.entregadorId)!;
    const p = posicaoNaPerna(c.perna, INICIO);
    e.posReal = { x: p.x, y: p.y };
    e.posRecebida = { x: p.x, y: p.y };
    e.corridaId = c.id;
    e.status = "em_corrida";
  }
  // the courier whose signal dropped three minutes ago, still frozen where it was
  const ss = entregadores.find((e) => e.id === ENTREGADOR_SEM_SINAL)!;
  const cs = corridas.find((c) => c.id === ss.corridaId);
  if (cs?.perna) {
    const p = posicaoNaPerna(cs.perna, INICIO - 3 * MIN);
    ss.posRecebida = { x: p.x, y: p.y };
    ss.ultimaPosicaoEm = INICIO - 3 * MIN - 8 * SEG;
    ss.sinal = false;
    ss.alertado = true;
    ss.voltaEm = INICIO + 11 * MIN;
  }
  for (const c of corridas) if (c.status === "aguardando") c.atribuirEm = INICIO + (c.ofertas > 1 ? 25 : 55) * SEG;
  const log: Evento[] = [
    { id: 3, em: INICIO - 3 * MIN + 52 * SEG, texto: `${nomeCurto(ss.nome)} está sem sinal há 1 min. A última posição recebida fica marcada no mapa.`, tom: "alerta", entregadorId: ss.id, corridaId: cs?.id },
    { id: 2, em: INICIO - 6 * MIN, texto: "Corrida RV-48791 aceita por Rafael L. em 34 s.", tom: "ok", corridaId: "RV-48791" },
    { id: 1, em: INICIO - 9 * MIN, texto: "Pico do almoço começando: 14 entregadores online.", tom: "info" },
  ];
  return {
    agora: INICIO,
    velocidade: 8,
    pausado: false,
    empresas: EMPRESAS.map((e) => ({ ...e })),
    entregadores,
    corridas,
    tarifa: { ...TARIFA_INICIAL },
    autoDistribuir: true,
    modoComum: false,
    oferta: null,
    toasts: [],
    log,
    seq: SEQ_INICIAL,
    proximaChegada: INICIO + 2 * MIN,
  };
}

const ATIVOS = ["aguardando", "indo_coleta", "na_coleta", "em_rota", "no_destino"];
export const ativa = (c: Corrida) => ATIVOS.includes(c.status);
const simulado = (s: Estado, entId?: string) => entId === ENTREGADOR_SIMULADOR;

type Efeito = { pulso?: Pulso; toast?: Omit<Toast, "id">; evento?: Omit<Evento, "id"> };

function livreMaisProximo(s: Estado, alvo: No, excluir: string[] = []) {
  let melhor: { e: Entregador; q: number } | null = null;
  for (const e of s.entregadores) {
    if (e.status !== "online" || excluir.includes(e.id)) continue;
    if (e.id === ENTREGADOR_SIMULADOR) continue;
    const q = quadras(rota(e.parado, alvo));
    if (!melhor || q < melhor.q) melhor = { e, q };
  }
  return melhor?.e ?? null;
}

function atribuirA(s: Estado, c: Corrida, e: Entregador, agora: number, ef: Efeito[]) {
  const caminho = rota(e.parado, c.coleta.no);
  c.entregadorId = e.id;
  c.aceitaEm = agora;
  c.status = "indo_coleta";
  c.atribuirEm = undefined;
  c.perna = { caminho, inicio: agora, msPorQuadra: MS_POR_QUADRA };
  e.status = "em_corrida";
  e.corridaId = c.id;
  ef.push({ pulso: { tipo: "aceita", entregadorId: e.id }, evento: { em: agora, texto: `Corrida ${c.id} aceita por ${nomeCurto(e.nome)} em ${Math.max(1, Math.round((agora - c.criadaEm) / SEG))} s.`, tom: "ok", corridaId: c.id, entregadorId: e.id } });
}

function liberar(e: Entregador, no: No) {
  e.status = "online";
  e.corridaId = undefined;
  e.parado = no;
  e.posReal = { x: no[0], y: no[1] };
  if (e.sinal) e.posRecebida = { x: no[0], y: no[1] };
}

/** one step of the simulation; returns the next state and the side effects to fire after render */
function avancar(prev: Estado, dtReal: number, agoraReal: number): { s: Estado; ef: Efeito[] } {
  const ef: Efeito[] = [];
  const s: Estado = { ...prev, entregadores: prev.entregadores.map((e) => ({ ...e })), corridas: prev.corridas.slice() };
  const agora = prev.agora + dtReal * prev.velocidade;
  s.agora = agora;
  const porId = new Map(s.entregadores.map((e) => [e.id, e]));
  const idx = new Map(s.corridas.map((c, i) => [c.id, i]));
  const editar = (id: string) => {
    const i = idx.get(id)!;
    const c = { ...s.corridas[i] };
    s.corridas[i] = c;
    return c;
  };

  // 1. movement, arrivals and signal
  for (const e of s.entregadores) {
    if (e.status !== "online" && e.status !== "em_corrida") continue;
    if (!e.sinal && e.voltaEm && agora >= e.voltaEm) {
      e.sinal = true;
      e.voltaEm = undefined;
      e.alertado = false;
      ef.push({ pulso: { tipo: "sinalVoltou", entregadorId: e.id }, evento: { em: agora, texto: `O sinal de ${nomeCurto(e.nome)} voltou. A posição saltou para onde a moto realmente está.`, tom: "ok", entregadorId: e.id, corridaId: e.corridaId } });
    }
    if (e.corridaId) {
      const c0 = s.corridas[idx.get(e.corridaId)!];
      if (c0?.perna && (c0.status === "indo_coleta" || c0.status === "em_rota")) {
        const p = posicaoNaPerna(c0.perna, agora);
        e.posReal = { x: p.x, y: p.y };
        if (p.chegou) {
          const c = editar(c0.id);
          const fim = fimDaPerna(c0.perna);
          const ultimo = c0.perna.caminho[c0.perna.caminho.length - 1];
          e.parado = ultimo;
          c.perna = undefined;
          if (c0.status === "indo_coleta") {
            c.status = "na_coleta";
            c.chegouColetaEm = Math.min(agora, fim);
            if (!simulado(s, e.id)) c.esperaAte = agora + (1.2 + Math.random() * 2.5) * MIN;
          } else {
            c.status = "no_destino";
            c.chegouDestinoEm = Math.min(agora, fim);
            if (!simulado(s, e.id)) c.esperaAte = agora + (0.8 + Math.random() * 1.6) * MIN;
          }
          ef.push({ pulso: { tipo: "foco", entregadorId: e.id } });
        }
      }
    }
    if (e.sinal) {
      e.posRecebida = { ...e.posReal };
      e.ultimaPosicaoEm = agora;
    } else if (!e.alertado && agora - e.ultimaPosicaoEm > LIMITE_SEM_SINAL) {
      e.alertado = true;
      ef.push({
        pulso: { tipo: "semSinal", entregadorId: e.id },
        evento: { em: agora, texto: `${nomeCurto(e.nome)} está sem sinal há 1 min. A última posição recebida fica marcada no mapa.`, tom: "alerta", entregadorId: e.id, corridaId: e.corridaId },
        toast: { texto: `${primeiroNome(e.nome)} está sem sinal. O painel parou de fingir que ele está andando.`, tom: "alerta" },
      });
    }
  }

  // 2. automated couriers finish the counter and the door
  for (const c0 of prev.corridas) {
    if (!c0.esperaAte || agora < c0.esperaAte) continue;
    const c = editar(c0.id);
    const e = c.entregadorId ? porId.get(c.entregadorId) : undefined;
    c.esperaAte = undefined;
    if (c.status === "na_coleta") {
      c.status = "em_rota";
      c.coletadaEm = agora;
      c.perna = { caminho: rota(c.coleta.no, c.destino.no), inicio: agora, msPorQuadra: MS_POR_QUADRA };
      if (e) ef.push({ pulso: { tipo: "coletada", entregadorId: e.id } });
    } else if (c.status === "no_destino") {
      c.status = "entregue";
      c.entregueEm = agora;
      c.confirmadaPorCodigo = true;
      if (e) {
        liberar(e, c.destino.no);
        ef.push({ pulso: { tipo: "entregue", entregadorId: e.id }, evento: { em: agora, texto: `${c.id} entregue por ${nomeCurto(e.nome)}, confirmada com o código do destinatário.`, tom: "ok", corridaId: c.id, entregadorId: e.id } });
      }
    }
  }

  // 3. offer on the simulator phone expires in real time
  if (s.oferta && agoraReal > s.oferta.expiraEmReal) {
    const c = editar(s.oferta.corridaId);
    c.atribuirEm = agora + 5 * SEG;
    c.ofertas += 1;
    ef.push({ evento: { em: agora, texto: `${c.id}: ${primeiroNome(porId.get(s.oferta.entregadorId)?.nome ?? "")} não respondeu em 30 s, a corrida segue para o próximo mais perto.`, tom: "info", corridaId: c.id } });
    s.oferta = null;
  }

  // 4. automatic dispatch: the nearest free courier by street route, not by straight line
  if (s.autoDistribuir) {
    for (const c0 of prev.corridas) {
      if (c0.status !== "aguardando" || !c0.atribuirEm || agora < c0.atribuirEm) continue;
      if (s.oferta?.corridaId === c0.id) continue;
      const c = editar(c0.id);
      const e = livreMaisProximo(s, c.coleta.no);
      if (!e) {
        c.atribuirEm = agora + 30 * SEG;
        continue;
      }
      atribuirA(s, c, porId.get(e.id)!, agora, ef);
    }
  }

  // 5. new requests keep arriving during the lunch peak
  if (agora >= s.proximaChegada) {
    s.proximaChegada = agora + (2.2 + Math.random() * 3) * MIN;
    const emAndamento = s.corridas.filter(ativa).length;
    if (emAndamento < 13) {
      const emps = s.empresas.filter((e) => e.status === "ativa" && e.id !== "e1");
      const emp = emps[Math.floor(Math.random() * emps.length)];
      const d = DESTINOS[Math.floor(Math.random() * DESTINOS.length)];
      const q = cotacao(emp.coleta.no, d.no, s.tarifa, false);
      const id = `RV-${s.seq++}`;
      s.corridas.push({
        id,
        empresaId: emp.id,
        coleta: emp.coleta,
        destino: { no: d.no, endereco: d.endereco, bairro: d.bairro, contato: d.contato, telefone: d.telefone },
        kmRota: q.kmRota,
        kmReta: q.kmReta,
        preco: q.preco,
        repasse: q.repasse,
        status: "aguardando",
        criadaEm: agora,
        codigoEntrega: String(1000 + Math.floor(Math.random() * 9000)),
        quedasSinal: 0,
        ofertas: 1,
        obs: d.obs || undefined,
        origem: "app",
        atribuirEm: agora + (25 + Math.random() * 45) * SEG,
      });
      ef.push({ pulso: { tipo: "nova", corridaId: id }, evento: { em: agora, texto: `Nova corrida ${id}: ${emp.nome} para ${d.bairro}.`, tom: "info", corridaId: id } });
    }
  }
  return { s, ef };
}

export interface DadosCorrida {
  empresaId: string;
  destino: Ponto;
  contato: string;
  telefone: string;
  obs?: string;
}

export interface DadosEmpresa {
  nome: string;
  segmento: Empresa["segmento"];
  cnpj: string;
  contato: string;
  telefone: string;
  email: string;
  coleta: Ponto;
}

export type Res<T = undefined> = { ok: true; valor?: T } | { ok: false; erro: string };

interface Api extends Estado {
  pronto: boolean;
  estadoRef: React.MutableRefObject<Estado>;
  definirVelocidade: (v: number) => void;
  alternarPausa: () => void;
  alternarModoComum: () => void;
  alternarAuto: () => void;
  toast: (texto: string, tom?: Toast["tom"]) => void;
  pedirEntrega: (d: DadosCorrida, sua: boolean) => Promise<Res<string>>;
  ficarOnline: (id: string, on: boolean) => Promise<Res>;
  aceitarOferta: () => Promise<Res>;
  recusarOferta: () => Promise<Res>;
  coletar: (corridaId: string) => Promise<Res>;
  confirmarCodigo: (corridaId: string, codigo: string) => Promise<Res>;
  alternarSinal: (id: string) => void;
  atribuir: (corridaId: string, entregadorId: string) => Promise<Res>;
  cancelar: (corridaId: string, motivo: string) => Promise<Res>;
  aprovar: (id: string) => Promise<Res>;
  recusar: (id: string, motivo: string) => Promise<Res>;
  bloquear: (id: string, bloquear: boolean) => Promise<Res>;
  salvarEntregador: (id: string, d: Pick<Entregador, "telefone" | "moto" | "placa" | "pix">) => Promise<Res>;
  cadastrarEntregador: (d: { nome: string; telefone: string; moto: string; placa: string; cnhNumero: string; ear: boolean; validade: number; base: No }) => Promise<Res<string>>;
  salvarEmpresa: (id: string | null, d: DadosEmpresa) => Promise<Res<string>>;
  alternarSuspensa: (id: string) => Promise<Res>;
  excluirEmpresa: (id: string) => Promise<Res>;
  salvarTarifa: (t: Tarifa) => Promise<Res>;
}

const Ctx = createContext<Api | null>(null);
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
const latencia = () => espera(450 + Math.random() * 450);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<Estado>(inicial);
  const [pronto, setPronto] = useState(false);
  const ref = useRef(s);
  ref.current = s;
  const efeitos = useRef<Efeito[]>([]);
  const toastSeq = useRef(1);
  const logSeq = useRef(100);

  const toast = useCallback((texto: string, tom: Toast["tom"] = "ok") => {
    const id = toastSeq.current++;
    setS((p) => ({ ...p, toasts: [...p.toasts.slice(-3), { id, texto, tom }] }));
    setTimeout(() => setS((p) => ({ ...p, toasts: p.toasts.filter((t) => t.id !== id) })), 4200);
  }, []);

  const mut = useCallback((fn: (p: Estado) => Estado) => setS((p) => fn(p)), []);
  const registrar = useCallback((e: Omit<Evento, "id">) => {
    const id = logSeq.current++;
    setS((p) => ({ ...p, log: [{ ...e, id }, ...p.log].slice(0, 80) }));
  }, []);

  // the clock
  useEffect(() => {
    setPronto(true);
    let ultimo = performance.now();
    RELOGIO.real = ultimo;
    const iv = setInterval(() => {
      const agoraReal = performance.now();
      const dt = Math.min(1000, agoraReal - ultimo);
      ultimo = agoraReal;
      setS((p) => {
        if (p.pausado) return p;
        const r = avancar(p, dt, agoraReal);
        efeitos.current.push(...r.ef);
        return r.s;
      });
    }, 250);
    return () => clearInterval(iv);
  }, []);

  // keep the clock the 3D reads in step, and fire the effects collected by the last steps
  useEffect(() => {
    RELOGIO.agora = s.agora;
    RELOGIO.real = performance.now();
    RELOGIO.vel = s.velocidade;
    RELOGIO.pausado = s.pausado;
    if (!efeitos.current.length) return;
    const lote = efeitos.current;
    efeitos.current = [];
    const vistos = new Set<string>();
    for (const e of lote) {
      if (e.pulso) pulso(e.pulso);
      if (e.toast && !vistos.has(e.toast.texto)) {
        vistos.add(e.toast.texto);
        toast(e.toast.texto, e.toast.tom);
      }
      if (e.evento && !vistos.has(e.evento.texto)) {
        vistos.add(e.evento.texto);
        registrar(e.evento);
      }
    }
  }, [s, toast, registrar]);

  const api = useMemo<Api>(() => {
    const achar = (id: string) => ref.current.corridas.find((c) => c.id === id);
    const ent = (id: string) => ref.current.entregadores.find((e) => e.id === id);
    const trocaCorrida = (id: string, fn: (c: Corrida) => Corrida) => mut((p) => ({ ...p, corridas: p.corridas.map((c) => (c.id === id ? fn({ ...c }) : c)) }));
    const trocaEnt = (id: string, fn: (e: Entregador) => Entregador) => mut((p) => ({ ...p, entregadores: p.entregadores.map((e) => (e.id === id ? fn({ ...e }) : e)) }));

    return {
      ...s,
      pronto,
      estadoRef: ref,
      toast,
      definirVelocidade: (v) => mut((p) => ({ ...p, velocidade: v })),
      alternarPausa: () => mut((p) => ({ ...p, pausado: !p.pausado })),
      alternarModoComum: () => mut((p) => ({ ...p, modoComum: !p.modoComum })),
      alternarAuto: () => {
        const on = !ref.current.autoDistribuir;
        mut((p) => ({ ...p, autoDistribuir: on, corridas: on ? p.corridas.map((c) => (c.status === "aguardando" && !c.atribuirEm ? { ...c, atribuirEm: p.agora + 10 * SEG } : c)) : p.corridas }));
        toast(on ? "Distribuição automática ligada: cada corrida vai para o entregador livre mais perto pela rua." : "Distribuição automática desligada: as novas corridas esperam você atribuir.", "info");
      },

      pedirEntrega: async (d, sua) => {
        await latencia();
        const p = ref.current;
        const emp = p.empresas.find((e) => e.id === d.empresaId);
        if (!emp) return { ok: false, erro: "Empresa não encontrada." };
        if (emp.status === "suspensa") return { ok: false, erro: "Esta empresa está suspensa e não pode pedir entregas." };
        if (d.destino.no[0] === emp.coleta.no[0] && d.destino.no[1] === emp.coleta.no[1]) return { ok: false, erro: "O destino é o mesmo endereço da coleta." };
        const q = cotacao(emp.coleta.no, d.destino.no, p.tarifa, false);
        const id = `RV-${p.seq}`;
        const diego = p.entregadores.find((e) => e.id === ENTREGADOR_SIMULADOR)!;
        const ofertarDiego = sua && diego.status === "online";
        mut((x) => ({
          ...x,
          seq: x.seq + 1,
          corridas: [
            ...x.corridas,
            {
              id,
              empresaId: emp.id,
              coleta: emp.coleta,
              destino: { ...d.destino, contato: d.contato, telefone: d.telefone },
              kmRota: q.kmRota,
              kmReta: q.kmReta,
              preco: q.preco,
              repasse: q.repasse,
              status: "aguardando",
              criadaEm: x.agora,
              codigoEntrega: String(1000 + Math.floor(Math.random() * 9000)),
              quedasSinal: 0,
              ofertas: 1,
              obs: d.obs || undefined,
              origem: sua ? "app" : "painel",
              sua,
              atribuirEm: ofertarDiego ? undefined : x.agora + 20 * SEG,
            },
          ],
          oferta: ofertarDiego ? { corridaId: id, entregadorId: diego.id, expiraEmReal: performance.now() + OFERTA_REAL_MS, duracaoReal: OFERTA_REAL_MS } : x.oferta,
        }));
        pulso({ tipo: "nova", corridaId: id });
        registrar({ em: p.agora, texto: `Nova corrida ${id}: ${emp.nome} para ${d.destino.bairro}, ${q.kmRota.toLocaleString("pt-BR")} km pela rua.`, tom: "info", corridaId: id });
        return { ok: true, valor: id };
      },

      ficarOnline: async (id, on) => {
        await latencia();
        const e = ent(id);
        if (!e) return { ok: false, erro: "Entregador não encontrado." };
        if (!on && e.status === "em_corrida") return { ok: false, erro: "Termine a corrida antes de ficar offline." };
        trocaEnt(id, (x) => ({ ...x, status: on ? "online" : "offline", ultimaPosicaoEm: ref.current.agora, posRecebida: { ...x.posReal } }));
        return { ok: true };
      },

      aceitarOferta: async () => {
        const o = ref.current.oferta;
        if (!o) return { ok: false, erro: "A oferta expirou." };
        await latencia();
        const o2 = ref.current.oferta;
        if (!o2 || o2.corridaId !== o.corridaId) return { ok: false, erro: "A oferta expirou antes do aceite." };
        mut((p) => {
          const corridas = p.corridas.map((c) => ({ ...c }));
          const entregadores = p.entregadores.map((e) => ({ ...e }));
          const c = corridas.find((x) => x.id === o.corridaId)!;
          const e = entregadores.find((x) => x.id === o.entregadorId)!;
          if (c.status !== "aguardando") return { ...p, oferta: null };
          atribuirA(p, c, e, p.agora, efeitos.current);
          return { ...p, corridas, entregadores, oferta: null };
        });
        return { ok: true };
      },

      recusarOferta: async () => {
        const o = ref.current.oferta;
        if (!o) return { ok: true };
        await espera(250);
        mut((p) => ({ ...p, oferta: null, corridas: p.corridas.map((c) => (c.id === o.corridaId ? { ...c, atribuirEm: p.agora + 5 * SEG, ofertas: c.ofertas + 1 } : c)) }));
        registrar({ em: ref.current.agora, texto: `${o.corridaId} recusada por ${nomeCurto(ent(o.entregadorId)?.nome ?? "")}. Segue para o próximo mais perto pela rua.`, tom: "info", corridaId: o.corridaId });
        return { ok: true };
      },

      coletar: async (corridaId) => {
        await latencia();
        const c = achar(corridaId);
        if (!c || c.status !== "na_coleta") return { ok: false, erro: "Você ainda não chegou ao ponto de coleta." };
        trocaCorrida(corridaId, (x) => ({ ...x, status: "em_rota", coletadaEm: ref.current.agora, perna: { caminho: rota(x.coleta.no, x.destino.no), inicio: ref.current.agora, msPorQuadra: MS_POR_QUADRA } }));
        if (c.entregadorId) pulso({ tipo: "coletada", entregadorId: c.entregadorId });
        return { ok: true };
      },

      confirmarCodigo: async (corridaId, codigo) => {
        await latencia();
        const c = achar(corridaId);
        if (!c || c.status !== "no_destino") return { ok: false, erro: "Você ainda não chegou ao destino." };
        if (codigo.trim() !== c.codigoEntrega) {
          registrar({ em: ref.current.agora, texto: `${c.id}: código digitado não confere. A entrega continua aberta.`, tom: "alerta", corridaId: c.id });
          return { ok: false, erro: "Código não confere. Peça ao destinatário para conferir o número que recebeu." };
        }
        const agora = ref.current.agora;
        mut((p) => ({
          ...p,
          corridas: p.corridas.map((x) => (x.id === corridaId ? { ...x, status: "entregue", entregueEm: agora, confirmadaPorCodigo: true } : x)),
          entregadores: p.entregadores.map((e) => {
            if (e.id !== c.entregadorId) return e;
            const n = { ...e };
            liberar(n, c.destino.no);
            return n;
          }),
        }));
        if (c.entregadorId) pulso({ tipo: "entregue", entregadorId: c.entregadorId });
        registrar({ em: agora, texto: `${c.id} entregue, confirmada com o código do destinatário.`, tom: "ok", corridaId: c.id });
        return { ok: true };
      },

      alternarSinal: (id) => {
        const e = ent(id);
        if (!e) return;
        const vaiPerder = e.sinal;
        mut((p) => ({
          ...p,
          entregadores: p.entregadores.map((x) => (x.id === id ? { ...x, sinal: !x.sinal, alertado: false, voltaEm: undefined, ...(x.sinal ? {} : { posRecebida: { ...x.posReal }, ultimaPosicaoEm: p.agora }) } : x)),
          corridas: vaiPerder && e.corridaId ? p.corridas.map((c) => (c.id === e.corridaId ? { ...c, quedasSinal: c.quedasSinal + 1 } : c)) : p.corridas,
        }));
        if (!vaiPerder) {
          pulso({ tipo: "sinalVoltou", entregadorId: id });
          registrar({ em: ref.current.agora, texto: `O sinal de ${nomeCurto(e.nome)} voltou. A posição saltou para onde a moto realmente está.`, tom: "ok", entregadorId: id, corridaId: e.corridaId });
        }
      },

      atribuir: async (corridaId, entregadorId) => {
        await latencia();
        const c = achar(corridaId);
        const e = ent(entregadorId);
        if (!c || !e) return { ok: false, erro: "Corrida ou entregador não encontrado." };
        if (!["aguardando", "indo_coleta"].includes(c.status)) return { ok: false, erro: "O pacote já saiu da coleta, não dá para trocar de entregador agora." };
        if (e.status !== "online") return { ok: false, erro: `${primeiroNome(e.nome)} não está livre agora.` };
        if (e.id === ENTREGADOR_SIMULADOR) {
          mut((p) => ({
            ...p,
            oferta: { corridaId, entregadorId, expiraEmReal: performance.now() + OFERTA_REAL_MS, duracaoReal: OFERTA_REAL_MS },
            corridas: p.corridas.map((x) => (x.id === corridaId ? { ...x, atribuirEm: undefined } : x)),
          }));
          registrar({ em: ref.current.agora, texto: `${corridaId} oferecida manualmente a ${nomeCurto(e.nome)}. Aguardando o aceite no celular dele.`, tom: "info", corridaId });
          return { ok: true };
        }
        mut((p) => {
          const corridas = p.corridas.map((x) => ({ ...x }));
          const entregadores = p.entregadores.map((x) => ({ ...x }));
          const cc = corridas.find((x) => x.id === corridaId)!;
          const novo = entregadores.find((x) => x.id === entregadorId)!;
          if (cc.entregadorId) {
            const antigo = entregadores.find((x) => x.id === cc.entregadorId);
            if (antigo) liberar(antigo, noMaisProximo(antigo.posReal.x, antigo.posReal.y));
          }
          atribuirA(p, cc, novo, p.agora, efeitos.current);
          return { ...p, corridas, entregadores, oferta: p.oferta?.corridaId === corridaId ? null : p.oferta };
        });
        return { ok: true };
      },

      cancelar: async (corridaId, motivo) => {
        await latencia();
        const c = achar(corridaId);
        if (!c) return { ok: false, erro: "Corrida não encontrada." };
        if (!["aguardando", "indo_coleta", "na_coleta"].includes(c.status)) return { ok: false, erro: "O pacote já está com o entregador. Cancelar agora exige devolução, fale com ele antes." };
        mut((p) => ({
          ...p,
          oferta: p.oferta?.corridaId === corridaId ? null : p.oferta,
          corridas: p.corridas.map((x) => (x.id === corridaId ? { ...x, status: "cancelada", canceladaEm: p.agora, motivoCancelamento: motivo, perna: undefined, atribuirEm: undefined, esperaAte: undefined } : x)),
          entregadores: p.entregadores.map((e) => {
            if (e.id !== c.entregadorId) return e;
            const n = { ...e };
            liberar(n, noMaisProximo(e.posReal.x, e.posReal.y));
            return n;
          }),
        }));
        registrar({ em: ref.current.agora, texto: `${corridaId} cancelada: ${motivo}`, tom: "erro", corridaId });
        return { ok: true };
      },

      aprovar: async (id) => {
        await latencia();
        const e = ent(id);
        if (!e) return { ok: false, erro: "Cadastro não encontrado." };
        if (!e.docs.ear) return { ok: false, erro: "A CNH não tem a observação EAR. Sem ela, entrega paga não pode ser liberada." };
        if (e.docs.cnhValidade < ref.current.agora) return { ok: false, erro: "A CNH está vencida." };
        trocaEnt(id, (x) => ({ ...x, status: "offline", desde: ref.current.agora, nota: 5, docs: { ...x.docs, motivoRecusa: undefined } }));
        registrar({ em: ref.current.agora, texto: `Cadastro de ${nomeCurto(e.nome)} aprovado. Ele já pode ficar online.`, tom: "ok", entregadorId: id });
        return { ok: true };
      },

      recusar: async (id, motivo) => {
        await latencia();
        if (!motivo.trim()) return { ok: false, erro: "Escreva o motivo: ele aparece para o entregador corrigir." };
        trocaEnt(id, (x) => ({ ...x, status: "recusado", docs: { ...x.docs, motivoRecusa: motivo.trim() } }));
        return { ok: true };
      },

      bloquear: async (id, bloquear) => {
        await latencia();
        const e = ent(id);
        if (!e) return { ok: false, erro: "Entregador não encontrado." };
        if (bloquear && e.status === "em_corrida") return { ok: false, erro: "Ele está no meio de uma corrida. Bloqueie depois da entrega." };
        trocaEnt(id, (x) => ({ ...x, status: bloquear ? "bloqueado" : "offline" }));
        return { ok: true };
      },

      salvarEntregador: async (id, d) => {
        await latencia();
        if (!/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(d.placa.toUpperCase().replace(/[^A-Z0-9]/g, ""))) return { ok: false, erro: "Placa inválida. Use o formato ABC1D23." };
        trocaEnt(id, (x) => ({ ...x, ...d, placa: d.placa.toUpperCase().replace(/[^A-Z0-9]/g, "") }));
        return { ok: true };
      },

      cadastrarEntregador: async (d) => {
        await latencia();
        const placa = d.placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (d.nome.trim().split(" ").length < 2) return { ok: false, erro: "Informe nome e sobrenome." };
        if (!/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(placa)) return { ok: false, erro: "Placa inválida. Use o formato ABC1D23." };
        if (d.cnhNumero.replace(/\D/g, "").length !== 11) return { ok: false, erro: "O número da CNH tem 11 dígitos." };
        if (ref.current.entregadores.some((e) => e.placa === placa)) return { ok: false, erro: "Já existe um entregador com essa placa." };
        const id = `m${ref.current.entregadores.length + 1}n`;
        const agora = ref.current.agora;
        mut((p) => ({
          ...p,
          entregadores: [
            ...p.entregadores,
            {
              id,
              nome: d.nome.trim(),
              foto: "entregador-novo",
              telefone: d.telefone,
              moto: d.moto,
              placa,
              bairroBase: "",
              base: d.base,
              status: "pendente",
              nota: 0,
              corridasTotal: 0,
              desde: agora,
              docs: { cnhNumero: d.cnhNumero.replace(/\D/g, ""), cnhCategoria: "A", cnhValidade: d.validade, ear: d.ear, crlvOk: true, fotoOk: false, enviadoEm: agora },
              pix: "",
              sinal: true,
              posRecebida: { x: d.base[0], y: d.base[1] },
              ultimaPosicaoEm: agora,
              posReal: { x: d.base[0], y: d.base[1] },
              parado: d.base,
            },
          ],
        }));
        return { ok: true, valor: id };
      },

      salvarEmpresa: async (id, d) => {
        await latencia();
        const limpo = d.cnpj.replace(/\D/g, "");
        if (limpo.length !== 14) return { ok: false, erro: "O CNPJ tem 14 dígitos." };
        if (ref.current.empresas.some((e) => e.id !== id && e.cnpj.replace(/\D/g, "") === limpo)) return { ok: false, erro: "Já existe uma empresa com esse CNPJ." };
        if (ref.current.empresas.some((e) => e.id !== id && semAcento(e.nome) === semAcento(d.nome.trim()))) return { ok: false, erro: "Já existe uma empresa com esse nome." };
        const cnpj = `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5, 8)}/${limpo.slice(8, 12)}-${limpo.slice(12)}`;
        if (id) {
          mut((p) => ({ ...p, empresas: p.empresas.map((e) => (e.id === id ? { ...e, ...d, cnpj, nome: d.nome.trim() } : e)) }));
          return { ok: true, valor: id };
        }
        const novo = `e${ref.current.empresas.length + 1}n`;
        mut((p) => ({
          ...p,
          empresas: [{ id: novo, ...d, nome: d.nome.trim(), cnpj, contatoFoto: "contato-novo", foto: `loja-${d.segmento}`, status: "ativa", desde: p.agora, corridasMes: 0 }, ...p.empresas],
        }));
        return { ok: true, valor: novo };
      },

      alternarSuspensa: async (id) => {
        await latencia();
        mut((p) => ({ ...p, empresas: p.empresas.map((e) => (e.id === id ? { ...e, status: e.status === "ativa" ? "suspensa" : "ativa" } : e)) }));
        return { ok: true };
      },

      excluirEmpresa: async (id) => {
        await latencia();
        if (ref.current.corridas.some((c) => c.empresaId === id && ativa(c))) return { ok: false, erro: "Há corridas em andamento desta empresa. Espere terminarem ou cancele antes." };
        mut((p) => ({ ...p, empresas: p.empresas.filter((e) => e.id !== id) }));
        return { ok: true };
      },

      salvarTarifa: async (t) => {
        await latencia();
        if (t.base <= 0 || t.porKm <= 0) return { ok: false, erro: "Tarifa base e valor por km precisam ser maiores que zero." };
        if (t.repassePct < 50 || t.repassePct > 95) return { ok: false, erro: "O repasse ao entregador fica entre 50% e 95%." };
        mut((p) => ({ ...p, tarifa: { ...t } }));
        registrar({ em: ref.current.agora, texto: `Tarifa atualizada: ${t.base.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} até ${t.kmInclusos} km, mais ${t.porKm.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} por km, medida pela rua. Vale para os próximos pedidos.`, tom: "info" });
        return { ok: true };
      },
    };
  }, [s, pronto, mut, toast, registrar]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore fora do StoreProvider");
  return v;
}

export const nomeEntregador = (lista: Entregador[], id?: string) => lista.find((e) => e.id === id)?.nome ?? "";
export const horaCurta = hhmm;
