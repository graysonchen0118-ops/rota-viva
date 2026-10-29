// The page talks to the 3D scene through window events, so the scene never re-renders React.
export type Pulso =
  | { tipo: "aceita"; entregadorId: string }
  | { tipo: "coletada"; entregadorId: string }
  | { tipo: "entregue"; entregadorId: string }
  | { tipo: "semSinal"; entregadorId: string }
  | { tipo: "sinalVoltou"; entregadorId: string }
  | { tipo: "nova"; corridaId: string }
  | { tipo: "foco"; entregadorId?: string; corridaId?: string };

export function pulso(p: Pulso) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("rv:pulso", { detail: p }));
}
