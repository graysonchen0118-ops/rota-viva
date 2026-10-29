"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Bike, Check, CircleDollarSign, Delete, IdCard, MapPin, Navigation, Package, Phone as Fone, Power, Route, Store, User, WifiOff } from "lucide-react";
import Phone, { Aba } from "./Phone";
import { Avatar, Spinner } from "../ui";
import { useStore } from "@/lib/store";
import { enderecoDe, fimDaPerna, kmDe, noMaisProximo, rota } from "@/lib/cidade";
import { ENTREGADOR_SIMULADOR } from "@/lib/mock/entregadores";
import { dataCurta, duracao, hhmm, km, mesmoDia, primeiroNome, reais } from "@/lib/format";

type Tela = "corrida" | "ganhos" | "perfil";

export default function AppEntregador() {
  const st = useStore();
  const e = st.entregadores.find((x) => x.id === ENTREGADOR_SIMULADOR)!;
  const [tela, setTela] = useState<Tela>("corrida");
  const c = e.corridaId ? st.corridas.find((x) => x.id === e.corridaId) : undefined;
  const oferta = st.oferta?.entregadorId === e.id ? st.oferta : null;
  useEffect(() => {
    if (oferta) setTela("corrida");
  }, [oferta]);

  const notif = c ? (
    e.sinal ? (
      <div className="notif notif-ativa">
        <span className="notif-icone">
          <Bike size={14} />
        </span>
        <div>
          <strong>Rota Viva · corrida em andamento</strong>
          <span>Enviando sua localização enquanto a corrida estiver aberta</span>
        </div>
      </div>
    ) : (
      <div className="notif notif-sem">
        <span className="notif-icone">
          <WifiOff size={14} />
        </span>
        <div>
          <strong>Sem internet</strong>
          <span>Sua posição volta a ser enviada quando o sinal voltar</span>
        </div>
      </div>
    )
  ) : null;

  return (
    <Phone
      hora={hhmm(st.agora)}
      sinal={e.sinal}
      bateria={41}
      rotulo="Celular do entregador Diego Santos"
      tela={tela}
      notificacao={notif}
      abas={
        <>
          <Aba ativa={tela === "corrida"} onClick={() => setTela("corrida")} icone={<Bike size={19} />} rotulo="Corrida" badge={oferta ? 1 : 0} />
          <Aba ativa={tela === "ganhos"} onClick={() => setTela("ganhos")} icone={<CircleDollarSign size={19} />} rotulo="Ganhos" />
          <Aba ativa={tela === "perfil"} onClick={() => setTela("perfil")} icone={<User size={19} />} rotulo="Perfil" />
        </>
      }
    >
      {tela === "corrida" && <Corrida />}
      {tela === "ganhos" && <Ganhos />}
      {tela === "perfil" && <Perfil />}
    </Phone>
  );
}

