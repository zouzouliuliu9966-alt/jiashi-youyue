-- 家长给老师的评价
--
-- 防刷的核心思路：评价必须挂在一条「已付款 + 已完课确认」的 lesson_orders 上。
-- 订单只有后台能建（/api/admin/lessons POST 要 x-admin-password），
-- 所以评价总量被真实订单数物理封顶 —— 光知道手机号也刷不出评价来。
--
-- 一个家长对一个老师只留一条评价（unique teacher_id + parent_phone），
-- 后续再上课只能更新这条，不能新增。否则一个上了 20 节课的家长
-- 能发 20 条评价，均分和评论区都会被单个家长带偏。

create table if not exists teacher_reviews (
  id uuid primary key default gen_random_uuid(),

  -- 资格凭证：证明这个家长确实上过这个老师的课。
  -- 订单被后台删掉时评价一起删（均分由触发器重算）
  lesson_id uuid not null references lesson_orders(id) on delete cascade,

  -- 从订单里抄过来，省掉公开列表的 join。
  -- 服务端写入时必须从 lesson_orders 读，绝不能信客户端传的 teacher_id
  teacher_id uuid not null references teachers(id) on delete cascade,
  parent_phone text not null,
  parent_name text,

  -- 星级：总体评分，1-5 星，必填
  rating smallint not null check (rating between 1 and 5),

  -- 分项打分，1-5，可不填。不参与均分计算，只在详情里展示
  score_effect smallint check (score_effect between 1 and 5),      -- 教学效果
  score_attitude smallint check (score_attitude between 1 and 5),  -- 责任心
  score_punctual smallint check (score_punctual between 1 and 5),  -- 守时守约

  content text check (content is null or char_length(content) <= 500),
  is_anonymous boolean not null default false,

  -- 差评必须说明理由：既提高评价质量，也抬高恶意差评的成本。
  -- 不想要这条规则就把下面这行删掉
  constraint teacher_reviews_low_rating_needs_reason
    check (rating >= 4 or (content is not null and char_length(content) >= 10)),

  -- 审核状态。取值必须和 lib/review-status.ts 保持一致（同 lesson_status 的规矩）。
  -- 想改成「先审后发」，把 default 改成 'pending' 并把 'pending' 加进 check
  status text not null default 'published'
    check (status in ('published', 'hidden')),

  -- 老师回复
  teacher_reply text check (teacher_reply is null or char_length(teacher_reply) <= 300),
  teacher_replied_at timestamptz,

  -- 后台内部字段。跟 lesson_orders.notes 一样，绝不下发给家长端和老师端。
  -- submit_ip 用来事后甄别「老师拿家长手机号给自己刷五星」
  admin_note text,
  submit_ip text,

  created_at timestamptz not null default now(),
  edited_at timestamptz,
  edit_count smallint not null default 0,

  -- 一个家长对一个老师只有一条评价
  constraint teacher_reviews_teacher_parent_unique unique (teacher_id, parent_phone)
);

-- 公开评价列表：按老师查已发布的，按时间倒序
create index if not exists idx_teacher_reviews_teacher_status
  on teacher_reviews (teacher_id, status, created_at desc);

-- 家长在「我的课时」里回显自己写过的评价
create index if not exists idx_teacher_reviews_parent_phone
  on teacher_reviews (parent_phone);

-- 后台按订单反查
create index if not exists idx_teacher_reviews_lesson
  on teacher_reviews (lesson_id);


-- ============================================================
-- 老师表加冗余的评分字段
-- /api/teachers 是公开接口、首页每次打开都调，不能为了算均分再去扫评价表
-- ============================================================

alter table teachers
  add column if not exists rating_avg numeric(3,2),
  add column if not exists rating_count integer not null default 0;

-- 按评分排序用（tier 是主排序，rating 是次排序）
create index if not exists idx_teachers_visible_rating
  on teachers (is_visible, tier desc, rating_avg desc nulls last);


-- ============================================================
-- 触发器维护均分
-- 不要在 API 里「读出来算完再写回」：两条评价同时进来会互相覆盖，
-- 而且订单被删触发 cascade 时应用层根本收不到通知
-- ============================================================

create or replace function refresh_teacher_rating() returns trigger
language plpgsql as $$
declare
  t uuid := coalesce(new.teacher_id, old.teacher_id);
begin
  update teachers set
    rating_avg = sub.avg_rating,
    rating_count = sub.cnt
  from (
    select round(avg(rating)::numeric, 2) as avg_rating, count(*) as cnt
    from teacher_reviews
    where teacher_id = t and status = 'published'
  ) sub
  where teachers.id = t;
  return null;
end;
$$;

drop trigger if exists trg_teacher_reviews_rating on teacher_reviews;
create trigger trg_teacher_reviews_rating
  after insert or update or delete on teacher_reviews
  for each row execute function refresh_teacher_rating();


-- ============================================================
-- 对账 / 修数：怀疑冗余字段跟评价表对不上时跑这两段
-- ============================================================

-- 只读核对
create or replace view teacher_rating_stats as
select
  t.id as teacher_id,
  t.name,
  t.rating_avg as stored_avg,
  t.rating_count as stored_count,
  round(avg(r.rating)::numeric, 2) as real_avg,
  count(r.id) as real_count,
  count(r.id) filter (where r.rating <= 2) as low_count
from teachers t
left join teacher_reviews r on r.teacher_id = t.id and r.status = 'published'
group by t.id, t.name, t.rating_avg, t.rating_count;

-- 全量重算（历史数据补齐、或者对不上时手工执行）
-- update teachers t set
--   rating_avg = s.real_avg,
--   rating_count = s.real_count
-- from (
--   select tt.id, round(avg(r.rating)::numeric, 2) as real_avg, count(r.id) as real_count
--   from teachers tt
--   left join teacher_reviews r on r.teacher_id = tt.id and r.status = 'published'
--   group by tt.id
-- ) s
-- where t.id = s.id;
