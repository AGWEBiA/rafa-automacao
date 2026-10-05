import { describe, expect, it } from 'vitest';
import { resumirEntrega } from '@/lib/painel/resumo-da-entrega';

/*
 * A lista de Logs mostrava só o horário. Em outubro de 2026 uma instalação
 * passou quatro dias com eventos chegando e automação muda, e ninguém
 * conseguia dizer se o que chegava era sequer um comentário. O painel já
 * guardava o conteúdo; só não contava.
 */
const comentario = JSON.stringify({
  object: 'instagram',
  entry: [
    {
      id: '17841401359120739',
      changes: [
        {
          field: 'comments',
          value: {
            id: '17865799348089039',
            text: 'sem mensalidade',
            from: { id: '232323232', username: 'anasilvaa.digital' },
            media: { id: '123123123' },
          },
        },
      ],
    },
  ],
});

const mensagem = JSON.stringify({
  object: 'instagram',
  entry: [
    {
      id: '17841401359120739',
      messaging: [
        {
          sender: { id: '999' },
          recipient: { id: '17841401359120739' },
          message: { mid: 'm1', text: 'oi, quero saber mais' },
        },
      ],
    },
  ],
});

const respostaDeStory = JSON.stringify({
  object: 'instagram',
  entry: [
    {
      id: '17841401359120739',
      messaging: [
        {
          sender: { id: '999' },
          recipient: { id: '17841401359120739' },
          message: { mid: 'm2', text: 'quero', reply_to: { story: { id: 's1', url: 'u' } } },
        },
      ],
    },
  ],
});

describe('resumo de uma entrega', () => {
  it('conta quem comentou e o que escreveu', () => {
    expect(resumirEntrega(comentario)).toBe('comentário de @anasilvaa.digital: “sem mensalidade”');
  });

  it('distingue mensagem de resposta de Story', () => {
    expect(resumirEntrega(mensagem)).toContain('mensagem de');
    expect(resumirEntrega(respostaDeStory)).toContain('resposta de Story de');
  });

  it('sem @ no aviso, mostra o identificador em vez de mentir', () => {
    expect(resumirEntrega(mensagem)).toContain('id 999');
  });

  it('entrega que não é comentário nem mensagem diz isso, em vez de ficar muda', () => {
    const leitura = JSON.stringify({ object: 'instagram', entry: [{ id: '1', messaging: [{ read: { mid: 'x' } }] }] });
    expect(resumirEntrega(leitura)).toBe('entrega sem comentário nem mensagem');
  });

  it('corpo recusado e payload ilegível têm cada um a sua frase', () => {
    expect(resumirEntrega('')).toBe('conteúdo não guardado');
    expect(resumirEntrega(null)).toBe('conteúdo não guardado');
    expect(resumirEntrega('isto não é json')).toBe('entrega ilegível');
  });

  it('texto comprido é cortado, para a linha caber na tela', () => {
    const longo = JSON.stringify({
      object: 'instagram',
      entry: [
        {
          id: '1',
          changes: [
            {
              field: 'comments',
              value: { id: 'c', text: 'a'.repeat(300), from: { id: '2', username: 'fulano' } },
            },
          ],
        },
      ],
    });
    const resumo = resumirEntrega(longo);
    expect(resumo.length).toBeLessThan(140);
    expect(resumo).toContain('…');
  });

  it('entrega com dois eventos conta os dois', () => {
    const dois = JSON.stringify({
      object: 'instagram',
      entry: [
        {
          id: '1',
          changes: [
            { field: 'comments', value: { id: 'c1', text: 'um', from: { id: '2', username: 'a' } } },
            { field: 'comments', value: { id: 'c2', text: 'dois', from: { id: '3', username: 'b' } } },
          ],
        },
      ],
    });
    expect(resumirEntrega(dois)).toMatch(/^2 eventos · /);
  });
});
