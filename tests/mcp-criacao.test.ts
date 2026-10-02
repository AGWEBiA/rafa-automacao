import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validarCriacaoDeAutomacao } from '../src/lib/mcp/criacao';
import { FERRAMENTAS, ferramentasParaEscopos } from '../src/lib/mcp/ferramentas';

describe('validação da criação de automação por MCP', () => {
  it('aceita a entrada mínima e preserva cada variação de DM', () => {
    expect(
      validarCriacaoDeAutomacao({
        nome: 'Boas-vindas',
        gatilho: 'comment',
        dm: ['Primeira mensagem', 'Segunda mensagem'],
      }),
    ).toEqual({
      ok: true,
      dados: {
        nome: 'Boas-vindas',
        gatilho: 'comment',
        palavrasChave: [],
        modoDeCasamento: 'contains',
        mediaId: null,
        respostaPublica: [],
        dm: ['Primeira mensagem', 'Segunda mensagem'],
      },
    });
  });

  it.each([
    ['ausente', { nome: 'Sem DM', gatilho: 'comment' }],
    ['vazia', { nome: 'Sem DM', gatilho: 'comment', dm: [] }],
    ['só com espaços', { nome: 'Sem DM', gatilho: 'comment', dm: ['  '] }],
  ])('recusa DM %s', (_caso, entrada) => {
    expect(validarCriacaoDeAutomacao(entrada).ok).toBe(false);
  });

  it('recusa gatilho fora de comment e dm', () => {
    expect(
      validarCriacaoDeAutomacao({ nome: 'Gatilho inválido', gatilho: 'story', dm: ['Olá'] }).ok,
    ).toBe(false);
  });

  it('limpa palavras-chave vazias e repetidas mantendo a ordem', () => {
    const resultado = validarCriacaoDeAutomacao({
      nome: 'Palavras',
      gatilho: 'dm',
      palavrasChave: [' oferta ', '', 'oferta', '  ', 'agora', 'oferta'],
      dm: ['Olá'],
    });

    expect(resultado).toMatchObject({
      ok: true,
      dados: { palavrasChave: ['oferta', 'agora'] },
    });
  });

  it('converte mediaId só com espaços em null', () => {
    expect(
      validarCriacaoDeAutomacao({
        nome: 'Sem mídia',
        gatilho: 'comment',
        mediaId: '  ',
        dm: ['Olá'],
      }),
    ).toMatchObject({ ok: true, dados: { mediaId: null } });
  });

  it('descarta status mesmo quando a entrada pede published', () => {
    const resultado = validarCriacaoDeAutomacao({
      nome: 'Não publicar',
      gatilho: 'comment',
      dm: ['Olá'],
      status: 'published',
    });

    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect('status' in resultado.dados).toBe(false);
  });
});

describe('escopos das ferramentas MCP', () => {
  /*
   * O nome mudou em 02/10/2026, quando criar deixou de ser só rascunho: a
   * mesma ferramenta publica quando `publicar` vem verdadeiro.
   */
  it('esconde criar e publicar de uma chave somente de leitura', () => {
    const nomes = ferramentasParaEscopos(['leitura']).map((f) => f.name);
    expect(nomes).not.toContain('criar_automacao');
    expect(nomes).not.toContain('publicar_automacao');
  });

  it('mostra criar e publicar para uma chave com leitura e escrita', () => {
    const nomes = ferramentasParaEscopos(['leitura', 'escrita']).map((f) => f.name);
    expect(nomes).toContain('criar_automacao');
    expect(nomes).toContain('publicar_automacao');
  });

  it('publicar é escrita, nunca leitura', () => {
    const publicar = FERRAMENTAS.find((f) => f.name === 'publicar_automacao');
    expect(publicar?.escopo).toBe('escrita');
    // A descrição é a única coisa que o modelo lê antes de mandar DM para
    // gente de verdade. Se ela parar de mandar confirmar, some a única barreira
    // entre um mal-entendido e uma mensagem enviada.
    expect(publicar?.description).toMatch(/confirmar/i);
  });

  it('exige escopo declarado em toda ferramenta', () => {
    expect(FERRAMENTAS.every((f) => f.escopo === 'leitura' || f.escopo === 'escrita')).toBe(true);
  });
});

describe('a rota não conta o que existe para quem não tem chave', () => {
  /**
   * Ferramenta desconhecida respondia antes de qualquer autenticação. Com isso,
   * quem não tem chave nenhuma descobria a lista inteira por tentativa: nome
   * que existe respondia diferente de nome que não existe.
   *
   * O guarda é por leitura da fonte porque o defeito é de **ordem**, e ordem
   * não aparece no resultado de nenhuma função pura — só na sequência em que a
   * rota faz as coisas.
   */
  it('exige chave antes de dizer que a ferramenta não existe', () => {
    const fonte = readFileSync('src/app/api/mcp/route.ts', 'utf8');
    const trecho = fonte.match(
      /const ferramenta = acharFerramenta[\s\S]*?Ferramenta desconhecida/,
    )?.[0];

    expect(trecho).toBeDefined();
    expect(trecho).toContain('autenticar(');
  });
});

describe('guarda de publicação', () => {
  it('findPublishedAutomations consulta somente automações published', () => {
    const fonte = readFileSync('src/lib/repo/automations.ts', 'utf8');
    const corpo = fonte.match(
      /export async function findPublishedAutomations[\s\S]*?(?=export async function listAutomations)/,
    )?.[0];

    expect(corpo).toBeDefined();
    expect(corpo).toMatch(/and\s+status\s*=\s*'published'/);
  });
});
