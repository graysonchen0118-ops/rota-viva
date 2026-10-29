// Small formatters in Brazilian Portuguese. Times are shown in Brasília time (UTC-3).

const BRT = 3 * 3600_000;
export const SEG = 1000;
export const MIN = 60 * SEG;
export const HORA = 60 * MIN;
export const DIA = 24 * HORA;

/** Thursday 29 October 2026, 11:42 in Brasília */
export const INICIO = Date.UTC(2026, 9, 29, 14, 42, 0);

const d = (ms: number) => new Date(ms - BRT);
export const hhmm = (ms: number) => `${String(d(ms).getUTCHours()).padStart(2, "0")}:${String(d(ms).getUTCMinutes()).padStart(2, "0")}`;
export const hhmmss = (ms: number) => `${hhmm(ms)}:${String(d(ms).getUTCSeconds()).padStart(2, "0")}`;
const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const diaSemana = (ms: number) => DIAS[d(ms).getUTCDay()];
export const dataCurta = (ms: number) => `${String(d(ms).getUTCDate()).padStart(2, "0")}/${String(d(ms).getUTCMonth() + 1).padStart(2, "0")}`;
export const diaCurto = (ms: number) => `${DIAS_CURTOS[d(ms).getUTCDay()]} ${dataCurta(ms)}`;
export const mesmoDia = (a: number, b: number) => Math.floor((a - BRT) / DIA) === Math.floor((b - BRT) / DIA);
export const quando = (ms: number, agora: number) => (mesmoDia(ms, agora) ? hhmm(ms) : `${diaCurto(ms)} ${hhmm(ms)}`);

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const reais = (v: number) => brl.format(v).replace(/ /g, " ");
export const km = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
export const num = (v: number, casas = 0) => v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

/** "há 12 s", "há 3 min", "há 1 h 05" */
export const ha = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `há ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  return `há ${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
};
export const duracao = (ms: number) => {
  const m = Math.max(0, Math.round(ms / MIN));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
};

export const primeiroNome = (n: string) => n.split(" ")[0];
export const nomeCurto = (n: string) => {
  const p = n.split(" ");
  return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : n;
};
export const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
