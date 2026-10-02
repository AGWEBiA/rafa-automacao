import type { MatchMode } from '../matching';
import { GATILHOS, type TipoDeGatilho } from '../repo/types';

export type DadosDeCriacao = {
  nome: string;
  gatilho: TipoDeGatilho;
  palavrasChave: string[];
  modoDeCasamento: MatchMode;
  mediaId: string | null;
  respostaPublica: string[];
  dm: string[];
};

export type ResultadoDaCriacao =
  | { ok: true; dados: DadosDeCriacao }
  | { ok: false; erro: string };

function ehGatilho(valor: unknown): valor is TipoDeGatilho {
  return GATILHOS.includes(valor as TipoDeGatilho);
}

function objeto(valor: unknown): Record<string, unknown> | null {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return null;
  return valor as Record<string, unknown>;
}

function listaDeTextos(valor: unknown, campo: string): string[] | string {
  if (!Array.isArray(valor) || valor.some((item) => typeof item !== 'string')) {
    return `${campo} deve ser uma lista de textos.`;
  }
  return valor.map((item) => item.trim()).filter((item) => item.length > 0);
}

export function validarCriacaoDeAutomacao(entrada: unknown): ResultadoDaCriacao {
  const dados = objeto(entrada);
  if (!dados) return { ok: false, erro: 'A entrada deve ser um objeto.' };

  if (typeof dados.nome !== 'string' || dados.nome.trim().length === 0) {
    return { ok: false, erro: 'nome é obrigatório.' };
  }
  // Lista derivada do tipo: gatilho novo entra aqui sozinho. A versão anterior
  // comparava com dois literais, e teria recusado `story_reply` com uma
  // mensagem dizendo que ele não existe.
  if (!ehGatilho(dados.gatilho)) {
    return { ok: false, erro: `gatilho deve ser um de: ${GATILHOS.join(', ')}.` };
  }

  const dm = listaDeTextos(dados.dm, 'dm');
  if (typeof dm === 'string') return { ok: false, erro: dm };
  if (dm.length === 0) return { ok: false, erro: 'dm precisa ter ao menos uma variação.' };

  const palavras = dados.palavrasChave === undefined
    ? []
    : listaDeTextos(dados.palavrasChave, 'palavrasChave');
  if (typeof palavras === 'string') return { ok: false, erro: palavras };

  const respostaPublica = dados.respostaPublica === undefined
    ? []
    : listaDeTextos(dados.respostaPublica, 'respostaPublica');
  if (typeof respostaPublica === 'string') return { ok: false, erro: respostaPublica };

  const modo = dados.modoDeCasamento ?? 'contains';
  if (modo !== 'contains' && modo !== 'exact' && modo !== 'any') {
    return { ok: false, erro: 'modoDeCasamento inválido.' };
  }
  if (dados.mediaId !== undefined && typeof dados.mediaId !== 'string') {
    return { ok: false, erro: 'mediaId deve ser texto.' };
  }

  return {
    ok: true,
    dados: {
      nome: dados.nome.trim(),
      gatilho: dados.gatilho,
      palavrasChave: [...new Set(palavras)],
      modoDeCasamento: modo,
      mediaId: dados.mediaId?.trim() || null,
      respostaPublica,
      dm,
    },
  };
}
