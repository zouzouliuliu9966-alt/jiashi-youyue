-- 2026-08-07　平台不再从课时费抽成，把列默认值从 0.08 改成 0
--
-- 背景：招募页 app/laoshi/page.tsx 四处承诺「平台不从课时费里抽点」，
-- 但结算 app/api/admin/lessons/[id]/route.ts 一直按 platform_rate 实扣 8%，
-- 老师在教师端账单页看得见。所有者决策：以文案为准，去掉抽成。
--
-- 代码侧已经在建单时显式写 platform_rate = 0，所以走 /api/admin/lessons 建的单
-- 不受这个默认值影响。这条 SQL 是兜底：防止以后有人绕过 API 直接在
-- Supabase 后台手工插行，又悄悄吃到 0.08。
--
-- 幂等，可以重复执行。执行地点：Supabase 后台 → SQL Editor。

alter table lesson_orders alter column platform_rate set default 0;

-- 顺手把存量未结算订单的抽成比例归零。
-- 2026-08-07 执行时 lesson_orders 是 0 行，这句不会影响任何数据；
-- 留着是为了以后重放这个脚本时也能对齐。
-- 已结算的订单不动：platform_fee / settle_amount 是历史账实，改了对不上账。
update lesson_orders set platform_rate = 0 where settled = false and platform_rate <> 0;

-- 验证：应该返回 0
select column_default from information_schema.columns
where table_name = 'lesson_orders' and column_name = 'platform_rate';
