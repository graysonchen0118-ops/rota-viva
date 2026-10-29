"use client";

import { useMemo, useState } from "react";
import { Download, KeyRound, Timer, WifiOff, XCircle } from "lucide-react";
import { Avatar, Skel, useCarregando } from "../ui";
import { useStore } from "@/lib/store";
import { BAIRROS } from "@/lib/cidade";
import { DIA, HORA, INICIO, diaCurto, mesmoDia, nomeCurto, num, reais } from "@/lib/format";

type Periodo = "hoje" | "semana";

export default function Relatorios() {
  const st = useStore();
  const carregando = useCarregando(800);
  const [periodo, setPeriodo] = useState<Periodo>("semana");

  const dados = useMemo(() => {
    const base = st.corridas.filter((c) => (periodo === "hoje" ? mesmoDia(c.criadaEm, st.agora) : true));
    const entregues = base.filter((c) => c.status === "entregue");
    const canceladas = base.filter((c) => c.status === "cancelada");
    const aceites = base.filter((c) => c.aceitaEm).map((c) => (c.aceitaEm! - c.criadaEm) / 1000);
    const comCodigo = entregues.filter((c) => c.confirmadaPorCodigo).length;
    const quedas = base.reduce((a, c) => a + c.quedasSinal, 0);

    // bars: per day for the week, per hour for today
    let barras: { rot: string; v: number; sub?: string }[] = [];
    if (periodo === "semana") {
      for (let d = 6; d >= 0; d--) {
        const ref = INICIO - d * DIA;
        const doDia = st.corridas.filter((c) => mesmoDia(c.criadaEm, ref));
        barras.push({ rot: d === 0 ? "Hoje" : diaCurto(ref).split(" ")[0], v: doDia.length, sub: `${doDia.reduce((a, c) => a + c.quedasSinal, 0)} quedas` });
      }
    } else {
      const ini = INICIO - (11 * HORA + 42 * 60_000) + 8 * HORA;
      for (let h = 0; h < 13; h++) {
        const de = ini + h * HORA;
        barras.push({ rot: `${8 + h}h`, v: base.filter((c) => c.criadaEm >= de && c.criadaEm < de + HORA).length });
      }
    }
    const max = Math.max(1, ...barras.map((b) => b.v));
    barras = barras.map((b) => ({ ...b, h: b.v / max }));

    const porEmp = new Map<string, { n: number; v: number }>();
    for (const c of entregues) {
      const x = porEmp.get(c.empresaId) ?? { n: 0, v: 0 };
      x.n++;
      x.v += c.preco;
      porEmp.set(c.empresaId, x);
    }
    const topEmp = [...porEmp.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 6);
    const porEnt = new Map<string, { n: number; v: number; km: number }>();
    for (const c of entregues) {
      if (!c.entregadorId) continue;
      const x = porEnt.get(c.entregadorId) ?? { n: 0, v: 0, km: 0 };
      x.n++;
      x.v += c.repasse;
      x.km += c.kmRota;
      porEnt.set(c.entregadorId, x);
    }
    const topEnt = [...porEnt.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 6);
    const bairros = BAIRROS.map((b) => ({ b, n: entregues.filter((c) => c.destino.bairro === b).length }));
    const maxB = Math.max(1, ...bairros.map((x) => x.n));
    const cruzaram = entregues.filter((c) => c.kmRota - c.kmReta > 1).length;
    return { base, entregues, canceladas, aceites, comCodigo, quedas, barras: barras as { rot: string; v: number; sub?: string; h: number }[], topEmp, topEnt, bairros, maxB, cruzaram, valor: entregues.reduce((a, c) => a + c.preco, 0) };
  }, [st.corridas, st.agora, periodo]);

  const media = dados.aceites.length ? dados.aceites.reduce((a, b) => a + b, 0) / dados.aceites.length : 0;
  const exportar = () => {
    const linhas = [["corrida", "empresa", "entregador", "status", "criada", "km_rua", "km_reta", "preco", "repasse", "codigo_conferido", "quedas_sinal"]];
    for (const c of dados.base) {
      linhas.push([c.id, st.empresas.find((e) => e.id === c.empresaId)?.nome ?? "", st.entregadores.find((e) => e.id === c.entregadorId)?.nome ?? "", c.status, new Date(c.criadaEm).toISOString(), String(c.kmRota), String(c.kmReta), c.preco.toFixed(2), c.repasse.toFixed(2), c.confirmadaPorCodigo ? "sim" : "nao", String(c.quedasSinal)]);
    }
    const csv = linhas.map((l) => l.map((x) => `"${x.replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `corridas-${periodo}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    st.toast(`${dados.base.length} corridas exportadas em CSV.`, "ok");
  };

  return (
    <div className="pg">
      <div className="pg-cab">
        <div>
          <h1>Relatórios da operação</h1>
          <p>Volume, tempo até o aceite, entregas fechadas com código e quedas de sinal, para ver onde a operação engasga.</p>
        </div>
        <div className="pg-cab-acoes">
          <div className="chips sem-margem">
            {(["hoje", "semana"] as const).map((p) => (
              <button key={p} className={`chip ${periodo === p ? "ativo" : ""}`} onClick={() => setPeriodo(p)}>
                {p === "hoje" ? "Hoje" : "Últimos 7 dias"}
              </button>
            ))}
          </div>
          <button className="btn btn-claro" onClick={exportar}>
            <Download size={15} /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="kpis">
        {[
          { i: Timer, r: "Tempo médio até o aceite", v: `${num(Math.round(media))} s` },
          { i: KeyRound, r: "Fechadas com código", v: `${dados.entregues.length ? num(Math.round((dados.comCodigo / dados.entregues.length) * 100)) : 0}%` },
          { i: WifiOff, r: "Quedas de sinal em corrida", v: num(dados.quedas) },
          { i: XCircle, r: "Canceladas", v: `${num(dados.canceladas.length)} de ${num(dados.base.length)}` },
        ].map((k, i) => (
          <div key={k.r} className={`kpi entra d${i + 1}`}>
            <span className="kpi-icone">
              <k.i size={18} />
            </span>
            <span className="kpi-rot">{k.r}</span>
            <strong>{carregando ? <Skel h={26} w={80} /> : k.v}</strong>
          </div>
        ))}
      </div>

      <div className="rel-grade">
        <section className="cartao">
          <div className="cartao-cab">
            <h2>{periodo === "semana" ? "Corridas por dia" : "Corridas por hora"}</h2>
            <span className="cartao-sub">{num(dados.base.length)} no período · {reais(dados.valor)} entregues</span>
          </div>
          {carregando ? (
            <Skel h={220} />
          ) : (
            <div className="barras" role="img" aria-label="Gráfico de corridas">
              {dados.barras.map((b, i) => (
                <div key={b.rot} className="barra-col">
                  <span className="barra-v">{b.v}</span>
                  <div className="barra-fundo">
                    <span className="barra" style={{ height: `${Math.max(3, b.h * 100)}%`, animationDelay: `${i * 0.05}s` }} />
                  </div>
                  <span className="barra-rot">{b.rot}</span>
                  {b.sub && <small>{b.sub}</small>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="cartao">
          <div className="cartao-cab">
            <h2>Entregas por bairro de destino</h2>
            <span className="cartao-sub">{dados.cruzaram} cruzaram o rio pela ponte</span>
          </div>
          <div className="hbarras">
            {dados.bairros.map((b) => (
              <div key={b.b} className="hbarra">
                <span>{b.b}</span>
                <div>
                  <i style={{ width: `${(b.n / dados.maxB) * 100}%` }} />
                </div>
                <strong>{b.n}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="cartao">
          <div className="cartao-cab">
            <h2>Empresas que mais pediram</h2>
          </div>
          <ol className="ranking">
            {dados.topEmp.map(([id, x], i) => (
              <li key={id}>
                <span className="rank-n">{i + 1}</span>
                <span className="rank-nome">{st.empresas.find((e) => e.id === id)?.nome ?? "Empresa removida"}</span>
                <span className="rank-v">
                  {x.n} · {reais(x.v)}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="cartao">
          <div className="cartao-cab">
            <h2>Entregadores com mais entregas</h2>
          </div>
          <ol className="ranking">
            {dados.topEnt.map(([id, x], i) => {
              const e = st.entregadores.find((y) => y.id === id);
              return (
                <li key={id}>
                  <span className="rank-n">{i + 1}</span>
                  {e && <Avatar chave={e.foto} nome={e.nome} size={28} />}
                  <span className="rank-nome">{e ? nomeCurto(e.nome) : ""}</span>
                  <span className="rank-v">
                    {x.n} · {num(x.km, 1)} km · {reais(x.v)}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}
