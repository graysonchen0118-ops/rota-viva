"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, SearchX, TriangleAlert, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { foto } from "@/lib/photos";
import type { StatusCorrida, StatusEntregador } from "@/lib/types";

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tom}`}>
          {t.tom === "ok" ? <CheckCircle2 size={18} /> : t.tom === "erro" ? <TriangleAlert size={18} /> : t.tom === "alerta" ? <AlertTriangle size={18} /> : <Info size={18} />}
          <span>{t.texto}</span>
        </div>
      ))}
    </div>
  );
}

export function Foto({ chave, w, h, alt, className, eager }: { chave: string; w: number; h: number; alt: string; className?: string; eager?: boolean }) {
  const [ok, setOk] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={foto(chave, w, h)}
      width={w}
      height={h}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={`foto ${ok ? "foto-ok" : ""} ${className ?? ""}`}
      onLoad={() => setOk(true)}
    />
  );
}

export function Avatar({ chave, nome, size = 36, className }: { chave: string; nome: string; size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={foto(chave, size * 2, size * 2, true)} width={size} height={size} alt={nome} className={`avatar ${className ?? ""}`} style={{ width: size, height: size }} loading="lazy" />
  );
}

/** inline skeleton, a span so it is safe inside text */
export function Skel({ h = 14, w = "100%", r = 8 }: { h?: number; w?: number | string; r?: number }) {
  return <span className="skel" style={{ height: h, width: w, borderRadius: r }} aria-hidden="true" />;
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />;
}

/** tilts a passive card or photo in perspective under the pointer, with the light following.
 * Never wrap something people type or tap into: 3D transforms upset hit testing. */
export function Tilt({ children, className, max = 6 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * max).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * max).toFixed(2)}deg`);
    el.style.setProperty("--lx", `${((x + 0.5) * 100).toFixed(0)}%`);
    el.style.setProperty("--ly", `${((y + 0.5) * 100).toFixed(0)}%`);
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };
  return (
    <div ref={ref} className={`tilt ${className ?? ""}`} onPointerMove={move} onPointerLeave={leave}>
      {children}
      <span className="tilt-light" aria-hidden="true" />
    </div>
  );
}

function useMontagem(aberto: boolean, ms = 260) {
  const [montado, setMontado] = useState(aberto);
  useEffect(() => {
    if (aberto) setMontado(true);
    else {
      const t = setTimeout(() => setMontado(false), ms);
      return () => clearTimeout(t);
    }
  }, [aberto, ms]);
  return montado;
}

export function Modal({ aberto, titulo, onFechar, children, largura = 520, rodape }: { aberto: boolean; titulo: string; onFechar: () => void; children: React.ReactNode; largura?: number; rodape?: React.ReactNode }) {
  const montado = useMontagem(aberto);
  useEffect(() => {
    if (!aberto) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [aberto, onFechar]);
  if (!montado) return null;
  return (
    <div className={`modal-wrap ${aberto ? "show" : ""}`}>
      <button className="modal-scrim" aria-label="Fechar" onClick={onFechar} />
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} style={{ maxWidth: largura }}>
        <div className="modal-head">
          <h3>{titulo}</h3>
          <button className="icon-btn" onClick={onFechar} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {rodape && <div className="modal-foot">{rodape}</div>}
      </div>
    </div>
  );
}

export function Gaveta({ aberto, titulo, sub, onFechar, children, rodape }: { aberto: boolean; titulo: string; sub?: React.ReactNode; onFechar: () => void; children: React.ReactNode; rodape?: React.ReactNode }) {
  const montado = useMontagem(aberto, 320);
  useEffect(() => {
    if (!aberto) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [aberto, onFechar]);
  if (!montado) return null;
  return (
    <div className={`gaveta-wrap ${aberto ? "show" : ""}`}>
      <button className="gaveta-scrim" aria-label="Fechar" onClick={onFechar} />
      <aside className="gaveta" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="gaveta-head">
          <div>
            <h3>{titulo}</h3>
            {sub && <div className="gaveta-sub">{sub}</div>}
          </div>
          <button className="icon-btn" onClick={onFechar} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="gaveta-body">{children}</div>
        {rodape && <div className="gaveta-foot">{rodape}</div>}
      </aside>
    </div>
  );
}

export const ROTULO_CORRIDA: Record<StatusCorrida, string> = {
  aguardando: "Aguardando aceite",
  indo_coleta: "Indo à coleta",
  na_coleta: "Na coleta",
  em_rota: "Em rota",
  no_destino: "No destino",
  entregue: "Entregue",
  cancelada: "Cancelada",
};
const TOM_CORRIDA: Record<StatusCorrida, string> = {
  aguardando: "alerta",
  indo_coleta: "info",
  na_coleta: "laranja",
  em_rota: "acento",
  no_destino: "laranja",
  entregue: "ok",
  cancelada: "erro",
};
export function StatusCorridaTag({ s }: { s: StatusCorrida }) {
  return <span className={`tag tag-${TOM_CORRIDA[s]}`}>{ROTULO_CORRIDA[s]}</span>;
}

export const ROTULO_ENTREGADOR: Record<StatusEntregador, string> = {
  online: "Livre",
  em_corrida: "Em corrida",
  offline: "Offline",
  pendente: "Em análise",
  recusado: "Recusado",
  bloqueado: "Bloqueado",
};
const TOM_ENTREGADOR: Record<StatusEntregador, string> = {
  online: "ok",
  em_corrida: "acento",
  offline: "neutro",
  pendente: "alerta",
  recusado: "erro",
  bloqueado: "erro",
};
export function StatusEntregadorTag({ s }: { s: StatusEntregador }) {
  return <span className={`tag tag-${TOM_ENTREGADOR[s]}`}>{ROTULO_ENTREGADOR[s]}</span>;
}

export function Vazio({ titulo, texto, acao }: { titulo: string; texto: string; acao?: React.ReactNode }) {
  return (
    <div className="vazio">
      <span className="vazio-icone">
        <SearchX size={22} />
      </span>
      <strong>{titulo}</strong>
      <p>{texto}</p>
      {acao}
    </div>
  );
}

export function Campo({ rotulo, erro, children, dica }: { rotulo: string; erro?: string; children: React.ReactNode; dica?: string }) {
  return (
    <label className={`campo ${erro ? "campo-erro" : ""}`}>
      <span className="campo-rotulo">{rotulo}</span>
      {children}
      {erro ? <span className="campo-msg">{erro}</span> : dica ? <span className="campo-dica">{dica}</span> : null}
    </label>
  );
}

/** a count that rolls up when the number changes */
export function Numero({ valor, formato }: { valor: number; formato: (v: number) => string }) {
  const [v, setV] = useState(valor);
  const de = useRef(valor);
  useEffect(() => {
    const ini = de.current;
    const t0 = performance.now();
    let raf = 0;
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / 600);
      const e = 1 - Math.pow(1 - k, 3);
      setV(ini + (valor - ini) * e);
      if (k < 1) raf = requestAnimationFrame(step);
      else de.current = valor;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [valor]);
  return <>{formato(v)}</>;
}

/** first paint shows skeletons for a moment, like a real API answering */
export function useCarregando(ms = 650) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOk(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return !ok;
}
