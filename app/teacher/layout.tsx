import type { Metadata } from 'next'

// 教师端所有页面（注册/登录/资料/课时）都是 'use client'，client component
// 不能 export metadata，只能靠这个 server layout 统一覆盖。
// 不覆盖的话它们会继承根 layout 那套**面向家长**的标题和分享卡片
// （「家师有约 — 严选南京家教」「持证教师·免费匹配·不满意可换老师」）——
// 老师把注册链接转到同行群里，卡片却在向家长打广告。
const TITLE = '教师端 — 家师有约'
const DESCRIPTION = '南京家教老师接单平台。教务帮您对接学生，课时费自己定，平台不抽课时费，接单才付费。'

export const metadata: Metadata = {
  title: {
    default: TITLE,
    template: '%s | 家师有约教师端',
  },
  description: DESCRIPTION,
  // Next.js 的 metadata 在路由段之间是**浅合并**：这里写了 openGraph，
  // 根 layout 那份就被整个替换掉，不是逐字段覆盖。所以 images/type/siteName/locale
  // 都得在这儿重新写全，漏一个就是分享卡片少一块（漏 images = 卡片没图）。
  openGraph: {
    type: 'website',
    siteName: '家师有约',
    title: TITLE,
    description: DESCRIPTION,
    locale: 'zh_CN',
    images: [
      // 微信会把卡片图裁成正方形，正文内容都收在图片中间的正方形区域内
      { url: '/og-image.png', width: 1200, height: 630, alt: '家师有约 · 南京家教老师招募' },
      { url: '/og-square.png', width: 800, height: 800, alt: '家师有约' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image.png'],
  },
  // 默认不收录：教师端绝大多数页面（资料、课时、改密码、重置密码、老师须知）
  // 都是登录后或带敏感流程的，不该进搜索结果。
  // 例外是招募漏斗的公开入口 /teacher/register，它在自己的 layout 里显式开了 index。
  // 用「默认关 + 白名单开」而不是「默认开 + 逐个关」，这样以后加新页面不会漏。
  robots: { index: false, follow: false },
}

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
