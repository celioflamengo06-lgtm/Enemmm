-- Tabela de leads (CPFs consultados)
create table if not exists leads (
  id          bigserial primary key,
  cpf         text unique not null,
  nome        text,
  nascimento  text,
  created_at  timestamptz default now()
);

-- Tabela de pagamentos PIX gerados
create table if not exists pagamentos (
  id           bigserial primary key,
  gotham_id    text,
  nome         text,
  cpf          text,
  valor        numeric(10,2),
  status       text,
  qr_code_text text,
  expires_at   text,
  created_at   timestamptz default now()
);
