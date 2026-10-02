/**
 * As ferramentas que o agente enxerga — versão do MEUCHAT.
 *
 * Exportada como `ferramentas.ts` no pacote base, pela substituição declarada
 * em `distribuicao.json`. Ver `ARCHITECTURE.md` §13.
 *
 * O catálogo é menor que o da Plataforma, e isso é a coisa certa: temperatura,
 * jornada e audiência não existem aqui. Oferecer uma ferramenta que a
 * instalação não tem faz o modelo chamar, receber erro, e quem está
 * conversando concluir que o painel quebrou.
 *
 * **Publicar manda mensagem para gente de verdade.** A descrição manda mostrar
 * o texto antes de chamar — é orientação ao modelo, não tranca: o custo de um
 * mal-entendido aqui é uma DM que já saiu.
 */

import type { Escopo } from '../api/chave';

export type DefinicaoDeFerramenta = {
  name: string;
  title: string;
  description: string;
  escopo: Escopo;
  inputSchema: Record<string, unknown>;
};

const LIMITE = {
  type: 'integer',
  minimum: 1,
  maximum: 200,
  description: 'Quantos registros trazer. Padrão 50, teto 200.',
} as const;

export const FERRAMENTAS: DefinicaoDeFerramenta[] = [
  {
    name: 'listar_automacoes',
    escopo: 'leitura',
    title: 'Listar automações',
    description:
      'Mostra as automações da conta: nome, se está no ar ou em rascunho, o gatilho ' +
      'e as palavras-chave. Use antes de criar uma nova, para não repetir palavra-chave ' +
      'já usada, e para pegar o id que publicar_automacao precisa.',
    inputSchema: { type: 'object', additionalProperties: false },
  },
  {
    name: 'buscar_contatos',
    escopo: 'leitura',
    title: 'Buscar contatos',
    description:
      'Lista quem já interagiu, do mais recente para o mais antigo, com o @ e o nome ' +
      'quando o Instagram informou. Use para achar uma pessoa ou ver quem chegou agora.',
    inputSchema: {
      type: 'object',
      properties: {
        busca: { type: 'string', description: 'Parte do @ da pessoa.' },
        limite: LIMITE,
      },
      additionalProperties: false,
    },
  },
  {
    name: 'entregas_recentes',
    escopo: 'leitura',
    title: 'Mensagens enviadas',
    description:
      'O que o sistema mandou e o que o Instagram respondeu, do mais novo para o mais ' +
      'antigo, com o erro quando houve. É a ferramenta para responder "a automação ' +
      'disparou?" e para entender por que alguém não recebeu.',
    inputSchema: {
      type: 'object',
      properties: { limite: LIMITE },
      additionalProperties: false,
    },
  },
  {
    name: 'criar_automacao',
    title: 'Criar automação',
    escopo: 'escrita',
    description:
      'Cria uma automação. Com publicar=false (o padrão) ela nasce em rascunho e ' +
      'ninguém recebe nada até alguém publicar no painel. Com publicar=true ela entra ' +
      'no ar na hora e passa a responder seguidores de verdade — nesse caso, MOSTRE o ' +
      'texto da DM e a palavra-chave e espere a pessoa confirmar antes de chamar.',
    inputSchema: {
      type: 'object',
      properties: {
        publicar: {
          type: 'boolean',
          description:
            'Verdadeiro coloca no ar imediatamente. Só use quando a pessoa confirmou o texto.',
        },
        nome: { type: 'string', description: 'Nome exibido no painel.' },
        gatilho: {
          type: 'string',
          enum: ['comment', 'dm', 'story_reply'],
          description: 'comment é comentário no post; story_reply é resposta de Story.',
        },
        palavrasChave: { type: 'array', items: { type: 'string' } },
        modoDeCasamento: { type: 'string', enum: ['contains', 'exact', 'any'] },
        mediaId: { type: 'string', description: 'Id do post; ausente vale para todos.' },
        respostaPublica: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Variações da resposta no comentário, uma por item. Em resposta de Story não é usada.',
        },
        dm: {
          type: 'array',
          minItems: 1,
          items: { type: 'string' },
          description: 'Variações da DM, uma por item. Uma delas é sorteada a cada disparo.',
        },
      },
      required: ['nome', 'gatilho', 'dm'],
      additionalProperties: false,
    },
  },
  {
    name: 'publicar_automacao',
    title: 'Publicar automação',
    escopo: 'escrita',
    description:
      'Coloca no ar uma automação que já existe. A partir daí ela responde de verdade ' +
      'quem usar a palavra-chave. MOSTRE o texto da DM e espere a pessoa confirmar ' +
      'antes de chamar. O id vem de listar_automacoes.',
    inputSchema: {
      type: 'object',
      properties: {
        automacaoId: { type: 'integer', minimum: 1, description: 'Id da automação.' },
      },
      required: ['automacaoId'],
      additionalProperties: false,
    },
  },
];

export function ferramentasParaEscopos(escopos: readonly string[]): DefinicaoDeFerramenta[] {
  return FERRAMENTAS.filter((ferramenta) => escopos.includes(ferramenta.escopo));
}

export function acharFerramenta(nome: unknown): DefinicaoDeFerramenta | null {
  return FERRAMENTAS.find((f) => f.name === nome) ?? null;
}

export function limiteDaFerramenta(valor: unknown): number {
  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < 1) return 50;
  return Math.min(valor, 200);
}
