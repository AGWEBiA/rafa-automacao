'use client';

import { useState } from 'react';

/**
 * As variações da mensagem, uma por caixa.
 *
 * Antes era uma caixa só, e **linha em branco separava variações**. A regra
 * existia por um motivo bom — a regra anterior a ela, "uma variação por
 * linha", fez alguém receber só "Oiiiii!" de uma DM de três linhas — mas
 * cobrava um preço alto no uso diário: não dava para separar parágrafos dentro
 * da mensagem, que é como se escreve uma DM que a pessoa lê até o fim.
 *
 * Agora cada variação tem a sua caixa. A linha em branco volta a ser só uma
 * linha em branco, o sorteio continua existindo para quem quiser, e a regra
 * deixa de ser invisível: ela virou um botão.
 *
 * As caixas compartilham o mesmo `name`, então o formulário envia todas e o
 * servidor lê com `getAll`. Caixa vazia é descartada lá, o que também resolve
 * o caso de alguém acrescentar uma e desistir.
 */
export function CamposDeVariacoes({
  name,
  defaultValues,
  rows = 4,
  className,
  rotuloDeAdicionar = 'Adicionar variação',
}: {
  name: string;
  defaultValues: readonly string[];
  rows?: number;
  className: string;
  rotuloDeAdicionar?: string;
}) {
  const [variacoes, setVariacoes] = useState<string[]>(
    defaultValues.length > 0 ? [...defaultValues] : [''],
  );

  const mudar = (indice: number, valor: string) => {
    setVariacoes((atual) => atual.map((v, i) => (i === indice ? valor : v)));
  };

  const remover = (indice: number) => {
    // Nunca ficar sem caixa nenhuma: sem campo na tela, não há onde escrever.
    setVariacoes((atual) => (atual.length <= 1 ? [''] : atual.filter((_, i) => i !== indice)));
  };

  const escritas = variacoes.filter((v) => v.trim().length > 0).length;

  return (
    <div>
      <div className="grid gap-2">
        {variacoes.map((valor, indice) => (
          <div key={indice} className="flex items-start gap-2">
            <textarea
              name={name}
              rows={rows}
              value={valor}
              onChange={(evento) => mudar(indice, evento.target.value)}
              className={`${className} flex-1`}
            />
            {variacoes.length > 1 && (
              <button
                type="button"
                onClick={() => remover(indice)}
                aria-label={`Remover variação ${indice + 1}`}
                className="mt-1 rounded-lg border border-linha-forte px-2 py-1 text-sm text-tinta-media hover:border-tinta"
              >
                remover
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setVariacoes((atual) => [...atual, ''])}
          className="rounded-lg border border-linha-forte px-3 py-1.5 text-sm font-medium hover:border-tinta"
        >
          + {rotuloDeAdicionar}
        </button>
        <span className="text-xs text-tinta-fraca">
          {escritas <= 1
            ? 'Uma mensagem. Acrescente outra versão para o sistema sortear a cada disparo.'
            : `${escritas} versões — o sistema sorteia uma a cada disparo.`}
        </span>
      </div>
    </div>
  );
}
