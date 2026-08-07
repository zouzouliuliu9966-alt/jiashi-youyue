# 家师有约 — 接手说明

南京家教师资匹配平台，已上线运营。这份文档是给接手继续开发的人看的，先看完再动手。

---

## 1. 线上地址

| 面向 | 网址 | 说明 |
|---|---|---|
| 家长 | https://jiashiyouyue.com | 浏览老师、筛选、提交预约 |
| 老师 | https://teacher.jiashiyouyue.com | 招募页；注册/登录后进教师端 |
| 后台 | https://jiashiyouyue.com/admin/login | 密码问项目所有者要 |

## 2. 技术栈

- **Next.js（App Router）+ TypeScript + Tailwind CSS**
- **Supabase**（Postgres + Auth + Storage）
- 部署在 **Vercel**，已连 GitHub，push 到 `main` 自动部署

## 3. 本地跑起来

```bash
npm install
# 找项目所有者要 .env.local，放到根目录（这个文件不在 git 里，也不要提交）
npm run dev            # http://localhost:3000
```

`.env.local` 需要这些变量：

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # 服务端专用，绝不能出现在客户端组件里
ADMIN_PASSWORD=                # 后台密码
CRON_SECRET=                   # 保护定时任务接口，可选但建议配
WECOM_WEBHOOK_URL=             # 企业微信群机器人，可选，不配就不推通知
```

---

## 4. 三条铁律（不遵守线上会挂）

### 4.1 前端绝对不能直接调 Supabase

`supabase.co` 在国内网络（包括微信/QQ 内置浏览器）**完全访问不了**。所有 Supabase 调用必须走 `app/api/**` 的服务端路由中转，浏览器只能请求自己域名下的 `/api/*`。

看到 `import { supabase } from '@/lib/supabase'` 出现在客户端组件里，就是 bug。

### 4.2 敏感字段一律走白名单，不许 `select('*')`

这个项目靠信息差赚钱，字段吐错了直接亏钱：

- **家长联系方式**是平台的收费点。老师必须接单 + 付信息费 + 后台确认收款，才能拿到家长手机号和微信。`app/api/teacher/profile/route.ts` 里在服务端把未付费订单的 `phone`/`wechat` 置空了——**只在前端隐藏没用**，老师按 F12 看接口返回就全拿到了。
- **平台抽成**（`settle_amount` / `platform_fee` / `platform_rate`）和后台内部备注 `notes`，不能下发给家长。
- `/api/teachers` 是**公开接口**，任何人不登录就能调，只能返回展示用的字段，不能带 `email` / `phone`。

**枚举值的条件判断一律正向列举，别写 `!==`。** 2026-08-07 给 `teaching_mode` 加「网课」时踩到：`TeacherCard.tsx` 原本写 `teaching_mode !== '工作室'` 就显示「上门范围」，加了网课以后纯网课老师被这个反向条件归进"要显示上门范围"那一类。反向条件在枚举只有两三个值时看着没问题，每加一个新值就悄悄归错一次。

### 4.3 课时状态只能用 `lib/lesson-status.ts` 里的值

数据库有 CHECK 约束，只认这五个：

```
pending → teacher_done → confirmed / auto_confirmed / cancelled
```

**别自己写字符串。** 之前代码里一路写死 `'completed'`，数据库根本不认，导致「老师标记完课」被拒、整条结算链路断了三个月都没人发现。

状态流转的写库操作都带了前置条件（`.eq('lesson_status', 'pending')` 这种），是为了防并发重复操作，改的时候别删掉。

---

## 5. 目录结构

```
app/
  page.tsx                 家长端首页（老师列表 + 筛选 + 预约）
  rules/                   家长须知
  my-lessons/              家长按手机号查课时、确认完课
  laoshi/                  教师招募页（teacher 子域根路径重写到这里）
  teacher/                 教师端：登录/注册/资料/课时/改密码/老师须知
    layout.tsx             教师端 metadata（覆盖根 layout 那套面向家长的标题/分享卡片）
                           默认 noindex；公开入口在自己的 layout 里显式开 index
                           注意 metadata 在路由段之间是**浅合并**，写 openGraph 要写全
  admin/                   后台：预约/老师/课时/密码重置
  api/                     所有 Supabase 调用都在这里
lib/
  supabase.ts              匿名客户端
  supabase-admin.ts        service_role 客户端（只能服务端用）
  auth-helpers.ts          requireAdmin / requireTeacher
  admin-password.ts        后台密码校验（常量时间比较）
  lesson-status.ts         课时状态机
  rate-limit.ts            进程内限流
  notify.ts                企业微信通知
  types.ts                 数据类型
components/
  TeacherCard.tsx  BookingModal.tsx  FAQAccordion.tsx
supabase/                  建表 SQL，手动去 Supabase SQL Editor 执行
```

改动历史见 `LOG.md`。

## 6. 数据表

| 表 | 用途 |
|---|---|
| `teachers` | 老师资料。`tier` 档位 1/2/3，`is_visible` 控制是否在家长端展示 |
| `bookings` | 家长提交的需求，含 `phone` / `wechat` |
| `matches` | 老师↔需求的匹配，`payment_confirmed` 表示信息费已到账 |
| `lesson_orders` | 课时订单，走 4.3 的状态机 |
| ~~`teacher_reviews`~~ | 评价表，**只有设计稿 `supabase/teacher_reviews.sql`，未执行未启用**，见第 8 节待办 6 |

改表结构要去 Supabase 后台的 SQL Editor 手动执行 SQL，REST API 改不了。

## 7. 鉴权方式

- **后台**：请求头 `x-admin-password`，服务端跟 `ADMIN_PASSWORD` 比对
- **教师端**：Supabase Auth token 放 `Authorization: Bearer`，服务端 `requireTeacher` 校验 token 对应的老师就是本人
- **家长端**：没有账号体系，只用手机号识别（**这是项目所有者明确决定保持的设计，别自作主张改，见下面第 8 条**）

---

## 8. 还没做的 / 值得继续做的

按优先级排：

### 已知并接受的设计（不要改）

**家长端只用手机号做凭证。** `/api/parent/lessons?phone=xxx` 和确认完课接口，知道手机号就能查订单、替家长确认完课。已接过单的老师手里就有家长手机号，理论上能自己确认自己的课，绕过「家长确认」这一步。

项目所有者已知晓并决定保持现状：目前老师只有 2 位且都认识，风险可控，加短信验证码的成本（国内短信服务要企业营业执照）不划算。

**等老师数量多到所有者记不住名字时再回头处理**，届时方案是给每个订单生成随机码专属链接（零成本、不需要资质），而不是短信验证码。在那之前不要动这块。

### 已完成（2026-07-29 这批）

- 限流：`lib/rate-limit.ts`，后台登录 5 次/10 分、老师登录 10 次/10 分、注册和忘记密码 5 次/时、家长手机号查询 20 次/10 分、提交预约 5 次/时
- 超时自动确认：`/api/cron/auto-confirm` + `vercel.json`，每天 UTC 2 点跑，把老师标完课超过 7 天仍未被家长确认的订单置为 `auto_confirmed`。接口靠 `CRON_SECRET` 保护
- 分页：后台课时管理每页 20 条（分页信息在响应头 `x-total-count`），教师端「我的课时」用加载更多
- 老师须知正文移到 `/api/teacher/rules`，服务端校验 token 才返回，不再进公开 bundle
- 头像上传限 5MB，只收 jpg/png/webp/gif/heic，扩展名从 MIME 取而不是文件名
- 后台数据看板 `/admin`：本月预约数/流水/平台收入 + 三类待办计数，登录后默认落这页
- 通知：`lib/notify.ts` 推企业微信群机器人，覆盖家长预约、老师接单付费、新老师注册
- 教师端资料完成度提示

### 待办

1. **✅ 已解决（2026-08-07）：招募页承诺和结算实现的矛盾**
   所有者决策**以文案为准，去掉 8% 抽成**。平台只收接单信息费这一道。详见 `LOG.md` 2026-08-07。
   `supabase/platform_rate_default_0.sql` **已于 2026-08-07 在 Supabase SQL Editor 执行完毕**，`lesson_orders.platform_rate` 的列默认值已从 0.08 改成 0（执行前后都查了 `information_schema`，并实测绕过 API 直接插行拿到的是 0）。

   ⚠️ **平台收入现在没有任何地方记账。** 抽成去掉后，唯一被记录金额的收入来源没了；信息费是真正的收入，但 `matches` 表只有 `payment_confirmed` 布尔，**不存金额**。后台看板「本月课时费抽成」从此恒为 0。要看清平台到底赚了多少，得给 `matches` 加一个金额列 + 后台确认收款时填数 + 看板改成统计信息费。**有第一笔真实收入之前不用急着做。**

2. **🔴 存量老师资料里有违反《广告法》的文案（需所有者手动改，代码改不掉）**
   线上两位可见老师的 `highlight` 都是效果承诺式写法：「多名学生中考语文120+」「连续6年带中考生，将他们的语文成绩提升20+，并且有几个学生是语文年级第一」；`bio` 里还有「所带学生有29中，钟英中学、南外、玄外、九中等名校学生」。
   《广告法》24 条禁止教育培训广告对升学、考试成绩作明示或暗示的保证性承诺，名校生源暗示同样是风险点。**这些字正在家长端展示。**
   代码侧已经把 placeholder 和提示改成资历式写法防新增，但**存量数据只能去后台或教师端手动改**。
   改写方向：把「送学生提升 20 分」换成「带过三届初三毕业班，擅长文言文和作文批改」这类讲资历和擅长领域的写法。

3. **正式宣传前清空演示数据：跑 `scripts/reset-demo-data.mjs`**
   ```bash
   node scripts/reset-demo-data.mjs             # 演练，只看会删什么
   node scripts/reset-demo-data.mjs --execute   # 真删（还要手输 yes）
   ```
   会清 5 张业务表 + `avatars` 头像 + Supabase Auth 教师账号，跑前自动全量备份到 `.backups/`（已 gitignore，里面有手机号邮箱，别提交）。表结构、RLS、`ADMIN_PASSWORD` 都不动。

4. **🟠 现存两个孤儿 Auth 账号（会让真老师注册卡死）**
   `test_teacher_0509@example.com` 和 `13800005090@phone.jiashiyouyue.cn` 在 Auth 里存在，但 `teachers` 表没有对应行。谁拿 `13800005090` 来注册，会被告知「该手机号已注册」，登录后又查不到教师信息，卡在中间态——正是 `app/api/teacher/register/route.ts` 的回滚逻辑要防的情况，但这两个是修那段逻辑之前留下的。
   清掉即可（`reset-demo-data.mjs` 会一并清，也可以单独去 Supabase → Authentication → Users 删）。

5. **数据现状的两个坑（2026-08-07 查到）**
   - **「培培老师」的 `email` 是 null**，而 `/api/auth/login` 按 email 查 `teachers`，null 永远匹配不上——**这条记录没人能登录进去管理**，只能从后台改。它却是 `is_visible=true` 在家长端展示。
   - **3 位老师的 `phone` 全是 null**。07-29 加了 phone 列并修好了注册丢手机号的 bug，但存量老师没回填，真要联系她们手上没号码。
   两条都会随正式宣传前的清空一起消失，在那之前知道就行。

6. **评价系统：设计好了但决定暂不上线**
   完整建表 SQL 在 `supabase/teacher_reviews.sql`（**未执行、未启用**）。暂缓的三条理由见 `LOG.md` 2026-08-01。
   **四个条件同时满足才做**：≥15 位真实第三方老师 / 每位老师 ≥5 条已完课订单 / 月订单稳定 20+ / 家长端凭证改成一订单一随机码（且随机码不能出现在任何老师端接口返回里）。
   **上线前必须先做的前置改动**：`components/TeacherCard.tsx` 的档位标签现在是 ⭐基础档/⭐⭐进阶档/⭐⭐⭐精英档，评分星星一上就撞车，要先换成文字或色块。
   替代方案（该做但还没做）：私密回访（家长确认完课后弹满意度，只进后台+推企微，不公开不算分）+ 老师卡片放客观计数（已完成 N 节课 / 服务 N 个家庭）。

7. **企业微信 webhook**
   ✅ 已配好（`WECOM_WEBHOOK_URL`），2026-07-30 走完整链路验证过。
   注意：新版企业微信把「群机器人」叫「消息推送」，且机器人不作为群成员出现。
   **消息内容里不要用 `*` 打码**，会被 Markdown 当加粗标记吃掉。

8. **限流是进程内的，不跨实例**
   Vercel 多实例各算各的，所以实际配额是「配置值 × 实例数」。挡脚本够用，要精确得上 Redis（Upstash 之类）。

9. **课时列表的分页没做筛选条件持久化**
   切 tab 会回到第 1 页，这是有意为之；但如果以后加了搜索，要注意别把 page 带串了。

10. 老师端「家长需求」列表也没分页，目前量小没做。

---

## 9. 改完怎么上线

```bash
npm run build     # 必须先本地 build 通过
git push origin main   # Vercel 自动部署，约 30 秒
```

**上线后一定要真机验证**，不要只看 build 成功。这个项目的用户 100% 在手机上，用手机尺寸（390×844）看效果。

涉及课时状态的改动，要把完整链路跑一遍：后台建单 → 确认收款 → 老师标完课 → 家长确认 → 结算，并检查结算金额（**平台不抽课时费，`settle_amount` 应等于单价，`platform_fee` 应为 0**）。
