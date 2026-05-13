-- 升级 password_reset_requests：从"管理员设密码"改为"管理员生成链接，老师自助改密"

alter table password_reset_requests
  add column if not exists reset_token uuid unique,
  add column if not exists token_expires_at timestamptz,
  add column if not exists token_used_at timestamptz;

create index if not exists idx_password_reset_requests_token
  on password_reset_requests (reset_token) where reset_token is not null;
