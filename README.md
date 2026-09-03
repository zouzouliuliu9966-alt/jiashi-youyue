# 家师有约

南京本地的家教师资匹配平台，已上线运营。

| 面向 | 网址 |
|---|---|
| 家长 | https://jiashiyouyue.com |
| 老师 | https://teacher.jiashiyouyue.com |
| 后台 | https://jiashiyouyue.com/admin |

**接手开发请先读 [HANDOFF.md](./HANDOFF.md)**，里面有三条不遵守线上会挂的铁律、数据表说明和待办清单。
改动历史看 [LOG.md](./LOG.md)。

## 技术栈

Next.js（App Router）+ TypeScript + Tailwind CSS + Supabase（Postgres/Auth/Storage），部署在 Vercel，push 到 `main` 自动部署。

## 本地跑起来

```bash
npm install
# 找项目所有者要 .env.local 放到根目录（不在 git 里，也不要提交）
npm run dev            # http://localhost:3000
```

需要的环境变量见 HANDOFF.md 第 3 节。

## 目录速查

```
app/page.tsx        家长端首页（老师列表 + 筛选 + 预约）
app/laoshi/         教师招募页（teacher 子域根路径重写到这里）
app/teacher/        教师端：登录/注册/资料/课时/须知
app/admin/          后台：看板/预约（含待核销）/老师/课时/密码重置
app/privacy/ terms/ report/   用户协议、隐私政策、投诉举报（页脚有入口）
app/robots.ts sitemap.ts      收录规则：只 Disallow /api/，其余靠页面自身 noindex
app/api/            所有 Supabase 调用（前端绝不能直连 Supabase）
lib/                状态机、鉴权、限流、通知等公共逻辑
  legal.ts          法律页共用的事实性信息（运营主体、联系方式、生效日期）
  fee-status.ts     信息费核销状态的展示口径（🔴 措辞禁令写在里面）
supabase/           SQL（去 Supabase SQL Editor 执行，或直连数据库跑，连法见 HANDOFF.md）
  schema.sql        完整表结构，新建项目整份跑一次即可复刻线上
  fee_clearing.sql  信息费核销台账，已于 2026-09-03 执行
scripts/            运维脚本
  e2e-live-check.mjs    全链路端到端自检
  reset-demo-data.mjs   正式宣传前清空演示数据
```

## 自检

改了后端逻辑，跑一遍全链路自检再上线：

```bash
E2E_BASE=http://localhost:3000 node scripts/e2e-live-check.mjs   # 先本地，不发企微
node scripts/e2e-live-check.mjs                                  # 再打线上，会真发 3 条企微
```

覆盖 14 步 39 项：注册 → 填资料 → 审核上架 → 家长预约 → 推送 → 付费前后联系方式可见性
→ 接单 → 确认收款 → 建单 → 标完课 → 家长确认 → 结算 → 公开接口字段白名单。

⚠️ 这个脚本调 `/api/bookings` 和 `/api/teacher/register` 时要带 `agreed: true`
（表单上那个「我已阅读并同意」勾选，服务端会校验）。改接口时别忘了同步它，否则自检第一步就断。
跑完自动清数据。

## 上线

```bash
npm run build          # 必须先本地 build 通过
git push origin main   # Vercel 自动部署，约 30 秒
```

上线后要真机验证，用户 100% 在手机上，用 390×844 看效果。
