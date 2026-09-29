import Link from 'next/link';
import { getFirstAccount } from '@/lib/repo/accounts';
import { listAutomations } from '@/lib/repo/automations';
import { Botao, Chip, ESTILO_CAMPO } from '@/lib/painel/ui';
import { criarAutomacao } from './actions';
import type { TipoDeGatilho } from '@/lib/repo/types';
import { RecursosRadar } from '@/lib/painel/upgrade';
import { CONVITE_DE_UPGRADE } from '@/lib/painel/navegacao';

const GATILHO: Record<TipoDeGatilho, string> = {
  comment: 'Comentário', dm: 'Mensagem direta', story_reply: 'Resposta de Story',
};
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AutomacoesPage() {
  const account = await getFirstAccount();
  const automacoes = account ? await listAutomations(account.id) : [];
  return <div className="meuchat-inicio">
    <header className="meuchat-cabecalho">
      <div><span className="meuchat-incluido">Incluído no MeuChat</span><h1>Suas automações</h1><p>Transforme comentários, mensagens e respostas de Story em conversas.</p></div>
      <a className="upgrade-cta" href={account ? '#nova-automacao' : '/configuracao'}>{account ? '+ Nova automação' : 'Conectar Instagram'}</a>
    </header>
    {account ? <>
      <section className="meuchat-criar" id="nova-automacao" aria-labelledby="titulo-criar">
        <h2 id="titulo-criar">Nova automação</h2>
        <p>Dê um nome e escolha como a conversa começa. Na próxima tela, configure a regra e a mensagem.</p>
        <form action={criarAutomacao}>
          <label>Nome da automação<input name="nome" placeholder="Ex.: enviar material gratuito" className={ESTILO_CAMPO} required /></label>
          <label>Quando iniciar<select name="gatilho" className={ESTILO_CAMPO}>
            <option value="comment">Alguém comenta</option><option value="dm">Alguém manda uma DM</option><option value="story_reply">Alguém responde um Story</option>
          </select></label>
          <Botao>Criar e configurar</Botao>
        </form>
        <small>A automação começa como rascunho. Você revisa a mensagem antes de publicar.</small>
      </section>
      <section className="meuchat-automacoes" aria-labelledby="titulo-automacoes">
        <div className="meuchat-lista-titulo"><h2 id="titulo-automacoes">Automações existentes</h2><span>{automacoes.length} no total</span></div>
        {automacoes.length === 0 ? <div className="meuchat-vazio"><h3>Sua primeira conversa automática começa aqui.</h3><p>Use o formulário acima para criar uma automação. Não é necessário fazer upgrade.</p></div> : <ul className="meuchat-grade">
          {automacoes.map(a => <li key={a.id}>
            <div className="meuchat-card-topo"><span>{GATILHO[a.triggerType] ?? 'Mensagem direta'}</span><Chip cor={a.status === 'published' ? 'bg-subindo-tenue text-subindo-forte' : 'bg-frio-tenue text-tinta-media'}>{a.status === 'published' ? 'Publicada' : 'Rascunho'}</Chip></div>
            <h3><Link href={`/automacoes/${a.id}`}>{a.name}</Link></h3>
            <p>{a.matchMode === 'any' ? 'Inicia com qualquer texto' : `Palavras-chave: ${a.keywords.join(', ') || 'a configurar'}`}</p>
            <div className="meuchat-card-rodape"><span>{a.deliveryCount} disparo{a.deliveryCount === 1 ? '' : 's'}</span><Link href={`/automacoes/${a.id}`} aria-label={`Editar automação ${a.name}`}>Editar automação</Link></div>
          </li>)}
        </ul>}
      </section>
    </> : <section className="meuchat-criar"><h2>Conecte seu Instagram para criar automações</h2><p>Depois de conectar a conta, você poderá criar suas regras, escrever as mensagens e publicar. Essa função já está incluída no MeuChat.</p><Link className="upgrade-cta" href="/configuracao">Conectar meu Instagram</Link></section>}
    {CONVITE_DE_UPGRADE && <RecursosRadar href={CONVITE_DE_UPGRADE.href}/>}
  </div>;
}
