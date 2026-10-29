import type { Entregador, No, StatusEntregador } from "../types";
import { bairroDe } from "../cidade";
import { DIA, INICIO, MIN } from "../format";
import { seeded, pick } from "../rand";

// The partner network. Statuses at the start of the simulation; the store moves them from there.

const MOTOS = ["Honda CG 160 Fan", "Honda CG 160 Titan", "Yamaha Factor 150", "Honda Biz 125", "Honda Pop 110i", "Yamaha Fazer 250", "Honda NXR 160 Bros", "Yamaha Crosser 150", "Honda CB 300F Twister"];

const BASE: [string, StatusEntregador, No, string][] = [
  ["Diego Santos", "online", [2, 1], "h1"],
  ["Wellington Souza", "em_corrida", [9, 2], "h2"],
  ["Rafael Lima", "em_corrida", [4, 6], "h3"],
  ["Bruno Carvalho", "em_corrida", [11, 4], "h4"],
  ["Lucas Ferreira", "em_corrida", [6, 3], "h5"],
  ["Jéssica Alves", "em_corrida", [1, 7], "m1"],
  ["Matheus Oliveira", "em_corrida", [8, 6], "h6"],
  ["Gabriel Costa", "em_corrida", [10, 8], "h7"],
  ["Felipe Araújo", "em_corrida", [3, 2], "h8"],
  ["Thiago Martins", "online", [7, 3], "h9"],
  ["Anderson Pereira", "online", [10, 1], "h10"],
  ["Fernanda Lopes", "online", [5, 8], "m2"],
  ["Leandro Gomes", "online", [0, 3], "h11"],
  ["Vinícius Ribeiro", "online", [12, 6], "h12"],
  ["Carlos Eduardo Nunes", "online", [3, 9], "h13"],
  ["Tatiane Moraes", "online", [8, 2], "m3"],
  ["Juliano Barros", "online", [6, 5], "h14"],
  ["Alex Sandro Dias", "online", [11, 9], "h15"],
  ["Renan Cardoso", "offline", [1, 4], "h16"],
  ["Emerson Rocha", "offline", [9, 6], "h17"],
  ["Aline Batista", "offline", [4, 0], "m4"],
  ["Douglas Pires", "offline", [12, 3], "h18"],
  ["Marcelo Freitas", "offline", [2, 8], "h19"],
  ["Robson Teixeira", "offline", [7, 9], "h20"],
  ["Kelly Santana", "offline", [5, 1], "m5"],
  ["Caio Mendes", "offline", [10, 5], "h21"],
  ["Édson Ramos", "bloqueado", [0, 9], "h22"],
  ["Igor Monteiro", "pendente", [6, 8], "h23"],
  ["Luana Farias", "pendente", [3, 5], "m6"],
  ["Wagner Cunha", "pendente", [11, 1], "h24"],
  ["Natália Vieira", "pendente", [8, 4], "m7"],
  ["Paulo Henrique Dias", "pendente", [1, 2], "h25"],
  ["Sidnei Correia", "recusado", [9, 9], "h26"],
];

const placa = (r: () => number) => {
  const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const l = () => L[Math.floor(r() * 26)];
  const n = () => Math.floor(r() * 10);
  return `${l()}${l()}${l()}${n()}${l()}${n()}${n()}`;
};
const tel = (r: () => number) => `(11) 9${Math.floor(1000 + r() * 8999)}-${Math.floor(1000 + r() * 8999)}`;

export const ENTREGADORES: Entregador[] = BASE.map(([nome, status, base, foto], i) => {
  const r = seeded(4100 + i * 29);
  const pendente = status === "pendente" || status === "recusado";
  // two pending couriers carry a problem the approval screen has to catch
  const semEar = nome === "Wagner Cunha";
  const cnhVencendo = nome === "Paulo Henrique Dias";
  const pos = { x: base[0], y: base[1] };
  return {
    id: `m${i + 1}`,
    nome,
    foto: `entregador-${foto}`,
    telefone: tel(r),
    moto: pick(r, MOTOS),
    placa: placa(r),
    bairroBase: bairroDe(base),
    base,
    status,
    nota: pendente ? 0 : +(4.5 + r() * 0.5).toFixed(2),
    corridasTotal: pendente ? 0 : 80 + Math.floor(r() * 2400),
    desde: INICIO - (pendente ? 0 : 30 + Math.floor(r() * 700)) * DIA,
    docs: {
      cnhNumero: String(Math.floor(10000000000 + r() * 89999999999)),
      cnhCategoria: r() < 0.7 ? "A" : r() < 0.5 ? "AB" : "AC",
      cnhValidade: cnhVencendo ? INICIO + 12 * DIA : INICIO + (200 + Math.floor(r() * 1500)) * DIA,
      ear: !semEar,
      crlvOk: true,
      fotoOk: true,
      enviadoEm: pendente ? INICIO - (10 + Math.floor(r() * 600)) * MIN - (i % 3) * DIA : INICIO - 30 * DIA,
      motivoRecusa: status === "recusado" ? "CNH sem a observação EAR (exerce atividade remunerada)." : undefined,
    },
    pix: `${nome.split(" ")[0].toLowerCase()}.${(nome.split(" ").pop() ?? "").toLowerCase()}@email.com`
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, ""),
    sinal: true,
    posRecebida: { ...pos },
    ultimaPosicaoEm: INICIO,
    posReal: { ...pos },
    parado: base,
  };
});

/** the courier whose phone is shown in the live simulator */
export const ENTREGADOR_SIMULADOR = "m1";
/** the seeded courier who is out of signal when the page opens */
export const ENTREGADOR_SEM_SINAL = "m2";
