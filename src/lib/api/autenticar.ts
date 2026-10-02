import { verificarChave } from '../repo/api-keys';
import { extrairChave, temEscopo, type Escopo } from './chave';

export { extrairChave };

export type Autenticado = { accountId: number; chaveId: number; escopos: string[] };

export type ResultadoDaAutenticacao =
  | { ok: true; contexto: Autenticado }
  | { ok: false; status: 401 | 403; erro: string };

export async function autenticar(
  headers: Headers,
  escopoNecessario: Escopo,
): Promise<ResultadoDaAutenticacao> {
  const chave = extrairChave(headers);
  if (!chave) {
    return { ok: false, status: 401, erro: 'Envie a chave em Authorization: Bearer <chave>.' };
  }

  const contexto = await verificarChave(chave);
  if (!contexto) {
    // Mesma mensagem para chave inexistente, adulterada e revogada. Separar os
    // casos ajudaria mais quem está tentando adivinhar do que quem errou.
    return { ok: false, status: 401, erro: 'Chave inválida.' };
  }

  if (!temEscopo(contexto.escopos, escopoNecessario)) {
    // 403, não 401: a chave é válida, o que falta é permissão. Devolver 401
    // faria a integração tentar autenticar de novo para sempre.
    return {
      ok: false,
      status: 403,
      erro: `Esta chave não tem escopo de ${escopoNecessario}.`,
    };
  }

  return { ok: true, contexto };
}

/** Resposta de erro no mesmo formato em toda a API. */
export function erroDaApi(status: number, erro: string): Response {
  return Response.json({ ok: false, erro }, { status });
}
