import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Entrega recusada aparece nos Logs.
 *
 * "Chegou e foi recusado" e "não chegou nada" são diagnósticos opostos: o
 * primeiro manda olhar a chave secreta do app, o segundo manda olhar o webhook
 * no portal. A tela de Logs é onde a pessoa procura essa diferença.
 *
 * Em 02/10/2026 uma integração passou a recusar antes de gravar, e uma
 * instalação ficou com a lista vazia tendo o segredo errado — a investigação
 * foi parar no portal do Meta e levou horas. O comportamento voltou, e este
 * teste existe para ele não se perder de novo numa próxima integração.
 */
const registrados: { raw: string; valido: boolean }[] = [];
const marcados: { id: number; erro: string | null }[] = [];

vi.mock('@/lib/repo/webhook-events', () => ({
  recordWebhookEvent: vi.fn(async (raw: string, valido: boolean) => {
    registrados.push({ raw, valido });
    return registrados.length;
  }),
  markWebhookProcessed: vi.fn(async (id: number, erro: string | null) => {
    marcados.push({ id, erro });
  }),
  listRecentEvents: vi.fn(async () => []),
}));
vi.mock('@/lib/live-deps', () => ({ liveDeps: {} }));
vi.mock('@/lib/process-event', () => ({ processEvent: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/parse-event', () => ({ parseEvents: vi.fn(() => []) }));

const { POST } = await import('@/app/api/webhook/route');

const pedido = (corpo: string, assinatura?: string) =>
  new Request('https://exemplo.test/api/webhook', {
    method: 'POST',
    headers: assinatura ? { 'x-hub-signature-256': assinatura } : {},
    body: corpo,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

describe('entrega recusada no webhook do Instagram', () => {
  beforeEach(() => {
    registrados.length = 0;
    marcados.length = 0;
    process.env.IG_APP_SECRET = 'segredo-de-teste';
    process.env.VERIFY_TOKEN = 'verificacao';
  });

  it('assinatura inválida vira linha no Logs, com o motivo', async () => {
    const resposta = await POST(pedido('{"entry":[]}', 'sha256=naoconfere'));

    expect(resposta.status).toBe(401);
    expect(registrados).toHaveLength(1);
    expect(marcados[0]?.erro).toMatch(/assinatura inválida/i);
  });

  it('o corpo recusado não é guardado: ele não está autenticado', async () => {
    await POST(pedido('{"segredo":"de terceiro"}', 'sha256=naoconfere'));

    expect(registrados[0]?.raw).toBe('');
    expect(registrados[0]?.valido).toBe(false);
  });

  it('sem IG_APP_SECRET, a linha diz que falta configuração', async () => {
    delete process.env.IG_APP_SECRET;

    const resposta = await POST(pedido('{"entry":[]}', 'sha256=qualquer'));

    expect(resposta.status).toBe(401);
    expect(marcados[0]?.erro).toMatch(/IG_APP_SECRET/);
  });

  it('falha ao registrar a recusa não derruba a resposta', async () => {
    const { recordWebhookEvent } = await import('@/lib/repo/webhook-events');
    vi.mocked(recordWebhookEvent).mockRejectedValueOnce(new Error('banco fora do ar'));

    const resposta = await POST(pedido('{"entry":[]}', 'sha256=naoconfere'));

    expect(resposta.status).toBe(401);
  });
});
