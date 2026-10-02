import { describe, expect, it } from 'vitest';
import {
  ehRequisicaoValida,
  ehNotificacao,
  conferirCabecalhos,
  decodificarValorDeCabecalho,
  origemPermitida,
  resposta,
  erro,
  CODIGO,
  VERSAO_ATUAL,
} from '@/lib/mcp/protocolo';
import { FERRAMENTAS, acharFerramenta, limiteDaFerramenta } from '@/lib/mcp/ferramentas';

const cab = (h: Record<string, string>) => new Headers(h);
const req = (over: Record<string, unknown> = {}) => ({
  jsonrpc: '2.0' as const,
  id: 1,
  method: 'tools/list',
  ...over,
});

describe('ehRequisicaoValida', () => {
  it('aceita requisição JSON-RPC bem formada', () => {
    expect(ehRequisicaoValida(req())).toBe(true);
  });

  it('recusa o que não é JSON-RPC 2.0', () => {
    expect(ehRequisicaoValida({ method: 'tools/list' })).toBe(false);
    expect(ehRequisicaoValida({ jsonrpc: '1.0', method: 'x' })).toBe(false);
    expect(ehRequisicaoValida({ jsonrpc: '2.0' })).toBe(false);
    expect(ehRequisicaoValida(null)).toBe(false);
    expect(ehRequisicaoValida([])).toBe(false);
    expect(ehRequisicaoValida('texto')).toBe(false);
  });
});

describe('ehNotificacao', () => {
  // Notificação não tem resposta, e o handshake antigo depende disso: o
  // cliente manda notifications/initialized e espera 202, não um resultado.
  it('reconhece ausência de id', () => {
    expect(ehNotificacao({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBe(true);
    expect(ehNotificacao({ jsonrpc: '2.0', id: null, method: 'x' })).toBe(true);
    expect(ehNotificacao(req())).toBe(false);
    expect(ehNotificacao({ jsonrpc: '2.0', id: 0, method: 'x' })).toBe(false);
  });
});

describe('conferirCabecalhos', () => {
  // Intermediários roteiam pelo cabeçalho e o servidor executa pelo corpo. Se
  // divergirem, o que foi autorizado e o que foi executado são coisas
  // diferentes — por isso divergência é erro, não algo a normalizar.
  it('acusa Mcp-Method diferente do corpo', () => {
    const p = conferirCabecalhos(
      cab({ 'mcp-protocol-version': VERSAO_ATUAL, 'mcp-method': 'tools/call' }),
      req(),
    );
    expect(p?.code).toBe(CODIGO.cabecalhoDivergente);
  });

  it('acusa Mcp-Name diferente do corpo em tools/call', () => {
    const p = conferirCabecalhos(
      cab({
        'mcp-protocol-version': VERSAO_ATUAL,
        'mcp-method': 'tools/call',
        'mcp-name': 'outra',
      }),
      req({ method: 'tools/call', params: { name: 'leads_quentes' } }),
    );
    expect(p?.code).toBe(CODIGO.cabecalhoDivergente);
  });

  it('aceita quando cabeçalho e corpo batem', () => {
    expect(
      conferirCabecalhos(
        cab({
          'mcp-protocol-version': VERSAO_ATUAL,
          'mcp-method': 'tools/call',
          'mcp-name': 'leads_quentes',
        }),
        req({ method: 'tools/call', params: { name: 'leads_quentes' } }),
      ),
    ).toBeNull();
  });

  // Revisões anteriores não definiam esses cabeçalhos. Exigi-los delas
  // recusaria cliente legítimo que está só alguns meses atrás.
  it('não exige cabeçalho de cliente antigo', () => {
    expect(conferirCabecalhos(cab({}), req())).toBeNull();
    expect(conferirCabecalhos(cab({ 'mcp-protocol-version': '2025-06-18' }), req())).toBeNull();
  });

  it('recusa versão que não falamos, dizendo quais falamos', () => {
    const p = conferirCabecalhos(cab({ 'mcp-protocol-version': '1999-01-01' }), req());
    expect(p?.message).toMatch(/não suportada/);
    expect(p?.data).toHaveProperty('supported');
  });
});

describe('decodificarValorDeCabecalho', () => {
  it('devolve ASCII simples como está', () => {
    expect(decodificarValorDeCabecalho('leads_quentes')).toBe('leads_quentes');
  });

  // Sem decodificar, um nome com acento acusaria divergência sendo legítimo.
  it('decodifica o formato base64 da especificação', () => {
    const codificado = `=?base64?${Buffer.from('audiência', 'utf8').toString('base64')}?=`;
    expect(decodificarValorDeCabecalho(codificado)).toBe('audiência');
  });

  it('devolve null quando o cabeçalho não existe', () => {
    expect(decodificarValorDeCabecalho(null)).toBeNull();
  });
});

describe('origemPermitida', () => {
  // Cliente MCP de terminal não manda Origin, e exigi-lo recusaria justamente
  // quem vai usar isto.
  it('aceita requisição sem Origin', () => {
    expect(origemPermitida(null, 'app.vercel.app')).toBe(true);
  });

  it('aceita mesma origem e recusa outra', () => {
    expect(origemPermitida('https://app.vercel.app', 'app.vercel.app')).toBe(true);
    expect(origemPermitida('https://site-do-atacante.com', 'app.vercel.app')).toBe(false);
    expect(origemPermitida('lixo', 'app.vercel.app')).toBe(false);
  });
});

describe('ferramentas', () => {
  it('toda ferramenta tem nome válido, título, descrição e schema', () => {
    for (const f of FERRAMENTAS) {
      expect(f.name).toMatch(/^[A-Za-z0-9_.-]{1,128}$/);
      expect(f.title.length).toBeGreaterThan(0);
      expect(f.description.length).toBeGreaterThan(30);
      expect(f.inputSchema.type).toBe('object');
    }
  });

  it('não tem nome repetido', () => {
    const nomes = FERRAMENTAS.map((f) => f.name);
    expect(new Set(nomes).size).toBe(nomes.length);
  });

  it('acha por nome e recusa desconhecida', () => {
    expect(acharFerramenta('leads_quentes')?.name).toBe('leads_quentes');
    expect(acharFerramenta('nao_existe')).toBeNull();
    expect(acharFerramenta(null)).toBeNull();
    expect(acharFerramenta(42)).toBeNull();
  });

  // Pedir "todos" é o comportamento natural de um modelo, e uma base grande
  // numa resposta só estoura o contexto dele.
  it('limite tem padrão e teto', () => {
    expect(limiteDaFerramenta(undefined)).toBe(50);
    expect(limiteDaFerramenta(10)).toBe(10);
    expect(limiteDaFerramenta(99999)).toBe(200);
    expect(limiteDaFerramenta(0)).toBe(50);
    expect(limiteDaFerramenta(-1)).toBe(50);
    expect(limiteDaFerramenta('muitos')).toBe(50);
    expect(limiteDaFerramenta(1.5)).toBe(50);
  });
});

describe('formato JSON-RPC', () => {
  it('resposta carrega o id e o resultado', () => {
    expect(resposta(7, { ok: true })).toEqual({ jsonrpc: '2.0', id: 7, result: { ok: true } });
  });

  it('erro sem id vira id nulo, como a especificação pede', () => {
    expect(erro(undefined, CODIGO.parseError, 'x')).toEqual({
      jsonrpc: '2.0',
      id: null,
      error: { code: CODIGO.parseError, message: 'x' },
    });
  });
});
