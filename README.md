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
app/admin/          后台：看板/预约/老师/课时/密码重置
app/api/            所有 Supabase 调用（前端绝不能直连 Supabase）
lib/                状态机、鉴权、限流、通知等公共逻辑
supabase/           建表 SQL（手动去 Supabase SQL Editor 执行）
```

## 上线

```bash
npm run build          # 必须先本地 build 通过
git push origin main   # Vercel 自动部署，约 30 秒
```

上线后要真机验证，用户 100% 在手机上，用 390×844 看效果。
