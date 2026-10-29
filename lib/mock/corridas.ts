import type { Corrida, No, Ponto, Tarifa } from "../types";
import { COLS, ROWS, MS_POR_QUADRA, cotacao, enderecoDe, rota } from "../cidade";
import { DIA, HORA, INICIO, MIN, SEG } from "../format";
import { seeded, pick } from "../rand";
import { EMPRESAS } from "./empresas";
import { ENTREGADORES, ENTREGADOR_SEM_SINAL } from "./entregadores";

export const TARIFA_INICIAL: Tarifa = {
  base: 8.5,
  kmInclusos: 2,
  porKm: 1.9,
  repassePct: 80,
  noturnoPct: 15,
  noturnoDesde: 20,
  medida: "rota",
};

const NOMES = [
  "Ana Paula Ribeiro", "João Batista", "Mariana Costa", "Roberto Siqueira", "Cláudia Menezes", "Pedro Henrique", "Luciana Torres",
  "Márcio Fonseca", "Beatriz Almeida", "Sandra Regina", "Otávio Brandão", "Daniela Peixoto", "Hugo Azevedo", "Elaine Cristina",
  "Gilberto Paiva", "Raquel Monteiro", "Vítor Hugo", "Silvana Castro", "Fábio Junqueira", "Priscila Amaral", "Rogério Tavares",
  "Adriana Lacerda", "Nelson Prates", "Viviane Sampaio", "Cecília Rangel", "Maurício Bastos", "Lívia Guimarães", "Sebastião Neves",
];
const OBS = [
  "Interfone 21, deixar na portaria",
  "Entregar no balcão da recepção",
  "Ligar ao chegar",
  "Casa amarela, portão de ferro",
  "Sala 304, segundo andar",
  "Bloco B, apartamento 12",
  "",
  "",
  "",
];

export interface Destino extends Ponto {
  contato: string;
  telefone: string;
  obs: string;
}

// recipients spread over the whole grid, so many trips cross the river
export const DESTINOS: Destino[] = (() => {
  const r = seeded(7731);
  const out: Destino[] = [];
  const usados = new Set<string>();
  let i = 0;
  while (out.length < 48) {
    const no: No = [Math.floor(r() * COLS), Math.floor(r() * ROWS)];
    const k = no.join(",");
    if (usados.has(k) || EMPRESAS.some((e) => e.coleta.no[0] === no[0] && e.coleta.no[1] === no[1])) continue;
    usados.add(k);
    const p = enderecoDe(no, 3 + i);
    out.push({
      ...p,
      contato: NOMES[i % NOMES.length],
      telefone: `(11) 9${Math.floor(1000 + r() * 8999)}-${Math.floor(1000 + r() * 8999)}`,
      obs: pick(r, OBS),
    });
    i++;
  }
  return out;
})();

const codigo = (r: () => number) => String(Math.floor(1000 + r() * 9000));

let seqHist = 48210;
const idCorrida = () => `RV-${seqHist++}`;

const APROVADOS = ENTREGADORES.filter((e) => !["pendente", "recusado"].includes(e.status));

/** a week of finished rides, so the history, filters and reports have a real shape */
function historico(): Corrida[] {
  const r = seeded(20261029);
  const out: Corrida[] = [];
  for (let dia = 6; dia >= 0; dia--) {
    const n = dia === 0 ? 17 : 19 + Math.floor(r() * 10);
    const inicioDia = INICIO - dia * DIA - (11 * HORA + 42 * MIN) + 8 * HORA; // 08:00
    const fimDia = dia === 0 ? INICIO - 25 * MIN : inicioDia + 12.5 * HORA;
    const horarios = Array.from({ length: n }, () => {
      // two peaks: late morning and the lunch hour
      const u = r();
      if (dia === 0) return inicioDia + u * (fimDia - inicioDia);
      const pico = u < 0.35 ? 3.5 * HORA + r() * 2 * HORA : u < 0.55 ? 9 * HORA + r() * 2 * HORA : r() * 12.5 * HORA;
      return inicioDia + pico;
    })
      .filter((t) => t < fimDia)
      .sort((a, b) => a - b);
    for (const criadaEm of horarios) {
      const emp = pick(r, EMPRESAS.filter((e) => e.status === "ativa"));
      const dest = pick(r, DESTINOS);
      const q = cotacao(emp.coleta.no, dest.no, TARIFA_INICIAL, false);
      const ent = pick(r, APROVADOS);
      const cancelada = r() < 0.06;
      const aceitaEm = criadaEm + (15 + Math.floor(r() * 140)) * SEG;
      const chegouColetaEm = aceitaEm + (3 + r() * 9) * MIN;
      const coletadaEm = chegouColetaEm + (1 + r() * 7) * MIN;
      const viagem = (q.caminho.length - 1) * MS_POR_QUADRA * (0.85 + r() * 0.3);
      const chegouDestinoEm = coletadaEm + viagem;
      const entregueEm = chegouDestinoEm + (40 + r() * 200) * SEG;
      const quedas = r() < 0.18 ? 1 + Math.floor(r() * 2) : 0;
      const c: Corrida = {
        id: idCorrida(),
        empresaId: emp.id,
        entregadorId: ent.id,
        coleta: emp.coleta,
        destino: { no: dest.no, endereco: dest.endereco, bairro: dest.bairro, contato: dest.contato, telefone: dest.telefone },
        kmRota: q.kmRota,
        kmReta: q.kmReta,
        preco: q.preco,
        repasse: q.repasse,
        status: cancelada ? "cancelada" : "entregue",
        criadaEm,
        aceitaEm,
        chegouColetaEm: cancelada ? undefined : chegouColetaEm,
        coletadaEm: cancelada ? undefined : coletadaEm,
        chegouDestinoEm: cancelada ? undefined : chegouDestinoEm,
        entregueEm: cancelada ? undefined : entregueEm,
        canceladaEm: cancelada ? aceitaEm + (2 + r() * 6) * MIN : undefined,
        motivoCancelamento: cancelada ? pick(r, ["A empresa cancelou antes da coleta", "Pedido duplicado", "Destinatário pediu para reagendar"]) : undefined,
        codigoEntrega: codigo(r),
        confirmadaPorCodigo: cancelada ? undefined : r() > 0.04,
        quedasSinal: cancelada ? 0 : quedas,
        ofertas: 1 + (r() < 0.25 ? 1 : 0) + (r() < 0.08 ? 1 : 0),
        obs: dest.obs || undefined,
        origem: r() < 0.88 ? "app" : "painel",
      };
      out.push(c);
    }
  }
  return out;
}

