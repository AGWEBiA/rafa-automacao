import { sql } from '../db';
import { gerarChave, separarChave, segredoConfere, type Escopo } from '../api/chave';

export type ChaveDeApi = {
  id: number;
  accountId: number;
  nome: string;
  prefixo: string;
  escopos: string[];
  criadoEm: Date;
  ultimoUsoEm: Date | null;
  revogadaEm: Date | null;
};

/**
 * Cria a chave e devolve o valor em claro **uma única vez**.
 *
 * Quem chamar precisa mostrar isso agora: o banco guarda só o hash, então não
 * existe "ver a chave de novo". É a mesma escolha de qualquer serviço sério,
 * e ela é o que faz um vazamento do banco não virar acesso.
 */
export async function criarChave(
  accountId: number,
  nome: string,
  escopos: Escopo[],
): Promise<{ id: number; chave: string; prefixo: string }> {
  const { chave, prefixo, hash } = gerarChave();

  const rows = (await sql`
    insert into api_keys (account_id, nome, prefixo, hash, escopos)
    values (${accountId}, ${nome}, ${prefixo}, ${hash}, ${escopos})
    returning id
  `) as { id: number }[];

  return { id: rows[0].id, chave, prefixo };
}

export async function listarChaves(accountId: number): Promise<ChaveDeApi[]> {
  const rows = (await sql`
    select id, account_id, nome, prefixo, escopos, criado_em, ultimo_uso_em, revogada_em
    from api_keys
    where account_id = ${accountId}
    order by criado_em desc
  `) as {
    id: number;
    account_id: number;
    nome: string;
    prefixo: string;
    escopos: string[];
    criado_em: Date;
    ultimo_uso_em: Date | null;
    revogada_em: Date | null;
  }[];

  return rows.map((r) => ({
    id: r.id,
    accountId: r.account_id,
    nome: r.nome,
    prefixo: r.prefixo,
    escopos: r.escopos,
    criadoEm: r.criado_em,
    ultimoUsoEm: r.ultimo_uso_em,
    revogadaEm: r.revogada_em,
  }));
}

/** Revogar marca, não apaga: a linha continua explicando o que aquela chave fez. */
export async function revogarChave(accountId: number, id: number): Promise<void> {
  await sql`
    update api_keys set revogada_em = now()
    where id = ${id} and account_id = ${accountId} and revogada_em is null
  `;
}

export type ChaveVerificada = {
  accountId: number;
  chaveId: number;
  escopos: string[];
};

/**
 * Verifica uma chave recebida. `null` para qualquer recusa.
 *
 * Devolve `null` — e não um motivo — de propósito: distinguir "chave não
 * existe" de "chave existe mas o segredo está errado" conta a quem tenta
 * adivinhar quais prefixos são reais.
 *
 * Chave revogada é recusada aqui, e não numa consulta separada: revogar
 * precisa ter efeito imediato, sem depender de ninguém lembrar de checar.
 */
export async function verificarChave(valor: unknown): Promise<ChaveVerificada | null> {
  const separada = separarChave(valor);
  if (!separada) return null;

  const rows = (await sql`
    select id, account_id, hash, escopos
    from api_keys
    where prefixo = ${separada.prefixo} and revogada_em is null
  `) as { id: number; account_id: number; hash: string; escopos: string[] }[];

  const linha = rows[0];
  if (!linha) return null;
  if (!segredoConfere(separada.segredo, linha.hash)) return null;

  // Best-effort: saber quando a chave foi usada pela última vez ajuda a
  // decidir o que revogar, mas falhar aqui não pode recusar uma chave válida.
  try {
    await sql`update api_keys set ultimo_uso_em = now() where id = ${linha.id}`;
  } catch (erro) {
    console.error('api: falha ao marcar último uso da chave', erro);
  }

  return { accountId: linha.account_id, chaveId: linha.id, escopos: linha.escopos };
}
