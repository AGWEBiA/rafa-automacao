import { ROTULOS_DOS_ESCOPOS } from '@/lib/api/rotulos';
import { IconeChave } from '@/lib/painel/icones';
import { Cartao, Chip, TituloDaTela, Vazio } from '@/lib/painel/ui';
import { getFirstAccount } from '@/lib/repo/accounts';
import { listarChaves } from '@/lib/repo/api-keys';
import { BotaoRevogar, CriarChave } from './criar-chave';
import { dataHora } from '@/lib/painel/datas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function dataPtBr(data: Date): string {
  return dataHora(data);
}

function rotuloDoEscopo(escopo: string): string {
  if (escopo === 'leitura' || escopo === 'escrita') {
    const rotulo = ROTULOS_DOS_ESCOPOS[escopo];
    return `${rotulo.nome} — ${rotulo.descricao}`;
  }
  return escopo;
}

export default async function ChavesPage() {
  const account = await getFirstAccount();
  const chaves = account ? await listarChaves(account.id) : [];

  return (
    <div>
      <TituloDaTela
        titulo="Chaves de API"
        pergunta="Quais integrações podem acessar sua Plataforma, e o que cada uma pode fazer."
        icone={<IconeChave className="h-5 w-5" />}
      />

      <CriarChave temConta={account !== null} />

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Chaves existentes</h2>

        {chaves.length === 0 ? (
          <div className="mt-3">
            <Vazio>
              Você ainda não criou nenhuma chave. Crie uma para conectar um
              agente de IA ou outra integração.
            </Vazio>
          </div>
        ) : (
          <Cartao className="mt-3">
          <ul className="divide-y divide-linha">
            {chaves.map((chave) => {
              const revogada = chave.revogadaEm !== null;
              return (
                <li key={chave.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{chave.nome}</span>
                    <code className="rounded bg-frio-tenue px-2 py-0.5 text-xs">
                      mc_{chave.prefixo}_…
                    </code>
                    <Chip
                      cor={
                        revogada
                          ? 'bg-frio-tenue text-tinta-media'
                          : 'bg-subindo-tenue text-subindo-forte'
                      }
                    >
                      {revogada ? 'Revogada' : 'Ativa'}
                    </Chip>
                  </div>

                  <ul className="mt-2 space-y-1 text-sm text-tinta-media">
                    {chave.escopos.map((escopo) => (
                      <li key={escopo}>{rotuloDoEscopo(escopo)}</li>
                    ))}
                  </ul>

                  <dl className="mt-3 grid gap-1 text-xs text-tinta-fraca sm:grid-cols-3">
                    <div>
                      <dt className="inline">Criada: </dt>
                      <dd className="inline">{dataPtBr(chave.criadoEm)}</dd>
                    </div>
                    <div>
                      <dt className="inline">Último uso: </dt>
                      <dd className="inline">
                        {chave.ultimoUsoEm
                          ? dataPtBr(chave.ultimoUsoEm)
                          : 'Nunca usada'}
                      </dd>
                    </div>
                    {chave.revogadaEm && (
                      <div>
                        <dt className="inline">Revogada: </dt>
                        <dd className="inline">{dataPtBr(chave.revogadaEm)}</dd>
                      </div>
                    )}
                  </dl>

                  <BotaoRevogar id={chave.id} desabilitado={revogada} />
                </li>
              );
            })}
          </ul>
          </Cartao>
        )}
      </section>
    </div>
  );
}

