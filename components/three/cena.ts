import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { COLS, ROWS, RIO_ENTRE, PONTES } from "@/lib/cidade";
import type { No } from "@/lib/types";
import { labelTexture, softShadow } from "./kit";

// Builds the city once: streets, blocks, buildings, the river and its two bridges, shop pins.
// Grid (x, y) maps to world (X, Z) with S units per block.

export const S = 2;
export const mundo = (x: number, y: number) => new THREE.Vector3((x - (COLS - 1) / 2) * S, 0, (y - (ROWS - 1) / 2) * S);

export const COR = {
  chao: 0xdfe3ea,
  calcada: 0xf3f4f7,
  rua: 0xcfd5de,
  faixa: 0xffffff,
  rio: 0x7fb1e3,
  rioFundo: 0x5d93cc,
  ponte: 0xb9c0cc,
  parque: 0xbfe0c4,
  arvore: 0x5fae7b,
  predios: [0xffffff, 0xf3f5f9, 0xe9edf4, 0xe1e7f1, 0xdde4ff, 0xf6efe8],
  janela: 0x9fb0d6,
  acento: 0x3b5bfd,
  laranja: 0xff7a45,
  ok: 0x1f9d63,
  alerta: 0xe9a23b,
  erro: 0xe04f5f,
  tinta: 0x0f1b2d,
};

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export interface Cidade {
  grupo: THREE.Group;
  rioTex: THREE.CanvasTexture;
  pinos: Map<string, THREE.Group>;
}

