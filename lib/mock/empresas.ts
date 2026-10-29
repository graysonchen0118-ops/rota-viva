import type { Empresa, No, Segmento } from "../types";
import { enderecoDe } from "../cidade";
import { DIA, INICIO } from "../format";
import { seeded } from "../rand";

// Businesses that request deliveries. Invented names, spread over the six neighbourhoods.

export const SEGMENTOS: Record<Segmento, string> = {
  farmacia: "Farmácia",
  padaria: "Padaria",
  floricultura: "Floricultura",
  autopecas: "Autopeças",
  petshop: "Pet shop",
  papelaria: "Papelaria e gráfica",
  moda: "Moda",
  restaurante: "Restaurante",
  laboratorio: "Laboratório",
  otica: "Ótica",
  ferragens: "Ferragens",
  cosmeticos: "Cosméticos",
  livraria: "Livraria",
  assistencia: "Assistência técnica",
  contabilidade: "Escritório contábil",
  acougue: "Açougue",
  cafeteria: "Cafeteria",
  presentes: "Presentes",
  esportes: "Artigos esportivos",
  mercado: "Mercado",
};

const BASE: [string, Segmento, No, string, string][] = [
  ["Farmácia Bem Viver", "farmacia", [1, 1], "Patrícia Lemos", "w1"],
  ["Drogaria Santa Luzia", "farmacia", [6, 7], "Rogério Campos", "h1"],
  ["Padaria Pão de Ouro", "padaria", [6, 2], "Antônio Ferraz", "h2"],
  ["Floricultura Jardim Secreto", "floricultura", [3, 6], "Helena Duarte", "w2"],
  ["Autopeças Rodovia", "autopecas", [11, 2], "Marcos Teixeira", "h3"],
  ["Pet Shop Amigo Fiel", "petshop", [10, 7], "Camila Rocha", "w3"],
  ["Papelaria e Gráfica Traço", "papelaria", [3, 3], "Sérgio Nogueira", "h4"],
  ["Boutique Maré Alta", "moda", [7, 1], "Juliana Prado", "w4"],
  ["Cozinha da Dona Neide", "restaurante", [5, 6], "Neide Barbosa", "w5"],
  ["Laboratório Vida Análises", "laboratorio", [4, 2], "Fábio Moura", "h5"],
  ["Ótica Visão Clara", "otica", [1, 8], "Renata Silveira", "w6"],
  ["Ferragens Martelo Forte", "ferragens", [10, 3], "José Carlos Pinto", "h6"],
  ["Empório Bela Pele", "cosmeticos", [11, 6], "Larissa Mendes", "w7"],
  ["Livraria Página Viva", "livraria", [5, 3], "Gustavo Arantes", "h7"],
  ["Conserta Já Celulares", "assistencia", [8, 8], "Thiago Ribeiro", "h8"],
  ["Contábil Exata", "contabilidade", [2, 0], "Vera Lúcia Andrade", "w8"],
  ["Açougue Boi na Brasa", "acougue", [0, 5], "Rubens Oliveira", "h9"],
  ["Café Grão Mineiro", "cafeteria", [8, 0], "Bianca Freitas", "w9"],
  ["Casa de Presentes Laço", "presentes", [12, 9], "Simone Cardoso", "w10"],
  ["Esportes Arena", "esportes", [12, 1], "Ricardo Furtado", "h10"],
  ["Mercadinho Bom Preço", "mercado", [7, 5], "Francisco Lima", "h11"],
  ["Drogaria Nova Esperança", "farmacia", [9, 8], "Eduardo Matos", "h12"],
  ["Laboratório São Lucas", "laboratorio", [2, 7], "Cristina Albuquerque", "w11"],
  ["Moto Peças Serra", "autopecas", [6, 9], "André Moreira", "h13"],
];

// businesses that share a segment get their own photo
const FOTO_PROPRIA: Record<string, string> = { e2: "loja-farmacia-2", e22: "loja-farmacia-3", e23: "loja-laboratorio-2", e24: "loja-autopecas-2" };

const cnpj = (r: () => number) => {
  const d = (n: number) => Array.from({ length: n }, () => Math.floor(r() * 10)).join("");
  return `${d(2)}.${d(3)}.${d(3)}/0001-${d(2)}`;
};
const tel = (r: () => number) => `(11) 9${Math.floor(1000 + r() * 8999)}-${Math.floor(1000 + r() * 8999)}`;
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, "");

export const EMPRESAS: Empresa[] = BASE.map(([nome, segmento, no, contato, contatoFoto], i) => {
  const r = seeded(900 + i * 17);
  return {
    id: `e${i + 1}`,
    nome,
    segmento,
    cnpj: cnpj(r),
    contato,
    contatoFoto: `contato-${contatoFoto}`,
    telefone: tel(r),
    email: `${slug(contato.split(" ")[0])}@${slug(nome).slice(0, 14)}.com.br`,
    coleta: enderecoDe(no, i),
    foto: FOTO_PROPRIA[`e${i + 1}`] ?? `loja-${segmento}`,
    status: i === 19 ? "suspensa" : "ativa",
    desde: INICIO - (40 + Math.floor(r() * 300)) * DIA,
    corridasMes: 12 + Math.floor(r() * 90),
  };
});

/** the business whose phone is shown in the live simulator */
export const EMPRESA_SIMULADOR = "e1";
