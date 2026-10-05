/**
 * Como um campo de texto vira variações de mensagem.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Isto existe por causa de um defeito que aconteceu com gente de verdade.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * A regra antiga era **uma variação por linha**. Alguém escreveu uma DM
 * normal, de três linhas:
 *
 *     Oiiiii!
 *     Aqui é a Amanda. Você comentou no meu post.
 *     É só clicar no botão abaixo para saber mais.
 *
 * O sistema guardou isso como **três variações** e, a cada disparo, sorteou
 * uma. Quem comentou recebeu só "Oiiiii!" e um botão. A pessoa seguinte
 * receberia só "Aqui é a Amanda…", sem contexto nenhum.
 *
 * Nada falhou: nenhum erro, nenhum log, a automação "funcionou". O rótulo
 * dizia "uma variação por linha" e o código cumpriu o rótulo à risca.
 *
 * O erro foi de desenho, e é sempre o mesmo: **a quebra de linha é o
 * caractere mais natural do mundo dentro de uma mensagem.** Usá-la como
 * separador entre mensagens obriga a pessoa a lembrar de uma regra
 * justamente quando está fazendo a coisa mais óbvia possível.
 *
 * A regra passou a ser **linha em branco separa variações**. Uma mensagem de
 * três linhas continua sendo uma mensagem de três linhas — que é o que
 * qualquer pessoa espera ao apertar Enter.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * A regra da linha em branco durou até outubro de 2026, e caiu pelo mesmo
 * motivo da anterior: **ela roubava um caractere que a mensagem precisa.**
 * Sem linha em branco não dá para separar parágrafos, e DM sem parágrafo é DM
 * que ninguém lê até o fim.
 *
 * Agora cada variação tem a sua caixa no editor, e o formulário manda todas
 * com o mesmo nome. Não existe mais separador escondido dentro do texto: a
 * regra virou um botão, que é onde regra de interface deveria morar.
 */

/**
 * As variações que vieram do formulário, uma por campo.
 *
 * Campo vazio é descartado — é o caso de quem acrescentou uma caixa e
 * desistiu. O texto de dentro é preservado inteiro, com as quebras e as
 * linhas em branco que a pessoa escreveu; só sobra espaço das pontas.
 */
export function lerVariacoes(valores: readonly unknown[]): string[] {
  return valores
    .map((valor) =>
      String(valor ?? '')
        // \r\n das caixas de texto no Windows: normalizar aqui evita que a
        // mesma mensagem fique diferente conforme o sistema de quem escreveu.
        .replace(/\r\n?/g, '\n')
        .trim(),
    )
    .filter((texto) => texto.length > 0);
}