export function construirCidade(empresas: { id: string; no: No; nome: string }[], leve: boolean): Cidade {
  const g = new THREE.Group();
  const r = rand(77);
  const W = (COLS - 1) * S + 3.2;
  const D = (ROWS - 1) * S + 3.2;

  // the slab the city sits on, with a soft shadow under it
  const laje = new THREE.Mesh(new THREE.BoxGeometry(W, 0.5, D), new THREE.MeshLambertMaterial({ color: COR.rua }));
  laje.position.y = -0.25;
  g.add(laje);
  const sombra = softShadow(W * 1.25, D * 1.3, 0.28);
  sombra.position.y = -0.52;
  g.add(sombra);

  // lane markings on the two avenues and the riverside roads
  const faixaGeo: THREE.BufferGeometry[] = [];
  for (const y of [2, 4, 5, 8]) {
    for (let x = 0; x < COLS - 1; x++) {
      const a = mundo(x + 0.35, y);
      const p = new THREE.PlaneGeometry(S * 0.28, 0.035).rotateX(-Math.PI / 2);
      p.translate(a.x, 0.012, a.z);
      faixaGeo.push(p);
    }
  }
  const faixas = new THREE.Mesh(mergeGeometries(faixaGeo), new THREE.MeshBasicMaterial({ color: COR.faixa, transparent: true, opacity: 0.85 }));
  g.add(faixas);

  // the river band between row 4 and row 5, with a texture that drifts
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const cx = c.getContext("2d")!;
  const grad = cx.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, "#8dbbe9");
  grad.addColorStop(0.5, "#6fa6de");
  grad.addColorStop(1, "#8dbbe9");
  cx.fillStyle = grad;
  cx.fillRect(0, 0, 256, 64);
  cx.strokeStyle = "rgba(255,255,255,0.35)";
  cx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const y = 6 + r() * 52;
    const x = r() * 256;
    cx.beginPath();
    cx.moveTo(x, y);
    cx.lineTo(x + 24 + r() * 30, y);
    cx.stroke();
  }
  const rioTex = new THREE.CanvasTexture(c);
  rioTex.wrapS = THREE.RepeatWrapping;
  rioTex.repeat.set(5, 1);
  rioTex.colorSpace = THREE.SRGBColorSpace;
  const zR = mundo(0, RIO_ENTRE + 0.5).z;
  const rio = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.02, S * 0.78).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: rioTex }));
  rio.position.set(0, 0.006, zR);
  g.add(rio);
  // embankments
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, 0.12), new THREE.MeshLambertMaterial({ color: 0xc4ccd8 }));
    m.position.set(0, 0.05, zR + s * S * 0.4);
    g.add(m);
  }
  // the two bridges, the only places a bike can cross
  for (const px of PONTES) {
    const a = mundo(px, RIO_ENTRE + 0.5);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, S * 1.06), new THREE.MeshLambertMaterial({ color: COR.ponte }));
    deck.position.set(a.x, 0.1, a.z);
    g.add(deck);
    for (const s of [-1, 1]) {
      const grade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, S * 1.06), new THREE.MeshLambertMaterial({ color: 0x8e97a6 }));
      grade.position.set(a.x + s * 0.3, 0.24, a.z);
      g.add(grade);
    }
    for (const s of [-0.3, 0.3]) {
      const pilar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.14), new THREE.MeshLambertMaterial({ color: 0xa8b0bd }));
      pilar.position.set(a.x, -0.12, a.z + s * S);
      g.add(pilar);
    }
  }

  // blocks: sidewalks, buildings, parks with trees
  const calcGeo: THREE.BufferGeometry[] = [];
  const parqueGeo: THREE.BufferGeometry[] = [];
  type Pred = { x: number; z: number; w: number; d: number; h: number; cor: number };
  const predios: Pred[] = [];
  const arvores: { x: number; z: number; s: number }[] = [];
  const BL = S * 0.74;
  for (let bx = 0; bx < COLS - 1; bx++) {
    for (let by = 0; by < ROWS - 1; by++) {
      if (by === RIO_ENTRE) continue;
      const c0 = mundo(bx + 0.5, by + 0.5);
      const parque = (bx === 3 && by === 7) || (bx === 7 && by === 1) || (bx === 10 && by === 6);
      const p = new THREE.BoxGeometry(BL, 0.08, BL);
      p.translate(c0.x, 0.04, c0.z);
      (parque ? parqueGeo : calcGeo).push(p);
      if (parque) {
        for (let i = 0; i < 6; i++) arvores.push({ x: c0.x + (r() - 0.5) * BL * 0.8, z: c0.z + (r() - 0.5) * BL * 0.8, s: 0.7 + r() * 0.5 });
        continue;
      }
      const norte = by < RIO_ENTRE;
      const centro = norte && bx <= 4;
      const industrial = norte && bx >= 9;
      const sul = !norte;
      const n = industrial ? 1 + Math.floor(r() * 2) : sul ? 3 + Math.floor(r() * 2) : 2 + Math.floor(r() * 3);
      const cells = n <= 2 ? [[-0.22, 0], [0.22, 0]] : [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]];
      for (let i = 0; i < Math.min(n, cells.length); i++) {
        const [ox, oz] = cells[i];
        const w = industrial ? BL * 0.46 : BL * (0.36 + r() * 0.08);
        const d = n <= 2 ? BL * 0.86 : BL * (0.36 + r() * 0.08);
        const h = centro ? 0.9 + r() * 2.4 : industrial ? 0.45 + r() * 0.35 : sul ? 0.3 + r() * 0.55 : 0.6 + r() * 1.3;
        predios.push({ x: c0.x + ox * BL, z: c0.z + oz * BL, w, d, h, cor: COR.predios[Math.floor(r() * COR.predios.length)] });
      }
      if (sul && r() < 0.5) arvores.push({ x: c0.x + (r() - 0.5) * BL * 0.9, z: c0.z + BL * 0.47, s: 0.5 + r() * 0.3 });
    }
  }
  g.add(new THREE.Mesh(mergeGeometries(calcGeo), new THREE.MeshLambertMaterial({ color: COR.calcada })));
  g.add(new THREE.Mesh(mergeGeometries(parqueGeo), new THREE.MeshLambertMaterial({ color: COR.parque })));

  const pg = new THREE.BoxGeometry(1, 1, 1);
  pg.translate(0, 0.5, 0);
  const pm = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const inst = new THREE.InstancedMesh(pg, pm, predios.length);
  const m4 = new THREE.Matrix4();
  const col = new THREE.Color();
  predios.forEach((p, i) => {
    m4.compose(new THREE.Vector3(p.x, 0.08, p.z), new THREE.Quaternion(), new THREE.Vector3(p.w, p.h, p.d));
    inst.setMatrixAt(i, m4);
    inst.setColorAt(i, col.setHex(p.cor));
  });
  inst.frustumCulled = false;
  g.add(inst);
  // window bands on the taller buildings, one merged mesh
  if (!leve) {
    const jan: THREE.BufferGeometry[] = [];
    for (const p of predios) {
      if (p.h < 0.8) continue;
      const andares = Math.floor(p.h / 0.32);
      for (let k = 1; k < andares; k++) {
        const b = new THREE.BoxGeometry(p.w * 1.004, 0.05, p.d * 1.004);
        b.translate(p.x, 0.08 + k * 0.32, p.z);
        jan.push(b);
      }
    }
    if (jan.length) g.add(new THREE.Mesh(mergeGeometries(jan), new THREE.MeshLambertMaterial({ color: COR.janela, transparent: true, opacity: 0.55 })));
  }

  const tg = new THREE.ConeGeometry(0.16, 0.42, 7);
  tg.translate(0, 0.32, 0);
  const tronco = new THREE.CylinderGeometry(0.03, 0.03, 0.14, 5);
  tronco.translate(0, 0.07, 0);
  const tree = new THREE.InstancedMesh(mergeGeometries([tg, tronco]), new THREE.MeshLambertMaterial({ color: COR.arvore }), arvores.length);
  arvores.forEach((a, i) => {
    m4.compose(new THREE.Vector3(a.x, 0.08, a.z), new THREE.Quaternion(), new THREE.Vector3(a.s, a.s, a.s));
    tree.setMatrixAt(i, m4);
  });
  tree.frustumCulled = false;
  g.add(tree);

  // shop pins: a post and an orange head with the shop's initial plate
  const pinos = new Map<string, THREE.Group>();
  const cabeca = new THREE.SphereGeometry(0.15, 14, 10);
  const haste = new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6);
  haste.translate(0, 0.25, 0);
  const matPino = new THREE.MeshLambertMaterial({ color: COR.laranja });
  const matHaste = new THREE.MeshLambertMaterial({ color: 0x6b7280 });
  for (const e of empresas) {
    const p = mundo(e.no[0], e.no[1]);
    const gp = new THREE.Group();
    gp.position.set(p.x + 0.42, 0, p.z - 0.42);
    const h = new THREE.Mesh(haste, matHaste);
    const c1 = new THREE.Mesh(cabeca, matPino);
    c1.position.y = 0.62;
    const base = softShadow(0.5, 0.5, 0.3);
    base.position.y = 0.02;
    gp.add(h, c1, base);
    gp.userData.cabeca = c1;
    pinos.set(e.id, gp);
    g.add(gp);
  }

  return { grupo: g, rioTex, pinos };
}

