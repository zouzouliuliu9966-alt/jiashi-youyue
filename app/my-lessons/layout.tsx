import type { Metadata } from 'next'

// 家长凭手机号查课时，不该进搜索结果。理由同 app/admin/layout.tsx：
// 用 noindex 而不是 robots.txt 的 Disallow。
export const metadata: Metadata = {
  title: '我的课时',
  robots: { index: false, follow: false },
}

export default function MyLessonsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
