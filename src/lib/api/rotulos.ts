import { ESCOPOS, type Escopo } from './escopos';

export const ROTULOS_DOS_ESCOPOS: Record<
  Escopo,
  { nome: string; descricao: string }
> = {
  leitura: {
    nome: 'Leitura',
    descricao: 'consultar contatos, leads e temperatura',
  },
  escrita: {
    nome: 'Escrita',
    descricao: 'criar e alterar automações',
  },
};

export const AVISO_DA_ESCRITA =
  'Dar escrita a um agente de IA significa que ele pode criar e alterar automações que disparam mensagens de verdade.';

export const AVISO_DA_CHAVE =
  'Copie esta chave agora e cole no lugar em que vai usá-la. Ela não vai aparecer de novo.';

export type CriacaoDeChaveValidada =
  | { ok: true; nome: string; escopos: Escopo[] }
  | { ok: false; erro: string };

function eEscopo(valor: unknown): valor is Escopo {
  return typeof valor === 'string' && ESCOPOS.includes(valor as Escopo);
}

export function validarCriacaoDeChave(
  corpo: unknown,
): CriacaoDeChaveValidada {
  if (typeof corpo !== 'object' || corpo === null || Array.isArray(corpo)) {
    return { ok: false, erro: 'Corpo da requisição inválido.' };
  }

  const entrada = corpo as Record<string, unknown>;
  if (typeof entrada.nome !== 'string' || entrada.nome.trim() === '') {
    return { ok: false, erro: 'Dê um nome para a chave.' };
  }

  if (
    !Array.isArray(entrada.escopos) ||
    entrada.escopos.length === 0 ||
    !entrada.escopos.every(eEscopo)
  ) {
    return { ok: false, erro: 'Escolha ao menos um escopo válido.' };
  }

  return {
    ok: true,
    nome: entrada.nome.trim(),
    escopos: [...entrada.escopos],
  };
}