function Corrida() {
  const st = useStore();
  const e = st.entregadores.find((x) => x.id === ENTREGADOR_SIMULADOR)!;
  const c = e.corridaId ? st.corridas.find((x) => x.id === e.corridaId) : undefined;
  const oferta = st.oferta?.entregadorId === e.id ? st.oferta : null;
  const [mudando, setMudando] = useState(false);
  const hoje = st.corridas.filter((x) => x.entregadorId === e.id && x.status === "entregue" && mesmoDia(x.entregueEm ?? 0, st.agora));
  const ganhos = hoje.reduce((a, x) => a + x.repasse, 0);
  const online = e.status === "online" || e.status === "em_corrida";

  const alternar = async () => {
    setMudando(true);
    const r = await st.ficarOnline(e.id, !online);
    setMudando(false);
    if (!r.ok) st.toast(r.erro, "erro");
  };

  return (
    <div className="app-pad app-ent">
      <div className="ent-topo">
        <Avatar chave={e.foto} nome={e.nome} size={42} />
        <div>
          <strong>{primeiroNome(e.nome)}</strong>
          <span>
            Hoje: {reais(ganhos)} · {hoje.length} {hoje.length === 1 ? "entrega" : "entregas"}
          </span>
        </div>
        <button className={`ent-switch ${online ? "on" : ""}`} onClick={alternar} disabled={mudando || e.status === "em_corrida"} aria-pressed={online} aria-label={online ? "Ficar offline" : "Ficar online"}>
          {mudando ? <Spinner size={14} /> : <Power size={14} />}
          {online ? "Online" : "Offline"}
        </button>
      </div>

      {oferta ? (
        <CartaoOferta />
      ) : c ? (
        <CorridaAtiva />
      ) : online ? (
        <div className="ent-espera">
          <span className="radar" aria-hidden="true">
            <span />
            <span />
            <Bike size={22} />
          </span>
          <strong>Livre, esperando corrida</strong>
          <span>Você está em {enderecoDe(e.parado).endereco.split(",")[0]}, {enderecoDe(e.parado).bairro}. As corridas chegam pelo mais perto pela rua.</span>
          <small>Para testar: peça uma entrega no celular da farmácia, à esquerda.</small>
        </div>
      ) : (
        <div className="ent-espera off">
          <Power size={26} />
          <strong>Você está offline</strong>
          <span>Fique online para receber corridas da região.</span>
          <button className="btn btn-primario" onClick={alternar} disabled={mudando}>
            {mudando ? <Spinner /> : "Ficar online"}
          </button>
        </div>
      )}
    </div>
  );
}

