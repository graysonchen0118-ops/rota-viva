import Link from "next/link";
import { Marca } from "./Topo";

export default function Rodape() {
  return (
    <footer className="rodape">
      <div className="rodape-in">
        <div className="rodape-marca">
          <Marca claro />
          <p>Entregas sob demanda para empresas, com uma rede de motoboys parceiros e uma central que vê cada corrida do pedido ao comprovante.</p>
        </div>
        <div className="rodape-cols">
          <div>
            <strong>Plataforma</strong>
            <Link href="/operacao">Operação ao vivo</Link>
            <Link href="/painel">Painel da central</Link>
            <Link href="/painel/tarifas">Tarifas</Link>
          </div>
          <div>
            <strong>Rede</strong>
            <Link href="/painel/empresas">Empresas</Link>
            <Link href="/painel/entregadores">Entregadores</Link>
            <Link href="/painel/relatorios">Relatórios</Link>
          </div>
        </div>
      </div>
      <div className="rodape-base">
        <span>© 2026 Rota Viva. Todos os direitos reservados.</span>
        <span>Fotos: Unsplash</span>
      </div>
    </footer>
  );
}
