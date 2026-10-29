"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Crosshair, Minus, Plus } from "lucide-react";
import { mount, damp } from "./kit";
import { COR, construirCidade, geometriaMoto, mundo, placa } from "./cena";
import { useStore, agoraInterpolado, sinalDe } from "@/lib/store";
import { posicaoNaPerna, rota, kmDe, kmRetaDe } from "@/lib/cidade";
import type { Corrida, Entregador, No } from "@/lib/types";
import type { Pulso } from "@/lib/bus";
import { ha } from "@/lib/format";

export interface PropsCidade {
  modo: "fundo" | "mapa";
  foco?: string | null;
  corridaFoco?: string | null;
  comparar?: { a: No; b: No } | null;
  mostrarReal?: boolean;
  className?: string;
  distancia?: number;
}

type Moto = {
  g: THREE.Group;
  corpo: THREE.Mesh;
  halo: THREE.Mesh;
  haloMat: THREE.MeshBasicMaterial;
  marca: THREE.Mesh;
  marcaMat: THREE.MeshBasicMaterial;
  fantasma: THREE.Mesh;
  linhaFantasma: THREE.Line;
  tag: THREE.Mesh | null;
  tagTexto: string;
  ang: number;
  pos: THREE.Vector3;
  visto: boolean;
};

type Onda = { m: THREE.Mesh; mat: THREE.MeshBasicMaterial; t: number; dur: number; max: number };

// Keyframes for the home page backdrop: the camera travels to each story the page tells.
const QUADROS: Record<string, { alvo: [number, number, number]; dist: number; polar: number; azim: number }> = {
  inicio: { alvo: [1.5, 0, 0.5], dist: 27, polar: 0.92, azim: 0.62 },
  sinal: { alvo: [0, 0, 0], dist: 10.5, polar: 0.82, azim: 0.35 },
  preco: { alvo: [-2.2, 0, 1.2], dist: 15, polar: 0.72, azim: -0.18 },
  rede: { alvo: [0, 0, 0], dist: 23, polar: 0.98, azim: -0.55 },
  fim: { alvo: [0, 0, 0], dist: 30, polar: 0.55, azim: 0.15 },
};

const COMPARACAO_PADRAO: { a: No; b: No } = { a: [5, 3], b: [5, 6] };

