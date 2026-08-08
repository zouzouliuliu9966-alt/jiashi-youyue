-- 家师有约 完整表结构
--
-- 2026-08-08 从线上库反推导出（此前仓库里只有 password_reset_requests 和未启用的
-- teacher_reviews，四张主表的 DDL 一直不在版本库里，接手的人没法从零搭环境）。
--
-- 用途：新建 Supabase 项目后，在 SQL Editor 里整份执行一次，就能得到和线上一致的表结构。
-- 幂等（都是 if not exists），可以重复跑。
--
-- ⚠️ 这份只覆盖表/列/约束/索引。**不含 RLS 策略和 Storage bucket**：
--    - 本项目所有数据库访问都走服务端 service_role（见 HANDOFF 铁律 4.1），
--      不依赖 RLS 做权限，所以线上也没配策略。
--    - 头像存在 Storage 的 `avatars` bucket，要在 Dashboard → Storage 手动建（public）。

-- ---------------------------------------------------------------- teachers
-- 老师资料。被其它四张表引用，建表要放最前、删数据要放最后。
create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text,
  tier integer default 1,                 -- 档位 1/2/3，影响家长端展示顺序
  teacher_type text,                      -- 在校教师 / 专职辅导 / 独立工作室 / 应届毕业生
  subjects text[],
  grades text[],
  highlight text,                         -- 一句话亮点，直接展示给家长（注意《广告法》，别写提分承诺）
  bio text,
  teaching_mode text,                     -- 上门 / 工作室 / 网课 / 均可（无 CHECK 约束，加新值不用改表）
  service_areas text,                     -- 上门范围
  studio_address text,
  available_time text,
  price text,
  years_exp integer,
  is_visible boolean default true,        -- 控制是否在家长端展示
  email text unique,                      -- 登录账号。手机号注册的是 {phone}@phone.jiashiyouyue.cn
  phone text,
  last_updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------- bookings
-- 家长提交的需求。phone/wechat 是平台的收费点，绝不能未付费下发给老师。
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references teachers(id),
  student_grade text not null,
  phone text not null,
  wechat text not null,
  student_intro text,
  available_time text,
  address text,
  course_type text default '一对一',
  status text default 'pending',
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------- matches
-- 老师↔需求的匹配。payment_confirmed = 信息费已到账。
-- 注意：这张表**不存信息费金额**，所以平台真实收入目前没有任何地方记账（见 HANDOFF 待办 1）。
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id),
  teacher_id uuid references teachers(id),
  teacher_response text default 'pending',
  payment_confirmed boolean default false,
  payment_amount text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------- lesson_orders
-- 课时订单。lesson_status 有 CHECK 约束，代码里必须用 lib/lesson-status.ts 的取值，
-- 别自己写字符串 —— 之前写死 'completed' 导致整条结算链路断了三个月（见 HANDOFF 铁律 4.3）。
create table if not exists lesson_orders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id),
  teacher_id uuid references teachers(id),
  teacher_name text,
  parent_phone text not null,
  parent_wechat text,
  parent_name text,
  student_grade text,
  subject text,
  price_per_lesson numeric not null,
  -- 平台不从课时费里抽点（招募页对老师的承诺），默认 0。
  -- 2026-08-07 从 0.08 改成 0，见 supabase/platform_rate_default_0.sql
  platform_rate numeric default 0,
  payment_status text default 'pending'
    check (payment_status in ('pending', 'paid', 'refunded')),
  payment_confirmed_at timestamptz,
  lesson_status text default 'pending'
    check (lesson_status in ('pending', 'teacher_done', 'confirmed', 'auto_confirmed', 'cancelled')),
  teacher_marked_at timestamptz,
  parent_confirmed_at timestamptz,
  settled boolean default false,
  settled_at timestamptz,
  settle_amount numeric,
  platform_fee numeric,
  notes text,                             -- 后台内部备注，绝不能下发给家长
  created_at timestamptz default now()
);

create index if not exists idx_lesson_orders_phone on lesson_orders (parent_phone);
create index if not exists idx_lesson_orders_status on lesson_orders (lesson_status);
create index if not exists idx_lesson_orders_teacher on lesson_orders (teacher_id);

-- ---------------------------------------------------------------- password_reset_requests
-- 教师忘记密码申请。teacher_id 是这堆表里唯一一个带 ON DELETE CASCADE 的外键。
create table if not exists password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references teachers(id) on delete cascade,
  contact text not null,
  contact_type text not null check (contact_type in ('phone', 'email')),
  status text not null default 'pending' check (status in ('pending', 'done', 'rejected')),
  note text,
  reset_token uuid unique,
  token_expires_at timestamptz,
  token_used_at timestamptz,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_password_reset_requests_status_created
  on password_reset_requests (status, created_at desc);
create index if not exists idx_password_reset_requests_token
  on password_reset_requests (reset_token) where reset_token is not null;

-- ---------------------------------------------------------------- 外键依赖速查
-- 删数据时按这个顺序，反着来会撞外键（除 password_reset_requests 外都没有 CASCADE）：
--   lesson_orders → matches → password_reset_requests → bookings → teachers
-- scripts/reset-demo-data.mjs 就是按这个顺序删的。
