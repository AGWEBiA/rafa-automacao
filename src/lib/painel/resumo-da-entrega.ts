/**
 * O que foi aquela entrega, em uma linha.
 *
 * A tela de Logs mostrava só o horário. "Chegaram seis eventos" e nenhuma
 * pista do que eram: comentário? mensagem? visualização? Em outubro de 2026
 * isso custou quatro dias de investigação numa instalação — os eventos
 * chegavam, a automação não disparava, e ninguém tinha como saber se o que
 * chegava era sequer um comentário.
 *
 * O painel já guardava o conteúdo. Só não contava.
 */
import { parseEvents, type NormalizedEvent } from '../parse-event';

const LIMITE_DO_TEXTO = 80;

function comAspas(texto: string): string {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  if (!limpo) return '';
  const curto =
    limpo.length > LIMITE_DO_TEXTO ? `${limpo.slice(0, LIMITE_DO_TEXTO)}…` : limpo;
  return `: “${curto}”`;
}

/** Quem mandou: o `@` quando o Meta conta, e o identificador quando não conta. */
function quem(usuario: string | null, id: string): string {
  if (usuario) return `@${usuario}`;
  return id ? `id ${id}` : 'alguém';
}

function descrever(evento: NormalizedEvent): string {
  if (evento.kind === 'comment') {
    return `comentário de ${quem(evento.fromUsername, evento.fromId)}${comAspas(evento.text)}`;
  }
  if (evento.story) {
    return `resposta de Story de ${quem(null, evento.fromId)}${comAspas(evento.text)}`;
  }
  return `mensagem de ${quem(null, evento.fromId)}${comAspas(evento.text)}`;
}

/**
 * Entrega que não vira evento conhecido não é defeito: o Meta manda
 * confirmação de leitura, reação e outras coisas que a automação não usa.
 * Dizer isso é melhor que deixar a linha muda — foi a mudez que enganou.
 */
export function resumirEntrega(raw: string | null | undefined): string {
  if (!raw) return 'conteúdo não guardado';

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return 'entrega ilegível';
  }

  let eventos: NormalizedEvent[] = [];
  try {
    eventos = parseEvents(payload);
  } catch {
    return 'entrega ilegível';
  }

  if (eventos.length === 0) return 'entrega sem comentário nem mensagem';
  if (eventos.length === 1) return descrever(eventos[0]);
  return `${eventos.length} eventos · ${eventos.map(descrever).join(' · ')}`;
}
