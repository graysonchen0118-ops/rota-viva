"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Info, Lock, RotateCcw, Route, Save, TriangleAlert } from "lucide-react";
import { Campo, Spinner } from "../ui";
import { useStore } from "@/lib/store";
import { cotacao, cruzaRio, enderecoDe } from "@/lib/cidade";
import { km, reais } from "@/lib/format";
import type { No, Tarifa } from "@/lib/types";
import { useSel } from "./Shell";

const EXEMPLOS: { de: string; a: No; b: No }[] = [
  { de: "Livraria Página Viva", a: [5, 3], b: [5, 6] },
  { de: "Cozinha da Dona Neide", a: [5, 6], b: [3, 1] },
  { de: "Farmácia Bem Viver", a: [1, 1], b: [1, 7] },
  { de: "Autopeças Rodovia", a: [11, 2], b: [11, 8] },
  { de: "Padaria Pão de Ouro", a: [6, 2], b: [8, 0] },
  { de: "Mercadinho Bom Preço", a: [7, 5], b: [8, 9] },
];

export default function Tarifas() {
  const st = useStore();
  const sel = useSel();
  const [t, setT] = useState<Tarifa>(st.tarifa);
  const [ex, setEx] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const mudou = JSON.stringify(t) !== JSON.stringify(st.tarifa);

  useEffect(() => {
    sel.setComparar({ a: EXEMPLOS[ex].a, b: EXEMPLOS[ex].b });
    // the selection setter is stable for the life of the shell
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex]);

  const linhas = useMemo(() => EXEMPLOS.map((e) => ({ ...e, q: cotacao(e.a, e.b, { ...t, medida: "rota" }), atual: cotacao(e.a, e.b, st.tarifa) })), [t, st.tarifa]);
  const atual = linhas[ex];
  const n = (k: keyof Tarifa) => (v: string) => setT({ ...t, [k]: Number(v.replace(",", ".")) || 0 });

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    const r = await st.salvarTarifa(t);
    setSalvando(false);
    if (!r.ok) return setErro(r.erro);
    st.toast("Tarifa salva. Vale para os próximos pedidos; as corridas já pedidas mantêm o preço travado.", "ok");
  };

  return (
    <div className="pg">
      <div className="pg-cab">
        <div>
          <h1>Tarifas</h1>
          <p>O preço sai da distância pela rua, calculada na hora do pedido, e fica travado na corrida. O mesmo número define o repasse do entregador.</p>
        </div>
      </div>
      <div className="tar-grade">
        <section className="cartao">
          <div className="cartao-cab">
            <h2>Tabela</h2>
            {mudou && <span className="tag tag-alerta">Alterações não salvas</span>}
          </div>
          <div className="form-grade">
            <Campo rotulo="Tarifa base (R$)" dica={`Cobre até ${t.kmInclusos} km`}>
              <input type="number" step="0.10" min={0} value={t.base} onChange={(e) => n("base")(e.target.value)} />
            </Campo>
            <Campo rotulo="Km incluídos na base">
              <input type="number" step="0.5" min={0} value={t.kmInclusos} onChange={(e) => n("kmInclusos")(e.target.value)} />
            </Campo>
            <Campo rotulo="Valor por km adicional (R$)">
              <input type="number" step="0.05" min={0} value={t.porKm} onChange={(e) => n("porKm")(e.target.value)} />
            </Campo>
            <Campo rotulo="Repasse ao entregador (%)">
              <input type="number" step="1" min={0} max={100} value={t.repassePct} onChange={(e) => n("repassePct")(e.target.value)} />
            </Campo>
            <Campo rotulo="Adicional noturno (%)" dica={`A partir das ${t.noturnoDesde}h`}>
              <input type="number" step="1" min={0} value={t.noturnoPct} onChange={(e) => n("noturnoPct")(e.target.value)} />
            </Campo>
            <div className="medida">
              <span className="campo-rotulo">Como a distância é medida</span>
              <div className="medida-op">
                <Lock size={14} /> Pela rua, na rota real da moto
              </div>
              <small>A linha reta aparece só para comparação.</small>
            </div>
          </div>
          {erro && <p className="app-erro">{erro}</p>}
          <div className="tar-bts">
            <button className="btn btn-claro" onClick={() => setT(st.tarifa)} disabled={!mudou || salvando}>
              <RotateCcw size={15} /> Desfazer
            </button>
            <button className="btn btn-primario" onClick={salvar} disabled={!mudou || salvando}>
              {salvando ? <Spinner /> : (
                <>
                  <Save size={15} /> Salvar tarifa
                </>
              )}
            </button>
          </div>
        </section>

        <section className="cartao tar-comp">
          <div className="cartao-cab">
            <h2>Rua contra linha reta</h2>
          </div>
          <p className="tar-rota">
            {atual.de} <ArrowRight size={14} /> {enderecoDe(atual.b, 3).endereco}, {enderecoDe(atual.b).bairro}
          </p>
          <div className="tar-duas">
            <div className="linha-reta">
              <span className="lp-rot">Em linha reta</span>
              <strong>{km(atual.q.kmReta)}</strong>
              <span className="lp-val">{reais(atual.q.precoReta)}</span>
            </div>
            <div className="linha-rua">
              <span className="lp-rot">Pela rua</span>
              <strong>{km(atual.q.kmRota)}</strong>
              <span className="lp-val">{reais(atual.q.precoRota)}</span>
            </div>
          </div>
          {cruzaRio(atual.a, atual.b) && atual.q.kmRota - atual.q.kmReta > 1 ? (
            <p className="tar-aviso">
              <TriangleAlert size={16} /> Cotada pela reta, essa corrida pagaria {km(atual.q.kmReta)} para o motoboy rodar {km(atual.q.kmRota)}. É a que fica tocando sem aceite.
            </p>
          ) : (
            <p className="tar-ok">
              <Info size={16} /> Do mesmo lado do rio, rua e reta ficam perto. A diferença aparece quando a rota precisa de ponte.
            </p>
          )}
          <p className="tar-repasse">
            <Route size={15} /> Repasse com a tabela {mudou ? "nova" : "atual"}: <strong>{reais(atual.q.repasse)}</strong>
          </p>
        </section>
      </div>

      <section className="cartao">
        <div className="cartao-cab">
          <h2>Simulação com corridas comuns</h2>
          <span className="cartao-sub">Clique numa linha para ver a rota no mapa</span>
        </div>
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Saída</th>
                <th className="col-m">Destino</th>
                <th className="num">Reta</th>
                <th className="num">Rua</th>
                <th className="num">Preço atual</th>
                <th className="num">Com a tabela {mudou ? "nova" : "atual"}</th>
                <th className="num col-m">Repasse</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr key={l.de} className={i === ex ? "selecionada" : ""} onClick={() => setEx(i)}>
                  <td>
                    <strong>{l.de}</strong>
                  </td>
                  <td className="col-m">{enderecoDe(l.b).bairro}</td>
                  <td className="num">{km(l.q.kmReta)}</td>
                  <td className="num">
                    {km(l.q.kmRota)}
                    {cruzaRio(l.a, l.b) && <small>via ponte</small>}
                  </td>
                  <td className="num">{reais(l.atual.preco)}</td>
                  <td className="num">
                    <strong>{reais(l.q.preco)}</strong>
                  </td>
                  <td className="num col-m">{reais(l.q.repasse)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