/** a delivery bike: body, wheels, rider, orange box, merged into one mesh with vertex colours */
let motoGeo: THREE.BufferGeometry | null = null;
export function geometriaMoto() {
  if (motoGeo) return motoGeo;
  const parts: [THREE.BufferGeometry, number][] = [];
  const add = (geo: THREE.BufferGeometry, color: number) => parts.push([geo, color]);
  const corpo = new THREE.BoxGeometry(0.42, 0.1, 0.1);
  corpo.translate(0, 0.17, 0);
  add(corpo, 0x24324a);
  const tanque = new THREE.BoxGeometry(0.14, 0.08, 0.12);
  tanque.translate(0.07, 0.25, 0);
  add(tanque, 0xd8443a);
  for (const x of [-0.17, 0.17]) {
    const roda = new THREE.CylinderGeometry(0.085, 0.085, 0.05, 12).rotateX(Math.PI / 2);
    roda.translate(x, 0.085, 0);
    add(roda, 0x1b1f27);
  }
  const guidao = new THREE.BoxGeometry(0.03, 0.03, 0.2);
  guidao.translate(0.17, 0.33, 0);
  add(guidao, 0x1b1f27);
  const piloto = new THREE.CylinderGeometry(0.06, 0.075, 0.24, 8);
  piloto.translate(-0.01, 0.36, 0);
  add(piloto, 0x2c4bd8);
  const capacete = new THREE.SphereGeometry(0.07, 10, 8);
  capacete.translate(0.0, 0.53, 0);
  add(capacete, 0xf2f4f8);
  const bau = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  bau.translate(-0.17, 0.36, 0);
  add(bau, COR.laranja);
  const geos = parts.map(([geo, color]) => {
    const g2 = geo.index ? geo.toNonIndexed() : geo;
    const n = g2.getAttribute("position").count;
    const cc = new THREE.Color(color);
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = cc.r;
      arr[i * 3 + 1] = cc.g;
      arr[i * 3 + 2] = cc.b;
    }
    g2.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    g2.deleteAttribute("uv");
    return g2;
  });
  motoGeo = mergeGeometries(geos)!;
  motoGeo.scale(1.25, 1.25, 1.25);
  return motoGeo;
}

/** text plate used for the "no signal" tags and the distance labels */
export function placa(texto: string, fundo: string, cor: string, largura = 1.6) {
  const tex = labelTexture(texto, { bg: fundo, color: cor, w: 512, h: 112, size: 50, radius: 40 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(largura, (largura * 112) / 512), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  m.renderOrder = 10;
  return m;
}
