export type No = [number, number];

export interface Ponto {
  no: No;
  endereco: string;
  bairro: string;
}

export type Segmento =
  | "farmacia" | "padaria" | "floricultura" | "autopecas" | "petshop" | "papelaria" | "moda" | "restaurante"
  | "laboratorio" | "otica" | "ferragens" | "cosmeticos" | "livraria" | "assistencia" | "contabilidade"
  | "acougue" | "cafeteria" | "presentes" | "esportes" | "mercado";

export interface Empresa {
  id: string;
  nome: string;
  segmento: Segmento;
  cnpj: string;
  contato: string;
  contatoFoto: string;
  telefone: string;
  email: string;
  coleta: Ponto;
  foto: string;
  status: "ativa" | "suspensa";
  desde: number;
  /** rides created in the current month before the seeded week */
  corridasMes: number;
}

export type StatusEntregador = "online" | "em_corrida" | "offline" | "pendente" | "recusado" | "bloqueado";

export interface Documentos {
  cnhNumero: string;
  cnhCategoria: "A" | "AB" | "AC" | "AD" | "AE";
  cnhValidade: number;
  ear: boolean;
  crlvOk: boolean;
  fotoOk: boolean;
  enviadoEm: number;
  motivoRecusa?: string;
}

export interface Entregador {
  id: string;
  nome: string;
  foto: string;
  telefone: string;
  moto: string;
  placa: string;
  bairroBase: string;
  base: No;
  status: StatusEntregador;
  nota: number;
  corridasTotal: number;
  desde: number;
  docs: Documentos;
  pix: string;
  /** live state, only meaningful while online or on a ride */
  sinal: boolean;
  /** last position actually received by the server */
  posRecebida: { x: number; y: number };
  ultimaPosicaoEm: number;
  /** where the bike really is (the simulation knows; a real server would not) */
  posReal: { x: number; y: number };
  parado: No;
  corridaId?: string;
  /** scripted signal recovery time for the seeded courier that is out of signal */
  voltaEm?: number;
  /** the "no signal" alert already fired for the current outage */
  alertado?: boolean;
}

export type StatusCorrida = "aguardando" | "indo_coleta" | "na_coleta" | "em_rota" | "no_destino" | "entregue" | "cancelada";

export interface Perna {
  caminho: No[];
  inicio: number;
  /** sim ms per world unit */
  msPorQuadra: number;
}

export interface Corrida {
  id: string;
  empresaId: string;
  entregadorId?: string;
  coleta: Ponto;
  destino: Ponto & { contato: string; telefone: string };
  kmRota: number;
  kmReta: number;
  preco: number;
  repasse: number;
  status: StatusCorrida;
  criadaEm: number;
  aceitaEm?: number;
  chegouColetaEm?: number;
  coletadaEm?: number;
  chegouDestinoEm?: number;
  entregueEm?: number;
  canceladaEm?: number;
  motivoCancelamento?: string;
  codigoEntrega: string;
  confirmadaPorCodigo?: boolean;
  quedasSinal: number;
  ofertas: number;
  obs?: string;
  perna?: Perna;
  /** who created it */
  origem: "app" | "painel";
  /** rides the person is driving in the simulator */
  sua?: boolean;
  /** automated couriers wait at the counter or the door until this time */
  esperaAte?: number;
  /** when the automatic dispatch may assign it */
  atribuirEm?: number;
}

export interface Evento {
  id: number;
  em: number;
  texto: string;
  tom: "ok" | "info" | "alerta" | "erro";
  corridaId?: string;
  entregadorId?: string;
}

export interface Tarifa {
  base: number;
  kmInclusos: number;
  porKm: number;
  repassePct: number;
  noturnoPct: number;
  noturnoDesde: number;
  /** how prices are measured; the platform uses the route, "reta" exists only for comparison */
  medida: "rota" | "reta";
}

export interface Toast {
  id: number;
  texto: string;
  tom: "ok" | "erro" | "info" | "alerta";
}
