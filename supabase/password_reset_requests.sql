-- 教师忘记密码申请表
-- 教师端提交申请 → 管理员后台手动重置密码

create table if not exists password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references teachers(id) on delete cascade,
  contact text not null,
  contact_type text not null check (contact_type in ('phone', 'email')),
  status text not null default 'pending' check (status in ('pending', 'done', 'rejected')),
  note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_password_reset_requests_status_created
  on password_reset_requests (status, created_at desc);
