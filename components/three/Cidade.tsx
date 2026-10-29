"use client";

import dynamic from "next/dynamic";
import type { PropsCidade } from "./CidadeViva";

// The city is WebGL only, so it never renders on the server. The placeholder in the palette
// shows while it loads and stays if WebGL is unavailable.
const CidadeViva = dynamic(() => import("./CidadeViva"), { ssr: false });

export default function Cidade(p: PropsCidade) {
  return (
    <div className={p.modo === "fundo" ? "cidade-wrap-fundo" : `cidade-wrap-mapa ${p.className ?? ""}`}>
      <div className="cidade-ph" aria-hidden="true" />
      <CidadeViva {...p} className={undefined} />
    </div>
  );
}
