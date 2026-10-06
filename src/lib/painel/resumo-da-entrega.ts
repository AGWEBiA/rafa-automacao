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

/*
 * O que o Meta mandou, quando não foi comentário nem mensagem.
 *
 * "Entrega sem comentário nem mensagem" repetido vinte vezes diz que não era
 * nada conhecido, e para por aí: quem está investigando por que a automação
 * não dispara continua sem saber se o que chega é confirmação de leitura —
 * que é normal e não dispara nada — ou comentário que este painel não soube
 * ler, que seria defeito. São conclusões opostas a partir da mesma linha.
 */
const NOMES_DOS_CAMPOS: Readonly<Record<string, string>> = {
  read: 'confirmação de leitura',
  delivery: 'confirmação de entrega',
  reaction: 'reação a mensagem',
  postback: 'clique em botão',
  referral: 'entrada por link',
  message_edit: 'mensagem editada',
  comments: 'aviso de comentário que este painel não soube ler',
  live_comments: 'aviso de comentário de live que este painel não soube ler',
  mentions: 'menção que este painel não soube ler',
  story_insights: 'números de Story',
};

function camposDaEntrega(payload: unknown): string[] {
  const raiz = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : null;
  if (!raiz) return [];

  const objeto = typeof raiz.object === 'string' ? raiz.object : null;
  if (objeto && objeto !== 'instagram') return [`evento de ${objeto}, não do Instagram`];

  const entradas = Array.isArray(raiz.entry) ? raiz.entry : [];
  const campos = new Set<string>();
  for (const entrada of entradas) {
    const e = typeof entrada === 'object' && entrada !== null ? (entrada as Record<string, unknown>) : null;
    if (!e) continue;
    for (const mudanca of Array.isArray(e.changes) ? e.changes : []) {
      const c = typeof mudanca === 'object' && mudanca !== null ? (mudanca as Record<string, unknown>) : null;
      const campo = c && typeof c.field === 'string' ? c.field : null;
      if (campo) campos.add(NOMES_DOS_CAMPOS[campo] ?? campo);
    }
    for (const item of Array.isArray(e.messaging) ? e.messaging : []) {
      const m = typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : null;
      if (!m) continue;
      // A chave que não é remetente nem destinatário nem relógio é o que
      // aconteceu. É assim que o Meta desenha o `messaging`.
      for (const chave of Object.keys(m)) {
        if (chave === 'sender' || chave === 'recipient' || chave === 'timestamp') continue;
        campos.add(NOMES_DOS_CAMPOS[chave] ?? chave);
      }
    }
  }
  return [...campos];
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

  if (eventos.length === 0) {
    const campos = camposDaEntrega(payload);
    return campos.length === 0
      ? 'entrega sem comentário nem mensagem'
      : `entrega sem comentário nem mensagem · ${campos.join(', ')}`;
  }
  if (eventos.length === 1) return descrever(eventos[0]);
  return `${eventos.length} eventos · ${eventos.map(descrever).join(' · ')}`;
}
