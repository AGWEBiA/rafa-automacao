import { sql } from '../db';

export async function registrarAcaoDeAgente(
  accountId: number,
  apiKeyId: number,
  acao: string,
  alvoTipo: string,
  alvoId: number | null,
  detalhes: Record<string, unknown>,
): Promise<void> {
  await sql`
    insert into agent_actions
      (account_id, api_key_id, acao, alvo_tipo, alvo_id, detalhes)
    values
      (${accountId}, ${apiKeyId}, ${acao}, ${alvoTipo}, ${alvoId},
       ${JSON.stringify(detalhes)}::jsonb)
  `;
}
