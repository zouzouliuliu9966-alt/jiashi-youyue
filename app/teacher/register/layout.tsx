import type { Metadata } from 'next'

// 老师最常被转发的一页（同行群、朋友圈），标题和分享卡片必须是老师视角。
export const metadata: Metadata = {
  title: '教师注册',
  description: '注册成为家师有约的南京家教老师。填 3 项 1 分钟，课时费自己定，平台不抽课时费，接单才付费。',
  // 上一层 app/teacher/layout.tsx 默认 noindex，这里显式开回来：
  // 这是招募漏斗的公开入口，老师搜「南京家教老师招聘」应该能搜到
  robots: { index: true, follow: true },
  // 同样是浅合并：写了就要写全，否则会把上一层 openGraph 的 images/type/siteName 丢掉
  openGraph: {
    type: 'website',
    siteName: '家师有约',
    title: '家师有约 · 南京家教老师招募',
    description: '教务帮您对接学生。课时费自己定，平台不抽课时费，接单才付费。',
    locale: 'zh_CN',
    images: [
      { url: '/og-image.png', width: 1200, height: 630, alt: '家师有约 · 南京家教老师招募' },
      { url: '/og-square.png', width: 800, height: 800, alt: '家师有约' },
    ],
  },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
