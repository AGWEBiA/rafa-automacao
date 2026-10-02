-- Credenciais de API, separadas do cookie do painel.
--
-- O painel usa uma senha só, num cookie de sessão. Isso serve para uma pessoa
-- num navegador e não serve para mais nada: não dá para revogar uma
-- integração sem derrubar todo mundo, não dá para dar acesso de leitura sem
-- dar o de escrita, e não dá para saber qual integração fez o quê.
--
-- O MCP e a API pública precisam de credencial própria. É esta.

create table if not exists api_keys (
  id          bigserial primary key,
  account_id  int not null references accounts(id) on delete cascade,

  -- Para a pessoa saber qual é qual na hora de revogar.
  nome        text not null,

  -- A parte pública da chave, que identifica qual linha consultar. Fica em
  -- claro de propósito: sem ela, verificar uma chave exigiria comparar o hash
  -- contra TODAS as linhas.
  prefixo     text not null unique,

  -- SHA-256 do segredo. O segredo em si nunca é guardado: quem vazar este
  -- banco não consegue usar as chaves, e quem perder a chave gera outra em
  -- vez de recuperá-la.
  hash        text not null,

  -- 'leitura' e/ou 'escrita'. Separados porque o MCP começa só lendo, e dar
  -- escrita a um agente de IA é decisão explícita, não padrão.
  escopos     text[] not null default '{leitura}',

  criado_em     timestamptz not null default now(),
  ultimo_uso_em timestamptz,

  -- Revogar é marcar, não apagar: a linha continua explicando o que aquela
  -- chave fez enquanto valia.
  revogada_em   timestamptz
);

create index if not exists api_keys_conta_idx on api_keys (account_id, criado_em desc);
