import { GRAPH_VERSION, metaGet, metaPost } from './client';

/*
 * `live_comments` entrou em 06/10/2026: comentário em transmissão ao vivo chega
 * no mesmo formato do comentário em post, e a automação de comentário já sabe
 * tratá-lo. Conferido contra a conta de produção — a Meta aceitou o campo e
 * passou a listá-lo entre os inscritos.
 *
 * Quem conectou antes disso continua sem ele até reconectar: a inscrição é
 * feita uma vez, na conexão. A tela de Logs diz quais avisos estão valendo.
 */
export const WEBHOOK_FIELDS = 'messages,messaging_postbacks,comments,messaging_seen,live_comments';

export function subscribeApp(accountIgId: string, token: string): Promise<unknown> {
  return metaPost(`/${accountIgId}/subscribed_apps`, token, {}, {
    subscribed_fields: WEBHOOK_FIELDS,
  });
}

/**
 * Quais campos o Instagram está realmente mandando para esta instalação.
 *
 * A conexão pede `WEBHOOK_FIELDS` inteiro, mas o que vale é o que a Meta
 * aceitou: um campo que o aplicativo não tem marcado no portal simplesmente
 * não entra, e ninguém avisa. O resultado é um painel que recebe reação e
 * confirmação de leitura, não recebe comentário nenhum, e não tem como dizer
 * a diferença entre "ninguém comentou" e "comentário não chega aqui".
 *
 * Em outubro de 2026 essa diferença custou dias numa instalação. A resposta
 * estava a uma pergunta de distância — esta.
 */
export async function camposInscritos(
  accountIgId: string,
  token: string,
): Promise<string[]> {
  const bruto = await metaGet(`/${GRAPH_VERSION}/${accountIgId}/subscribed_apps`, {
    fields: 'subscribed_fields',
    access_token: token,
  });
  const dados = (bruto as { data?: unknown })?.data;
  if (!Array.isArray(dados)) return [];
  return [
    ...new Set(
      dados.flatMap((app) => {
        const campos = (app as { subscribed_fields?: unknown })?.subscribed_fields;
        return Array.isArray(campos) ? campos.filter((c): c is string => typeof c === 'string') : [];
      }),
    ),
  ];
}

/** Os campos pedidos que não voltaram. Vazio é a resposta boa. */
export function camposQueFaltam(inscritos: readonly string[]): string[] {
  return WEBHOOK_FIELDS.split(',').filter((campo) => !inscritos.includes(campo));
}
