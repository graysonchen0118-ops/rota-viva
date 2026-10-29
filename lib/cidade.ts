import type { No, Perna, Ponto, Tarifa } from "./types";

// The city the whole site runs on: a street grid cut in two by a river that can only be
// crossed on two bridges. Routes, distances and prices are all computed from it, so the
// difference between the straight line and the street route is real arithmetic, not a picture.

export const COLS = 13;
export const ROWS = 10;
export const KM_POR_QUADRA = 0.4;
/** the river runs between row 4 and row 5 */
export const RIO_ENTRE = 4;
export const PONTES = [2, 9];
export const NOME_PONTE: Record<number, string> = { 2: "Ponte Velha", 9: "Ponte Nova" };

export const RUAS_H = [
  "Rua das Palmeiras",
  "Rua Sete de Setembro",
  "Av. Brasil",
  "Rua Tiradentes",
  "Av. Beira-Rio",
  "Av. Marginal Sul",
  "Rua São Paulo",
  "Rua das Acácias",
  "Av. Getúlio Vargas",
  "Rua dos Ipês",
];
export const RUAS_V = [
  "Rua Bahia",
  "Rua Pernambuco",
  "Av. Ponte Velha",
  "Rua Goiás",
  "Rua Paraná",
  "Rua Ceará",
  "Rua Amazonas",
  "Rua Maranhão",
  "Rua Sergipe",
  "Av. Ponte Nova",
  "Rua Alagoas",
  "Rua Pará",
  "Rua Piauí",
];

export const BAIRROS = ["Centro", "Bela Vista", "Vila Industrial", "Jardim América", "Santa Cruz", "Vila Nova"] as const;

export function bairroDe([x, y]: No): string {
  const norte = y <= RIO_ENTRE;
  const col = x <= 4 ? 0 : x <= 8 ? 1 : 2;
  return BAIRROS[(norte ? 0 : 3) + col];
}

/** a street address for an intersection, alternating between the two streets that meet there */
export function enderecoDe(no: No, semente = 0): Ponto {
  const [x, y] = no;
  const usaH = (x + y + semente) % 3 !== 0;
  const rua = usaH ? RUAS_H[y] : RUAS_V[x];
  const base = usaH ? x * 120 + 40 : y * 140 + 60;
  const numero = base + ((x * 37 + y * 53 + semente * 11) % 90) + 2;
  return { no, endereco: `${rua}, ${numero}`, bairro: bairroDe(no) };
}

const chave = (n: No) => n[0] * 100 + n[1];
const dentro = (x: number, y: number) => x >= 0 && y >= 0 && x < COLS && y < ROWS;

function vizinhos([x, y]: No): No[] {
  const out: No[] = [];
  const cand: No[] = [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ];
  for (const [nx, ny] of cand) {
    if (!dentro(nx, ny)) continue;
    // crossing the river only on a bridge column
    const cruza = (y === RIO_ENTRE && ny === RIO_ENTRE + 1) || (y === RIO_ENTRE + 1 && ny === RIO_ENTRE);
    if (cruza && !PONTES.includes(x)) continue;
    out.push([nx, ny]);
  }
  return out;
}

const cache = new Map<string, No[]>();

/** shortest street route between two intersections, with a small cost per turn so it looks driven */
export function rota(a: No, b: No): No[] {
  const k = `${a[0]},${a[1]}>${b[0]},${b[1]}`;
  const c = cache.get(k);
  if (c) return c;
  type Est = { no: No; dir: number; custo: number; de: string | null };
  const sk = (n: No, d: number) => `${chave(n)}:${d}`;
  const melhor = new Map<string, Est>();
  const fila: Est[] = [{ no: a, dir: -1, custo: 0, de: null }];
  melhor.set(sk(a, -1), fila[0]);
  let fim: Est | null = null;
  while (fila.length) {
    fila.sort((p, q) => p.custo - q.custo);
    const cur = fila.shift()!;
    if (cur.no[0] === b[0] && cur.no[1] === b[1]) {
      fim = cur;
      break;
    }
    for (const nb of vizinhos(cur.no)) {
      const dir = nb[0] !== cur.no[0] ? 0 : 1;
      const custo = cur.custo + 1 + (cur.dir !== -1 && cur.dir !== dir ? 0.05 : 0);
      const s = sk(nb, dir);
      const ant = melhor.get(s);
      if (!ant || custo < ant.custo - 1e-9) {
        const e: Est = { no: nb, dir, custo, de: sk(cur.no, cur.dir) };
        melhor.set(s, e);
        fila.push(e);
      }
    }
  }
  const out: No[] = [];
  let e: Est | null | undefined = fim;
  while (e) {
    out.unshift(e.no);
    e = e.de ? melhor.get(e.de) : null;
  }
  if (!out.length) out.push(a);
  cache.set(k, out);
  return out;
}

export const quadras = (c: No[]) => Math.max(0, c.length - 1);
export const kmDe = (c: No[]) => +(quadras(c) * KM_POR_QUADRA).toFixed(1);
export const kmRetaDe = (a: No, b: No) => +(Math.hypot(a[0] - b[0], a[1] - b[1]) * KM_POR_QUADRA).toFixed(1);
export const cruzaRio = (a: No, b: No) => (a[1] <= RIO_ENTRE) !== (b[1] <= RIO_ENTRE);

export function precoPorKm(kmV: number, t: Tarifa, noturno = false) {
  const extra = Math.max(0, kmV - t.kmInclusos) * t.porKm;
  const v = (t.base + extra) * (noturno ? 1 + t.noturnoPct / 100 : 1);
  return Math.round(v * 100) / 100;
}

export function cotacao(a: No, b: No, t: Tarifa, noturno = false) {
  const caminho = rota(a, b);
  const kmRota = kmDe(caminho);
  const kmReta = kmRetaDe(a, b);
  const preco = precoPorKm(t.medida === "rota" ? kmRota : kmReta, t, noturno);
  const precoReta = precoPorKm(kmReta, t, noturno);
  const precoRota = precoPorKm(kmRota, t, noturno);
  return { caminho, kmRota, kmReta, preco, precoReta, precoRota, repasse: Math.round(preco * t.repassePct) / 100 };
}

/** about 22 km/h through traffic: one block of 400 m in 65 seconds */
export const MS_POR_QUADRA = 65_000;

/** position along a leg at a given time, plus heading and whether it has arrived */
export function posicaoNaPerna(p: Perna, agora: number) {
  const c = p.caminho;
  const total = quadras(c);
  const andado = Math.max(0, (agora - p.inicio) / p.msPorQuadra);
  if (total === 0 || andado >= total) {
    const f = c[c.length - 1];
    const prev = c.length > 1 ? c[c.length - 2] : f;
    return { x: f[0], y: f[1], ang: Math.atan2(f[1] - prev[1], f[0] - prev[0]), chegou: true, frac: 1 };
  }
  const i = Math.floor(andado);
  const t = andado - i;
  const a = c[i];
  const b = c[i + 1];
  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, ang: Math.atan2(b[1] - a[1], b[0] - a[0]), chegou: false, frac: andado / total };
}

export const fimDaPerna = (p: Perna) => p.inicio + quadras(p.caminho) * p.msPorQuadra;

export function noMaisProximo(x: number, y: number): No {
  return [Math.max(0, Math.min(COLS - 1, Math.round(x))), Math.max(0, Math.min(ROWS - 1, Math.round(y)))];
}
