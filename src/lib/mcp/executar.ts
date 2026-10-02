/**
 * O que cada ferramenta faz — versão do MEUCHAT.
 *
 * Exportada como `executar.ts` no pacote base, pela substituição declarada em
 * `distribuicao.json`. Ver `ARCHITECTURE.md` §13.
 *
 * A versão da Plataforma responde sobre temperatura, jornada e audiência. Aqui
 * nada disso existe — e prometer no catálogo o que a instalação não tem é pior
 * que não oferecer: o modelo chama, recebe erro, e quem está conversando acha
 * que o próprio painel está quebrado.
 *
 * O que sobra é o que o MEUCHAT realmente faz: automações, contatos e o que
 * saiu de mensagem.
 */
import { listContacts } from '../repo/contacts';
import { listDeliveries } from '../repo/deliveries';
import {
  createAutomation,
  getAutomation,
  listAutomations,
  saveAutomation,
} from '../repo/automations';
import { registrarAcaoDeAgente } from '../repo/agent-actions';
import type { DadosDeCriacao } from './criacao';

export type ContextoDaExecucao = {
  conta: number;
  chaveId: number;
  args: Record<string, unknown>;
  limite: number;
  criacao?: DadosDeCriacao;
};

async function auditar(
  conta: number,
  chaveId: number,
  acao: string,
  alvoId: number,
  detalhe: Record<string, unknown>,
): Promise<void> {
  try {
    await registrarAcaoDeAgente(conta, chaveId, acao, 'automacao', alvoId, detalhe);
  } catch (falha) {
    console.error('mcp: falha ao registrar ação do agente', falha);
  }
}

export async function criarAutomacao(
  { conta, chaveId, criacao }: ContextoDaExecucao,
  publicar: boolean,
): Promise<unknown> {
  if (!criacao) throw new Error('dados da automação ausentes');

  const id = await createAutomation(conta, criacao.nome, criacao.gatilho);
  await saveAutomation(
    id,
    {
      name: criacao.nome,
      status: publicar ? 'published' : 'draft',
      triggerType: criacao.gatilho,
      mediaId: criacao.mediaId,
      keywords: criacao.palavrasChave,
      matchMode: criacao.modoDeCasamento,
    },
    [
      { position: 0, kind: 'public_reply', variants: criacao.respostaPublica, buttons: [] },
      { position: 1, kind: 'dm', variants: criacao.dm, buttons: [] },
    ],
  );

  await auditar(conta, chaveId, publicar ? 'criar_e_publicar_automacao' : 'criar_automacao', id, {
    nome: criacao.nome,
    gatilho: criacao.gatilho,
  });

  return {
    id,
    nome: criacao.nome,
    publicada: publicar,
    mensagem: publicar
      ? 'A automação está no ar e já responde quem usar a palavra-chave.'
      : 'A automação está em rascunho. Revise e publique no painel de Automações.',
  };
}

/**
 * Publicar faz a automação começar a mandar DM para seguidor de verdade. Por
 * isso a resposta devolve o texto que vai sair: quem pediu precisa poder
 * conferir o que acabou de autorizar, mesmo quando acerta.
 */
export async function publicarAutomacao({ conta, chaveId, args }: ContextoDaExecucao): Promise<unknown> {
  const id = args.automacaoId;
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
    throw new Error('automacaoId inválido');
  }

  const automacao = await getAutomation(id);
  if (!automacao || automacao.accountId !== conta) throw new Error('automação não encontrada');

  const dm = automacao.steps.find((passo) => passo.kind === 'dm');
  if (!dm || dm.variants.length === 0) {
    throw new Error('a automação não tem mensagem de DM escrita; publique só depois de escrever');
  }

  await saveAutomation(
    id,
    {
      name: automacao.name,
      status: 'published',
      triggerType: automacao.triggerType,
      mediaId: automacao.mediaId,
      keywords: automacao.keywords,
      matchMode: automacao.matchMode,
    },
    automacao.steps.map((passo) => ({
      position: passo.position,
      kind: passo.kind,
      variants: passo.variants,
      buttons: passo.buttons,
    })),
  );

  await auditar(conta, chaveId, 'publicar_automacao', id, { nome: automacao.name });

  return {
    id,
    nome: automacao.name,
    publicada: true,
    palavrasChave: automacao.keywords,
    dm: dm.variants,
    mensagem: 'No ar. A partir de agora ela responde quem usar a palavra-chave.',
  };
}

export async function executar(nome: string, contexto: ContextoDaExecucao): Promise<unknown> {
  const { conta, args, limite } = contexto;

  if (nome === 'criar_automacao') return criarAutomacao(contexto, args.publicar === true);
  if (nome === 'publicar_automacao') return publicarAutomacao(contexto);

  if (nome === 'listar_automacoes') {
    const automacoes = await listAutomations(conta);
    return automacoes.map((a) => ({
      id: a.id,
      nome: a.name,
      status: a.status,
      gatilho: a.triggerType,
      palavrasChave: a.keywords,
      valeParaTodosOsPosts: a.mediaId === null,
    }));
  }

  if (nome === 'buscar_contatos') {
    const busca = typeof args.busca === 'string' ? args.busca.trim().toLowerCase() : '';
    const contatos = await listContacts(conta);
    return contatos
      .filter((c) => (busca ? (c.username ?? '').toLowerCase().includes(busca) : true))
      .slice(0, limite)
      .map((c) => ({
        contatoId: c.id,
        usuario: c.username,
        nome: c.nome,
        ultimaInteracao: c.lastSeenAt,
      }));
  }

  // `entregas_recentes`: o que o sistema mandou, e o que o Instagram respondeu.
  // É a ferramenta de diagnóstico — "mandou?" é a primeira pergunta de quem
  // acha que a automação não funcionou.
  const entregas = await listDeliveries(limite);
  return entregas.map((d) => ({
    quando: d.createdAt,
    automacao: d.automationName,
    tipo: d.kind === 'dm' ? 'mensagem' : 'continuação',
    situacao: d.status,
    erro: d.error,
  }));
}
