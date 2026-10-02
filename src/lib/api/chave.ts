import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export { ESCOPOS } from './escopos';
export type { Escopo } from './escopos';
import type { Escopo } from './escopos';

const PREFIXO_VISIVEL = 'mc';
const BYTES_PREFIXO = 6;   // 12 caracteres hexadecimais
const BYTES_SEGREDO = 32;  // 64 caracteres hexadecimais
const TAMANHO_PREFIXO = BYTES_PREFIXO * 2;

/**
 * Hexadecimal, e não base64url, de propósito.
 *
 * O formato usa `_` como separador, e o alfabeto do base64url **inclui `_`**.
 * Uma em cada seis chaves saía com underscore no prefixo, o `split('_')`
 * devolvia quatro pedaços em vez de três, e a chave — válida — era recusada.
 * Um defeito intermitente em autenticação, que é o pior lugar para ter um.
 */

export type ChaveGerada = {
  /** O que a pessoa copia. Aparece uma vez e não é recuperável. */
  chave: string;
  /** Parte pública, guardada em claro para localizar a linha. */
  prefixo: string;
  /** SHA-256 do segredo. É o que vai para o banco. */
  hash: string;
};

/**
 * A chave tem duas partes: `mc_<prefixo>_<segredo>`.
 *
 * O prefixo existe para a verificação ser uma consulta indexada em vez de
 * comparar o hash contra todas as linhas da tabela. O segredo nunca é
 * guardado — só o hash dele.
 */
export function gerarChave(): ChaveGerada {
  const prefixo = randomBytes(BYTES_PREFIXO).toString('hex');
  const segredo = randomBytes(BYTES_SEGREDO).toString('hex');

  return {
    chave: `${PREFIXO_VISIVEL}_${prefixo}_${segredo}`,
    prefixo,
    hash: hashDoSegredo(segredo),
  };
}

export function hashDoSegredo(segredo: string): string {
  return createHash('sha256').update(segredo).digest('hex');
}

export type ChaveSeparada = { prefixo: string; segredo: string };

/**
 * Separa a chave recebida. Devolve `null` para qualquer coisa fora do
 * formato — e recusar cedo evita levar entrada arbitrária até a consulta.
 */
export function separarChave(valor: unknown): ChaveSeparada | null {
  if (typeof valor !== 'string') return null;

  const partes = valor.split('_');
  if (partes.length !== 3) return null;

  const [marca, prefixo, segredo] = partes;
  if (marca !== PREFIXO_VISIVEL) return null;
  if (prefixo.length !== TAMANHO_PREFIXO || segredo.length === 0) return null;

  return { prefixo, segredo };
}

/**
 * Comparação em tempo constante entre o hash do segredo recebido e o guardado.
 *
 * Os dois são SHA-256 em hexadecimal, então têm sempre o mesmo tamanho —
 * `timingSafeEqual` não lança aqui, diferente do caso de comparar segredos
 * crus de tamanhos diferentes.
 */
export function segredoConfere(segredo: string, hashGuardado: string): boolean {
  const recebido = Buffer.from(hashDoSegredo(segredo), 'utf8');
  const guardado = Buffer.from(hashGuardado, 'utf8');
  if (recebido.length !== guardado.length) return false;
  return timingSafeEqual(recebido, guardado);
}

export function temEscopo(escopos: readonly string[], necessario: Escopo): boolean {
  return escopos.includes(necessario);
}

/**
 * Lê a chave de `Authorization: Bearer <chave>`.
 *
 * Mora aqui, e não em `autenticar.ts`, porque é puro: `autenticar.ts` importa
 * o repositório, que monta o cliente do banco no import. Deixar esta função lá
 * faria qualquer teste dela exigir DATABASE_URL para exercitar uma leitura de
 * cabeçalho.
 *
 * Só do cabeçalho, nunca da query string: URL vai para log de servidor, para
 * histórico de navegador e para o `Referer` de qualquer link que a página
 * abra. Credencial em URL é credencial vazada em três lugares que ninguém
 * limpa depois.
 */
export function extrairChave(headers: Headers): string | null {
  const bruto = headers.get('authorization');
  if (!bruto) return null;

  const [esquema, valor] = bruto.split(' ');
  if (esquema?.toLowerCase() !== 'bearer' || !valor) return null;
  return valor;
}
