import { describe, expect, it } from 'vitest';
import { lerVariacoes } from '../src/lib/automations/variacoes';

/*
 * Duas regras caíram aqui, pelo mesmo motivo.
 *
 * "Uma variação por linha" fez uma DM de três linhas virar três mensagens, e
 * alguém recebeu só "Oiiiii!" e um botão. Trocamos por "linha em branco
 * separa", que funcionou até outubro de 2026 — quando ficou claro que ela
 * roubava o parágrafo, e DM sem parágrafo ninguém lê até o fim.
 *
 * Agora cada variação é um campo do formulário. Não existe separador dentro
 * do texto, e é por isso que estes testes são sobre preservar o que a pessoa
 * escreveu, não sobre dividir.
 */
describe('variações vindas do formulário', () => {
  it('cada campo é uma variação, inteira', () => {
    const dm = [
      'Oiiiii!',
      'Aqui é a Amanda. Você comentou no meu post.',
      'É só clicar no botão abaixo para saber mais.',
    ].join('\n');

    expect(lerVariacoes([dm])).toEqual([dm]);
  });

  it('linha em branco dentro do campo é parágrafo, e fica', () => {
    const comParagrafo = 'Oi! Tudo bem?\n\nVocê comentou no meu post.\n\nSegue o link.';

    expect(lerVariacoes([comParagrafo])).toEqual([comParagrafo]);
  });

  it('dois campos são duas variações', () => {
    expect(lerVariacoes(['Oi!\nTudo bem?', 'Olá!\nComo vai?'])).toEqual([
      'Oi!\nTudo bem?',
      'Olá!\nComo vai?',
    ]);
  });

  it('campo vazio é descartado: é quem acrescentou uma caixa e desistiu', () => {
    expect(lerVariacoes(['Oi!', '', '   ', '\n\n'])).toEqual(['Oi!']);
    expect(lerVariacoes([])).toEqual([]);
  });

  it('espaço das pontas sai; a quebra de dentro fica', () => {
    expect(lerVariacoes(['  \n Oi!\n\nTchau. \n '])).toEqual(['Oi!\n\nTchau.']);
  });

  it('a mesma mensagem fica igual no Windows e fora dele', () => {
    expect(lerVariacoes(['Oi!\r\n\r\nTchau.'])).toEqual(['Oi!\n\nTchau.']);
  });

  it('valor estranho não derruba o salvamento', () => {
    expect(lerVariacoes([null, undefined, 42, 'Oi!'])).toEqual(['42', 'Oi!']);
  });
});