function CartaoOferta() {
  const st = useStore();
  const o = st.oferta!;
  const c = st.corridas.find((x) => x.id === o.corridaId)!;
  const e = st.entregadores.find((x) => x.id === o.entregadorId)!;
  const emp = st.empresas.find((x) => x.id === c.empresaId)!;
  const [resto, setResto] = useState(1);
  const [acao, setAcao] = useState<"aceitar" | "recusar" | null>(null);
  const raf = useRef(0);
  useEffect(() => {
    const step = () => {
      setResto(Math.max(0, (o.expiraEmReal - performance.now()) / o.duracaoReal));
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [o.expiraEmReal, o.duracaoReal]);
  const ateColeta = kmDe(rota(e.parado, c.coleta.no));
  const aceitar = async () => {
    setAcao("aceitar");
    const r = await st.aceitarOferta();
    setAcao(null);
    if (!r.ok) st.toast(r.erro, "erro");
  };
  const recusar = async () => {
    setAcao("recusar");
    await st.recusarOferta();
    setAcao(null);
  };
  return (
    <div className="oferta">
      <div className="oferta-tempo">
        <span style={{ width: `${resto * 100}%` }} />
      </div>
      <div className="oferta-cab">
        <span>Nova corrida</span>
        <strong>{Math.ceil(resto * (o.duracaoReal / 1000))} s</strong>
      </div>
      <div className="oferta-valor">
        <small>Você recebe</small>
        <strong>{reais(c.repasse)}</strong>
        <span>
          <Route size={14} /> {km(c.kmRota)} pela rua até a entrega
        </span>
      </div>
      <div className="oferta-pts">
        <div>
          <span className="pt pt-coleta">
            <Store size={13} />
          </span>
          <div>
            <strong>{emp.nome}</strong>
            <span>
              {c.coleta.endereco} · a {km(ateColeta)} de você
            </span>
          </div>
        </div>
        <div>
          <span className="pt pt-destino">
            <MapPin size={13} />
          </span>
          <div>
            <strong>{c.destino.bairro}</strong>
            <span>{c.destino.endereco}</span>
          </div>
        </div>
      </div>
      <div className="oferta-botoes">
        <button className="btn btn-claro" onClick={recusar} disabled={!!acao}>
          {acao === "recusar" ? <Spinner /> : "Recusar"}
        </button>
        <button className="btn btn-primario" onClick={aceitar} disabled={!!acao}>
          {acao === "aceitar" ? <Spinner /> : "Aceitar corrida"}
        </button>
      </div>
    </div>
  );
}

function CorridaAtiva() {
  const st = useStore();
  const e = st.entregadores.find((x) => x.id === ENTREGADOR_SIMULADOR)!;
  const c = st.corridas.find((x) => x.id === e.corridaId)!;
  const emp = st.empresas.find((x) => x.id === c.empresaId)!;
  const [carregando, setCarregando] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const eta = c.perna ? Math.max(0, fimDaPerna(c.perna) - st.agora) : 0;

  const coletar = async () => {
    setCarregando(true);
    const r = await st.coletar(c.id);
    setCarregando(false);
    if (!r.ok) st.toast(r.erro, "erro");
  };
  const confirmar = async () => {
    if (codigo.length !== 4) return setErro("O código tem 4 números.");
    setCarregando(true);
    setErro(null);
    const r = await st.confirmarCodigo(c.id, codigo);
    setCarregando(false);
    if (!r.ok) {
      setErro(r.erro);
      setCodigo("");
      return;
    }
    st.toast(`Entrega confirmada. ${reais(c.repasse)} somados aos seus ganhos de hoje.`, "ok");
  };
  const tecla = (d: string) => {
    setErro(null);
    setCodigo((v) => (d === "x" ? v.slice(0, -1) : v.length < 4 ? v + d : v));
  };
  const navegar = (app: string) => st.toast(`Abrindo a rota no ${app}.`, "info");
  const naColeta = c.status === "indo_coleta" || c.status === "na_coleta";
  const alvo = naColeta ? c.coleta : c.destino;
  const pos = noMaisProximo(e.posReal.x, e.posReal.y);

  return (
    <div className="ativa">
      <div className="ativa-etapas" aria-label="Etapas da corrida">
        {["Coleta", "Entrega", "Código"].map((n, i) => {
          const idx = c.status === "indo_coleta" || c.status === "na_coleta" ? 0 : c.status === "em_rota" ? 1 : 2;
          return (
            <span key={n} className={i < idx ? "feito" : i === idx ? "agora" : ""}>
              {n}
            </span>
          );
        })}
      </div>
      <div className="ativa-alvo">
        <span className={`pt ${naColeta ? "pt-coleta" : "pt-destino"}`}>{naColeta ? <Store size={14} /> : <MapPin size={14} />}</span>
        <div>
          <small>{naColeta ? "Coletar em" : "Entregar para"}</small>
          <strong>{naColeta ? emp.nome : c.destino.contato}</strong>
          <span>
            {alvo.endereco} · {alvo.bairro}
          </span>
          {!naColeta && c.obs && <em>{c.obs}</em>}
        </div>
      </div>

      {(c.status === "indo_coleta" || c.status === "em_rota") && (
        <>
          <div className="ativa-eta">
            <Navigation size={15} /> Chegando em cerca de {duracao(eta)}, você está na {enderecoDe(pos).endereco.split(",")[0]}
          </div>
          <div className="ativa-nav">
            <button className="btn btn-claro btn-pequeno" onClick={() => navegar("Waze")}>
              <Navigation size={14} /> Waze
            </button>
            <button className="btn btn-claro btn-pequeno" onClick={() => navegar("Google Maps")}>
              <MapPin size={14} /> Google Maps
            </button>
            <button className="btn btn-claro btn-pequeno" onClick={() => st.toast(`Ligando para ${naColeta ? emp.contato : c.destino.contato}.`, "info")}>
              <Fone size={14} /> Ligar
            </button>
          </div>
        </>
      )}

      {c.status === "na_coleta" && (
        <div className="ativa-acao">
          <p>Você chegou na loja. Confira o pacote e o endereço antes de sair.</p>
          <button className="btn btn-primario btn-bloco" onClick={coletar} disabled={carregando}>
            {carregando ? (
              <Spinner />
            ) : (
              <>
                <Package size={16} /> Coletei o pedido
              </>
            )}
          </button>
        </div>
      )}

      {c.status === "no_destino" && (
        <div className="ativa-codigo">
          <p>Peça o código de 4 números a quem está recebendo.</p>
          <div className={`codigo-caixas ${erro ? "erro" : ""}`} aria-label="Código digitado">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={codigo[i] ? "cheia" : ""}>
                {codigo[i] ?? ""}
              </span>
            ))}
          </div>
          {erro && <p className="app-erro">{erro}</p>}
          <div className="teclado">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "x"].map((d, i) =>
              d === "" ? (
                <span key={i} />
              ) : (
                <button key={i} onClick={() => tecla(d)} aria-label={d === "x" ? "Apagar" : d} disabled={carregando}>
                  {d === "x" ? <Delete size={18} /> : d}
                </button>
              ),
            )}
          </div>
          <button className="btn btn-primario btn-bloco" onClick={confirmar} disabled={carregando || codigo.length !== 4}>
            {carregando ? (
              <Spinner />
            ) : (
              <>
                <Check size={16} /> Confirmar entrega
              </>
            )}
          </button>
          <small className="dica">O código desta corrida aparece no celular da farmácia, à esquerda.</small>
        </div>
      )}
    </div>
  );
}

