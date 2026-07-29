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

`.env.local` 需要 4 个变量：

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # 服务端专用，绝不能出现在客户端组件里
ADMIN_PASSWORD=                # 后台密码
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
  admin/                   后台：预约/老师/课时/密码重置
  api/                     所有 Supabase 调用都在这里
lib/
  supabase.ts              匿名客户端
  supabase-admin.ts        service_role 客户端（只能服务端用）
  auth-helpers.ts          requireAdmin / requireTeacher
  admin-password.ts        后台密码校验（常量时间比较）
  lesson-status.ts         课时状态机
  types.ts                 数据类型
components/
  TeacherCard.tsx  BookingModal.tsx  FAQAccordion.tsx
```

## 6. 数据表

| 表 | 用途 |
|---|---|
| `teachers` | 老师资料。`tier` 档位 1/2/3，`is_visible` 控制是否在家长端展示 |
| `bookings` | 家长提交的需求，含 `phone` / `wechat` |
| `matches` | 老师↔需求的匹配，`payment_confirmed` 表示信息费已到账 |
| `lesson_orders` | 课时订单，走 4.3 的状态机 |

改表结构要去 Supabase 后台的 SQL Editor 手动执行 SQL，REST API 改不了。

## 7. 鉴权方式

- **后台**：请求头 `x-admin-password`，服务端跟 `ADMIN_PASSWORD` 比对
- **教师端**：Supabase Auth token 放 `Authorization: Bearer`，服务端 `requireTeacher` 校验 token 对应的老师就是本人
- **家长端**：没有账号体系，只用手机号识别（**这是目前最大的安全短板，见下面第 8 条**）

---

## 8. 还没做的 / 值得继续做的

按优先级排：

### 高

1. **家长端只用手机号做凭证**
   `/api/parent/lessons?phone=xxx` 和确认完课接口，只要知道手机号就能查别人的订单、替别人确认完课。要真正解决得加短信验证码或一次性链接。这是已知的设计短板，动之前先跟项目所有者确认方案（短信要花钱）。

2. **完全没有限流**
   后台密码、老师登录、家长手机号查询都能无限次尝试。至少给这几个接口加个基础的频率限制。

3. **`auto_confirmed` 状态没有任何代码会写**
   老师标记完课后家长一直不点确认，订单就永远卡在 `teacher_done`，结算走不下去。需要一个定时任务：超过 N 天自动置为 `auto_confirmed`。

### 中

4. **教师端「我的课时」和后台课时管理没有分页**
   订单多了会一次性全拉出来。

5. **`/teacher/rules` 只在前端用 localStorage 判断登录**
   页面文案本身编译进了公开的 JS bundle，不是真防护。要真保密得改成服务端校验 token 后再返回内容。

6. **老师上传头像没有大小和类型限制**
   见 `app/api/teacher/upload-avatar/route.ts`。

7. **数据库里有历史测试账号**
   `teachers` 表里的「修复后测试」「测试老师0509」，`is_visible=false` 不影响线上，可以清掉。

### 低 / 体验优化

8. 家长预约后没有任何通知给教务，现在只能靠人工刷后台
9. 老师端资料填写没有完成度提示，很多老师注册完不知道要补资料
10. 后台没有数据看板（本月新增预约数、成交数、流水）

---

## 9. 改完怎么上线

```bash
npm run build     # 必须先本地 build 通过
git push origin main   # Vercel 自动部署，约 30 秒
```

**上线后一定要真机验证**，不要只看 build 成功。这个项目的用户 100% 在手机上，用手机尺寸（390×844）看效果。

涉及课时状态的改动，要把完整链路跑一遍：后台建单 → 确认收款 → 老师标完课 → 家长确认 → 结算，并检查结算金额（单价 × 8% 是平台抽成）。
