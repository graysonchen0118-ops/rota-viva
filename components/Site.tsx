"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, BadgeCheck, Bell, Building2, Clock3, KeyRound, LayoutDashboard, MapPinned, Route, ShieldCheck, Smartphone, Timer, Wallet, WifiOff } from "lucide-react";
import Topo from "./Topo";
import Rodape from "./Rodape";
import Cidade from "./three/Cidade";
import { Avatar, Foto, Numero, Tilt } from "./ui";
import { useStore, sinalDe, ativa } from "@/lib/store";
import { cotacao } from "@/lib/cidade";
import { ha, mesmoDia, nomeCurto, num, reais } from "@/lib/format";
import { ENTREGADOR_SEM_SINAL } from "@/lib/mock/entregadores";

export default function Site() {
  const st = useStore();
  const naRua = st.entregadores.filter((e) => e.status === "em_corrida").length;
  const livres = st.entregadores.filter((e) => e.status === "online").length;
  const hoje = st.corridas.filter((c) => mesmoDia(c.criadaEm, st.agora));
  const aceites = hoje.filter((c) => c.aceitaEm).map((c) => (c.aceitaEm! - c.criadaEm) / 1000);
  const aceiteMedio = aceites.length ? aceites.reduce((a, b) => a + b, 0) / aceites.length : 0;
  const ss = st.entregadores.find((e) => e.id === ENTREGADOR_SEM_SINAL)!;
  const sn = sinalDe(ss, st.agora, st.modoComum);
  const corridaSS = st.corridas.find((c) => c.id === ss.corridaId);
  const comp = useMemo(() => cotacao([5, 3], [5, 6], st.tarifa), [st.tarifa]);
  const precoReta = comp.precoReta;
  const precoRota = comp.precoRota;

  return (
    <>
      <Cidade modo="fundo" />
      <Topo />
      <main className="site">
        <section className="hero" data-cena="inicio">
          <div className="hero-texto entra">
            <span className="selo">
              <span className="ponto-vivo" /> Pico do almoço, {num(naRua)} motos na rua agora
            </span>
            <h1>
              Pediu, acompanhou, <em>recebeu.</em> Sem ninguém pegar o telefone.
            </h1>
            <p>A empresa chama a entrega pelo app, o motoboy parceiro mais perto pela rua aceita no dele, e a central vê cada corrida no mapa, do balcão ao comprovante.</p>
            <div className="hero-ctas">
              <Link href="/operacao" className="btn btn-primario btn-grande">
                Ver a operação ao vivo <ArrowRight size={18} />
              </Link>
              <Link href="/painel" className="btn btn-vidro btn-grande">
                <LayoutDashboard size={18} /> Abrir o painel
              </Link>
            </div>
            <div className="hero-numeros">
              <div>
                <strong>
                  <Numero valor={hoje.length} formato={(v) => num(Math.round(v))} />
                </strong>
                <span>corridas hoje</span>
              </div>
              <div>
                <strong>
                  <Numero valor={livres} formato={(v) => num(Math.round(v))} />
                </strong>
                <span>motoboys livres</span>
              </div>
              <div>
                <strong>
                  <Numero valor={aceiteMedio} formato={(v) => `${num(Math.round(v))} s`} />
                </strong>
                <span>até o aceite, em média</span>
              </div>
            </div>
          </div>
        </section>

        <section className="bloco" data-cena="rede">
          <div className="bloco-cab entra">
            <span className="sobre">Três telas, uma corrida</span>
            <h2>Cada lado vê a mesma entrega, no mesmo segundo</h2>
            <p>A farmácia não liga para saber do motoboy, o motoboy não liga para pedir o endereço e a central não liga para ninguém. As três telas leem a mesma corrida.</p>
          </div>
          <div className="tres">
            {[
              { foto: "cena-balcao", icone: Building2, titulo: "App da empresa", texto: "Coleta já preenchida, destino em dois toques, preço calculado pela rua antes de confirmar. Depois é só acompanhar.", itens: ["Pedido em menos de 30 segundos", "Preço travado no momento do pedido", "Histórico com cada corrida e valor"] },
              { foto: "cena-motoboy", icone: Smartphone, titulo: "App do entregador", texto: "Online quando ele quer. A oferta mostra quanto ele recebe e quantos km vai rodar de verdade, antes de aceitar.", itens: ["Oferta com repasse e km pela rua", "Rota aberta no Waze ou no Google Maps", "Ganhos do dia sempre à vista"] },
              { foto: "cena-central", icone: LayoutDashboard, titulo: "Painel da central", texto: "Mapa ao vivo, distribuição automática e manual, cadastro e aprovação de motoboys, tarifas e relatórios.", itens: ["Alerta quando uma moto some do mapa", "Atribuição manual em um clique", "Aprovação com CNH e EAR conferidas"] },
            ].map((c, i) => (
              <Tilt key={c.titulo} className={`card-tela entra d${i + 1}`}>
                <div className="card-tela-foto">
                  <Foto chave={c.foto} w={640} h={400} alt={c.titulo} />
                </div>
                <div className="card-tela-corpo">
                  <span className="card-icone">
                    <c.icone size={20} />
                  </span>
                  <h3>{c.titulo}</h3>
                  <p>{c.texto}</p>
                  <ul>
                    {c.itens.map((t) => (
                      <li key={t}>
                        <BadgeCheck size={16} /> {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </Tilt>
            ))}
          </div>
        </section>

        <section className="bloco bloco-lado" data-cena="sinal">
          <div className="lado-texto entra">
            <span className="sobre sobre-alerta">O ponto que decide</span>
            <h2>Um ponto parado no mapa pode estar mentindo</h2>
            <p>Celular de entregador economiza bateria. O app para de mandar posição no bolso e o pontinho fica congelado na porta da loja, idêntico a um motoboy que ainda está lá, enquanto a moto já está três bairros adiante.</p>
            <p>Aqui o app do entregador roda com uma notificação fixa só enquanto há corrida aberta, e quando a posição para de chegar o painel diz isso com todas as letras.</p>
            <div className="comparador" role="group" aria-label="Como o mapa mostra uma moto sem sinal">
              <button className={`comp-op ${st.modoComum ? "ativo" : ""}`} onClick={() => !st.modoComum && st.alternarModoComum()}>
                Como um painel comum mostra
              </button>
              <button className={`comp-op ${!st.modoComum ? "ativo" : ""}`} onClick={() => st.modoComum && st.alternarModoComum()}>
                Como a Rota Viva mostra
              </button>
            </div>
          </div>
          <div className="lado-card entra d2">
            <div className={`card-sinal ${sn.tipo === "sem" ? "sem" : sn.tipo === "vivo" ? "vivo" : "atraso"}`}>
              <div className="card-sinal-topo">
                <Avatar chave={ss.foto} nome={ss.nome} size={52} />
                <div>
                  <strong>{ss.nome}</strong>
                  <span>
                    {ss.moto} · {ss.placa}
                  </span>
                </div>
              </div>
              {sn.tipo === "sem" ? (
                <div className="card-sinal-estado">
                  <WifiOff size={20} />
                  <div>
                    <strong>Sem sinal {ha(sn.idade)}</strong>
                    <span>Última posição recebida fica marcada no mapa, em laranja, sem fingir movimento.</span>
                  </div>
                </div>
              ) : sn.tipo === "vivo" && !ss.sinal ? (
                <div className="card-sinal-estado mentira">
                  <MapPinned size={20} />
                  <div>
                    <strong>Ao vivo</strong>
                    <span>É assim que um painel comum mostra: verde, parado, com cara de verdade. A moto já não está ali.</span>
                  </div>
                </div>
              ) : (
                <div className="card-sinal-estado">
                  <MapPinned size={20} />
                  <div>
                    <strong>Posição {ha(sn.idade)}</strong>
                    <span>O sinal voltou e o ponto saltou para onde a moto realmente está.</span>
                  </div>
                </div>
              )}
              {corridaSS && (
                <div className="card-sinal-corrida">
                  <span>{corridaSS.id}</span>
                  <span>
                    {corridaSS.coleta.bairro} para {corridaSS.destino.bairro}
                  </span>
                </div>
              )}
              <Link href="/operacao" className="btn btn-claro">
                Ver no mapa ao vivo <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        <section className="bloco bloco-lado inverso" data-cena="preco">
          <div className="lado-texto entra">
            <span className="sobre">Preço pela distância</span>
            <h2>A moto não atravessa o rio em linha reta</h2>
            <p>A linha reta passa por cima do rio, de viaduto e de rua na contramão. A moto não. Corrida cotada pela reta é aquela que fica tocando no celular de todo mundo sem ninguém aceitar.</p>
            <p>Aqui o preço sai da rota real, fica travado no momento do pedido, e é esse mesmo número que paga o entregador depois.</p>
            <Link href="/painel/tarifas" className="link-seta">
              Ver a tabela de tarifas <ArrowRight size={16} />
            </Link>
          </div>
          <div className="lado-card entra d2">
            <div className="card-preco">
              <div className="card-preco-rota">
                <span>Livraria Página Viva, Bela Vista</span>
                <ArrowRight size={16} />
                <span>Rua São Paulo, Santa Cruz</span>
              </div>
              <div className="card-preco-linhas">
                <div className="linha-reta">
                  <span className="lp-rot">Em linha reta</span>
                  <strong>{comp.kmReta.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} km</strong>
                  <span className="lp-val">{reais(precoReta)}</span>
                </div>
                <div className="linha-rua">
                  <span className="lp-rot">Pela rua, via ponte</span>
                  <strong>{comp.kmRota.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} km</strong>
                  <span className="lp-val">{reais(precoRota)}</span>
                </div>
              </div>
              <p className="card-preco-nota">
                <Route size={16} /> Pela reta, o motoboy rodaria {(comp.kmRota - comp.kmReta).toLocaleString("pt-BR", { minimumFractionDigits: 1 })} km a mais sem receber por eles.
              </p>
            </div>
          </div>
        </section>

        <section className="bloco bloco-lado" data-cena="rede">
          <div className="lado-texto entra">
            <span className="sobre">Comprovante</span>
            <h2>Entrega que só fecha com o código de quem recebeu</h2>
            <p>Empresa que paga por entrega vai ouvir do próprio cliente que não chegou nada. Sem prova, vira palavra do motoboy contra palavra do cliente.</p>
            <p>Na hora de pedir, a empresa recebe um código de quatro dígitos para mandar ao destinatário. O motoboy só consegue marcar como entregue quando digita esse número na porta.</p>
          </div>
          <div className="lado-card entra d2">
            <Tilt className="card-codigo">
              <div className="card-codigo-foto">
                <Foto chave="cena-entrega-porta" w={720} h={460} alt="Motoboy entregando um pacote na porta" />
              </div>
              <div className="card-codigo-corpo">
                <span className="card-icone">
                  <KeyRound size={20} />
                </span>
                <div className="digitos" aria-label="Código de exemplo 4 8 2 1">
                  {["4", "8", "2", "1"].map((d, i) => (
                    <span key={i} style={{ animationDelay: `${0.3 + i * 0.18}s` }}>
                      {d}
                    </span>
                  ))}
                </div>
                <p>Digitado na porta, a corrida fecha com hora e local. Errado, ela continua aberta.</p>
              </div>
            </Tilt>
          </div>
        </section>

        <section className="bloco" data-cena="rede">
          <div className="bloco-cab entra">
            <span className="sobre">Os dois lados da rede</span>
            <h2>Uma rede só se segura se for boa para quem pede e para quem roda</h2>
          </div>
          <div className="dois">
            <Tilt className="card-lado entra d1">
              <Foto chave="cena-farmacia" w={760} h={420} alt="Balcão de farmácia com atendente" />
              <div className="card-lado-corpo">
                <h3>Para as empresas</h3>
                <ul>
                  <li>
                    <Timer size={18} /> Pedido pronto antes do cliente sair do balcão
                  </li>
                  <li>
                    <Wallet size={18} /> Preço antes de confirmar, sem surpresa no fim do mês
                  </li>
                  <li>
                    <Bell size={18} /> Aviso quando a moto chega para coletar
                  </li>
                  <li>
                    <ShieldCheck size={18} /> Comprovante com código em cada entrega
                  </li>
                </ul>
              </div>
            </Tilt>
            <Tilt className="card-lado entra d2">
              <Foto chave="cena-motos-fila" w={760} h={420} alt="Motoboy com baú passando por uma rua do centro" />
              <div className="card-lado-corpo">
                <h3>Para os entregadores</h3>
                <ul>
                  <li>
                    <Clock3 size={18} /> Fica online quando quer, sem vínculo com loja
                  </li>
                  <li>
                    <Route size={18} /> Recebe pelos km que roda pela rua
                  </li>
                  <li>
                    <Wallet size={18} /> Vê o repasse antes de aceitar a corrida
                  </li>
                  <li>
                    <BadgeCheck size={18} /> Cadastro aprovado com CNH e EAR conferidas
                  </li>
                </ul>
              </div>
            </Tilt>
          </div>
        </section>

        <section className="faixa-final" data-cena="fim">
          <div className="faixa-final-in entra">
            <div>
              <h2>Peça uma entrega e veja a moto sair no mapa</h2>
              <p>Do lado esquerdo, o celular da farmácia. Do direito, o celular do motoboy. No meio, a cidade. Os dados são inventados, a lógica é a de verdade.</p>
            </div>
            <Link href="/operacao" className="btn btn-claro btn-grande">
              Abrir a operação ao vivo <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>
      <Rodape />
      {/* live list used by screen readers: who is on the street now */}
      <p className="sr-only">
        {st.entregadores
          .filter((e) => e.status === "em_corrida")
          .map((e) => nomeCurto(e.nome))
          .join(", ")}{" "}
        estão em corrida. {st.corridas.filter(ativa).length} corridas abertas.
      </p>
    </>
  );
}