export default function CidadeViva({ modo, foco, corridaFoco, comparar, mostrarReal, className, distancia }: PropsCidade) {
  const host = useRef<HTMLDivElement | null>(null);
  const st = useStore();
  const props = useRef({ foco, corridaFoco, comparar, mostrarReal, distancia });
  props.current = { foco, corridaFoco, comparar, mostrarReal, distancia };
  const zoom = useRef(1);
  const azimExtra = useRef(0);
  const ref = st.estadoRef;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const stage = mount(el);
    if (!stage) return;
    const { scene, renderer, small } = stage;
    el.dataset.pronto = "1";

    const cam = new THREE.PerspectiveCamera(modo === "fundo" ? 34 : 38, 1, 0.1, 200);
    scene.fog = new THREE.Fog(0xf4f5f7, 34, 70);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc9d2e3, 1.55));
    const sol = new THREE.DirectionalLight(0xffffff, 1.35);
    sol.position.set(-8, 14, 10);
    scene.add(sol);

    const s0 = ref.current;
    const cidade = construirCidade(
      s0.empresas.map((e) => ({ id: e.id, no: e.coleta.no, nome: e.nome })),
      small,
    );
    scene.add(cidade.grupo);

    // bikes
    const geo = geometriaMoto();
    const matMoto = new THREE.MeshLambertMaterial({ vertexColors: true });
    const matFantasma = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.32, depthWrite: false });
    const haloGeo = new THREE.RingGeometry(0.34, 0.5, 28).rotateX(-Math.PI / 2);
    const marcaGeo = new THREE.SphereGeometry(0.13, 12, 10);
    const motos = new Map<string, Moto>();
    const criarMoto = (id: string): Moto => {
      const g = new THREE.Group();
      const corpo = new THREE.Mesh(geo, matMoto);
      const haloMat = new THREE.MeshBasicMaterial({ color: COR.acento, transparent: true, opacity: 0.55, depthWrite: false });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.y = 0.03;
      const marcaMat = new THREE.MeshBasicMaterial({ color: COR.acento });
      const marca = new THREE.Mesh(marcaGeo, marcaMat);
      marca.position.y = 1.05;
      const pau = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 4), new THREE.MeshBasicMaterial({ color: 0x9aa3b2 }));
      pau.position.y = 0.8;
      g.add(corpo, halo, marca, pau);
      scene.add(g);
      const fantasma = new THREE.Mesh(geo, matFantasma);
      fantasma.visible = false;
      scene.add(fantasma);
      const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const linhaFantasma = new THREE.Line(lg, new THREE.LineDashedMaterial({ color: COR.alerta, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0.9 }));
      linhaFantasma.visible = false;
      scene.add(linhaFantasma);
      const m: Moto = { g, corpo, halo, haloMat, marca, marcaMat, fantasma, linhaFantasma, tag: null, tagTexto: "", ang: 0, pos: new THREE.Vector3(), visto: false };
      motos.set(id, m);
      return m;
    };

    // routes of rides on the street
    const rotas = new Map<string, { linha: THREE.Line | THREE.Mesh; chave: string; destino: THREE.Mesh }>();
    const matRota = new THREE.LineBasicMaterial({ color: COR.acento, transparent: true, opacity: 0.38 });
    const matTubo = new THREE.MeshBasicMaterial({ color: COR.acento, transparent: true, opacity: 0.85 });
    const anelGeo = new THREE.RingGeometry(0.2, 0.3, 24).rotateX(-Math.PI / 2);
    const caminhoPontos = (c: No[]) => c.map(([x, y]) => mundo(x, y).setY(0.09));
    const tuboDe = (pts: THREE.Vector3[], raio: number, mat: THREE.Material) => {
      const path = new THREE.CurvePath<THREE.Vector3>();
      for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
      if (pts.length < 2) path.add(new THREE.LineCurve3(pts[0], pts[0].clone().add(new THREE.Vector3(0.01, 0, 0))));
      return new THREE.Mesh(new THREE.TubeGeometry(path, Math.max(8, pts.length * 6), raio, 6, false), mat);
    };
    const limparRota = (id: string) => {
      const r = rotas.get(id);
      if (!r) return;
      scene.remove(r.linha, r.destino);
      r.linha.geometry.dispose();
      (r.destino.material as THREE.Material).dispose();
      rotas.delete(id);
    };

    // straight line against street route, used on the home page and the price screen
    const comp = { grupo: new THREE.Group(), chave: "" };
    scene.add(comp.grupo);
    const montarComparacao = (par: { a: No; b: No } | null) => {
      const chave = par ? `${par.a}>${par.b}` : "";
      if (chave === comp.chave) return;
      comp.chave = chave;
      comp.grupo.children.slice().forEach((o) => {
        comp.grupo.remove(o);
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
      });
      if (!par) return;
      const cam1 = rota(par.a, par.b);
      const pts = caminhoPontos(cam1).map((p) => p.setY(0.16));
      comp.grupo.add(tuboDe(pts, 0.075, new THREE.MeshBasicMaterial({ color: COR.acento })));
      const A = mundo(par.a[0], par.a[1]).setY(0.5);
      const B = mundo(par.b[0], par.b[1]).setY(0.5);
      const lg = new THREE.BufferGeometry().setFromPoints([A, B]);
      const reta = new THREE.Line(lg, new THREE.LineDashedMaterial({ color: COR.erro, dashSize: 0.28, gapSize: 0.16 }));
      reta.computeLineDistances();
      comp.grupo.add(reta);
      for (const P of [A, B]) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), new THREE.MeshBasicMaterial({ color: COR.erro }));
        m.position.copy(P);
        comp.grupo.add(m);
      }
      const t1 = placa(`Linha reta ${kmRetaDe(par.a, par.b).toLocaleString("pt-BR", { minimumFractionDigits: 1 })} km`, "#e04f5f", "#ffffff", 2.3);
      t1.position.copy(A.clone().lerp(B, 0.5)).add(new THREE.Vector3(0, 1.1, 0));
      const meio = pts[Math.floor(pts.length / 2)].clone();
      const t2 = placa(`Pela rua ${kmDe(cam1).toLocaleString("pt-BR", { minimumFractionDigits: 1 })} km`, "#3b5bfd", "#ffffff", 2.3);
      t2.position.copy(meio).add(new THREE.Vector3(0, 0.9, 0));
      t1.userData.olha = t2.userData.olha = true;
      comp.grupo.add(t1, t2);
    };

    // one-off 3D answers to what happens on the page
    const ondas: Onda[] = [];
    const ondaGeo = new THREE.RingGeometry(0.3, 0.42, 36).rotateX(-Math.PI / 2);
    const onda = (p: THREE.Vector3, cor: number, max = 4, dur = 1.3) => {
      const mat = new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.9, depthWrite: false });
      const m = new THREE.Mesh(ondaGeo, mat);
      m.position.copy(p).setY(0.12);
      scene.add(m);
      ondas.push({ m, mat, t: 0, dur, max });
    };
    const posDe = (id: string) => motos.get(id)?.pos.clone() ?? null;
    const aoPulso = (ev: Event) => {
      const p = (ev as CustomEvent<Pulso>).detail;
      if (p.tipo === "nova") {
        const c = ref.current.corridas.find((x) => x.id === p.corridaId);
        const pin = c ? cidade.pinos.get(c.empresaId) : null;
        if (pin) {
          onda(pin.position, COR.laranja, 3.2);
          pin.userData.pulo = 1;
        }
        return;
      }
      if (!("entregadorId" in p) || !p.entregadorId) return;
      const pos = posDe(p.entregadorId);
      if (!pos) return;
      if (p.tipo === "aceita") onda(pos, COR.acento, 4.5);
      if (p.tipo === "coletada") onda(pos, COR.laranja, 3.5);
      if (p.tipo === "entregue") {
        onda(pos, COR.ok, 5, 1.6);
        onda(pos, COR.ok, 2.6, 1.0);
      }
      if (p.tipo === "semSinal") onda(pos, COR.alerta, 5, 1.8);
      if (p.tipo === "sinalVoltou") onda(pos, COR.ok, 4);
    };
    window.addEventListener("rv:pulso", aoPulso);

    // camera
    const alvo = new THREE.Vector3(...QUADROS.inicio.alvo);
    const alvoDesejado = alvo.clone();
    let dist = QUADROS.inicio.dist;
    let polar = QUADROS.inicio.polar;
    let azim = QUADROS.inicio.azim;
    let quadro = "inicio";
    let px = 0;
    let py = 0;
    const aoMover = (e: PointerEvent) => {
      px = e.clientX / window.innerWidth - 0.5;
      py = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", aoMover);

    // drag to turn the map
    let arrastando = false;
    let ultimoX = 0;
    const down = (e: PointerEvent) => {
      if (modo !== "mapa" || e.pointerType !== "mouse") return;
      arrastando = true;
      ultimoX = e.clientX;
    };
    const move = (e: PointerEvent) => {
      if (!arrastando) return;
      azimExtra.current += (e.clientX - ultimoX) * 0.006;
      ultimoX = e.clientX;
    };
    const up = () => (arrastando = false);
    if (modo === "mapa") {
      renderer.domElement.addEventListener("pointerdown", down);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    }

    let visivel = true;
    const io = new IntersectionObserver((ents) => (visivel = ents[0]?.isIntersecting ?? true));
    io.observe(el);

    const resize = (w: number, h: number) => {
      cam.aspect = w / h;
      if (modo === "fundo" && w > 900) cam.setViewOffset(w, h, -w * 0.18, 0, w, h);
      else cam.clearViewOffset();
      cam.updateProjectionMatrix();
    };
    const { w, h } = stage.size();
    resize(w, h);
    stage.onResize(resize);

    let relogioTag = 0;
    stage.loop((dt, t) => {
      if (!visivel) return;
      const s = ref.current;
      const agora = agoraInterpolado();
      const pr = props.current;
      cidade.rioTex.offset.x = (t * 0.02) % 1;

      // where to look
      if (modo === "fundo") {
        const secs = document.querySelectorAll<HTMLElement>("[data-cena]");
        let melhor = "inicio";
        let menor = Infinity;
        const meio = window.innerHeight * 0.45;
        secs.forEach((sec) => {
          const r = sec.getBoundingClientRect();
          const d = Math.abs(r.top + Math.min(r.height, window.innerHeight) / 2 - meio);
          if (d < menor) {
            menor = d;
            melhor = sec.dataset.cena || "inicio";
          }
        });
        quadro = melhor;
        const q = QUADROS[quadro] ?? QUADROS.inicio;
        alvoDesejado.set(...q.alvo);
        if (quadro === "sinal") {
          const m = motos.get(s.entregadores.find((e) => !e.sinal && (e.status === "em_corrida" || e.status === "online"))?.id ?? "");
          if (m) alvoDesejado.copy(m.pos).add(new THREE.Vector3(1.4, 0, 0.6));
        }
        dist = damp(dist, q.dist * (small ? 1.3 : 1), 2.2, dt);
        polar = damp(polar, q.polar + py * 0.06, 2.2, dt);
        azim = damp(azim, q.azim + px * 0.18 + Math.sin(t * 0.05) * 0.04, 2.2, dt);
      } else {
        const focoMoto = pr.foco ? motos.get(pr.foco) : null;
        if (focoMoto) alvoDesejado.copy(focoMoto.pos);
        else if (pr.comparar) {
          alvoDesejado.copy(mundo((pr.comparar.a[0] + pr.comparar.b[0]) / 2, (pr.comparar.a[1] + pr.comparar.b[1]) / 2));
        } else alvoDesejado.set(0, 0, 0.4);
        const base = pr.distancia ? (focoMoto ? Math.min(pr.distancia, 16) : pr.distancia) : focoMoto ? 15 : 25;
        dist = damp(dist, base / zoom.current, 3, dt);
        polar = damp(polar, focoMoto ? 0.58 : 0.86, 2.5, dt);
        azim = damp(azim, 0.45 + azimExtra.current + px * 0.05, 3, dt);
      }
      alvo.x = damp(alvo.x, alvoDesejado.x, 2.6, dt);
      alvo.y = damp(alvo.y, alvoDesejado.y, 2.6, dt);
      alvo.z = damp(alvo.z, alvoDesejado.z, 2.6, dt);
      cam.position.set(alvo.x + dist * Math.sin(polar) * Math.sin(azim), alvo.y + dist * Math.cos(polar), alvo.z + dist * Math.sin(polar) * Math.cos(azim));
      cam.lookAt(alvo);

      // comparison
      montarComparacao(modo === "fundo" ? (quadro === "preco" ? COMPARACAO_PADRAO : null) : pr.comparar ?? null);
      comp.grupo.children.forEach((o) => {
        if (o.userData.olha) o.quaternion.copy(cam.quaternion);
      });

      // bikes
      const atualizarTags = t - relogioTag > 1;
      if (atualizarTags) relogioTag = t;
      const vivos = new Set<string>();
      for (const e of s.entregadores) {
        if (e.status !== "online" && e.status !== "em_corrida") continue;
        vivos.add(e.id);
        const m = motos.get(e.id) ?? criarMoto(e.id);
        const c = e.corridaId ? s.corridas.find((x) => x.id === e.corridaId) : undefined;
        const real = posReal(e, c, agora);
        const conhecida = e.sinal ? real : { x: e.posRecebida.x, y: e.posRecebida.y, ang: m.ang };
        const alvoP = mundo(conhecida.x, conhecida.y);
        if (!m.visto) {
          m.pos.copy(alvoP);
          m.visto = true;
        } else {
          m.pos.x = damp(m.pos.x, alvoP.x, 10, dt);
          m.pos.z = damp(m.pos.z, alvoP.z, 10, dt);
        }
        if (e.sinal && !Number.isNaN(real.ang)) m.ang = real.ang;
        m.g.position.copy(m.pos);
        m.corpo.rotation.y = -m.ang;
        const sn = sinalDe(e, agora, s.modoComum);
        const cor = sn.tipo === "sem" ? COR.alerta : sn.tipo === "atraso" ? 0xf1c27d : e.status === "em_corrida" ? COR.acento : COR.ok;
        m.haloMat.color.setHex(cor);
        m.marcaMat.color.setHex(cor);
        const pulsa = sn.tipo === "sem" ? 1 + Math.sin(t * 5) * 0.18 : 1;
        m.halo.scale.setScalar(pulsa);
        m.haloMat.opacity = sn.tipo === "sem" ? 0.75 : 0.5;
        const destaque = pr.foco === e.id;
        m.marca.scale.setScalar(destaque ? 1.5 : 1);

        // the honest tag over a courier out of signal
        const querTag = sn.tipo === "sem" || sn.tipo === "atraso";
        if (querTag && atualizarTags) {
          const texto = sn.tipo === "sem" ? `Sem sinal ${ha(sn.idade)}` : `Posição ${ha(sn.idade)}`;
          if (texto !== m.tagTexto) {
            if (m.tag) {
              m.g.remove(m.tag);
              m.tag.geometry.dispose();
              const mt = m.tag.material as THREE.MeshBasicMaterial;
              mt.map?.dispose();
              mt.dispose();
            }
            m.tag = placa(texto, sn.tipo === "sem" ? "#e9a23b" : "#f6dfb4", sn.tipo === "sem" ? "#ffffff" : "#5c4310", 1.9);
            m.tag.position.y = 1.55;
            m.g.add(m.tag);
            m.tagTexto = texto;
          }
        }
        if (!querTag && m.tag) {
          m.g.remove(m.tag);
          m.tag.geometry.dispose();
          (m.tag.material as THREE.MeshBasicMaterial).map?.dispose();
          (m.tag.material as THREE.Material).dispose();
          m.tag = null;
          m.tagTexto = "";
        }
        if (m.tag) m.tag.quaternion.copy(cam.quaternion);

        // where the bike really is, shown only where the page is telling that story
        const mostra = !e.sinal && !s.modoComum && (modo === "fundo" ? quadro === "sinal" : !!pr.mostrarReal);
        m.fantasma.visible = mostra;
        m.linhaFantasma.visible = mostra;
        if (mostra) {
          const pr2 = mundo(real.x, real.y);
          m.fantasma.position.copy(pr2);
          m.fantasma.rotation.y = Number.isNaN(real.ang) ? -m.ang : -real.ang;
          const arr = m.linhaFantasma.geometry.getAttribute("position") as THREE.BufferAttribute;
          arr.setXYZ(0, m.pos.x, 0.35, m.pos.z);
          arr.setXYZ(1, pr2.x, 0.35, pr2.z);
          arr.needsUpdate = true;
          m.linhaFantasma.computeLineDistances();
        }
      }
      for (const [id, m] of motos) {
        const v = vivos.has(id);
        m.g.visible = v;
        if (!v) {
          m.fantasma.visible = false;
          m.linhaFantasma.visible = false;
          m.visto = false;
        }
      }

      // routes
      const ativos = new Set<string>();
      for (const c of s.corridas) {
        if (!c.perna || (c.status !== "indo_coleta" && c.status !== "em_rota")) continue;
        const focada = pr.corridaFoco === c.id || (!!pr.foco && c.entregadorId === pr.foco);
        if (modo === "fundo" && !focada && c.status !== "em_rota") continue;
        ativos.add(c.id);
        const chave = `${c.status}:${c.perna.inicio}:${focada ? 1 : 0}`;
        const atual = rotas.get(c.id);
        if (atual && atual.chave === chave) continue;
        limparRota(c.id);
        const pts = caminhoPontos(c.perna.caminho);
        const linha = focada ? tuboDe(pts, 0.06, matTubo) : new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), matRota);
        const dmat = new THREE.MeshBasicMaterial({ color: c.status === "indo_coleta" ? COR.laranja : COR.acento, transparent: true, opacity: focada ? 0.95 : 0.55, depthWrite: false });
        const destino = new THREE.Mesh(anelGeo, dmat);
        const fim = pts[pts.length - 1];
        destino.position.set(fim.x, 0.1, fim.z);
        scene.add(linha, destino);
        rotas.set(c.id, { linha, chave, destino });
      }
      for (const id of [...rotas.keys()]) if (!ativos.has(id)) limparRota(id);
      for (const [, r] of rotas) r.destino.scale.setScalar(1 + Math.sin(t * 3) * 0.12);

      // pins bob when a request is born
      for (const [, pin] of cidade.pinos) {
        const pulo = (pin.userData.pulo as number) || 0;
        const cab = pin.userData.cabeca as THREE.Mesh;
        cab.position.y = 0.62 + Math.sin(pulo * Math.PI) * 0.5;
        if (pulo > 0) pin.userData.pulo = Math.max(0, pulo - dt * 1.2);
      }

      for (let i = ondas.length - 1; i >= 0; i--) {
        const o = ondas[i];
        o.t += dt;
        const k = o.t / o.dur;
        o.m.scale.setScalar(1 + k * o.max);
        o.mat.opacity = 0.9 * (1 - k);
        if (k >= 1) {
          scene.remove(o.m);
          o.mat.dispose();
          ondas.splice(i, 1);
        }
      }

      renderer.render(scene, cam);
    });

    return () => {
      window.removeEventListener("rv:pulso", aoPulso);
      window.removeEventListener("pointermove", aoMover);
      renderer.domElement.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      io.disconnect();
      for (const id of [...rotas.keys()]) limparRota(id);
      stage.dispose();
      delete el.dataset.pronto;
    };
    // the scene is built once per mount; props are read through a ref every frame
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo]);

  return (
    <div ref={host} className={`cidade ${modo === "fundo" ? "cidade-fundo" : "cidade-mapa"} ${className ?? ""}`}>
      {modo === "mapa" && (
        <div className="mapa-ctrl" onPointerDown={(e) => e.stopPropagation()}>
          <button className="icon-btn" aria-label="Aproximar" onClick={() => (zoom.current = Math.min(2.6, zoom.current * 1.25))}>
            <Plus size={16} />
          </button>
          <button className="icon-btn" aria-label="Afastar" onClick={() => (zoom.current = Math.max(0.7, zoom.current / 1.25))}>
            <Minus size={16} />
          </button>
          <button
            className="icon-btn"
            aria-label="Centralizar"
            onClick={() => {
              zoom.current = 1;
              azimExtra.current = 0;
            }}
          >
            <Crosshair size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function posReal(e: Entregador, c: Corrida | undefined, agora: number) {
  if (c?.perna && (c.status === "indo_coleta" || c.status === "em_rota")) {
    const p = posicaoNaPerna(c.perna, agora);
    return { x: p.x, y: p.y, ang: p.ang };
  }
  return { x: e.posReal.x, y: e.posReal.y, ang: NaN };
}