/** rides already on the street when the page opens, each one somewhere along its route */
function ativas(): Corrida[] {
  const r = seeded(555);
  const plano: { ent: string; emp: string; dest: number; status: "indo_coleta" | "em_rota"; andou: number }[] = [
    { ent: "m2", emp: "e12", dest: 30, status: "em_rota", andou: 6.5 },
    { ent: "m3", emp: "e9", dest: 5, status: "em_rota", andou: 2.2 },
    { ent: "m4", emp: "e13", dest: 11, status: "indo_coleta", andou: 1.1 },
    { ent: "m5", emp: "e14", dest: 40, status: "em_rota", andou: 3.4 },
    { ent: "m6", emp: "e23", dest: 21, status: "indo_coleta", andou: 0.6 },
    { ent: "m7", emp: "e21", dest: 17, status: "em_rota", andou: 1.8 },
    { ent: "m8", emp: "e6", dest: 2, status: "em_rota", andou: 4.1 },
    { ent: "m9", emp: "e10", dest: 26, status: "indo_coleta", andou: 1.4 },
  ];
  const out: Corrida[] = [];
  let seq = 48790;
  for (const p of plano) {
    const emp = EMPRESAS.find((e) => e.id === p.emp)!;
    const ent = ENTREGADORES.find((e) => e.id === p.ent)!;
    const dest = DESTINOS[p.dest];
    const q = cotacao(emp.coleta.no, dest.no, TARIFA_INICIAL, false);
    const caminho = p.status === "em_rota" ? q.caminho : rota(ent.base, emp.coleta.no);
    const andou = Math.min(p.andou, Math.max(0.2, caminho.length - 1.3));
    const inicioPerna = INICIO - andou * MS_POR_QUADRA;
    const aceitaEm = p.status === "em_rota" ? inicioPerna - (6 + r() * 6) * MIN : inicioPerna - 20 * SEG;
    const c: Corrida = {
      id: `RV-${seq++}`,
      empresaId: emp.id,
      entregadorId: ent.id,
      coleta: emp.coleta,
      destino: { no: dest.no, endereco: dest.endereco, bairro: dest.bairro, contato: dest.contato, telefone: dest.telefone },
      kmRota: q.kmRota,
      kmReta: q.kmReta,
      preco: q.preco,
      repasse: q.repasse,
      status: p.status,
      criadaEm: aceitaEm - (20 + Math.floor(r() * 80)) * SEG,
      aceitaEm,
      chegouColetaEm: p.status === "em_rota" ? inicioPerna - (2 + r() * 3) * MIN : undefined,
      coletadaEm: p.status === "em_rota" ? inicioPerna : undefined,
      codigoEntrega: codigo(r),
      quedasSinal: p.ent === ENTREGADOR_SEM_SINAL ? 1 : 0,
      ofertas: 1,
      obs: dest.obs || undefined,
      origem: "app",
      perna: { caminho, inicio: inicioPerna, msPorQuadra: MS_POR_QUADRA },
    };
    out.push(c);
  }
  // two requests still waiting for a courier when the page opens
  for (const [emp, dest, ha] of [["e3", 9, 150], ["e18", 33, 45]] as const) {
    const e = EMPRESAS.find((x) => x.id === emp)!;
    const d = DESTINOS[dest];
    const q = cotacao(e.coleta.no, d.no, TARIFA_INICIAL, false);
    out.push({
      id: `RV-${seq++}`,
      empresaId: e.id,
      coleta: e.coleta,
      destino: { no: d.no, endereco: d.endereco, bairro: d.bairro, contato: d.contato, telefone: d.telefone },
      kmRota: q.kmRota,
      kmReta: q.kmReta,
      preco: q.preco,
      repasse: q.repasse,
      status: "aguardando",
      criadaEm: INICIO - ha * SEG,
      codigoEntrega: codigo(r),
      quedasSinal: 0,
      ofertas: ha > 100 ? 2 : 1,
      obs: d.obs || undefined,
      origem: "app",
    });
  }
  return out;
}

export const CORRIDAS: Corrida[] = [...historico(), ...ativas()];
export const SEQ_INICIAL = 48900;
