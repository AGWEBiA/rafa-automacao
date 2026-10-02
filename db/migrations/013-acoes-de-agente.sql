create table if not exists agent_actions (
  id          bigserial primary key,
  account_id  int not null references accounts(id) on delete cascade,
  api_key_id  int not null references api_keys(id) on delete cascade,
  acao        text not null,
  alvo_tipo   text not null,
  alvo_id     int,
  detalhes    jsonb not null default '{}',
  criado_em   timestamptz not null default now()
);

create index if not exists agent_actions_conta_idx
  on agent_actions (account_id, criado_em desc);
