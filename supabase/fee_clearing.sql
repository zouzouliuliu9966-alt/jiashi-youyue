-- 信息费核销台账（2026-09-03）
--
-- 背景：老师先付信息费拿到家长联系方式，但这笔钱要等这一单真的开课了才算数；
-- 不成单就退给老师。对老师的承诺是「不成单，秒退」。
--
-- 🔴 说清楚这套东西不是什么：
--    收款走的是个人收款码，钱在老师扫码那一秒就已经到账了，没有任何冻结能力。
--    所以「待核销」只是**账面状态**，不是资金托管。
--    对外措辞只能说「不成单秒退」，绝不能说「托管」或「先不扣款」——
--    老师一看到账通知就知道是假的。
--
-- ✅ 已于 2026-09-03 在线上执行完毕（走东京 pooler 直连，连法见 HANDOFF.md）。
-- 执行后已校验：四个列都在、两条 CHECK 都在，并真插脏数据验证过约束确实拦得住。

alter table public.matches
  add column if not exists fee_status text,
  add column if not exists fee_cleared_at timestamptz,
  add column if not exists fee_refunded_at timestamptz,
  add column if not exists fee_note text;

-- 取值：
--   null       —— 还没确认收款（payment_confirmed = false）
--   'pending'  —— 已确认收款，待核销
--   'cleared'  —— 已核销（这一单确实开课了，钱算平台的）
--   'refunded' —— 已退款（不成单，已退回老师）
alter table public.matches
  drop constraint if exists matches_fee_status_check;
alter table public.matches
  add constraint matches_fee_status_check
  check (fee_status is null or fee_status in ('pending', 'cleared', 'refunded'));

comment on column public.matches.fee_status is
  '信息费核销状态：null=未确认收款 / pending=待核销 / cleared=已核销 / refunded=已退款';
comment on column public.matches.fee_note is
  '退款或核销时教务填的说明，例如「家长临时取消，已微信转回」';

-- 跨字段约束：没确认收款就不该有核销状态。
-- 只校验枚举值不够 —— payment_confirmed=false 却带着 'pending' 的脏数据，
-- 会让一笔根本没收到的钱被「核销」或「退」出去。
alter table public.matches
  drop constraint if exists matches_fee_requires_payment_check;
alter table public.matches
  add constraint matches_fee_requires_payment_check
  check (fee_status is null or payment_confirmed = true);

-- 存量：已确认收款但还没有核销状态的，一律先置为待核销，别让它们凭空消失
update public.matches
  set fee_status = 'pending'
  where payment_confirmed = true and fee_status is null;

-- 校验：执行后应返回 4 行
-- select column_name, data_type from information_schema.columns
--   where table_schema='public' and table_name='matches'
--     and column_name in ('fee_status','fee_cleared_at','fee_refunded_at','fee_note');
