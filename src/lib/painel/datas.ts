/**
 * Data e hora como quem lê espera: no fuso de São Paulo.
 *
 * A Vercel roda em UTC, e `toLocaleString('pt-BR')` sem fuso herda o do
 * servidor. A compra da @soydaniellebarbosa, das 9h33 da manhã, aparecia no
 * painel como 12h33. Três horas em cima de "quando isso aconteceu" bastam para
 * a jornada não bater com a Hotmart, com o Instagram, nem com a memória de
 * quem estava lá.
 *
 * O fuso é fixo, e não o do navegador: o painel é de uma pessoa só, que vende
 * no Brasil, e é assim que ela lê a própria agenda. Se um dia atender fuso de
 * cliente, isto vira configuração — e continua sendo aqui.
 */
const FUSO = 'America/Sao_Paulo';

export function dataHora(valor: Date | string | number): string {
  return new Date(valor).toLocaleString('pt-BR', { timeZone: FUSO });
}

export function dataCurta(valor: Date | string | number): string {
  return new Date(valor).toLocaleDateString('pt-BR', { timeZone: FUSO });
}