function Ganhos() {
  const st = useStore();
  const e = st.entregadores.find((x) => x.id === ENTREGADOR_SIMULADOR)!;
  const minhas = st.corridas.filter((x) => x.entregadorId === e.id && x.status === "entregue").sort((a, b) => (b.entregueEm ?? 0) - (a.entregueEm ?? 0));
  const hoje = minhas.filter((x) => mesmoDia(x.entregueEm ?? 0, st.agora));
  const semana = minhas.reduce((a, x) => a + x.repasse, 0);
  const kmHoje = hoje.reduce((a, x) => a + x.kmRota, 0);
  return (
    <div className="app-pad">
      <h3 className="app-titulo">Ganhos</h3>
      <div className="ganhos-cards">
        <div>
          <small>Hoje</small>
          <strong>{reais(hoje.reduce((a, x) => a + x.repasse, 0))}</strong>
          <span>
            {hoje.length} entregas · {km(kmHoje)}
          </span>
        </div>
        <div>
          <small>Últimos 7 dias</small>
          <strong>{reais(semana)}</strong>
          <span>{minhas.length} entregas</span>
        </div>
      </div>
      <h4 className="app-sec">Entregas</h4>
      {minhas.length === 0 ? (
        <div className="app-vazio">Nenhuma entrega ainda.</div>
      ) : (
        <div className="app-hist">
          {minhas.slice(0, 30).map((x) => (
            <div key={x.id} className="app-hist-linha estatica">
              <div>
                <strong>{x.destino.bairro}</strong>
                <small>
                  {dataCurta(x.entregueEm!)} {hhmm(x.entregueEm!)} · {km(x.kmRota)} pela rua
                </small>
              </div>
              <div className="app-hist-dir">
                <strong>{reais(x.repasse)}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Perfil() {
  const st = useStore();
  const e = st.entregadores.find((x) => x.id === ENTREGADOR_SIMULADOR)!;
  return (
    <div className="app-pad">
      <div className="perfil-cab">
        <Avatar chave={e.foto} nome={e.nome} size={72} />
        <strong>{e.nome}</strong>
        <span>
          Nota {e.nota.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · {e.corridasTotal.toLocaleString("pt-BR")} corridas
        </span>
      </div>
      <div className="perfil-itens">
        <div>
          <Bike size={16} />
          <span>Moto</span>
          <strong>
            {e.moto} · {e.placa}
          </strong>
        </div>
        <div>
          <IdCard size={16} />
          <span>CNH categoria {e.docs.cnhCategoria}</span>
          <strong>válida até {dataCurta(e.docs.cnhValidade)}/{new Date(e.docs.cnhValidade).getUTCFullYear()}</strong>
        </div>
        <div>
          <BadgeCheck size={16} />
          <span>Observação EAR</span>
          <strong>{e.docs.ear ? "Conferida" : "Pendente"}</strong>
        </div>
        <div>
          <CircleDollarSign size={16} />
          <span>Pix para repasse</span>
          <strong>{e.pix}</strong>
        </div>
      </div>
    </div>
  );
}
