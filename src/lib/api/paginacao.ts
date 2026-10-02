export const LIMITE_PADRAO = 50;
export const LIMITE_MAXIMO = 200;

/**
 * Limite pedido pelo cliente, contido dentro do que o serviço aguenta.
 *
 * O teto existe porque quem consome é agente de IA: pedir "todos os contatos"
 * é o comportamento natural dele, e uma base de dezenas de milhares numa
 * resposta só estoura memória do lado do servidor e contexto do lado do
 * agente. Cortar é melhor do que falhar.
 */
export function limiteDaBusca(valor: string | null): number {
  if (valor === null) return LIMITE_PADRAO;

  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 1) return LIMITE_PADRAO;
  return Math.min(numero, LIMITE_MAXIMO);
}
