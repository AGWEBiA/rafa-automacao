// Compartilhado com o formulário do navegador, sem dependências do servidor.
export const ESCOPOS = ['leitura', 'escrita'] as const;
export type Escopo = (typeof ESCOPOS)[number];
